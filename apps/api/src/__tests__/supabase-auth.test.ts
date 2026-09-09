import { isValidSupabaseKey } from '../lib/supabase';

describe('Supabase Authentication Key Validation (DEF-009)', () => {
  const legacyJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlnb3pjcW5tY3ZvZnVrc2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDU4NDAwMCwiZXhwIjoyMDU2MTYwMDAwfQ.signature_part_here';
  const modernSecretKey = 'sb_secret_N7UNDV1234567890abcdefghijklmnopqrst';
  const modernPublishableKey = 'sb_publishable_pub1234567890abcdefghijklmnopqr';
  const invalidKey = 'random_invalid_token_without_jwt_or_prefix';

  test('accepts legacy 3-part JWT for service role', () => {
    expect(isValidSupabaseKey(legacyJwt, 'service')).toBe(true);
  });

  test('accepts legacy 3-part JWT for anon role', () => {
    expect(isValidSupabaseKey(legacyJwt, 'anon')).toBe(true);
  });

  test('accepts modern sb_secret_ format for service role', () => {
    expect(isValidSupabaseKey(modernSecretKey, 'service')).toBe(true);
  });

  test('accepts modern sb_secret_ format for anon role fallback', () => {
    expect(isValidSupabaseKey(modernSecretKey, 'anon')).toBe(true);
  });

  test('accepts modern sb_publishable_ format for anon role', () => {
    expect(isValidSupabaseKey(modernPublishableKey, 'anon')).toBe(true);
  });

  test('rejects modern sb_publishable_ format for service role', () => {
    expect(isValidSupabaseKey(modernPublishableKey, 'service')).toBe(false);
  });

  test('rejects malformed or invalid keys', () => {
    expect(isValidSupabaseKey(invalidKey, 'service')).toBe(false);
    expect(isValidSupabaseKey(invalidKey, 'anon')).toBe(false);
    expect(isValidSupabaseKey('', 'service')).toBe(false);
    expect(isValidSupabaseKey('   ', 'service')).toBe(false);
  });
});
