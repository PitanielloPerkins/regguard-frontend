"""
Reg Guard — City of Dallas commercial permit queries (Socrata API).
HTTP: ``python dallas_permits.py`` serves ``GET /run-research`` on port 8000 (722 Munger mock for the dashboard).
"""
import json
import os
import traceback
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from requests.exceptions import RequestException
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
# Broad CORS for local dashboard + tooling (Vite on another port, curl, etc.).
CORS(
    app,
    resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS", "HEAD"],
            "allow_headers": "*",
            "expose_headers": "*",
        }
    },
)


@app.errorhandler(Exception)
def _unhandled_error(exc: Exception) -> Tuple[Any, int]:
    """JSON errors for API-style clients; avoids HTML stack traces that break dashboards."""
    if isinstance(exc, HTTPException):
        code = exc.code if isinstance(exc.code, int) else 500
        msg = exc.description if isinstance(exc.description, str) else str(exc)
        return jsonify({"error": exc.name, "message": msg}), code
    traceback.print_exc()
    return jsonify({"error": "internal_server_error", "message": str(exc)}), 500


@app.get("/health")
def health() -> Any:
    return jsonify({"ok": True, "service": "dallas_permits"})


@app.route("/run-research", methods=["GET", "OPTIONS"])
def run_research() -> Any:
    """Return 722 Munger Ave fixture (3 ft rear setback, $167.00 fee) for dashboard consumption."""
    if request.method == "OPTIONS":
        return "", 204
    try:
        df = _mock_commercial_permits_dataframe()
        permits: List[Dict[str, Any]] = json.loads(df.to_json(orient="records"))
        return jsonify({"permits": permits, "source": "mock_722_munger"})
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": "run_research_failed", "message": str(exc), "permits": []}), 500


# City of Dallas Open Data (Socrata). App token: https://data.dallascityhall.com/profile/edit/developer_settings
DALLAS_API_URL = "https://www.dallascityhall.com/resource/7vsc-id2i.json"


def _mock_commercial_permits_dataframe() -> pd.DataFrame:
    """
    Fixture row used when the Dallas endpoint is down or returns non-JSON (e.g. HTML error pages).
    Includes 722 Munger Ave context: 3 ft rear setback and $167.00 minimum trade permit sync fee.
    Valuation is above the live API filter so downstream behavior matches high-value pulls.
    """
    row = {
        "permit_number": "RG-MOCK-BL-722-MUNGER",
        "issue_date": "2026-05-01T00:00:00.000",
        "address": "722 MUNGER AVE",
        "city": "DALLAS",
        "state": "TX",
        "zip_code": "75202",
        "valuation": "2500000",
        "project_description": (
            "722 Munger Ave — detached accessory dwelling unit (ADU); "
            "rear setback non-conformity: 3 ft rear setback to rear property line (Reg Guard test fixture). "
            "Minimum trade permit planning fee USD $167.00 (2026 Reg Guard sync, incl. admin)."
        ),
        "land_use": "COMMERCIAL",
    }
    df = pd.DataFrame([row])
    df["valuation"] = pd.to_numeric(df["valuation"], errors="coerce")
    return df


def get_commercial_permits(keyword: str = "Data Center") -> Optional[pd.DataFrame]:
    try:
        # Escape single quotes for Socrata $where clause
        safe = keyword.replace("'", "''")
        upper_kw = safe.upper()
        params = {
            "$where": (
                f"upper(project_description) like '%{upper_kw}%' "
                f"OR upper(land_use) like '%COMMERCIAL%'"
            ),
            "$limit": 100,
            "$order": "issue_date DESC",
        }
        headers = {}
        token = os.environ.get("DALLAS_OPEN_DATA_APP_TOKEN")
        if token:
            headers["X-App-Token"] = token

        response = requests.get(DALLAS_API_URL, params=params, headers=headers, timeout=60)

        if response.status_code != 200:
            print(
                f"Dallas Open Data unavailable ({response.status_code}); "
                f"using mock permits. Body snippet: {response.text[:200]!r}"
            )
            return _mock_commercial_permits_dataframe()

        data = response.json()
        df = pd.DataFrame(data)
        if df.empty:
            return df
        if "valuation" in df.columns:
            df = df.copy()
            df["valuation"] = pd.to_numeric(df["valuation"], errors="coerce")
            df = df[df["valuation"] > 1_000_000]
        return df

    except (RequestException, json.JSONDecodeError) as exc:
        print(f"Dallas Open Data request/parse failed ({type(exc).__name__}); using mock permits: {exc}")
        return _mock_commercial_permits_dataframe()


if __name__ == "__main__":
    # threaded=True: tolerate concurrent dashboard + health probes during dev.
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)
