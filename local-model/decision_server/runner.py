from pathlib import Path

import torch
from transformers import AutoModel, AutoTokenizer

from .runtime import configure_runtime

from .checkpoint import apply_checkpoint
from .config import BATCH_TOKENS, QTYPES, SNAPSHOT


class Runner:
    def __init__(self, device="cpu", checkpoint=None, temperatures=None, model_dir=None):
        source = Path(model_dir) if model_dir else SNAPSHOT
        if not source.is_dir():
            raise FileNotFoundError(f"Local model snapshot not found at {source}")
        configure_runtime(deterministic=True)
        torch.manual_seed(0)
        self.device = torch.device(device)
        self.tokenizer = AutoTokenizer.from_pretrained(source, trust_remote_code=True, local_files_only=True)
        model, loading = AutoModel.from_pretrained(source, trust_remote_code=True, local_files_only=True,
                                                   dtype=torch.float32, output_loading_info=True)
        if any(loading.get(key) for key in ("missing_keys", "unexpected_keys", "mismatched_keys", "error_msgs")):
            raise RuntimeError(f"Model weights did not load cleanly: {loading}")
        self.max_length = model.config.max_length
        # Official temperatures were fitted on the base head; a fine-tuned head needs its own, fitted by app_training.calibrate.
        self.temperatures = model.config.temperatures
        self.truncate = True
        self.identity = None
        if checkpoint:
            self.identity = apply_checkpoint(model, checkpoint)
            self.temperatures = temperatures
            self.truncate = self.identity["encoding"] == "stock"
        self.model = model.to(self.device).eval()

    @torch.no_grad()
    def logits(self, rows):
        results = [None] * len(rows)
        order = sorted(range(len(rows)), key=lambda index: len(rows[index][0].ids), reverse=True)
        while order:
            longest, size = len(rows[order[0]][0].ids), 1
            while size < len(order) and (size + 1) * longest <= BATCH_TOKENS:
                size += 1
            batch, order = order[:size], order[size:]
            for index, value in zip(batch, self._forward([rows[index] for index in batch])):
                results[index] = value
        return results

    def _forward(self, rows):
        device, encoder = self.device, self.model.encoder
        lengths = torch.tensor([len(encoded.ids) for encoded, _ in rows], device=device)
        hidden = torch.nn.utils.rnn.pad_sequence(
            [encoder.embed_tokens(torch.tensor(encoded.ids, device=device)) for encoded, _ in rows], batch_first=True)
        padding = torch.arange(hidden.shape[1], device=device)[None] < lengths[:, None]
        hidden = encoder(hidden, padding, torch.zeros(len(rows), device=device, dtype=torch.long))
        width = max(len(encoded.markers) for encoded, _ in rows)
        positions = torch.zeros(len(rows), width, dtype=torch.long, device=device)
        mask = torch.zeros(len(rows), width, dtype=torch.bool, device=device)
        for index, (encoded, _) in enumerate(rows):
            positions[index, :len(encoded.markers)] = torch.tensor(encoded.markers, device=device)
            mask[index, :len(encoded.markers)] = True
        qtype = torch.tensor([QTYPES[question.type] for _, question in rows], device=device)
        logits = self.model.head(hidden, padding, positions, mask, qtype)
        return [row[:question.options].cpu() for row, (_, question) in zip(logits, rows)]
