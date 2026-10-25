/**
 * apps/api/src/modules/webhooks/antiSsrfGuard.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Zero-Trust Anti-SSRF Egress Guard, IPv4/IPv6 CIDR Filtering,
 * Pre-Connect DNS Resolution, and Socket Connection Pinning.
 */

import dns from 'node:dns/promises';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';

export interface ValidatedEgressTarget {
  rawUrl: string;
  parsedUrl: URL;
  hostname: string;
  port: number;
  resolvedIps: string[];
  pinnedIp: string;
  agent: https.Agent | http.Agent;
}

// ─── IP PARSING & CIDR RANGE HELPERS ───

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
  { base: '0.0.0.0', prefix: 8, name: 'Current Network' },
  { base: '10.0.0.0', prefix: 8, name: 'Private RFC 1918' },
  { base: '100.64.0.0', prefix: 10, name: 'Carrier-Grade NAT' },
  { base: '127.0.0.0', prefix: 8, name: 'Loopback' },
  { base: '169.254.0.0', prefix: 16, name: 'Link-Local & Cloud Metadata' },
  { base: '172.16.0.0', prefix: 12, name: 'Private RFC 1918' },
  { base: '192.0.0.0', prefix: 24, name: 'IETF Protocol Assignments' },
  { base: '192.0.2.0', prefix: 24, name: 'TEST-NET-1' },
  { base: '192.88.99.0', prefix: 24, name: '6to4 Relay Anycast' },
  { base: '192.168.0.0', prefix: 16, name: 'Private RFC 1918' },
  { base: '198.18.0.0', prefix: 15, name: 'Network Benchmark' },
  { base: '198.51.100.0', prefix: 24, name: 'TEST-NET-2' },
  { base: '203.0.113.0', prefix: 24, name: 'TEST-NET-3' },
  { base: '224.0.0.0', prefix: 4, name: 'Multicast' },
  { base: '240.0.0.0', prefix: 4, name: 'Reserved' },
  { base: '255.255.255.255', prefix: 32, name: 'Broadcast' },
];

/**
 * Checks whether an IPv4 address falls within any blocked/private/link-local/loopback range.
 */
export function isBlockedIpv4(ip: string): { blocked: boolean; reason?: string } {
  const ipInt = ipv4ToInt(ip);
  for (const range of IPV4_BLOCKED_RANGES) {
    if (isIpv4InCidr(ipInt, range.base, range.prefix)) {
      return { blocked: true, reason: range.name };
    }
  }
  return { blocked: false };
}

/**
 * Checks whether an IPv6 address falls within any blocked/loopback/link-local/documentation range.
 */
function ipv6ToWords(ip: string): number[] | null {
  if (!net.isIPv6(ip)) return null;
  let normalized = ip.toLowerCase();
  const dottedTail = normalized.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedTail) {
    const v4 = dottedTail[1];
    if (!net.isIPv4(v4)) return null;
    const octets = v4.split('.').map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    normalized = normalized.slice(0, -v4.length) + high + ':' + low;
  }
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const gap = 8 - left.length - right.length;
  if ((halves.length === 1 && gap !== 0) || (halves.length === 2 && gap < 1)) return null;
  const words = [
    ...left.map((part) => Number.parseInt(part, 16)),
    ...Array(halves.length === 2 ? gap : 0).fill(0),
    ...right.map((part) => Number.parseInt(part, 16)),
  ];
  if (words.length !== 8 || words.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) return null;
  return words;
}

/** Normalize IPv6 before checking mapped IPv4, special-purpose, and global scope. */
export function isBlockedIpv6(ip: string): { blocked: boolean; reason?: string } {
  const words = ipv6ToWords(ip);
  if (!words) return { blocked: true, reason: 'INVALID_IPV6_FORMAT' };
  if (words.every((word) => word === 0) ||
      (words.slice(0, 7).every((word) => word === 0) && words[7] === 1)) {
    return { blocked: true, reason: 'IPv6 Loopback/Unspecified' };
  }
  const mappedPrefix = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (mappedPrefix) {
    const v4 = [
      (words[6] >> 8) & 0xff, words[6] & 0xff,
      (words[7] >> 8) & 0xff, words[7] & 0xff,
    ].join('.');
    const checked = isBlockedIpv4(v4);
    return checked.blocked ? { blocked: true, reason: checked.reason || 'IPv4-Mapped IPv6' } : { blocked: false };
  }
  if (words.slice(0, 6).every((word) => word === 0)) {
    return { blocked: true, reason: 'IPv4-Compatible/Reserved IPv6' };
  }
  if ((words[0] & 0xffc0) === 0xfe80) return { blocked: true, reason: 'IPv6 Link-Local' };
  if ((words[0] & 0xfe00) === 0xfc00) return { blocked: true, reason: 'IPv6 Unique Local' };
  if ((words[0] & 0xff00) === 0xff00) return { blocked: true, reason: 'IPv6 Multicast' };
  if (words[0] === 0x2001 && words[1] < 0x0200) {
    return { blocked: true, reason: 'IPv6 Special-Purpose/Documentation' };
  }
  if (words[0] === 0x2002) return { blocked: true, reason: 'IPv6 6to4' };
  if ((words[0] & 0xe000) !== 0x2000) return { blocked: true, reason: 'IPv6 Non-Global/Reserved' };
  return { blocked: false };
}

