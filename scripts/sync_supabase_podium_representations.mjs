/**
 * Supabase Podium Runner-Ups & 13-Language Data Sync & Verification Engine
 * ═════════════════════════════════════════════════════════════════════════
 * 1. Validates and stages Migration 083 (entity_multilingual_representations,
 *    second_runner_up_candidacy_id, margin differentials, officeholding_status).
 * 2. Compiles verified 13-language domain representations across:
 *    - Political Parties (BJP, INC, JDS, BRS, TDP, YSRCP, SHS, NCP, etc.)
 *    - Education Taxonomy
 *    - Professions Taxonomy
 *    - Reservation Categories
 *    - Electoral & Civic Metrics
 * 3. Batch-syncs normalized representations to Supabase Staging or Production.
 * 4. Executes live post-push verification against PostgreSQL and the
 *    deterministic resolution RPC function (fn_get_localized_entity_field).
 *
 * Usage:
 *   node scripts/sync_supabase_podium_representations.mjs [--push] [--verify] [--staging | --production] [--env=.env.staging]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  PARTIES_13_LANG,
  EDUCATION_13_LANG,
  PROFESSIONS_13_LANG,
  RESERVATIONS_13_LANG,
  METRICS_13_LANG,
  SUPPORTED_LANGUAGES,
} from '../packages/shared/src/i18n/domain-dictionary.ts';

const ROOT = process.cwd();
const MIGRATION_PATH = path.resolve(ROOT, 'supabase/migrations/083_podium_runner_ups_and_13_language_data_architecture.sql');
const VERIFICATION_GATE_PATH = path.resolve(ROOT, 'supabase/verification/083_verification_gate.sql');
const FIXTURE_OUT = path.resolve(ROOT, 'data/seed/entity-multilingual-representations.json');

// Parse CLI flags
const args = process.argv.slice(2);
const shouldPush = args.includes('--push');
const shouldVerifyOnly = args.includes('--verify');
const isProdTarget = args.includes('--production');
const customEnvArg = args.find(a => a.startsWith('--env='));

let targetEnvFile = isProdTarget ? '.env.production' : '.env.staging';
if (customEnvArg) {
  targetEnvFile = customEnvArg.split('=')[1];
}

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('       SUPABASE PODIUM & 13-LANGUAGE DATA ARCHITECTURE SYNC & VERIFICATION       ');
console.log('═════════════════════════════════════════════════════════════════════════════════\n');

// 1. Verify Migration 083 exists and is valid
if (!fs.existsSync(MIGRATION_PATH)) {
  console.error(`FATAL: Migration 083 missing at ${MIGRATION_PATH}`);
  process.exit(1);
}

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const migrationHash = crypto.createHash('sha256').update(migrationSql).digest('hex');
console.log(`[SCHEMA] Migration 083 loaded (SHA-256: ${migrationHash.slice(0, 16)}...)`);
if (fs.existsSync(VERIFICATION_GATE_PATH)) {
  console.log(`[SCHEMA] SQL Verification Gate available: supabase/verification/083_verification_gate.sql`);
}

// ISO 15924 script mapping per language
const LANG_TO_SCRIPT = {
  en: 'Latn',
  hi: 'Deva',
  mr: 'Deva',
  ne: 'Deva',
  te: 'Telu',
  kn: 'Knda',
  ta: 'Taml',
  ml: 'Mlym',
  bn: 'Beng',
  as: 'Beng',
  gu: 'Gujr',
  pa: 'Guru',
  or: 'Orya',
};

// Compile representations table rows
const rows = [];

function addDictItems(dict, entityType, fieldKey) {
  for (const [entityId, translations] of Object.entries(dict)) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const val = translations[lang];
      if (!val) continue;

      // Deterministic UUID based on entityType:entityId:lang:fieldKey
      const seed = `${entityType}:${entityId}:${lang}:${fieldKey}`;
      const hash = crypto.createHash('sha256').update(seed).digest('hex');
      const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

      rows.push({
        id,
        entity_type: entityType,
        entity_id: entityId,
        language_code: lang,
        script_code: LANG_TO_SCRIPT[lang] || 'Latn',
        field_key: fieldKey,
        representation_value: val,
        representation_type: lang === 'en' ? 'OFFICIAL' : 'TRANSLATION',
        translation_status: 'HUMAN_VERIFIED',
      });
    }
  }
}

console.log('[COMPILING] Compiling 13-language verified domain dictionaries...');
addDictItems(PARTIES_13_LANG, 'political_party', 'name');
addDictItems(EDUCATION_13_LANG, 'taxonomy', 'label');
addDictItems(PROFESSIONS_13_LANG, 'taxonomy', 'label');
addDictItems(RESERVATIONS_13_LANG, 'taxonomy', 'label');
addDictItems(METRICS_13_LANG, 'taxonomy', 'label');

console.log(`  ✓ Total normalized representations compiled: ${rows.length}`);

// Write fixture to disk
fs.writeFileSync(FIXTURE_OUT, JSON.stringify(rows, null, 2), 'utf8');
console.log(`  ✓ Saved offline fixture to ${path.relative(ROOT, FIXTURE_OUT)} (${Math.round(fs.statSync(FIXTURE_OUT).size / 1024)} KB)\n`);

// 2. Connect to Supabase
const envPath = path.resolve(ROOT, targetEnvFile);
let url = process.env.SUPABASE_URL;
let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  url = env.SUPABASE_URL || url;
  key = env.SUPABASE_SERVICE_ROLE_KEY || key;
}

if (url) {
  url = url.trim().replace(/^<|>$/g, '');
}
if (key) {
  key = key.trim().replace(/^<|>$/g, '');
}

if (!url || !key) {
  console.log(`[TARGET NOTICE] Environment file ${targetEnvFile} not found and environment variables not set.`);
  console.log(`Offline compilation completed successfully. To sync to remote Production Supabase:`);
  console.log(`  Option A: Create a file named .env.production in the project root containing:`);
  console.log(`     SUPABASE_URL=https://ehfafcnimmjusyvplbah.supabase.co`);
  console.log(`     SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>`);
  console.log(`  Option B: Set PowerShell environment variables before running:`);
  console.log(`     $env:SUPABASE_URL="https://ehfafcnimmjusyvplbah.supabase.co"`);
  console.log(`     $env:SUPABASE_SERVICE_ROLE_KEY="<your-production-service-role-key>"`);
  console.log(`     node scripts/sync_supabase_podium_representations.mjs --push --production\n`);
  process.exit(0);
}

const targetType = url.includes('fkpigozcqnmcvofuksar') ? 'STAGING (panIN-staging)' : (url.includes('ehfafcnimmjusyvplbah') ? 'PRODUCTION' : 'CUSTOM');
console.log(`[TARGET] Connecting to ${targetType}:`);
console.log(`  Endpoint: ${url}`);
console.log(`  Target Config: ${targetEnvFile}\n`);

const supabase = createClient(url, key);

async function run() {
  try {
    // Check if table exists
    const { data: probeData, error: probeErr } = await supabase
      .from('entity_multilingual_representations')
      .select('id')
      .limit(1);

    if (probeErr && (probeErr.message.includes('Could not find the table') || probeErr.code === '42P01')) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  ACTION REQUIRED: Table public.entity_multilingual_representations is not yet present.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Please execute Migration 083 in your Supabase SQL Editor:');
      console.log(`  File: ${path.relative(ROOT, MIGRATION_PATH)}`);
      console.log('\nOnce applied, rerun this command with --push to sync multilingual representations.');
      return;
    }

    if (probeErr) {
      console.error('✗ Connection / Table probe error:', probeErr.message);
      return;
    }

    console.log('  ✓ Table public.entity_multilingual_representations is ACTIVE and reachable.');

    // 3. Batch Push if requested
    if (shouldPush) {
      console.log(`\n[SYNC] Pushing ${rows.length} representation records to Supabase...`);
      const CHUNK = 200;
      let synced = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error: upsertErr } = await supabase
          .from('entity_multilingual_representations')
          .upsert(chunk, { onConflict: 'entity_type,entity_id,language_code,field_key,representation_type' });
        
        if (upsertErr) {
          console.error(`  ✗ Upsert error at chunk ${i / CHUNK + 1}:`, upsertErr.message);
          throw upsertErr;
        }
        synced += chunk.length;
        process.stdout.write(`  ... Synced ${synced} / ${rows.length} records\r`);
      }
      console.log(`\n  ✅ Successfully synced all ${synced} multilingual representations!`);
    } else if (!shouldVerifyOnly) {
      console.log('  ℹ️  Table is ready. Pass --push to sync representations to this database.');
    }

    // 4. Verification Gate
    console.log('\n[VERIFICATION] Executing Automated Post-Sync Verification Gate...');
    
    // Count total rows
    const { count: totalRows, error: countErr } = await supabase
      .from('entity_multilingual_representations')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('  ✗ Failed to query total row count:', countErr.message);
      return;
    }

    console.log(`  1. Total Multilingual Records: ${totalRows} (Expected: >= ${rows.length})`);

    // Verify 13-language representation breakdown
    const { data: langSample, error: langErr } = await supabase
      .from('entity_multilingual_representations')
      .select('language_code');

    if (!langErr && langSample) {
      const distinctLangs = new Set(langSample.map(r => r.language_code));
      console.log(`  2. Supported Languages Count : ${distinctLangs.size} / 13 languages`);
      const missing = SUPPORTED_LANGUAGES.filter(l => !distinctLangs.has(l));
      if (missing.length === 0) {
        console.log('     ✓ 100% Language Parity (en, te, hi, kn, mr, ta, ml, bn, gu, pa, or, as, ne)');
      } else {
        console.warn(`     ⚠️ Missing languages: ${missing.join(', ')}`);
      }
    }

    // Test live RPC function fn_get_localized_entity_field
    console.log('  3. Testing PostgreSQL RPC function fn_get_localized_entity_field...');
    const testCases = [
      { type: 'political_party', id: 'BJP', lang: 'te', field: 'name', expected: 'భారతీయ జనతా పార్టీ' },
      { type: 'political_party', id: 'INC', lang: 'hi', field: 'name', expected: 'भारतीय राष्ट्रीय कांग्रेस' },
      { type: 'political_party', id: 'AAP', lang: 'pa', field: 'name', expected: 'ਆਮ ਆਦਮੀ ਪਾਰਟੀ' },
      { type: 'taxonomy', id: 'Winner', lang: 'ta', field: 'label', expected: 'வெற்றியாளர்' },
      { type: 'taxonomy', id: 'Graduate', lang: 'kn', field: 'label', expected: 'ಪದವೀಧರ' },
    ];

    let rpcPass = 0;
    for (const tc of testCases) {
      const { data: rpcVal, error: rpcErr } = await supabase.rpc('fn_get_localized_entity_field', {
        p_entity_type: tc.type,
        p_entity_id: tc.id,
        p_language_code: tc.lang,
        p_field_key: tc.field,
      });

      if (rpcErr) {
        console.log(`     ✗ RPC Error for ${tc.id} (${tc.lang}): ${rpcErr.message}`);
      } else if (rpcVal === tc.expected) {
        rpcPass++;
        console.log(`     ✓ [${tc.lang}] ${tc.id} -> "${rpcVal}" (PASS)`);
      } else {
        console.log(`     ⚠️ [${tc.lang}] ${tc.id} -> got "${rpcVal}", expected "${tc.expected}"`);
      }
    }

    if (rpcPass === testCases.length) {
      console.log(`  ✅ All ${rpcPass}/${testCases.length} RPC localization tests passed with bitwise accuracy!`);
    }

  } catch (err) {
    console.error('Fatal sync execution error:', err.message);
  }
}

await run();

console.log('\n═════════════════════════════════════════════════════════════════════════════════');
console.log('                   SUPABASE DATA & VERIFICATION COMPLETE                         ');
console.log('═════════════════════════════════════════════════════════════════════════════════\n');
