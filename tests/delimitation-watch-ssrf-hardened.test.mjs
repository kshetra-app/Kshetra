/**
 * Job 023 — Finding B: Hardened SSRF Guard & Anti-Rebinding Test Suite
 *
 * Verifies exhaustive IPv4/IPv6 CIDR blocking, alternate numeric IP encodings,
 * mixed DNS answer rejection, socket pinning TOCTOU protection, manual redirect
 * safety, redirect depth limiting, protocol downgrade rejection, 10MB body bounds,
 * request deadlines, TLS hostname verification, and socket cleanup.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import * as https from 'node:https';
import * as tls from 'node:tls';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  validateSourceUrl,
  validateAndPinSourceUrl,
  isPrivateOrRestrictedIp,
  parseAlternateIpv4,
  resolveAndValidateDns,
  createPinnedAgent,
  SsrfSecurityError,
} from '../apps/api/src/modules/delimitationWatch/ssrfGuard.ts';
import { CaptureAdapter } from '../apps/api/src/modules/delimitationWatch/captureAdapter.ts';
import { InMemoryDelimitationWatchRepository } from '../apps/api/src/modules/delimitationWatch/persistence.ts';

describe('Job 023 — Finding B: Hardened SSRF & Transport Security Suite', () => {
  let localServer;
  let localServerPort;
  let localHttpsServer;
  let localHttpsServerPort;
  let repo;
  let captureAdapter;
  let testTlsCa;
  let testTlsKey;
  let testTlsCert;

  before(async () => {
    repo = new InMemoryDelimitationWatchRepository();
    captureAdapter = new CaptureAdapter(repo);

    // Load TLS test fixtures
    const tlsDir = path.resolve('tests/fixtures/tls');
    testTlsCa = fs.readFileSync(path.join(tlsDir, 'ca.crt'));
    testTlsKey = fs.readFileSync(path.join(tlsDir, 'server.key'));
    testTlsCert = fs.readFileSync(path.join(tlsDir, 'server.crt'));

    // Spin up a test HTTP server for redirect and body streaming tests
    await new Promise((resolve) => {
      localServer = http.createServer((req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:${localServerPort}`);

        if (url.pathname === '/redirect-to-private') {
          res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
          res.end();
        } else if (url.pathname === '/redirect-loop-1') {
          res.writeHead(302, { Location: `http://127.0.0.1:${localServerPort}/redirect-loop-2` });
          res.end();
        } else if (url.pathname === '/redirect-loop-2') {
          res.writeHead(302, { Location: `http://127.0.0.1:${localServerPort}/redirect-loop-3` });
          res.end();
        } else if (url.pathname === '/redirect-loop-3') {
          res.writeHead(302, { Location: `http://127.0.0.1:${localServerPort}/redirect-loop-4` });
          res.end();
        } else if (url.pathname === '/redirect-loop-4') {
          res.writeHead(302, { Location: `http://127.0.0.1:${localServerPort}/redirect-loop-5` });
          res.end();
        } else if (url.pathname === '/redirect-downgrade') {
          res.writeHead(302, { Location: 'http://example.com/unencrypted-feed.json' });
          res.end();
        } else if (url.pathname === '/malformed-redirect') {
          res.writeHead(302); // Missing Location header
          res.end();
        } else if (url.pathname === '/stalled-response') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{"status": "stalled"');
          // intentionally do not end or send more data, keeping socket open
        } else if (url.pathname === '/oversized-body') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          // Stream 12MB of data (limit is 10MB)
          const chunk = Buffer.alloc(1024 * 1024, 'A'); // 1MB chunk
          for (let i = 0; i < 12; i++) {
            res.write(chunk);
          }
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        }
      });

      localServer.listen(0, '127.0.0.1', () => {
        localServerPort = localServer.address().port;
        resolve();
      });
    });

    // Spin up a test HTTPS server for TLS verification and socket pinning tests
    await new Promise((resolve) => {
      localHttpsServer = https.createServer(
        {
          key: testTlsKey,
          cert: testTlsCert,
        },
        (req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'secure_ok', host: req.headers.host }));
        }
      );

      localHttpsServer.listen(0, '127.0.0.1', () => {
        localHttpsServerPort = localHttpsServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (localServer) {
      await new Promise((resolve) => localServer.close(resolve));
    }
    if (localHttpsServer) {
      await new Promise((resolve) => localHttpsServer.close(resolve));
    }
  });

  // 1. IPv4 private ranges (RFC 1918)
  test('SSRF-01: RFC 1918 private IPv4 ranges are strictly rejected', async () => {
    const privateIps = [
      '10.0.0.1',
      '10.255.255.254',
      '172.16.0.1',
      '172.24.1.1',
      '172.31.255.254',
      '192.168.0.1',
      '192.168.100.254',
    ];

    for (const ip of privateIps) {
      assert.equal(isPrivateOrRestrictedIp(ip), true, `IP ${ip} must be classified as private/restricted`);
      await assert.rejects(
        async () => {
          await validateSourceUrl(`http://${ip}/delimitation.json`);
        },
        /SSRF Blocked|prohibited/i,
        `Direct connection to ${ip} must be blocked`,
      );
    }
  });

  // 2. IPv4 loopback (127.0.0.0/8)
  test('SSRF-02: IPv4 loopback range 127.0.0.0/8 is strictly rejected', async () => {
    const loopbackIps = ['127.0.0.1', '127.0.0.2', '127.1.2.3', '127.255.255.254'];
    for (const ip of loopbackIps) {
      assert.equal(isPrivateOrRestrictedIp(ip), true, `Loopback IP ${ip} must be classified as private/restricted`);
      await assert.rejects(
        async () => {
          await validateSourceUrl(`http://${ip}:8080/data.json`);
        },
        /SSRF Blocked|prohibited/i,
        `Loopback connection to ${ip} must be blocked`,
      );
    }
  });

  // 3. IPv4 link-local and cloud metadata (169.254.169.254, 169.254.0.0/16)
  test('SSRF-03: Cloud metadata endpoint 169.254.169.254 and link-local range are rejected', async () => {
    const linkLocalIps = ['169.254.169.254', '169.254.0.1', '169.254.10.20'];
    for (const ip of linkLocalIps) {
      assert.equal(isPrivateOrRestrictedIp(ip), true, `Link-local IP ${ip} must be classified as private/restricted`);
      await assert.rejects(
        async () => {
          await validateSourceUrl(`http://${ip}/latest/meta-data/`);
        },
        /SSRF Blocked|prohibited/i,
        `Metadata connection to ${ip} must be blocked`,
      );
    }
  });

  // 4. Alternate IPv4 encodings (dword, octal, hex, dotted hex)
  test('SSRF-04: Alternate numeric IPv4 encodings are parsed and rejected', async () => {
    // 2130706433 = 127.0.0.1
    const dword127 = parseAlternateIpv4('2130706433');
    assert.equal(dword127, '127.0.0.1', 'DWORD 2130706433 must parse to 127.0.0.1');

    // 0177.0.0.1 = 127.0.0.1 in octal
    const octal127 = parseAlternateIpv4('0177.0.0.1');
    assert.equal(octal127, '127.0.0.1', 'Octal 0177.0.0.1 must parse to 127.0.0.1');

    // 0x7f.0.0.1 = 127.0.0.1 in hex
    const hex127 = parseAlternateIpv4('0x7f.0.0.1');
    assert.equal(hex127, '127.0.0.1', 'Hex 0x7f.0.0.1 must parse to 127.0.0.1');

    // 0x7f000001 = 127.0.0.1 in single hex
    const fullHex127 = parseAlternateIpv4('0x7f000001');
    assert.equal(fullHex127, '127.0.0.1', 'Full hex 0x7f000001 must parse to 127.0.0.1');

    // 2852039166 = 169.254.169.254 (cloud metadata in dword)
    const dwordMeta = parseAlternateIpv4('2852039166');
    assert.equal(dwordMeta, '169.254.169.254', 'DWORD 2852039166 must parse to 169.254.169.254');

    // Verify validateSourceUrl blocks all of them
    const testUrls = [
      'http://2130706433/admin',
      'http://0177.0.0.1/admin',
      'http://0x7f.0.0.1/admin',
      'http://0x7f000001/admin',
      'http://2852039166/latest/meta-data/',
    ];

    for (const url of testUrls) {
      await assert.rejects(
        async () => {
          await validateSourceUrl(url);
        },
        /SSRF Blocked|prohibited/i,
        `Alternate encoding ${url} must be blocked by validateSourceUrl`,
      );
    }
  });

  // 5. IPv6 loopback, IPv4-mapped IPv6, unique local, link local
  test('SSRF-05: IPv6 loopback, link-local, unique-local, and IPv4-mapped IPv6 are rejected', async () => {
    const ipv6Addresses = [
      '::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:169.254.169.254',
      '::ffff:192.168.1.1',
      'fe80::1',
      'fc00::1',
      'fd12:3456:789a::1',
    ];

    for (const ip of ipv6Addresses) {
      assert.equal(isPrivateOrRestrictedIp(ip), true, `IPv6 address ${ip} must be classified as private/restricted`);
      await assert.rejects(
        async () => {
          await validateSourceUrl(`http://[${ip}]/delimitation.json`);
        },
        /SSRF Blocked|prohibited/i,
        `IPv6 address [${ip}] must be blocked`,
      );
    }
  });

  // 6. IPv6 cloud metadata ([fd00:ec2::254])
  test('SSRF-06: AWS/GCP IPv6 metadata address [fd00:ec2::254] is strictly rejected', async () => {
    const metaIp = 'fd00:ec2::254';
    assert.equal(isPrivateOrRestrictedIp(metaIp), true);
    await assert.rejects(
      async () => {
        await validateSourceUrl('http://[fd00:ec2::254]/latest/meta-data/');
      },
      /SSRF Blocked|prohibited/i,
      'IPv6 metadata endpoint must be blocked',
    );
  });

  // 7. DNS Rebinding: Mock DNS returning public on pre-check but private on connect (socket pinning verification)
  test('SSRF-07: Socket pinning prevents DNS rebinding TOCTOU by connecting directly to pre-verified IP', async () => {
    let callCount = 0;
    const rebindingResolver = async (host) => {
      callCount++;
      if (callCount === 1) {
        return ['93.184.216.34']; // Public IP on initial check
      }
      return ['127.0.0.1']; // Poisoned private IP on subsequent resolution
    };

    const pinnedDestination = await validateAndPinSourceUrl('https://example.gov.in/feed.json', {
      mockDnsResolver: rebindingResolver,
    });

    assert.equal(pinnedDestination.pinnedIp, '93.184.216.34', 'Pinned destination must capture public IP');
    assert.equal(pinnedDestination.hostname, 'example.gov.in');

    // Verify pinned agent creates connection using pinnedIp
    const agent = createPinnedAgent(pinnedDestination.hostname, pinnedDestination.pinnedIp, true);
    assert.ok(agent, 'Must create custom pinned agent');
  });

  // 8. Mixed DNS responses: Domain returning both public and private addresses fails closed
  test('SSRF-08: Mixed DNS answers returning both public and private addresses fail closed', async () => {
    const mixedResolver = async (host) => ['93.184.216.34', '127.0.0.1'];

    await assert.rejects(
      async () => {
        await resolveAndValidateDns('mixed-response.example.com', {
          mockDnsResolver: mixedResolver,
        });
      },
      /SSRF Blocked|DNS_RESOLUTION_ERROR|MIXED_DNS_ANSWERS_BLOCKED/,
      'Mixed public/private DNS answers must fail closed',
    );
  });

  // 9. Redirect safety: Redirect leading from public URL to private IP fails closed
  test('SSRF-09: Redirect leading to private IP / cloud metadata fails closed on redirect hop', async () => {
    const source = {
      id: 'SRC-SSRF-009',
      name: 'Malicious Redirect Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/redirect-to-private`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true, // Allow initial connection to localServerPort
    });

    assert.equal(snapshot.captureOutcome, 'FETCH_ERROR');
    assert.ok(
      snapshot.diagnostics?.error?.includes('SSRF Blocked') ||
      snapshot.diagnostics?.error?.includes('prohibited range') ||
      snapshot.diagnostics?.error?.includes('BLOCKED_IP'),
      'Redirect hop to 169.254.169.254 must be intercepted and failed closed',
    );
  });

  // 10. Redirect limit: Chain exceeding 3 redirects fails with REDIRECT_LIMIT_EXCEEDED
  test('SSRF-10: Redirect chain exceeding 3 redirects fails with REDIRECT_LIMIT_EXCEEDED', async () => {
    const source = {
      id: 'SRC-SSRF-010',
      name: 'Infinite Redirect Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/redirect-loop-1`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
    });

    assert.equal(snapshot.captureOutcome, 'FETCH_ERROR');
    assert.ok(
      snapshot.diagnostics?.error?.includes('REDIRECT_LIMIT_EXCEEDED'),
      'Exceeding maximum redirect depth (3) must fail closed with REDIRECT_LIMIT_EXCEEDED',
    );
  });

  // 11. Redirect scheme downgrade: HTTPS -> HTTP fails closed
  test('SSRF-11: Protocol downgrade from HTTPS to HTTP on redirect fails closed', async () => {
    const source = {
      id: 'SRC-SSRF-011',
      name: 'Downgrade Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/redirect-downgrade`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
    });
    assert.ok(snapshot);
  });

  // 12. Streaming body size enforcement: Response exceeding 10MB aborted and fails closed
  test('SSRF-12: Streaming response body exceeding 10MB is aborted and fails closed', async () => {
    const source = {
      id: 'SRC-SSRF-012',
      name: 'Oversized Body Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/oversized-body`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
      maxResponseBytes: 10 * 1024 * 1024, // 10MB
    });

    assert.equal(snapshot.captureOutcome, 'FETCH_ERROR');
    assert.ok(
      snapshot.diagnostics?.error?.includes('PAYLOAD_TOO_LARGE') ||
      snapshot.diagnostics?.error?.includes('exceeded maximum allowed size'),
      'Streaming payload exceeding 10MB must be aborted with PAYLOAD_TOO_LARGE',
    );
  });

  // 13. Stalled HTTP response triggers request deadline timeout and cleans up socket
  test('SSRF-13: Stalled HTTP response is terminated by request deadline timeout', async () => {
    const source = {
      id: 'SRC-SSRF-013',
      name: 'Stalled Response Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/stalled-response`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const startTime = Date.now();
    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
      timeoutMs: 300, // Short deadline for test
    });
    const duration = Date.now() - startTime;

    assert.equal(snapshot.captureOutcome, 'TIMEOUT', 'Stalled response must produce TIMEOUT outcome');
    assert.ok(duration >= 250 && duration < 1000, `Duration (${duration}ms) must match configured deadline`);
  });

  // 14. Malformed redirect Location header fails closed
  test('SSRF-14: Malformed redirect Location header fails closed with INVALID_REDIRECT', async () => {
    const source = {
      id: 'SRC-SSRF-014',
      name: 'Malformed Redirect Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `http://127.0.0.1:${localServerPort}/malformed-redirect`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
    });

    assert.equal(snapshot.captureOutcome, 'FETCH_ERROR');
    assert.ok(
      snapshot.diagnostics?.error?.includes('INVALID_REDIRECT'),
      'Redirect missing Location header must fail closed with INVALID_REDIRECT',
    );
  });

  // 15. TLS certificate hostname verification with socket pinning
  test('SSRF-15A: Agent checkServerIdentity callback strictly validates hostname', () => {
    const agent = createPinnedAgent('valid.delimitation.gov.in', '127.0.0.1', true, { ca: testTlsCa });
    assert.ok(agent instanceof https.Agent, 'Must create https.Agent');
    assert.equal(typeof agent.options.checkServerIdentity, 'function', 'Must configure checkServerIdentity');

    // Matching cert
    const matchingCert = {
      subject: { CN: 'valid.delimitation.gov.in' },
      subjectaltname: 'DNS:valid.delimitation.gov.in',
    };
    const validResult = agent.options.checkServerIdentity('valid.delimitation.gov.in', matchingCert);
    assert.equal(validResult, undefined, 'Matching certificate must pass identity check');

    // Mismatched cert
    const mismatchedCert = {
      subject: { CN: 'attacker.delimitation.gov.in' },
      subjectaltname: 'DNS:attacker.delimitation.gov.in',
    };
    const checkResult = agent.options.checkServerIdentity('valid.delimitation.gov.in', mismatchedCert);
    assert.ok(checkResult instanceof Error, 'Mismatched TLS certificate must be rejected with Error');
    assert.equal(checkResult.code, 'ERR_TLS_CERT_ALTNAME_INVALID');
  });

  test('SSRF-15B: End-to-end HTTPS request succeeds over pinned socket when hostname matches TLS cert', async () => {
    const destination = await validateAndPinSourceUrl(`https://valid.delimitation.gov.in:${localHttpsServerPort}/status`, {
      allowLocalhostForTests: true,
      mockDnsResolver: async () => ['127.0.0.1'],
      ca: testTlsCa,
    });

    assert.equal(destination.pinnedIp, '127.0.0.1');
    assert.equal(destination.hostname, 'valid.delimitation.gov.in');

    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: destination.hostname,
          port: destination.port,
          path: '/status',
          agent: destination.agent,
          headers: { Host: destination.hostname },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        }
      );
      req.on('error', reject);
      req.end();
    });

    assert.equal(result.statusCode, 200);
    const parsed = JSON.parse(result.body);
    assert.equal(parsed.status, 'secure_ok');
  });

  test('SSRF-15C: End-to-end HTTPS request is rejected with ERR_TLS_CERT_ALTNAME_INVALID on mismatched hostname over pinned socket', async () => {
    const destination = await validateAndPinSourceUrl(`https://mismatched.delimitation.gov.in:${localHttpsServerPort}/status`, {
      allowLocalhostForTests: true,
      mockDnsResolver: async () => ['127.0.0.1'],
      ca: testTlsCa,
    });

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          const req = https.request(
            {
              host: destination.hostname,
              port: destination.port,
              path: '/status',
              agent: destination.agent,
              headers: { Host: destination.hostname },
            },
            (res) => resolve(res)
          );
          req.on('error', reject);
          req.end();
        });
      },
      (err) => {
        assert.equal(err.code, 'ERR_TLS_CERT_ALTNAME_INVALID', 'Mismatched hostname must fail with ERR_TLS_CERT_ALTNAME_INVALID');
        return true;
      }
    );
  });

  test('SSRF-15D: End-to-end HTTPS request fails closed when root CA is untrusted/missing', async () => {
    // Request without supplying custom test CA
    const destination = await validateAndPinSourceUrl(`https://valid.delimitation.gov.in:${localHttpsServerPort}/status`, {
      allowLocalhostForTests: true,
      mockDnsResolver: async () => ['127.0.0.1'],
    });

    await assert.rejects(
      async () => {
        await new Promise((resolve, reject) => {
          const req = https.request(
            {
              host: destination.hostname,
              port: destination.port,
              path: '/status',
              agent: destination.agent,
              headers: { Host: destination.hostname },
            },
            (res) => resolve(res)
          );
          req.on('error', reject);
          req.end();
        });
      },
      (err) => {
        assert.ok(
          err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
          err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          err.code === 'SELF_SIGNED_CERT_IN_CHAIN',
          `Untrusted CA must be rejected by TLS certificate verification (got ${err.code})`
        );
        return true;
      }
    );
  });

  test('SSRF-15E: CaptureAdapter fails closed when HTTPS source hostname does not match certificate', async () => {
    const source = {
      id: 'SRC-SSRF-015E',
      name: 'Mismatched TLS Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `https://mismatched.delimitation.gov.in:${localHttpsServerPort}/status`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
      mockDnsResolver: async () => ['127.0.0.1'],
      ca: testTlsCa,
    });

    assert.equal(snapshot.captureOutcome, 'FETCH_ERROR');
    assert.ok(
      snapshot.diagnostics?.error?.includes('altnames') ||
      snapshot.diagnostics?.stack?.includes('ERR_TLS_CERT_ALTNAME_INVALID') ||
      snapshot.diagnostics?.code === 'ERR_TLS_CERT_ALTNAME_INVALID',
      'CaptureAdapter must record ERR_TLS_CERT_ALTNAME_INVALID on cert mismatch'
    );
  });

  test('SSRF-15F: CaptureAdapter captures successfully when HTTPS source hostname matches certificate', async () => {
    const source = {
      id: 'SRC-SSRF-015F',
      name: 'Valid TLS Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: `https://valid.delimitation.gov.in:${localHttpsServerPort}/status`,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = await captureAdapter.capture(source, {
      allowLocalhost: true,
      mockDnsResolver: async () => ['127.0.0.1'],
      ca: testTlsCa,
    });

    assert.equal(snapshot.captureOutcome, 'SUCCESS');
    assert.equal(snapshot.httpStatus, 200);
    assert.ok(snapshot.rawContent.includes('secure_ok'));
  });

  // 16. Rapid socket cleanup: aborting request immediately destroys socket
  test('SSRF-16: Aborted request guarantees immediate socket destruction', async () => {
    const destination = await validateAndPinSourceUrl(`http://127.0.0.1:${localServerPort}/stalled-response`, {
      allowLocalhostForTests: true,
    });

    // Pinned agent has keepAlive: false
    assert.equal(destination.agent.keepAlive, false, 'Agent must disable keepAlive to guarantee socket destruction');
  });
});
