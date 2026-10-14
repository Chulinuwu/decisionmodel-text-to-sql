from pathlib import Path

from huggingface_hub.constants import HF_HUB_CACHE

from .pinned import MODEL_ID, REVISION

SNAPSHOT = Path(HF_HUB_CACHE) / f"models--{MODEL_ID.replace('/', '--')}" / "snapshots" / REVISION

# Same budgets the app enforces in server/decision-payload.ts before it calls the Decisions API.
STATE_MAX_BYTES = 2600
PAYLOAD_MAX_BYTES = 32000
MIN_CHOICES, MAX_CHOICES = 2, 255

# Official d1-omni prompt.py constants: per-option token share and question-type ids of the head.
PER_OPTION_TOKENS = 24
QTYPES = {"choice": 0, "noul": 2}
NOUL_DEFAULT = {"false": "no, the statement does not hold", "true": "yes, the statement holds"}
# Official _run packs up to 65536 padded tokens; Olist payloads mix 50 to 900 token questions, so padding
# everything to the longest made a 22-question call 4x slower on CPU. 1024 measured fastest on CPU and MPS.
BATCH_TOKENS = 1024

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8790
DEFAULT_MODEL_NAME = "local/d1-omni-600m"
DEFAULT_PROVIDER_NAME = "Local"
ROUTE = "/decisions"
