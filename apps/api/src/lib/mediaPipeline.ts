import { createHmac, timingSafeEqual } from 'node:crypto';
import { isProductionLikeRuntime } from './runtimeEnvironment';
/**
 * Kshetra LMX — Media Pipeline Router (API mirror).
 *
 * Self-contained copy of apps/mobile/lib/mediaPipeline.ts (no shared package in
 * this monorepo yet — keep the two in sync). Pure logic: picks a self-hosted media
 * tier and builds ingest/playback URLs for the Live Event Object. See infra/media/.
 */

export type MediaTier = 'interactive' | 'llhls' | 'broadcast';
export type IngestProtocol = 'rtmp' | 'srt' | 'whip';
export type MediaMode = 'demo' | 'self_hosted';

export interface MediaHosts {
  scheme: string;
  ingestHost: string;
  srsHost: string;
  omeHost: string;
  livekitHost: string;
  edgeHost: string;
  ingestProtocol: IngestProtocol;
  mode: MediaMode;
}

export interface PipelineSignals {
  streamId: string;
  issueCategory: string;
  alertDepartments: string[];
  visibilityMode: string;
  interactive?: boolean;
}

export interface MediaPipeline {
  tier: MediaTier;
  reason: string;
  ingestUrl: string | null;
  playbackHls: string | null;
  playbackWebrtc: string | null;
}

const DEMO_HLS = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
  'https://test-streams.mux.dev/pts_shift/master.m3u8',
];

function env(key: string, fallback: string): string {
  const v = process.env?.[key];
  return v && v.length > 0 ? v : fallback;
}

export function getMediaHosts(): MediaHosts {
  const protocol = env('EXPO_PUBLIC_MEDIA_INGEST_PROTOCOL', 'rtmp');
  const isProductionRuntime = isProductionLikeRuntime();
  const mode = env('EXPO_PUBLIC_MEDIA_MODE', isProductionRuntime ? 'self_hosted' : 'demo');
  return {
    scheme: env('EXPO_PUBLIC_MEDIA_SCHEME', 'https'),
    ingestHost: env('EXPO_PUBLIC_MEDIA_INGEST_HOST', 'ingest.kshetra.example'),
    srsHost: env('EXPO_PUBLIC_MEDIA_SRS_HOST', 'srs.kshetra.example'),
    omeHost: env('EXPO_PUBLIC_MEDIA_OME_HOST', 'ome.kshetra.example'),
    livekitHost: env('EXPO_PUBLIC_MEDIA_LIVEKIT_HOST', 'livekit.kshetra.example'),
    edgeHost: env('EXPO_PUBLIC_MEDIA_EDGE_HOST', 'edge.kshetra.example'),
    ingestProtocol: (['rtmp', 'srt', 'whip'].includes(protocol)
      ? protocol
      : 'rtmp') as IngestProtocol,
    mode: (mode === 'self_hosted' ? 'self_hosted' : 'demo') as MediaMode,
  };
}

/** True only when the production publish and playback hosts are explicitly configured. */
export function isMediaPipelineConfigured(hosts: MediaHosts = getMediaHosts()): boolean {
  if (hosts.mode !== 'self_hosted') return false;
  const configuredHosts = [
    hosts.ingestHost,
    hosts.srsHost,
    hosts.omeHost,
    hosts.livekitHost,
    hosts.edgeHost,
  ];
  return configuredHosts.every((host) => {
    const normalized = host.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      !normalized.endsWith('.example') &&
      normalized !== 'localhost' &&
      normalized !== '127.0.0.1'
    );
  });
}

export function selectTier(signals: PipelineSignals): { tier: MediaTier; reason: string } {
  if (signals.interactive) {
    return { tier: 'interactive', reason: 'Two-way / multi-guest → LiveKit SFU' };
  }
  const lowLatency =
    signals.issueCategory === 'emergency' ||
    signals.issueCategory === 'breaking_news' ||
    signals.alertDepartments.length > 0;
  if (lowLatency) {
    const why =
      signals.alertDepartments.length > 0
        ? `${signals.alertDepartments.length} department alert(s)`
        : `category ${signals.issueCategory}`;
    return {
      tier: 'llhls',
      reason: `Low-latency needed (${why}) → OvenMediaEngine LL-HLS + WebRTC`,
    };
  }
  return { tier: 'broadcast', reason: 'General public → SRS HLS + edge CDN' };
}

function wsScheme(scheme: string): string {
  return scheme === 'https' ? 'wss' : 'ws';
}

