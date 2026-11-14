import Fastify, { FastifyInstance } from 'fastify';
import { contributorRoutes } from '../routes/contributor';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

describe('Contributor KYC production contract', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    app = Fastify();
    await app.register(contributorRoutes);
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

  it('requires authentication to read a verification status', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/contributor/kyc/status' });
    expect(response.statusCode).toBe(401);
  });

  it('returns only the signed-in user status fields and queries by authenticated owner', async () => {
    const record = {
      id: 'kyc-row-1',
      user_id: 'user-1',
      status: 'verified',
      verified_at: '2026-10-01T00:00:00.000Z',
      rejection_reason: null,
      created_at: '2026-09-30T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
      full_legal_name: 'Private Name',
      phone_number: '9876543210',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: record, error: null }),
    };
    const from = jest.spyOn(supabase, 'from').mockReturnValue(query as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/contributor/kyc/status',
      headers: { 'x-user-id': 'user-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(from).toHaveBeenCalledWith('creator_kyc_records');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(JSON.parse(response.payload)).toEqual({
      success: true,
      record: {
        id: 'kyc-row-1',
        userId: 'user-1',
        status: 'verified',
        verifiedAt: '2026-10-01T00:00:00.000Z',
        rejectionReason: null,
        createdAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    });
    expect(response.payload).not.toContain('Private Name');
    expect(response.payload).not.toContain('9876543210');
  });

  it('writes one pending record to the same table used by creator eligibility checks', async () => {
    const record = {
      id: 'kyc-row-2',
      user_id: 'user-2',
      status: 'pending',
      verified_at: null,
      rejection_reason: null,
      created_at: '2026-10-02T00:00:00.000Z',
      updated_at: '2026-10-02T00:00:00.000Z',
    };
    const existingQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    let inserted: Record<string, unknown> | undefined;
    let insertQuery: any;
    insertQuery = {
      insert: jest.fn((value: Record<string, unknown>) => {
        inserted = value;
        return insertQuery;
      }),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: record, error: null }),
    };
    const from = jest
      .spyOn(supabase, 'from')
      .mockReturnValueOnce(existingQuery as never)
      .mockReturnValueOnce(insertQuery as never);
    const list = jest.fn().mockResolvedValue({ data: [{ name: 'kyc-test.jpg' }], error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ list } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-2' },
      payload: {
        userId: 'user-2',
        fullLegalName: '  Asha Rao  ',
        phoneNumber: '+91 98765-43210',
        selfiePath: 'user-2/kyc-test.jpg',
        termsAccepted: true,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(from).toHaveBeenNthCalledWith(1, 'creator_kyc_records');
    expect(from).toHaveBeenNthCalledWith(2, 'creator_kyc_records');
    expect(list).toHaveBeenCalledWith('user-2', { search: 'kyc-test.jpg', limit: 100 });
    expect(inserted).toMatchObject({
      user_id: 'user-2',
      full_legal_name: 'Asha Rao',
      phone_number: '919876543210',
      phone_verified: false,
      selfie_url: 'user-2/kyc-test.jpg',
      status: 'pending',
      terms_version: '1.0',
    });
    expect(inserted).not.toHaveProperty('verified_at');
    expect(JSON.parse(response.payload).record.status).toBe('pending');
  });

  it('returns an existing review record instead of inserting a duplicate', async () => {
    const existing = {
      id: 'kyc-row-3',
      user_id: 'user-3',
      status: 'verified',
      verified_at: '2026-10-03T00:00:00.000Z',
      rejection_reason: null,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-10-03T00:00:00.000Z',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: existing, error: null }),
    };
    const from = jest.spyOn(supabase, 'from').mockReturnValue(query as never);
    const list = jest.fn();
    const remove = jest.fn().mockResolvedValue({ data: [], error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ list, remove } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-3' },
      payload: {
        userId: 'user-3',
        fullLegalName: 'Asha Rao',
        phoneNumber: '9876543210',
        selfiePath: 'user-3/kyc-new.jpg',
        termsAccepted: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(from).toHaveBeenCalledTimes(2);
    expect(list).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(['user-3/kyc-new.jpg']);
    expect(JSON.parse(response.payload)).toMatchObject({
      existing: true,
      record: { status: 'verified' },
    });
  });

  it('resubmits a rejected record through the audited database function', async () => {
    const rejected = {
      id: 'kyc-row-6',
      user_id: 'user-6',
      status: 'rejected',
      verified_at: null,
      rejection_reason: 'Please provide a clearer selfie image.',
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-10-03T00:00:00.000Z',
      selfie_url: 'user-6/kyc-old.jpg',
    };
    const pending = {
      ...rejected,
      status: 'pending',
      rejection_reason: null,
      selfie_url: 'user-6/kyc-new.jpg',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: rejected, error: null }),
    };
    const from = jest.spyOn(supabase, 'from').mockReturnValue(query as never);
    const list = jest.fn().mockResolvedValue({ data: [{ name: 'kyc-new.jpg' }], error: null });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ list } as never);
    const rpc = jest
      .spyOn(supabase, 'rpc')
      .mockResolvedValue({ data: [pending], error: null } as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-6' },
      payload: {
        userId: 'user-6',
        fullLegalName: 'Asha Rao',
        phoneNumber: '9876543210',
        selfiePath: 'user-6/kyc-new.jpg',
        termsAccepted: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(from).toHaveBeenCalledWith('creator_kyc_records');
    expect(rpc).toHaveBeenCalledWith('resubmit_creator_kyc_record', {
      p_record_id: 'kyc-row-6',
      p_user_id: 'user-6',
      p_full_legal_name: 'Asha Rao',
      p_phone_number: '919876543210',
      p_selfie_path: 'user-6/kyc-new.jpg',
    });
    expect(JSON.parse(response.payload)).toMatchObject({
      resubmitted: true,
      record: { status: 'pending' },
    });
  });

  it('rejects a selfie object path owned by another account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-4' },
      payload: {
        userId: 'user-4',
        fullLegalName: 'Asha Rao',
        phoneNumber: '9876543210',
        selfiePath: 'user-5/kyc-test.jpg',
        termsAccepted: true,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).code).toBe('INVALID_SELFIE_PATH');
  });
});
