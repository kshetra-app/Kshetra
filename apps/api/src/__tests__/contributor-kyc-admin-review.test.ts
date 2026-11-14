import Fastify, { FastifyInstance } from 'fastify';
import { adminRoutes } from '../routes/admin';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';
import { adminService } from '../services/adminService';

describe('Contributor KYC admin review workflow', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    app = Fastify();
    await app.register(adminRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    originalConfigured = isSupabaseConfigured;
    setSupabaseConfiguredForTesting(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(originalConfigured);
  });

  it('denies reviewer access to moderator role accounts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/contributor-verifications',
      headers: { 'x-user-id': 'moderator-1', 'x-user-role': 'moderator' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('returns only pending records and signs evidence for a short review window', async () => {
    const range = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'd53cec20-0938-4772-9e1d-975d2cd9e0f1',
          user_id: 'applicant-1',
          full_legal_name: 'Asha Rao',
          phone_number: '919876543210',
          phone_verified: false,
          selfie_url: 'applicant-1/kyc-example.jpg',
          status: 'pending',
          created_at: '2026-11-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range,
    };
    const from = jest.spyOn(supabase, 'from').mockReturnValue(query as never);
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example/private?token=limited' },
      error: null,
    });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ createSignedUrl } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/contributor-verifications?limit=10&offset=5',
      headers: { 'x-user-id': 'reviewer-1', 'x-user-role': 'compliance_officer' },
    });
    const payload = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(from).toHaveBeenCalledWith('creator_kyc_records');
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    expect(range).toHaveBeenCalledWith(5, 15);
    expect(createSignedUrl).toHaveBeenCalledWith('applicant-1/kyc-example.jpg', 600);
    expect(payload.data.records[0]).toMatchObject({
      fullLegalName: 'Asha Rao',
      selfieSignedUrl: 'https://storage.example/private?token=limited',
      evidenceAvailable: true,
    });
    expect(payload.data.signedUrlExpiresInSeconds).toBe(600);
  });

  it('requires a useful rejection reason before invoking the transactional decision', async () => {
    const rpc = jest.spyOn(supabase, 'rpc');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/contributor-verifications/d53cec20-0938-4772-9e1d-975d2cd9e0f1/review',
      headers: { 'x-user-id': 'reviewer-2', 'x-user-role': 'admin' },
      payload: { decision: 'rejected', rejectionReason: 'No' },
    });
    expect(response.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('persists an approval through the atomic review RPC and records an admin audit event', async () => {
    const reviewed = {
      id: 'd53cec20-0938-4772-9e1d-975d2cd9e0f1',
      user_id: 'applicant-1',
      status: 'verified',
      verified_at: '2026-11-02T00:00:00.000Z',
      rejection_reason: null,
      updated_at: '2026-11-02T00:00:00.000Z',
    };
    const rpc = jest
      .spyOn(supabase, 'rpc')
      .mockResolvedValue({ data: [reviewed], error: null } as never);
    const audit = jest.spyOn(adminService, 'recordAudit').mockResolvedValue({} as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/contributor-verifications/d53cec20-0938-4772-9e1d-975d2cd9e0f1/review',
      headers: { 'x-user-id': 'reviewer-3', 'x-user-role': 'compliance_officer' },
      payload: { decision: 'verified' },
    });
    const payload = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('review_creator_kyc_record', {
      p_record_id: reviewed.id,
      p_reviewer_user_id: 'reviewer-3',
      p_decision: 'verified',
      p_rejection_reason: null,
    });
    expect(payload.data).toMatchObject({
      id: reviewed.id,
      userId: 'applicant-1',
      status: 'verified',
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reviewer-3', role: 'compliance_officer' }),
      'verification',
      'contributor_kyc_verified',
      'creator_kyc_records',
      reviewed.id,
      { status: 'pending' },
      { status: 'verified', rejectionReason: null },
    );
  });
});
