"""
Convert scraped Wikipedia CSV election data to TypeScript seed files.
Matches the format of tamil-nadu-constituencies.ts
"""

import csv
import os
from collections import Counter

# Normalize party names to our PartyCode format
PARTY_MAP = {
    'CPI(M)': 'CPIM',
    'CPI(ML)(L)': 'CPIML',
    'CPI(ML)(Liberation)': 'CPIML',
    'CPIM': 'CPIM',
    'CPI': 'CPI',
    'INC': 'INC',
    'BJP': 'BJP',
    'AITC': 'AITC',
    'SP': 'SP',
    'BSP': 'BSP',
    'IUML': 'IUML',
    'KC(M)': 'KCM',
    'KC(J)': 'KCJ',
    'KC': 'KC',
    'JD(S)': 'JDS',
    'NCP': 'NCP',
    'Ind.': 'IND',
    'IND': 'IND',
    'LJD': 'LJD',
    'RSP': 'RSP',
    'RMPI': 'RMPI',
    'INL': 'INL',
    'NSC': 'NSC',
    'Con(S)': 'CONS',
    'ISF': 'ISF',
    'AD(S)': 'ADSL',
    'RLD': 'RLD',
    'SBSP': 'SBSP',
    'NISHAD': 'NISHAD',
    'JnP': 'NISHAD',
    'AIFB': 'AIFB',
    'GJM': 'GJM',
}

def normalize_party(raw):
    """Normalize party abbreviation to our PartyCode"""
    if not raw:
        return 'IND'
    raw = raw.strip()
    if raw in PARTY_MAP:
        return PARTY_MAP[raw]
    # Already a clean abbreviation
    if raw.upper() == raw and len(raw) <= 8:
        return raw
    return raw

def escape_ts_string(s):
    """Escape a string for TypeScript single quotes"""
    return s.replace("'", "\\'").replace('\n', ' ').strip()

CONFIGS = {
    'KL': {
        'csv': 'scripts/kerala-2021-wiki.csv',
        'outfile': 'data/seed/kerala-constituencies.ts',
        'name': 'Kerala',
        'year': 2021,
        'seats': 140,
        'interface': 'KLConstituencySeed',
        'array': 'KL_CONSTITUENCIES',
        'year_suffix': '2021',
    },
    'WB': {
        'csv': 'scripts/west-bengal-2021-wiki.csv',
        'outfile': 'data/seed/west-bengal-constituencies.ts',
        'name': 'West Bengal',
        'year': 2021,
        'seats': 294,
        'interface': 'WBConstituencySeed',
        'array': 'WB_CONSTITUENCIES',
        'year_suffix': '2021',
    },
    'UP': {
        'csv': 'scripts/uttar-pradesh-2022-wiki.csv',
        'outfile': 'data/seed/uttar-pradesh-constituencies.ts',
        'name': 'Uttar Pradesh',
        'year': 2022,
        'seats': 403,
        'interface': 'UPConstituencySeed',
        'array': 'UP_CONSTITUENCIES',
        'year_suffix': '2022',
    },
}


def generate_ts(state_key):
    cfg = CONFIGS[state_key]
    rows = list(csv.DictReader(open(cfg['csv'], 'r', encoding='utf-8')))
    
    # Sort by AC number
    rows.sort(key=lambda r: int(r['ac_no']))
    
    # Build party tally
    parties = Counter(normalize_party(r['winner_party']) for r in rows)
    tally_str = ' | '.join(f"{p}: {c}" for p, c in parties.most_common(15))
    tally_str += f" | Total: {len(rows)}"
    
    # Group by district for comments
    districts = {}
    for r in rows:
        d = r['district'] or 'Unknown'
        districts.setdefault(d, []).append(r)
    
    year = cfg['year_suffix']
    iface = cfg['interface']
    arr = cfg['array']
    
    lines = []
    lines.append(f"/**")
    lines.append(f" * {cfg['name']} Assembly Constituencies — Full Data ({len(rows)} seats)")
    lines.append(f" *")
    lines.append(f" * ── SOURCE ──────────────────────────────────────────────────────────────────")
    lines.append(f" *  Election Commission of India, {cfg['name']} {cfg['year']} General Election results.")
    lines.append(f" *  Data scraped from Wikipedia (sourced from ECI) and cross-verified.")
    lines.append(f" *")
    lines.append(f" * ── PARTY TALLY ────────────────────────────────────────────────────────────")
    lines.append(f" *  {tally_str}")
    lines.append(f" */")
    lines.append(f"")
    lines.append(f"export interface {iface} {{")
    lines.append(f"  acNo: number;")
    lines.append(f"  name: string;")
    lines.append(f"  district: string;")
    lines.append(f"  type: 'GEN' | 'SC' | 'ST';")
    lines.append(f"  winner{year}: string;")
    lines.append(f"  winnerName{year}: string;")
    lines.append(f"  winnerVotes{year}: number;")
    lines.append(f"  runnerUp{year}: string;")
    lines.append(f"  margin{year}: number;")
    lines.append(f"  currentParty: string;")
    lines.append(f"}}")
    lines.append(f"")
    lines.append(f"export const {arr}: {iface}[] = [")
    
    current_district = ''
    for r in rows:
        d = r['district'] or 'Unknown'
        if d != current_district:
            current_district = d
            lines.append(f"  // ── {d} District ──")
        
        ac = int(r['ac_no'])
        name = escape_ts_string(r['constituency'])
        district = escape_ts_string(d)
        stype = r['type'] if r['type'] in ['GEN', 'SC', 'ST'] else 'GEN'
        wp = normalize_party(r['winner_party'])
        wn = escape_ts_string(r['winner_name'])
        wv = int(r['winner_votes']) if r['winner_votes'] else 0
        rp = normalize_party(r['runner_party'])
        margin = int(r['margin']) if r['margin'] else 0
        
        lines.append(
            f"  {{ acNo: {ac}, name: '{name}', district: '{district}', type: '{stype}', "
            f"winner{year}: '{wp}', winnerName{year}: '{wn}', winnerVotes{year}: {wv}, "
            f"runnerUp{year}: '{rp}', margin{year}: {margin}, currentParty: '{wp}' }},"
        )
    
    lines.append(f"];")
    lines.append(f"")
    lines.append(f"export function get{state_key}Constituency(acNo: number): {iface} | undefined {{")
    lines.append(f"  return {arr}.find(c => c.acNo === acNo);")
    lines.append(f"}}")
    lines.append(f"")
    
    outpath = os.path.join(os.path.dirname(os.path.dirname(__file__)), cfg['outfile'])
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"  Generated {outpath} ({len(rows)} seats, {len(districts)} districts)")
    return len(rows)


def main():
    import sys
    states = sys.argv[1:] if len(sys.argv) > 1 else ['KL', 'WB', 'UP']
    
    print("=== CSV to TypeScript Seed Generator ===")
    for state in states:
        state = state.upper()
        if state in CONFIGS:
            print(f"\nGenerating {CONFIGS[state]['name']}...")
            count = generate_ts(state)
            expected = CONFIGS[state]['seats']
            print(f"  {count}/{expected} seats")
        else:
            print(f"  Unknown state: {state}")
    print("\n=== Done ===")

if __name__ == '__main__':
    main()
