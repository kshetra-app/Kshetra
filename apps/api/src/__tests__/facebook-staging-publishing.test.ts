import {
  FacebookRequestRejected,
  connectFacebookStagingPage,
  facebookAuthorizationUrl,
  facebookLoginState,
  getFacebookStagingConfig,
  getFacebookVideoPublication,
  hashFacebookLoginState,
  openFacebookToken,
  publishFacebookPageContent,
  publishFacebookStagingTest,
  sealFacebookToken,
  type FacebookStagingConfig,
} from '../providers/facebookStagingProvider';

const config: FacebookStagingConfig = {
  appId: '12345',
  appSecret: 'isolated-unit-test-secret',
  loginConfigId: '23456',
  pageId: '34567',
  credentialKey: Buffer.alloc(32, 8),
  redirectUri: 'https://kshetra-api-staging.up.railway.app/api/v1/campaign/facebook/callback',
};

afterEach(() => jest.restoreAllMocks());

describe('Facebook Staging publishing', () => {
  it('binds authorization to the configured app, configuration, callback and single-use state', () => {
    const state = facebookLoginState();
    const url = new URL(facebookAuthorizationUrl(config, state));
    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('config_id')).toBe(config.loginConfigId);
    expect(url.searchParams.get('client_id')).toBe(config.appId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('state')).toBe(state);
    expect(hashFacebookLoginState(state)).toMatch(/^[a-f0-9]{64}$/);
    expect(url.href).not.toContain(config.appSecret);
  });

  it('keeps the provider disabled on Production even when all Facebook settings are present', () => {
    const names = [
      'SUPABASE_URL',
      'FACEBOOK_APP_ID',
      'FACEBOOK_APP_SECRET',
      'FACEBOOK_LOGIN_CONFIG_ID',
      'FACEBOOK_STAGING_PAGE_ID',
      'FACEBOOK_CREDENTIAL_KEY',
    ] as const;
    const before = names.map((name) => process.env[name]);
    try {
      const values = [
        'https://ehfafcnimmjusyvplbah.supabase.co',
        config.appId,
        config.appSecret,
        config.loginConfigId,
        config.pageId,
        config.credentialKey.toString('hex'),
      ];
      names.forEach((name, index) => {
        process.env[name] = values[index];
      });
      expect(getFacebookStagingConfig()).toBeNull();
      process.env.SUPABASE_URL = 'https://fkpigozcqnmcvofuksar.supabase.co';
      expect(getFacebookStagingConfig()?.pageId).toBe(config.pageId);
    } finally {
      names.forEach((name, index) => {
        if (before[index] === undefined) delete process.env[name];
        else process.env[name] = before[index];
      });
    }
  });

  it('binds encrypted credentials to the application, campaign and Page', () => {
    const encrypted = sealFacebookToken(config, 'workspace-one', 'isolated-page-token');
    expect(encrypted).not.toContain('isolated-page-token');
    expect(openFacebookToken(config, 'workspace-one', encrypted)).toBe('isolated-page-token');
    expect(() => openFacebookToken(config, 'workspace-two', encrypted)).toThrow();
    expect(() =>
      openFacebookToken({ ...config, pageId: '45678' }, 'workspace-one', encrypted),
    ).toThrow();
    expect(() =>
      openFacebookToken({ ...config, appId: '45678' }, 'workspace-one', encrypted),
    ).toThrow();
  });

  it('accepts the intended Page only when its Page credential confirms the same identity', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ access_token: 'short-token' }))
      .mockResolvedValueOnce(Response.json({ access_token: 'long-token' }))
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: '9999',
              name: 'Unrelated Page',
              access_token: 'unrelated',
              tasks: ['CREATE_CONTENT'],
            },
            {
              id: config.pageId,
              name: 'Staging Test Page',
              access_token: 'page-token',
              tasks: ['CREATE_CONTENT'],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ id: config.pageId }));
    await expect(connectFacebookStagingPage(config, 'one-time-code')).resolves.toEqual({
      name: 'Staging Test Page',
      token: 'page-token',
    });
  });

  it('declines the connection when the granted Page credential identifies another Page', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ access_token: 'short-token' }))
      .mockResolvedValueOnce(Response.json({ access_token: 'long-token' }))
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: config.pageId,
              name: 'Staging Test Page',
              access_token: 'wrong-token',
              tasks: ['CREATE_CONTENT'],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ id: '9999' }));
    await expect(connectFacebookStagingPage(config, 'one-time-code')).rejects.toThrow(
      'did not grant publishing access',
    );
  });

  it('sends the test message to the configured Page and returns the provider receipt', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ id: '34567_1234' }));
    await expect(publishFacebookStagingTest(config, 'page-token')).resolves.toBe('34567_1234');
    const [url, init] = fetcher.mock.calls[0];
    expect((url as URL).pathname).toBe('/v27.0/34567/feed');
    expect(init?.method).toBe('POST');
    expect((init?.body as URLSearchParams).get('message')).toContain('Poligram Staging test.');
  });

  it('records a photo post receipt separately from the uploaded photo ID', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ id: '1234', post_id: '34567_1235' }));
    await expect(
      publishFacebookPageContent(config, 'page-token', {
        message: 'Photo caption',
        media: { type: 'image', signedUrl: 'https://storage.example.test/signed' },
      }),
    ).resolves.toBe('34567_1235');
    const [url, request] = fetcher.mock.calls[0];
    expect((url as URL).pathname).toBe('/v27.0/34567/photos');
    expect((request?.body as URLSearchParams).get('caption')).toBe('Photo caption');
    expect((request?.body as URLSearchParams).get('url')).toBe(
      'https://storage.example.test/signed',
    );
  });

  it('waits for Facebook to confirm a video is published', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ id: '1234' }))
      .mockResolvedValueOnce(
        Response.json({ id: '1234', status: { video_status: 'ready' }, published: false }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: '1234', status: { video_status: 'ready' }, published: true }),
      );
    await expect(
      publishFacebookPageContent(config, 'page-token', {
        message: 'Video caption',
        media: { type: 'video', signedUrl: 'https://storage.example.test/signed' },
      }),
    ).resolves.toBe('1234');
    expect((fetcher.mock.calls[0][0] as URL).pathname).toBe('/v27.0/34567/videos');
    await expect(getFacebookVideoPublication(config, 'page-token', '1234')).resolves.toBe(
      'processing',
    );
    await expect(getFacebookVideoPublication(config, 'page-token', '1234')).resolves.toBe(
      'published',
    );
  });

  it('distinguishes a provider rejection from an uncertain publication result', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ error: { code: 190 } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({}, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({ error: { code: 100, is_transient: true } }, { status: 400 }),
      );
    await expect(publishFacebookStagingTest(config, 'page-token')).rejects.toMatchObject({
      expiredAuthorization: true,
    });
    await expect(publishFacebookStagingTest(config, 'page-token')).rejects.toThrow('receipt');
    const uncertain = await publishFacebookStagingTest(config, 'page-token').catch(
      (error: unknown) => error,
    );
    expect(uncertain).toBeInstanceOf(Error);
    expect(uncertain).not.toBeInstanceOf(FacebookRequestRejected);
  });
});
