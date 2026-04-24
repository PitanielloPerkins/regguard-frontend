import os
import os
from typing import Optional

import pandas as pd
import requests

# City of Dallas Open Data (Socrata). App token: https://data.dallascityhall.com/profile/edit/developer_settings
DALLAS_API_URL = "https://www.dallascityhall.com/resource/7vsc-id2i.json"


def get_commercial_permits(keyword: str = "Data Center") -> Optional[pd.DataFrame]:
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

    if response.status_code == 200:
        data = response.json()
        df = pd.DataFrame(data)
        if df.empty:
            return df
        if "valuation" in df.columns:
            df = df.copy()
            df["valuation"] = pd.to_numeric(df["valuation"], errors="coerce")
            df = df[df["valuation"] > 1_000_000]
        return df

    print(f"Error: {response.status_code} {response.text[:500]}")
    return None


if __name__ == "__main__":
    results = get_commercial_permits()
    if results is None:
        raise SystemExit(1)
    out = "high_value_projects.csv"
    results.to_csv(out, index=False)
    print(f"Wrote {len(results)} rows to {out}")
