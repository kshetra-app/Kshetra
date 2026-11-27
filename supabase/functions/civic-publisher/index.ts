import { timingSafeEqual } from 'node:crypto';

const publishers = {
  telangana_law_department: 'https://law.telangana.gov.in/bills',
  telangana_state_portal: 'https://www.telangana.gov.in/category/news/feed/',
  telangana_electricity_regulatory_commission: 'https://www.tgerc.telangana.gov.in/',
} as const;

const responseLimit = 2_000_000;
const encoder = new TextEncoder();

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  const token = request.headers.get('x-poligram-civic-token') ?? '';
  const expected = Deno.env.get('CIVIC_PUBLISHER_TOKEN_SHA256') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(expected)) {
    return new Response(null, { status: 403 });
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  const expectedBytes = Uint8Array.from(expected.match(/../g)!, (byte) => parseInt(byte, 16));
  if (!timingSafeEqual(new Uint8Array(digest), expectedBytes)) {
    return new Response(null, { status: 403 });
  }

  const publisher = new URL(request.url).searchParams.get('publisher');
  if (!publisher || !Object.hasOwn(publishers, publisher)) {
    return new Response(null, { status: 400 });
  }
  if (Deno.env.get('SB_REGION') !== 'ap-south-1') return new Response(null, { status: 503 });

  const timeout = AbortSignal.timeout(15_000);
  try {
    const upstream = await fetch(publishers[publisher as keyof typeof publishers], {
      redirect: 'error',
      signal: timeout,
      headers: { 'User-Agent': 'Poligram civic publisher monitor' },
    });
    if (upstream.status !== 200 || !upstream.body) {
      await upstream.body?.cancel();
      return new Response(null, {
        status: 502,
        headers: { 'x-poligram-upstream-status': String(upstream.status) },
      });
    }

    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > responseLimit) return new Response(null, { status: 502 });
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    const content = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(content, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response(null, { status: timeout.aborted ? 504 : 502 });
  }
});
