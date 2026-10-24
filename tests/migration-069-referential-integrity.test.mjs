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
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const MIGRATION_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '069_candidate_referential_integrity_reconciliation.sql');
const SCHEMA_SPEC_PATH = path.join(REPO_ROOT, 'reports', 'w021_5_schema_contract_specification.json');

describe('CTO Directive 150/152: Migration 069 Referential Integrity & Constraint Reconciliation', () => {
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
    const dropContestPattern = /IF v_exists AND NOT (?:COALESCE\(v_valid,\s*FALSE\)|v_valid) THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_contest;/;
    const dropPersonPattern = /IF v_exists AND NOT (?:COALESCE\(v_valid,\s*FALSE\)|v_valid) THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_person;/;
    const dropPartyPattern = /IF v_exists AND NOT (?:COALESCE\(v_valid,\s*FALSE\)|v_valid) THEN\s+ALTER TABLE public\.candidacies DROP CONSTRAINT fk_candidacies_party;/;

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

    assert(!/WHEN\s+OTHERS/i.test(sql), 'Migration 069 must NOT swallow exceptions with WHEN OTHERS');
    assert(!/EXCEPTION\s+WHEN/i.test(sql), 'Migration 069 must NOT contain EXCEPTION blocks that suppress failures');
  });
});

