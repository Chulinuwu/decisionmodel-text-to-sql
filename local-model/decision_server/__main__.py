import argparse
import json
import logging
import time
from http.server import ThreadingHTTPServer
from pathlib import Path

from .config import DEFAULT_HOST, DEFAULT_MODEL_NAME, DEFAULT_PORT, DEFAULT_PROVIDER_NAME, ROUTE
from .http_handler import make_handler
from .runner import Runner
from .service import DecisionService


def parse_args():
    parser = argparse.ArgumentParser(prog="python -m decision_server")
    parser.add_argument("--checkpoint", help="trainer checkpoint (best.pt) applied on top of the base model; default is the untouched base model")
    parser.add_argument("--model-dir", help="a merged model directory (for example a downloaded fine-tuned release); default is the pinned base snapshot")
    parser.add_argument("--temperatures", help="temperatures.json from app_training.calibrate for --checkpoint; without it a checkpoint is scored raw")
    parser.add_argument("--device", choices=("cpu", "mps", "cuda"), default="cpu")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--model-name", default=DEFAULT_MODEL_NAME)
    parser.add_argument("--provider-name", default=DEFAULT_PROVIDER_NAME)
    return parser.parse_args()


def main():
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    start = time.perf_counter()
    if args.temperatures and not args.checkpoint:
        raise SystemExit("--temperatures applies to a --checkpoint; the base model uses its official temperatures")
    temperatures = json.loads(Path(args.temperatures).read_text())["temperatures"] if args.temperatures else None
    if args.model_dir and args.checkpoint:
        raise SystemExit("--model-dir already holds trained weights; do not combine it with --checkpoint")
    runner = Runner(args.device, args.checkpoint, temperatures, args.model_dir)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(DecisionService(runner, args.model_name, args.provider_name)))
    logging.info("model loaded in %.1fs on %s (%s); listening on http://%s:%d%s", time.perf_counter() - start, args.device,
                 f"{args.checkpoint} (temperatures: {bool(temperatures)})" if args.checkpoint else args.model_dir or "base", args.host, server.server_address[1], ROUTE)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
