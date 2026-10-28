import {
  resolveEnvironment,
  getEnvironmentConfig,
  ENVIRONMENT_CONFIGS,
} from '../config/environments';
import { representativeToProfile, OFFICE_TYPE_CONFIG } from '../types/hierarchy';
import type { Representative } from '../types/hierarchy';

describe('Environment Configuration & Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolves explicit environment strings accurately', () => {
    expect(resolveEnvironment('production')).toBe('production');
    expect(resolveEnvironment('PROD')).toBe('production');
    expect(resolveEnvironment('staging')).toBe('staging');
    expect(resolveEnvironment('STAGE')).toBe('staging');
    expect(resolveEnvironment('preview')).toBe('staging');
    expect(resolveEnvironment('test')).toBe('test');
    expect(resolveEnvironment('development')).toBe('development');
    expect(resolveEnvironment('unknown_env')).toBe('development');
  });

  it('resolves environment from process.env when argument is undefined', () => {
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    expect(resolveEnvironment()).toBe('production');

    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    expect(resolveEnvironment()).toBe('staging');

    delete process.env.EXPO_PUBLIC_APP_ENV;
    process.env.APP_ENV = 'test';
    expect(resolveEnvironment()).toBe('test');

    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    expect(resolveEnvironment()).toBe('development');
  });

  it('retrieves correct config object for each environment', () => {
    const prodConfig = getEnvironmentConfig('production');
    expect(prodConfig.isProduction).toBe(true);
    expect(prodConfig.isStaging).toBe(false);
    expect(prodConfig.environment).toBe('production');

    const stageConfig = getEnvironmentConfig('staging');
    expect(stageConfig.isStaging).toBe(true);
    expect(stageConfig.isProduction).toBe(false);

    const devConfig = getEnvironmentConfig('development');
    expect(devConfig.isDevelopment).toBe(true);

    const testConfig = getEnvironmentConfig('test');
    expect(testConfig.environment).toBe('test');
    expect(testConfig.allowedOrigins).toEqual(['*']);
  });
});

describe('Hierarchy Type Utilities', () => {
  it('maps representative row to unified profile using OFFICE_TYPE_CONFIG', () => {
    const rep: Representative = {
      id: 'REP-1',
      jurisdictionType: 'urban_local_body',
      jurisdictionId: 'ULB-1',
      officeType: 'mayor',
      name: 'John Doe',
      localName: 'జాన్ డో',
      party: 'INC',
      partyOfficial: true,
      isCurrent: true,
      stateCode: 'TS',
      sourceType: 'sec',
      dataStatus: 'verified',
      termStart: '2020-01-01',
    };

    const profile = representativeToProfile(rep, 'Hyderabad');
    expect(profile.id).toBe('REP-1');
    expect(profile.officeCategory).toBe('local_body');
    expect(profile.officeLabel).toBe('Mayor');
    expect(profile.name).toBe('John Doe');
  });

  it('handles unknown officeType gracefully in representativeToProfile', () => {
    const rep: Representative = {
      id: 'REP-2',
      jurisdictionType: 'urban_local_body',
      jurisdictionId: 'ULB-2',
      officeType: 'custom_officer' as any,
      name: 'Jane Doe',
      partyOfficial: false,
      isCurrent: true,
      stateCode: 'TS',
      sourceType: 'sec',
      dataStatus: 'verified',
    };

    const profile = representativeToProfile(rep, 'Warangal');
    expect(profile.officeLabel).toBe('custom_officer');
  });
});
