import csv

fp = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\data\railways.csv'
routes_path = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\app\api\routes.py'

res_py = []
with open(fp, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        line = row['line'].strip()
        if line in ['LRT-1', 'LRT-2', 'MRT-3']:
            name = row['name'].strip()
            city = row['city'].strip()
            lat = row['lat'].strip()
            lon = row['lon'].strip()
            q_name = name.lower().replace('"', '')
            first_word = q_name.split('-')[0].split()[0] if q_name else ''
            res_py.append(f'    if "{q_name}" in q or ("{line.lower()}" in q and "{first_word}" in q):')
            res_py.append(f'        hints.append({{"label": "{name} Station ({line}), {city}", "lat": {lat}, "lng": {lon}}})')

with open(routes_path, 'r', encoding='utf-8') as f:
    content = f.read()

insert_str = '\n'.join(res_py) + '\n    return hints'
new_content = content.replace('    return hints', insert_str, 1)

with open(routes_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done updating routes.py")
