import torch

from .pinned import MODEL_ID, REVISION


def apply_checkpoint(model, path):
    # Trainer checkpoints are pickles (they carry RNG state), so only load files you produced.
    saved = torch.load(path, map_location="cpu", weights_only=False)
    identity = saved.get("identity") or {}
    if identity.get("model") != MODEL_ID or identity.get("revision") != REVISION or identity.get("encoding") not in ("stock", "full"):
        raise ValueError("Checkpoint was not trained from the pinned base model with a known encoding")
    parameters = dict(model.named_parameters())
    trained = saved.get("parameters") or {}
    if not trained or set(trained) - set(parameters):
        raise ValueError("Checkpoint parameters do not match the base model")
    with torch.no_grad():
        for name, value in trained.items():
            if value.shape != parameters[name].shape:
                raise ValueError(f"Checkpoint shape mismatch for {name}")
            parameters[name].copy_(value.to(parameters[name].dtype))
    return identity
