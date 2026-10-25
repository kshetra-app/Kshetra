/**
 * apps/api/src/modules/delimitationWatch/ssrfGuard.ts
 *
 * Hardened Anti-SSRF Egress Guard for Delimitation Watch Source Fetching
 *
 * Capabilities:
 * - Scheme restrictions: strictly http: and https:
 * - Prohibits userinfo credentials in URLs
 * - Comprehensive IPv4 & IPv6 CIDR blocklist (loopback, private RFC 1918, link-local,
 *   cloud metadata 169.254.169.254, fd00:ec2::254, carrier-grade NAT, multicast, reserved)
 * - Alternate numeric IPv4 representation normalization (hex, octal, dword/integer, dotted hex/octal)
 * - IPv4-mapped IPv6 address resolution (::ffff:127.0.0.1, ::ffff:169.254.169.254)
 * - Hostname filtering (localhost, *.local, *.internal, etc.)
 * - Pre-connect DNS resolution validating EVERY returned address (mixed public/private fails closed)
 * - Connection-pinning HTTP/HTTPS agents defeating DNS rebinding (TOCTOU)
 */

import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfSecurityError';
  }
}

export interface ValidatedDestination {
  targetUrl: string;
  parsedUrl: URL;
  hostname: string;
  port: number;
  isHttps: boolean;
  resolvedIps: string[];
  pinnedIp: string;
  agent: http.Agent | https.Agent;
}

// ─── IPV4 CIDR BLOCKED RANGES ───────────────────────────────────────────────

function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + Number.parseInt(octet, 10)) >>> 0, 0);
}

function isIpv4InCidr(ipInt: number, cidrBase: string, prefixLength: number): boolean {
  const baseInt = ipv4ToInt(cidrBase);
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

const IPV4_BLOCKED_RANGES: Array<{ base: string; prefix: number; name: string }> = [
  { base: '0.0.0.0', prefix: 8, name: 'Current Network (RFC 1122)' },
  { base: '10.0.0.0', prefix: 8, name: 'Private Network (RFC 1918)' },
  { base: '100.64.0.0', prefix: 10, name: 'Carrier-Grade NAT (RFC 6598)' },
  { base: '127.0.0.0', prefix: 8, name: 'Loopback (RFC 1122)' },
  { base: '169.254.0.0', prefix: 16, name: 'Link-Local & Cloud Metadata (RFC 3927)' },
  { base: '172.16.0.0', prefix: 12, name: 'Private Network (RFC 1918)' },
  { base: '192.0.0.0', prefix: 24, name: 'IETF Protocol Assignments (RFC 6890)' },
  { base: '192.0.2.0', prefix: 24, name: 'TEST-NET-1 (RFC 5737)' },
  { base: '192.88.99.0', prefix: 24, name: '6to4 Relay Anycast (RFC 7526)' },
  { base: '192.168.0.0', prefix: 16, name: 'Private Network (RFC 1918)' },
  { base: '198.18.0.0', prefix: 15, name: 'Network Benchmark Tests (RFC 2544)' },
  { base: '198.51.100.0', prefix: 24, name: 'TEST-NET-2 (RFC 5737)' },
  { base: '203.0.113.0', prefix: 24, name: 'TEST-NET-3 (RFC 5737)' },
  { base: '224.0.0.0', prefix: 4, name: 'Multicast (RFC 5771)' },
  { base: '240.0.0.0', prefix: 4, name: 'Reserved (RFC 1112)' },
  { base: '255.255.255.255', prefix: 32, name: 'Broadcast' },
];

export function isBlockedIpv4(ip: string): { blocked: boolean; reason?: string } {
  const ipInt = ipv4ToInt(ip);
  for (const range of IPV4_BLOCKED_RANGES) {
    if (isIpv4InCidr(ipInt, range.base, range.prefix)) {
      return { blocked: true, reason: range.name };
    }
  }
  return { blocked: false };
}

// ─── IPV6 BLOCKED RANGES ────────────────────────────────────────────────────

export function isBlockedIpv6(ip: string): { blocked: boolean; reason?: string } {
  const lower = ip.toLowerCase();

  // Loopback (::1) / Unspecified (::)
  if (
    lower === '::1' ||
    lower === '::' ||
    lower === '0:0:0:0:0:0:0:1' ||
    lower === '0:0:0:0:0:0:0:0'
  ) {
    return { blocked: true, reason: 'IPv6 Loopback / Unspecified' };
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or 0:0:0:0:0:ffff:x.x.x.x)
  if (lower.startsWith('::ffff:') || lower.startsWith('0:0:0:0:0:ffff:')) {
    const parts = lower.split(':');
    const lastPart = parts[parts.length - 1];
    if (net.isIPv4(lastPart)) {
      return isBlockedIpv4(lastPart);
    }
    // Hex IPv4 mapped e.g. ::ffff:7f00:0001
    const p1 = parts[parts.length - 2];
    const p2 = parts[parts.length - 1];
    if (p1 && p2 && p1.length <= 4 && p2.length <= 4) {
      const hex = p1.padStart(4, '0') + p2.padStart(4, '0');
      const num = parseInt(hex, 16);
      if (!isNaN(num)) {
        const a = (num >> 24) & 255;
        const b = (num >> 16) & 255;
        const c = (num >> 8) & 255;
        const d = num & 255;
        return isBlockedIpv4(`${a}.${b}.${c}.${d}`);
      }
    }
    return { blocked: true, reason: 'IPv4-Mapped IPv6' };
  }

  // Link-Local (fe80::/10)
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return { blocked: true, reason: 'IPv6 Link-Local' };
  }

  // Unique-Local / Private (fc00::/7 -> fc00..fdff)
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return { blocked: true, reason: 'IPv6 Unique-Local Private' };
  }

  // Multicast (ff00::/8)
  if (lower.startsWith('ff')) {
    return { blocked: true, reason: 'IPv6 Multicast' };
  }

  // Documentation (2001:db8::/32)
  if (lower.startsWith('2001:db8') || lower.startsWith('2001:0db8')) {
    return { blocked: true, reason: 'IPv6 Documentation' };
  }

  // Discard-only (100::/64)
  if (lower.startsWith('100::')) {
    return { blocked: true, reason: 'IPv6 Discard-Only' };
  }

  // Cloud metadata targets (e.g. AWS IMDSv2 IPv6 endpoint)
  if (lower.includes('fd00:ec2::254')) {
    return { blocked: true, reason: 'IPv6 Cloud Metadata (AWS IMDSv2)' };
  }

  return { blocked: false };
}

