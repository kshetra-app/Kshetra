describe('mobile deployed environment policy', () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalExpoPublicAppEnv = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    if (originalAppEnv === undefined) delete env.APP_ENV;
    else env.APP_ENV = originalAppEnv;
    if (originalNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalNodeEnv;
    if (originalExpoPublicAppEnv === undefined) delete env.EXPO_PUBLIC_APP_ENV;
    else env.EXPO_PUBLIC_APP_ENV = originalExpoPublicAppEnv;
  });

  it('keeps staging in live mode while preserving the production distinction', () => {
    const env = process.env as Record<string, string | undefined>;
    env.EXPO_PUBLIC_APP_ENV = 'staging';
    env.APP_ENV = 'staging';
    env.NODE_ENV = 'test';
    let config: typeof import('../lib/environment') | undefined;
    jest.isolateModules(() => {
      config = require('../lib/environment');
    });

    expect(config?.IS_STAGING).toBe(true);
    expect(config?.IS_PRODUCTION).toBe(false);
    expect(config?.IS_LIVE_ENVIRONMENT).toBe(true);
  });

  it('keeps development and isolated test modes available for demo behavior', () => {
    const env = process.env as Record<string, string | undefined>;
    env.EXPO_PUBLIC_APP_ENV = 'development';
    env.APP_ENV = 'development';
    env.NODE_ENV = 'test';
    let development: typeof import('../lib/environment') | undefined;
    jest.isolateModules(() => {
      development = require('../lib/environment');
    });
    expect(development?.IS_LIVE_ENVIRONMENT).toBe(false);

    env.EXPO_PUBLIC_APP_ENV = 'test';
    env.APP_ENV = 'test';
    env.NODE_ENV = 'test';
    let test: typeof import('../lib/environment') | undefined;
    jest.isolateModules(() => {
      test = require('../lib/environment');
    });
    expect(test?.IS_LIVE_ENVIRONMENT).toBe(false);
  });

  it('fails closed when a live runtime marker conflicts with a development app marker', () => {
    const env = process.env as Record<string, string | undefined>;
    env.EXPO_PUBLIC_APP_ENV = 'development';
    env.APP_ENV = 'development';
    env.NODE_ENV = 'production';
    let config: typeof import('../lib/environment') | undefined;
    jest.isolateModules(() => {
      config = require('../lib/environment');
    });
    expect(config?.IS_LIVE_ENVIRONMENT).toBe(true);
  });
});
