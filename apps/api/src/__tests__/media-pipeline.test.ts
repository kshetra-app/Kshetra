/**
 * Unit Test Suite for Media Pipeline Router (apps/api/src/lib/mediaPipeline.ts)
 * Master Execution Framework — CTO Directive 119
 */

import {
  getMediaHosts,
  selectTier,
  buildIngestUrl,
  buildWhipPublishUrl,
  selectPipeline,
  type PipelineSignals,
  type MediaHosts,
} from '../lib/mediaPipeline';

describe('Media Pipeline Router (mediaPipeline.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getMediaHosts', () => {
    it('returns default hosts and protocol when environment variables are unset', () => {
      delete process.env.EXPO_PUBLIC_MEDIA_INGEST_PROTOCOL;
      delete process.env.EXPO_PUBLIC_MEDIA_MODE;
      delete process.env.EXPO_PUBLIC_MEDIA_SCHEME;
      delete process.env.EXPO_PUBLIC_MEDIA_INGEST_HOST;
      delete process.env.EXPO_PUBLIC_MEDIA_SRS_HOST;
      delete process.env.EXPO_PUBLIC_MEDIA_OME_HOST;
      delete process.env.EXPO_PUBLIC_MEDIA_LIVEKIT_HOST;
      delete process.env.EXPO_PUBLIC_MEDIA_EDGE_HOST;

      const hosts = getMediaHosts();
      expect(hosts.scheme).toBe('https');
      expect(hosts.ingestHost).toBe('ingest.kshetra.example');
      expect(hosts.srsHost).toBe('srs.kshetra.example');
      expect(hosts.omeHost).toBe('ome.kshetra.example');
      expect(hosts.livekitHost).toBe('livekit.kshetra.example');
      expect(hosts.edgeHost).toBe('edge.kshetra.example');
      expect(hosts.ingestProtocol).toBe('rtmp');
      expect(hosts.mode).toBe('demo');
    });

    it('honors valid environment variables', () => {
      process.env.EXPO_PUBLIC_MEDIA_INGEST_PROTOCOL = 'srt';
      process.env.EXPO_PUBLIC_MEDIA_MODE = 'self_hosted';
      process.env.EXPO_PUBLIC_MEDIA_SCHEME = 'http';
      process.env.EXPO_PUBLIC_MEDIA_INGEST_HOST = 'custom-ingest.com';
      process.env.EXPO_PUBLIC_MEDIA_SRS_HOST = 'custom-srs.com';
      process.env.EXPO_PUBLIC_MEDIA_OME_HOST = 'custom-ome.com';
      process.env.EXPO_PUBLIC_MEDIA_LIVEKIT_HOST = 'custom-livekit.com';
      process.env.EXPO_PUBLIC_MEDIA_EDGE_HOST = 'custom-edge.com';

      const hosts = getMediaHosts();
      expect(hosts.scheme).toBe('http');
      expect(hosts.ingestHost).toBe('custom-ingest.com');
      expect(hosts.srsHost).toBe('custom-srs.com');
      expect(hosts.omeHost).toBe('custom-ome.com');
      expect(hosts.livekitHost).toBe('custom-livekit.com');
      expect(hosts.edgeHost).toBe('custom-edge.com');
      expect(hosts.ingestProtocol).toBe('srt');
      expect(hosts.mode).toBe('self_hosted');
    });

    it('falls back to safe defaults when invalid protocol or mode is specified', () => {
      process.env.EXPO_PUBLIC_MEDIA_INGEST_PROTOCOL = 'invalid_protocol';
      process.env.EXPO_PUBLIC_MEDIA_MODE = 'unsupported_mode';

      const hosts = getMediaHosts();
      expect(hosts.ingestProtocol).toBe('rtmp');
      expect(hosts.mode).toBe('demo');
    });
  });

  describe('selectTier', () => {
    it('selects interactive tier when interactive flag is true', () => {
      const signals: PipelineSignals = {
        streamId: 'stream-1',
        issueCategory: 'general',
        alertDepartments: [],
        visibilityMode: 'public',
        interactive: true,
      };

      const result = selectTier(signals);
      expect(result.tier).toBe('interactive');
      expect(result.reason).toContain('LiveKit SFU');
    });

    it('selects llhls tier when category is emergency', () => {
      const signals: PipelineSignals = {
        streamId: 'stream-2',
        issueCategory: 'emergency',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const result = selectTier(signals);
      expect(result.tier).toBe('llhls');
      expect(result.reason).toContain('category emergency');
    });

    it('selects llhls tier when category is breaking_news', () => {
      const signals: PipelineSignals = {
        streamId: 'stream-3',
        issueCategory: 'breaking_news',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const result = selectTier(signals);
      expect(result.tier).toBe('llhls');
      expect(result.reason).toContain('category breaking_news');
    });

    it('selects llhls tier when alertDepartments are populated', () => {
      const signals: PipelineSignals = {
        streamId: 'stream-4',
        issueCategory: 'water_supply',
        alertDepartments: ['Water Works', 'Disaster Response'],
        visibilityMode: 'public',
      };

      const result = selectTier(signals);
      expect(result.tier).toBe('llhls');
      expect(result.reason).toContain('2 department alert(s)');
    });

    it('selects broadcast tier for general public streams', () => {
      const signals: PipelineSignals = {
        streamId: 'stream-5',
        issueCategory: 'general_rally',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const result = selectTier(signals);
      expect(result.tier).toBe('broadcast');
      expect(result.reason).toContain('SRS HLS + edge CDN');
    });
  });

  describe('buildIngestUrl and buildWhipPublishUrl', () => {
    const baseHosts: MediaHosts = {
      scheme: 'https',
      ingestHost: 'ingest.test.com',
      srsHost: 'srs.test.com',
      omeHost: 'ome.test.com',
      livekitHost: 'livekit.test.com',
      edgeHost: 'edge.test.com',
      ingestProtocol: 'rtmp',
      mode: 'demo',
    };

    it('builds RTMP ingest URL', () => {
      const url = buildIngestUrl('stream-xyz', { ...baseHosts, ingestProtocol: 'rtmp' });
      expect(url).toBe('rtmp://ingest.test.com:1935/live/stream-xyz');
    });

    it('builds SRT ingest URL', () => {
      const url = buildIngestUrl('stream-xyz', { ...baseHosts, ingestProtocol: 'srt' });
      expect(url).toBe('srt://ingest.test.com:8890?streamid=publish:live/stream-xyz');
    });

    it('builds WHIP ingest URL', () => {
      const url = buildIngestUrl('stream-xyz', { ...baseHosts, ingestProtocol: 'whip' });
      expect(url).toBe('https://ingest.test.com:8889/live/stream-xyz/whip');
    });

    it('builds WHIP publish URL', () => {
      const whip = buildWhipPublishUrl('stream-xyz', baseHosts);
      expect(whip).toBe('https://ingest.test.com:8889/live/stream-xyz/whip');
    });
  });

  describe('selectPipeline', () => {
    const demoHosts: MediaHosts = {
      scheme: 'https',
      ingestHost: 'ingest.test.com',
      srsHost: 'srs.test.com',
      omeHost: 'ome.test.com',
      livekitHost: 'livekit.test.com',
      edgeHost: 'edge.test.com',
      ingestProtocol: 'rtmp',
      mode: 'demo',
    };

    const selfHostedHosts: MediaHosts = {
      ...demoHosts,
      mode: 'self_hosted',
    };

    it('returns interactive pipeline with WebRTC endpoints', () => {
      const signals: PipelineSignals = {
        streamId: 's-interactive',
        issueCategory: 'general',
        alertDepartments: [],
        visibilityMode: 'private',
        interactive: true,
      };

      const pipeline = selectPipeline(signals, demoHosts);
      expect(pipeline.tier).toBe('interactive');
      expect(pipeline.ingestUrl).toBe('https://livekit.test.com/rtc');
      expect(pipeline.playbackHls).toBeNull();
      expect(pipeline.playbackWebrtc).toBe('wss://livekit.test.com');
    });

    it('returns ws:// scheme when scheme is http in interactive tier', () => {
      const signals: PipelineSignals = {
        streamId: 's-interactive-http',
        issueCategory: 'general',
        alertDepartments: [],
        visibilityMode: 'private',
        interactive: true,
      };

      const pipeline = selectPipeline(signals, { ...demoHosts, scheme: 'http' });
      expect(pipeline.playbackWebrtc).toBe('ws://livekit.test.com');
    });

    it('returns demo HLS playlist in demo mode', () => {
      const signals: PipelineSignals = {
        streamId: 'demo-broadcast-stream',
        issueCategory: 'general',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const pipeline = selectPipeline(signals, demoHosts);
      expect(pipeline.tier).toBe('broadcast');
      expect(pipeline.reason).toContain('(demo playback)');
      expect(pipeline.playbackHls).toMatch(/^https:\/\/.+\.m3u8$/);
      expect(pipeline.playbackWebrtc).toBeNull();
    });

    it('returns LL-HLS and OvenMediaEngine WebRTC in self_hosted mode for emergency tier', () => {
      const signals: PipelineSignals = {
        streamId: 'emergency-stream-101',
        issueCategory: 'emergency',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const pipeline = selectPipeline(signals, selfHostedHosts);
      expect(pipeline.tier).toBe('llhls');
      expect(pipeline.playbackHls).toBe(
        'https://edge.test.com/llhls/app/emergency-stream-101/llhls.m3u8',
      );
      expect(pipeline.playbackWebrtc).toBe('wss://ome.test.com:3333/app/emergency-stream-101');
    });

    it('returns standard SRS HLS and WHEP WebRTC in self_hosted mode for broadcast tier', () => {
      const signals: PipelineSignals = {
        streamId: 'broadcast-stream-202',
        issueCategory: 'general',
        alertDepartments: [],
        visibilityMode: 'public',
      };

      const pipeline = selectPipeline(signals, selfHostedHosts);
      expect(pipeline.tier).toBe('broadcast');
      expect(pipeline.playbackHls).toBe('https://edge.test.com/live/broadcast-stream-202.m3u8');
      expect(pipeline.playbackWebrtc).toBe(
        'https://srs.test.com:8000/rtc/v1/whep/?app=live&stream=broadcast-stream-202',
      );
    });
  });
});
