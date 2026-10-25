#!/usr/bin/env node
import { URL } from 'node:url';

const analysisMode = process.argv.includes('--analysis') || process.env.MOBILE_BUILD_MODE === 'analysis';
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
const failures = [];

function parseHttpsUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') failures.push(`${label} must use HTTPS outside local development.`);
    if (!parsed.hostname || /placeholder|example\.invalid|test-fixture/i.test(parsed.hostname)) {
      failures.push(`${label} must not point to a placeholder/test endpoint in release mode.`);
    }
    return parsed;
  } catch {
    failures.push(`${label} must be a valid absolute URL.`);
    return null;
  }
}

if (analysisMode) {
  if (process.env.CI !== 'true') failures.push('Analysis fixture is allowed only in an automated CI job (CI=true).');
  if (supabaseUrl !== 'https://test-fixture.supabase.co') failures.push('Analysis mode requires the isolated test-fixture Supabase URL.');
  if (anonKey !== 'test-analysis-only-not-a-real-key') failures.push('Analysis mode requires the fixed non-secret analysis key marker.');
  if (apiUrl !== 'https://api-fixture.invalid') failures.push('Analysis mode requires a non-routable .invalid API endpoint.');
} else {
  const parsedSupabase = parseHttpsUrl(supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL');
  const parsedApi = parseHttpsUrl(apiUrl, 'EXPO_PUBLIC_API_URL');
  if (!anonKey || /placeholder|service.?role|sb_secret_|dummy_signature|test-analysis-only/i.test(anonKey)) {
    failures.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is empty, placeholder, test-only, or a privileged service-role secret.');
  }
  if (anonKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') failures.push('A service_role JWT must never be embedded in a mobile application.');
    } catch {
      failures.push('JWT-form mobile Supabase key cannot be decoded for role safety verification.');
    }
  }
  const profile = (process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || process.env.EAS_BUILD_PROFILE || '').toLowerCase();
  if (profile === 'preview' && parsedApi?.hostname.includes('production')) {
    failures.push('Preview builds must use staging, not a production API endpoint.');
  }
  if (parsedSupabase && parsedApi && parsedSupabase.hostname === parsedApi.hostname) {
    failures.push('Supabase and API must be separate configured service endpoints.');
  }
}

if (failures.length) {
  console.error(`MOBILE_RUNTIME_CONFIG_GATE: FAIL (${analysisMode ? 'analysis' : 'release'})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(
  analysisMode
    ? 'MOBILE_RUNTIME_CONFIG_GATE: PASS — CI-only, non-routable fixture; this build is not a release artifact.'
    : 'MOBILE_RUNTIME_CONFIG_GATE: PASS — public client config valid; no server-only key detected.'
);
