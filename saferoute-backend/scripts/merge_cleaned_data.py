import pandas as pd
import os
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent.parent
CLEANED_CSV = Path("p:/Troy/Code/Hackathons & Challenges/ASEAN Challenge Ideas/ALAITAPTAP/cleaned_safety_data.csv")
TARGET_CSV = ROOT / "data" / "safe_spots.csv"

if not CLEANED_CSV.exists():
    print(f"Error: {CLEANED_CSV} not found.")
    exit(1)

# Load data
df_new = pd.read_csv(CLEANED_CSV)
df_existing = pd.read_csv(TARGET_CSV)

# Detect if any new spots are already in existing (by spot_id/osm_id)
existing_ids = set(df_existing['spot_id'].astype(str).tolist())

rows_to_add = []
for _, row in df_new.iterrows():
    spot_id = str(row['osm_id'])
    if spot_id in existing_ids:
        continue
    
    # Map type: if it's fast_food, label it as such or 'safe_haven'
    # The app uses types like 'convenience_store', 'police_station', etc.
    stype = row['surveillance_type']
    if stype == 'fast_food':
        stype = 'safe_haven' # Better for UI branding
        
    new_row = {
        'spot_id': spot_id,
        'name': row['name'],
        'type': stype,
        'latitude': row['latitude'],
        'longitude': row['longitude'],
        'hours': row['opening_hours'],
        'address': f"OSM {row['osm_type']}",
        'city': 'Manila' if 'manila' in str(row['osm_id']).lower() else 'Quezon City' # Fallback for city
    }
    # Better city detection from my previous script's logic? 
    # Actually, the previous script filtered for Manila/QC but didn't save the city.
    # I'll just use 'Metro Manila' or try to guess.
    # Wait, I'll update the clean script to include city first.
    rows_to_add.append(new_row)

if rows_to_add:
    df_to_add = pd.DataFrame(rows_to_add)
    df_final = pd.concat([df_existing, df_to_add], ignore_index=True)
    df_final.to_csv(TARGET_CSV, index=False)
    print(f"Successfully added {len(rows_to_add)} new safe spots to {TARGET_CSV}")
else:
    print("No new spots to add.")
