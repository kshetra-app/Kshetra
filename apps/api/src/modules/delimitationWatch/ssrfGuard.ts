/**
 * SSRF Guard for Delimitation Watch Source Fetcher
 *
 * Prevents Server-Side Request Forgery by strictly validating URLs:
 * - Permitted protocols: HTTP, HTTPS
 * - Rejects private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
 * - Rejects IPv6 loopback (::1), link-local, and unique local addresses
 * - Rejects non-HTTP schemes (file://, gopher://, ftp://, dict://, etc.)
 */

import { URL } from 'url';

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfSecurityError';
  }
}

/**
 * Validates a target URL against SSRF rules.
 * Throws SsrfSecurityError if the URL violates security constraints.
 */
export function validateSourceUrl(targetUrl: string, allowLocalhostForTests: boolean = false): URL {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err: any) {
    throw new SsrfSecurityError(`Invalid source URL: ${err.message}`);
  }

  // 1. Protocol validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfSecurityError(`Forbidden URL protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Allow localhost strictly if explicitly enabled for test fixtures
  if (allowLocalhostForTests && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return parsed;
  }

  // 3. Reject loopback and local domains
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new SsrfSecurityError(`SSRF Blocked: Local and loopback hostnames are strictly prohibited ('${hostname}')`);
  }

  // 4. Reject private / link-local IPv4 addresses
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);

    // 127.0.0.0/8 (Loopback)
    if (octet1 === 127) {
      throw new SsrfSecurityError(`SSRF Blocked: Loopback address prohibited ('${hostname}')`);
    }

    // 10.0.0.0/8 (RFC 1918 Private)
    if (octet1 === 10) {
      throw new SsrfSecurityError(`SSRF Blocked: Private network address prohibited ('${hostname}')`);
    }

    // 172.16.0.0/12 (RFC 1918 Private: 172.16 - 172.31)
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
      throw new SsrfSecurityError(`SSRF Blocked: Private network address prohibited ('${hostname}')`);
    }

    // 192.168.0.0/16 (RFC 1918 Private)
    if (octet1 === 192 && octet2 === 168) {
      throw new SsrfSecurityError(`SSRF Blocked: Private network address prohibited ('${hostname}')`);
    }

    // 169.254.0.0/16 (Link-Local / Cloud Metadata e.g. AWS/GCP 169.254.169.254)
    if (octet1 === 169 && octet2 === 254) {
      throw new SsrfSecurityError(`SSRF Blocked: Link-local metadata address prohibited ('${hostname}')`);
    }

    // 0.0.0.0/8 (Current network)
    if (octet1 === 0) {
      throw new SsrfSecurityError(`SSRF Blocked: Broadcast address prohibited ('${hostname}')`);
    }
  }

  // 5. Reject IPv6 private / link-local / unique local addresses
  if (
    hostname.startsWith('fe80:') || // link-local
    hostname.startsWith('fc00:') || // unique local
    hostname.startsWith('fd00:') ||
    hostname === '::'
  ) {
    throw new SsrfSecurityError(`SSRF Blocked: Private IPv6 address prohibited ('${hostname}')`);
  }

  return parsed;
}
