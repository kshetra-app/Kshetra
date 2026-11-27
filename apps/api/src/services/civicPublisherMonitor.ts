import { createHash } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { isSupabaseConfigured, isUsingServiceRole, supabase } from '../lib/supabase';

const daily = 24 * 60 * 60 * 1000;
const retryDelay = 60 * 60 * 1000;
const responseLimit = 2_000_000;

const publishers = [
  {
    id: 'telangana_law_department',
    url: 'https://law.telangana.gov.in/bills',
    format: 'legislation-index',
  },
  {
    id: 'telangana_state_portal',
    url: 'https://www.telangana.gov.in/category/news/feed/',
    format: 'rss',
  },
  {
    id: 'telangana_electricity_regulatory_commission',
    url: 'https://www.tgerc.telangana.gov.in/',
    format: 'hearing-notices',
  },
] as const;

type Publisher = (typeof publishers)[number];

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

async function fetchFingerprint(publisher: Publisher): Promise<string> {
  const response = await fetch(publisher.url, {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.body) throw new Error(`Publisher returned HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let source = '';
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > responseLimit) throw new Error('Publisher response exceeds the size limit');
      source += decoder.decode(value, { stream: true });
    }
    source += decoder.decode();
  } finally {
    await reader.cancel();
  }
  return fingerprintPublisherDocument(publisher.format, source);
}

export const civicPublisherMonitor: FastifyPluginAsync = async (app) => {
  if (!isProductionLikeRuntime() || !isSupabaseConfigured || !isUsingServiceRole) return;

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
        const previous = row.metadata?.publisher_check ?? {};
        const wait = previous.status === 'unavailable' ? retryDelay : daily;
        if (Date.now() - Date.parse(previous.last_attempt_at) < wait) continue;
        const checkedOn = new Date().toISOString();
        let check;
        try {
          const digest = await fetchFingerprint(publisher);
          const changed = Boolean(previous.fingerprint && previous.fingerprint !== digest);
          check = {
            ...previous,
            fingerprint: digest,
            last_attempt_at: checkedOn,
            last_success_at: checkedOn,
            status: changed ? 'changed' : previous.fingerprint ? 'unchanged' : 'baseline',
            ...(changed ? { last_changed_at: checkedOn, review_required: true } : {}),
          };
        } catch {
          check = { ...previous, last_attempt_at: checkedOn, status: 'unavailable' };
        }
        // The publisher registry holds the durable check state. This never
        // updates a bill, project, hearing, or its content verification date.
        const saved = await supabase
          .from('data_sources')
          .update({ metadata: { ...row.metadata, publisher_check: check }, updated_at: checkedOn })
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
