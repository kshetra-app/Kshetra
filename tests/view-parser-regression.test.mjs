import assert from 'assert';
// DIRECT IMPORT of the actual production parser implementation from scripts/reconcile-w000.mjs
import { parseDatabaseViews, VIEW_REGEX } from '../scripts/reconcile-w000.mjs';

/**
 * REGRESSION TEST: Database View DDL Parser
 * Purpose: Ensure scripts/reconcile-w000.mjs accurately extracts view identifiers
 * across all standard PostgreSQL DDL variations, specifically preventing 'IF'
 * false-positives caused by 'IF NOT EXISTS' clauses.
 */

console.log('=== RUNNING PRODUCTION DATABASE VIEW PARSER REGRESSION TESTS ===\n');

// 1. NEGATIVE REGRESSION PROOF:
// Demonstrate that the unpatched legacy regex extracts 'IF' and would fail assertions.
const brokenLegacyRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+([a-zA-Z0-9_\."]+)/gi;
const snippet = 'CREATE MATERIALIZED VIEW IF NOT EXISTS example AS SELECT 1;';
const legacyMatch = snippet.matchAll(brokenLegacyRegex);
let legacyCaptured = null;
for (const m of legacyMatch) {
  legacyCaptured = m[1].replace(/"/g, '').replace(/^public\./, '');
}

console.log(`[NEGATIVE REGRESSION TEST] Evaluating unpatched legacy regex on: '${snippet}'`);
console.log(`  -> Unpatched regex extracted: '${legacyCaptured}'`);
assert.strictEqual(legacyCaptured, 'IF', "Broken regex must capture 'IF' on IF NOT EXISTS clause");
console.log('  -> CONFIRMED: Broken parser behavior extracts "IF". Testing production parser next.\n');

// 2. EXHAUSTIVE TEST OF PRODUCTION PARSER (Imported from scripts/reconcile-w000.mjs)
const testCases = [
  {
    id: 1,
    sql: 'CREATE VIEW simple_view AS SELECT 1;',
    expected: 'simple_view',
    label: '1. CREATE VIEW'
  },
  {
    id: 2,
    sql: 'CREATE VIEW IF NOT EXISTS safe_view AS SELECT 1;',
    expected: 'safe_view',
    label: '2. CREATE VIEW IF NOT EXISTS'
  },
  {
    id: 3,
    sql: 'CREATE OR REPLACE VIEW replaced_view AS SELECT 1;',
    expected: 'replaced_view',
    label: '3. CREATE OR REPLACE VIEW'
  },
  {
    id: 4,
    sql: 'CREATE MATERIALIZED VIEW mat_view AS SELECT 1;',
    expected: 'mat_view',
    label: '4. CREATE MATERIALIZED VIEW'
  },
  {
    id: 5,
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS example AS SELECT 1;',
    expected: 'example',
    label: '5. CREATE MATERIALIZED VIEW IF NOT EXISTS'
  },
  {
    id: 6,
    sql: 'CREATE OR REPLACE VIEW "quoted_view" AS SELECT 1;',
    expected: 'quoted_view',
    label: '6. quoted identifier'
  },
  {
    id: 7,
    sql: 'CREATE VIEW "public"."schema_qualified_view" AS SELECT 1;',
    expected: 'schema_qualified_view',
    label: '7. schema-qualified identifier'
  },
  {
    id: 8,
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS constituency_sentiment_mv AS SELECT state_code, ac_no FROM civic_issues;',
    expected: 'constituency_sentiment_mv',
    label: '8. Migration 007 real snippet'
  },
  {
    id: 9,
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS mv_state_election_summary AS SELECT state_code, count(*) FROM election_results;',
    expected: 'mv_state_election_summary',
    label: '9. Migration 020 real snippet'
  },
  {
    id: 10,
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_metrics AS SELECT count(*) FROM user_profiles;',
    expected: 'mv_platform_metrics',
    label: '10. Migration 020 second materialized-view snippet'
  }
];

let passCount = 0;
for (const tc of testCases) {
  // Execute the REAL production parser
  const extracted = parseDatabaseViews(tc.sql);
  
  assert.strictEqual(extracted.length, 1, `Failed to extract exactly 1 view in case ${tc.id}: ${tc.label}`);
  assert.strictEqual(extracted[0], tc.expected, `Expected '${tc.expected}', got '${extracted[0]}' in case ${tc.id}`);
  assert.notStrictEqual(extracted[0], 'IF', `Regressed: Result should NEVER be 'IF' in case ${tc.id}`);
  
  console.log(`[PASS] Case ${tc.id} (${tc.label}) -> extracted: '${extracted[0]}'`);
  passCount++;
}

// 3. MULTI-STATEMENT FULL SCRIPT TEST
console.log('\n[MULTI-STATEMENT TEST] Executing parseDatabaseViews on combined DDL script...');
const multiDdl = testCases.map(tc => tc.sql).join('\n');
const allExtracted = parseDatabaseViews(multiDdl);
assert.strictEqual(allExtracted.length, 10, 'Expected all 10 views to be extracted from multi-line DDL');
assert.strictEqual(allExtracted.includes('IF'), false, "'IF' must never appear in extracted views");
console.log(`[PASS] Multi-statement extracted 10/10 views with zero 'IF' false-positives.`);

console.log(`\n======================================================`);
console.log(`ALL 10 MANDATORY PARSER REGRESSION TESTS PASSED!`);
console.log(`Production parser in scripts/reconcile-w000.mjs is verified.`);
console.log(`======================================================\n`);
