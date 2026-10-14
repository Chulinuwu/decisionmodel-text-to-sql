import json
import logging
import threading
import time
import uuid

from .answers import to_answer
from .calibration import probabilities
from .encoding import encode_question
from .request import RequestError, parse_request

log = logging.getLogger("decision_server")


class DecisionService:
    def __init__(self, runner, model_name, provider_name):
        self.runner, self.model_name, self.provider_name = runner, model_name, provider_name
        self._lock = threading.Lock()

    def decide(self, body):
        state, questions = parse_request(body, self.model_name)
        start = time.perf_counter()
        runner = self.runner
        try:
            encoded = [encode_question(runner.tokenizer, state, question, runner.max_length, runner.truncate)
                       for question in questions.values()]
        except ValueError as error:
            raise RequestError(422, str(error)) from None
        with self._lock:
            logits = runner.logits(list(zip(encoded, questions.values())))
        answers = {name: to_answer(question, probabilities(values, question, runner.temperatures))
                   for (name, question), values in zip(questions.items(), logits)}
        input_tokens = sum(len(item.ids) for item in encoded)
        log.info(json.dumps({"event": "decide", "questions": len(questions), "options": sum(q.options for q in questions.values()),
                             "input_tokens": input_tokens, "device": str(runner.device),
                             "ms": round((time.perf_counter() - start) * 1000, 1)}))
        return {"id": f"local-{uuid.uuid4().hex}", "model": self.model_name, "provider": self.provider_name,
                "answers": answers, "usage": {"input_tokens": input_tokens, "output_tokens": 0, "cost": 0}}
