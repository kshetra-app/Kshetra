/**
 * tests/webhooks-ssrf-guard.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Zero-Trust Anti-SSRF Guard Test Suite
 *
 * Mandatory Verification Invariants:
 * 1. Complete IPv4 blocked ranges: Loopback, RFC 1918 private, Carrier-NAT, Link-local, AWS IMDSv4 (169.254.169.254).
 * 2. Complete IPv6 blocked ranges: Loopback (::1), Unique Local (fc00::/7), Link-local (fe80::/10), EC2 IMDSv6 (fd00:ec2::254).
 * 3. IPv4-mapped IPv6 blocked ranges (::ffff:127.0.0.1, ::ffff:169.254.169.254, ::ffff:10.0.0.1).
 * 4. Public IP acceptance (IPv4 and IPv6).
 * 5. Scheme validation: Strict HTTPS required; non-HTTPS schemes rejected.
 * 6. URL structure validation: Embedded userinfo credentials rejected.
 * 7. Fail-closed localhost test gate: Throws FATAL_SSRF_CONFIGURATION_VIOLATION outside NODE_ENV === 'test'.
 * 8. Pre-connect DNS inspection and connection-pinning agent generation.
 */

import assert from 'node:assert';
import http from 'node:http';
import { isPrivateOrReservedIp, validateWebhookUrl } from '../apps/api/src/modules/webhooks/antiSsrfGuard.ts';
import { dispatchWebhook, MAX_WEBHOOK_PAYLOAD_BYTES } from '../apps/api/src/modules/webhooks/webhookDispatcher.ts';

console.log('================================================================');
console.log('W022: ZERO-TRUST ANTI-SSRF GUARD VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runCheck(id: string, description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        passCount++;
        console.log(`[PASS] ${id}: ${description}`);
      }).catch((err) => {
        failCount++;
        console.error(`[FAIL] ${id}: ${description}`);
        console.error(`       Error: ${err.message}`);
      });
    } else {
      passCount++;
      console.log(`[PASS] ${id}: ${description}`);
      return Promise.resolve();
    }
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
    return Promise.resolve();
  }
}

