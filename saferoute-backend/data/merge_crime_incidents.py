"""
Build data/crime_incidents.csv from:
  1) Multi-city scrape snapshot — keep only Manila & Quezon City rows
  2) manila_qc_routing_crimes_500.csv — normalized to the same schema

On first run, if crime_incidents_multicity.csv does not exist, this script copies
the current crime_incidents.csv to that path (full Metro-wide scrape). Later runs
read the snapshot so re-merging does not duplicate routing rows.

Run from saferoute-backend/:
  python data/merge_crime_incidents.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent
CRIME_IN = DATA / "crime_incidents.csv"
CRIME_MULTICITY_SNAPSHOT = DATA / "crime_incidents_multicity.csv"
ROUTING_IN = DATA / "manila_qc_routing_crimes_500.csv"
CRIME_OUT = DATA / "crime_incidents.csv"

ALLOWED_CITIES = frozenset(
    {
        "manila",
        "quezon city",
        "city of manila",
    }
)

DATA_COLS = [
    "latitude",
    "longitude",
    "incident_type",
    "date",
    "time_of_day",
    "city",
    "barangay",
    "description",
]

OUT_COLS = ["incident_id"] + DATA_COLS


def _norm_city(c: str) -> str:
    return (c or "").strip().lower()


def _filter_manila_qc(df: pd.DataFrame) -> pd.DataFrame:
    if "city" not in df.columns:
        raise ValueError("Expected column 'city' in crime incidents CSV")
    mask = df["city"].map(_norm_city).isin(ALLOWED_CITIES)
    return df.loc[mask, DATA_COLS].copy()


def _routing_description(row: pd.Series) -> str:
    parts = []
    for key in ("Severity", "Source"):
        if key in row.index and pd.notna(row[key]):
            t = str(row[key]).strip()
            if t:
                parts.append(t)
    return "; ".join(parts)


def _routing_to_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Map routing CSV columns to crime_incidents schema."""
    need = ["Date", "City", "Neighborhood_Street", "Latitude", "Longitude", "Crime_Type", "Severity", "Source"]
    missing = [c for c in need if c not in df.columns]
    if missing:
        raise ValueError(f"Routing CSV missing columns: {missing}")

    city_ok = df["City"].map(_norm_city).isin(ALLOWED_CITIES)
    df = df.loc[city_ok].copy()

    out = pd.DataFrame(
        {
            "latitude": pd.to_numeric(df["Latitude"], errors="coerce"),
            "longitude": pd.to_numeric(df["Longitude"], errors="coerce"),
            "incident_type": df["Crime_Type"].fillna("").astype(str).str.strip(),
            "date": df["Date"].fillna("").astype(str).str.strip(),
            "time_of_day": "12:00",
            "city": df["City"].fillna("").astype(str).str.strip(),
            "barangay": df["Neighborhood_Street"].fillna("").astype(str).str.strip(),
            "description": df.apply(_routing_description, axis=1),
        }
    )
    out = out.dropna(subset=["latitude", "longitude"])
    return out


def main() -> None:
    if not ROUTING_IN.is_file():
        print(f"[ERR] Missing {ROUTING_IN}", file=sys.stderr)
        sys.exit(1)
    if not CRIME_IN.is_file() and not CRIME_MULTICITY_SNAPSHOT.is_file():
        print(f"[ERR] Need {CRIME_IN} or {CRIME_MULTICITY_SNAPSHOT}", file=sys.stderr)
        sys.exit(1)

    if CRIME_MULTICITY_SNAPSHOT.is_file():
        base = pd.read_csv(CRIME_MULTICITY_SNAPSHOT, encoding="utf-8-sig")
    else:
        base = pd.read_csv(CRIME_IN, encoding="utf-8-sig")
        base.to_csv(CRIME_MULTICITY_SNAPSHOT, index=False, encoding="utf-8")
        print(f"[OK] Saved multi-city snapshot -> {CRIME_MULTICITY_SNAPSHOT}")
    if not set(DATA_COLS).issubset(set(base.columns)):
        print(f"[ERR] crime_incidents.csv missing columns: {set(DATA_COLS) - set(base.columns)}", file=sys.stderr)
        sys.exit(1)

    filtered = _filter_manila_qc(base)
    routing_raw = pd.read_csv(ROUTING_IN, encoding="utf-8-sig")
    routing = _routing_to_schema(routing_raw)

    merged = pd.concat([filtered, routing], ignore_index=True)
    merged["incident_id"] = range(1, len(merged) + 1)
    merged = merged[OUT_COLS]

    merged.to_csv(CRIME_OUT, index=False, encoding="utf-8")
    print(
        f"[OK] Wrote {len(merged)} rows -> {CRIME_OUT}\n"
        f"     From filtered legacy (Manila/QC only): {len(filtered)}; "
        f"from routing CSV: {len(routing)}"
    )


if __name__ == "__main__":
    main()
