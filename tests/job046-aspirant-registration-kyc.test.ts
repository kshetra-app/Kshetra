import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { aspirantRoutes } from '../apps/api/src/routes/aspirant';
import { AspirantService } from '../apps/api/src/services/aspirantService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 046: Aspirant Registration & KYC Verification Flow', async (t) => {
  setSupabaseConfiguredForTesting(false);
  const app = Fastify();
  await app.register(aspirantRoutes);
  await app.ready();

  t.after(async () => {
    await app.close();
    AspirantService.resetMockState();
    setSupabaseConfiguredForTesting(true);
  });

  AspirantService.resetMockState();

  const userId = 'usr-asp-001';
  const handle = 'rajesh_patil_jubilee';

  await t.test('1. Successfully registers aspirant profile with target constituency and manifesto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/register',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'citizen',
      },
      payload: {
        userId,
        displayName: 'Rajesh Patil',
        bio: 'Grassroots civic worker fighting for water and public transport.',
        stateCode: 'TG',
        targetConstituencyAcNo: 61,
        targetConstituencyName: 'Jubilee Hills',
        targetElectionYear: 2028,
        partyAffiliation: 'Independent',
        isIndependent: true,
        manifestoUrl: 'https://panin.in/manifesto/rajesh-patil.pdf',
        visionSummary: 'Clean drinking water for all colonies and road resurfacing.',
        hasCriminalCases: false,
        handle,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.profile.displayName, 'Rajesh Patil');
    assert.equal(body.profile.targetConstituencyAcNo, 61);
    assert.equal(body.profile.handle, handle);
    assert.equal(body.profile.verificationTier, 'tier1');
    assert.equal(body.profile.verificationStatus, 'unverified');
  });

  await t.test('2. Rejects registration with duplicate handle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/register',
      headers: {
        'x-user-id': 'usr-asp-002',
        'x-user-role': 'citizen',
      },
      payload: {
        userId: 'usr-asp-002',
        displayName: 'Another Person',
        stateCode: 'TG',
        handle, // Duplicate handle
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'HANDLE_CONFLICT');
  });

  await t.test('3. Rejects KYC submission when statutory declaration is not accepted', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/kyc/submit',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        documentType: 'voter_id',
        documentHash: 'sha256-abcdef1234567890abcdef1234567890',
        statutoryDeclarationAccepted: false, // Rejected
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'STATUTORY_DECLARATION_REQUIRED');
  });

  await t.test('4. Submits Tier 1 KYC document and transitions profile to pending', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/kyc/submit',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        documentType: 'pan',
        documentHash: 'sha256-11112222333344445555666677778888',
        statutoryDeclarationAccepted: true,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.kyc.verificationTier, 'tier1');
    assert.equal(body.kyc.verificationStatus, 'pending');
  });

  await t.test('5. Submits Tier 2 election affidavit and verifies elevation to tier2', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/kyc/submit',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        documentType: 'election_affidavit',
        documentHash: 'sha256-99998888777766665555444433332222',
        statutoryDeclarationAccepted: true,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.kyc.verificationTier, 'tier2');
    assert.equal(body.kyc.verificationStatus, 'pending');
  });

  await t.test('6. Successfully retrieves KYC status records for authenticated user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/kyc/status',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(Array.isArray(body.records), true);
    assert.equal(body.records.length, 2); // pan + election_affidavit
  });
});
