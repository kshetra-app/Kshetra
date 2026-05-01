"""Quick party tally verification for scraped CSVs"""
import csv
from collections import Counter

files = {
    'Kerala 2021': ('scripts/kerala-2021-wiki.csv', 140),
    'West Bengal 2021': ('scripts/west-bengal-2021-wiki.csv', 294),
    'UP 2022': ('scripts/uttar-pradesh-2022-wiki.csv', 403),
}

for name, (path, expected) in files.items():
    rows = list(csv.DictReader(open(path, 'r', encoding='utf-8')))
    parties = Counter(r['winner_party'] for r in rows)
    types = Counter(r['type'] for r in rows)
    
    print(f"\n{'='*50}")
    print(f"{name}: {len(rows)}/{expected} seats")
    print(f"{'='*50}")
    print(f"Seat types: {dict(types)}")
    print(f"Party tally:")
    for p, c in parties.most_common(15):
        print(f"  {p:15s}: {c}")
    
    # Check for missing AC numbers
    ac_nos = sorted(int(r['ac_no']) for r in rows)
    missing = [i for i in range(1, expected + 1) if i not in ac_nos]
    if missing:
        print(f"Missing AC#s: {missing}")
