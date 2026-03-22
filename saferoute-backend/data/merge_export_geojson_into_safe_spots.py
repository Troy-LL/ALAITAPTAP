"""
Merge data/export.geojson (OSM Overpass) into data/safe_spots.csv.

Adds police (polygon centroids), surveillance points, and street lamps as rows
with types police_station, surveillance, street_lamp. Deduplicates against
existing CSV rows and new rows when within DEDUP_M (default 100m).

Run from saferoute-backend/:
  python data/merge_export_geojson_into_safe_spots.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
GEOJSON = DATA / "export.geojson"
CSV_IN = DATA / "safe_spots.csv"
CSV_OUT = DATA / "safe_spots.csv"

DEDUP_M = 100.0


def _ring_centroid(ring: list) -> tuple[float, float]:
    if not ring:
        return 0.0, 0.0
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    n = len(lats)
    return sum(lats) / n, sum(lngs) / n


def _coords_from_geometry(geom: dict) -> tuple[float, float] | None:
    t = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return None
    if t == "Point":
        lng, lat = coords[0], coords[1]
        return (lat, lng)
    if t == "Polygon":
        return _ring_centroid(coords[0])
    if t == "MultiPolygon":
        return _ring_centroid(coords[0][0])
    return None


def _build_existing_tree(existing: list[tuple[float, float]]) -> Optional[BallTree]:
    if not existing:
        return None
    rad = np.radians([[lat, lng] for lat, lng in existing])
    return BallTree(rad, metric="haversine")


def _too_close_to_tree(lat: float, lng: float, tree: Optional[BallTree], max_m: float) -> bool:
    if tree is None:
        return False
    r_rad = max_m / 6371000.0
    q = np.radians([[lat, lng]])
    return len(tree.query_radius(q, r=r_rad)[0]) > 0


def main() -> None:
    if not GEOJSON.is_file():
        print(f"[ERR] Missing {GEOJSON}")
        sys.exit(1)
    if not CSV_IN.is_file():
        print(f"[ERR] Missing {CSV_IN}")
        sys.exit(1)

    base = pd.read_csv(CSV_IN)
    existing_points: list[tuple[float, float]] = list(
        zip(base["latitude"].astype(float), base["longitude"].astype(float))
    )
    existing_tree = _build_existing_tree(existing_points)

    with open(GEOJSON, encoding="utf-8") as f:
        gj = json.load(f)

    new_rows: list[dict] = []
    # ~50 m grid keys to dedupe dense OSM features without O(n²) geodesic
    new_keys: set[tuple[float, float]] = set()

    for feat in gj.get("features") or []:
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        fid = str(feat.get("id") or props.get("@id") or "").replace("/", "-")
        ll = _coords_from_geometry(geom)
        if ll is None:
            continue
        lat, lng = ll

        gkey = (round(lat / 0.0005) * 0.0005, round(lng / 0.0005) * 0.0005)
        if gkey in new_keys:
            continue
        if _too_close_to_tree(lat, lng, existing_tree, DEDUP_M):
            continue

        city = str(props.get("addr:city") or "Metro Manila")
        if props.get("highway") == "street_lamp":
            new_rows.append(
                {
                    "spot_id": f"osm-lamp-{fid}" if fid else f"osm-lamp-{lat:.5f}-{lng:.5f}",
                    "name": "Street lamp (OSM)",
                    "type": "street_lamp",
                    "latitude": lat,
                    "longitude": lng,
                    "hours": "24/7",
                    "address": "",
                    "city": city,
                }
            )
            new_keys.add(gkey)
            continue

        if props.get("amenity") == "police":
            name = str(props.get("name") or props.get("short_name") or "Police station (OSM)")
            addr = str(props.get("addr:street") or props.get("addr:full") or "")
            new_rows.append(
                {
                    "spot_id": f"osm-police-{fid}" if fid else f"osm-police-{lat:.5f}-{lng:.5f}",
                    "name": name[:120],
                    "type": "police_station",
                    "latitude": lat,
                    "longitude": lng,
                    "hours": "24/7",
                    "address": addr,
                    "city": city,
                }
            )
            new_keys.add(gkey)
            continue

        if props.get("man_made") == "surveillance" or props.get("surveillance"):
            st = (props.get("surveillance:type") or "").lower()
            label = "CCTV (OSM)" if st == "camera" else ("Security guard (OSM)" if st == "guard" else "Surveillance (OSM)")
            new_rows.append(
                {
                    "spot_id": f"osm-cctv-{fid}" if fid else f"osm-cctv-{lat:.5f}-{lng:.5f}",
                    "name": label,
                    "type": "surveillance",
                    "latitude": lat,
                    "longitude": lng,
                    "hours": "24/7",
                    "address": "",
                    "city": city,
                }
            )
            new_keys.add(gkey)

    add = pd.DataFrame(new_rows)
    out = pd.concat([base, add], ignore_index=True)
    out.to_csv(CSV_OUT, index=False)
    print(
        f"[OK] Wrote {len(out)} rows ({len(base)} from CSV + {len(add)} new from export.geojson) -> {CSV_OUT}"
    )


if __name__ == "__main__":
    main()
