"""
Scrape constituency-wise election results from Wikipedia.
Generates CSV files for Kerala 2021, West Bengal 2021, and UP 2022.
"""

import requests
from bs4 import BeautifulSoup
import csv
import re
import os
import sys

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Wikipedia pages with constituency-wise results tables
STATES = {
    'KL': {
        'name': 'Kerala',
        'year': 2021,
        'seats': 140,
        'url': 'https://en.wikipedia.org/wiki/Results_of_the_2021_Kerala_Legislative_Assembly_election',
        'outfile': 'kerala-2021-wiki.csv',
    },
    'WB': {
        'name': 'West Bengal',
        'year': 2021,
        'seats': 294,
        'url': 'https://en.wikipedia.org/wiki/Results_of_the_2021_West_Bengal_Legislative_Assembly_election',
        'outfile': 'west-bengal-2021-wiki.csv',
    },
    'UP': {
        'name': 'Uttar Pradesh',
        'year': 2022,
        'seats': 403,
        'url': 'https://en.wikipedia.org/wiki/2022_Uttar_Pradesh_Legislative_Assembly_election',
        'outfile': 'uttar-pradesh-2022-wiki.csv',
    },
}

def clean_text(text):
    """Clean Wikipedia text artifacts"""
    if not text:
        return ''
    # Remove citation references like [1], [a], etc
    text = re.sub(r'\[.*?\]', '', text)
    # Remove non-breaking spaces
    text = text.replace('\xa0', ' ')
    # Strip whitespace
    text = text.strip()
    return text

def parse_number(text):
    """Parse a number from text, removing commas and other artifacts"""
    text = clean_text(text)
    text = re.sub(r'[^\d]', '', text)
    try:
        return int(text)
    except (ValueError, TypeError):
        return 0

def fetch_page(url):
    """Fetch a Wikipedia page"""
    print(f"  Fetching {url}...")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, 'html.parser')

def find_results_tables(soup):
    """Find all wikitables that look like constituency results tables"""
    tables = soup.find_all('table', class_='wikitable')
    result_tables = []
    for table in tables:
        # Check if this table has constituency-related headers
        headers = table.find_all('th')
        header_text = ' '.join(clean_text(th.get_text()) for th in headers[:10]).lower()
        if any(kw in header_text for kw in ['constituency', 'winner', 'candidate', 'party', 'votes', 'margin']):
            result_tables.append(table)
    return result_tables

def extract_header_indices(header_row):
    """Extract column indices from header row"""
    headers = []
    for th in header_row.find_all(['th', 'td']):
        colspan = int(th.get('colspan', 1))
        text = clean_text(th.get_text()).lower()
        headers.extend([text] * colspan)
    return headers

def scrape_kerala(soup):
    """Parse Kerala-style table: Number, Constituency, District, [UDF Cand, Party, Votes], [LDF Cand, Party, Votes], [NDA Cand, Party, Votes], Winner, Margin, Winning Party"""
    table = soup.find('table', class_='wikitable')
    if not table:
        return []
    rows = table.find_all('tr')
    results = []
    for row in rows[1:]:  # skip header
        cells = row.find_all(['td', 'th'])
        texts = [clean_text(c.get_text()) for c in cells]
        if len(texts) < 12:
            continue
        # Columns: 0=Number, 1=Constituency, 2=District, 3=UDF Cand, 4=Party, 5=Votes,
        #          6=LDF Cand, 7=Party, 8=Votes, 9=NDA Cand, 10=Party, 11=Votes,
        #          12=Winner, 13=Margin, 14=Winning Party, 15=Winning Alliance
        candidates = []
        # UDF
        if len(texts) > 5 and texts[3] and texts[3] not in ['-', '–']:
            candidates.append({'name': texts[3], 'party': texts[4], 'votes': parse_number(texts[5])})
        # LDF
        if len(texts) > 8 and texts[6] and texts[6] not in ['-', '–']:
            candidates.append({'name': texts[6], 'party': texts[7], 'votes': parse_number(texts[8])})
        # NDA
        if len(texts) > 11 and texts[9] and texts[9] not in ['-', '–']:
            candidates.append({'name': texts[9], 'party': texts[10], 'votes': parse_number(texts[11])})

        candidates = [c for c in candidates if c['votes'] > 0]
        candidates.sort(key=lambda x: x['votes'], reverse=True)

        if len(candidates) < 2:
            continue

        winner = candidates[0]
        runner = candidates[1]
        margin = parse_number(texts[13]) if len(texts) > 13 else winner['votes'] - runner['votes']

        results.append({
            'ac_no': texts[0],
            'constituency': texts[1],
            'district': texts[2],
            'type': 'GEN',
            'winner_name': winner['name'],
            'winner_party': winner['party'],
            'winner_votes': str(winner['votes']),
            'margin': str(margin),
            'runner_name': runner['name'],
            'runner_party': runner['party'],
        })
    return results


