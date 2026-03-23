"""
Merge data/safety_data_cleaned.csv into data/safe_spots.csv.

- Classifies each OSM row into spot types used by the API / safety scorer
- Dedupes against existing points (and within new rows) at DEDUP_M meters
- Idempotent: rows with spot_id starting with PREFIX are removed and rebuilt each run

Run from saferoute-backend/:
  python data/merge_safety_cleaned_into_safe_spots.py
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

ROOT = Path(__file__).resolve().parent
SAFETY_CSV = ROOT / "safety_data_cleaned.csv"
SPOTS_CSV = ROOT / "safe_spots.csv"

PREFIX = "safety-osm-"
DEDUP_M = 100.0


def _build_tree(points: list[tuple[float, float]]) -> Optional[BallTree]:
    if not points:
        return None
    rad = np.radians([[lat, lng] for lat, lng in points])
    return BallTree(rad, metric="haversine")


def _too_close(lat: float, lng: float, tree: Optional[BallTree], max_m: float) -> bool:
    if tree is None:
        return False
    r_rad = max_m / 6371000.0
    q = np.radians([[lat, lng]])
    return len(tree.query_radius(q, r=r_rad)[0]) > 0


def classify_row(name: str, surveillance_type: str) -> str:
    """Map cleaned safety row to SafeSpot.type."""
    n = (name or "").lower()
    s = (surveillance_type or "").lower()

    if s == "camera":
        return "surveillance"
    if any(
        k in n
        for k in (
            "police",
            "precinct",
            "pcpd",
            "qcpd",
            "npd",
            "opac",
            "enforcement unit",
        )
    ):
        return "police_station"
    if "fire" in n and ("station" in n or "sub" in n or "brigade" in n):
        return "fire_station"
    if any(k in n for k in ("hospital", "medical center", "infirmary", "clinic")):
        return "hospital"
    if any(
        k in n
        for k in (
            "7-eleven",
            "7 eleven",
            "ministop",
            "family mart",
            "familymart",
            "uncle john",
            "alfamart",
            "puregold",
            "savemore",
            "waltermart",
            "supermarket",
            "hypermarket",
            "convenience",
            "shell select",
            "711",
            "dali",
            "mega q mart",
            "o! save",
        )
    ):
        return "convenience_store"
    if any(k in n for k in ("barangay", "bulwagan", "hall", "pamahalaan")):
        return "security_post"
    if "market" in n or "tindahan" in n or "sari-sari" in n or "mart" in n or "store" in n:
        return "convenience_store"
    if "unnamed convenience" in n:
        return "convenience_store"
    return "security_post"


def main() -> None:
    if not SAFETY_CSV.is_file():
        print(f"[ERR] Missing {SAFETY_CSV}", file=sys.stderr)
        sys.exit(1)
    if not SPOTS_CSV.is_file():
        print(f"[ERR] Missing {SPOTS_CSV}", file=sys.stderr)
        sys.exit(1)

    base = pd.read_csv(SPOTS_CSV, encoding="utf-8-sig")
    base = base[~base["spot_id"].astype(str).str.startswith(PREFIX)].copy()

    existing_points: list[tuple[float, float]] = list(
        zip(base["latitude"].astype(float), base["longitude"].astype(float))
    )
    tree = _build_tree(existing_points)

    sdf = pd.read_csv(SAFETY_CSV, encoding="utf-8-sig")
    new_rows: list[dict] = []

    for _, row in sdf.iterrows():
        lat = float(row["latitude"])
        lng = float(row["longitude"])
        name = str(row.get("name", "") or "").strip() or "Safety point (OSM)"
        stype = classify_row(name, str(row.get("surveillance_type", "") or ""))
        hours = str(row.get("opening_hours", "") or "").strip() or "24/7"

        if _too_close(lat, lng, tree, DEDUP_M):
            continue

        sid = f"{PREFIX}{len(new_rows):05d}-{lat:.5f}-{lng:.5f}"
        new_rows.append(
            {
                "spot_id": sid,
                "name": name[:200],
                "type": stype,
                "latitude": lat,
                "longitude": lng,
                "hours": hours[:80],
                "address": "",
                "city": "Metro Manila",
            }
        )
        existing_points.append((lat, lng))
        tree = _build_tree(existing_points)

    add = pd.DataFrame(new_rows)
    out = pd.concat([base, add], ignore_index=True)

    # Numeric spot_id column may be int for legacy rows; keep string ids for merged rows
    out.to_csv(SPOTS_CSV, index=False, encoding="utf-8")
    print(f"[OK] Wrote {len(out)} rows ({len(base)} base + {len(add)} from safety_data_cleaned.csv) -> {SPOTS_CSV}")


if __name__ == "__main__":
    main()
