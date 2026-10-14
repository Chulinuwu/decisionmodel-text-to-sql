import json
import logging
from http.server import BaseHTTPRequestHandler

from .config import PAYLOAD_MAX_BYTES, ROUTE
from .request import RequestError

log = logging.getLogger("decision_server")


def make_handler(service):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            if self.path != "/health":
                return self._error(404, "Not found")
            self._send(200, {"status": "ok", "model": service.model_name, "provider": service.provider_name})

        def do_POST(self):
            if self.path != ROUTE:
                return self._error(404, "Not found", close=True)
            try:
                length = int(self.headers.get("Content-Length", ""))
            except ValueError:
                return self._error(411, "Content-Length is required", close=True)
            if length < 0 or length > PAYLOAD_MAX_BYTES:
                return self._error(413, f"Request exceeds {PAYLOAD_MAX_BYTES} bytes", close=True)
            try:
                self._send(200, service.decide(self.rfile.read(length)))
            except RequestError as error:
                self._error(error.status, str(error))
            except Exception:
                log.exception("decision failed")
                self._error(500, "Decision failed")

        def _error(self, status, message, close=False):
            self._send(status, {"error": {"code": status, "message": message}}, close)

        def _send(self, status, payload, close=False):
            body = json.dumps(payload, allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            if close:
                # The unread request body would otherwise be parsed as the next request on this connection.
                self.send_header("Connection", "close")
                self.close_connection = True
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            log.info("%s %s", self.address_string(), format % args)

    return Handler
