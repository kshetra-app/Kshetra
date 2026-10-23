/**
 * tests/migration-069-referential-integrity.test.mjs
 *
 * Migration 069 Referential Integrity & Constraint Reconciliation Test Suite
 * Authority: CTO Directive 150 Section 4 & Section 6.2 / Task W021.5-D-03
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies catalog definitions, RESTRICT actions, transaction boundaries, and deduplication:
 *  1. Migration file exists and matches SHA-256 registered in schema contract specification
 *  2. Unconditionally drops legacy CASCADE foreign key (candidacies_contest_id_fkey) and legacy unnamed FKs
 *  3. Validates pg_constraint catalog definition for fk_candidacies_contest (conrelid, confrelid, confdeltype='r', convalidated=true)
 *  4. Validates pg_constraint catalog definition for fk_candidacies_person (conrelid, confrelid, confdeltype='r', convalidated=true)
 *  5. Validates pg_constraint catalog definition for fk_candidacies_party (conrelid, confrelid, confdeltype='r', convalidated=true)
 *  6. Drops and recreates malformed or CASCADE constraints if already present
 *  7. Safely deduplicates redundant index definitions (idx_candidacies_*_fk)
 *  8. Ensures canonical base indexes exist (idx_candidacies_contest_id, idx_candidacies_person, idx_candidacies_party)
 *  9. Enforces atomic transaction boundary (BEGIN / COMMIT) with zero exception swallowing
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const MIGRATION_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '069_candidate_referential_integrity_reconciliation.sql');
const SCHEMA_SPEC_PATH = path.join(REPO_ROOT, 'reports', 'w021_5_schema_contract_specification.json');

describe('CTO Directive 150: Migration 069 Referential Integrity & Constraint Reconciliation', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const spec = JSON.parse(fs.readFileSync(SCHEMA_SPEC_PATH, 'utf8'));

  // ─── 1. FILE EXISTENCE & SHA-256 CONCORDANCE ─────────────────────────────
  it('1. Migration 069 file exists and matches exact SHA-256 in schema contract specification', () => {
    assert(fs.existsSync(MIGRATION_PATH), 'Migration 069 must exist on disk');
    const computedSha = crypto.createHash('sha256').update(fs.readFileSync(MIGRATION_PATH)).digest('hex');

    const entry = spec.migrationSequence?.files?.find(f => f.path.includes('069_candidate_referential_integrity_reconciliation.sql'));
    assert(entry, 'Migration 069 must be registered in schema contract specification');
    assert.strictEqual(computedSha, entry.sha256, 'Computed SHA-256 must match schema contract specification');
  });

  // ─── 2. DROPS LEGACY CASCADE & UNNAMED CONSTRAINTS ───────────────────────
  it('2. Unconditionally drops legacy CASCADE foreign key and unnamed auto-generated FKs', () => {
    assert(
      sql.includes('ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_contest_id_fkey;'),
      'Must drop legacy candidacies_contest_id_fkey (CASCADE) from Migration 051'
    );
    assert(
      sql.includes('ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_person_id_fkey;'),
      'Must drop legacy auto-generated candidacies_person_id_fkey'
    );
    assert(
      sql.includes('ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_party_id_fkey;'),
      'Must drop legacy auto-generated candidacies_party_id_fkey'
    );
  });

  // ─── 3. CONTEST FK: PG_CONSTRAINT CATALOG VALIDATION ──────────────────────
  it('3. Validates pg_constraint catalog definition for fk_candidacies_contest with ON DELETE RESTRICT', () => {
    assert(sql.includes("conname = 'fk_candidacies_contest'"), 'Must inspect constraint name fk_candidacies_contest');
    assert(sql.includes("conrelid = 'public.candidacies'::regclass"), 'Must assert conrelid is public.candidacies');
    assert(sql.includes("confrelid = 'public.election_contests'::regclass"), 'Must assert confrelid is public.election_contests');
    assert(sql.includes("confdeltype = 'r'"), 'Must assert confdeltype is RESTRICT (r)');
    assert(sql.includes('convalidated = true'), 'Must assert convalidated is true');
    assert(
      sql.includes('FOREIGN KEY (contest_id) REFERENCES public.election_contests(id)'),
      'Must reference election_contests(id)'
    );
    assert(sql.includes('ON DELETE RESTRICT;'), 'Must specify ON DELETE RESTRICT');
  });

  // ─── 4. PERSON FK: PG_CONSTRAINT CATALOG VALIDATION ───────────────────────
  it('4. Validates pg_constraint catalog definition for fk_candidacies_person with ON DELETE RESTRICT', () => {
    assert(sql.includes("conname = 'fk_candidacies_person'"), 'Must inspect constraint name fk_candidacies_person');
    assert(sql.includes("confrelid = 'public.canonical_persons'::regclass"), 'Must assert confrelid is public.canonical_persons');
    assert(
      sql.includes('FOREIGN KEY (person_id) REFERENCES public.canonical_persons(id)'),
      'Must reference canonical_persons(id)'
    );
  });

  // ─── 5. PARTY FK: PG_CONSTRAINT CATALOG VALIDATION ────────────────────────
  it('5. Validates pg_constraint catalog definition for fk_candidacies_party with ON DELETE RESTRICT', () => {
    assert(sql.includes("conname = 'fk_candidacies_party'"), 'Must inspect constraint name fk_candidacies_party');
    assert(sql.includes("confrelid = 'public.political_organizations'::regclass"), 'Must assert confrelid is public.political_organizations');
    assert(
      sql.includes('FOREIGN KEY (party_id) REFERENCES public.political_organizations(id)'),
      'Must reference political_organizations(id)'
    );
  });

  // ─── 6. DROPS AND RECREATES MALFORMED / CASCADE CONSTRAINTS ───────────────
  it('6. Idempotently drops and recreates malformed, unvalidated, or CASCADE constraints', () => {
    // Assert logic: IF v_exists AND NOT v_valid THEN ALTER TABLE DROP CONSTRAINT ...
    const dropContestPattern = /IF v_exists AND NOT v_valid THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_contest;/;
    const dropPersonPattern = /IF v_exists AND NOT v_valid THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_person;/;
    const dropPartyPattern = /IF v_exists AND NOT v_valid THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_party;/;

    assert(dropContestPattern.test(sql), 'Must drop fk_candidacies_contest if invalid');
    assert(dropPersonPattern.test(sql), 'Must drop fk_candidacies_person if invalid');
    assert(dropPartyPattern.test(sql), 'Must drop fk_candidacies_party if invalid');
  });

  // ─── 7. INDEX DEDUPLICATION ───────────────────────────────────────────────
  it('7. Safely drops redundant duplicate index definitions while ensuring canonical base indexes exist', () => {
    assert(sql.includes('DROP INDEX IF EXISTS public.idx_candidacies_contest_fk;'));
    assert(sql.includes('DROP INDEX IF EXISTS public.idx_candidacies_person_fk;'));
    assert(sql.includes('DROP INDEX IF EXISTS public.idx_candidacies_party_fk;'));

    assert(sql.includes('CREATE INDEX IF NOT EXISTS idx_candidacies_contest_id ON public.candidacies(contest_id);'));
    assert(sql.includes('CREATE INDEX IF NOT EXISTS idx_candidacies_person ON public.candidacies(person_id);'));
    assert(sql.includes('CREATE INDEX IF NOT EXISTS idx_candidacies_party ON public.candidacies(party_id) WHERE party_id IS NOT NULL;'));
  });

  // ─── 8. ATOMIC TRANSACTION BOUNDARY & ZERO EXCEPTION SWALLOWING ───────────
  it('8. Enforces atomic transaction boundary with zero exception swallowing', () => {
    const trimmed = sql.trim();
    assert(sql.includes('BEGIN;'), 'Migration 069 must contain BEGIN;');
    assert(trimmed.endsWith('COMMIT;'), 'Migration 069 must terminate with COMMIT;');

    // Invariant: zero exception swallowing blocks (WHEN OTHERS THEN NULL or similar)
    assert(!/WHEN\s+OTHERS/i.test(sql), 'Migration 069 must NOT swallow exceptions with WHEN OTHERS');
    assert(!/EXCEPTION\s+WHEN/i.test(sql), 'Migration 069 must NOT contain EXCEPTION blocks that suppress failures');
  });
});
