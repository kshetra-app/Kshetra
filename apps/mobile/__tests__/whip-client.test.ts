/**
 * Unit tests for the pure WHIP client (lib/whipClient.ts) using a mock peer +
 * mock fetch — no react-native-webrtc required.
 */
import { negotiateWhip, stopWhip, type MinimalPeer, type SdpDescription } from '../lib/whipClient';

function mockPeer(offerSdp = 'v=0\r\no=offer'): { pc: MinimalPeer; remote: () => SdpDescription | null } {
  let local: SdpDescription | null = null;
  let remote: SdpDescription | null = null;
  const pc: MinimalPeer = {
    createOffer: async () => ({ type: 'offer', sdp: offerSdp }),
    setLocalDescription: async (d) => { local = d; },
    setRemoteDescription: async (d) => { remote = d; },
    get localDescription() { return local; },
  };
  return { pc, remote: () => remote };
}

function mockResponse(init: { ok: boolean; status?: number; body?: string; location?: string | null }): Response {
  const headers = new Map<string, string>();
  if (init.location) headers.set('Location', init.location);
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 201 : 400),
    statusText: '',
    text: async () => init.body ?? '',
    headers: { get: (k: string) => headers.get(k) ?? null },
  } as unknown as Response;
}

describe('negotiateWhip', () => {
  it('POSTs the offer SDP and applies the answer', async () => {
    const { pc, remote } = mockPeer('v=0\r\no=THE_OFFER');
    const calls: any[] = [];
    const fakeFetch = (async (url: string, opts: any) => {
      calls.push({ url, opts });
      return mockResponse({ ok: true, body: 'v=0\r\no=THE_ANSWER', location: '/whip/resource/1' });
    }) as unknown as typeof fetch;

    const session = await negotiateWhip(pc, 'https://ingest.test:8889/live/KX-1/whip', { fetch: fakeFetch });

    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers['Content-Type']).toBe('application/sdp');
    expect(calls[0].opts.body).toContain('THE_OFFER');
    expect(remote()).toEqual({ type: 'answer', sdp: 'v=0\r\no=THE_ANSWER' });
    // Relative Location resolved against the endpoint origin.
    expect(session.resourceUrl).toBe('https://ingest.test:8889/whip/resource/1');
  });

  it('adds a bearer token when provided', async () => {
    const { pc } = mockPeer();
    let seen: any;
    const fakeFetch = (async (_u: string, opts: any) => { seen = opts; return mockResponse({ ok: true, body: 'a' }); }) as unknown as typeof fetch;
    await negotiateWhip(pc, 'https://x/whip', { fetch: fakeFetch, token: 'tok123' });
    expect(seen.headers.Authorization).toBe('Bearer tok123');
  });

  it('throws on a non-2xx response', async () => {
    const { pc } = mockPeer();
    const fakeFetch = (async () => mockResponse({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(negotiateWhip(pc, 'https://x/whip', { fetch: fakeFetch })).rejects.toThrow(/HTTP 503/);
  });

  it('throws on an empty answer', async () => {
    const { pc } = mockPeer();
    const fakeFetch = (async () => mockResponse({ ok: true, body: '' })) as unknown as typeof fetch;
    await expect(negotiateWhip(pc, 'https://x/whip', { fetch: fakeFetch })).rejects.toThrow(/empty SDP answer/);
  });
});

describe('stopWhip', () => {
  it('DELETEs the resource URL', async () => {
    let called: any;
    const fakeFetch = (async (url: string, opts: any) => { called = { url, opts }; return mockResponse({ ok: true }); }) as unknown as typeof fetch;
    await stopWhip('https://x/whip/1', { fetch: fakeFetch });
    expect(called.url).toBe('https://x/whip/1');
    expect(called.opts.method).toBe('DELETE');
  });

  it('is a no-op for a null resource and never throws', async () => {
    const fakeFetch = (async () => { throw new Error('should not be called'); }) as unknown as typeof fetch;
    await expect(stopWhip(null, { fetch: fakeFetch })).resolves.toBeUndefined();
  });

  it('swallows fetch errors', async () => {
    const fakeFetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    await expect(stopWhip('https://x/1', { fetch: fakeFetch })).resolves.toBeUndefined();
  });
});
