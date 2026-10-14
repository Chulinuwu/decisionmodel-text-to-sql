MODEL_ID = "LiquidAI/d1-omni-600M"
REVISION = "02b55d7076f15129e59ab3f94783f32c4b088674"
# d1-omni prompt markers, copied from the official prompt.py of the pinned revision.
DELIMITERS = {
    "state": "<|reserved_7|>", "q": "<|reserved_8|>", "opt": "<|reserved_9|>",
    "opt_end": "<|reserved_10|>", "decide": "<|reserved_11|>", "marker": "<|mask|>",
}