// ─── ALTERNATE NUMERIC IPV4 PARSING & NORMALIZATION ─────────────────────────

/**
 * Parses alternate numeric IPv4 encodings into canonical dotted-decimal string.
 * Supports:
 * - 32-bit dword integers: "2130706433" -> "127.0.0.1"
 * - Hex integers: "0x7f000001" -> "127.0.0.1"
 * - Octal integers: "017700000001" -> "127.0.0.1"
 * - Dotted hex / octal: "0x7f.0.0.1", "0177.0.0.1"
 * - Fewer-part notation: "127.1" -> "127.0.0.1"
 */
export function parseAlternateIpv4(host: string): string | null {
  const trimmed = host.trim();

  // Strip brackets if IPv6 style
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return null;
  }

  // 1. Single integer / dword or single hex/octal string
  if (/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(trimmed)) {
    let val: number;
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      val = parseInt(trimmed, 16);
    } else if (trimmed.startsWith('0') && trimmed.length > 1) {
      val = parseInt(trimmed, 8);
    } else {
      val = parseInt(trimmed, 10);
    }

    if (val >= 0 && val <= 0xffffffff && !isNaN(val)) {
      const a = (val >>> 24) & 0xff;
      const b = (val >>> 16) & 0xff;
      const c = (val >>> 8) & 0xff;
      const d = val & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  // 2. Dotted parts (1 to 4 parts)
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length >= 1 && parts.length <= 4) {
      const numParts: number[] = [];
      for (const p of parts) {
        if (/^0x[0-9a-fA-F]+$/i.test(p)) {
          numParts.push(parseInt(p, 16));
        } else if (/^0[0-7]+$/.test(p) && p.length > 1) {
          numParts.push(parseInt(p, 8));
        } else if (/^[0-9]+$/.test(p)) {
          numParts.push(parseInt(p, 10));
        } else {
          return null;
        }
      }

      if (numParts.some((n) => isNaN(n) || n < 0)) return null;

      // Handle Class A (1 part), B (2 parts), C (3 parts), D (4 parts) notation
      if (numParts.length === 4) {
        if (numParts.every((n) => n <= 255)) {
          return numParts.join('.');
        }
      } else if (numParts.length === 2) {
        // e.g. 127.1 -> 127.0.0.1
        const a = numParts[0];
        const rest = numParts[1];
        if (a <= 255 && rest <= 0xffffff) {
          const b = (rest >>> 16) & 0xff;
          const c = (rest >>> 8) & 0xff;
          const d = rest & 0xff;
          return `${a}.${b}.${c}.${d}`;
        }
      } else if (numParts.length === 3) {
        // e.g. 127.0.1 -> 127.0.0.1
        const a = numParts[0];
        const b = numParts[1];
        const rest = numParts[2];
        if (a <= 255 && b <= 255 && rest <= 0xffff) {
          const c = (rest >>> 8) & 0xff;
          const d = rest & 0xff;
          return `${a}.${b}.${c}.${d}`;
        }
      }
    }
  }

  return null;
}

