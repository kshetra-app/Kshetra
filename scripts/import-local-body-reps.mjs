#!/usr/bin/env node
/**
 * Import Local-Body Representatives → Supabase (migration 023)
 * ═══════════════════════════════════════════════════════════════════════════
 * Transforms the SEC scraper output
 *   scrapers/output/local-body/<STATE>-<YEAR>-panchayat-results.json
 * (produced by scrapers/local-body-scraper.js) into `representatives` rows and
 * upserts them into Supabase.
 *
 * ZERO-FABRICATION: only rows that have an actual winner name from the official
 * SEC portal are imported, each stamped with `data_status='verified'`,
 * `source_type='sec'` and the SEC `source_url`. Seats with no declared winner
 * are skipped (the app renders "Data pending" for those).
 *
 * Env (required):
 *   SUPABASE_URL                 e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service-role key (server-side only!)
 *
 * Two input shapes are supported:
 *   1. Legacy SEC results:  <STATE>-<YEAR>-panchayat-results.json
 *   2. TSEC KYR (hardened):  TS-<YEAR>-<OFFICE>-kyr.json  (--source=kyr --office=S)
 *
 * Usage:
 *   node scripts/import-local-body-reps.mjs --state=TS --year=2019
 *   node scripts/import-local-body-reps.mjs --state=TS --year=2019 --source=kyr --office=S
 *   node scripts/import-local-body-reps.mjs --state=AP --year=2021 --dry-run
 *
 * NOTE: AP gram-panchayat polls are officially non-party → `party_official`
 * is set to FALSE for AP GP-tier offices (party treated as de-facto).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { buildRepsFromKYR } from './lib/kyr-transform.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find((a) => a.startsWith('--state='))?.split('=')[1]?.toUpperCase();
const yearFilter = args.find((a) => a.startsWith('--year='))?.split('=')[1];
const source = args.find((a) => a.startsWith('--source='))?.split('=')[1] ?? 'sec';
const officeArg = args.find((a) => a.startsWith('--office='))?.split('=')[1]?.toUpperCase();
const dryRun = args.includes('--dry-run');

if (!stateFilter || !yearFilter) {
  console.log('Usage: node scripts/import-local-body-reps.mjs --state=TS --year=2019 [--dry-run]');
  process.exit(0);
}

// ── Supabase client ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or use --dry-run).');
  process.exit(1);
}

const supabase = dryRun
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Helpers ────────────────────────────────────────────────────────────────
const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Gram-panchayat tier polls (sarpanch + GP ward member) are conducted on a
 * non-party basis in both Telangana and Andhra Pradesh — ballots carry no party
 * symbol. MPTC/ZPTC polls ARE party-based. So party affiliation for GP-tier
 * winners is de-facto only.
 */
function isPartyOfficial(stateCode, officeType) {
  const gpTier = officeType === 'sarpanch' || officeType === 'gp_ward_member';
  if ((stateCode === 'AP' || stateCode === 'TS') && gpTier) return false;
  return true;
}

function makeRep({ stateCode, year, sourceUrl, officeType, jurisdictionType, jurisdictionId, district, winner }) {
  if (!winner || !winner.name) return null;
  return {
    id: `${stateCode}-REP-${officeType}-${jurisdictionId}-${year}`,
    office_type: officeType,
    jurisdiction_type: jurisdictionType,
    jurisdiction_id: jurisdictionId,
    state_code: stateCode,
    district: district ?? null,
    name: winner.name,
    party: winner.party ?? null,
    party_official: isPartyOfficial(stateCode, officeType),
    elected_party: winner.party ?? null,
    election_year: Number(year),
    is_current: true,
    source_type: 'sec',
    source_url: sourceUrl ?? null,
    data_status: 'verified',
  };
}

