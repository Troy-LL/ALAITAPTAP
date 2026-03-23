"""
Rebuild merged CSVs from source data and re-seed SQLite.

From saferoute-backend/:
  python scripts/reseed_data.py

Steps:
  1. data/merge_crime_incidents.py  — Manila/QC filter + manila_qc_routing_crimes_500.csv
  2. data/merge_safety_cleaned_into_safe_spots.py — safety_data_cleaned.csv → safe_spots.csv
  3. scripts/seed_database.py — load crime_incidents.csv + safe_spots.db

Optional GeoJSON merge (not run here): data/merge_export_geojson_into_safe_spots.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_step(script: Path) -> None:
    print(f"\n--- {script.name} ---")
    r = subprocess.run([sys.executable, str(script)], cwd=ROOT, check=False)
    if r.returncode != 0:
        sys.exit(r.returncode)


def main() -> None:
    run_step(ROOT / "data" / "merge_crime_incidents.py")
    run_step(ROOT / "data" / "merge_safety_cleaned_into_safe_spots.py")
    run_step(ROOT / "scripts" / "seed_database.py")
    print("\n[OK] Reseed complete.")


if __name__ == "__main__":
    main()
