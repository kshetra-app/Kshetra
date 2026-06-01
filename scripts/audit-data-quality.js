/**
 * Comprehensive Data Quality Audit Script
 * Checks for:
 * 1. Duplicate acNo entries in MLA profiles
 * 2. Gender mismatches (male names marked F, female names marked M)
 * 3. Winner name mismatches (constituency seed winner ≠ MLA profile name)
 */
const fs = require('fs');
const path = require('path');

// ── Known female name indicators (Indian context) ──
const FEMALE_INDICATORS = [
  'kumari', 'devi', 'begum', 'bai', 'amma', 'lakshmi', 'priya',
  'savitha', 'savita', 'anita', 'sunita', 'sushma', 'mamata', 'indira',
  'sonia', 'nirmala', 'pramila', 'kamla', 'kamala', 'meena', 'mina',
  'uma', 'lata', 'gita', 'geeta', 'seema', 'sita', 'rekha', 'rani',
  'saroj', 'padma', 'pushpa', 'radha', 'shakuntala', 'vijaya', 'jaya',
  'maya', 'sudha', 'usha', 'asha', 'neelam', 'shanti', 'kanta',
  'sarita', 'rita', 'vineeta', 'kavita', 'babita', 'archana', 'renu',
  'poonam', 'kiran', 'manju', 'ranjana', 'vandana', 'sapna', 'dimple',
  'hema', 'sangeeta', 'mamta', 'smriti', 'manisha', 'priyanka',
  'swati', 'gargi', 'aditi', 'anjali', 'pallavi', 'sneha', 'deepa',
  'anupriya', 'chitra', 'jyoti', 'rajni', 'shobha', 'bharti',
  'vidya', 'veena', 'meenakshi', 'parvati', 'durga', 'vani', 'rohini',
  'malti', 'nandini', 'chandni', 'pooja', 'neha', 'divya',
  'mrs', 'smt', 'ms\\.', 'w/o', 'd/o',
];

// ── Known male name indicators ──
const MALE_INDICATORS = [
  'kumar', 'singh', 'reddy', 'rao', 'nath', 'ram', 'lal', 'chand',
  'bhai', 'das', 'dev', 'raj', 'bahadur', 'prasad', 'narayan', 'mohan',
  'shri', 'mr\\.', 'dr\\.', 's/o',
  'chandrakant', 'vishwanath', 'dattatray', 'shankar', 'ganesh',
  'suresh', 'mahesh', 'ramesh', 'rajesh', 'dinesh', 'rakesh', 'mukesh',
  'naresh', 'vikas', 'ashok', 'vinod', 'pramod', 'manoj', 'anil',
  'sunil', 'ravi', 'sanjay', 'vijay', 'ajay', 'amit', 'anand',
  'krishna', 'gopal', 'balaji', 'venkat', 'srinivas', 'murali',
  'satish', 'girish', 'harish', 'jagdish', 'manish', 'nilesh',
  'kamal', 'vimal', 'shyam', 'ghanshyam', 'bhagwan', 'ishwar',
  'govind', 'arvind', 'pravin', 'sachin', 'nitin', 'chetan',
];

function likelyGender(name) {
  const lower = name.toLowerCase();
  let maleScore = 0, femaleScore = 0;
  for (const ind of FEMALE_INDICATORS) {
    if (new RegExp('\\b' + ind + '\\b', 'i').test(lower) || lower.includes(ind)) femaleScore++;
  }
  for (const ind of MALE_INDICATORS) {
    if (new RegExp('\\b' + ind + '\\b', 'i').test(lower) || lower.includes(ind)) maleScore++;
  }
  if (femaleScore > maleScore) return 'F';
  if (maleScore > femaleScore) return 'M';
  return null; // uncertain
}

