import csv

fp = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\data\railways.csv'
routes_path = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\app\api\routes.py'

hints_data = [
    {
        "label": "Ateneo de Manila University, Loyola Heights, Quezon City",
        "lat": 14.6385,
        "lng": 121.0772,
        "aliases": ["ateneo", "admu", "ateneo de manila"]
    },
    {
        "label": "Ateneo Gate 2, Katipunan Avenue, Quezon City",
        "lat": 14.6409,
        "lng": 121.0734,
        "aliases": ["ateneo gate 2"]
    },
    {
        "label": "Ateneo Gate 3, Katipunan Avenue, Quezon City",
        "lat": 14.6412,
        "lng": 121.0728,
        "aliases": ["ateneo gate 3"]
    },
    {
        "label": "University of the Philippines Diliman, Quezon City",
        "lat": 14.6537,
        "lng": 121.0682,
        "aliases": ["up diliman", "upd", "university of the philippines"]
    }
]

with open(fp, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
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
                "aliases": aliases
            })

hints_code = "STATION_HINTS = [\n"
for h in hints_data:
    hints_code += f"    {{\n"
    hints_code += f"        'label': '{h['label']}',\n"
    hints_code += f"        'lat': {h['lat']},\n"
    hints_code += f"        'lng': {h['lng']},\n"
    hints_code += f"        'aliases': {h['aliases']}\n"
    hints_code += f"    }},\n"
hints_code += "]\n\n"

hints_func = """def _metro_manila_poi_hints(raw: str) -> List[Dict[str, Any]]:
    \"\"\"Curated suggestions matching prefixes and aliases for fast autocomplete.\"\"\"
    q = raw.strip().lower()
    if len(q) < 2:
        return []
    
    hints: List[Dict[str, Any]] = []
    for h in STATION_HINTS:
        if any(q in alias for alias in h["aliases"]):
            hints.append({
                "label": h["label"],
                "lat": h["lat"],
                "lng": h["lng"]
            })
            if len(hints) >= 8:
                break
    return hints
"""

with open(routes_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_hints_func = False

for line in lines:
    if line.startswith("def _metro_manila_poi_hints"):
        in_hints_func = True
        new_lines.append(hints_code)
        new_lines.append(hints_func)
        continue
        
    if in_hints_func:
        if line.startswith("def _feature_to_result"):
            in_hints_func = False
            new_lines.append("\n")
            new_lines.append(line)
        continue
        
    new_lines.append(line)

with open(routes_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