// ─── PART B: ENGINE-LEVEL INTEGRATION TESTS (7 SCENARIOS VIA PGLITE) ────────
describe('CTO Directive 152: Migration 069 Engine-Level Integration (7 Scenarios)', () => {
  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  async function createBaseDb() {
    const db = new PGlite();
    await db.exec(`
      CREATE TABLE public.election_contests (
        id UUID PRIMARY KEY
      );
      CREATE TABLE public.canonical_persons (
        id UUID PRIMARY KEY
      );
      CREATE TABLE public.political_organizations (
        id TEXT PRIMARY KEY
      );
      CREATE TABLE public.other_table (
        id UUID PRIMARY KEY
      );
      CREATE TABLE public.candidacies (
        id UUID PRIMARY KEY,
        contest_id UUID,
        person_id UUID,
        party_id TEXT,
        other_id UUID
      );
    `);
    return db;
  }

  // Helper to query constraint metadata
  async function getConstraintMeta(db, conname) {
    const res = await db.query(`
      SELECT 
        c.conname,
        c.contype,
        c.confdeltype,
        c.convalidated,
        c.conrelid::regclass::text as table_name,
        c.confrelid::regclass::text as ref_table_name,
        c.conkey,
        c.confkey
      FROM pg_constraint c
      WHERE c.conname = $1
        AND c.conrelid = 'public.candidacies'::regclass;
    `, [conname]);
    return res.rows[0] || null;
  }

  it('Scenario 1: All three named constraints absent initially -> creates them with RESTRICT and validated', async () => {
    const db = await createBaseDb();
    
    // Verify none exist initially
    assert.strictEqual(await getConstraintMeta(db, 'fk_candidacies_contest'), null);
    assert.strictEqual(await getConstraintMeta(db, 'fk_candidacies_person'), null);
    assert.strictEqual(await getConstraintMeta(db, 'fk_candidacies_party'), null);

    // Run migration
    await db.exec(migrationSql);

    // All three must now exist with confdeltype = 'r' and convalidated = true
    const contestFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert(contestFk, 'fk_candidacies_contest must be created');
    assert.strictEqual(contestFk.confdeltype, 'r', 'Must be ON DELETE RESTRICT');
    assert.strictEqual(contestFk.convalidated, true, 'Must be validated');
    assert(contestFk.ref_table_name.endsWith('election_contests'), 'Must reference election_contests');

    const personFk = await getConstraintMeta(db, 'fk_candidacies_person');
    assert(personFk, 'fk_candidacies_person must be created');
    assert.strictEqual(personFk.confdeltype, 'r', 'Must be ON DELETE RESTRICT');
    assert.strictEqual(personFk.convalidated, true, 'Must be validated');
    assert(personFk.ref_table_name.endsWith('canonical_persons'), 'Must reference canonical_persons');

    const partyFk = await getConstraintMeta(db, 'fk_candidacies_party');
    assert(partyFk, 'fk_candidacies_party must be created');
    assert.strictEqual(partyFk.confdeltype, 'r', 'Must be ON DELETE RESTRICT');
    assert.strictEqual(partyFk.convalidated, true, 'Must be validated');
    assert(partyFk.ref_table_name.endsWith('political_organizations'), 'Must reference political_organizations');
  });

  it('Scenario 2: Same-named constraint with wrong relation/column -> drops and replaces with correct RESTRICT constraint', async () => {
    const db = await createBaseDb();

    // Create a bogus fk_candidacies_contest pointing to other_table(id)
    await db.exec(`
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_contest
        FOREIGN KEY (other_id) REFERENCES public.other_table(id);
    `);

    const initialFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert(initialFk.ref_table_name.endsWith('other_table'));

    // Run migration
    await db.exec(migrationSql);

    const replacedFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert(replacedFk, 'fk_candidacies_contest must exist after reconciliation');
    assert(replacedFk.ref_table_name.endsWith('election_contests'), 'Must now reference election_contests');
    assert.strictEqual(replacedFk.confdeltype, 'r', 'Must have RESTRICT delete type');
  });

  it('Scenario 3: Same-named constraint with CASCADE -> drops and replaces with RESTRICT', async () => {
    const db = await createBaseDb();

    // Create fk_candidacies_contest with ON DELETE CASCADE
    await db.exec(`
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_contest
        FOREIGN KEY (contest_id) REFERENCES public.election_contests(id)
        ON DELETE CASCADE;
    `);

    const initialFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert.strictEqual(initialFk.confdeltype, 'c', 'Initial delete action must be CASCADE (c)');

    // Run migration
    await db.exec(migrationSql);

    const replacedFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert(replacedFk);
    assert.strictEqual(replacedFk.confdeltype, 'r', 'Replaced delete action must be RESTRICT (r)');
  });

  it('Scenario 4: Same-named constraint with NOT VALID -> drops and replaces with validated constraint', async () => {
    const db = await createBaseDb();

    // Create fk_candidacies_person with NOT VALID
    await db.exec(`
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_person
        FOREIGN KEY (person_id) REFERENCES public.canonical_persons(id)
        ON DELETE RESTRICT NOT VALID;
    `);

    const initialFk = await getConstraintMeta(db, 'fk_candidacies_person');
    assert.strictEqual(initialFk.convalidated, false, 'Initial state must be unvalidated');

    // Run migration
    await db.exec(migrationSql);

    const replacedFk = await getConstraintMeta(db, 'fk_candidacies_person');
    assert(replacedFk);
    assert.strictEqual(replacedFk.convalidated, true, 'Replaced state must be convalidated = true');
    assert.strictEqual(replacedFk.confdeltype, 'r', 'Must be RESTRICT');
  });

  it('Scenario 5: All three constraints already valid -> preserves them without perturbation', async () => {
    const db = await createBaseDb();

    // Create valid constraints beforehand
    await db.exec(`
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_contest
        FOREIGN KEY (contest_id) REFERENCES public.election_contests(id)
        ON DELETE RESTRICT;
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_person
        FOREIGN KEY (person_id) REFERENCES public.canonical_persons(id)
        ON DELETE RESTRICT;
      ALTER TABLE public.candidacies
        ADD CONSTRAINT fk_candidacies_party
        FOREIGN KEY (party_id) REFERENCES public.political_organizations(id)
        ON DELETE RESTRICT;
    `);

    // Record initial OIDs
    const initialOids = await db.query(`
      SELECT conname, oid FROM pg_constraint
      WHERE conname IN ('fk_candidacies_contest', 'fk_candidacies_person', 'fk_candidacies_party')
        AND conrelid = 'public.candidacies'::regclass
      ORDER BY conname;
    `);

    // Run migration
    await db.exec(migrationSql);

    // Record post OIDs
    const postOids = await db.query(`
      SELECT conname, oid FROM pg_constraint
      WHERE conname IN ('fk_candidacies_contest', 'fk_candidacies_person', 'fk_candidacies_party')
        AND conrelid = 'public.candidacies'::regclass
      ORDER BY conname;
    `);

    // The OIDs should be identical because existing valid constraints are preserved!
    assert.deepStrictEqual(
      initialOids.rows.map(r => ({ name: r.conname, oid: r.oid })),
      postOids.rows.map(r => ({ name: r.conname, oid: r.oid })),
      'Existing valid constraints must be preserved with unchanged catalog OIDs'
    );
  });

  it('Scenario 6: Reapplication of migration -> idempotent execution without error', async () => {
    const db = await createBaseDb();

    // First execution
    await db.exec(migrationSql);

    // Second execution (reapplication)
    await assert.doesNotReject(
      async () => { await db.exec(migrationSql); },
      'Reapplication of Migration 069 must be completely idempotent and error-free'
    );

    // Verify constraints still present and valid
    const contestFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert.strictEqual(contestFk.confdeltype, 'r');
    assert.strictEqual(contestFk.convalidated, true);
  });

  it('Scenario 7: Full verification of local/referenced columns, target tables, confdeltype, convalidated, and indexes', async () => {
    const db = await createBaseDb();

    // Also add the redundant indexes to verify they get dropped
    await db.exec(`
      CREATE INDEX idx_candidacies_contest_fk ON public.candidacies(contest_id);
      CREATE INDEX idx_candidacies_person_fk ON public.candidacies(person_id);
      CREATE INDEX idx_candidacies_party_fk ON public.candidacies(party_id);
    `);

    // Run migration
    await db.exec(migrationSql);

    // Query all indexes on candidacies
    const indexRes = await db.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'candidacies' AND schemaname = 'public';
    `);
    const indexNames = indexRes.rows.map(r => r.indexname);

    // Redundant indexes dropped
    assert(!indexNames.includes('idx_candidacies_contest_fk'), 'Redundant idx_candidacies_contest_fk must be dropped');
    assert(!indexNames.includes('idx_candidacies_person_fk'), 'Redundant idx_candidacies_person_fk must be dropped');
    assert(!indexNames.includes('idx_candidacies_party_fk'), 'Redundant idx_candidacies_party_fk must be dropped');

    // Canonical indexes created
    assert(indexNames.includes('idx_candidacies_contest_id'), 'Canonical idx_candidacies_contest_id must exist');
    assert(indexNames.includes('idx_candidacies_person'), 'Canonical idx_candidacies_person must exist');
    assert(indexNames.includes('idx_candidacies_party'), 'Canonical idx_candidacies_party must exist');

    // Verify column mappings in pg_constraint
    const candidaciesCols = await db.query(`
      SELECT attname, attnum FROM pg_attribute
      WHERE attrelid = 'public.candidacies'::regclass AND attnum > 0;
    `);
    const contestCols = await db.query(`
      SELECT attname, attnum FROM pg_attribute
      WHERE attrelid = 'public.election_contests'::regclass AND attnum > 0;
    `);
    const personCols = await db.query(`
      SELECT attname, attnum FROM pg_attribute
      WHERE attrelid = 'public.canonical_persons'::regclass AND attnum > 0;
    `);
    const partyCols = await db.query(`
      SELECT attname, attnum FROM pg_attribute
      WHERE attrelid = 'public.political_organizations'::regclass AND attnum > 0;
    `);

    const colNum = (list, name) => list.rows.find(c => c.attname === name).attnum;

    const contestFk = await getConstraintMeta(db, 'fk_candidacies_contest');
    assert.deepStrictEqual(contestFk.conkey, [colNum(candidaciesCols, 'contest_id')]);
    assert.deepStrictEqual(contestFk.confkey, [colNum(contestCols, 'id')]);

    const personFk = await getConstraintMeta(db, 'fk_candidacies_person');
    assert.deepStrictEqual(personFk.conkey, [colNum(candidaciesCols, 'person_id')]);
    assert.deepStrictEqual(personFk.confkey, [colNum(personCols, 'id')]);

    const partyFk = await getConstraintMeta(db, 'fk_candidacies_party');
    assert.deepStrictEqual(partyFk.conkey, [colNum(candidaciesCols, 'party_id')]);
    assert.deepStrictEqual(partyFk.confkey, [colNum(partyCols, 'id')]);
  });
});

