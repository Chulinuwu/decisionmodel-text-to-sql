import json
import unittest
from types import SimpleNamespace

from decision_server.calibration import temperature_key
from decision_server.request import RequestError, parse_request

MODEL = "local/d1-omni-600m"


def body(questions, model=MODEL, state="Top 5 categories by revenue"):
    return json.dumps({"model": model, "state": state, "questions": questions}).encode()


class RequestParsing(unittest.TestCase):
    def test_choice_and_noul_questions_parse_with_their_option_counts(self):
        state, questions = parse_request(body({
            "target": {"type": "choice", "instructions": "What is measured?", "criteria": {"revenue": "sales", "count_orders": "orders"}},
            "ranked": {"type": "noul", "instructions": "A ranking is asked for."},
        }), MODEL)
        self.assertEqual(state, "Top 5 categories by revenue")
        self.assertEqual((questions["target"].options, questions["ranked"].options), (2, 2))

    def test_invalid_requests_are_rejected_with_their_status(self):
        cases = [
            (body({"q": {"type": "choice", "instructions": "x", "criteria": {"a": "A"}}}), 422),
            (body({"q": {"type": "score", "instructions": "x"}}), 422),
            (body({"q": {"type": "noul", "instructions": "x"}}, model="other"), 400),
            (b"not json", 400),
        ]
        for raw, status in cases:
            with self.subTest(raw=raw[:40]), self.assertRaises(RequestError) as caught:
                parse_request(raw, MODEL)
            self.assertEqual(caught.exception.status, status)

    def test_temperature_keys_bucket_by_type_and_option_count(self):
        keys = [temperature_key(SimpleNamespace(type=kind, options=count)) for kind, count in (("choice", 2), ("choice", 4), ("choice", 8), ("choice", 40), ("noul", 2))]
        self.assertEqual(keys, ["choice:2", "choice:3-5", "choice:6-10", "choice:11+", "noul:2"])


if __name__ == "__main__":
    unittest.main()
