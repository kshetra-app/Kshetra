import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { execSync } from 'child_process';

console.log('=== KSHETRA W008 REVISION 7: THREE-WAY RECONCILIATION & SCOPE INTEGRITY TEST ===\n');

// ============================================================================
// FINDING 4: SOURCE-BASELINE PROVENANCE VERIFICATION
// Establish that scanned product source corresponds exactly to pinned baseline 81ad5b5
// ============================================================================
console.log('1. Verifying source baseline provenance against pinned coordinate 81ad5b5...');

const EXPECTED_BASELINE_COMMIT = '81ad5b5da49c49524427f64bb4595c473237c573';
let currentHead = '';
try {
  currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (err) {
  console.error('FAIL CLOSED: Unable to determine git HEAD.');
  process.exit(1);
}

// Verify that the current tree is either at the baseline commit OR is a governance commit directly descending from baseline with ZERO product code changes
if (currentHead === EXPECTED_BASELINE_COMMIT) {
  console.log(`   [PASS] Current HEAD matches pinned baseline commit: ${currentHead}`);
} else {
  // Check that EXPECTED_BASELINE_COMMIT is an ancestor of currentHead
  try {
    const isAncestor = execSync(`git merge-base --is-ancestor "${EXPECTED_BASELINE_COMMIT}" "${currentHead}" && echo YES`, { encoding: 'utf8' }).trim();
    assert.strictEqual(isAncestor, 'YES', `Expected baseline ${EXPECTED_BASELINE_COMMIT} must be an ancestor of HEAD ${currentHead}`);
  } catch (err) {
    console.error(`FAIL CLOSED: Pinned baseline ${EXPECTED_BASELINE_COMMIT} is NOT in the ancestry of HEAD (${currentHead})!`);
    process.exit(1);
  }

  // Verify that ZERO product code has changed between EXPECTED_BASELINE_COMMIT and currentHead
  const productDiff = execSync(`git diff --name-only "${EXPECTED_BASELINE_COMMIT}" "${currentHead}" -- apps/ packages/ supabase/`, { encoding: 'utf8' }).trim();
  if (productDiff.length > 0) {
    console.error(`FAIL CLOSED: Product code was modified between baseline ${EXPECTED_BASELINE_COMMIT} and HEAD ${currentHead}:\n${productDiff}`);
    process.exit(1);
  }
  console.log(`   [PASS] Pinned baseline ${EXPECTED_BASELINE_COMMIT.slice(0, 7)} is proven ancestor of HEAD (${currentHead.slice(0, 7)}), with 0 product code modifications.`);
}

// Check uncommitted product code modifications in working tree
const workingTreeProductDiff = execSync('git diff --name-only HEAD -- apps/ packages/ supabase/', { encoding: 'utf8' }).trim();
if (workingTreeProductDiff.length > 0) {
  console.error(`FAIL CLOSED: Uncommitted product code modifications detected in working tree:\n${workingTreeProductDiff}`);
  process.exit(1);
}
console.log('   [PASS] Working tree contains 0 uncommitted product code modifications.');

// ============================================================================
// FINDING 5: SEPARATE DIRECT SOURCE REGISTRATIONS FROM DERIVED MOUNTED-PREFIX ROUTES
// Discover direct route registrations and deterministically derive mounted-prefix routes from server.ts
// ============================================================================
console.log('\n2. Discovering direct Fastify route registrations and deriving mounted-prefix routes...');

const directRegistrations = [];
function scanDirectRoutes(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);

  // Match app.METHOD('path', [options], handler)
  const routeBlockRegex = /(?:app|fastify)\.(get|post|put|delete|patch|options|head)(?:<[\s\S]*?>)?\s*\(\s*['"`]([^'"`]+)['"`]([\s\S]*?)(?:async\s*\(|\basync\s+function|\(\s*request|\(\s*req|\(request,)/gi;
  let blockMatch;
  while ((blockMatch = routeBlockRegex.exec(content)) !== null) {
    const method = blockMatch[1].toUpperCase();
    const routePath = blockMatch[2];
    const optionsSnippet = blockMatch[3] || '';
    const hasSchema = optionsSnippet.includes('schema:') || optionsSnippet.includes('schema :') || optionsSnippet.includes('getFlagsSchema') || optionsSnippet.includes('newsFeedSchema') || optionsSnippet.includes('listStatesSchema') || optionsSnippet.includes('getStateSchema');
    const hasPreValidation = optionsSnippet.includes('preValidation:');

    let phase = 'Phase 2-4';
    if (routePath.includes('/health') || routePath.includes('/metrics') || routePath.includes('/debug')) {
      phase = 'System & Diagnostics';
    } else if (routePath.includes('/config/flags') || routePath.includes('/pages/') || routePath.includes('/news/feed')) {
      phase = 'Pioneer (W007/W008)';
    } else if (routePath.includes('/states') || routePath.includes('/moderation') || routePath.includes('/civic')) {
      phase = 'Phase 1 (Standardized)';
    }

    directRegistrations.push({
      registrationType: 'DIRECT_SOURCE_REGISTRATION',
      method,
      path: routePath,
      file: filename,
      sourceFile: filePath.replace(/\\/g, '/'),
      phase,
      schemaDefined: hasSchema,
      preValidationDefined: hasPreValidation,
      standardizedEnvelope: hasSchema || hasPreValidation || phase === 'System & Diagnostics',
    });
  }
}

const serverFilePath = path.resolve('apps/api/src/server.ts');
const apiRoutesDir = path.resolve('apps/api/src/routes');

scanDirectRoutes(serverFilePath);
if (fs.existsSync(apiRoutesDir)) {
  fs.readdirSync(apiRoutesDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .sort()
    .forEach(f => scanDirectRoutes(path.join(apiRoutesDir, f)));
}

console.log(`   Direct source scan discovered ${directRegistrations.length} route registrations.`);
assert.strictEqual(directRegistrations.length, 135, 'Direct source scan must discover exactly 135 registrations');

// Deterministically parse server.ts to extract mounted prefix registrations
const serverContent = fs.readFileSync(serverFilePath, 'utf8');
const mountedPrefixRegistrations = [];

// Match: await app.register(pluginFunction, { prefix: '/prefix' })
const prefixRegisterRegex = /(?:await\s+)?(?:app|fastify)\.register\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*\{\s*prefix:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g;
let prefixMatch;
const mountedPlugins = [];
while ((prefixMatch = prefixRegisterRegex.exec(serverContent)) !== null) {
  mountedPlugins.push({
    pluginName: prefixMatch[1],
    prefix: prefixMatch[2]
  });
}

// Verify that healthRoutes is mounted with prefix '/api' in server.ts
const healthMount = mountedPlugins.find(p => p.pluginName === 'healthRoutes');
assert.ok(healthMount, 'server.ts must contain registration of healthRoutes with a prefix');
assert.strictEqual(healthMount.prefix, '/api', 'healthRoutes in server.ts must be mounted with prefix /api');

// Deterministically derive mounted prefix routes from routes defined inside health.ts
const healthDirect = directRegistrations.filter(r => r.file === 'health.ts');
assert.strictEqual(healthDirect.length, 3, 'health.ts must contain 3 direct route definitions (/health, /health/db, /health/ready)');

for (const hdr of healthDirect) {
  const derivedPath = healthMount.prefix + hdr.path; // e.g. '/api' + '/health' = '/api/health'
  mountedPrefixRegistrations.push({
    registrationType: 'DERIVED_MOUNTED_PREFIX_ROUTE',
    method: hdr.method,
    path: derivedPath,
    file: 'health.ts',
    sourceFile: 'apps/api/src/routes/health.ts',
    phase: hdr.phase,
    schemaDefined: hdr.schemaDefined,
    preValidationDefined: hdr.preValidationDefined,
    standardizedEnvelope: hdr.standardizedEnvelope,
    derivedFromPrefix: healthMount.prefix,
    originalPath: hdr.path
  });
}

console.log(`   Deterministically derived ${mountedPrefixRegistrations.length} mounted-prefix routes from server.ts (prefix: '${healthMount.prefix}'):`);
mountedPrefixRegistrations.forEach(r => console.log(`     - [DERIVED] ${r.method} ${r.path} (from ${r.file} ${r.originalPath})`));

const fullInventory = [...directRegistrations, ...mountedPrefixRegistrations];
assert.strictEqual(fullInventory.length, 138, 'Total Fastify registrations (135 direct + 3 derived) must equal exactly 138');
console.log(`   [PASS] Total Fastify route catalog verified: ${fullInventory.length} (135 direct registrations + 3 derived prefix routes).`);

// ============================================================================
// LOAD MASTER 138 LEDGER & VERIFY EQUALITY WITH SOURCE
// ============================================================================
console.log('\n3. Comparing discovered catalog against scratch/master_138_ledger.json...');
const ledgerPath = path.resolve('scratch/master_138_ledger.json');
assert.ok(fs.existsSync(ledgerPath), 'scratch/master_138_ledger.json must exist');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

console.log(`   Loaded master route ledger: ${ledger.length} records.`);
assert.strictEqual(ledger.length, 138, 'Master ledger must contain exactly 138 records');

function getCanonicalIdentity(r) {
  let extra = '';
  if (r.path === '/health' && (r.module === 'server' || r.file === 'server.ts')) extra = ' (server.ts root probe)';
  if (r.path === '/health' && (r.module === 'health' || r.file === 'health.ts')) extra = ' (health.ts prefix alias)';
  return `${r.method} ${r.path}${extra}`;
}

const sourceIdentities = fullInventory.map(r => getCanonicalIdentity(r)).sort();
const ledgerIdentities = ledger.map(r => getCanonicalIdentity(r)).sort();

assert.deepStrictEqual(sourceIdentities, ledgerIdentities, 'SOURCE_DISCOVERY must equal MASTER_LEDGER bitwise');
console.log('   [PASS] SOURCE_DISCOVERY == MASTER_LEDGER (Zero omissions, zero additions, exact identity equality).');

// ============================================================================
// FINDING 2 & 3: VALIDATE SUB-JOB OWNERSHIP, DISJOINTNESS & D VERIFICATION SEMANTICS
// ============================================================================
console.log('\n4. Validating B/C/E Implementation Ownership and W008-D Verification Semantics...');

const manifestsPath = path.resolve('scratch/manifests_rev7.json');
assert.ok(fs.existsSync(manifestsPath), 'scratch/manifests_rev7.json must exist');
const manifests = JSON.parse(fs.readFileSync(manifestsPath, 'utf8'));

// 1. W008-D modificationScope === []
assert.deepStrictEqual(manifests['W008-D'].modificationScope, [], 'FAIL CLOSED: W008-D modificationScope must be []');
console.log('   [PASS] 1. W008-D modificationScope === [] (Verification-Only proven).');

// 2. W008-D inScopeRoutes === []
assert.deepStrictEqual(manifests['W008-D'].inScopeRoutes, [], 'FAIL CLOSED: W008-D inScopeRoutes must be []');
console.log('   [PASS] 2. W008-D inScopeRoutes === [] (Zero implementation route ownership).');

// 3. W008-D verificationTargetRoutes explicitly declared separately
const expectedVerificationTargets = [
  'GET /api/v1/states',
  'GET /api/v1/states/:code'
];
assert.ok(Array.isArray(manifests['W008-D'].verificationTargetRoutes), 'FAIL CLOSED: W008-D verificationTargetRoutes must be an array');
assert.deepStrictEqual(manifests['W008-D'].verificationTargetRoutes.sort(), expectedVerificationTargets.sort(), 'FAIL CLOSED: W008-D verificationTargetRoutes mismatch');
console.log('   [PASS] 3. W008-D verificationTargetRoutes explicitly declared separately (2 targets).');

// 4. W008-A inScopeRoutes === []
assert.deepStrictEqual(manifests['W008-A'].inScopeRoutes, [], 'FAIL CLOSED: W008-A inScopeRoutes must be []');

// 5. Check implementation ownership distribution across B, C, E
const ledgerB = ledger.filter(r => r.subJob === 'W008-B').map(r => getCanonicalIdentity(r)).sort();
const ledgerC = ledger.filter(r => r.subJob === 'W008-C').map(r => getCanonicalIdentity(r)).sort();
const ledgerE = ledger.filter(r => r.subJob === 'W008-E').map(r => getCanonicalIdentity(r)).sort();

console.log(`   Implementation ownership distribution: W008-B=${ledgerB.length}, W008-C=${ledgerC.length}, W008-E=${ledgerE.length}`);
assert.strictEqual(ledgerB.length, 3, 'W008-B ledger routes must be 3');
assert.strictEqual(ledgerC.length, 27, 'W008-C ledger routes must be 27');
assert.strictEqual(ledgerE.length, 108, 'W008-E ledger routes must be 108');
assert.strictEqual(ledgerB.length + ledgerC.length + ledgerE.length, 138, 'Ledger B+C+E sum must be exactly 138');

// 6. Pairwise disjointness of implementation ownership
const setB = new Set(ledgerB);
const setC = new Set(ledgerC);
const setE = new Set(ledgerE);

const b_intersect_c = ledgerB.filter(x => setC.has(x));
const b_intersect_e = ledgerB.filter(x => setE.has(x));
const c_intersect_e = ledgerC.filter(x => setE.has(x));

assert.strictEqual(b_intersect_c.length, 0, 'FAIL CLOSED: B ∩ C must be empty');
assert.strictEqual(b_intersect_e.length, 0, 'FAIL CLOSED: B ∩ E must be empty');
assert.strictEqual(c_intersect_e.length, 0, 'FAIL CLOSED: C ∩ E must be empty');
console.log('   [PASS] 4. Every implementation-owned route belongs to exactly one sub-job (B ∩ C = ∅, B ∩ E = ∅, C ∩ E = ∅).');

// 7. Verify D verification targets overlap implementation ownership ONLY through verificationTargetRoutes
const manifestC_inScope = manifests['W008-C'].inScopeRoutes || [];
for (const target of manifests['W008-D'].verificationTargetRoutes) {
  assert.ok(manifestC_inScope.includes(target), `Verification target '${target}' must be owned by W008-C in inScopeRoutes`);
  assert.ok(!manifests['W008-B'].inScopeRoutes.includes(target), `Verification target '${target}' must not appear in W008-B inScopeRoutes`);
  assert.ok(!manifests['W008-E'].inScopeRoutes.includes(target), `Verification target '${target}' must not appear in W008-E inScopeRoutes`);
}
console.log('   [PASS] 5. D verification targets overlap implementation owner (W008-C) ONLY through explicit verificationTargetRoutes.');

// 8. D verification targets do not alter implementation ownership arithmetic
assert.strictEqual(ledgerB.length + ledgerC.length + ledgerE.length, 138, 'Implementation arithmetic remains unchanged (B+C+E = 138)');
console.log('   [PASS] 6. D verification targets do not alter implementation ownership arithmetic (138 total).');

// 9. Union equality
const subjobUnion = new Set([...ledgerB, ...ledgerC, ...ledgerE]);
assert.strictEqual(subjobUnion.size, 138, 'Sub-job union size must be 138');
assert.deepStrictEqual([...subjobUnion].sort(), sourceIdentities, 'Sub-job union must equal source catalog');
console.log('   [PASS] 7. Three-way equality proven: SOURCE ROUTES == MASTER LEDGER == SUBJOB UNION (138 identities).');

// ============================================================================
// MANIFEST RECONCILIATION & SCOPE CONTRADICTION VALIDATION
// ============================================================================
console.log('\n5. Validating manifest consistency and scope contradiction invariants...');

let scopeContradictions = 0;
for (const [subJob, m] of Object.entries(manifests)) {
  const inScope = m.inScopeRoutes || [];
  const restrictions = m.sharedFileRegionRestrictions || {};

  for (const [file, rest] of Object.entries(restrictions)) {
    const forbidden = rest.forbiddenRegions || [];
    for (const route of inScope) {
      for (const forb of forbidden) {
        const tokens = forb.trim().split(/\s+/);
        if (tokens.length >= 2) {
          const mth = tokens[0].toUpperCase();
          const pth = tokens[1];
          if (['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(mth) && route.startsWith(mth + ' ' + pth)) {
            console.error(`CONTRADICTION DETECTED: ${subJob} has route '${route}' in inScopeRoutes but '${forb}' in forbiddenRegions!`);
            scopeContradictions++;
          }
        }
      }
    }
  }
}

assert.strictEqual(scopeContradictions, 0, 'Scope contradiction count must be 0');
console.log('   [PASS] Scope contradiction count: 0 (No route is both inScope and forbidden).');

// Verify W008-D is strictly verification-only
assert.deepStrictEqual(manifests['W008-D'].modificationScope, [], 'W008-D modificationScope must be []');
console.log('   [PASS] W008-D modificationScope is strictly [] (Verification-Only).');

// Route Ownership Invariants
const campaignRoutes = ledger.filter(r => r.module === 'campaign');
assert.strictEqual(campaignRoutes.length, 16, 'campaign.ts must have 16 registrations');
assert.ok(campaignRoutes.every(r => r.subJob === 'W008-E'), 'All campaign routes must be in W008-E');

const politicalAdsRoutes = ledger.filter(r => r.module === 'politicalAds');
assert.strictEqual(politicalAdsRoutes.length, 6, 'politicalAds.ts must have 6 registrations');
assert.ok(politicalAdsRoutes.every(r => r.subJob === 'W008-E'), 'All politicalAds routes must be in W008-E');

const adLibrary = ledger.find(r => r.path === '/ad-library');
assert.ok(adLibrary && adLibrary.module === 'politicalAds' && adLibrary.subJob === 'W008-E', 'GET /ad-library must be owned by politicalAds in W008-E');

const pagesB = ledger.filter(r => r.module === 'pages' && r.subJob === 'W008-B');
const pagesE = ledger.filter(r => r.module === 'pages' && r.subJob === 'W008-E');
assert.strictEqual(pagesB.length, 1, 'pages in W008-B must be 1');
assert.strictEqual(pagesE.length, 3, 'pages in W008-E must be 3');

const dmRoutes = ledger.filter(r => r.module === 'dm');
assert.strictEqual(dmRoutes.length, 6, 'dm.ts must have 6 HTTP registrations');
assert.ok(dmRoutes.every(r => r.subJob === 'W008-E'), 'All dm routes must be in W008-E');

console.log('   [PASS] All specific route ownership invariants verified (campaign: 16, politicalAds: 6, pages: 1/3, dm: 6).');

// ============================================================================
// CANONICAL HASH DERIVATION & CONTROL-M PRE-FLIGHT VERIFICATION
// ============================================================================
console.log('\n6. Deriving canonical scope hashes and verifying Control M enforcement...');

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    const arr = [...obj].map(item => typeof item === 'string' ? item.replace(/\\/g, '/') : item);
    arr.sort();
    return '[' + arr.map(item => canonicalize(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k]));
  return '{' + pairs.join(',') + '}';
}

const derivedHashes = {};
for (const [subJob, m] of Object.entries(manifests)) {
  const canon = canonicalize(m);
  const hash = crypto.createHash('sha256').update(canon, 'utf8').digest('hex');
  derivedHashes[subJob] = hash;
  console.log(`   ${subJob}: ${hash}`);
}

const computedHashesPath = path.resolve('scratch/computed_hashes_rev7.json');
fs.writeFileSync(computedHashesPath, JSON.stringify(derivedHashes, null, 2) + '\n');

// Control M Pre-Flight Block Check (BLOCKER 7)
console.log('\n7. Executing Control M Pre-Flight Verification on Current State...');

function runControlMCheck(subJob, expectedPlanVersion, manifest) {
  const stateContent = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
  function extract(field) {
    const match = stateContent.match(new RegExp(`^${field}:\\s*(.+)`, 'm'));
    return match ? match[1].trim() : null;
  }

  const derivedHash = crypto.createHash('sha256').update(canonicalize(manifest), 'utf8').digest('hex');

  // Verify that Control M does NOT trust caller-provided hashes
  const planStatus = extract('PLAN_STATUS');
  const implAuth = extract('IMPLEMENTATION_AUTHORIZATION');
  const authJob = extract('AUTHORIZED_JOB');
  const authCommit = extract('IMPLEMENTATION_AUTHORIZATION_COMMIT');
  const stateHash = extract('AUTHORIZED_SCOPE_HASH');

  // Assert fail-closed when implementation is unauthorized
  if (implAuth !== 'YES' || planStatus !== 'APPROVED') {
    return {
      status: 'BLOCKED_FAIL_CLOSED',
      reason: `Plan status is '${planStatus}', authorization is '${implAuth}'. Implementation strictly frozen.`,
      subJob,
      derivedHash
    };
  }

  assert.strictEqual(stateHash, derivedHash, 'State hash must match derived hash');
  return { status: 'AUTHORIZED', subJob, derivedHash };
}

const controlMResult = runControlMCheck('W008-A', 'REV-7.0', manifests['W008-A']);
console.log(`   Control M Status: ${controlMResult.status}`);
console.log(`   Control M Reason: ${controlMResult.reason}`);
assert.strictEqual(controlMResult.status, 'BLOCKED_FAIL_CLOSED', 'Control M must fail closed in current state');

console.log('\n======================================================================');
console.log('ALL INVARIANTS & THREE-WAY RECONCILIATIONS SATISFIED WITHOUT EXCEPTION');
console.log('======================================================================');
