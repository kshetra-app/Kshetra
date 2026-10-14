import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();

// Load chunks 06 to 10
const chunkFiles = [
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_06_candidacies_part1.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_07_candidacies_part2.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_08_candidacies_part3.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_09_candidacies_part4.sql',
  'supabase/staging_packages/065_b2_2d_chunked/065_b2_2d_chunk_10_candidacies_part5.sql'
];

console.log('================================================================');
console.log('W021.5-CTO-NEXT-006: CANDIDACY POPULATION FORENSIC AUDIT');
console.log('================================================================\n');

// 1. Audit chunk file metrics
console.log('--- 1. Chunk File Metrics ---');
const chunkMetrics = [];
let grandTotalTuples = 0;

for (const relPath of chunkFiles) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const buf = fs.readFileSync(fullPath);
  const text = buf.toString('utf8');
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const lines = text.split(/\r?\n/).length;
  const bytes = buf.length;
  
  const tupleMatches = text.match(/'0215b22d-0002-0000-0000-[0-9a-f]{12}'::uuid,/g) || [];
  const tupleCount = tupleMatches.length;
  grandTotalTuples += tupleCount;

  const allIds = (text.match(/'(0215b22d-0002-0000-0000-[0-9a-f]{12})'::uuid/g) || []).map(s => s.replace(/'|::uuid/g, ''));
  const firstId = allIds[0] || null;
  const lastId = allIds[allIds.length - 1] || null;

  chunkMetrics.push({
    file: path.basename(relPath),
    relPath,
    bytes,
    lines,
    tuples: tupleCount,
    firstId,
    lastId,
    sha
  });
  console.log(`[${path.basename(relPath)}] ${bytes} bytes, ${lines} lines, ${tupleCount} tuples, Range: ${firstId} -> ${lastId}`);
}

console.log(`Grand Total Raw Tuples: ${grandTotalTuples}`);

// 2. Parse all tuples in detail
console.log('\n--- 2. Parsing All Candidacy Tuples ---');
const parsedRecords = [];

for (const m of chunkMetrics) {
  const fullPath = path.join(REPO_ROOT, m.relPath);
  const text = fs.readFileSync(fullPath, 'utf8');

  const tupleRegex = /\(\s*'([0-9a-f-]+)'::uuid,\s*'([0-9a-f-]+)'::uuid,\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(NULL|'([^']+)')/g;
  let match;
  while ((match = tupleRegex.exec(text)) !== null) {
    const [_, id, personId, year, electionType, constType, constId, partyRaw, partyId] = match;
    parsedRecords.push({
      id,
      personId,
      year: parseInt(year, 10),
      electionType,
      constType,
      constId,
      partyId: partyId || null,
      sourceChunk: m.file
    });
  }
}

console.log(`Successfully parsed ${parsedRecords.length} records.`);

// 3. Natural-Key Deduplication & 36 Duplicate Forensic Ledger
console.log('\n--- 3. Natural Key Deduplication & 36 Duplicate Ledger ---');
const nkMap = new Map();
const duplicates = [];

parsedRecords.forEach((rec, idx) => {
  const key = `${rec.personId}::${rec.year}::${rec.electionType}::${rec.constId}`;
  if (nkMap.has(key)) {
    duplicates.push({
      duplicateIndex: duplicates.length + 1,
      discardedId: rec.id,
      discardedChunk: rec.sourceChunk,
      retainedId: nkMap.get(key).id,
      retainedChunk: nkMap.get(key).sourceChunk,
      personId: rec.personId,
      year: rec.year,
      electionType: rec.electionType,
      constId: rec.constId,
      partyId: rec.partyId,
      naturalKey: key
    });
  } else {
    nkMap.set(key, rec);
  }
});

console.log(`Unique Canonical Natural Keys: ${nkMap.size}`);
console.log(`Detected Duplicate Natural Keys: ${duplicates.length}`);
console.log(`Proof: ${parsedRecords.length} raw - ${duplicates.length} duplicates = ${parsedRecords.length - duplicates.length} canonical candidacies.`);

// 4. Cross-dependency checks with B2.2-E Manifest
console.log('\n--- 4. B2.2-E Cross-Dependency Verification ---');
const b22eManifestPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2e_affidavit_manifest.json');
const b22eManifest = JSON.parse(fs.readFileSync(b22eManifestPath, 'utf8'));

function toCandidacyUuid(candId) {
  const num = parseInt(candId.replace('0215b22d-cand-', ''), 10);
  return '0215b22d-0002-0000-0000-' + String(num).padStart(12, '0');
}

function toPersonUuid(personId) {
  const num = parseInt(personId.replace('0215b22d-', ''), 10);
  return '0215b22d-0001-0000-0000-' + String(num).padStart(12, '0');
}

const b22eCandidacyUuids = new Set(b22eManifest.affidavits.map(a => toCandidacyUuid(a.candidacy_id)));
const b22ePersonUuids = new Set(b22eManifest.affidavits.map(a => toPersonUuid(a.person_id)));

console.log(`B2.2-E Required Distinct Candidacy UUIDs: ${b22eCandidacyUuids.size}`);
console.log(`B2.2-E Required Distinct Person UUIDs: ${b22ePersonUuids.size}`);

const retainedIdSet = new Set(Array.from(nkMap.values()).map(r => r.id));
const discardedIdSet = new Set(duplicates.map(d => d.discardedId));

let b22eInRetained = 0;
let b22eInDiscarded = 0;
let b22eMissing = 0;

for (const cid of b22eCandidacyUuids) {
  if (retainedIdSet.has(cid)) b22eInRetained++;
  else if (discardedIdSet.has(cid)) b22eInDiscarded++;
  else b22eMissing++;
}

console.log(`B2.2-E Candidacies in Retained Set: ${b22eInRetained} / ${b22eCandidacyUuids.size} (Expected: 4,523)`);
console.log(`B2.2-E Candidacies in Discarded Duplicate Set: ${b22eInDiscarded} (Expected: 0)`);
console.log(`B2.2-E Candidacies Missing from B2.2-D: ${b22eMissing} (Expected: 0)`);

// 5. Query isolated PostgreSQL for FK integrity
console.log('\n--- 5. Foreign Key Integrity Audit Against PostgreSQL ---');
try {
  // Query DB persons into Set
  const rawPersons = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_b2_2d_isolated -t -A -c "SELECT id FROM public.canonical_persons;"', { encoding: 'utf8' });
  const dbPersonSet = new Set(rawPersons.split('\n').map(s => s.trim()).filter(Boolean));
  console.log(`Database Canonical Persons count: ${dbPersonSet.size}`);

  const missingPersons = [];
  parsedRecords.forEach(r => {
    if (!dbPersonSet.has(r.personId)) missingPersons.push(r.personId);
  });
  console.log(`Missing Person References in Candidacies: ${missingPersons.length}`);

  // Query DB political organizations into Set
  const rawOrgs = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_b2_2d_isolated -t -A -c "SELECT id FROM public.political_organizations;"', { encoding: 'utf8' });
  const dbOrgSet = new Set(rawOrgs.split('\n').map(s => s.trim()).filter(Boolean));
  console.log(`Database Political Organizations count: ${dbOrgSet.size}`);

  const missingOrgs = [];
  parsedRecords.forEach(r => {
    if (r.partyId && !dbOrgSet.has(r.partyId)) missingOrgs.push(r.partyId);
  });
  console.log(`Missing Organization References in Candidacies: ${missingOrgs.length}`);

  // Query DB provenance records
  const rawProvs = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_b2_2d_isolated -t -A -c "SELECT id FROM public.provenance_records;"', { encoding: 'utf8' });
  const dbProvSet = new Set(rawProvs.split('\n').map(s => s.trim()).filter(Boolean));
  console.log(`Database Provenance Records count: ${dbProvSet.size}`);
  console.log(`B2.2-D Anchor present in DB: ${dbProvSet.has('0215b22d-0000-0000-0000-000000000001')}`);

  // Verify B2.2-E persons in DB
  const missingB22ePersons = [];
  b22ePersonUuids.forEach(pid => {
    if (!dbPersonSet.has(pid)) missingB22ePersons.push(pid);
  });
  console.log(`Missing B2.2-E Person References in DB: ${missingB22ePersons.length} / ${b22ePersonUuids.size}`);

} catch (e) {
  console.error('Error during DB validation:', e.message);
}

// 6. Inspect constituency IDs
console.log('\n--- 6. Constituency Identifiers Audit ---');
const constituencyMap = new Map();
parsedRecords.forEach(r => {
  const type = r.constType;
  if (!constituencyMap.has(type)) constituencyMap.set(type, new Set());
  constituencyMap.get(type).add(r.constId);
});

for (const [type, set] of constituencyMap.entries()) {
  console.log(`Constituency Type '${type}': ${set.size} distinct IDs. Samples: ${Array.from(set).slice(0, 5).join(', ')}`);
}

// Write detailed 36 duplicate ledger JSON
const dupReport = {
  totalRawTuples: parsedRecords.length,
  totalUniqueCanonical: nkMap.size,
  duplicateCount: duplicates.length,
  duplicates
};

fs.writeFileSync(path.join(REPO_ROOT, 'reports', 'w021_5_b2_2d_36_candidacy_duplicates.json'), JSON.stringify(dupReport, null, 2));
console.log(`\nWrote complete duplicate ledger to reports/w021_5_b2_2d_36_candidacy_duplicates.json`);
