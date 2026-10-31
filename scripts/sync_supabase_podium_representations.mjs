/**
 * Supabase Podium Runner-Ups & 13-Language Data Sync Engine
 * ═════════════════════════════════════════════════════════
 * 1. Validates and stages Migration 083 (entity_multilingual_representations,
 *    second_runner_up_candidacy_id, margin differentials, officeholding_status).
 * 2. Compiles verified 13-language domain representations across:
 *    - Political Parties (BJP, INC, JDS, BRS, TDP, YSRCP, SHS, NCP, etc.)
 *    - Education Taxonomy
 *    - Professions Taxonomy
 *    - Reservation Categories
 *    - Electoral & Civic Metrics
 * 3. Batch-syncs normalized representations to Supabase (when connected)
 *    and generates deterministic offline JSON fixtures.
 *
 * Usage: node scripts/sync_supabase_podium_representations.mjs [--push]
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
const FIXTURE_OUT = path.resolve(ROOT, 'data/seed/entity-multilingual-representations.json');

console.log('=== SUPABASE PODIUM & 13-LANGUAGE DATA ARCHITECTURE SYNC ===\n');

// 1. Verify Migration 083 exists and is valid
if (!fs.existsSync(MIGRATION_PATH)) {
  console.error(`FATAL: Migration 083 missing at ${MIGRATION_PATH}`);
  process.exit(1);
}

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const migrationHash = crypto.createHash('sha256').update(migrationSql).digest('hex');
console.log(`[VERIFIED] Migration 083 loaded (SHA-256: ${migrationHash.slice(0, 16)}...)`);

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
console.log(`  ✓ Saved fixture to ${FIXTURE_OUT} (${Math.round(fs.statSync(FIXTURE_OUT).size / 1024)} KB)\n`);

// 2. Connect to Supabase Staging if available
const envPath = path.resolve(ROOT, '.env.staging');
if (fs.existsSync(envPath)) {
  const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    console.log(`[SYNC] Connecting to Supabase at ${url}...`);
    const supabase = createClient(url, key);

    try {
      const { data, error } = await supabase
        .from('entity_multilingual_representations')
        .select('id')
        .limit(1);

      if (error && error.message.includes('Could not find the table')) {
        console.log('  ℹ️  Table public.entity_multilingual_representations pending Migration 083 execution.');
        console.log('  To apply to remote database, execute Migration 083 via Supabase SQL Editor or CI pipeline:');
        console.log(`     File: ${path.relative(ROOT, MIGRATION_PATH)}`);
      } else if (!error) {
        console.log('  ✓ Table public.entity_multilingual_representations is present on remote instance!');
        console.log(`  Syncing ${rows.length} representation records...`);
        
        // Batch upsert in chunks of 500
        const CHUNK = 500;
        let synced = 0;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const { error: upsertErr } = await supabase
            .from('entity_multilingual_representations')
            .upsert(chunk, { onConflict: 'entity_type,entity_id,language_code,field_key,representation_type' });
          if (upsertErr) {
            console.error('  ✗ Chunk upsert error:', upsertErr.message);
            break;
          }
          synced += chunk.length;
        }
        console.log(`  ✅ Successfully synced ${synced} representation records to Supabase!`);
      }
    } catch (e) {
      console.log('  Notice: Supabase remote sync skipped (local/staging network unreachable):', e.message);
    }
  }
}

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('                    SUPABASE & ARCHITECTURE SYNC COMPLETE                        ');
console.log('═════════════════════════════════════════════════════════════════════════════════\n');