const stateFiles = [
  { code: 'TS', profile: 'telangana-mla-profiles.ts', seed: 'telangana-constituencies.ts' },
  { code: 'AP', profile: 'andhra-pradesh-mla-profiles.ts', seed: 'andhra-pradesh-constituencies.ts' },
  { code: 'KA', profile: 'karnataka-mla-profiles.ts', seed: 'karnataka-constituencies.ts' },
  { code: 'MH', profile: 'maharashtra-mla-profiles.ts', seed: 'maharashtra-constituencies.ts' },
  { code: 'TN', profile: 'tamil-nadu-mla-profiles.ts', seed: 'tamil-nadu-constituencies.ts' },
  { code: 'KL', profile: 'kerala-mla-profiles.ts', seed: 'kerala-constituencies.ts' },
  { code: 'WB', profile: 'west-bengal-mla-profiles.ts', seed: 'west-bengal-constituencies.ts' },
  { code: 'UP', profile: 'uttar-pradesh-mla-profiles.ts', seed: 'uttar-pradesh-constituencies.ts' },
  { code: 'RJ', profile: 'rajasthan-mla-profiles.ts', seed: 'rajasthan-constituencies.ts' },
  { code: 'GJ', profile: 'gujarat-mla-profiles.ts', seed: 'gujarat-constituencies.ts' },
  { code: 'DL', profile: 'delhi-mla-profiles.ts', seed: 'delhi-constituencies.ts' },
  { code: 'OD', profile: 'odisha-mla-profiles.ts', seed: 'odisha-constituencies.ts' },
  { code: 'JH', profile: 'jharkhand-mla-profiles.ts', seed: 'jharkhand-constituencies.ts' },
  { code: 'BR', profile: 'bihar-mla-profiles.ts', seed: 'bihar-constituencies.ts' },
  { code: 'PB', profile: 'punjab-mla-profiles.ts', seed: 'punjab-constituencies.ts' },
  { code: 'HR', profile: 'haryana-mla-profiles.ts', seed: 'haryana-constituencies.ts' },
  { code: 'CG', profile: 'chhattisgarh-mla-profiles.ts', seed: 'chhattisgarh-constituencies.ts' },
  { code: 'MP', profile: 'madhya-pradesh-mla-profiles.ts', seed: 'madhya-pradesh-constituencies.ts' },
  { code: 'BR', profile: 'bihar-mla-profiles.ts', seed: 'bihar-constituencies.ts' },
  { code: 'AS', profile: 'assam-mla-profiles.ts', seed: 'assam-constituencies.ts' },
  { code: 'GA', profile: 'goa-mla-profiles.ts', seed: 'goa-constituencies.ts' },
  { code: 'HP', profile: 'himachal-pradesh-mla-profiles.ts', seed: 'himachal-pradesh-constituencies.ts' },
  { code: 'MN', profile: 'manipur-mla-profiles.ts', seed: 'manipur-constituencies.ts' },
  { code: 'ML', profile: 'meghalaya-mla-profiles.ts', seed: 'meghalaya-constituencies.ts' },
  { code: 'MZ', profile: 'mizoram-mla-profiles.ts', seed: 'mizoram-constituencies.ts' },
  { code: 'NL', profile: 'nagaland-mla-profiles.ts', seed: 'nagaland-constituencies.ts' },
  { code: 'TR', profile: 'tripura-mla-profiles.ts', seed: 'tripura-constituencies.ts' },
  { code: 'SK', profile: 'sikkim-mla-profiles.ts', seed: 'sikkim-constituencies.ts' },
  { code: 'AR', profile: 'arunachal-pradesh-mla-profiles.ts', seed: 'arunachal-pradesh-constituencies.ts' },
  { code: 'UK', profile: 'uttarakhand-mla-profiles.ts', seed: 'uttarakhand-constituencies.ts' },
  { code: 'PY', profile: 'puducherry-mla-profiles.ts', seed: 'puducherry-constituencies.ts' },
  { code: 'JK', profile: 'jammu-kashmir-mla-profiles.ts', seed: 'jammu-kashmir-constituencies.ts' },
];

// Deduplicate state entries
const seen = new Set();
const uniqueStates = stateFiles.filter(s => {
  if (seen.has(s.code)) return false;
  seen.add(s.code);
  return true;
});

const issues = {
  duplicateAcNo: [],
  genderMismatch: [],
  winnerNameMismatch: [],
};