/**
 * Checks whether an arbitrary string representation of an IP is blocked.
 */
export function isBlockedIp(ip: string): { blocked: boolean; reason?: string } {
  const cleanIp = ip.replace(/^\[|\]$/g, '');
  // Check alternate representation
  const alt = parseAlternateIpv4(cleanIp);
  if (alt) {
    return isBlockedIpv4(alt);
  }

  if (net.isIPv4(cleanIp)) {
    return isBlockedIpv4(cleanIp);
  }
  if (net.isIPv6(cleanIp)) {
    return isBlockedIpv6(cleanIp);
  }

  return { blocked: false };
}

export function isPrivateOrRestrictedIp(ip: string): boolean {
  return isBlockedIp(ip).blocked;
}

// ─── PRE-CONNECT DNS RESOLUTION & DESTINATION PINNING ───────────────────────

export async function resolveAndValidateDns(
  hostname: string,
  options: {
    mockDnsResolver?: (host: string) => Promise<string[]>;
    allowLocalhostInTest?: boolean;
  } = {}
): Promise<{ resolvedIps: string[]; pinnedIp: string }> {
  // Check if hostname is an IP directly (including hex, octal, dword)
  const altIp = parseAlternateIpv4(hostname);
  if (altIp) {
    const check = isBlockedIpv4(altIp);
    if (check.blocked) {
      if (options.allowLocalhostInTest && (altIp === '127.0.0.1' || altIp.startsWith('127.'))) {
        return { resolvedIps: [altIp], pinnedIp: altIp };
      }
      throw new SsrfSecurityError(`SSRF Blocked: IP address '${hostname}' (${altIp}) is in prohibited range (${check.reason})`);
    }
    return { resolvedIps: [altIp], pinnedIp: altIp };
  }

  if (net.isIPv4(hostname)) {
    const check = isBlockedIpv4(hostname);
    if (check.blocked) {
      if (options.allowLocalhostInTest && (hostname === '127.0.0.1' || hostname.startsWith('127.'))) {
        return { resolvedIps: [hostname], pinnedIp: hostname };
      }
      throw new SsrfSecurityError(`SSRF Blocked: IPv4 address '${hostname}' is in prohibited range (${check.reason})`);
    }
    return { resolvedIps: [hostname], pinnedIp: hostname };
  }

  if (net.isIPv6(hostname)) {
    const check = isBlockedIpv6(hostname);
    if (check.blocked) {
      if (options.allowLocalhostInTest && (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1')) {
        return { resolvedIps: [hostname], pinnedIp: hostname };
      }
      throw new SsrfSecurityError(`SSRF Blocked: IPv6 address '${hostname}' is in prohibited range (${check.reason})`);
    }
    return { resolvedIps: [hostname], pinnedIp: hostname };
  }

  // Pre-connect DNS lookup
  let records: string[] = [];
  if (options.mockDnsResolver) {
    records = await options.mockDnsResolver(hostname);
  } else {
    try {
      const lookupResults = await dns.lookup(hostname, { all: true, verbatim: true });
      records = lookupResults.map((r) => r.address);
    } catch (err: any) {
      throw new SsrfSecurityError(`DNS resolution failed for hostname '${hostname}': ${err.message}`);
    }
  }

  if (!records || records.length === 0) {
    throw new SsrfSecurityError(`DNS resolution failed: Hostname '${hostname}' returned zero IP addresses`);
  }

  // Enforce: Validate EVERY returned IP. If ANY address is blocked, fail closed!
  for (const ip of records) {
    const check = isBlockedIp(ip);
    if (check.blocked) {
      if (options.allowLocalhostInTest && (ip === '127.0.0.1' || ip === '::1')) {
        continue;
      }
      throw new SsrfSecurityError(
        `SSRF Blocked: Hostname '${hostname}' resolved to blocked private or reserved IP address (${ip} - ${check.reason})`
      );
    }
  }

  // Pin destination to first validated IP
  return {
    resolvedIps: records,
    pinnedIp: records[0],
  };
}

/**
 * Creates custom socket-pinned HTTP/HTTPS agents that connect directly to the pinned IP literal
 * while supplying the original hostname for SNI / TLS certificate verification.
 */
export function createPinnedAgent(
  hostname: string,
  pinnedIp: string,
  isHttps: boolean,
  options: { timeoutMs?: number; allowInsecureInTest?: boolean } = {}
): http.Agent | https.Agent {
  const timeout = options.timeoutMs ?? 15000;

  if (isHttps) {
    const agent = new https.Agent({
      rejectUnauthorized: !options.allowInsecureInTest,
      minVersion: 'TLSv1.2',
      keepAlive: false,
      timeout,
      checkServerIdentity: (host, cert) => {
        // Enforce TLS certificate validation strictly against original hostname
        return tls.checkServerIdentity(hostname, cert);
      },
    });

    (agent as any).createConnection = (opts: any, oncreate: any) => {
      const socketOpts = {
        ...opts,
        host: pinnedIp, // Direct IP literal eliminates ambient DNS lookup & defeats DNS rebinding
        servername: hostname, // Hostname in SNI for standard TLS certificate verification
        checkServerIdentity: (host: string, cert: any) => {
          return tls.checkServerIdentity(hostname, cert);
        },
      };
      return tls.connect(socketOpts, oncreate);
    };

    return agent;
  }

  const agent = new http.Agent({
    keepAlive: false,
    timeout,
  });

  (agent as any).createConnection = (opts: any, oncreate: any) => {
    const socketOpts = {
      ...opts,
      host: pinnedIp,
    };
    return net.connect(socketOpts, oncreate);
  };

  return agent;
}

// ─── HIGH-LEVEL URL VALIDATION & PINNING ─────────────────────────────────────

export async function validateAndPinSourceUrl(
  targetUrl: string,
  options: {
    allowLocalhostForTests?: boolean;
    mockDnsResolver?: (host: string) => Promise<string[]>;
    timeoutMs?: number;
  } = {}
): Promise<ValidatedDestination> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err: any) {
    throw new SsrfSecurityError(`Invalid source URL: ${err.message}`);
  }

  // 1. Protocol: strictly http: or https:
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new SsrfSecurityError(`Forbidden URL protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`);
  }

  // 2. Reject userinfo credentials (http://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new SsrfSecurityError('URL credentials (userinfo) are strictly prohibited');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname.trim().length === 0) {
    throw new SsrfSecurityError('Hostname is missing from source URL');
  }

  const isHttps = protocol === 'https:';
  let port = parsed.port ? parseInt(parsed.port, 10) : isHttps ? 443 : 80;
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new SsrfSecurityError(`Invalid port number: '${parsed.port}'`);
  }

  const isLocalhostDomain =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home');

  if (isLocalhostDomain && !options.allowLocalhostForTests) {
    throw new SsrfSecurityError(`SSRF Blocked: Local and loopback hostnames are strictly prohibited ('${hostname}')`);
  }

  // 3. Pre-connect DNS resolution and destination validation
  const { resolvedIps, pinnedIp } = await resolveAndValidateDns(hostname, {
    mockDnsResolver: options.mockDnsResolver,
    allowLocalhostInTest: options.allowLocalhostForTests,
  });

  // 4. Build socket-pinned agent
  const agent = createPinnedAgent(hostname, pinnedIp, isHttps, {
    timeoutMs: options.timeoutMs,
    allowInsecureInTest: options.allowLocalhostForTests,
  });

  return {
    targetUrl,
    parsedUrl: parsed,
    hostname,
    port,
    isHttps,
    resolvedIps,
    pinnedIp,
    agent,
  };
}

