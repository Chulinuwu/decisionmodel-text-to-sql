import json
from dataclasses import dataclass

from .config import MAX_CHOICES, MIN_CHOICES, PAYLOAD_MAX_BYTES, STATE_MAX_BYTES

NOUL_KEYS = {"true", "false", "yes", "no"}


class RequestError(ValueError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class Question:
    type: str
    instructions: str
    criteria: dict | None

    @property
    def options(self):
        return 2 if self.type == "noul" else len(self.criteria)


def _strings(value):
    return isinstance(value, dict) and all(isinstance(k, str) and k and isinstance(v, str) for k, v in value.items())


def _question(name, raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("instructions"), str):
        raise RequestError(422, f"Question {name} needs a type and string instructions")
    kind, criteria = raw.get("type"), raw.get("criteria")
    if kind == "choice":
        if not _strings(criteria) or not MIN_CHOICES <= len(criteria) <= MAX_CHOICES:
            raise RequestError(422, f"Choice {name} needs {MIN_CHOICES} to {MAX_CHOICES} string criteria")
    elif kind == "noul":
        if criteria is not None and (not _strings(criteria) or not set(criteria) <= NOUL_KEYS):
            raise RequestError(422, f"Noul {name} criteria may only describe true/false (or yes/no)")
    else:
        raise RequestError(422, f"Question {name} type must be choice or noul")
    return Question(kind, raw["instructions"], criteria)


def parse_request(body, model_name):
    if len(body) > PAYLOAD_MAX_BYTES:
        raise RequestError(413, f"Request exceeds {PAYLOAD_MAX_BYTES} bytes")
    try:
        payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise RequestError(400, "Request body must be JSON") from None
    if not isinstance(payload, dict):
        raise RequestError(400, "Request body must be a JSON object")
    if payload.get("model") != model_name:
        raise RequestError(400, f"Model must be {model_name}")
    state, questions = payload.get("state"), payload.get("questions")
    if not isinstance(state, str) or len(state.encode()) > STATE_MAX_BYTES:
        raise RequestError(422, f"State must be a string of at most {STATE_MAX_BYTES} bytes")
    if not isinstance(questions, dict) or not questions or not all(isinstance(name, str) and name for name in questions):
        raise RequestError(422, "Questions must be a non-empty object keyed by id")
    return state, {name: _question(name, raw) for name, raw in questions.items()}
