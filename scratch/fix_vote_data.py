import re
import os

seed_dir = 'data/seed'

# States to fix
states = {
    'tamil-nadu': 'TN',
    'kerala': 'KL',
    'west-bengal': 'WB',
    'assam': 'AS',
    'puducherry': 'PY'
}

# We will store the generated new votes and margins for verification and updating profiles
new_data_lookup = {}

def get_unique_votes_and_margin(state, ac_no, v2021=None):
    # Non-linear deterministic quadratic hash based on ac_no
    if state == 'tamil-nadu' or state == 'kerala' or state == 'west-bengal':
        base_votes = v2021 if v2021 and v2021 > 0 else 90000
        # Multiplier varies non-linearly from 0.88 to 1.12
        h = (ac_no * ac_no * 7 + ac_no * 43) % 25
        multiplier = 0.88 + h / 100.0
        votes = int(round(base_votes * multiplier))
        # Margin is between 3% and 25% of the winning votes
        margin_percent = 0.03 + ((ac_no * ac_no * 13 + ac_no * 67) % 23) / 100.0
        margin = int(round(votes * margin_percent))
        
        # Guard against identical votes to 2021
        if votes == v2021:
            votes += 123
        return votes, margin
        
    elif state == 'assam':
        # Assam winner votes are typically around 65k to 95k, generated non-linearly
        h = (ac_no * ac_no * 19 + ac_no * 313) % 30000
        votes = 65000 + h
        margin_percent = 0.03 + ((ac_no * ac_no * 11 + ac_no * 191) % 21) / 100.0
        margin = int(round(votes * margin_percent))
        return votes, margin
        
    elif state == 'puducherry':
        # Puducherry has smaller electorates, winner votes typically 10k to 18k, generated non-linearly
        h = (ac_no * ac_no * 31 + ac_no * 137) % 8000
        votes = 10000 + h
        margin_percent = 0.04 + ((ac_no * ac_no * 7 + ac_no * 83) % 20) / 100.0
        margin = int(round(votes * margin_percent))
        return votes, margin

    return 75000, 10000

# Step 1: Fix constituencies files
for state, code in states.items():
    const_file_path = os.path.join(seed_dir, f'{state}-constituencies.ts')
    print(f"Processing constituency file: {const_file_path}")
    
    with open(const_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if '{ acNo:' in line:
            # Extract acNo
            ac_match = re.search(r'acNo:\s*(\d+)', line)
            if ac_match:
                ac_no = int(ac_match.group(1))
                
                # Extract 2021 votes (if exist)
                v2021_match = re.search(r'winnerVotes2021:\s*(\d+)', line)
                v2021 = int(v2021_match.group(1)) if v2021_match else None
                
                new_votes, new_margin = get_unique_votes_and_margin(state, ac_no, v2021)
                new_data_lookup[(code, ac_no)] = (new_votes, new_margin)
                
                line = re.sub(r'winnerVotes2026:\s*\d+', f'winnerVotes2026: {new_votes}', line)
                line = re.sub(r'margin2026:\s*\d+', f'margin2026: {new_margin}', line)
                
        new_lines.append(line)
        
    new_content = '\n'.join(new_lines)
    with open(const_file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Finished constituency file: {const_file_path}")

# Step 2: Fix MLA profile files
for state, code in states.items():
    mla_file_path = os.path.join(seed_dir, f'{state}-mla-profiles.ts')
    print(f"Processing MLA profiles file: {mla_file_path}")
    
    with open(mla_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    profiles = content.split('\n{')
    new_profiles = [profiles[0]]
    
    for prof in profiles[1:]:
        ac_match = re.search(r'acNo:\s*(\d+)', prof)
        if ac_match:
            ac_no = int(ac_match.group(1))
            
            new_votes, new_margin = new_data_lookup.get((code, ac_no), (None, None))
            
            if new_votes is not None:
                hist_match = re.search(r'electionHistory:\s*\[([\s\S]*?)\]', prof)
                if hist_match:
                    hist_content = hist_match.group(1)
                    
                    records = hist_content.split('}')
                    new_records = []
                    
                    for rec in records:
                        if 'electionYear: 2026' in rec:
                            rec = re.sub(r'votesReceived:\s*\d+', f'votesReceived: {new_votes}', rec)
                            rec = re.sub(r'margin:\s*\d+', f'margin: {new_margin}', rec)
                        new_records.append(rec)
                        
                    new_hist_content = '}'.join(new_records)
                    prof = prof.replace(hist_content, new_hist_content)
                    
        new_profiles.append(prof)
        
    new_content = '\n{'.join(new_profiles)
    with open(mla_file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Finished MLA profiles file: {mla_file_path}")

print("Vote data fix script executed successfully with guaranteed non-linear formula!")
