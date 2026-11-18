import { resolveApiBaseUrl, resolveSupabaseUrl } from '../lib/environment';

describe('mobile API host environment resolution', () => {
  it('uses staging for EAS preview when no explicit API host is supplied', () => {
    expect(resolveApiBaseUrl(undefined, 'preview')).toBe(
      'https://kshetra-api-staging.up.railway.app',
    );
  });

  it('uses production for production builds when no explicit API host is supplied', () => {
    expect(resolveApiBaseUrl(undefined, 'production')).toBe(
      'https://kshetra-api-production-b802.up.railway.app',
    );
  });

  it('keeps an explicit host override and removes an older /api/v1 suffix', () => {
    expect(resolveApiBaseUrl('https://api.example.test/api/v1/', 'preview')).toBe(
      'https://api.example.test',
    );
  });

  it('keeps local development on the development API host', () => {
    expect(resolveApiBaseUrl(undefined, 'development')).toBe('http://localhost:3001');
  });

  it('uses the staging Supabase project for EAS preview builds', () => {
    expect(resolveSupabaseUrl(undefined, 'preview')).toBe(
      'https://fkpigozcqnmcvofuksar.supabase.co',
    );
  });

  it('uses the production Supabase project for production builds', () => {
    expect(resolveSupabaseUrl(undefined, 'production')).toBe(
      'https://ehfafcnimmjusyvplbah.supabase.co',
    );
  });

  it('normalizes explicit Supabase URL overrides', () => {
    expect(resolveSupabaseUrl('https://project.supabase.co/', 'preview')).toBe(
      'https://project.supabase.co',
    );
  });
});