// Backward compatibility helper
export function validateSourceUrl(targetUrl: string, allowLocalhostForTests: boolean = false): URL {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err: any) {
    throw new SsrfSecurityError(`Invalid source URL: ${err.message}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfSecurityError(`Forbidden URL protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`);
  }

  if (parsed.username || parsed.password) {
    throw new SsrfSecurityError('URL credentials (userinfo) are strictly prohibited');
  }

  const hostname = parsed.hostname.toLowerCase();
  const cleanHost = hostname.replace(/^\[|\]$/g, '');
  const altIp = parseAlternateIpv4(cleanHost);
  if (altIp) {
    const check = isBlockedIpv4(altIp);
    if (check.blocked && !(allowLocalhostForTests && (altIp === '127.0.0.1' || altIp.startsWith('127.')))) {
      throw new SsrfSecurityError(`SSRF Blocked: IP address '${hostname}' is in prohibited range (${check.reason})`);
    }
  }

  if (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '::1' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal')
  ) {
    if (!allowLocalhostForTests) {
      throw new SsrfSecurityError(`SSRF Blocked: Local and loopback hostnames are strictly prohibited ('${hostname}')`);
    }
  }

  const ipCheck = isBlockedIp(cleanHost);
  if (ipCheck.blocked && !(allowLocalhostForTests && (cleanHost === '127.0.0.1' || cleanHost === '::1'))) {
    throw new SsrfSecurityError(`SSRF Blocked: Address '${hostname}' is prohibited (${ipCheck.reason})`);
  }

  return parsed;
}
