import { EventEmitter } from 'node:events';
import https from 'node:https';
import http from 'node:http';
import * as egress from '../modules/webhooks/antiSsrfGuard';
import {
  dispatchWebhook,
  MAX_WEBHOOK_PAYLOAD_BYTES,
  MAX_RESPONSE_SAMPLE_BYTES,
  MAX_RESPONSE_STREAM_BYTES,
} from '../modules/webhooks/webhookDispatcher';

jest.mock('../modules/webhooks/antiSsrfGuard', () => ({
  validateAndPinEgressTarget: jest.fn(),
}));

const target = {
  rawUrl: 'https://example.test/path?q=1',
  parsedUrl: new URL('https://example.test/path?q=1'),
  hostname: 'example.test',
  port: 443,
  resolvedIps: ['8.8.8.8'],
  pinnedIp: '8.8.8.8',
  agent: {} as https.Agent,
};

const params = {
  endpointUrl: target.rawUrl,
  secret: 'signing-secret',
  eventId: 'event-1',
  deliveryId: 'delivery-1',
  payloadRaw: '{"id":1}',
};

function mockResponse(statusCode: number, headers: Record<string, unknown> = {}) {
  const response = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, unknown>;
    destroy: jest.Mock;
  };
  response.statusCode = statusCode;
  response.headers = headers;
  response.destroy = jest.fn();
  return response;
}

function installRequestMock(options: {
  statusCode?: number;
  headers?: Record<string, unknown>;
  chunks?: Buffer[];
  responseError?: Error;
  requestError?: Error;
  writeError?: Error;
  emitClose?: boolean;
} = {}) {
  const req = new EventEmitter() as EventEmitter & {
    write: jest.Mock;
    end: jest.Mock;
    destroy: jest.Mock;
  };
  req.write = jest.fn(() => {
    if (options.writeError) throw options.writeError;
    return true;
  });
  req.destroy = jest.fn();
  req.end = jest.fn(() => {
    if (options.requestError) {
      req.emit('error', options.requestError);
      return;
    }
    const res = mockResponse(options.statusCode ?? 204, options.headers ?? {});
    responseCallback?.(res as any);
    if (options.responseError) res.emit('error', options.responseError);
    else {
      for (const chunk of options.chunks ?? [Buffer.from('ok')]) res.emit('data', chunk);
      if (options.emitClose) res.emit('close');
      else res.emit('end');
    }
  });
  let responseCallback: ((response: unknown) => void) | undefined;
  const spy = jest.spyOn(https, 'request').mockImplementation(((...args: any[]) => {
    responseCallback = args[1];
    return req;
  }) as any);
  return { req, spy };
}

describe('webhook HTTP dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(egress, 'validateAndPinEgressTarget').mockResolvedValue(target);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects oversized payloads before egress validation or network activity', async () => {
    const result = await dispatchWebhook({ ...params, payloadRaw: 'x'.repeat(MAX_WEBHOOK_PAYLOAD_BYTES + 1) });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('PAYLOAD_SIZE_LIMIT_EXCEEDED');
    expect(egress.validateAndPinEgressTarget).not.toHaveBeenCalled();
  });

  it('returns SSRF validation errors without making a network request', async () => {
    (egress.validateAndPinEgressTarget as jest.Mock).mockRejectedValueOnce(new Error('BLOCKED_PRIVATE_IP_ADDRESS'));
    const result = await dispatchWebhook(params);
    expect(result).toMatchObject({ success: false, httpStatus: null, errorMessage: 'BLOCKED_PRIVATE_IP_ADDRESS' });
    expect(result.requestHeaders['X-PanIN-Event-ID']).toBe('event-1');
  });

  it('posts exact UTF-8 bytes and returns successful response metadata', async () => {
    const { req } = installRequestMock({
      statusCode: 204,
      headers: { 'content-type': 'application/json', 'x-array': ['a', 'b'], ignored: undefined },
      chunks: [Buffer.from('accepted')],
    });
    const result = await dispatchWebhook({ ...params, previousSecret: 'previous-secret' });
    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(204);
    expect(result.responseBodySample).toBe('accepted');
    expect(result.responseHeaders).toMatchObject({ 'content-type': 'application/json', 'x-array': 'a, b' });
    expect(result.requestHeaders['X-PanIN-Delivery-ID']).toBe('delivery-1');
    expect(result.requestHeaders['X-PanIN-Signature']).toContain('v1=');
    expect(req.write).toHaveBeenCalledWith(Buffer.from(params.payloadRaw, 'utf8'));
    expect(req.end).toHaveBeenCalledTimes(1);
  });

  it('uses a caller-provided payload digest when supplied', async () => {
    installRequestMock();
    const result = await dispatchWebhook({ ...params, payloadSha256: 'known-digest' });
    expect(result.requestHeaders['X-PanIN-Payload-SHA256']).toBe('known-digest');
  });

  it('does not follow redirects', async () => {
    const { req } = installRequestMock({ statusCode: 302, headers: { location: 'https://elsewhere.test' } });
    const result = await dispatchWebhook(params);
    expect(result).toMatchObject({ success: false, httpStatus: 302 });
    expect(result.errorMessage).toContain('REDIRECTS_FORBIDDEN');
    expect(req.destroy).toHaveBeenCalled();
  });

  it('reports non-2xx status as failed delivery', async () => {
    const resultPromise = dispatchWebhook(params);
    installRequestMock({ statusCode: 503, chunks: [Buffer.from('unavailable')] });
    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(503);
    expect(result.errorMessage).toBe('HTTP_STATUS_503');
  });

  it('bounds retained response sample to one kilobyte', async () => {
    installRequestMock({ chunks: [Buffer.from('x'.repeat(MAX_RESPONSE_SAMPLE_BYTES + 100))] });
    const result = await dispatchWebhook(params);
    expect(Buffer.byteLength(result.responseBodySample)).toBe(MAX_RESPONSE_SAMPLE_BYTES);
  });

  it('aborts oversized response streams', async () => {
    const { req } = installRequestMock({ chunks: [Buffer.alloc(MAX_RESPONSE_STREAM_BYTES + 1)] });
    const result = await dispatchWebhook(params);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('RESPONSE_STREAM_OVERFLOW');
    expect(req.destroy).toHaveBeenCalled();
  });

  it('handles request network errors', async () => {
    installRequestMock({ requestError: new Error('connection refused') });
    const result = await dispatchWebhook(params);
    expect(result).toMatchObject({ success: false, httpStatus: null, errorMessage: 'connection refused' });
  });

  it('handles synchronous socket-write errors', async () => {
    installRequestMock({ writeError: new Error('write failed') });
    const result = await dispatchWebhook(params);
    expect(result).toMatchObject({ success: false, errorMessage: 'write failed' });
  });

  it('handles response stream errors', async () => {
    installRequestMock({ statusCode: 502, responseError: new Error('stream reset') });
    const result = await dispatchWebhook(params);
    expect(result).toMatchObject({ success: false, httpStatus: 502, errorMessage: 'stream reset' });
  });

  it('handles a premature response close', async () => {
    installRequestMock({ statusCode: 200, chunks: [Buffer.from('partial')], emitClose: true });
    const result = await dispatchWebhook(params);
    expect(result.success).toBe(true);
    expect(result.responseBodySample).toBe('partial');
  });
});
