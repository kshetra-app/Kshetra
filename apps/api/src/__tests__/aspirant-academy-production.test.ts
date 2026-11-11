describe('Leadership Academy production persistence', () => {
  const originalAppEnv = process.env.APP_ENV;
  const rpc = jest.fn();
  const calls: Array<{ table: string; operation: string; args: any[] }> = [];
  const moduleRow = {
    id: '10000000-0000-4000-8000-000000000001',
    title: 'How Indian Elections Work',
  };
  const aspirantProfileRow = {
    id: '20000000-0000-4000-8000-000000000001',
    user_id: 'user-1',
    display_name: 'Verified Test Profile',
    state_code: 'TS',
    target_election_year: null,
    party_affiliation: null,
    is_independent: true,
    civic_score: 12,
    issues_reported: 2,
    issues_resolved: 1,
    comments_count: 3,
    evidence_submitted: 4,
    promises_tracked: 5,
    community_endorsements: 6,
    modules_completed: 7,
    challenges_completed: 8,
    is_public: true,
  };
  const challengeRows = [
    {
      id: 'challenge-ts',
      title: 'Local service day',
      description: 'Join a local service day.',
      category: 'community',
      points: 10,
      target_count: 1,
      state_code: 'TS',
      is_active: true,
      starts_at: '2024-01-01T00:00:00.000Z',
      ends_at: null,
    },
    {
      id: 'challenge-ap',
      title: 'Regional listening',
      description: 'Listen to local residents.',
      category: 'civic',
      points: 5,
      target_count: 2,
      state_code: 'AP',
      is_active: true,
      starts_at: '2024-01-01T00:00:00.000Z',
      ends_at: null,
    },
    {
      id: 'challenge-national',
      title: 'Public records guide',
      description: 'Read a public records guide.',
      category: 'awareness',
      points: 2,
      target_count: 1,
      state_code: null,
      is_active: true,
      starts_at: '2024-01-01T00:00:00.000Z',
      ends_at: null,
    },
  ];
  const serviceResult = (table: string) => {
    if (table === 'leadership_modules') return { data: [moduleRow], error: null };
    if (table === 'module_progress')
      return { data: [{ module_id: moduleRow.id, completed: true, quiz_score: 100 }], error: null };
    if (table === 'module_quiz_attempts') return { data: { score_percentage: 100 }, error: null };
    if (table === 'civic_badges')
      return {
        data: [{ badge_type: 'election_scholar', earned_at: '2026-11-08T00:00:00.000Z' }],
        error: null,
      };
    if (table === 'community_challenges') return { data: challengeRows, error: null };
    if (table === 'challenge_participation')
      return {
        data: [
          {
            challenge_id: 'challenge-ts',
            progress: 1,
            completed: true,
            completed_at: '2026-11-07T00:00:00.000Z',
            evidence_url: 'https://example.test/evidence',
          },
        ],
        error: null,
      };
    return { data: null, error: null };
  };
  let service: any;

  beforeAll(() => {
    process.env.APP_ENV = 'production';
    jest.resetModules();
    jest.doMock('../lib/supabase', () => ({
      supabase: {
        from: (table: string) => {
          const query: any = {
            select: (...args: any[]) => {
              calls.push({ table, operation: 'select', args });
              return query;
            },
            eq: (...args: any[]) => {
              calls.push({ table, operation: 'eq', args });
              return query;
            },
            in: (...args: any[]) => {
              calls.push({ table, operation: 'in', args });
              return query;
            },
            lte: (...args: any[]) => {
              calls.push({ table, operation: 'lte', args });
              return query;
            },
            order: (...args: any[]) => {
              calls.push({ table, operation: 'order', args });
              return query;
            },
            limit: (...args: any[]) => {
              calls.push({ table, operation: 'limit', args });
              return query;
            },
            maybeSingle: async () =>
              table === 'leadership_modules'
                ? { data: moduleRow, error: null }
                : table === 'module_quiz_attempts'
                  ? { data: { score_percentage: 100 }, error: null }
                  : table === 'aspirant_profiles'
                    ? { data: aspirantProfileRow, error: null }
                    : { data: null, error: null },
            upsert: async (...args: any[]) => {
              calls.push({ table, operation: 'upsert', args });
              return { error: null };
            },
            then: (resolve: any, reject: any) =>
              Promise.resolve(serviceResult(table)).then(resolve, reject),
          };
          return query;
        },
        rpc,
      },
      isSupabaseConfigured: true,
      isUsingServiceRole: true,
    }));
    const { AspirantService } = require('../services/aspirantService');
    service = AspirantService;
  });

  afterEach(() => {
    rpc.mockReset();
    calls.length = 0;
  });

  afterAll(() => {
    jest.dontMock('../lib/supabase');
    jest.resetModules();
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
  });

  it('lists only database-backed modules and excludes quiz answer keys', async () => {
    const modules = await service.listAcademyModules('user-1');

    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('mod-1');
    expect(modules[0].completed).toBe(true);
    expect(modules[0].quiz[0]).toMatchObject({ id: 'q1-1', question: expect.any(String) });
    expect(modules[0].quiz[0]).not.toHaveProperty('correctIndex');
    expect(modules[0].quiz[0]).not.toHaveProperty('explanation');
  });

  it('persists progress using the database UUID behind the stable module key', async () => {
    await service.startModule('user-1', 'mod-1');

    const write = calls.find(
      (call) => call.table === 'module_progress' && call.operation === 'upsert',
    );
    expect(write?.args[0]).toMatchObject({ user_id: 'user-1', module_id: moduleRow.id });
  });

  it('rehydrates earned badges from durable badge rows', async () => {
    await expect(service.listAcademyBadges('user-1')).resolves.toEqual([
      { badgeType: 'election_scholar', earnedAt: '2026-11-08T00:00:00.000Z' },
    ]);
  });

  it('loads the authenticated profile without inventing a missing election year', async () => {
    const profile = await service.getMyProfile('user-1');

    expect(profile).toMatchObject({
      id: aspirantProfileRow.id,
      userId: 'user-1',
      displayName: 'Verified Test Profile',
      stateCode: 'TS',
      civicScore: 12,
      commentsCount: 3,
      evidenceSubmitted: 4,
      promisesTracked: 5,
      challengesCompleted: 8,
      isPublic: true,
    });
    expect(profile.targetElectionYear).toBeUndefined();
    expect(profile.partyAffiliation).toBeUndefined();
  });

  it('lists national and matching-state challenges with persisted participation', async () => {
    const result = await service.listAcademyChallenges('user-1');

    expect(result.challenges.map((challenge: any) => challenge.id)).toEqual([
      'challenge-ts',
      'challenge-national',
    ]);
    expect(result.participation).toEqual([
      {
        challengeId: 'challenge-ts',
        progress: 1,
        completed: true,
        completedAt: '2026-11-07T00:00:00.000Z',
        evidenceUrl: 'https://example.test/evidence',
      },
    ]);
  });

  it('keeps module and challenge catalogs available to anonymous readers', async () => {
    const Fastify = require('fastify');
    const { aspirantRoutes } = require('../routes/aspirant');
    const app = Fastify();
    await app.register(aspirantRoutes);

    const modulesResponse = await app.inject({ method: 'GET', url: '/api/v1/aspirant/modules' });
    const challengesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/challenges',
    });

    expect(modulesResponse.statusCode).toBe(200);
    expect(challengesResponse.statusCode).toBe(200);
    expect(
      JSON.parse(challengesResponse.body).challenges.map((challenge: any) => challenge.id),
    ).toEqual(['challenge-national']);
    await app.close();
  });

  it('records server-graded quiz results atomically and fails on persistence errors', async () => {
    rpc.mockResolvedValueOnce({ data: 1, error: null });
    const result = await service.submitQuiz('user-1', 'mod-1', {
      answers: [
        { questionId: 'q1-1', selectedIndex: 0 },
        { questionId: 'q1-2', selectedIndex: 0 },
      ],
    });
    expect(result.scorePercentage).toBe(100);
    expect(rpc).toHaveBeenCalledWith(
      'record_academy_quiz_result',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_module_id: moduleRow.id,
        p_score_percentage: 100,
        p_passed: true,
      }),
    );

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'database unavailable' } });
    await expect(service.submitQuiz('user-1', 'mod-1', { answers: [] })).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
      statusCode: 503,
    });
  });
});