async function runAll() {
  // --- IPv4 Blocked Ranges ---
  await runCheck('SSRF-01', 'Reject IPv4 loopback 127.0.0.1', () => {
    const res = isPrivateOrReservedIp('127.0.0.1');
    assert.strictEqual(res.blocked, true);
    assert.ok(res.reason?.includes('Loopback'));
  });

  await runCheck('SSRF-02', 'Reject IPv4 loopback arbitrary 127.123.45.67', () => {
    const res = isPrivateOrReservedIp('127.123.45.67');
    assert.strictEqual(res.blocked, true);
  });

  await runCheck('SSRF-03', 'Reject RFC 1918 10.0.0.0/8', () => {
    assert.strictEqual(isPrivateOrReservedIp('10.0.0.1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('10.254.254.254').blocked, true);
  });

  await runCheck('SSRF-04', 'Reject RFC 1918 172.16.0.0/12', () => {
    assert.strictEqual(isPrivateOrReservedIp('172.16.0.1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('172.31.255.255').blocked, true);
    // Boundary check: 172.15.255.255 and 172.32.0.1 should not be blocked by 172.16/12
    assert.strictEqual(isPrivateOrReservedIp('172.15.255.255').blocked, false);
    assert.strictEqual(isPrivateOrReservedIp('172.32.0.1').blocked, false);
  });

  await runCheck('SSRF-05', 'Reject RFC 1918 192.168.0.0/16', () => {
    assert.strictEqual(isPrivateOrReservedIp('192.168.0.1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('192.168.1.100').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('192.169.1.1').blocked, false);
  });

  await runCheck('SSRF-06', 'Reject Carrier-Grade NAT 100.64.0.0/10', () => {
    assert.strictEqual(isPrivateOrReservedIp('100.64.0.1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('100.127.255.255').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('100.63.255.255').blocked, false);
    assert.strictEqual(isPrivateOrReservedIp('100.128.0.1').blocked, false);
  });

  await runCheck('SSRF-07', 'Reject IPv4 Link-Local 169.254.0.0/16', () => {
    assert.strictEqual(isPrivateOrReservedIp('169.254.1.1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('169.254.254.254').blocked, true);
  });

  await runCheck('SSRF-08', 'Reject Cloud Metadata IMDSv4 169.254.169.254', () => {
    const res = isPrivateOrReservedIp('169.254.169.254');
    assert.strictEqual(res.blocked, true);
  });

  await runCheck('SSRF-09', 'Reject Broadcast 255.255.255.255 and Current Network 0.0.0.0/8', () => {
    assert.strictEqual(isPrivateOrReservedIp('0.0.0.0').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('255.255.255.255').blocked, true);
  });

  // --- IPv6 Blocked Ranges ---
  await runCheck('SSRF-10', 'Reject IPv6 loopback ::1', () => {
    const res = isPrivateOrReservedIp('::1');
    assert.strictEqual(res.blocked, true);
    assert.ok(res.reason?.includes('Loopback'));
  });

  await runCheck('SSRF-11', 'Reject IPv6 Unique Local Address (ULA) fc00::/7', () => {
    assert.strictEqual(isPrivateOrReservedIp('fc00::1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('fd00::1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('fd12:3456:789a:1::1').blocked, true);
  });

  await runCheck('SSRF-12', 'Reject IPv6 Link-Local fe80::/10', () => {
    assert.strictEqual(isPrivateOrReservedIp('fe80::1').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('febf::ffff').blocked, true);
  });

  await runCheck('SSRF-13', 'Reject Cloud Metadata IMDSv6 fd00:ec2::254', () => {
    assert.strictEqual(isPrivateOrReservedIp('fd00:ec2::254').blocked, true);
  });

  // --- IPv4-Mapped IPv6 ---
  await runCheck('SSRF-14', 'Reject IPv4-mapped IPv6 loopback ::ffff:127.0.0.1', () => {
    const res = isPrivateOrReservedIp('::ffff:127.0.0.1');
    assert.strictEqual(res.blocked, true);
    assert.ok(res.reason?.includes('Loopback'));
  });

  await runCheck('SSRF-15', 'Reject IPv4-mapped IPv6 metadata ::ffff:169.254.169.254', () => {
    const res = isPrivateOrReservedIp('::ffff:169.254.169.254');
    assert.strictEqual(res.blocked, true);
  });

  await runCheck('SSRF-16', 'Reject IPv4-mapped IPv6 private 10.0.0.1', () => {
    const res = isPrivateOrReservedIp('::ffff:10.0.0.1');
    assert.strictEqual(res.blocked, true);
  });

  await runCheck('SSRF-25', 'Reject fully expanded IPv4-mapped private IPv6 addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('0000:0000:0000:0000:0000:ffff:7f00:0001').blocked, true);
    assert.strictEqual(isPrivateOrReservedIp('0:0:0:0:0:ffff:a9fe:a9fe').blocked, true);
  });

  await runCheck('SSRF-26', 'Reject fully expanded IPv6 documentation address', () => {
    assert.strictEqual(isPrivateOrReservedIp('2001:0db8:0000:0000:0000:0000:0000:0001').blocked, true);
  });

  // --- Public IPs Allowed ---
  await runCheck('SSRF-17', 'Allow public IPv4 addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('8.8.8.8').blocked, false);
    assert.strictEqual(isPrivateOrReservedIp('1.1.1.1').blocked, false);
    assert.strictEqual(isPrivateOrReservedIp('93.184.216.34').blocked, false);
  });

  await runCheck('SSRF-18', 'Allow public IPv6 addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('2606:4700:4700::1111').blocked, false);
    assert.strictEqual(isPrivateOrReservedIp('2001:4860:4860::8888').blocked, false);
  });

  // --- URL Validation: Protocol & Format ---
  await runCheck('SSRF-19', 'Reject non-HTTPS protocol (http://) in production mode', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('http://webhook.site/test');
      },
      (err: any) => {
        return err.message.includes('INVALID_PROTOCOL_HTTPS_REQUIRED');
      }
    );
  });

  await runCheck('SSRF-20', 'Reject dangerous non-HTTP schemes (ftp://, file://, gopher://)', async () => {
    for (const badScheme of ['ftp://example.com/hook', 'file:///etc/passwd', 'gopher://example.com']) {
      await assert.rejects(
        async () => {
          await validateWebhookUrl(badScheme);
        },
        (err: any) => {
          return err.message.includes('INVALID_PROTOCOL_HTTPS_REQUIRED') || err.message.includes('INVALID_WEBHOOK_URL');
        }
      );
    }
  });

  await runCheck('SSRF-21', 'Reject embedded credentials in URL', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://admin:secret@api.example.com/webhook');
      },
      (err: any) => {
        return err.message.includes('USERINFO_PROHIBITED');
      }
    );
  });

  // --- Fail-Closed Localhost Test Override Gate ---
  await runCheck('SSRF-22', 'Enforce fail-closed localhost override outside NODE_ENV===test', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      await assert.rejects(
        async () => {
          await validateWebhookUrl('http://127.0.0.1:8080/test', { allowLocalhostInTest: true });
        },
        (err: any) => {
          return err.message.includes('FATAL_SSRF_CONFIGURATION_VIOLATION');
        }
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  await runCheck('SSRF-23', 'Permit localhost loopback strictly in NODE_ENV===test when flag set', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'test';
      const result = await validateWebhookUrl('http://127.0.0.1:8080/webhook', { allowLocalhostInTest: true });
      assert.strictEqual(result.pinnedIp, '127.0.0.1');
      assert.strictEqual(result.hostname, '127.0.0.1');
      assert.strictEqual(result.port, 8080);
      assert.ok(result.agent !== undefined);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  // --- Mixed DNS Answers: Fail-Closed Verification ---
  await runCheck('SSRF-24', 'Fail closed when DNS returns mixed public and private loopback IPs', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://example.com/webhook', {
          mockDnsResolver: async () => ['93.184.216.34', '127.0.0.1'],
        });
      },
      (err: any) => {
        return err.message.includes('BLOCKED_PRIVATE_IP_ADDRESS') && err.message.includes('127.0.0.1');
      }
    );
  });

  await runCheck('SSRF-25', 'Fail closed when DNS returns mixed public and RFC 1918 10.0.0.1 IPs', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://example.com/webhook', {
          mockDnsResolver: async () => ['93.184.216.34', '10.0.0.1'],
        });
      },
      (err: any) => {
        return err.message.includes('BLOCKED_PRIVATE_IP_ADDRESS') && err.message.includes('10.0.0.1');
      }
    );
  });

  await runCheck('SSRF-26', 'Fail closed when DNS returns mixed public and AWS IMDSv4 169.254.169.254 IPs', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://example.com/webhook', {
          mockDnsResolver: async () => ['93.184.216.34', '169.254.169.254'],
        });
      },
      (err: any) => {
        return err.message.includes('BLOCKED_PRIVATE_IP_ADDRESS') && err.message.includes('169.254.169.254');
      }
    );
  });

  await runCheck('SSRF-27', 'Fail closed when DNS returns mixed public and IPv6 loopback ::1 IPs', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://example.com/webhook', {
          mockDnsResolver: async () => ['2606:4700:4700::1111', '::1'],
        });
      },
      (err: any) => {
        return err.message.includes('BLOCKED_PRIVATE_IP_ADDRESS') && err.message.includes('::1');
      }
    );
  });

  await runCheck('SSRF-28', 'Fail closed when DNS resolver returns empty address list', async () => {
    await assert.rejects(
      async () => {
        await validateWebhookUrl('https://example.com/webhook', {
          mockDnsResolver: async () => [],
        });
      },
      (err: any) => {
        return err.message.includes('DNS_RESOLUTION_FAILED');
      }
    );
  });

  // --- Transport Boundary & Payload Size Limit Tests ---
  await runCheck('SSRF-29', 'Reject outbound webhook payload exceeding 256KB limit', async () => {
    const hugePayload = 'x'.repeat(MAX_WEBHOOK_PAYLOAD_BYTES + 1024);
    const result = await dispatchWebhook({
      endpointUrl: 'https://example.com/hook',
      secret: 'whsec_test',
      eventId: 'evt-1',
      deliveryId: 'deliv-1',
      payloadRaw: hugePayload,
    });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.httpStatus, null);
    assert.ok(result.errorMessage?.includes('PAYLOAD_SIZE_LIMIT_EXCEEDED'));
  });

  // --- Live Local HTTP Server Test Harness ---
  let testServerPort: number = 0;
  let receivedServerPayload: string = '';
  let receivedServerHeaders: http.IncomingHttpHeaders = {};
  let serverMode: 'normal' | 'large_response' | 'redirect' = 'normal';

  const testServer = http.createServer((req, res) => {
    receivedServerHeaders = req.headers;
    const bodyChunks: Buffer[] = [];
    req.on('data', (c) => bodyChunks.push(c));
    req.on('end', () => {
      receivedServerPayload = Buffer.concat(bodyChunks).toString('utf8');

      if (serverMode === 'redirect') {
        res.writeHead(302, { Location: 'https://evil.internal.corp/steal' });
        res.end();
        return;
      }

      if (serverMode === 'large_response') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        // Return 5KB of text (should be truncated to 1024 bytes by client)
        res.end('A'.repeat(5000));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"received":true}');
    });
  });

  await new Promise<void>((res) => {
    testServer.listen(0, '127.0.0.1', () => {
      testServerPort = (testServer.address() as any).port;
      res();
    });
  });

  try {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    await runCheck('SSRF-30', 'Live local harness: deliver exact payload bytes & verify headers', async () => {
      serverMode = 'normal';
      const payload = '{"event":"election.results.published","round":14}';
      const result = await dispatchWebhook({
        endpointUrl: `http://127.0.0.1:${testServerPort}/hook`,
        secret: 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef',
        eventId: 'evt-real-001',
        deliveryId: 'deliv-real-001',
        payloadRaw: payload,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.httpStatus, 200);
      assert.strictEqual(receivedServerPayload, payload);
      assert.strictEqual(receivedServerHeaders['x-panin-event-id'], 'evt-real-001');
      assert.strictEqual(receivedServerHeaders['x-panin-delivery-id'], 'deliv-real-001');
      assert.ok(receivedServerHeaders['x-panin-signature']);
    });

    await runCheck('SSRF-31', 'Live local harness: response sample is capped strictly at 1024 bytes', async () => {
      serverMode = 'large_response';
      const result = await dispatchWebhook({
        endpointUrl: `http://127.0.0.1:${testServerPort}/hook`,
        secret: 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef',
        eventId: 'evt-real-002',
        deliveryId: 'deliv-real-002',
        payloadRaw: '{"test":"large"}',
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.responseBodySample.length, 1024);
      assert.strictEqual(result.responseBodySample, 'A'.repeat(1024));
    });

    await runCheck('SSRF-32', 'Live local harness: 3xx redirect is rejected with REDIRECTS_FORBIDDEN (no follow)', async () => {
      serverMode = 'redirect';
      const result = await dispatchWebhook({
        endpointUrl: `http://127.0.0.1:${testServerPort}/hook`,
        secret: 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef',
        eventId: 'evt-real-003',
        deliveryId: 'deliv-real-003',
        payloadRaw: '{"test":"redirect"}',
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.httpStatus, 302);
      assert.ok(result.errorMessage?.includes('REDIRECTS_FORBIDDEN'));
    });

    process.env.NODE_ENV = prevEnv;
  } finally {
    testServer.close();
  }

  // --- Summary ---
  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');
  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled test suite failure:', err);
  process.exit(1);
});
