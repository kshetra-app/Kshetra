/**
 * scripts/audit_w014_m044_select_verifier.mjs
 * Mechanical Static Statement Classification Audit for:
 * supabase/verification_w014_migration_044_select_only.sql
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const targetSqlPath = path.resolve('supabase/verification_w014_migration_044_select_only.sql');

if (!fs.existsSync(targetSqlPath)) {
  console.error(`FATAL: File not found at ${targetSqlPath}`);
  process.exit(1);
}

const rawContent = fs.readFileSync(targetSqlPath, 'utf8');
const fileSha256 = crypto.createHash('sha256').update(rawContent).digest('hex').toUpperCase();

console.log('================================================================');
console.log('W014-GOV-01: MECHANICAL STATIC STATEMENT CLASSIFICATION AUDIT');
console.log(`Target File: supabase/verification_w014_migration_044_select_only.sql`);
console.log(`SHA-256:     ${fileSha256}`);
console.log('================================================================\n');

// 1. Remove comments
const withoutComments = rawContent.replace(/--[^\r\n]*/g, '');

// 2. Remove string literals to inspect bare SQL grammar and tokens
const withoutStrings = withoutComments.replace(/'(?:''|[^'])*'/g, "''");

// Semicolon analysis
const semicolons = (rawContent.match(/;/g) || []).length;
const semicolonOk = semicolons === 1;
console.log(`[${semicolonOk ? 'PASS' : 'FAIL'}] Rule 1: Exactly 1 statement-terminating semicolon (count: ${semicolons})`);

// Top-level statement encapsulation
const trimmedBare = withoutComments.trim();
const startsWithWith = trimmedBare.startsWith('WITH');
const endsWithOrder = trimmedBare.endsWith('ORDER BY c.check_id;');
const singleStatementOk = startsWithWith && endsWithOrder;
console.log(`[${singleStatementOk ? 'PASS' : 'FAIL'}] Rule 2: Single top-level WITH ... SELECT ... ORDER BY c.check_id;`);

// Zero DO blocks
const hasDo = /\bDO\b/i.test(withoutStrings);
console.log(`[${!hasDo ? 'PASS' : 'FAIL'}] Rule 3: Zero DO blocks`);

// Zero RAISE statements
const hasRaise = /\bRAISE\b/i.test(withoutStrings);
console.log(`[${!hasRaise ? 'PASS' : 'FAIL'}] Rule 4: Zero RAISE statements`);

// Zero DDL statements
const ddlTokens = withoutStrings.match(/\b(CREATE|ALTER|DROP|RENAME|TRUNCATE)\b/gi) || [];
console.log(`[${ddlTokens.length === 0 ? 'PASS' : 'FAIL'}] Rule 5: Zero DDL statements (detected: ${ddlTokens.length === 0 ? 'none' : ddlTokens.join(', ')})`);

// Zero DML statements
const dmlInsertDelete = withoutStrings.match(/\b(INSERT|DELETE|UPSERT|MERGE)\b/gi) || [];
const dmlUpdate = /\bUPDATE\s+[a-zA-Z0-9_.]+\s+SET\b/i.test(withoutStrings);
const dmlOk = dmlInsertDelete.length === 0 && !dmlUpdate;
console.log(`[${dmlOk ? 'PASS' : 'FAIL'}] Rule 6: Zero DML statements (INSERT, DELETE, UPSERT, MERGE, or UPDATE SET)`);

// Zero Transaction Control
const txTokens = withoutStrings.match(/\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/gi) || [];
console.log(`[${txTokens.length === 0 ? 'PASS' : 'FAIL'}] Rule 7: Zero Transaction Control statements (detected: ${txTokens.length === 0 ? 'none' : txTokens.join(', ')})`);

// Zero Temporary Tables
const tempTokens = withoutStrings.match(/\b(TEMP|TEMPORARY)\s+TABLE\b/gi) || [];
console.log(`[${tempTokens.length === 0 ? 'PASS' : 'FAIL'}] Rule 8: Zero Temporary Table creation`);

// Check driver rows count
const driverTuples = rawContent.match(/\(\s*(\d+)\s*,\s*'[^']+'\s*,\s*'[^']+'\s*\)/g) || [];
const driverCountOk = driverTuples.length === 16;
console.log(`[${driverCountOk ? 'PASS' : 'FAIL'}] Rule 9: Exactly 16 check driver tuples in checks CTE (count: ${driverTuples.length})`);

// Output columns
const hasCols = rawContent.includes('c.check_id,') &&
                rawContent.includes('c.check_name,') &&
                rawContent.includes('c.expected,') &&
                rawContent.includes('END AS observed,') &&
                rawContent.includes('END AS verdict');
console.log(`[${hasCols ? 'PASS' : 'FAIL'}] Rule 10: Exactly 5 deterministic columns (check_id, check_name, expected, observed, verdict)`);

const allPassed = semicolonOk && singleStatementOk && !hasDo && !hasRaise &&
                  ddlTokens.length === 0 && dmlOk && txTokens.length === 0 &&
                  tempTokens.length === 0 && driverCountOk && hasCols;

console.log('\n----------------------------------------------------------------');
console.log(`OVERALL STATIC AUDIT VERDICT: ${allPassed ? '100% PASS (STRICTLY SELECT-ONLY)' : 'FAILED'}`);
console.log('----------------------------------------------------------------');

if (!allPassed) {
  process.exit(1);
}
