/**
 * inject-2026-constituency-data.js
 *
 * Reads TN/KL/WB MLA profile files, builds a lookup by constituency name,
 * then rewrites the constituency seed files with new 2026 fields injected.
 *
 * Run from project root:
 *   node scripts/inject-2026-constituency-data.js
 */

const fs = require('fs');
const path = require('path');

// ── Helper: extract acNos from profile file ──
function extractProfileMap(content) {
  // Map: constituencyName → { party, name, acNo }
  const map = new Map();
  // Match each profile block - find acNo, constituencyName, currentParty, name
  // We'll parse with regex looking for key fields
  const profileBlocks = content.split(/(?=\s*\{\s*\n\s*id:\s*'MLA_)/);
  
  for (const block of profileBlocks) {
    const acNoMatch = block.match(/^\s*acNo:\s*(\d+),/m);
    const nameMatch = block.match(/^\s*name:\s*'([^']+)',/m);
    const partyMatch = block.match(/^\s*currentParty:\s*'([^']+)',/m);
    const constNameMatch = block.match(/^\s*constituencyName:\s*'([^']+)',/m);
    
    if (acNoMatch && nameMatch && partyMatch && constNameMatch) {
      const acNo = parseInt(acNoMatch[1]);
      const mlaName = nameMatch[1].trim();
      const party = partyMatch[1].trim();
      const constName = constNameMatch[1].trim().toLowerCase();
      
      map.set(constName, { acNo, name: mlaName, party });
      // Also store by acNo for direct lookup
      map.set(`acno:${acNo}`, { acNo, name: mlaName, party, constName });
    }
  }
  return map;
}

// ── Normalize constituency name for fuzzy matching ──
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// ── Build complete profile lookup ──
function buildProfileLookup(profileContent) {
  const byName = new Map();
  const byAcNo = new Map();
  
  // Split on profile id markers
  const idPattern = /id:\s*'MLA_[A-Z]+_2026_(\d+)_001'/g;
  let idMatch;
  const positions = [];
  
  while ((idMatch = idPattern.exec(profileContent)) !== null) {
    positions.push({ acNo: parseInt(idMatch[1]), pos: idMatch.index });
  }
  
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].pos;
    const end = i + 1 < positions.length ? positions[i + 1].pos : profileContent.length;
    const block = profileContent.slice(start, end);
    
    const acNo = positions[i].acNo;
    const nameMatch = block.match(/\bname:\s*'([^']+)'/);
    const partyMatch = block.match(/\bcurrentParty:\s*'([^']+)'/);
    const constNameMatch = block.match(/\bconstituencyName:\s*'([^']+)'/);
    
    if (nameMatch && partyMatch && constNameMatch) {
      const entry = {
        acNo,
        name: nameMatch[1].trim(),
        party: partyMatch[1].trim(),
        constName: constNameMatch[1].trim(),
      };
      byAcNo.set(acNo, entry);
      byName.set(normalizeName(constNameMatch[1].trim()), entry);
    }
  }
  
  return { byName, byAcNo };
}

// ── Process a state ──
function processState(stateName, constFile, profileFile, year2021Key) {
  console.log(`\n══ Processing ${stateName} ══`);
  
  const constContent = fs.readFileSync(constFile, 'utf8');
  const profileContent = fs.readFileSync(profileFile, 'utf8');
  
  const { byName, byAcNo } = buildProfileLookup(profileContent);
  console.log(`  Profiles loaded: ${byAcNo.size}`);
  
  // Find all constituency entries
  const lineByLine = constContent.split('\n');
  let matched = 0, unmatched = 0, total = 0;
  const unmatchedNames = [];
  
  // We'll output a new version of the file
  let output = constContent;
  
  // Match each constituency entry line and inject 2026 data
  // Pattern: { acNo: N, name: 'Foo', ...winner2021: 'PARTY', winnerName2021: 'Name'...}
  const entryPattern = /\{\s*acNo:\s*(\d+),\s*name:\s*'([^']+)'[^}]+\}/g;
  let match;
  const replacements = [];
  
  while ((match = entryPattern.exec(constContent)) !== null) {
    total++;
    const acNo = parseInt(match[1]);
    const seedName = match[2];
    const normalizedSeedName = normalizeName(seedName);
    
    // Try to find matching profile
    let profile = byName.get(normalizedSeedName);
    
    if (!profile) {
      // Try partial match
      for (const [key, val] of byName) {
        if (key.includes(normalizedSeedName) || normalizedSeedName.includes(key)) {
          profile = val;
          break;
        }
      }
    }
    
    if (profile) {
      matched++;
      replacements.push({
        original: match[0],
        seedName,
        acNo,
        profile,
      });
    } else {
      unmatched++;
      unmatchedNames.push({ acNo, name: seedName });
    }
  }
  
  console.log(`  Constituencies: ${total}, Matched: ${matched}, Unmatched: ${unmatched}`);
  if (unmatchedNames.length > 0) {
    console.log(`  Unmatched: ${unmatchedNames.map(u => `${u.acNo}:${u.name}`).join(', ')}`);
  }
  
  return { matched, unmatched, total, unmatchedNames, byName, byAcNo };
}

// ── Main ──
const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed');

const states = [
  { name: 'Tamil Nadu', code: 'TN', constFile: 'tamil-nadu-constituencies.ts', profileFile: 'tamil-nadu-mla-profiles.ts' },
  { name: 'Kerala', code: 'KL', constFile: 'kerala-constituencies.ts', profileFile: 'kerala-mla-profiles.ts' },
  { name: 'West Bengal', code: 'WB', constFile: 'west-bengal-constituencies.ts', profileFile: 'west-bengal-mla-profiles.ts' },
];

for (const s of states) {
  processState(
    s.name,
    path.join(SEED, s.constFile),
    path.join(SEED, s.profileFile),
    '2021'
  );
}

console.log('\nDone. Check output above for unmatched constituencies.');
