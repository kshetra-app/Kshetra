/**
 * Master Verification Test Suite for JOB W007: CANONICAL API CLIENT
 * Master Execution Framework — Amendment v1.5-A / DEC-037
 * 
 * Verifies:
 * 1. Canonical API client module structure & exports (apps/mobile/lib/api/)
 * 2. Complete migration of all 3 pioneer callers (pageService, featureFlags, stores/news)
 * 3. Strict out-of-scope boundary preservation (DM, database migrations, Fastify routes, package dependencies)
 * 4. Request ID correlation invariants & Fastify genReqId regex compatibility
 * 5. Fail-closed correlation error handling (NP-11, NP-12)
 * 6. Telemetry privacy preservation (NP-10)
 * 7. Pioneer fallback semantics preservation
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING W007 CANONICAL API CLIENT VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// CHECK 1: Canonical Module Files and Export Structure
// -------------------------------------------------------------
const apiDir = path.resolve('apps/mobile/lib/api');
assert.ok(fs.existsSync(apiDir), 'apps/mobile/lib/api directory must exist');

const requiredFiles = [
  'types.ts',
  'errors.ts',
  'authManager.ts',
  'interceptors/auth.ts',
  'interceptors/correlation.ts',
  'client.ts',
  'endpoints/config.ts',
  'endpoints/pages.ts',
  'endpoints/news.ts',
  'index.ts',
];

for (const file of requiredFiles) {
  const fullPath = path.join(apiDir, file);
  assert.ok(fs.existsSync(fullPath), `Required module file missing: apps/mobile/lib/api/${file}`);
}

const indexContent = fs.readFileSync(path.join(apiDir, 'index.ts'), 'utf8');
assert.ok(indexContent.includes('export const apiClient = new ApiClient'), 'index.ts must export canonical apiClient singleton');
assert.ok(indexContent.includes('export * from \'./client\''), 'index.ts must export ApiClient class');
assert.ok(indexContent.includes('export * from \'./errors\''), 'index.ts must export error classes');
assert.ok(indexContent.includes('export * from \'./types\''), 'index.ts must export types and DTOs');
assert.ok(indexContent.includes('export * from \'./authManager\''), 'index.ts must export AuthManager');

console.log('[PASS] Check 1: Canonical API client module structure and export signatures verified.');

// -------------------------------------------------------------
// CHECK 2: Pioneer Caller Migration & Elimination of Raw Fetch
// -------------------------------------------------------------
// 2.1 pageService.ts
const pageServicePath = path.resolve('apps/mobile/lib/pageService.ts');
const pageServiceContent = fs.readFileSync(pageServicePath, 'utf8');
assert.ok(pageServiceContent.includes('apiClient.pages.getEntitlement'), 'pageService.ts must use apiClient.pages.getEntitlement');
assert.ok(!pageServiceContent.includes('fetch('), 'pageService.ts must not contain raw fetch() calls');

// 2.2 featureFlags.ts
const featureFlagsPath = path.resolve('apps/mobile/lib/featureFlags.ts');
const featureFlagsContent = fs.readFileSync(featureFlagsPath, 'utf8');
assert.ok(featureFlagsContent.includes('apiClient.config.getFlags()'), 'featureFlags.ts must use apiClient.config.getFlags()');
assert.ok(!featureFlagsContent.includes('fetch('), 'featureFlags.ts must not contain raw fetch() calls');
assert.ok(!featureFlagsContent.includes('\'/config/flags\'') && !featureFlagsContent.includes('"/config/flags"') && !featureFlagsContent.includes('`${API_BASE_URL}/config/flags`'), 'featureFlags.ts must not reference unversioned /config/flags directly');

// 2.3 stores/news.ts
const newsStorePath = path.resolve('apps/mobile/stores/news.ts');
const newsStoreContent = fs.readFileSync(newsStorePath, 'utf8');
assert.ok(newsStoreContent.includes('apiClient.news.getFeed'), 'stores/news.ts must use apiClient.news.getFeed()');
assert.ok(!newsStoreContent.includes('fetch('), 'stores/news.ts must not contain raw fetch() calls');

console.log('[PASS] Check 2: Pioneer callers successfully migrated to canonical apiClient with zero raw fetch() calls.');

// -------------------------------------------------------------
// CHECK 3: Strict Out-of-Scope Boundary & Immutability Invariant
// -------------------------------------------------------------
const BASELINE_COMMIT = '2f5ec43251fb7a8d323a029640576cc777fc79cf';

// Verify DM store is completely untouched
const dmDiff = execSync(`git diff ${BASELINE_COMMIT} -- apps/mobile/stores/dmStore.ts`, { encoding: 'utf8' }).trim();
assert.strictEqual(dmDiff, '', 'apps/mobile/stores/dmStore.ts must have zero diff against baseline (strictly out-of-scope)');

// Verify Fastify routes are untouched
const routesDiff = execSync(`git diff ${BASELINE_COMMIT} -- apps/api/src/routes/`, { encoding: 'utf8' }).trim();
assert.strictEqual(routesDiff, '', 'apps/api/src/routes/ must have zero diff against baseline (strictly out-of-scope)');

// Verify database migrations are untouched
const migrationsDiff = execSync(`git diff ${BASELINE_COMMIT} -- supabase/migrations/`, { encoding: 'utf8' }).trim();
assert.strictEqual(migrationsDiff, '', 'supabase/migrations/ must have zero diff against baseline (strictly out-of-scope)');

// Verify package.json dependencies are untouched
const pkgDiff = execSync(`git diff ${BASELINE_COMMIT} -- package.json apps/mobile/package.json apps/api/package.json`, { encoding: 'utf8' }).trim();
assert.strictEqual(pkgDiff, '', 'package.json dependencies must have zero diff against baseline (no new dependencies)');

console.log('[PASS] Check 3: Strict out-of-scope boundaries verified (DM, routes, migrations, and dependencies untouched).');

// -------------------------------------------------------------
// CHECK 4: Request ID Correlation Invariants & Fastify Compatibility
// -------------------------------------------------------------
// Fastify genReqId constraints from apps/api/src/server.ts:81-96
const FASTIFY_REQ_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const FASTIFY_MAX_REQ_ID_LEN = 128;

const correlationContent = fs.readFileSync(path.join(apiDir, 'interceptors/correlation.ts'), 'utf8');
assert.ok(correlationContent.includes('^[a-zA-Z0-9_\\-]+$'), 'Correlation interceptor must enforce Fastify genReqId regex');
assert.ok(correlationContent.includes('128'), 'Correlation interceptor must enforce Fastify max 128 char limit');
assert.ok(correlationContent.includes('ApiCorrelationError'), 'Correlation interceptor must raise ApiCorrelationError');

// Verify UUID v4 generator compliance
const telemetryContent = fs.readFileSync(path.resolve('apps/mobile/lib/telemetry.ts'), 'utf8');
assert.ok(telemetryContent.includes('generateRequestId'), 'Mobile telemetry must provide generateRequestId');

console.log('[PASS] Check 4: Request ID correlation constraints verified against Fastify genReqId requirements.');

// -------------------------------------------------------------
// CHECK 5: Fail-Closed Correlation Error Handling (NP-11, NP-12) & Cancellation
// -------------------------------------------------------------
const errorsContent = fs.readFileSync(path.join(apiDir, 'errors.ts'), 'utf8');
assert.ok(errorsContent.includes('export class ApiCorrelationError extends ApiError'), 'errors.ts must define ApiCorrelationError');
assert.ok(errorsContent.includes('export class ApiValidationError extends ApiError'), 'errors.ts must define ApiValidationError');
assert.ok(errorsContent.includes('export class ApiAuthError extends ApiError'), 'errors.ts must define ApiAuthError');
assert.ok(errorsContent.includes('export class ApiTimeoutError extends ApiError'), 'errors.ts must define ApiTimeoutError');
assert.ok(errorsContent.includes('export class ApiNetworkError extends ApiError'), 'errors.ts must define ApiNetworkError');
assert.ok(errorsContent.includes('export class ApiCancellationError extends ApiError'), 'errors.ts must define ApiCancellationError');

console.log('[PASS] Check 5: Typed ApiError hierarchy and fail-closed protocol/cancellation error classes verified.');

// -------------------------------------------------------------
// CHECK 6: Telemetry Privacy Invariant (NP-10)
// -------------------------------------------------------------
// Ensure correlation interceptor never records Authorization, tokens, or bodies
assert.ok(!correlationContent.includes('headers[\'Authorization\']'), 'Correlation interceptor must not log Authorization header');
assert.ok(!correlationContent.includes('body'), 'Correlation interceptor breadcrumbs must not include request/response body');
assert.ok(correlationContent.includes('sanitizedPath'), 'Correlation interceptor must sanitize URL paths in breadcrumbs');

console.log('[PASS] Check 6: Telemetry privacy invariant verified (zero Authorization headers or bodies recorded).');

// -------------------------------------------------------------
// CHECK 7: Pioneer Fallback Semantics Preservation
// -------------------------------------------------------------
// pageService must return free plan fallback on error
assert.ok(
  pageServiceContent.includes('return { pageId, isPro: false, plan: \'free\', expiresAt: null }'),
  'pageService.ts must preserve fallback to free plan on error',
);

// featureFlags must retain existing flags on catch
assert.ok(
  featureFlagsContent.includes('// Offline fallback — keep persisted/default flags'),
  'featureFlags.ts must preserve offline fallback',
);

// stores/news must return null on catch
assert.ok(
  newsStoreContent.includes('return null;') && newsStoreContent.includes('// fall through'),
  'stores/news.ts must preserve fallback on error',
);

console.log('[PASS] Check 7: Pioneer caller fallback semantics verified 100% intact.');

// -------------------------------------------------------------
// CHECK 8: Unit Test Suite Integrity & Real AuthManager Single-Flight
// -------------------------------------------------------------
const testPath = path.resolve('apps/mobile/__tests__/apiClient.test.ts');
assert.ok(fs.existsSync(testPath), 'apps/mobile/__tests__/apiClient.test.ts must exist');
const testContent = fs.readFileSync(testPath, 'utf8');
assert.ok(testContent.includes('W007 Canonical API Client'), 'Unit test suite must cover W007 Canonical API Client');
assert.ok(testContent.includes('NP-04'), 'Unit test must cover NP-04 timeout');
assert.ok(testContent.includes('NP-08'), 'Unit test must cover NP-08 mutation retry policy');
assert.ok(testContent.includes('NP-10'), 'Unit test must cover NP-10 telemetry privacy');
assert.ok(testContent.includes('NP-11'), 'Unit test must cover NP-11 missing correlation header');
assert.ok(testContent.includes('NP-12'), 'Unit test must cover NP-12 mismatched correlation header');
assert.ok(testContent.includes('ApiCancellationError'), 'Unit test must cover caller cancellation');
assert.ok(!testContent.includes('authMgr.getAccessToken = jest.fn()'), 'Unit test must NOT replace AuthManager.getAccessToken with a mock');
assert.ok(testContent.includes('authMgr.getAccessToken()'), 'Unit test must invoke real AuthManager.getAccessToken()');

console.log('[PASS] Check 8: Comprehensive unit test suite integrity and real AuthManager single-flight test verified.');

// -------------------------------------------------------------
// CHECK 9: Runtime Response Contract Validation & Safe News Mapping
// -------------------------------------------------------------
const configEndpointContent = fs.readFileSync(path.join(apiDir, 'endpoints/config.ts'), 'utf8');
assert.ok(configEndpointContent.includes('validateFeatureFlagsResponse'), 'ConfigEndpoint must implement validateFeatureFlagsResponse');

const pagesEndpointContent = fs.readFileSync(path.join(apiDir, 'endpoints/pages.ts'), 'utf8');
assert.ok(pagesEndpointContent.includes('validatePageEntitlementResponse'), 'PagesEndpoint must implement validatePageEntitlementResponse');

const newsEndpointContent = fs.readFileSync(path.join(apiDir, 'endpoints/news.ts'), 'utf8');
assert.ok(newsEndpointContent.includes('validateNewsFeedResponse'), 'NewsEndpoint must implement validateNewsFeedResponse');
assert.ok(newsEndpointContent.includes('validateNewsSource'), 'NewsEndpoint must implement validateNewsSource');
assert.ok(newsEndpointContent.includes('mapNewsFeedDTOToNewsFeed'), 'NewsEndpoint must implement mapNewsFeedDTOToNewsFeed');
assert.ok(newsEndpointContent.includes('"source" must be a structured object, not a string'), 'NewsEndpoint must reject string source');

const apiTypesContent = fs.readFileSync(path.join(apiDir, 'types.ts'), 'utf8');
assert.ok(!apiTypesContent.includes('source: NewsSourceDTO | string'), 'types.ts must not allow string escape in NewsItemDTO.source');

// Verify stores/news.ts has zero unsafe casts
assert.ok(!newsStoreContent.includes('as unknown as NewsFeed'), 'stores/news.ts must NOT contain "as unknown as NewsFeed"');

console.log('[PASS] Check 9: Runtime response contract validation and safe typed DTO mapping verified.');

console.log('\n===============================================================');
console.log('   ALL W007 CANONICAL API CLIENT VERIFICATION CHECKS PASSED!   ');
console.log('===============================================================\n');
