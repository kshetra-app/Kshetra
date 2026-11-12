import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';

describe('API runtime environment policy', () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalExpoPublicAppEnv = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalExpoPublicAppEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = originalExpoPublicAppEnv;
  });

  it('treats staging and preview as production-like even when Node is running in production mode', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    process.env.APP_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    expect(isProductionLikeRuntime()).toBe(true);

    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    process.env.APP_ENV = 'preview';
    expect(isProductionLikeRuntime()).toBe(true);
  });

  it('fails closed when environment markers conflict and allows isolated test mode', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.APP_ENV = 'development';
    process.env.NODE_ENV = 'production';
    expect(isProductionLikeRuntime()).toBe(true);

    process.env.EXPO_PUBLIC_APP_ENV = 'test';
    process.env.APP_ENV = 'test';
    process.env.NODE_ENV = 'test';
    expect(isProductionLikeRuntime()).toBe(false);
  });
});
