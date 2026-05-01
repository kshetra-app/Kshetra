import requests
from bs4 import BeautifulSoup
import sys

url = sys.argv[1] if len(sys.argv) > 1 else 'https://en.wikipedia.org/wiki/Results_of_the_2021_West_Bengal_Legislative_Assembly_election'
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.text, 'html.parser')

tables = soup.find_all('table', class_='wikitable')
print(f"Found {len(tables)} wikitables")

for ti, t in enumerate(tables):
    rows = t.find_all('tr')
    print(f"\nTable {ti} ({len(rows)} rows):")
    
    # Show first 5 rows
    for ri, row in enumerate(rows[:5]):
        cells = row.find_all(['th', 'td'])
        cell_data = []
        for c in cells:
            tag = c.name
            text = c.get_text().strip().replace('\n', ' ')[:50]
            colspan = c.get('colspan', '1')
            cell_data.append(f"<{tag} cs={colspan}>{text}")
        print(f"  Row {ri}: {cell_data}")
