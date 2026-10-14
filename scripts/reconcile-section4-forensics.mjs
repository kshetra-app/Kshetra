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

// Parse raw tuples line-by-line
const parsed = [];

for (const relPath of chunkFiles) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const text = fs.readFileSync(fullPath, 'utf8');
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("('0215b22d-0002-") || (l.startsWith("(") && lines[i+1]?.trim()?.startsWith("'0215b22d-0002-"))) {
      let block = l;
      let j = i;
      while (!block.includes(')') && j < lines.length - 1) {
        j++;
        block += ' ' + lines[j].trim();
      }
      i = j;

      // Extract items inside parentheses
      const inner = block.replace(/^\s*\(\s*/, '').replace(/\s*\),?\s*$/, '');
      const parts = inner.split(/,\s*/);
      
      const candId = parts[0].replace(/'|::uuid/g, '').trim();
      const personId = parts[1].replace(/'|::uuid/g, '').trim();
      const electionYear = parseInt(parts[2].trim(), 10);
      const electionType = parts[3].replace(/'/g, '').trim();
      const constituencyType = parts[4].replace(/'/g, '').trim();
      const constituencyId = parts[5].replace(/'/g, '').trim();
      const partyId = parts[6].replace(/'/g, '').trim() === 'NULL' ? null : parts[6].replace(/'/g, '').trim();

      parsed.push({
        candId,
        personId,
        electionYear,
        electionType,
        constituencyType,
        constituencyId,
        partyId
      });
    }
  }
}

console.log('Total Parsed Candidacy Tuples:', parsed.length);

const allDistinctCid = new Set(parsed.map(p => p.constituencyId));
const parliamentaryCids = new Set(parsed.filter(p => p.constituencyType === 'parliamentary').map(p => p.constituencyId));
const assemblyCids = new Set(parsed.filter(p => p.constituencyType === 'assembly').map(p => p.constituencyId));

console.log('Total Distinct Constituency Identifiers:', allDistinctCid.size);
console.log('Parliamentary Distinct Identifiers:', parliamentaryCids.size);
console.log('Assembly Distinct Identifiers:', assemblyCids.size);

// Overlap check
const collision = [];
for (const cid of parliamentaryCids) {
  if (assemblyCids.has(cid)) collision.push(cid);
}
console.log('Identifiers appearing in both Parliamentary and Assembly:', collision.length);

// 1. Check against ACs
const acPkSet = new Set(acs.map(a => a.id.toLowerCase()));
const acCodeSet = new Set(acs.map(a => (a.canonical_code || '').toLowerCase()).filter(Boolean));

let directAcPkMatch = 0;
let directAcCodeMatch = 0;
for (const cid of assemblyCids) {
  const cLower = cid.toLowerCase();
  if (acPkSet.has(cLower)) directAcPkMatch++;
  if (acCodeSet.has(cLower)) directAcCodeMatch++;
}

// 2. Check against PCs
const pcPkSet = new Set(pcs.map(p => p.id.toLowerCase()));
const pcCodeSet = new Set(pcs.map(p => (p.code || '').toLowerCase()).filter(Boolean));

let directPcPkMatch = 0;
let directPcCodeMatch = 0;
for (const cid of parliamentaryCids) {
  const cLower = cid.toLowerCase();
  if (pcPkSet.has(cLower)) directPcPkMatch++;
  if (pcCodeSet.has(cLower)) directPcCodeMatch++;
}

console.log('\n--- SECTION 4: DIRECT STAGING REGISTRY RESOLUTION ---');
console.log(`Assembly Identifiers: ${assemblyCids.size}`);
console.log(`  Matching constituencies.id (PK): ${directAcPkMatch} / ${assemblyCids.size}`);
console.log(`  Matching constituencies.canonical_code: ${directAcCodeMatch} / ${assemblyCids.size}`);
console.log(`  Unresolved directly against constituencies: ${assemblyCids.size - directAcPkMatch} / ${assemblyCids.size}`);

console.log(`\nParliamentary Identifiers: ${parliamentaryCids.size}`);
console.log(`  Matching parliamentary_constituencies.id (PK): ${directPcPkMatch} / ${parliamentaryCids.size}`);
console.log(`  Matching parliamentary_constituencies.code: ${directPcCodeMatch} / ${parliamentaryCids.size}`);
console.log(`  Unresolved directly against parliamentary_constituencies: ${parliamentaryCids.size - directPcPkMatch} / ${parliamentaryCids.size}`);

// Ambiguity analysis for AC numbers
const acNoToRows = new Map();
for (const a of acs) {
  const no = a.ac_no;
  if (!acNoToRows.has(no)) acNoToRows.set(no, []);
  acNoToRows.get(no).push(a);
}

let ambiguousAssemblyCids = 0;
let singleStateAssemblyCids = 0;
let unparseableAssemblyCids = 0;

for (const cid of assemblyCids) {
  const m = cid.match(/^AC-(\d+)$/);
  if (m) {
    const acNo = parseInt(m[1], 10);
    const matchingRows = acNoToRows.get(acNo) || [];
    if (matchingRows.length > 1) {
      ambiguousAssemblyCids++;
    } else if (matchingRows.length === 1) {
      singleStateAssemblyCids++;
    } else {
      unparseableAssemblyCids++;
    }
  } else {
    unparseableAssemblyCids++;
  }
}

console.log(`\n--- AMBIGUITY OF ASSEMBLY IDENTIFIERS ('AC-X') ---`);
console.log(`Ambiguous Assembly IDs (share AC number across >1 state): ${ambiguousAssemblyCids} / ${assemblyCids.size}`);
console.log(`Single-state AC numbers: ${singleStateAssemblyCids} / ${assemblyCids.size}`);
console.log(`Non-numeric AC IDs (e.g. 'STATE'): ${unparseableAssemblyCids} / ${assemblyCids.size}`);

// Slugs analysis for PCs
const pcNameMap = new Map();
for (const pc of pcs) {
  const clean = pc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!pcNameMap.has(clean)) pcNameMap.set(clean, []);
  pcNameMap.get(clean).push(pc);
}

let pcSlugExact = 0;
let pcSlugAmbiguous = 0;
let pcSlugUnresolved = 0;
const unresolvedSlugs = [];

for (const cid of parliamentaryCids) {
  const base = cid.toLowerCase().replace(/_\((sc|st)\)$/i, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const matches = pcNameMap.get(base) || [];
  if (matches.length === 1) {
    pcSlugExact++;
  } else if (matches.length > 1) {
    pcSlugAmbiguous++;
  } else {
    // Lenient match
    let found = [];
    for (const [k, v] of pcNameMap.entries()) {
      if (k.replace(/_/g, '') === base.replace(/_/g, '')) {
        found = v;
        break;
      }
    }
    if (found.length === 1) pcSlugExact++;
    else if (found.length > 1) pcSlugAmbiguous++;
    else {
      pcSlugUnresolved++;
      unresolvedSlugs.push(cid);
    }
  }
}

console.log(`\n--- SLUG RESOLUTION FOR PARLIAMENTARY IDENTIFIERS ---`);
console.log(`Parliamentary slugs uniquely matched to PC name: ${pcSlugExact} / ${parliamentaryCids.size}`);
console.log(`Parliamentary slugs matching >1 PC name: ${pcSlugAmbiguous} / ${parliamentaryCids.size}`);
console.log(`Parliamentary slugs completely unmatched to PC name: ${pcSlugUnresolved} / ${parliamentaryCids.size}`);
if (unresolvedSlugs.length > 0) {
  console.log('Sample unresolved slugs:', unresolvedSlugs.slice(0, 10));
}
