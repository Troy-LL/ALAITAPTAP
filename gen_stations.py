import csv
import os

fp = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-backend\data\railways.csv'
csv_path = r'p:\Troy\Code\Hackathons & Challenges\ASEAN Challenge Ideas\ALAITAPTAP\saferoute-frontend\public\data\safety_data_cleaned.csv'

res_csv = []
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
            
            # frontend csv
            csv_line = f'node,{name} Station ({line}),transit,05:00-22:00,{lat},{lon}\n'
            res_csv.append(csv_line)
            
            # py hints
            q_name = name.lower().replace('"', '')
            first_word = q_name.split('-')[0].split()[0] if q_name else ''
            res_py.append(f'    if "{q_name}" in q or ("{line.lower()}" in q and "{first_word}" in q):')
            res_py.append(f'        hints.append({{"label": "{name} Station ({line}), {city}", "lat": {lat}, "lng": {lon}}})')

# Append to CSV
with open(csv_path, 'a', encoding='utf-8') as f:
    f.writelines(res_csv)

# Print res_py
print('\n'.join(res_py))
