import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve('supabase/migrations');
const OUTPUT_FILE = path.resolve('supabase/all_migrations_combined.sql');

// Ordered list of migrations matching dependency constraints
const ORDERED_FILES = [
  '001_initial_schema.sql',
  '002_seed_telangana.sql',
  '003_multi_state.sql',
  '0035_posts_polls_social.sql',
  '004_civic_dashboard.sql',
  '005_push_notifications.sql',
  '006_trust_safety.sql',
  '007_civic_engagement_pipeline.sql',
  '008_election_affidavits.sql',
  '009_promise_tracker.sql',
  '010_aspiring_leaders.sql',
  '011_delimitation.sql',
  '012_legislator_profiles.sql',
  '013_content_accountability.sql',
  '014_content_promotion_pipeline.sql',
  '015_journalist_platform.sql',
  '016_politician_portal.sql',
  '017_campaign_manager.sql',
  '018_enhanced_civic.sql',
  '019_live_election.sql',
  '020_foundation_hardening.sql',
  '021_seed_demo_data.sql',
  '022_administrative_hierarchy.sql',
  '023_local_body_representatives.sql',
  '023_data_api_grants.sql',
  '024_live_media_exchange.sql',
  '025_feed_realtime_and_social.sql',
  '026_campaign_wallet_and_obd.sql',
  '027_extend_role_and_verification.sql',
  '028_user_follows.sql',
  '029_fix_auth_trigger.sql',
];

console.log(`Combining ${ORDERED_FILES.length} migrations...`);

let combinedSql = `-- ========================================================\n`;
combinedSql += `-- KSHETRA ALL MIGRATIONS COMBINED (001 - 028)\n`;
combinedSql += `-- Generated at: ${new Date().toISOString()}\n`;
combinedSql += `-- Run this script in the Supabase SQL Editor to provision\n`;
combinedSql += `-- the entire database schema, roles, RLS, and seed data.\n`;
combinedSql += `-- ========================================================\n\n`;

for (const file of ORDERED_FILES) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Warning: Migration file missing: ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  combinedSql += `\n-- ────────────────────────────────────────────────────────\n`;
  combinedSql += `-- START MIGRATION: ${file}\n`;
  combinedSql += `-- ────────────────────────────────────────────────────────\n\n`;
  combinedSql += content;
  combinedSql += `\n\n`;
}

fs.writeFileSync(OUTPUT_FILE, combinedSql, 'utf8');
console.log(`Wrote combined migration script to ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB)`);
