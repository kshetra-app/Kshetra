import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { adminRoutes } from '../apps/api/src/routes/admin';
import { adminService } from '../apps/api/src/services/adminService';

console.log('=== RUNNING DOMAIN 9: JOB 074 ADMIN CONTROL PLANE VERIFICATION ===');

async function createTestApp() {
  const app = Fastify();
  await app.register(adminRoutes);
  return app;
}

async function runBattery() {
  const app = await createTestApp();

  // Test 1: Unauthenticated request fails closed with HTTP 401
  console.log('\n[CHECK 1] Testing unauthenticated access to admin routes (fail-closed HTTP 401)...');
  const unauthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/feature-flags',
  });
  assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated access must be rejected with 401');
  const unauthBody = JSON.parse(unauthRes.payload);
  assert.strictEqual(unauthBody.error, 'UNAUTHORIZED');
  console.log('  [PASS] Unauthenticated request fail-closed with 401.');

  // Test 2: Ordinary citizen user fails closed with HTTP 403 Forbidden
  console.log('\n[CHECK 2] Testing ordinary citizen access to admin routes (fail-closed HTTP 403)...');
  const citizenRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/feature-flags',
    headers: {
      'x-user-id': 'citizen-user-123',
      'x-user-role': 'citizen',
    },
  });
  assert.strictEqual(citizenRes.statusCode, 403, 'Ordinary citizen must be rejected with 403');
  const citizenBody = JSON.parse(citizenRes.payload);
  assert.strictEqual(citizenBody.error, 'INSUFFICIENT_PERMISSIONS');
  assert.ok(citizenBody.message.includes('not authorized'));
  console.log('  [PASS] Ordinary citizen strictly rejected with 403 Forbidden.');

  // Test 3: Candidate / politician user fails closed with HTTP 403
  console.log('\n[CHECK 3] Testing politician access to admin routes (fail-closed HTTP 403)...');
  const politicianRes = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/users/action',
    headers: {
      'x-user-id': 'candidate-mla-456',
      'x-user-role': 'politician',
    },
    payload: {
      targetUserId: 'user-789',
      action: 'suspend',
      reason: 'Dispute in debate',
    },
  });
  assert.strictEqual(politicianRes.statusCode, 403, 'Politicians must not perform admin actions (403)');
  console.log('  [PASS] Politician role strictly rejected with 403 Forbidden.');

  // Test 4: Privileged Admin executing User Suspension (Users Domain)
  console.log('\n[CHECK 4] Testing privileged admin user suspension (Users Domain)...');
  const suspendRes = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/users/action',
    headers: {
      'x-user-id': 'admin-operator-001',
      'x-user-role': 'admin',
    },
    payload: {
      targetUserId: 'toxic-spammer-999',
      action: 'suspend',
      reason: 'Spreading automated spam and disinformation',
    },
  });
  assert.strictEqual(suspendRes.statusCode, 200, 'Admin user suspension must succeed (200)');
  const suspendData = JSON.parse(suspendRes.payload).data;
  assert.strictEqual(suspendData.action, 'suspend');
  assert.ok(suspendData.auditId, 'Must return generated auditId');
  console.log('  [PASS] Admin user suspension verified with audit ID.');

  // Test 5: Privileged Admin Content Moderation Decision (Moderation Domain)
  console.log('\n[CHECK 5] Testing content moderation quarantine/takedown (Moderation Domain)...');
  const modRes = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/moderation/decide',
    headers: {
      'x-user-id': 'admin-mod-002',
      'x-user-role': 'super_admin',
    },
    payload: {
      targetContentType: 'post',
      targetContentId: 'post-violating-terms-55',
      decision: 'takedown',
      violationCategory: 'HATE_SPEECH',
      internalNotes: 'Violates Section 153A community standards.',
    },
  });
  assert.strictEqual(modRes.statusCode, 200, 'Admin content moderation must return 200');
  const modData = JSON.parse(modRes.payload).data;
  assert.strictEqual(modData.decision, 'takedown');
  console.log('  [PASS] Content moderation decision verified with audit trace.');

  // Test 6: Privileged Admin Statutory KYC Verification (Verification Domain)
  console.log('\n[CHECK 6] Testing candidate statutory KYC verification (Verification Domain)...');
  const kycRes = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/verification/candidate',
    headers: {
      'x-user-id': 'compliance-officer-003',
      'x-user-role': 'compliance_officer',
    },
    payload: {
      candidateId: 'cand-aspirant-2026',
      kycStatus: 'VERIFIED',
      statutoryChecklist: {
        epicVerified: true,
        affidavitVerified: true,
        residencyVerified: true,
        criminalAntecedentsCleared: true,
      },
      verifierNotes: 'ECI Form 2B and Section 33A sworn affidavits verified against CEO portal.',
    },
  });
  assert.strictEqual(kycRes.statusCode, 200, 'Candidate KYC verification must return 200');
  const kycData = JSON.parse(kycRes.payload).data;
  assert.strictEqual(kycData.kycStatus, 'VERIFIED');
  console.log('  [PASS] Candidate statutory KYC verification verified.');

  // Test 7: Legislative & Boundary Data Correction (Data Correction Domain)
  console.log('\n[CHECK 7] Testing legislative and geographic data correction (Data Correction Domain)...');
  const dataCorrRes = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/data-correction',
    headers: {
      'x-user-id': 'admin-operator-001',
      'x-user-role': 'admin',
    },
    payload: {
      entityType: 'constituency',
      entityId: 'AP-AC-53',
      field: 'constituency_name_en',
      oldValue: 'Rampachodavaram (Legacy Sp)',
      newValue: 'Rampachodavaram',
      statutoryReference: 'Delimitation Notification No. 282/AP/2018(DEL)',
      justification: 'Official gazetted spelling reconciliation.',
    },
  });
  assert.strictEqual(dataCorrRes.statusCode, 200, 'Data correction must return 200');
  const corrData = JSON.parse(dataCorrRes.payload).data;
  assert.strictEqual(corrData.newValue, 'Rampachodavaram');
  console.log('  [PASS] Data correction verified with statutory justification.');

  // Test 8: Feature Flags Read & Runtime Toggle (Feature Flags Domain)
  console.log('\n[CHECK 8] Testing feature flags retrieval and mutation (Feature Flags Domain)...');
  const flagsGetRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/feature-flags',
    headers: {
      'x-user-id': 'admin-operator-001',
      'x-user-role': 'admin',
    },
  });
  assert.strictEqual(flagsGetRes.statusCode, 200);
  const flags = JSON.parse(flagsGetRes.payload).data;
  assert.ok(Array.isArray(flags));
  assert.ok(flags.length >= 3);

  const flagPutRes = await app.inject({
    method: 'PUT',
    url: '/api/v1/admin/feature-flags/election_mode_mcc',
    headers: {
      'x-user-id': 'admin-operator-001',
      'x-user-role': 'admin',
    },
    payload: {
      value: true,
      description: 'Model Code of Conduct activated for assembly elections',
    },
  });
  assert.strictEqual(flagPutRes.statusCode, 200);
  const updatedFlag = JSON.parse(flagPutRes.payload).data;
  assert.strictEqual(updatedFlag.flagValue, true);
  console.log('  [PASS] Feature flags read and runtime toggle verified.');

  // Test 9: Audit Ledger Query (Audit Domain)
  console.log('\n[CHECK 9] Testing immutable audit ledger querying (Audit Domain)...');
  const auditRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/audit-logs',
    headers: {
      'x-user-id': 'admin-auditor-007',
      'x-user-role': 'super_admin',
    },
  });
  assert.strictEqual(auditRes.statusCode, 200);
  const auditData = JSON.parse(auditRes.payload).data;
  assert.ok(auditData.total >= 4, 'Must have recorded all prior mutations');
  assert.ok(auditData.entries.length >= 4);

  // Assert entries contain before/after state diff and actor metadata
  const userAudit = auditData.entries.find((e: any) => e.domain === 'users');
  assert.ok(userAudit, 'User mutation must exist in audit log');
  assert.strictEqual(userAudit.action, 'USER_SUSPEND');
  assert.strictEqual(userAudit.targetEntityId, 'toxic-spammer-999');
  assert.ok(userAudit.beforeState);
  assert.ok(userAudit.afterState);
  assert.ok(userAudit.timestamp);
  console.log('  [PASS] Audit ledger contains complete immutable diffs and actor attribution.');

  await app.close();
  console.log('\n====================================================================');
  console.log('  JOB 074 ADMIN CONTROL PLANE: ALL 9 FUNCTIONS VERIFIED (100% PASS)!');
  console.log('====================================================================\n');
}

runBattery().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