for (const state of uniqueStates) {
  const profilePath = path.join(__dirname, '../data/seed', state.profile);
  const seedPath = path.join(__dirname, '../data/seed', state.seed);

  if (!fs.existsSync(profilePath)) continue;

  const profileContent = fs.readFileSync(profilePath, 'utf8');
  const seedContent = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf8') : '';

  // ── 1. Parse MLA profiles ──
  // Extract acNo and name pairs
  const profileEntries = [];
  const acNoRegex = /acNo:\s*(\d+),\s*\n\s*name:\s*'([^']+)'/g;
  let m;
  while ((m = acNoRegex.exec(profileContent)) !== null) {
    profileEntries.push({ acNo: parseInt(m[1]), name: m[2] });
  }

  // Also try single-line format
  const singleLineRegex = /\{\s*acNo:\s*(\d+)[^}]*?name:\s*'([^']+)'/g;
  if (profileEntries.length === 0) {
    while ((m = singleLineRegex.exec(profileContent)) !== null) {
      profileEntries.push({ acNo: parseInt(m[1]), name: m[2] });
    }
  }

  // Check for duplicate acNo
  const acNoMap = new Map();
  for (const entry of profileEntries) {
    if (acNoMap.has(entry.acNo)) {
      acNoMap.get(entry.acNo).push(entry.name);
    } else {
      acNoMap.set(entry.acNo, [entry.name]);
    }
  }
  for (const [acNo, names] of acNoMap) {
    if (names.length > 1) {
      issues.duplicateAcNo.push({ state: state.code, acNo, names });
    }
  }

  // ── 2. Check gender mismatches ──
  const genderRegex = /name:\s*'([^']+)'[^}]*?gender:\s*'([MF])'/g;
  while ((m = genderRegex.exec(profileContent)) !== null) {
    const name = m[1];
    const declaredGender = m[2];
    const likely = likelyGender(name);
    if (likely && likely !== declaredGender) {
      issues.genderMismatch.push({ state: state.code, name, declared: declaredGender, likely });
    }
  }

  // ── 3. Check winner name mismatches ──
  if (seedContent) {
    // Parse seed: acNo → winnerName
    const seedEntries = new Map();
    const seedRegex = /acNo:\s*(\d+)[^}]*?winnerName\d{4}:\s*'([^']+)'/g;
    while ((m = seedRegex.exec(seedContent)) !== null) {
      seedEntries.set(parseInt(m[1]), m[2]);
    }
    // Also try `winnerName:` (without year)
    const seedRegex2 = /acNo:\s*(\d+)[^}]*?winnerName:\s*'([^']+)'/g;
    while ((m = seedRegex2.exec(seedContent)) !== null) {
      if (!seedEntries.has(parseInt(m[1]))) {
        seedEntries.set(parseInt(m[1]), m[2]);
      }
    }

    // Compare first MLA profile entry for each acNo with seed winner
    const firstProfile = new Map();
    for (const entry of profileEntries) {
      if (!firstProfile.has(entry.acNo)) {
        firstProfile.set(entry.acNo, entry.name);
      }
    }

    for (const [acNo, seedWinner] of seedEntries) {
      const profileName = firstProfile.get(acNo);
      if (profileName && seedWinner) {
        // Check if names are significantly different
        const pLower = profileName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const sLower = seedWinner.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        // Check if first/last name matches
        const pParts = pLower.split(/\s+/);
        const sParts = sLower.split(/\s+/);
        const anyMatch = pParts.some(p => p.length > 2 && sParts.some(s => s.includes(p) || p.includes(s)));
        if (!anyMatch && pLower !== sLower) {
          issues.winnerNameMismatch.push({ state: state.code, acNo, seedWinner, profileName });
        }
      }
    }
  }
}

// ── Output Results ──
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║        COMPREHENSIVE DATA QUALITY AUDIT RESULTS            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`\n═══ 1. DUPLICATE acNo ENTRIES (${issues.duplicateAcNo.length} found) ═══`);
for (const d of issues.duplicateAcNo) {
  console.log(`  ${d.state} AC#${d.acNo}: ${d.names.join(' vs ')}`);
}

console.log(`\n═══ 2. GENDER MISMATCHES (${issues.genderMismatch.length} found) ═══`);
for (const g of issues.genderMismatch) {
  console.log(`  ${g.state}: "${g.name}" marked ${g.declared} but likely ${g.likely}`);
}

console.log(`\n═══ 3. WINNER NAME MISMATCHES — profile ≠ seed (${issues.winnerNameMismatch.length} found) ═══`);
if (issues.winnerNameMismatch.length > 50) {
  console.log(`  (Showing first 50 of ${issues.winnerNameMismatch.length})`);
}
for (const w of issues.winnerNameMismatch.slice(0, 50)) {
  console.log(`  ${w.state} AC#${w.acNo}: seed="${w.seedWinner}" vs profile="${w.profileName}"`);
}
if (issues.winnerNameMismatch.length > 50) {
  // Group remaining by state
  const byState = {};
  for (const w of issues.winnerNameMismatch.slice(50)) {
    byState[w.state] = (byState[w.state] || 0) + 1;
  }
  console.log(`  ... and more: ${Object.entries(byState).map(([s,c]) => s+'('+c+')').join(', ')}`);
}

console.log('\n═══ SUMMARY ═══');
console.log(`  Duplicate acNo: ${issues.duplicateAcNo.length}`);
console.log(`  Gender issues:  ${issues.genderMismatch.length}`);
console.log(`  Name mismatches: ${issues.winnerNameMismatch.length}`);
