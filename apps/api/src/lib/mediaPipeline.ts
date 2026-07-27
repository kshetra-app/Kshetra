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
  ingestUrl: string;
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
  const mode = env('EXPO_PUBLIC_MEDIA_MODE', 'demo');
  return {
    scheme: env('EXPO_PUBLIC_MEDIA_SCHEME', 'https'),
    ingestHost: env('EXPO_PUBLIC_MEDIA_INGEST_HOST', 'ingest.kshetra.example'),
    srsHost: env('EXPO_PUBLIC_MEDIA_SRS_HOST', 'srs.kshetra.example'),
    omeHost: env('EXPO_PUBLIC_MEDIA_OME_HOST', 'ome.kshetra.example'),
    livekitHost: env('EXPO_PUBLIC_MEDIA_LIVEKIT_HOST', 'livekit.kshetra.example'),
    edgeHost: env('EXPO_PUBLIC_MEDIA_EDGE_HOST', 'edge.kshetra.example'),
    ingestProtocol: (['rtmp', 'srt', 'whip'].includes(protocol) ? protocol : 'rtmp') as IngestProtocol,
    mode: (mode === 'self_hosted' ? 'self_hosted' : 'demo') as MediaMode,
  };
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
    return { tier: 'llhls', reason: `Low-latency needed (${why}) → OvenMediaEngine LL-HLS + WebRTC` };
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

export function selectPipeline(signals: PipelineSignals, hosts: MediaHosts = getMediaHosts()): MediaPipeline {
  const { tier, reason } = selectTier(signals);
  const { streamId } = signals;
  const { scheme, srsHost, omeHost, livekitHost, edgeHost, mode } = hosts;

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