/**
 * Checks whether an arbitrary IP (v4 or v6) is blocked.
 */
export function isBlockedIp(ip: string): { blocked: boolean; reason?: string } {
  if (net.isIPv4(ip)) {
    return isBlockedIpv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isBlockedIpv6(ip);
  }
  return { blocked: true, reason: 'INVALID_IP_FORMAT' };
}

/**
 * Validates target URL syntax, performs pre-connect DNS lookup, validates all answers against
 * the IP blocklist, and builds a custom socket-pinned https.Agent to prevent DNS rebinding.
 */
export async function validateAndPinEgressTarget(
  targetUrl: string,
  options: {
    mockDnsResolver?: (hostname: string) => Promise<string[]>;
    allowLocalhostInTest?: boolean;
  } = {}
): Promise<ValidatedEgressTarget> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('INVALID_WEBHOOK_URL: Malformed URL syntax.');
  }

  // Scheme restriction: strictly HTTPS (plain HTTP is only permitted when allowLocalhostInTest is active in test)
  const isHttp = parsed.protocol.toLowerCase() === 'http:';
  const isHttps = parsed.protocol.toLowerCase() === 'https:';

  // Userinfo forbidden (https://user:pass@host/)
  if (parsed.username || parsed.password) {
    throw new Error('USERINFO_PROHIBITED: Webhook URLs must not contain embedded username or password credentials.');
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname.trim().length === 0) {
    throw new Error('INVALID_WEBHOOK_URL: Hostname missing.');
  }

  // Port restrictions: 443 default, 80 only in test mode
  let port = parsed.port ? Number.parseInt(parsed.port, 10) : (isHttps ? 443 : 80);
  if (Number.isNaN(port)) {
    port = isHttps ? 443 : 80;
  }

  // Localhost test override validation
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const allowLocalhost =
    (options.allowLocalhostInTest || process.env.ALLOW_LOCALHOST_TEST_ONLY === 'true') && isLocalhost;

  if (allowLocalhost) {
    // Fail-closed gate: Localhost testing is strictly forbidden outside NODE_ENV === 'test'
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('FATAL_SSRF_CONFIGURATION_VIOLATION: Localhost override attempted outside NODE_ENV=test');
    }

    // Return mock local test target
    const pinnedIp = '127.0.0.1';
    const agent = isHttps
      ? new https.Agent({ rejectUnauthorized: false, keepAlive: false })
      : new http.Agent({ keepAlive: false });

    return {
      rawUrl: targetUrl,
      parsedUrl: parsed,
      hostname,
      port,
      resolvedIps: [pinnedIp],
      pinnedIp,
      agent,
    };
  }

  // In production / non-test: Plain HTTP is strictly forbidden
  if (!isHttps) {
    throw new Error('INVALID_PROTOCOL_HTTPS_REQUIRED: Webhooks must use encrypted https:// protocol.');
  }

  // Port must be 443
  if (port !== 443) {
    throw new Error(`INVALID_PORT_FORBIDDEN: Webhooks are restricted to standard HTTPS port 443. Port ${port} is prohibited.`);
  }

  // Pre-connect DNS resolution
  let resolvedIps: string[] = [];
  if (net.isIP(hostname)) {
    resolvedIps = [hostname];
  } else if (options.mockDnsResolver) {
    resolvedIps = await options.mockDnsResolver(hostname);
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      resolvedIps = records.map((r) => r.address);
    } catch (err: any) {
      throw new Error(`DNS_RESOLUTION_FAILED: Failed to resolve hostname '${hostname}': ${err.message}`);
    }
  }

  if (!resolvedIps || resolvedIps.length === 0) {
    throw new Error(`DNS_RESOLUTION_FAILED: Hostname '${hostname}' returned zero IP addresses.`);
  }

  // Validate EVERY resolved address against blocklist (fail-closed if any matches)
  for (const ip of resolvedIps) {
    const check = isBlockedIp(ip);
    if (check.blocked) {
      throw new Error(
        `BLOCKED_PRIVATE_IP_ADDRESS: Destination '${hostname}' resolved to blocked private or reserved IP address (${ip} - ${check.reason}). Outbound dispatch aborted.`
      );
    }
  }

  // Connection pinning: Pick first validated public IP literal
  const pinnedIp = resolvedIps[0];

  // Build custom https.Agent overriding createConnection to connect strictly to pinned IP
  const agent = new https.Agent({
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
    keepAlive: false,
    timeout: 3000,
  });

  (agent as any).createConnection = (opts: any, oncreate: any) => {
    const socketOpts = {
      ...opts,
      host: pinnedIp, // Direct IP literal eliminates ambient DNS fallback & defeats DNS rebinding
      servername: hostname, // Hostname passed in SNI for standard TLS certificate verification
    };
    return tls.connect(socketOpts, oncreate);
  };

  return {
    rawUrl: targetUrl,
    parsedUrl: parsed,
    hostname,
    port,
    resolvedIps,
    pinnedIp,
    agent,
  };
}

// Aliases for comprehensive testing and naming convenience
export const isPrivateOrReservedIp = isBlockedIp;
export const validateWebhookUrl = validateAndPinEgressTarget;
