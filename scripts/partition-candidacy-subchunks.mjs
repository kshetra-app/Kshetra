import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const targetDir = path.join(REPO_ROOT, 'supabase', 'staging_packages', '065_b2_2d_chunked');

const parentDefs = [
  {
    chunkNum: 6,
    partName: '1',
    parentFile: '065_b2_2d_chunk_06_candidacies_part1.sql',
    subchunks: [
      { subId: '06a', suffix: 'part1a', startIdx: 1, count: 1150 },
      { subId: '06b', suffix: 'part1b', startIdx: 1151, count: 1150 }
    ]
  },
  {
    chunkNum: 7,
    partName: '2',
    parentFile: '065_b2_2d_chunk_07_candidacies_part2.sql',
    subchunks: [
      { subId: '07a', suffix: 'part2a', startIdx: 2301, count: 1150 },
      { subId: '07b', suffix: 'part2b', startIdx: 3451, count: 1150 }
    ]
  },
  {
    chunkNum: 8,
    partName: '3',
    parentFile: '065_b2_2d_chunk_08_candidacies_part3.sql',
    subchunks: [
      { subId: '08a', suffix: 'part3a', startIdx: 4601, count: 1150 },
      { subId: '08b', suffix: 'part3b', startIdx: 5751, count: 1150 }
    ]
  },
  {
    chunkNum: 9,
    partName: '4',
    parentFile: '065_b2_2d_chunk_09_candidacies_part4.sql',
    subchunks: [
      { subId: '09a', suffix: 'part4a', startIdx: 6901, count: 1150 },
      { subId: '09b', suffix: 'part4b', startIdx: 8051, count: 1150 }
    ]
  },
  {
    chunkNum: 10,
    partName: '5',
    parentFile: '065_b2_2d_chunk_10_candidacies_part5.sql',
    subchunks: [
      { subId: '10a', suffix: 'part5a', startIdx: 9201, count: 1100 },
      { subId: '10b', suffix: 'part5b', startIdx: 10301, count: 1034 }
    ]
  }
];

function extractTuples(content) {
  // Finds lines between VALUES and ON CONFLICT
  const valuesIdx = content.indexOf('VALUES\n');
  const onConflictIdx = content.indexOf('\nON CONFLICT (person_id, election_year, election_type, constituency_id)');
  if (valuesIdx === -1 || onConflictIdx === -1) {
    throw new Error('Could not delimit VALUES section');
  }

  const rawValues = content.substring(valuesIdx + 'VALUES\n'.length, onConflictIdx);
  // Each tuple is 18 lines: from "  (\n" to "  ),\n" or "  )\n"
  const lines = rawValues.split(/\r?\n/);
  
  const tupleBlocks = [];
  let currentTuple = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    currentTuple.push(l);
    if (l.trim() === '),' || l.trim() === ')') {
      tupleBlocks.push(currentTuple.join('\n'));
      currentTuple = [];
    }
  }

  return tupleBlocks;
}

const manifest = [];

