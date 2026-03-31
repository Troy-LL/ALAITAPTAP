import json
import csv
import os

def get_centroid(geometry):
    if geometry['type'] == 'Point':
        return geometry['coordinates'][1], geometry['coordinates'][0]
    elif geometry['type'] in ['Polygon', 'MultiPolygon']:
        # Simple centroid of coordinates for conversion
        coords = []
        if geometry['type'] == 'Polygon':
            for ring in geometry['coordinates']:
                coords.extend(ring)
        else: # MultiPolygon
            for poly in geometry['coordinates']:
                for ring in poly:
                    coords.extend(ring)
        
        if not coords:
            return None, None
            
        avg_lat = sum(c[1] for c in coords) / len(coords)
        avg_lon = sum(c[0] for c in coords) / len(coords)
        return avg_lat, avg_lon
    return None, None

geojson_path = 'export.geojson'
csv_path = 'cleaned_safety_data.csv'

cities_to_include = {'manila', 'quezon city'}

with open(geojson_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

rows = []
for feature in data.get('features', []):
    props = feature.get('properties', {})
    city = props.get('addr:city', '').lower()
    
    # Filtering
    if city not in cities_to_include:
        continue
        
    lat, lon = get_centroid(feature.get('geometry', {}))
    if lat is None or lon is None:
        continue
        
    # Mapping properties
    osm_id = props.get('@id', feature.get('id', ''))
    name = props.get('name', 'Safe Spot')
    
    # Try to determine type
    spot_type = props.get('amenity', props.get('shop', props.get('tourism', 'safe_spot')))
    
    # Normalize surveillance if mentioned
    if 'surveillance' in props:
        spot_type = 'surveillance'
    
    row = {
        'osm_id': osm_id,
        'name': name,
        'surveillance_type': 'camera' if spot_type == 'surveillance' else spot_type,
        'opening_hours': props.get('opening_hours', '24/7'),
        'latitude': lat,
        'longitude': lon,
        'osm_type': osm_id.split('/')[0] if '/' in osm_id else ''
    }
    rows.append(row)

# Headers for compatibility with existing parser
headers = ['osm_id', 'name', 'surveillance_type', 'opening_hours', 'latitude', 'longitude', 'osm_type']

with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)

print(f"Successfully processed {len(rows)} features into {csv_path}")
