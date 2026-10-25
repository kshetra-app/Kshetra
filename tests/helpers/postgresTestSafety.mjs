/**
 * Safety Guard by Construction for PostgreSQL Integration Testing
 *
 * Implements strict runtime validation preventing accidental execution of destructive
 * SQL (table drops, DDL migrations, state mutations) against any non-local or non-test database:
 *
 * 1. Requires explicit environment opt-in (ENABLE_JOB023_POSTGRES_INTEGRATION=true)
 * 2. Strict host verification: host MUST be strictly loopback (127.0.0.1, localhost, [::1])
 * 3. Rejects all cloud/managed hosts (Supabase, AWS RDS, Railway, Neon, etc.)
 * 4. Dedicated test database requirement: strictly 'job023_delimitation_test' or 'job023_disposable_*'
 * 5. Prohibits production / default database names ('postgres', 'kshetra', 'staging', 'production', etc.)
 * 6. Live server identity check: queries SELECT current_database(), inet_server_addr() before any DDL
 */

export class PostgresSafetyError extends Error {
  constructor(message) {
    super(`[POSTGRES_SAFETY_VIOLATION] ${message}`);
    this.name = 'PostgresSafetyError';
  }
}

const DISALLOWED_HOST_PATTERNS = [
  /supabase/i,
  /aws/i,
  /rds/i,
  /railway/i,
  /neon\.tech/i,
  /render\.com/i,
  /cockroach/i,
  /heroku/i,
  /azure/i,
  /gcp/i,
  /cloud/i,
];

const DISALLOWED_DB_NAMES = new Set([
  'postgres',
  'template0',
  'template1',
  'defaultdb',
  'kshetra',
  'staging',
  'production',
  'prod',
  'master',
  'main',
]);

const ALLOWED_DB_REGEX = /^(job023_delimitation_test|job023_disposable_[a-z0-9_]+)$/;

/**
 * Validates connection string static attributes without making any network connection
 */
export function validatePostgresTestUrl(urlStr, env = process.env) {
  // 1. Opt-in check
  const optIn = env.ENABLE_JOB023_POSTGRES_INTEGRATION;
  if (optIn !== 'true' && optIn !== '1') {
    throw new PostgresSafetyError(
      'PostgreSQL server integration tests are disabled by default. Set ENABLE_JOB023_POSTGRES_INTEGRATION=true to opt in.'
    );
  }

  if (!urlStr || typeof urlStr !== 'string') {
    throw new PostgresSafetyError('A valid PostgreSQL connection string must be provided');
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    throw new PostgresSafetyError(`Malformed database connection string: ${err.message}`);
  }

  // 2. Protocol check
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new PostgresSafetyError(`Invalid protocol '${parsed.protocol}'. Expected 'postgresql:' or 'postgres:'`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Cloud / remote host blacklist
  for (const pattern of DISALLOWED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new PostgresSafetyError(
        `Cloud/remote managed database host '${hostname}' is strictly forbidden in integration tests.`
      );
    }
  }

  // 4. Strict loopback requirement
  const isLoopback =
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]';

  if (!isLoopback) {
    throw new PostgresSafetyError(
      `Database host '${hostname}' is not a local loopback address (127.0.0.1, localhost, [::1]). Integration tests must run only against an isolated local test container.`
    );
  }

  // 5. Database name verification
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) {
    throw new PostgresSafetyError('Database name is missing from connection string');
  }

  if (DISALLOWED_DB_NAMES.has(dbName.toLowerCase())) {
    throw new PostgresSafetyError(
      `Database name '${dbName}' is a reserved/production/default name and is prohibited for destructive tests.`
    );
  }

  if (!ALLOWED_DB_REGEX.test(dbName)) {
    throw new PostgresSafetyError(
      `Database name '${dbName}' does not match required dedicated test pattern 'job023_delimitation_test' or 'job023_disposable_*'`
    );
  }

  return {
    hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: dbName,
    username: parsed.username || 'postgres',
  };
}

/**
 * Validates live server identity against connected pool/client before destructive DDL
 */
export async function verifyLiveServerIdentity(poolOrClient, expectedDbName) {
  const result = await poolOrClient.query(`
    SELECT
      current_database() AS db_name,
      current_user AS db_user,
      inet_server_addr()::text AS server_addr,
      inet_server_port() AS server_port,
      version() AS server_version;
  `);

  if (!result.rows || result.rows.length === 0) {
    throw new PostgresSafetyError('Failed to retrieve live server identity from database');
  }

  const live = result.rows[0];

  // 1. Database name check
  if (live.db_name !== expectedDbName) {
    throw new PostgresSafetyError(
      `Live database name mismatch: connected to '${live.db_name}', expected dedicated test database '${expectedDbName}'`
    );
  }

  if (!ALLOWED_DB_REGEX.test(live.db_name)) {
    throw new PostgresSafetyError(
      `Live database '${live.db_name}' is not an authorized disposable test database`
    );
  }

  // 2. Server address check (null for Unix domain sockets on localhost, otherwise loopback)
  if (live.server_addr) {
    const isLoopback =
      live.server_addr === '127.0.0.1' ||
      live.server_addr === '::1' ||
      live.server_addr === '0.0.0.0'; // Docker bridge port forward often resolves 127.0.0.1 or bridge IP

    // Ensure it's not a public internet or cloud IP
    if (!isLoopback && !live.server_addr.startsWith('172.') && !live.server_addr.startsWith('10.') && !live.server_addr.startsWith('192.168.')) {
      throw new PostgresSafetyError(
        `Live server IP '${live.server_addr}' is not a local loopback or local container address`
      );
    }
  }

  return live;
}

/**
 * Top-level guard to call before executing any destructive SQL
 */
export async function assertPostgresIntegrationSafe(poolOrClient, connectionString, env = process.env) {
  const parsedMeta = validatePostgresTestUrl(connectionString, env);
  const liveMeta = await verifyLiveServerIdentity(poolOrClient, parsedMeta.database);

  return {
    safe: true,
    parsed: parsedMeta,
    live: liveMeta,
  };
}
