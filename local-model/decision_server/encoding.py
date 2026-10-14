import json
import re
from dataclasses import dataclass

from .pinned import DELIMITERS

from .config import NOUL_DEFAULT, PER_OPTION_TOKENS

_SPECIAL = re.compile(r"<\|([A-Za-z0-9_]+)\|>")


@dataclass(frozen=True)
class Encoded:
    ids: list
    markers: list


def escape(text):
    return _SPECIAL.sub(r"<¦\1¦>", text)


def _criterion(value):
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(", ", ": "), default=str)


def render_options(question):
    if question.type == "choice":
        return [name if text in (None, "") else f"{name}: {_criterion(text)}" for name, text in question.criteria.items()]
    criteria = question.criteria or {}
    false, true = criteria.get("false", criteria.get("no")), criteria.get("true", criteria.get("yes"))
    # The model reads a noul as two options in [false, true] order.
    return ["false: " + (_criterion(false) if false not in (None, "") else NOUL_DEFAULT["false"]),
            "true: " + (_criterion(true) if true not in (None, "") else NOUL_DEFAULT["true"])]


def delimiter_ids(tokenizer):
    ids = {key: tokenizer.convert_tokens_to_ids(value) for key, value in DELIMITERS.items()}
    if any(value is None or value == tokenizer.unk_token_id for value in ids.values()):
        raise ValueError("Tokenizer is missing official delimiter tokens")
    return ids


def encode_question(tokenizer, state, question, max_length, truncate=True):
    delimiters = delimiter_ids(tokenizer)

    def enc(text):
        return tokenizer(escape(text), add_special_tokens=False)["input_ids"]

    options = render_options(question)
    budget = max(96, min(len(options) * PER_OPTION_TOKENS + 32, max_length // 2))
    per = max(2, (budget - 3 * len(options)) // len(options))
    body = [delimiters["q"]] + enc(question.instructions)
    if truncate:
        body = body[:max(16, budget)]
    markers = []
    for text in options:
        option = enc(" " + text)
        markers.append(len(body) + 1)
        body += [delimiters["opt"], delimiters["marker"]] + (option[:per] if truncate else option) + [delimiters["opt_end"]]
    body.append(delimiters["decide"])
    room = max(0, max_length - len(body) - 2)
    state_ids = enc(state)
    if not truncate and len(state_ids) > room:
        raise ValueError("Complete input exceeds the model context")
    state_ids = [delimiters["state"]] + state_ids[:room]
    markers = [position + 1 + len(state_ids) for position in markers]
    if markers[-1] >= max_length:
        raise ValueError("The options do not fit in the model context")
    return Encoded(([tokenizer.bos_token_id] + state_ids + body)[:max_length], markers)
