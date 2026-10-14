import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const chunkFiles = [
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_06_candidacies_part1.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_07_candidacies_part2.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_08_candidacies_part3.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_09_candidacies_part4.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_10_candidacies_part5.sql'
];

const acs = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'temp_staging_acs.json'), 'utf8'));
const pcs = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'temp_staging_pcs.json'), 'utf8'));

console.log('Staging ACs count:', acs.length);
console.log('Staging PCs count:', pcs.length);

// Build lookup maps for ACs
const acById = new Map();
const acByCanonicalCode = new Map();
const acByName = new Map();

for (const ac of acs) {
  if (ac.id) acById.set(ac.id.toLowerCase(), ac);
  if (ac.canonical_code) acByCanonicalCode.set(ac.canonical_code.toLowerCase(), ac);
  if (ac.name) {
    const k = (ac.state_code + ':' + ac.name).toLowerCase();
    acByName.set(k, ac);
  }
}

// Build lookup maps for PCs
const pcById = new Map();
const pcByCode = new Map();
const pcByName = new Map();
const pcBySlug = new Map();

for (const pc of pcs) {
  if (pc.id) pcById.set(pc.id.toLowerCase(), pc);
  if (pc.code) pcByCode.set(pc.code.toLowerCase(), pc);
  if (pc.name) {
    const k = (pc.state_code + ':' + pc.name).toLowerCase();
    pcByName.set(k, pc);
    // normal slug
    const slug = pc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    pcBySlug.set(slug, pc);
  }
}

// Parse candidacies
const parsed = [];
const tupleRegex = /\(\s*'([0-9a-f-]{36})'::uuid,\s*'([0-9a-f-]{36})'::uuid,\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(NULL|'[^']+')/g;

for (const relPath of chunkFiles) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  let m;
  while ((m = tupleRegex.exec(content)) !== null) {
    parsed.push({
      candId: m[1],
      personId: m[2],
      year: parseInt(m[3], 10),
      elecType: m[4],
      constType: m[5],
      constId: m[6],
      partyId: m[7] === 'NULL' ? null : m[7].replace(/'/g, '')
    });
  }
}

console.log('Parsed total tuples:', parsed.length);

// Categorize distinct identifiers by constType
const byType = new Map();
for (const p of parsed) {
  if (!byType.has(p.constType)) byType.set(p.constType, new Set());
  byType.get(p.constType).add(p.constId);
}

for (const [t, set] of byType.entries()) {
  console.log(`Type '${t}': ${set.size} distinct identifiers`);
}

// Analyze Parliamentary
const pSet = byType.get('parliamentary') || new Set();
console.log('\n--- Parliamentary Analysis ---');
console.log('Sample parliamentary identifiers (first 10):', Array.from(pSet).slice(0, 10));

// Check how many match PCs
let pDirectMatch = 0;
let pSlugMatch = 0;
let pUnmatched = [];

for (const cid of pSet) {
  const lower = cid.toLowerCase();
  if (pcById.has(lower) || pcByCode.has(lower)) {
    pDirectMatch++;
  } else if (pcBySlug.has(lower)) {
    pSlugMatch++;
  } else {
    // Check variations
    let found = false;
    for (const pc of pcs) {
      const pcClean = pc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cidClean = lower.replace(/[^a-z0-9]/g, '');
      if (pcClean === cidClean) {
        found = true;
        break;
      }
    }
    if (found) {
      pSlugMatch++;
    } else {
      pUnmatched.push(cid);
    }
  }
}
console.log(`Parliamentary: Direct match: ${pDirectMatch}, Slug/Name match: ${pSlugMatch}, Unmatched: ${pUnmatched.length}`);
if (pUnmatched.length > 0) {
  console.log('Unmatched Parliamentary IDs:', pUnmatched);
}

// Analyze Assembly
const aSet = byType.get('assembly') || new Set();
console.log('\n--- Assembly Analysis ---');
console.log('Sample assembly identifiers (first 10):', Array.from(aSet).slice(0, 10));

let aDirectMatch = 0;
let aCodeMatch = 0;
let aUnmatched = [];

for (const cid of aSet) {
  const lower = cid.toLowerCase();
  if (acById.has(lower)) {
    aDirectMatch++;
  } else if (acByCanonicalCode.has(lower)) {
    aCodeMatch++;
  } else {
    aUnmatched.push(cid);
  }
}

console.log(`Assembly: Direct ID match: ${aDirectMatch}, Canonical Code match: ${aCodeMatch}, Unmatched: ${aUnmatched.length}`);
if (aUnmatched.length > 0) {
  console.log('Unmatched Assembly IDs (first 20):', aUnmatched.slice(0, 20));
}
