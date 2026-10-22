/**
 * Verification Test Battery: Mobile Strangler Class B Endpoints 29-56
 * Verifies that all 28 remaining Class B client write methods are mediated via Fastify
 * Criterion: CRIT-H04-02 (W021.5-H-04)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- TEST BATTERY: Mobile Strangler Class B Endpoints 29-56 (CRIT-H04-02) ---');

const servicePath = path.resolve(process.cwd(), 'apps/mobile/lib/supabaseDataService.ts');
assert(fs.existsSync(servicePath), 'apps/mobile/lib/supabaseDataService.ts must exist');

const serviceCode = fs.readFileSync(servicePath, 'utf8');

const classBMethods29to56 = [
  { num: 29, name: 'completeModule', route: '/api/v1/aspirant/modules/', method: 'POST' },
  { num: 30, name: 'joinChallenge', route: '/api/v1/aspirant/challenges/', method: 'POST' },
  { num: 31, name: 'endorseAspirant', route: '/api/v1/aspirant/', method: 'POST' },
  { num: 32, name: 'submitKYC', route: '/api/v1/contributor/kyc', method: 'POST' },
  { num: 33, name: 'insertActionFingerprint', route: '/api/v1/contributor/fingerprint', method: 'POST' },
  { num: 34, name: 'upsertContributorDevice', route: '/api/v1/contributor/devices', method: 'POST' },
  { num: 35, name: 'markNotificationRead', route: '/api/v1/notifications/read', method: 'PATCH' },
  { num: 36, name: 'markAllNotificationsRead', route: '/api/v1/notifications/read', method: 'PATCH' },
  { num: 37, name: 'registerPushToken', route: '/api/v1/notifications/register-token', method: 'POST' },
  { num: 38, name: 'followUser', route: '/api/v1/users/', method: 'POST' },
  { num: 39, name: 'unfollowUser', route: '/api/v1/users/', method: 'DELETE' },
  { num: 40, name: 'submitContentReport', route: '/api/v1/moderation/report', method: 'POST' },
  { num: 41, name: 'recordSession', route: '/api/v1/analytics/sessions', method: 'POST' },
  { num: 42, name: 'endSession', route: '/api/v1/analytics/sessions', method: 'POST' },
  { num: 43, name: 'incrementShortView', route: '/api/v1/shorts/', method: 'POST' },
  { num: 44, name: 'addShortComment', route: '/api/v1/shorts/', method: 'POST' },
  { num: 45, name: 'createLiveEvent', route: '/api/v1/lmx/live', method: 'POST' },
  { num: 46, name: 'updateLiveEvent', route: '/api/v1/lmx/live/', method: 'POST' },
  { num: 47, name: 'endLiveEvent', route: '/api/v1/lmx/live/', method: 'POST' },
  { num: 48, name: 'dispatchDepartmentAlert', route: '/api/v1/lmx/alerts', method: 'POST' },
  { num: 49, name: 'acknowledgeDepartmentAlert', route: '/api/v1/lmx/alerts/', method: 'POST' },
  { num: 50, name: 'createContentAlert', route: '/api/v1/lmx/alerts/content', method: 'POST' },
  { num: 51, name: 'acknowledgeContentAlert', route: '/api/v1/lmx/alerts/content/', method: 'POST' },
  { num: 52, name: 'updateReporterCredibility', route: '/api/v1/lmx/credibility', method: 'POST' },
  { num: 53, name: 'addDistributionDestination', route: '/api/v1/lmx/distribution/destinations', method: 'POST' },
  { num: 54, name: 'logModerationEvent', route: '/api/v1/lmx/moderation-events', method: 'POST' },
  { num: 55, name: 'incrementViewerCount', route: '/api/v1/lmx/live/', method: 'POST' },
  { num: 56, name: 'markConversationMessagesRead', route: '/api/v1/dm/messages/read', method: 'POST' },
];

let passedChecks = 0;

for (const target of classBMethods29to56) {
  const start = serviceCode.indexOf(`export async function ${target.name}`);
  assert.notStrictEqual(start, -1, `Method ${target.name} must exist in supabaseDataService.ts`);

  let nextBoundary = serviceCode.indexOf('\nexport ', start + 1);
  const nextComment = serviceCode.indexOf('\n// ───', start + 1);
  if (nextComment !== -1 && (nextBoundary === -1 || nextComment < nextBoundary)) {
    nextBoundary = nextComment;
  }
  if (nextBoundary === -1) nextBoundary = serviceCode.length;
  const fnEnd = serviceCode.lastIndexOf('\n}', nextBoundary) + 2;
  const fnBody = serviceCode.slice(start, fnEnd);

  // Check 1: Must invoke fetch with API_BASE_URL and target route
  assert(
    fnBody.includes(`API_BASE_URL}`) && fnBody.includes(target.route),
    `Method ${target.name} must route via fetch to ${target.route}`
  );

  // Check 2: Must specify correct HTTP method
  assert(
    fnBody.includes(`method: '${target.method}'`),
    `Method ${target.name} must use HTTP ${target.method}`
  );

  // Check 3: Must include telemetry tracing headers
  assert(
    fnBody.includes('...telemetry.getTracingHeaders()'),
    `Method ${target.name} must forward telemetry tracing headers`
  );

  // Check 4: Must NOT contain direct supabase mutations inside function body
  const directSupabaseMutationRegex = /supabase\s*\.\s*from\([^)]+\)\s*\.\s*(insert|update|delete|upsert)/;
  assert(
    !directSupabaseMutationRegex.test(fnBody),
    `Method ${target.name} must not contain direct supabase mutations`
  );

  passedChecks++;
  console.log(`[PASS] Method ${target.num} (${target.name}) -> ${target.method} ${target.route} [Mediated]`);
}

// Check Fastify Route Registration Integrity
const serverPath = path.resolve(process.cwd(), 'apps/api/src/server.ts');
const serverCode = fs.readFileSync(serverPath, 'utf8');

const requiredRoutes = [
  'aspirantRoutes',
  'contributorRoutes',
  'userRoutes',
  'analyticsRoutes',
  'shortsRoutes',
  'notificationRoutes',
  'dmRoutes',
  'lmxRoutes',
  'moderationRoutes',
];

for (const r of requiredRoutes) {
  assert(
    serverCode.includes(r),
    `apps/api/src/server.ts must import and register ${r}`
  );
  console.log(`[PASS] Fastify server registers ${r}`);
}

console.log(`\nALL ${passedChecks}/28 CLASS B METHODS (29-56) CONFIRMED MEDIATED VIA FASTIFY!`);
console.log('CRIT-H04-02 VERIFICATION SUCCESSFUL.');
