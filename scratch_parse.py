import re
import json

filepath = r"c:\Users\Laven\OneDrive\Desktop\Kshetra\data\seed\karnataka-constituencies.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Regular expression to extract acNo and name
matches = re.findall(r'\{\s*acNo:\s*(\d+),\s*name:\s*\'([^\']+)\'', content)

constituencies = []
for ac, name in matches:
    constituencies.append({"acNo": int(ac), "name": name})

print(f"Total found: {len(constituencies)}")
for c in constituencies[:30]:
    print(f"{c['acNo']}: {c['name']}")