def scrape_wb_up(soup, expected_seats):
    """Parse WB/UP-style table: #, Name(type), [color], Party, Candidate, Votes, %, [color], Party, Candidate, Votes, %, Margin, [Date]
    With district separator rows like '<td colspan=14>XYZ District'
    """
    # Find the largest wikitable (the results table)
    tables = soup.find_all('table', class_='wikitable')
    target = None
    for t in tables:
        rows = t.find_all('tr')
        if len(rows) > expected_seats * 0.5:
            target = t
            break
    if not target:
        print(f"  Could not find results table (need >{expected_seats*0.5} rows)")
        return []

    rows = target.find_all('tr')
    print(f"  Found target table with {len(rows)} rows")
    results = []
    current_district = ''

    for row in rows[2:]:  # Skip 2 header rows
        cells = row.find_all(['td', 'th'])
        if not cells:
            continue

        # Check for district separator row (single cell with colspan)
        first_cell = cells[0]
        colspan = int(first_cell.get('colspan', 1))
        if colspan > 5:
            district_text = clean_text(first_cell.get_text())
            # Remove "District" suffix
            district_text = re.sub(r'\s*[Dd]istrict$', '', district_text).strip()
            if district_text:
                current_district = district_text
            continue

        texts = [clean_text(c.get_text()) for c in cells]
        if len(texts) < 10:
            continue

        # Extract AC number from first cell
        ac_no = texts[0]
        if not ac_no or not re.match(r'^\d+$', ac_no):
            continue

        # Extract constituency name and type from second cell
        name_raw = texts[1]
        seat_type = 'GEN'
        m = re.search(r'\(SC\)', name_raw)
        if m:
            seat_type = 'SC'
            name_raw = name_raw.replace('(SC)', '').strip()
        m = re.search(r'\(ST\)', name_raw)
        if m:
            seat_type = 'ST'
            name_raw = name_raw.replace('(ST)', '').strip()
        constituency = name_raw.strip()

        # WB/UP format: cells have color indicator cells (empty) before party name
        # Typical: #, Name, [Turnout%], Candidate, [color], Party, Votes, %, Candidate, [color], Party, Votes, %, Margin, [Date]
        # But the exact column positions vary due to empty color cells
        # Strategy: find cells with commas (vote counts) and work backwards/forwards

        # Find all numeric vote-like cells (>1000 with commas or pure digits)
        vote_cells = []
        for idx, t in enumerate(texts):
            cleaned = t.replace(',', '')
            if re.match(r'^\d{4,}$', cleaned):
                vote_cells.append((idx, int(cleaned)))

        # Find party names (short uppercase strings, typically 2-6 chars)
        party_cells = []
        for idx, t in enumerate(texts):
            if re.match(r'^[A-Z][A-Za-z()\s]{1,30}$', t) and len(t) < 35:
                # Could be a party or candidate name
                if re.match(r'^[A-Z]{2,10}$', t) or t in ['SP', 'BJP', 'BSP', 'INC', 'AITC', 'IND', 'CPI(M)', 'CPI', 'CPIM', 'NCP', 'RLD', 'JD(U)', 'IUML', 'RSP', 'ISF']:
                    party_cells.append((idx, t))

        # Strategy: look for pattern Candidate, [empty], Party, Votes, %
        # Winner is the first group, runner-up is the second
        winner_name = ''
        winner_party = ''
        winner_votes = 0
        runner_name = ''
        runner_party = ''
        runner_votes = 0
        margin = 0

        if len(vote_cells) >= 2:
            # First vote count = winner votes, second = runner-up votes
            v1_idx, v1_val = vote_cells[0]
            v2_idx, v2_val = vote_cells[1]

            # Winner candidate is a few cells before first votes
            # Search backwards from vote cell for candidate name (non-empty, non-%, non-party)
            for search_idx in range(v1_idx - 1, max(1, v1_idx - 5), -1):
                if search_idx < len(texts):
                    val = texts[search_idx]
                    if val and not re.match(r'^[\d.,%]+$', val) and len(val) > 2 and not re.match(r'^[A-Z]{2,6}$', val):
                        winner_name = val
                        break

            # Winner party: between candidate and votes
            for search_idx in range(v1_idx - 1, max(1, v1_idx - 4), -1):
                if search_idx < len(texts):
                    val = texts[search_idx]
                    if val and (re.match(r'^[A-Z]{2,10}$', val) or val in ['CPI(M)', 'CPI(ML)(Liberation)', 'JD(U)', 'JD(S)', 'AD(S)', 'KC(M)']):
                        winner_party = val
                        break

            winner_votes = v1_val

            # Same for runner-up
            for search_idx in range(v2_idx - 1, max(v1_idx + 1, v2_idx - 5), -1):
                if search_idx < len(texts):
                    val = texts[search_idx]
                    if val and not re.match(r'^[\d.,%]+$', val) and len(val) > 2 and not re.match(r'^[A-Z]{2,6}$', val):
                        runner_name = val
                        break

            for search_idx in range(v2_idx - 1, max(v1_idx + 1, v2_idx - 4), -1):
                if search_idx < len(texts):
                    val = texts[search_idx]
                    if val and (re.match(r'^[A-Z]{2,10}$', val) or val in ['CPI(M)', 'CPI(ML)(Liberation)', 'JD(U)', 'JD(S)', 'AD(S)', 'KC(M)']):
                        runner_party = val
                        break

            runner_votes = v2_val
            margin = abs(winner_votes - runner_votes)

            # Check for explicit margin column (last vote-like cell that's smaller)
            if len(vote_cells) >= 3:
                last_vote_idx, last_vote_val = vote_cells[-1]
                if last_vote_val < v1_val and last_vote_val < v2_val:
                    margin = last_vote_val

        if not winner_name or not winner_party:
            continue

        results.append({
            'ac_no': ac_no,
            'constituency': constituency,
            'district': current_district,
            'type': seat_type,
            'winner_name': winner_name,
            'winner_party': winner_party,
            'winner_votes': str(winner_votes),
            'margin': str(margin),
            'runner_name': runner_name,
            'runner_party': runner_party,
        })

    return results


