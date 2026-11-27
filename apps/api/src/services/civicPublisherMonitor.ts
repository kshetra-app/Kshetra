import { createHash } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { isSupabaseConfigured, isUsingServiceRole, supabase } from '../lib/supabase';

const daily = 24 * 60 * 60 * 1000;
const retryDelay = 60 * 60 * 1000;
const region = 'ap-south-1';
const transport = 'supabase-mumbai';

const publishers = [
  {
    id: 'telangana_law_department',
    format: 'legislation-index',
  },
  {
    id: 'telangana_state_portal',
    format: 'rss',
  },
  {
    id: 'telangana_electricity_regulatory_commission',
    format: 'hearing-notices',
  },
] as const;

type Publisher = (typeof publishers)[number];

interface PublisherCheck {
  transport?: string;
  status?: string;
  last_attempt_at?: string;
  fingerprint?: string;
}

export function isCivicPublisherCheckDue(previous: PublisherCheck, now = Date.now()): boolean {
  const lastAttempt = Date.parse(previous.last_attempt_at ?? '');
  const interval = previous.status === 'unavailable' ? retryDelay : daily;
  return (
    previous.transport !== transport ||
    !Number.isFinite(lastAttempt) ||
    now - lastAttempt >= interval
  );
}

export function fingerprintPublisherDocument(format: Publisher['format'], source: string): string {
  let evidence: string;
  if (format === 'hearing-notices') {
    const rows = source.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    evidence = rows
      .filter((row) => /date of public hearing|revised public hearing schedule/i.test(row))
      .map((row) => row.replace(/\s+/g, ' ').trim())
      .join('\n');
  } else if (format === 'rss') {
    // The channel build timestamp changes independently of published entries.
    evidence = (source.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? []).join('\n');
  } else {
    const links = Array.from(
      source.matchAll(/href=["']([^"']*\/Uploads\/LawDepartment\/[^"']+\.pdf)["']/gi),
      (match) => match[1],
    );
    evidence = [...new Set(links)].sort().join('\n');
  }
  if (!evidence) throw new Error('Publisher response did not contain the expected records');
  return createHash('sha256').update(evidence).digest('hex');
}

export async function fetchCivicPublisherFingerprint(
  functionUrl: URL,
  token: string,
  publisher: Publisher,
): Promise<string> {
  const url = new URL(functionUrl);
  url.searchParams.set('publisher', publisher.id);
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(25_000),
    headers: { 'x-region': region, 'x-poligram-civic-token': token },
  });
  if (!response.ok || response.headers.get('x-sb-edge-region') !== region) {
    await response.body?.cancel();
    if (!response.ok) {
      const upstream = response.headers.get('x-poligram-upstream-status');
      throw new Error(
        upstream
          ? `Publisher returned HTTP ${upstream}`
          : `Publisher worker returned HTTP ${response.status}`,
      );
    }
    throw new Error('Publisher worker did not run in the expected region');
  }
  return fingerprintPublisherDocument(publisher.format, await response.text());
}

export const civicPublisherMonitor: FastifyPluginAsync = async (app) => {
  if (!isProductionLikeRuntime() || !isSupabaseConfigured || !isUsingServiceRole) return;

  const token = process.env.CIVIC_PUBLISHER_TOKEN?.trim();
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !supabaseUrl) {
    app.log.warn('Civic publisher worker credentials are missing or invalid');
    return;
  }
  const functionUrl = new URL('/functions/v1/civic-publisher', supabaseUrl);
  if (functionUrl.protocol !== 'https:') {
    app.log.warn('Civic publisher worker requires HTTPS');
    return;
  }

  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  const tick = () => {
    if (running) return;
    running = (async () => {
      const result = await supabase
        .from('data_sources')
        .select('id, metadata, updated_at')
        .in(
          'id',
          publishers.map(({ id }) => id),
        )
        .eq('is_active', true);
      if (result.error) throw new Error('Could not load civic publishers');
      for (const row of result.data) {
        const publisher = publishers.find(({ id }) => id === row.id);
        if (!publisher) continue;
        const previous: PublisherCheck = row.metadata?.publisher_check ?? {};
        if (!isCivicPublisherCheckDue(previous)) continue;
        const checkedOn = new Date().toISOString();
        let check;
        try {
          const digest = await fetchCivicPublisherFingerprint(functionUrl, token, publisher);
          const changed = Boolean(previous.fingerprint && previous.fingerprint !== digest);
          const verifiedOn = new Date().toISOString();
          check = {
            ...previous,
            transport,
            fingerprint: digest,
            last_attempt_at: checkedOn,
            last_success_at: verifiedOn,
            last_error: null,
            status: changed ? 'changed' : previous.fingerprint ? 'unchanged' : 'baseline',
            ...(changed ? { last_changed_at: verifiedOn, review_required: true } : {}),
          };
        } catch (error) {
          const connectionCode = (error as NodeJS.ErrnoException).code;
          const message = error instanceof Error ? error.message : 'Unknown error';
          check = {
            ...previous,
            transport,
            last_attempt_at: checkedOn,
            status: 'unavailable',
            last_error: connectionCode ?? message,
          };
        }
        // The publisher registry holds the durable check state. This never
        // updates a bill, project, hearing, or its content verification date.
        const saved = await supabase
          .from('data_sources')
          .update({
            metadata: { ...row.metadata, publisher_check: check },
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
          .eq('updated_at', row.updated_at)
          .select('id');
        if (saved.error) {
          app.log.warn({ publisher: row.id }, 'Could not persist civic publisher check');
        } else if (
          saved.data.length &&
          ['baseline', 'changed', 'unavailable'].includes(check.status)
        ) {
          app.log.info({ publisher: row.id, status: check.status }, 'Civic publisher checked');
        }
      }
    })()
      .catch(() => app.log.warn('Civic publisher checks failed'))
      .finally(() => {
        running = undefined;
      });
  };

  app.addHook('onReady', async () => {
    tick();
    timer = setInterval(tick, retryDelay);
    timer.unref();
  });
  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer);
    await running;
  });
};
