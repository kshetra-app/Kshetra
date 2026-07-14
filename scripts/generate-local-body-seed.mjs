#!/usr/bin/env node
/**
 * Generate bundled local-body representative seed (offline, no runtime DB)
 * ═══════════════════════════════════════════════════════════════════════════
 * Reads the hardened TSEC-KYR scraper output
 *   scrapers/output/local-body/<STATE>-<YEAR>-<OFFICE>-kyr.json
 * and emits a bundled TypeScript array of `Representative` records at
 *   data/seed/local-body-representatives.generated.ts
 *
 * This matches how ALL other seed data ships (static TS compiled into the app)
 * and is consumed offline by apps/mobile/lib/representativesData.ts. The full
 * set ships in-app — NO runtime Supabase dependency.
 *
 * ZERO-FABRICATION: only ELECTED winners (via the shared kyr-transform) are
 * emitted, each carrying dataStatus:'verified' + a real sourceUrl.
 *
 * Idempotent: overwrites the generated file on every run. Hand-curated records
 * belong in local-body-representatives.ts (the arrays that spread this in).
 *
 * Usage: node scripts/generate-local-body-seed.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRepsFromKYR } from './lib/kyr-transform.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.resolve(ROOT, 'scrapers/output/local-body');
const OUT_FILE = path.resolve(ROOT, 'data/seed/local-body-representatives.generated.ts');

/** Normalized KYR rep → shared `Representative` shape (drops empty fields). */
function toRepresentative(rep) {
  const out = {
    id: rep.id,
    officeType: rep.officeType,
    jurisdictionType: rep.jurisdictionType,
    jurisdictionId: rep.jurisdictionId,
    stateCode: rep.stateCode,
    name: rep.name,
    partyOfficial: rep.partyOfficial,
    isCurrent: true,
    sourceType: 'sec',
    dataStatus: 'verified',
  };
  if (rep.district) out.district = rep.district;
  // Clean geography (real, scraped) so the app can build a District → Mandal →
  // Gram Panchayat browse tree and label profiles without slug-parsing the id.
  if (rep.mandal) out.mandal = rep.mandal;
  if (rep.gramPanchayat) out.gramPanchayat = rep.gramPanchayat;
  if (rep.wardNo) out.wardNo = rep.wardNo;
  if (rep.reservation && rep.reservation !== '--') out.reservation = rep.reservation;
  if (rep.party) { out.party = rep.party; out.electedParty = rep.party; }
  if (rep.gender === 'M' || rep.gender === 'F') out.gender = rep.gender;
  if (rep.electionYear) out.electionYear = rep.electionYear;
  if (rep.sourceUrl) out.sourceUrl = rep.sourceUrl;
  return out;
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`No scraper output dir: ${INPUT_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('-kyr.json'));
  if (files.length === 0) {
    console.error(`No *-kyr.json files in ${INPUT_DIR}`);
    process.exit(1);
  }

  const all = [];
  const byId = new Map();
  const perFile = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.resolve(INPUT_DIR, file), 'utf-8'));
    const reps = buildRepsFromKYR(data).map(toRepresentative);
    let added = 0;
    for (const r of reps) {
      if (byId.has(r.id)) continue; // collision-safe ids, but guard anyway
      byId.set(r.id, r);
      all.push(r);
      added++;
    }
    perFile.push(`${file}: ${added}`);
  }

  // Stable ordering for clean diffs.
  all.sort((a, b) => a.id.localeCompare(b.id));

  const banner = `/**
 * AUTO-GENERATED — DO NOT EDIT BY HAND.
 * Regenerate with: node scripts/generate-local-body-seed.mjs
 *
 * Bundled local-body representatives (elected winners only) sourced from the
 * TSEC-KYR scraper output. See scripts/generate-local-body-seed.mjs.
 *
 * Records: ${all.length}
 * Generated: ${new Date().toISOString()}
 */
import type { Representative } from '@kshetra/shared';

// Emitted as a JSON string + JSON.parse — NOT a JS array literal. A ~72k-element
// object literal makes tsc infer an unrepresentable union and fail with TS2590
// ("union type too complex"). The JSON.parse form sidesteps type computation
// entirely and parses faster at runtime. Records are shape-validated at
// generation time (scripts/generate-local-body-seed.mjs) + the shared transform.
export const GENERATED_LOCAL_BODY_REPRESENTATIVES: Representative[] = JSON.parse(
`;
  // Double-encode: inner stringify → JSON payload; outer stringify → a safe,
  // fully-escaped single JS string literal (handles quotes/backslashes).
  const payload = JSON.stringify(JSON.stringify(all));
  fs.writeFileSync(OUT_FILE, banner + payload + '\n);\n', 'utf-8');

  const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`Sources: ${perFile.join(' | ')}`);
  console.log(`✅ Wrote ${all.length} representatives → ${OUT_FILE} (${sizeMB} MB)`);
}

main();
