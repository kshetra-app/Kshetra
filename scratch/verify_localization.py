import os
import re

seed_dir = r"c:\Users\Laven\OneDrive\Desktop\Kshetra\data\seed"
files = [f for f in os.listdir(seed_dir) if f.endswith("-constituencies.ts")]

print(f"{'File':<40} | {'Total Records':<15} | {'Localized':<10} | {'Missing':<10}")
print("-" * 85)

all_ok = True

for filename in files:
    filepath = os.path.join(seed_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to find all objects inside the array
    # A simple way is to find all occurrences of { ... } that represent a constituency seed.
    # In these files, each constituency seed is on a separate line and typically looks like:
    # { acNo: 1, name: '...', ... } or similar.
    # Let's match all lines starting with optional whitespace, followed by { acNo: or {acNo:
    lines = content.split("\n")
    records = []
    for i, line in enumerate(lines):
        if re.search(r"\{\s*acNo\s*:", line):
            # Check if localName is in this line
            has_local = "localName:" in line or "localName :" in line
            # Extract acNo and name
            ac_match = re.search(r"acNo\s*:\s*(\d+)", line)
            name_match = re.search(r"name\s*:\s*['\"]([^'\"]+)['\"]", line)
            ac_no = ac_match.group(1) if ac_match else str(i)
            name = name_match.group(1) if name_match else "Unknown"
            records.append((ac_no, name, has_local))
            
    total = len(records)
    localized = sum(1 for r in records if r[2])
    missing = total - localized
    
    if missing > 0:
        all_ok = False
        print(f"{filename:<40} | {total:<15} | {localized:<10} | {missing:<10} <-- MISSING!")
        # Print first few missing
        missing_entries = [f"acNo {r[0]} ({r[1]})" for r in records if not r[2]]
        print(f"   Missing: {', '.join(missing_entries[:10])}" + (f" ... and {len(missing_entries)-10} more" if len(missing_entries) > 10 else ""))
    else:
        print(f"{filename:<40} | {total:<15} | {localized:<10} | {missing:<10} (OK)")

print("-" * 85)
if all_ok:
    print("ALL FILES ARE 100% CORRECTLY LOCALIZED!")
else:
    print("WARNING: SOME FILES HAVE MISSING LOCALIZATION!")
