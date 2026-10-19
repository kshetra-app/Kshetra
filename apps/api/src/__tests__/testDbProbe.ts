import { execSync } from 'node:child_process';

/**
 * Determines whether a local Supabase / PostgreSQL test database container
 * is running and accepting connections on the specified port.
 *
 * In CI without a background database service, returns false fail-closed.
 * When INTEGRATION_TESTS_ENABLED === 'true', assumes infrastructure is present.
 */
export function isLocalDatabaseAvailable(host = '127.0.0.1', port = 54321): boolean {
  if (process.env.INTEGRATION_TESTS_ENABLED === 'true') {
    return true;
  }
  if (process.env.CI && !process.env.INTEGRATION_TESTS_ENABLED) {
    return false;
  }
  try {
    const probe = `
      const net = require('net');
      const socket = new net.Socket();
      socket.setTimeout(400);
      socket.on('connect', () => { socket.destroy(); process.exit(0); });
      socket.on('timeout', () => { socket.destroy(); process.exit(1); });
      socket.on('error', () => { socket.destroy(); process.exit(1); });
      socket.connect(${port}, '${host}');
    `;
    execSync(`node -e "${probe.replace(/\r?\n/g, ' ')}"`, { stdio: 'ignore', timeout: 800 });
    return true;
  } catch {
    return false;
  }
}
