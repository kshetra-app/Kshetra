#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/072_w021_5_affidavit_truth_hardening.sql'), 'utf8');
const checkpoint = fs.readFileSync(path.join(root, 'supabase/staging_checkpoints/w021_5_post_072_affidavit_truth_gate.sql'), 'utf8');

test('W0215-072 has fail-closed schema preflight', () => {
  assert.match(migration, /W0215_072_PREFLIGHT_FAILED/);
  assert.match(migration, /candidate_affidavit_disclosures/);
  assert.match(migration, /orphan affidavit constituency_id values exist/i);
});

test('criminal disclosure counts are nullable and have no zero defaults', () => {
  for (const col of ['criminal_cases_count','serious_ipc_count','convictions_count','charges_framed_count']) {
    assert.match(migration, new RegExp('ALTER COLUMN ' + col + ' DROP DEFAULT'));
    assert.match(migration, new RegExp('ALTER COLUMN ' + col + ' DROP NOT NULL'));
  }
  assert.match(migration, /SET\s+criminal_cases_count\s*=\s*CASE[\s\S]*?WHEN criminal_cases_count = 0 THEN NULL/i);
});

test('unproven OFFICIAL records are demoted and future OFFICIAL status requires evidence', () => {
  assert.match(migration, /SET data_status = 'UNKNOWN'::public\.data_status_enum/i);
  assert.match(migration, /source_hash !~\* '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(migration, /chk_affidavit_official_requires_source/);
  assert.match(migration, /ALTER COLUMN data_status DROP DEFAULT/);
});

test('canonical constituency foreign key is added with restrictive deletion', () => {
  assert.match(migration, /FOREIGN KEY \(constituency_id\)\s+REFERENCES public\.constituencies\(id\)\s+ON DELETE RESTRICT/i);
});

test('postflight gate covers nullability, provenance, FK, RLS and policy', () => {
  for (const needle of [
    'CRIT-072-01','CRIT-072-02','CRIT-072-03','CRIT-072-04',
    'CRIT-072-05','CRIT-072-06','W0215_POST_072_GATE'
  ]) assert.ok(checkpoint.includes(needle), 'Missing postflight check: ' + needle);
  assert.match(checkpoint, /result[\s\S]*'PASS'/);
});
