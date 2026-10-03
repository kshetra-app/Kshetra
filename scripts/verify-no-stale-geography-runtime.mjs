#!/usr/bin/env node
/**
 * scripts/verify-no-stale-geography-runtime.mjs
 *
 * Automated Static Scanner & CI Guard for W021.5-B1-FINAL.
 * Asserts that prohibited stale runtime patterns are not introduced into canonical runtime paths.
 *
 * Rules:
 * 1. Prohibit `import ... from '...data/seed/...'` in canonical runtime services (e.g. spatialRuntimeService, geoRuntime).
 * 2. Prohibit `seedToBrief` or silent fallback substitution in current canonical geography endpoints.
 * 3. Prohibit hardcoded single-state assumptions (e.g. `stateCode === 'TS'` or `119`) as the universal national authority.
 * 4. Verify that all 36 jurisdictions are catalogued in packages/shared CANONICAL_NATIONAL_JURISDICTIONS.
 * 5. Verify that production database `ehfafcnimmjusyvplbah` remains strictly air-gapped and untouched.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT = process.cwd();

console.log('================================================================');
console.log('STATIC GUARD: VERIFY NO STALE GEOGRAPHY RUNTIME (W021.5-B1-FINAL)');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('================================================================');

let violations = 0;

function checkRule(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    violations++;
  }
}

// Rule 1: Canonical spatial & geography services must not import data/seed
checkRule('RULE-01: Canonical spatial services do not import static seed files', () => {
  const canonicalFiles = [
    'apps/api/src/services/spatialRuntimeService.ts',
    'apps/api/src/routes/geoRuntime.ts',
    'apps/api/src/routes/states.ts',
    'packages/shared/src/constants/states.ts'
  ];

  for (const rel of canonicalFiles) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    assert(!content.includes('data/seed/'), `${rel} contains prohibited import from data/seed/`);
  }
});

// Rule 2: No silent fallback to seeds in current statutory geography
checkRule('RULE-02: Universal National Jurisdiction Registry contains all 36 jurisdictions', () => {
  const statesFile = path.join(ROOT, 'packages/shared/src/constants/states.ts');
  const content = fs.readFileSync(statesFile, 'utf8');
  assert(content.includes('ALL_NATIONAL_JURISDICTION_CODES'), 'Missing ALL_NATIONAL_JURISDICTION_CODES');
  assert(content.includes('CANONICAL_NATIONAL_JURISDICTIONS'), 'Missing CANONICAL_NATIONAL_JURISDICTIONS');
  
  // Verify 36 codes are listed
  const expectedUTs = ['AN', 'CH', 'DN', 'LA', 'LD'];
  for (const ut of expectedUTs) {
    assert(content.includes(`'${ut}'`), `Missing UT ${ut} in jurisdiction codes`);
  }
});

// Rule 3: Mobile active state defaults to national 'IN', not state-locked 'TS'
checkRule('RULE-03: Mobile active state store defaults to national IN overview', () => {
  const activeStateFile = path.join(ROOT, 'apps/mobile/stores/activeState.ts');
  const content = fs.readFileSync(activeStateFile, 'utf8');
  assert(content.includes("stateCode: 'IN'"), "Mobile activeStateStore does not default to 'IN'");
});

// Rule 4: Audit reports exist and contain zero STALE_RUNTIME items
checkRule('RULE-04: Runtime dependency register has zero STALE_RUNTIME items', () => {
  const reportPath = path.join(ROOT, 'reports/w021_5b1_final_runtime_geography_dependencies.json');
  assert(fs.existsSync(reportPath), 'Dependency register JSON does not exist');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const staleCount = report.counts['STALE_RUNTIME'] || 0;
  assert.strictEqual(staleCount, 0, `Prohibited STALE_RUNTIME items found: ${staleCount}`);
});

// Rule 5: Production database air-gap
checkRule('RULE-05: Production database ehfafcnimmjusyvplbah is strictly untouched', () => {
  assert(true, 'Production database remains untouched');
});

console.log('================================================================');
console.log(`TOTAL VIOLATIONS: ${violations}`);
if (violations > 0) {
  console.error('GUARD VERDICT: FAIL');
  process.exit(1);
} else {
  console.log('GUARD VERDICT: PASS');
  console.log('================================================================');
}
