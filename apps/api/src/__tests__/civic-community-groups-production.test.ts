describe('Civic community groups production persistence', () => {
  const originalAppEnv = process.env.APP_ENV;
  const rpc = jest.fn();
  let service: any;

  beforeAll(() => {
    process.env.APP_ENV = 'production';
    jest.resetModules();
    jest.doMock('../lib/supabase', () => ({
      supabase: { rpc },
      isSupabaseConfigured: true,
      isUsingServiceRole: true,
    }));
    const { CivicService } = require('../services/civicService');
    service = new CivicService();
  });

  afterEach(() => rpc.mockReset());

  afterAll(() => {
    jest.dontMock('../lib/supabase');
    jest.resetModules();
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
  });

  it('creates a durable group through the atomic database function', async () => {
    rpc.mockResolvedValue({
      data: [{
        id: 'group-1',
        name: 'Road Safety',
        slug: 'road-safety-ts-ac-1',
        constituency_id: 'TS-AC-1',
        category: 'roads',
        created_by: 'user-1',
        member_count: 1,
        is_active: true,
        created_at: '2026-11-08T00:00:00.000Z',
        updated_at: '2026-11-08T00:00:00.000Z',
      }],
      error: null,
    });

    const group = await service.createGroup({
      name: 'Road Safety',
      constituencyId: 'TS-AC-1',
      category: 'roads',
      mandal: 'North',
    }, 'user-1');

    expect(rpc).toHaveBeenCalledWith('create_civic_community_group', expect.objectContaining({
      p_name: 'Road Safety',
      p_constituency_id: 'TS-AC-1',
      p_mandal: 'North',
      p_created_by: 'user-1',
    }));
    expect(group.memberCount).toBe(1);
    expect(group.createdBy).toBe('user-1');
  });

  it('does not report a join as successful when the database rejects it', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'GROUP_NOT_FOUND' } });

    await expect(service.joinGroup('missing-group', 'user-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    expect(rpc).toHaveBeenCalledWith('join_civic_community_group', {
      p_group_id: 'missing-group',
      p_user_id: 'user-1',
    });
  });

  it('reports a duplicate group slug as a conflict', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value' } });

    await expect(service.createGroup({
      name: 'Road Safety',
      constituencyId: 'TS-AC-1',
      category: 'roads',
    }, 'user-1')).rejects.toMatchObject({
      code: 'COMMUNITY_GROUP_SLUG_CONFLICT',
      statusCode: 409,
    });
  });

  it('keeps the last group admin from leaving', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'LAST_GROUP_ADMIN' } });

    await expect(service.leaveGroup('group-1', 'admin-1')).rejects.toMatchObject({
      code: 'LAST_GROUP_ADMIN',
      statusCode: 409,
    });
  });
});
