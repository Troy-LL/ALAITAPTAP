"""
Find approximate highest safety_score among sampled walking routes using the
current DB and SafetyScorer (same logic as /api/calculate-route).

Requires OPENROUTESERVICE_API_KEY and uses many ORS requests — run sparingly.

Usage (from saferoute-backend/):
  python scripts/find_max_safety_route.py
"""
from __future__ import annotations

import random
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import polyline as polyline_lib
from dotenv import load_dotenv
from geopy.distance import geodesic
from sqlalchemy.orm import Session

load_dotenv(ROOT / ".env")

from app.database import SessionLocal
from app.ml.safety_scorer import SafetyScorer
from app.models import SafeSpot
from app.services.routing import get_walking_routes

# Sample size: random OD pairs between safe spots (infrastructure-heavy endpoints).
# Keep low to respect ORS rate limits; increase with ORS_SLEEP_S between calls.
NUM_PAIR_SAMPLES = 25
ORS_SLEEP_S = 1.25
STRAIGHT_MIN_M = 400
STRAIGHT_MAX_M = 12_000
TIME_OF_DAY = 14


def main() -> None:
    db: Session = SessionLocal()
    try:
        spots = db.query(SafeSpot).all()
        if len(spots) < 2:
            print("Need at least 2 safe spots in DB. Run seed_database.py.")
            sys.exit(1)

        coords = [(float(s.latitude), float(s.longitude)) for s in spots]
        scorer = SafetyScorer(db)

        random.seed(42)
        candidates: list[tuple[tuple[float, float], tuple[float, float], float]] = []
        seen: set[tuple[int, int]] = set()
        attempts = 0
        while len(candidates) < NUM_PAIR_SAMPLES and attempts < NUM_PAIR_SAMPLES * 30:
            attempts += 1
            i, j = random.sample(range(len(coords)), 2)
            if i > j:
                i, j = j, i
            if (i, j) in seen:
                continue
            a, b = coords[i], coords[j]
            d = geodesic(a, b).meters
            if not (STRAIGHT_MIN_M < d < STRAIGHT_MAX_M):
                continue
            seen.add((i, j))
            candidates.append((a, b, d))

        if not candidates:
            print("No valid OD pairs in distance range; widen STRAIGHT_MIN_M / STRAIGHT_MAX_M.")
            sys.exit(1)

        best_score = -1.0
        best_detail = None

        for idx, (a, b, d_straight) in enumerate(candidates):
            start_coords = [a[1], a[0]]  # lng, lat
            end_coords = [b[1], b[0]]
            try:
                ors_routes = get_walking_routes(
                    start_coords, end_coords, alternatives=2
                )
            except Exception as e:
                print(f"  [{idx+1}/{len(candidates)}] ORS skip: {e}")
                time.sleep(ORS_SLEEP_S)
                continue

            for ri, route in enumerate(ors_routes):
                decoded = polyline_lib.decode(route["geometry"])
                coords_lnglat = [[lng, lat] for lat, lng in decoded]
                score = scorer.calculate_route_safety(
                    coords_lnglat, time_of_day=TIME_OF_DAY
                )

                if score > best_score:
                    best_score = score
                    best_detail = {
                        "start_lat": a[0],
                        "start_lng": a[1],
                        "end_lat": b[0],
                        "end_lng": b[1],
                        "straight_km": round(d_straight / 1000, 3),
                        "route_km": round(route["distance"] / 1000, 3),
                        "route_index": ri + 1,
                        "safety_score": score,
                        "label": SafetyScorer.score_to_label(score),
                    }

            time.sleep(ORS_SLEEP_S)

        if best_detail is None:
            print("No successful routes. Check ORS key and quotas.")
            sys.exit(1)

        print("=== Best sampled route (approximate max over random safe-spot pairs) ===")
        print(f"Safety score: {best_detail['safety_score']}/100 ({best_detail['label']})")
        print(f"Straight-line OD: ~{best_detail['straight_km']} km | Walk distance: ~{best_detail['route_km']} km")
        print(f"ORS route option: #{best_detail['route_index']}")
        print()
        print("Start (lat, lng):", best_detail["start_lat"], best_detail["start_lng"])
        print("End   (lat, lng):", best_detail["end_lat"], best_detail["end_lng"])
        print()
        print(
            "Geocode hints (Metro Manila): use nearby labels in the app, e.g. reverse-geocode these coords."
        )
        print(
            f"SAFETY_IGNORE_CRIME={__import__('os').getenv('SAFETY_IGNORE_CRIME')!r} "
            f"SAFETY_USE_OSM_FILE={__import__('os').getenv('SAFETY_USE_OSM_FILE')!r}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
