/**
 * Unit tests for the LMX media pipeline router (lib/mediaPipeline.ts).
 * Covers tier auto-selection, ingest protocol URLs, demo vs self_hosted playback.
 */
import {
  selectTier,
  selectPipeline,
  buildIngestUrl,
  type MediaHosts,
  type PipelineSignals,
} from '../lib/mediaPipeline';

const HOSTS: MediaHosts = {
  scheme: 'https',
  ingestHost: 'ingest.test',
  srsHost: 'srs.test',
  omeHost: 'ome.test',
  livekitHost: 'lk.test',
  edgeHost: 'edge.test',
  ingestProtocol: 'rtmp',
  mode: 'self_hosted',
};

function sig(over: Partial<PipelineSignals> = {}): PipelineSignals {
  return {
    streamId: 'KX-1',
    issueCategory: 'general',
    alertDepartments: [],
    visibilityMode: 'public',
    ...over,
  };
}

describe('selectTier', () => {
  it('routes interactive sessions to LiveKit', () => {
    expect(selectTier(sig({ interactive: true })).tier).toBe('interactive');
  });

  it('routes emergency/breaking_news to the low-latency OME tier', () => {
    expect(selectTier(sig({ issueCategory: 'emergency' })).tier).toBe('llhls');
    expect(selectTier(sig({ issueCategory: 'breaking_news' })).tier).toBe('llhls');
  });

  it('routes any department alert to the low-latency tier', () => {
    expect(selectTier(sig({ issueCategory: 'general', alertDepartments: ['police'] })).tier).toBe('llhls');
  });

  it('routes general public to the SRS broadcast tier', () => {
    expect(selectTier(sig({ issueCategory: 'traffic' })).tier).toBe('broadcast');
  });

  it('interactive wins over low-latency signals', () => {
    expect(selectTier(sig({ interactive: true, issueCategory: 'emergency' })).tier).toBe('interactive');
  });
});

describe('buildIngestUrl', () => {
  it('builds rtmp by default', () => {
    expect(buildIngestUrl('KX-9', HOSTS)).toBe('rtmp://ingest.test:1935/live/KX-9');
  });
  it('builds srt', () => {
    expect(buildIngestUrl('KX-9', { ...HOSTS, ingestProtocol: 'srt' })).toBe(
      'srt://ingest.test:8890?streamid=publish:live/KX-9',
    );
  });
  it('builds whip', () => {
    expect(buildIngestUrl('KX-9', { ...HOSTS, ingestProtocol: 'whip' })).toBe(
      'https://ingest.test:8889/live/KX-9/whip',
    );
  });
});

describe('selectPipeline (self_hosted)', () => {
  it('broadcast → SRS HLS via edge + WHEP', () => {
    const p = selectPipeline(sig({ issueCategory: 'civic', streamId: 'KX-2' }), HOSTS);
    expect(p.tier).toBe('broadcast');
    expect(p.playbackHls).toBe('https://edge.test/live/KX-2.m3u8');
    expect(p.playbackWebrtc).toContain('srs.test:8000');
    expect(p.ingestUrl).toBe('rtmp://ingest.test:1935/live/KX-2');
  });

  it('llhls → OME LL-HLS via edge + ws signalling', () => {
    const p = selectPipeline(sig({ issueCategory: 'emergency', streamId: 'KX-3' }), HOSTS);
    expect(p.tier).toBe('llhls');
    expect(p.playbackHls).toBe('https://edge.test/llhls/app/KX-3/llhls.m3u8');
    expect(p.playbackWebrtc).toBe('wss://ome.test:3333/app/KX-3');
  });

  it('interactive → LiveKit, no HLS', () => {
    const p = selectPipeline(sig({ interactive: true }), HOSTS);
    expect(p.tier).toBe('interactive');
    expect(p.playbackHls).toBeNull();
    expect(p.playbackWebrtc).toBe('wss://lk.test');
  });
});

describe('selectPipeline (demo)', () => {
  it('returns a public test HLS stream but still a real ingest URL', () => {
    const p = selectPipeline(sig({ streamId: 'KX-4' }), { ...HOSTS, mode: 'demo' });
    expect(p.playbackHls).toMatch(/^https:\/\/(test-streams\.mux\.dev|devstreaming-cdn\.apple\.com)/);
    expect(p.ingestUrl).toBe('rtmp://ingest.test:1935/live/KX-4');
    expect(p.playbackWebrtc).toBeNull();
  });

  it('is deterministic per streamId', () => {
    const a = selectPipeline(sig({ streamId: 'KX-same' }), { ...HOSTS, mode: 'demo' });
    const b = selectPipeline(sig({ streamId: 'KX-same' }), { ...HOSTS, mode: 'demo' });
    expect(a.playbackHls).toBe(b.playbackHls);
  });
});
