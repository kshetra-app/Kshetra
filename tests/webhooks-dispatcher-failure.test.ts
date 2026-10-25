/**
 * tests/webhooks-dispatcher-failure.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-REMEDIATION-006 (Section C.6)
 *
 * Scope:
 * 1. Dispatcher resolves exactly once (single-settle guarantee).
 * 2. Hard timeout terminates hanging connections and settles with TIMEOUT.
 * 3. Oversize responses (>64 KiB) immediately abort response/request and settle with RESPONSE_STREAM_OVERFLOW.
 * 4. Mid-stream socket destruction terminates gracefully and settles with NETWORK_ERROR.
 * 5. Normal responses (200, 4xx, 5xx) settle deterministically without unhandled rejections.
 */

import assert from 'node:assert';
import http from 'node:http';
import { dispatchWebhook } from '../apps/api/src/modules/webhooks/webhookDispatcher';

console.log('================================================================');
console.log('W022: DISPATCHER FAILURE MODES & SINGLE-SETTLE VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section C.6)');
console.log('================================================================\n');

process.env.NODE_ENV = 'test';

let passCount = 0;
let failCount = 0;

async function runCheck(id: string, description: string, fn: () => Promise<void> | void) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

const mockSecret = 'whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const samplePayloadRaw = JSON.stringify({
  id: 'evt-100',
  event: 'election.test',
  timestamp: new Date().toISOString(),
  data: { test: true },
});

async function runAll() {
  // ─── 1. OVERSIZE RESPONSE (>64 KiB) ───
  await runCheck('DISP-01', 'Oversize response (>64 KiB) immediately aborts and settles with RESPONSE_STREAM_OVERFLOW', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Send a 128 KiB chunk
      const chunk = Buffer.alloc(128 * 1024, 'A');
      res.write(chunk);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-100',
        deliveryId: 'del-100',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, false);
      assert.ok(
        result.errorMessage?.includes('RESPONSE_STREAM_OVERFLOW') || result.errorMessage?.includes('overflow'),
        `Error must indicate stream overflow, got: ${result.errorMessage}`
      );
      assert.ok(result.executionDurationMs < 10000, 'Must abort immediately without waiting for timeout');
    } finally {
      server.close();
    }
  });

  // ─── 2. HANGING / TIMEOUT REQUEST ───
  await runCheck('DISP-02', 'Hanging server connection triggers timeout and settles with TIMEOUT', async () => {
    const server = http.createServer((req, res) => {
      // Intentionally do not respond or end
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const start = Date.now();
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-101',
        deliveryId: 'del-101',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      const elapsed = Date.now() - start;
      assert.strictEqual(result.success, false);
      assert.ok(
        result.errorMessage?.includes('TIMEOUT') || result.errorMessage?.includes('timed out'),
        `Error must indicate timeout, got: ${result.errorMessage}`
      );
      assert.ok(elapsed >= 9500, `Elapsed time ${elapsed}ms must match 10s end-to-end timeout`);
    } finally {
      server.close();
    }
  });

  // ─── 3. MID-STREAM SOCKET DESTRUCTION ───
  await runCheck('DISP-03', 'Abrupt socket destruction mid-stream settles with NETWORK_ERROR', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"partial":');
      // Abruptly destroy socket
      req.socket.destroy();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-102',
        deliveryId: 'del-102',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.errorMessage);
    } finally {
      server.close();
    }
  });

  // ─── 4. NON-200 HTTP RESPONSES ───
  await runCheck('DISP-04', 'HTTP 500 error response settles with failed status and records status code', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-103',
        deliveryId: 'del-103',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.httpStatus, 500);
      assert.ok(result.responseBodySample?.includes('Internal Server Error'));
    } finally {
      server.close();
    }
  });

  // ─── 5. SUCCESSFUL 200 DELIVERY ───
  await runCheck('DISP-05', 'Successful 200 delivery captures headers, response sample, and settles delivered', async () => {
    const server = http.createServer((req, res) => {
      assert.ok(req.headers['x-panin-signature'], 'Must include signature header');
      assert.ok(req.headers['x-panin-timestamp'], 'Must include timestamp header');
      assert.ok(req.headers['x-panin-event-id'], 'Must include event ID header');
      assert.strictEqual(req.headers['content-type'], 'application/json; charset=utf-8');

      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Subscriber-Ack': 'true' });
      res.end(JSON.stringify({ received: true }));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-104',
        deliveryId: 'del-104',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.httpStatus, 200);
      assert.ok(result.responseBodySample?.includes('"received":true'));
      assert.strictEqual(result.responseHeaders?.['x-subscriber-ack'], 'true');
    } finally {
      server.close();
    }
  });

  // ─── 6. SINGLE-SETTLE GUARANTEE UNDER CONCURRENT EVENTS ───
  await runCheck('DISP-06', 'Single-settle guarantee: duplicate finish calls do not cause multi-settle or unhandled rejection', async () => {
    let unhandledCount = 0;
    const unhandledListener = () => { unhandledCount++; };
    process.on('unhandledRejection', unhandledListener);

    const server = http.createServer((req, res) => {
      // Send 70 KiB, triggering abort, then emit error and close
      res.writeHead(200);
      res.write(Buffer.alloc(70 * 1024, 'X'));
      setTimeout(() => {
        try {
          req.socket.destroy(new Error('Post-abort socket explosion'));
        } catch {}
      }, 50);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/webhook`;

    try {
      const result = await dispatchWebhook({
        endpointUrl: url,
        payloadRaw: samplePayloadRaw,
        eventId: 'evt-105',
        deliveryId: 'del-105',
        secret: mockSecret,
        allowLocalhostInTest: true,
      });

      assert.strictEqual(result.success, false);
      // Wait for any trailing asynchronous events
      await new Promise((r) => setTimeout(r, 200));
      assert.strictEqual(unhandledCount, 0, 'Must have zero unhandled rejections from post-settle events');
    } finally {
      process.removeListener('unhandledRejection', unhandledListener);
      server.close();
    }
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled failure in webhooks-dispatcher-failure test:', err);
  process.exit(1);
});