export function buildIngestUrl(streamId: string, hosts: MediaHosts): string {
  const { ingestHost, scheme, ingestProtocol } = hosts;
  switch (ingestProtocol) {
    case 'srt':
      return `srt://${ingestHost}:8890?streamid=publish:live/${streamId}`;
    case 'whip':
      return `${scheme}://${ingestHost}:8889/live/${streamId}/whip`;
    case 'rtmp':
    default:
      return `rtmp://${ingestHost}:1935/live/${streamId}`;
  }
}

/** WHIP publish endpoint on the MediaMTX gateway (used by the in-app WebRTC broadcaster). */
export function buildWhipPublishUrl(streamId: string, hosts: MediaHosts = getMediaHosts()): string {
  return `${hosts.scheme}://${hosts.ingestHost}:8889/live/${streamId}/whip`;
}

export function selectPipeline(
  signals: PipelineSignals,
  hosts: MediaHosts = getMediaHosts(),
): MediaPipeline {
  const { tier, reason } = selectTier(signals);
  const { streamId } = signals;
  const { scheme, srsHost, omeHost, livekitHost, edgeHost, mode } = hosts;

  // Demo playback is useful for local walkthroughs, but a deployed app must
  // never attach a public test stream or placeholder media host to a live event.
  if (isProductionLikeRuntime() && !isMediaPipelineConfigured(hosts)) {
    return {
      tier,
      reason: `${reason} (live media unavailable; configure the self-hosted media plane)`,
      ingestUrl: null,
      playbackHls: null,
      playbackWebrtc: null,
    };
  }

  if (tier === 'interactive') {
    return {
      tier,
      reason,
      ingestUrl: `${scheme}://${livekitHost}/rtc`,
      playbackHls: null,
      playbackWebrtc: `${wsScheme(scheme)}://${livekitHost}`,
    };
  }

  const ingestUrl = buildIngestUrl(streamId, hosts);

  if (mode === 'demo') {
    let h = 0;
    for (let i = 0; i < streamId.length; i++) h = (h * 31 + streamId.charCodeAt(i)) >>> 0;
    return {
      tier,
      reason: `${reason} (demo playback)`,
      ingestUrl,
      playbackHls: DEMO_HLS[h % DEMO_HLS.length],
      playbackWebrtc: null,
    };
  }

  if (tier === 'llhls') {
    return {
      tier,
      reason,
      ingestUrl,
      playbackHls: `${scheme}://${edgeHost}/llhls/app/${streamId}/llhls.m3u8`,
      playbackWebrtc: `${wsScheme(scheme)}://${omeHost}:3333/app/${streamId}`,
    };
  }

  return {
    tier,
    reason,
    ingestUrl,
    playbackHls: `${scheme}://${edgeHost}/live/${streamId}.m3u8`,
    playbackWebrtc: `${scheme}://${srsHost}:8000/rtc/v1/whep/?app=live&stream=${streamId}`,
  };
}

export const liveEventIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export const liveStudioPath = '/api/v1/lmx/studio';
export const liveWatchPath = '/api/v1/lmx/watch';

export function getHostedLiveConfig() {
  const host = process.env.LIVE_MEDIA_PRIVATE_HOST;
  const studioOrigin = process.env.LIVE_STUDIO_ORIGIN;
  const signingKey = process.env.LIVE_STUDIO_SIGNING_KEY;
  const controlPassword = process.env.LIVE_MEDIA_CONTROL_PASSWORD;
  const advertisedPort = process.env.LIVE_MEDIA_PUBLIC_TCP_PORT;
  if (
    !host ||
    !studioOrigin ||
    !signingKey ||
    !controlPassword ||
    !/^[a-f0-9]{64}$/i.test(signingKey)
  )
    return null;
  // These ports must never be exposed directly to viewers or broadcasters.
  if (!/^[a-z\d-]+\.railway\.internal$/i.test(host) && host !== '127.0.0.1') return null;
  const publicTcpPort =
    advertisedPort && /^\d{1,5}$/.test(advertisedPort) ? Number(advertisedPort) : null;
  if (host !== '127.0.0.1' && (!publicTcpPort || publicTcpPort > 65535)) return null;
  try {
    const url = new URL(studioOrigin);
    if (
      url.origin !== studioOrigin ||
      (url.protocol !== 'https:' && url.hostname !== 'localhost')
    ) {
      return null;
    }
    return { host, studioOrigin, signingKey, controlPassword, publicTcpPort };
  } catch {
    return null;
  }
}

type Config = NonNullable<ReturnType<typeof getHostedLiveConfig>>;

