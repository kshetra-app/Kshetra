import assert from 'assert';

/**
 * REGRESSION TEST: Database View DDL Parser
 * Purpose: Ensure regex accurately extracts view identifiers across all standard
 * PostgreSQL DDL variations, specifically preventing 'IF' false-positives caused by
 * 'IF NOT EXISTS' clauses.
 */

// Problematic Old Regex:
// Does not account for 'IF NOT EXISTS' after VIEW / MATERIALIZED VIEW
const oldRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+([a-zA-Z0-9_\."]+)/gi;

// Corrected New Regex:
// Explicitly handles optional (?:IF\s+NOT\s+EXISTS\s+)? before capturing the view name
export const viewParserRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\."]+)/gi;

export function extractViews(sql, regex = viewParserRegex) {
  const matches = sql.matchAll(regex);
  const views = [];
  for (const m of matches) {
    const raw = m[1].replace(/"/g, '').replace(/^public\./, '');
    views.push(raw);
  }
  return views;
}

console.log('=== RUNNING DATABASE VIEW PARSER REGRESSION TESTS ===\n');

// 1. Proving Old Regex Defect: MUST extract 'IF' under old regex
const testSqlExample = 'CREATE MATERIALIZED VIEW IF NOT EXISTS example AS SELECT 1;';
const oldResult = extractViews(testSqlExample, oldRegex);
console.log(`[TEST 1] Old parser on 'CREATE MATERIALIZED VIEW IF NOT EXISTS example': extracted [${oldResult.join(', ')}]`);
assert.strictEqual(oldResult[0], 'IF', "Old parser should have exhibited the known defect and extracted 'IF'");
console.log('  -> CONFIRMED: Old parser produced false positive object "IF".');

// 2. Testing New Regex on all standard DDL forms
const testCases = [
  {
    sql: 'CREATE VIEW simple_view AS SELECT 1;',
    expected: 'simple_view',
    label: 'Standard CREATE VIEW'
  },
  {
    sql: 'CREATE VIEW IF NOT EXISTS safe_view AS SELECT 1;',
    expected: 'safe_view',
    label: 'CREATE VIEW IF NOT EXISTS'
  },
  {
    sql: 'CREATE OR REPLACE VIEW replaced_view AS SELECT 1;',
    expected: 'replaced_view',
    label: 'CREATE OR REPLACE VIEW'
  },
  {
    sql: 'CREATE MATERIALIZED VIEW mat_view AS SELECT 1;',
    expected: 'mat_view',
    label: 'CREATE MATERIALIZED VIEW'
  },
  {
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS example AS SELECT 1;',
    expected: 'example',
    label: 'CREATE MATERIALIZED VIEW IF NOT EXISTS example'
  },
  {
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS constituency_sentiment_mv AS SELECT 1;',
    expected: 'constituency_sentiment_mv',
    label: 'Migration 007 real snippet'
  },
  {
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS mv_state_election_summary AS SELECT 1;',
    expected: 'mv_state_election_summary',
    label: 'Migration 020 real snippet 1'
  },
  {
    sql: 'CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_metrics AS SELECT 1;',
    expected: 'mv_platform_metrics',
    label: 'Migration 020 real snippet 2'
  },
  {
    sql: 'CREATE OR REPLACE VIEW "public"."quoted_view" AS SELECT 1;',
    expected: 'quoted_view',
    label: 'Quoted schema qualified view'
  }
];

let passed = 0;
for (const tc of testCases) {
  const result = extractViews(tc.sql, viewParserRegex);
  assert.strictEqual(result.length, 1, `Failed to match exactly 1 view in: ${tc.label}`);
  assert.strictEqual(result[0], tc.expected, `Expected '${tc.expected}', got '${result[0]}' in: ${tc.label}`);
  assert.notStrictEqual(result[0], 'IF', `Regressed: Result should NEVER be 'IF' in: ${tc.label}`);
  console.log(`[PASS] ${tc.label} -> extracted: '${result[0]}'`);
  passed++;
}

console.log(`\nAll ${passed} parser test cases passed successfully! Defect prevented.`);
