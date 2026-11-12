import { execFileSync } from 'node:child_process';

/**
 * Determines whether the local Supabase data API can answer a read-only query
 * against the test schema. A listening TCP port alone is not sufficient: the
 * Docker Desktop proxy can accept connections while the API/database is down.
 *
 * In CI without a background database service, returns false fail-closed.
 * When INTEGRATION_TESTS_ENABLED === 'true', assumes infrastructure is present.
 */
export function isLocalDatabaseAvailable(host = '127.0.0.1', port = 54321): boolean {
  const allowedLocalHosts = ['localhost', '127.0.0.1', '::1'];
  if (!allowedLocalHosts.includes(host)) return false;

  let configuredHost = '';
  let configuredUrl: URL;
  try {
    configuredUrl = new URL(process.env.SUPABASE_URL || '');
    configuredHost = configuredUrl.hostname;
  } catch {
    return false;
  }
  if (!allowedLocalHosts.includes(configuredHost)) return false;

  if (process.env.INTEGRATION_TESTS_ENABLED === 'true') {
    return true;
  }
  if (process.env.CI && !process.env.INTEGRATION_TESTS_ENABLED) {
    return false;
  }
  const configuredPort = Number(
    configuredUrl.port || (configuredUrl.protocol === 'https:' ? 443 : 80),
  );
  if (configuredPort !== port) return false;

  try {
    const probe = `
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!key) process.exit(1);
      const url = new URL('/rest/v1/user_profiles?select=user_id&limit=0', process.env.SUPABASE_URL);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 900);
      fetch(url, {
        headers: { apikey: key, authorization: 'Bearer ' + key },
        signal: controller.signal,
      }).then((response) => process.exit(response.ok ? 0 : 1))
        .catch(() => process.exit(1));
    `;
    execFileSync(process.execPath, ['-e', probe], {
      stdio: 'ignore',
      timeout: 1_200,
    });
    return true;
  } catch {
    return false;
  }
}
