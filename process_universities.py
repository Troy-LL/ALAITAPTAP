import csv
import re
import os

routes_path = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\app\api\routes.py'
safespots_csv = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-frontend\public\data\safety_data_cleaned.csv'

hints_data = []

# railways
with open(r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\data\railways.csv', 'r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        line = row['line'].strip()
        if line in ['LRT-1', 'LRT-2', 'MRT-3']:
            name = row['name'].strip()
            city = row['city'].strip()
            lat = float(row['lat'].strip())
            lon = float(row['lon'].strip())
            q_name = name.lower().replace('"', '')
            aliases = [q_name, f"{q_name} station", f"{line.lower()} {q_name}"]
            hints_data.append({
                "label": f"{name} Station ({line}), {city}",
                "lat": lat,
                "lng": lon,
                "aliases": aliases,
                "type": "transit",
                "original_name": f"{name} Station ({line})"
            })

# universities
with open(r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\data\university.csv', 'r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row['Name'].strip()
        city = row['City'].strip()
        lat_s = row['Latitude'].strip()
        lon_s = row['Longitude'].strip()
        if not lat_s or not lon_s: continue
        lat = float(lat_s)
        lon = float(lon_s)
        
        q_name = name.lower().replace('"', '')
        aliases = [q_name]
        if ' - ' in q_name:
            aliases.append(q_name.split(' - ')[0].strip())
            aliases.append(q_name.split(' - ')[1].strip())
        if '(' in q_name:
            aliases.append(q_name.split('(')[0].strip())
            
        hints_data.append({
            "label": f"{name}, {city}",
            "lat": lat,
            "lng": lon,
            "aliases": aliases,
            "type": "university",
            "original_name": name
        })

existing_safespots = set()
if os.path.exists(safespots_csv):
    with open(safespots_csv, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.split(',')
            if len(parts) > 1:
                existing_safespots.add(parts[1].strip())

new_csv_lines = []
for h in hints_data:
    if h["original_name"] not in existing_safespots:
        existing_safespots.add(h["original_name"])
        # Avoid commas in name by replacing them
        clean_name = h['original_name'].replace(',', '')
        new_csv_lines.append(f"node,{clean_name},{h['type']},06:00-22:00,{h['lat']},{h['lng']}\n")

if new_csv_lines:
    with open(safespots_csv, 'a', encoding='utf-8') as f:
        f.writelines(new_csv_lines)

hints_code = "STATION_HINTS = [\n"
for h in hints_data:
    label_safe = h['label'].replace("'", "")
    hints_code += f"    {{\n"
    hints_code += f"        'label': '{label_safe}',\n"
    hints_code += f"        'lat': {h['lat']},\n"
    hints_code += f"        'lng': {h['lng']},\n"
    hints_code += f"        'aliases': {h['aliases']}\n"
    hints_code += f"    }},\n"
hints_code += "]\n\n"

with open(routes_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'STATION_HINTS\s*=\s*\[.*?\]\n\n', re.DOTALL)
new_content = pattern.sub(hints_code, content)

with open(routes_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Added {len(new_csv_lines)} new safe spots. Rewrote routes.py perfectly.")