def scrape_state(state_key):
    """Scrape constituency results for a state from Wikipedia"""
    cfg = STATES[state_key]
    print(f"\n{'='*60}")
    print(f"Scraping {cfg['name']} {cfg['year']} election results...")
    print(f"{'='*60}")

    soup = fetch_page(cfg['url'])

    if state_key == 'KL':
        results = scrape_kerala(soup)
    else:
        results = scrape_wb_up(soup, cfg['seats'])

    print(f"\n  Extracted {len(results)} constituency records")

    # Write CSV
    if results:
        outpath = os.path.join(os.path.dirname(__file__), cfg['outfile'])
        fieldnames = ['ac_no', 'constituency', 'district', 'type', 'winner_name', 'winner_party', 'winner_votes', 'margin', 'runner_name', 'runner_party']
        with open(outpath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            for r in results:
                writer.writerow(r)
        print(f"  Saved to {outpath}")
    else:
        print(f"  WARNING: No results extracted!")

    return results

def main():
    states_to_scrape = sys.argv[1:] if len(sys.argv) > 1 else ['KL', 'WB', 'UP']
    
    print("=== Wikipedia Election Results Scraper ===")
    print(f"States: {', '.join(states_to_scrape)}")
    
    for state in states_to_scrape:
        state = state.upper()
        if state in STATES:
            results = scrape_state(state)
            expected = STATES[state]['seats']
            actual = len(results)
            status = "OK" if actual >= expected * 0.9 else "INCOMPLETE"
            print(f"\n  {STATES[state]['name']}: {actual}/{expected} seats [{status}]")
        else:
            print(f"  Unknown state: {state}")
    
    print("\n=== Done ===")

if __name__ == '__main__':
    main()