// ── Transform scraper output → representative rows ──────────────────────────
function buildRows(data) {
  const rows = [];
  const stateCode = data.stateCode;
  const year = String(data.year);

  for (const r of data.results ?? []) {
    const district = r.districtName;
    // Stable jurisdiction ids: prefer LGD code, else district/mandal/panchayat slug.
    const gpKey = r.lgdPanchayatCode
      ? `${stateCode}-GP-${r.lgdPanchayatCode}`
      : `${stateCode}-GP-${slug(district)}-${slug(r.mandalName)}-${slug(r.panchayatName)}`;
    const mandalKey = `${stateCode}-MP-${slug(district)}-${slug(r.mandalName)}`;

    // Sarpanch
    if (r.sarpanchResult?.winner) {
      const row = makeRep({
        stateCode, year, sourceUrl: data.results?.sourceUrl ?? data.sourceUrl,
        officeType: 'sarpanch', jurisdictionType: 'gram_panchayat',
        jurisdictionId: gpKey, district, winner: r.sarpanchResult.winner,
      });
      if (row) rows.push(row);
    }

    // GP ward members
    for (const w of r.wardResults ?? []) {
      if (!w.winner) continue;
      const row = makeRep({
        stateCode, year, sourceUrl: data.sourceUrl,
        officeType: 'gp_ward_member', jurisdictionType: 'gp_ward',
        jurisdictionId: `${gpKey}-W${w.wardNumber}`, district, winner: w.winner,
      });
      if (row) rows.push(row);
    }

    // MPTC members
    for (const s of r.mptcResults ?? []) {
      if (!s.winner) continue;
      const row = makeRep({
        stateCode, year, sourceUrl: data.sourceUrl,
        officeType: 'mptc_member', jurisdictionType: 'mptc_division',
        jurisdictionId: `${mandalKey}-MPTC-${s.seatNumber}`, district, winner: s.winner,
      });
      if (row) rows.push(row);
    }

    // ZPTC members
    for (const s of r.zptcResults ?? []) {
      if (!s.winner) continue;
      const row = makeRep({
        stateCode, year, sourceUrl: data.sourceUrl,
        officeType: 'zptc_member', jurisdictionType: 'zptc_division',
        jurisdictionId: `${stateCode}-ZP-${slug(district)}-ZPTC-${s.seatNumber}`, district, winner: s.winner,
      });
      if (row) rows.push(row);
    }
  }

  // De-duplicate by id (last write wins).
  const byId = new Map();
  for (const row of rows) byId.set(row.id, row);
  return [...byId.values()];
}

// ── Transform TSEC KYR records → representative rows ────────────────────────
// The winners-only filter, jurisdiction-id scheme and non-party rules live in
// scripts/lib/kyr-transform.mjs (shared with the offline seed-db builder). Here
// we only map the normalized rep → the Supabase `representatives` column shape.
function buildRowsFromKYR(data) {
  return buildRepsFromKYR(data).map((rep) => {
    const row = {
      id: rep.id,
      office_type: rep.officeType,
      jurisdiction_type: rep.jurisdictionType,
      jurisdiction_id: rep.jurisdictionId,
      state_code: rep.stateCode,
      district: rep.district ?? null,
      name: rep.name,
      party: rep.party ?? null,
      party_official: rep.partyOfficial,
      elected_party: rep.party ?? null,
      election_year: rep.electionYear,
      is_current: true,
      source_type: 'sec',
      source_url: rep.sourceUrl ?? null,
      data_status: 'verified',
    };
    // gender is the only KYR extra with a real `representatives` column.
    // Votes/reservation stay in the scraper JSON for provenance.
    if (rep.gender) row.gender = rep.gender;
    return row;
  });
}

// ── Batched upsert ──────────────────────────────────────────────────────────
async function upsertRows(rows) {
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('representatives').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
    done += batch.length;
    process.stdout.write(`\r   Upserted ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const isKyr = source === 'kyr';
  const outDir = path.join(ROOT, 'scrapers', 'output', 'local-body');
  const inFile = isKyr
    ? path.join(outDir, `${stateFilter}-${yearFilter}-${officeArg}-kyr.json`)
    : path.join(outDir, `${stateFilter}-${yearFilter}-panchayat-results.json`);

  if (isKyr && !officeArg) {
    console.error('❌ --source=kyr requires --office=S|GW|M|Z');
    process.exit(1);
  }
  if (!fs.existsSync(inFile)) {
    console.error(`❌ Scraper output not found: ${inFile}`);
    console.error(isKyr
      ? `   Run: node scrapers/tsec-kyr-scraper.js --year=${yearFilter} --office=${officeArg ?? 'S'}`
      : `   Run: node scrapers/local-body-scraper.js --state=${stateFilter} --year=${yearFilter}`);
    process.exit(1);
  }

  console.log(`📥 Reading ${path.relative(ROOT, inFile)}`);
  const data = JSON.parse(fs.readFileSync(inFile, 'utf-8'));

  const rows = isKyr ? buildRowsFromKYR(data) : buildRows(data);
  console.log(`🧮 Built ${rows.length} verified representative rows`);

  // Summary by office
  const byOffice = rows.reduce((acc, r) => { acc[r.office_type] = (acc[r.office_type] || 0) + 1; return acc; }, {});
  for (const [office, count] of Object.entries(byOffice)) {
    console.log(`   ${office.padEnd(16)} ${count}`);
  }

  if (dryRun) {
    console.log('\n🔎 Dry run — no data written. Sample row:');
    console.log(JSON.stringify(rows[0] ?? {}, null, 2));
    return;
  }

  console.log('\n⬆️  Upserting into representatives …');
  await upsertRows(rows);
  console.log('✨ Done.');
}

main().catch((err) => { console.error('\n❌ Fatal:', err); process.exit(1); });
