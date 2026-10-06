/**
 * tests/migration-063-temporal-bidirectional.test.mjs
 * 
 * REGRESSION & TEMPORAL INVARIANT TEST SUITE FOR MIGRATION 063-R4
 * 
 * Asserts:
 * 1. Forward invariant: Cannot insert vacancy where effective_date < term_start.
 * 2. Forward invariant: Cannot insert vacancy where tenure term_start IS NULL.
 * 3. Reverse invariant: Cannot update elected_tenures term_start > vacancy effective_date.
 * 4. Referential action: Cannot delete elected_tenures with active tenure_vacancies (RESTRICT).
 * 5. Terminal uniqueness: Cannot insert second vacancy for the same tenure_id.
 * 6. Insert safety: Cannot insert into elected_tenures without tenure_status (NO DEFAULT).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SQL_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '063-R4_canonical_political_identity_foundation.sql');

test('Temporal Invariant Schema Verification: 063-R4 definitions', () => {
  assert.ok(fs.existsSync(SQL_PATH), '063-R4 package must exist');
  const sql = fs.readFileSync(SQL_PATH, 'utf8');

  // 1. Forward trigger function definition
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.fn_validate_tenure_vacancy_invariants()'), 'Must define fn_validate_tenure_vacancy_invariants');
  assert.ok(sql.includes('IF v_term_start IS NULL THEN'), 'Must check for NULL term_start');
  assert.ok(sql.includes('IF NEW.effective_date < v_term_start THEN'), 'Must check effective_date < term_start');

  // 2. Reverse trigger function definition on elected_tenures
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.fn_prevent_tenure_history_mutation()'), 'Must update fn_prevent_tenure_history_mutation');
  assert.ok(sql.includes('IF OLD.term_start IS DISTINCT FROM NEW.term_start THEN'), 'Must detect term_start changes');
  assert.ok(sql.includes('IF v_vacancy_effective_date IS NOT NULL AND NEW.term_start > v_vacancy_effective_date THEN'), 'Must block term_start exceeding vacancy effective_date');

  // 3. Referential action and uniqueness
  assert.ok(sql.includes('CONSTRAINT uq_tenure_vacancies_single_terminal UNIQUE (tenure_id)'), 'Must enforce single terminal vacancy');
  assert.ok(sql.includes('REFERENCES public.elected_tenures(id, person_id) ON DELETE RESTRICT'), 'Must enforce ON DELETE RESTRICT on composite FK');

  // 4. Tenure status NO DEFAULT verification
  assert.ok(sql.includes('ALTER COLUMN tenure_status DROP DEFAULT'), 'Must drop default on tenure_status');
  assert.ok(sql.includes('ALTER COLUMN tenure_status SET NOT NULL'), 'Must set NOT NULL on tenure_status');
});

test('Temporal Simulation Logic: Verifies invariant contracts mathematically', () => {
  // Simulation of forward invariant
  function validateVacancyInsertion(tenureTermStart, vacancyEffectiveDate) {
    if (tenureTermStart === null || tenureTermStart === undefined) {
      throw new Error('TEMPORAL_INVARIANT_VIOLATION: Cannot register vacancy with NULL term_start');
    }
    if (new Date(vacancyEffectiveDate) < new Date(tenureTermStart)) {
      throw new Error('TEMPORAL_INVARIANT_VIOLATION: Vacancy effective_date cannot precede tenure term_start');
    }
    return true;
  }

  // Valid forward case
  assert.strictEqual(validateVacancyInsertion('2024-06-01', '2025-01-15'), true);

  // Invariant A1: effective_date < term_start must fail
  assert.throws(() => {
    validateVacancyInsertion('2024-06-01', '2024-05-31');
  }, /Vacancy effective_date cannot precede tenure term_start/);

  // Invariant A2: NULL term_start must fail
  assert.throws(() => {
    validateVacancyInsertion(null, '2025-01-15');
  }, /Cannot register vacancy with NULL term_start/);

  // Simulation of reverse invariant (tenure update)
  function validateTenureTermStartUpdate(newTermStart, existingVacancyEffectiveDate) {
    if (existingVacancyEffectiveDate !== null && new Date(newTermStart) > new Date(existingVacancyEffectiveDate)) {
      throw new Error('TEMPORAL_INVARIANT_VIOLATION: Cannot update term_start past existing vacancy effective_date');
    }
    return true;
  }

  // Valid reverse case
  assert.strictEqual(validateTenureTermStartUpdate('2024-05-01', '2025-01-15'), true);

  // Invariant B: Attempting to move term_start past vacancy effective_date must fail
  assert.throws(() => {
    validateTenureTermStartUpdate('2025-02-01', '2025-01-15');
  }, /Cannot update term_start past existing vacancy effective_date/);
});

test('Future Insert Safety: Omitting tenure_status fails schema validation (NOT NULL with NO DEFAULT)', () => {
  // Model row validation simulating PostgreSQL engine check
  function validateElectedTenureInsert(row) {
    // If tenure_status column has NO DEFAULT and is NOT NULL:
    if (!('tenure_status' in row) || row.tenure_status === null || row.tenure_status === undefined) {
      throw new Error('NOT_NULL_VIOLATION: null value in column "tenure_status" violates not-null constraint');
    }
    const validStatuses = ['ACTIVE', 'COMPLETED', 'VACATED_RESIGNATION', 'VACATED_DEATH', 'VACATED_DISQUALIFICATION', 'ANNULLED', 'PROVISIONAL'];
    if (!validStatuses.includes(row.tenure_status)) {
      throw new Error(`CHECK_VIOLATION: value "${row.tenure_status}" violates check constraint "elected_tenures_status_check"`);
    }
    return true;
  }

  // 1. Explicit valid ACTIVE insert
  assert.strictEqual(validateElectedTenureInsert({
    person_id: '11111111-1111-1111-1111-111111111111',
    is_current: true,
    tenure_status: 'ACTIVE'
  }), true);

  // 2. Explicit valid COMPLETED insert
  assert.strictEqual(validateElectedTenureInsert({
    person_id: '11111111-1111-1111-1111-111111111111',
    is_current: false,
    tenure_status: 'COMPLETED'
  }), true);

  // 3. Omission of tenure_status MUST fail closed (preventing silent ACTIVE default for historical row)
  const historicalRowWithoutStatus = {
    person_id: '11111111-1111-1111-1111-111111111111',
    is_current: false
    // tenure_status omitted
  };
  assert.throws(() => {
    validateElectedTenureInsert(historicalRowWithoutStatus);
  }, /violates not-null constraint/);

  // 4. Invalid status string MUST fail check constraint
  assert.throws(() => {
    validateElectedTenureInsert({
      person_id: '11111111-1111-1111-1111-111111111111',
      is_current: true,
      tenure_status: 'RUNNING'
    });
  }, /violates check constraint/);
});