export function hostedWhipAnswer(config: Config, answer: string) {
  if (!config.publicTcpPort) return answer;
  // Railway forwards its assigned public port to the fixed MediaMTX ICE listener.
  return answer.replace(
    /^(a=candidate:\S+ \d+ tcp \d+ \S+) 8189(?= typ host\b)/gim,
    `$1 ${config.publicTcpPort}`,
  );
}

export function studioTicket(
  config: Config,
  eventId: string,
  use: 'broadcast' | 'review' = 'broadcast',
) {
  const expiresAt = Date.now() + (use === 'broadcast' ? 4 * 60 * 60_000 : 5 * 60_000);
  const payload = `${eventId}.${expiresAt}`;
  const proof = createHmac('sha256', config.signingKey)
    .update(`${use}:${payload}`)
    .digest('base64url');
  return `${payload}.${proof}`;
}

export function isStudioTicketValid(
  config: Config,
  eventId: string,
  authorization?: string,
  use: 'broadcast' | 'review' = 'broadcast',
) {
  const ticket = authorization?.match(/^Bearer ([a-f0-9-]+)\.(\d{13})\.([\w-]{43})$/);
  if (!ticket || ticket[1] !== eventId || Number(ticket[2]) <= Date.now()) return false;
  const expected = createHmac('sha256', config.signingKey)
    .update(`${use}:${ticket[1]}.${ticket[2]}`)
    .digest('base64url');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(ticket[3]));
}

export async function mediaRequest(
  config: Config,
  service: 'control' | 'ingest' | 'playback' | 'recordings',
  path: string,
  init?: RequestInit,
) {
  const port = { control: 9997, ingest: 8889, playback: 8888, recordings: 9996 }[service];
  const headers = new Headers(init?.headers);
  if (service === 'control') {
    const credential = Buffer.from(`poligram-control:${config.controlPassword}`).toString('base64');
    headers.set('Authorization', `Basic ${credential}`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), service === 'playback' ? 15_000 : 8_000);
  try {
    return await fetch(`http://${config.host}:${port}${path}`, {
      ...init,
      headers,
      redirect: 'error',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function isHostedLiveReady(config = getHostedLiveConfig()) {
  if (!config) return false;
  try {
    const response = await mediaRequest(config, 'control', '/v3/paths/list');
    if (!response.ok) return false;
    const payload = (await response.json()) as { items?: unknown };
    return Array.isArray(payload.items);
  } catch {
    return false;
  }
}

export async function isHostedStreamReady(config: Config, id: string) {
  try {
    const response = await mediaRequest(config, 'control', `/v3/paths/get/watch/${id}`);
    if (!response.ok) return false;
    const path = (await response.json()) as { ready?: boolean };
    return path.ready === true;
  } catch {
    return false;
  }
}

export async function listHostedLivePaths(config: Config) {
  try {
    const response = await mediaRequest(config, 'control', '/v3/paths/list?itemsPerPage=100');
    if (!response.ok) return new Set<string>();
    const { items } = (await response.json()) as { items?: { name: string; ready: boolean }[] };
    return new Set(
      (items ?? [])
        .filter((item) => item.ready && item.name.startsWith('watch/'))
        .map((item) => item.name.slice('watch/'.length)),
    );
  } catch {
    return new Set<string>();
  }
}

export async function hostedRecordingQuery(config: Config, id: string) {
  const query = new URLSearchParams({ path: `watch/${id}` });
  try {
    const response = await mediaRequest(config, 'recordings', `/list?${query}`);
    if (!response.ok) return null;
    const spans = (await response.json()) as { start: string; duration: number }[];
    const recording = Array.isArray(spans) ? spans[0] : null;
    if (!recording || !Number.isFinite(Date.parse(recording.start)) || !(recording.duration > 0))
      return null;
    query.set('start', recording.start);
    query.set('duration', String(recording.duration));
    return query;
  } catch {
    return null;
  }
}

export async function stopHostedStream(config: Config, id: string) {
  const path = await mediaRequest(config, 'control', `/v3/paths/get/ingest/${id}`);
  if (path.status === 404) return;
  if (!path.ok) throw new Error('Could not resolve the publishing session');
  const { source } = (await path.json()) as { source?: { id?: string; type?: string } };
  if (!source) return;
  if (source.type !== 'webRTCSession' || !source.id || !liveEventIdPattern.test(source.id)) {
    throw new Error('Unexpected publishing session');
  }
  const result = await mediaRequest(config, 'control', `/v3/webrtcsessions/kick/${source.id}`, {
    method: 'POST',
  });
  if (!result.ok && result.status !== 404)
    throw new Error('Could not close the publishing session');
}
