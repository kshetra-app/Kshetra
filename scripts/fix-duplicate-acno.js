/**
 * Remove duplicate acNo entries from MLA profile files.
 * For each duplicate set, keeps the entry whose name best matches
 * the seed's winnerName. Falls back to first entry if no match.
 */
const fs = require('fs');
const path = require('path');

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function nameScore(profileName, seedWinner) {
  const pn = normalize(profileName);
  const sw = normalize(seedWinner);
  if (pn === sw) return 100;
  const pParts = pn.split(' ').filter(p => p.length > 2);
  const sParts = sw.split(' ').filter(p => p.length > 2);
  let score = 0;
  for (const p of pParts) {
    for (const s of sParts) {
      if (p === s) score += 10;
      else if (p.includes(s) || s.includes(p)) score += 5;
    }
  }
  return score;
}

const stateMap = {
  'andhra-pradesh-mla-profiles.ts': 'andhra-pradesh-constituencies.ts',
  'karnataka-mla-profiles.ts': 'karnataka-constituencies.ts',
  'maharashtra-mla-profiles.ts': 'maharashtra-constituencies.ts',
  'tamil-nadu-mla-profiles.ts': 'tamil-nadu-constituencies.ts',
  'kerala-mla-profiles.ts': 'kerala-constituencies.ts',
  'west-bengal-mla-profiles.ts': 'west-bengal-constituencies.ts',
  'uttar-pradesh-mla-profiles.ts': 'uttar-pradesh-constituencies.ts',
  'rajasthan-mla-profiles.ts': 'rajasthan-constituencies.ts',
  'gujarat-mla-profiles.ts': 'gujarat-constituencies.ts',
  'delhi-mla-profiles.ts': 'delhi-constituencies.ts',
  'odisha-mla-profiles.ts': 'odisha-constituencies.ts',
  'jharkhand-mla-profiles.ts': 'jharkhand-constituencies.ts',
  'bihar-mla-profiles.ts': 'bihar-constituencies.ts',
  'punjab-mla-profiles.ts': 'punjab-constituencies.ts',
  'haryana-mla-profiles.ts': 'haryana-constituencies.ts',
  'chhattisgarh-mla-profiles.ts': 'chhattisgarh-constituencies.ts',
  'madhya-pradesh-mla-profiles.ts': 'madhya-pradesh-constituencies.ts',
  'assam-mla-profiles.ts': 'assam-constituencies.ts',
  'goa-mla-profiles.ts': 'goa-constituencies.ts',
  'himachal-pradesh-mla-profiles.ts': 'himachal-pradesh-constituencies.ts',
  'manipur-mla-profiles.ts': 'manipur-constituencies.ts',
  'meghalaya-mla-profiles.ts': 'meghalaya-constituencies.ts',
  'mizoram-mla-profiles.ts': 'mizoram-constituencies.ts',
  'nagaland-mla-profiles.ts': 'nagaland-constituencies.ts',
  'tripura-mla-profiles.ts': 'tripura-constituencies.ts',
  'sikkim-mla-profiles.ts': 'sikkim-constituencies.ts',
  'arunachal-pradesh-mla-profiles.ts': 'arunachal-pradesh-constituencies.ts',
  'uttarakhand-mla-profiles.ts': 'uttarakhand-constituencies.ts',
  'puducherry-mla-profiles.ts': 'puducherry-constituencies.ts',
  'jammu-kashmir-mla-profiles.ts': 'jammu-kashmir-constituencies.ts',
  'telangana-mla-profiles.ts': 'telangana-constituencies.ts',
};

let totalRemoved = 0;

for (const [profileFile, seedFile] of Object.entries(stateMap)) {
  const profilePath = path.join('C:/K/data/seed', profileFile);
  const seedPath = path.join('C:/K/data/seed', seedFile);
  if (!fs.existsSync(profilePath) || !fs.existsSync(seedPath)) continue;

  const content = fs.readFileSync(profilePath, 'utf8');
  const seedContent = fs.readFileSync(seedPath, 'utf8');

  // Build seed winner map: acNo → winnerName
  const winnerMap = new Map();
  const seedRegex = /acNo:\s*(\d+)[^}]*?(?:winnerName\d{4}|winnerName):\s*'([^']+)'/g;
  let m;
  while ((m = seedRegex.exec(seedContent)) !== null) {
    winnerMap.set(parseInt(m[1]), m[2]);
  }

  // Parse profile entries: find their positions in the file
  // Each entry is between `  {` and `  },` or `  }\n]`
  const entries = [];
  const entryRegex = /(\s{2}\{[^}]*?acNo:\s*(\d+)[^}]*?name:\s*'([^']+)'[^}]*?\})/g;
  while ((m = entryRegex.exec(content)) !== null) {
    entries.push({
      fullMatch: m[1],
      acNo: parseInt(m[2]),
      name: m[3],
      index: m.index,
    });
  }

  // Group by acNo
  const byAcNo = new Map();
  for (const entry of entries) {
    if (!byAcNo.has(entry.acNo)) byAcNo.set(entry.acNo, []);
    byAcNo.get(entry.acNo).push(entry);
  }

  // Find entries to remove
  const toRemove = new Set();
  for (const [acNo, group] of byAcNo) {
    if (group.length <= 1) continue;
    
    const winner = winnerMap.get(acNo) || '';
    // Score each entry against the seed winner
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < group.length; i++) {
      const score = nameScore(group[i].name, winner);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    // Remove all except the best match
    for (let i = 0; i < group.length; i++) {
      if (i !== bestIdx) toRemove.add(group[i].fullMatch);
    }
  }

  if (toRemove.size === 0) continue;

  // Remove duplicates from content
  let newContent = content;
  for (const entry of toRemove) {
    // Remove the entry + trailing comma/newline
    newContent = newContent.replace(entry + ',\n', '');
    if (newContent === content) {
      // Try without trailing newline
      newContent = newContent.replace(entry + ',', '');
    }
  }

  // Verify the file still has valid structure (array not broken)
  if (newContent.includes('export const') && newContent.includes('];')) {
    fs.writeFileSync(profilePath, newContent);
    console.log(`${profileFile}: removed ${toRemove.size} duplicate entries`);
    totalRemoved += toRemove.size;
  } else {
    console.log(`${profileFile}: SKIPPED (structure issue after removal)`);
  }
}

console.log(`\nTotal duplicates removed: ${totalRemoved}`);
