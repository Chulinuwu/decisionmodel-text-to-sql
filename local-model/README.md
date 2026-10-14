# Local decision model server

A small HTTP server that answers the app's decision requests with a D1 Omni 600M model on your own CPU or GPU. It implements the same request and response format as the hosted Decisions endpoints: a `state` string plus named `choice` and `noul` questions, answered with a probability per option and zero generated tokens. It accepts up to 255 options per question.

## Run

Python 3.12:

```sh
cd local-model
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
hf download Chulinz/d1-omni-600m-olist-sql-decisions --local-dir models/olist-decisions
python -m decision_server --model-dir models/olist-decisions --device cpu --port 8790
```

Use `--device cuda` on an NVIDIA GPU or `--device mps` on Apple silicon. The server listens on `http://127.0.0.1:8790/decisions`; point the app at it with `DECISIONS_URL=http://127.0.0.1:8790/decisions` (see the main README).

Without `--model-dir` the server loads the untouched base model, `LiquidAI/d1-omni-600M` at the revision pinned in `decision_server/pinned.py`, from the Hugging Face cache (`hf download LiquidAI/d1-omni-600M --revision 02b55d7076f15129e59ab3f94783f32c4b088674`). The base model and the fine-tune both apply the decision temperatures stored in their `config.json`.

## Request

```sh
curl -s http://127.0.0.1:8790/decisions -H 'Content-Type: application/json' -d '{
  "model": "local/d1-omni-600m",
  "state": "Top 5 product categories by revenue in 2018",
  "questions": {
    "target": {"type": "choice", "instructions": "What does the question ask to report?",
               "criteria": {"revenue": "sum of item prices", "count_orders": "number of orders"}},
    "ranked": {"type": "noul", "instructions": "The question asks for a ranking."}
  }
}'
```

The model weights are distributed by Liquid AI under the LFM Open License v1.0, which limits commercial use by organizations above its revenue threshold.

## Test

```sh
cd local-model && python -m unittest discover tests
```
