from __future__ import annotations

import html as html_module
import json
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
SEPTA_BASE_URL = "http://www3.septa.org/hackathon/NextToArrive/"
SEPTA_TRAIN_VIEW_URL = "http://www3.septa.org/hackathon/TrainView/"
SEPTA_ALERTS_URL = "http://www3.septa.org/hackathon/Alerts/index.php"


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html_module.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


class SeptaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/next-trains":
            self.handle_next_trains_api(parsed.query)
            return

        if parsed.path == "/api/alerts":
            self.handle_alerts_api()
            return

        super().do_GET()

    def handle_next_trains_api(self, query: str) -> None:
        params = parse_qs(query)
        origin = params.get("origin", [""])[0].strip()
        destination = params.get("destination", [""])[0].strip()

        if not origin or not destination:
            self.send_api_error(HTTPStatus.BAD_REQUEST, "Missing origin or destination.")
            return

        septa_url = f"{SEPTA_BASE_URL}?{urlencode({'req1': origin, 'req2': destination, 'req3': '3'})}"
        request = Request(
            septa_url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
        )

        try:
            with urlopen(request, timeout=10) as response:
                payload = response.read()
        except Exception as exc:
            self.send_api_error(
                HTTPStatus.BAD_GATEWAY,
                f"Could not reach the SEPTA API from the local proxy: {exc}",
            )
            return

        try:
            trains = json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_api_error(
                HTTPStatus.BAD_GATEWAY,
                "SEPTA returned an unreadable response.",
            )
            return

        consist_by_train = {}
        train_view_request = Request(
            SEPTA_TRAIN_VIEW_URL,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
        )

        try:
            with urlopen(train_view_request, timeout=10) as response:
                train_view_payload = response.read()
            train_view_entries = json.loads(train_view_payload.decode("utf-8"))
            consist_by_train = {
                str(entry.get("trainno", "")).strip(): entry.get("consist", "")
                for entry in train_view_entries
            }
        except Exception:
            consist_by_train = {}

        enriched_trains = []
        for train in trains:
            train_number = str(train.get("orig_train") or train.get("trainno") or "").strip()
            consist = consist_by_train.get(train_number, "")
            enriched_trains.append(
                {
                    **train,
                    "consist": consist,
                    "car_count": len([car for car in consist.split(",") if car]) if consist else 0,
                }
            )

        body = json.dumps(enriched_trains).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_alerts_api(self) -> None:
        alerts_url = f"{SEPTA_ALERTS_URL}?{urlencode({'req2': '0'})}"
        request = Request(
            alerts_url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
        )

        try:
            with urlopen(request, timeout=10) as response:
                payload = response.read()
        except Exception as exc:
            self.send_api_error(
                HTTPStatus.BAD_GATEWAY,
                f"Could not reach the SEPTA API from the local proxy: {exc}",
            )
            return

        try:
            entries = json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_api_error(
                HTTPStatus.BAD_GATEWAY,
                "SEPTA returned an unreadable response.",
            )
            return

        rail_alerts = []
        for entry in entries:
            if entry.get("mode") != "Regional Rail":
                continue

            rail_alerts.append(
                {
                    "route_id": entry.get("route_id", ""),
                    "route_name": entry.get("route_name", ""),
                    "description": entry.get("description", ""),
                    "last_updated": entry.get("last_updated", ""),
                    "isadvisory": entry.get("isadvisory", "N"),
                    "isalert": entry.get("isalert", "N"),
                    "isdetour": entry.get("isdetour", "N"),
                    "isdelays": entry.get("isdelays", "N"),
                    "isdiversion": entry.get("isdiversion", "N"),
                    "issuspended": entry.get("issuspended", "N"),
                    "ismodifiedservice": entry.get("ismodifiedservice", "N"),
                    "isSnow": entry.get("isSnow", "N"),
                    "iselevator": entry.get("iselevator", "N"),
                    "alert": strip_html(entry.get("alert", "")),
                    "advisory": strip_html(entry.get("advisory", "")),
                    "elevator": [
                        {
                            "message": strip_html(item.get("message", "")),
                            "updated": item.get("updated", ""),
                        }
                        for item in entry.get("elevator", [])
                        if isinstance(item, dict)
                    ],
                }
            )

        body = json.dumps(rail_alerts).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_api_error(self, status: HTTPStatus, message: str) -> None:
        body = message.encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), SeptaHandler)
    print("Serving SEPTA Next Trains on http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
