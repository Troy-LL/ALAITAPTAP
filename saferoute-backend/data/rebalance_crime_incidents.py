import csv
import random
from pathlib import Path

INPUT_FILE = Path(__file__).with_name("crime_incidents.csv")
OUTPUT_FILE = Path(__file__).with_name("crime_incidents.csv")

MANILA_HOTSPOTS = [
    ("Ermita", 14.5825, 120.9832),
    ("Malate", 14.5702, 120.9920),
    ("Quiapo", 14.5990, 120.9845),
    ("Sampaloc", 14.6098, 120.9971),
    ("Binondo", 14.6027, 120.9732),
    ("Sta. Cruz", 14.6150, 120.9828),
    ("Tondo", 14.6222, 120.9693),
    ("Paco", 14.5808, 120.9991),
]

QC_HOTSPOTS = [
    ("Cubao", 14.6193, 121.0540),
    ("Diliman", 14.6488, 121.0537),
    ("Commonwealth", 14.6760, 121.0486),
    ("Fairview", 14.7032, 121.0823),
    ("Novaliches", 14.7216, 121.0398),
    ("Batasan Hills", 14.6886, 121.0925),
    ("Project 6", 14.6545, 121.0326),
    ("Kamuning", 14.6354, 121.0352),
]

# Approx 250m to 850m radial spread per point.
MIN_JITTER = 0.0022
MAX_JITTER = 0.0075


def jitter_point(base_lat: float, base_lng: float) -> tuple[float, float]:
    angle = random.uniform(0, 6.28318530718)
    radius = random.uniform(MIN_JITTER, MAX_JITTER)
    lat = base_lat + radius * random.uniform(0.7, 1.3) * random.choice([-1, 1]) * abs(random.random())
    lng = base_lng + radius * random.uniform(0.7, 1.3) * random.choice([-1, 1]) * abs(random.random())
    # Keep points inside practical MM bounds while scoped to Manila/QC only.
    lat = min(14.76, max(14.54, lat))
    lng = min(121.11, max(120.95, lng))
    return round(lat, 6), round(lng, 6)


def pick_hotspot(city_value: str):
    city = (city_value or "").strip().lower()
    if city == "manila":
        return random.choice(MANILA_HOTSPOTS), "Manila"
    return random.choice(QC_HOTSPOTS), "Quezon City"


def rebalance():
    random.seed(42)
    with INPUT_FILE.open("r", newline="", encoding="utf-8") as src:
        reader = csv.DictReader(src)
        rows = list(reader)
        fieldnames = reader.fieldnames

    if not fieldnames:
        raise RuntimeError("Input CSV has no headers.")

    for row in rows:
        (barangay, base_lat, base_lng), normalized_city = pick_hotspot(row.get("city", ""))
        lat, lng = jitter_point(base_lat, base_lng)
        row["city"] = normalized_city
        row["barangay"] = barangay
        row["latitude"] = str(lat)
        row["longitude"] = str(lng)

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as dst:
        writer = csv.DictWriter(dst, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Rebalanced {len(rows)} incidents in {OUTPUT_FILE.name}")


if __name__ == "__main__":
    rebalance()
