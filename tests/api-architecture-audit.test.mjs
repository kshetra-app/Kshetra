import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== RUNNING W006 API ARCHITECTURE & SEPARATION AUDIT TEST ===\n');

const auditReportPath = path.resolve('reports/w006_api_architecture_audit.json');
assert.ok(fs.existsSync(auditReportPath), 'reports/w006_api_architecture_audit.json must exist');

const report = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));

// CHECK 1: Evidence Metadata
assert.strictEqual(report.evidenceMetadata.jobId, 'W006');
assert.ok(report.evidenceMetadata.timestamp, 'Timestamp must exist');
console.log('[PASS] Check 1: Evidence metadata verified.');

// CHECK 2: Ground-truth caller counts
const { callers, auditSummary } = report;
assert.strictEqual(auditSummary.baselineDirectSupabaseCallersCount, 12, 'Must match 12 baseline direct Supabase callers from W000');
assert.strictEqual(callers.baselineDirectSupabaseCallers.length, 12);
assert.ok(callers.directSupabaseTableCallers.length >= 7, 'Must audit direct table .from() callers');
assert.ok(auditSummary.railwayApiCallerFilesCount >= 11, 'Must audit Railway API callers (at least 11 baseline)');
assert.ok(auditSummary.localFallbackFilesCount >= 15, 'Must audit local fallback/mock callers (at least 15 baseline)');
console.log(`[PASS] Check 2: Ground-truth caller counts verified (12 Supabase callers, ${auditSummary.railwayApiCallerFilesCount} Railway callers, ${auditSummary.localFallbackFilesCount} fallback files).`);

// CHECK 3: 85 Methods in supabaseDataService Classified
const { dataServiceClassification } = report;
assert.strictEqual(dataServiceClassification.totalMethods, 85, 'Must classify all 85 methods in supabaseDataService.ts');
assert.strictEqual(dataServiceClassification.classCounts.CLASS_A_READ_RLS_GOVERNED, 22, 'Class A reads count must be 22');
assert.strictEqual(dataServiceClassification.classCounts.CLASS_B_CLIENT_WRITE_STRANGLER_TARGET, 57, 'Class B mutations count must be 57');
assert.strictEqual(dataServiceClassification.classCounts.CLASS_C_ALREADY_FASTIFY_ROUTED, 6, 'Class C Fastify routed count must be 6');
console.log('[PASS] Check 3: All 85 data service methods classified (22 Class A reads, 57 Class B mutation strangler targets, 6 Class C Fastify routed).');

// CHECK 4: Fastify Route Inventory Completeness
assert.ok(auditSummary.totalRegisteredFastifyRoutes >= 111, 'Must inventory at least 111 Fastify route registrations');
assert.ok(auditSummary.totalFastifyRouteModules >= 21, 'Must inventory all Fastify route modules');
console.log(`[PASS] Check 4: Fastify route inventory complete (${auditSummary.totalRegisteredFastifyRoutes} unique routes across ${auditSummary.totalFastifyRouteModules} modules).`);

// CHECK 5: Strangler Migration Plan Phases
const { strangulationMigrationPlan } = report;
assert.ok(Array.isArray(strangulationMigrationPlan) && strangulationMigrationPlan.length >= 4, 'Must define at least 4 strangler migration phases');
const phase1 = strangulationMigrationPlan.find(p => p.phase.includes('Phase 1'));
assert.ok(phase1 && phase1.canonicalFastifyEndpoints.length > 0, 'Phase 1 high-risk civic/moderation mutations must have target endpoints');
console.log('[PASS] Check 5: Strangler migration phases and endpoint targets verified.');

console.log('\n===============================================================');
console.log('   ALL W006 API ARCHITECTURE AUDIT CHECKS PASSED 100%!   ');
console.log('===============================================================\n');