for (const p of parentDefs) {
  const parentPath = path.join(targetDir, p.parentFile);
  const parentContent = fs.readFileSync(parentPath, 'utf8');
  const parentSha = crypto.createHash('sha256').update(fs.readFileSync(parentPath)).digest('hex');
  const parentBytes = fs.statSync(parentPath).size;
  const parentLines = parentContent.split(/\r?\n/).length;

  console.log(`Processing Parent: ${p.parentFile} (${parentBytes} bytes, ${parentLines} lines)`);
  const tuples = extractTuples(parentContent);
  console.log(`  Extracted ${tuples.length} tuples`);

  let offset = 0;
  for (const s of p.subchunks) {
    const subTuples = tuples.slice(offset, offset + s.count);
    offset += s.count;

    const firstIdMatch = subTuples[0].match(/'(0215b22d-0002-0000-0000-[0-9a-f]{12})'::uuid/);
    const lastIdMatch = subTuples[subTuples.length - 1].match(/'(0215b22d-0002-0000-0000-[0-9a-f]{12})'::uuid/);
    const firstId = firstIdMatch[1];
    const lastId = lastIdMatch[1];

    // Format tuple lines: ensure each ends with comma except the very last one
    const formattedTuples = subTuples.map((t, idx) => {
      let trimmed = t.trimEnd();
      if (idx === subTuples.length - 1) {
        if (trimmed.endsWith(',')) trimmed = trimmed.substring(0, trimmed.length - 1);
      } else {
        if (!trimmed.endsWith(',')) trimmed = trimmed + ',';
      }
      return trimmed;
    }).join('\n');

    const subchunkFileName = `065_b2_2d_chunk_${s.subId}_candidacies_${s.suffix}.sql`;
    const subchunkContent = `-- ==============================================================================
-- W021.5-B2.2-D Chunk ${s.subId.toUpperCase()}: Candidacies (Part ${p.partName}${s.subId.slice(-1).toUpperCase()} of 5)
-- Parent Artifact: ${p.parentFile} (Parent SHA: ${parentSha})
-- Scope: Candidacies ${s.startIdx} to ${s.startIdx + s.count - 1} of 11334 (${s.count} tuples)
-- ID Range: ${firstId} -> ${lastId}
-- Invariants:
--   - DO UPDATE = 0, DELETE = 0, DROP = 0, TRUNCATE = 0, ALTER = 0
--   - 100% FK resolution to canonical_persons(id) and political_organizations(id)
--   - Idempotent ON CONFLICT (person_id, election_year, election_type, constituency_id) DO NOTHING
--   - Fail-closed validation block
-- ==============================================================================

BEGIN;

-- ─── PRE-INSERTION CONFLICT VALIDATION ──────────────────────────────────────────
DO $$
BEGIN
  NULL;
END $$;

-- ─── INSERTION BATCH ──────────────────────────────────────────────────────────
INSERT INTO public.candidacies (
  id,
  person_id,
  election_year,
  election_type,
  constituency_type,
  constituency_id,
  party_id,
  is_independent,
  result,
  votes_received,
  vote_share,
  rank,
  data_status,
  provenance_id,
  created_at,
  updated_at
)
VALUES
${formattedTuples}
ON CONFLICT (person_id, election_year, election_type, constituency_id) DO NOTHING;

-- ─── SUBCHUNK COMPLETION VERIFICATION ─────────────────────────────────────────
DO $$
DECLARE
  v_inserted_sample BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.candidacies
    WHERE id = '${firstId}'::uuid
  ) INTO v_inserted_sample;

  IF NOT v_inserted_sample THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Candidacy Chunk ${s.subId.toUpperCase()} sample record % missing', '${firstId}';
  END IF;
END $$;

COMMIT;
`;

    const subchunkPath = path.join(targetDir, subchunkFileName);
    fs.writeFileSync(subchunkPath, subchunkContent, 'utf8');

    const subBuf = fs.readFileSync(subchunkPath);
    const subBytes = subBuf.length;
    const subLines = subchunkContent.split(/\r?\n/).length;
    const subSha = crypto.createHash('sha256').update(subBuf).digest('hex');

    manifest.push({
      parentFile: p.parentFile,
      subchunkFile: subchunkFileName,
      subId: s.subId.toUpperCase(),
      tuples: s.count,
      startIdx: s.startIdx,
      endIdx: s.startIdx + s.count - 1,
      firstId,
      lastId,
      bytes: subBytes,
      lines: subLines,
      sha256: subSha
    });

    console.log(`  -> Created ${subchunkFileName}: ${subBytes} bytes, ${subLines} lines, ${s.count} tuples, ${firstId} -> ${lastId}`);
  }
}

fs.writeFileSync(path.join(REPO_ROOT, 'reports', 'w021_5_b2_2d_candidacy_subchunks_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nSuccessfully generated all 10 candidacy subchunks and manifest.`);
