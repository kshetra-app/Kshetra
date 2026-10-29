/**
 * Kshetra / PanIN Broadcast Management Service
 * Manages official channels, streams, ephemeral hashed stream keys, 
 * multi-tier ingest credentials, health telemetry, and lifecycle state machines.
 */

import crypto from 'node:crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMediaHosts } from '../lib/mediaPipeline';
import type { 
  BroadcastChannel, 
  BroadcastStream, 
  StreamIngestCredentials, 
  StreamTelemetrySnapshot, 
  CreateChannelRequest, 
  CreateStreamRequest, 
  StreamStatus 
} from '@kshetra/shared';

export class InvalidStateTransitionError extends Error {
  constructor(from: StreamStatus, to: StreamStatus) {
    super(`Cannot transition stream from ${from} to ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class BroadcastManagementService {
  private inMemoryChannels = new Map<string, BroadcastChannel>();
  private inMemoryStreams = new Map<string, BroadcastStream>();
  private inMemoryStreamKeys = new Map<string, { keyHash: string; rawKey?: string; streamId: string; channelId: string; expiresAt: string }>();
  private inMemoryTelemetry = new Map<string, StreamTelemetrySnapshot[]>();

  // In-memory daily salt for hashing (DPDP Act 2023)
  private dailyHmacSalt = crypto.randomBytes(32).toString('hex');

  /** Create an official broadcast channel */
  async createChannel(req: CreateChannelRequest): Promise<BroadcastChannel> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const channel: BroadcastChannel = {
      id,
      slug: req.slug.toLowerCase().trim(),
      title: req.title.trim(),
      description: req.description,
      channelType: req.channelType,
      verificationStatus: 'UNVERIFIED',
      personInternalId: req.personInternalId,
      organizationInternalId: req.organizationInternalId,
      stateCode: req.stateCode?.toUpperCase(),
      constituencyInternalId: req.constituencyInternalId,
      avatarUrl: req.avatarUrl,
      bannerUrl: req.bannerUrl,
      contactEmail: req.contactEmail,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('broadcast_channels')
          .insert({
            id: channel.id,
            slug: channel.slug,
            title: channel.title,
            description: channel.description,
            channel_type: channel.channelType,
            verification_status: channel.verificationStatus,
            person_internal_id: channel.personInternalId || null,
            organization_internal_id: channel.organizationInternalId || null,
            state_code: channel.stateCode || null,
            constituency_internal_id: channel.constituencyInternalId || null,
            avatar_url: channel.avatarUrl || null,
            banner_url: channel.bannerUrl || null,
            contact_email: channel.contactEmail || null,
            created_at: channel.createdAt,
            updated_at: channel.updatedAt,
          });
      } catch {
        // Fallback to in-memory store when remote staging schema is air-gapped
      }
    }

    this.inMemoryChannels.set(channel.id, channel);
    this.inMemoryChannels.set(channel.slug, channel);
    return channel;
  }

  /** Get channel by ID or slug */
  async getChannel(idOrSlug: string): Promise<BroadcastChannel | null> {
    if (this.inMemoryChannels.has(idOrSlug)) {
      return this.inMemoryChannels.get(idOrSlug)!;
    }

    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = supabase.from('broadcast_channels').select('*');
      const { data, error } = isUuid 
        ? await query.eq('id', idOrSlug).maybeSingle()
        : await query.eq('slug', idOrSlug.toLowerCase()).maybeSingle();

      if (!error && data) {
        const channel: BroadcastChannel = {
          id: data.id,
          slug: data.slug,
          title: data.title,
          description: data.description,
          channelType: data.channel_type,
          verificationStatus: data.verification_status,
          personInternalId: data.person_internal_id,
          organizationInternalId: data.organization_internal_id,
          stateCode: data.state_code,
          constituencyInternalId: data.constituency_internal_id,
          avatarUrl: data.avatar_url,
          bannerUrl: data.banner_url,
          contactEmail: data.contact_email,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        this.inMemoryChannels.set(channel.id, channel);
        this.inMemoryChannels.set(channel.slug, channel);
        return channel;
      }
    }

    return null;
  }

  /** Create / Schedule a broadcast stream */
  async createStream(req: CreateStreamRequest): Promise<{ stream: BroadcastStream; credentials: StreamIngestCredentials }> {
    const channel = await this.getChannel(req.channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${req.channelId}`);
    }

    const streamId = crypto.randomUUID();
    const now = new Date().toISOString();
    const hosts = getMediaHosts();

    const latencyProfile = req.latencyProfile || 'BROADCAST_HLS';
    const playbackHlsUrl = `${hosts.scheme}://${hosts.edgeHost}/live/${streamId}.m3u8`;
    const playbackLlhlsUrl = latencyProfile === 'LOW_LATENCY_LLHLS'
      ? `${hosts.scheme}://${hosts.edgeHost}/llhls/app/${streamId}/llhls.m3u8`
      : undefined;
    const playbackWebrtcUrl = latencyProfile === 'INTERACTIVE_SFU'
      ? `wss://${hosts.livekitHost}/rtc`
      : `${hosts.scheme}://${hosts.srsHost}:8000/rtc/v1/whep/?app=live&stream=${streamId}`;

    const stream: BroadcastStream = {
      id: streamId,
      channelId: channel.id,
      title: req.title.trim(),
      description: req.description,
      category: req.category || 'GENERAL',
      language: req.language || 'en',
      status: 'SCHEDULED',
      visibility: req.visibility || 'PUBLIC',
      latencyProfile,
      scheduledStartTime: req.scheduledStartTime || now,
      playbackHlsUrl,
      playbackLlhlsUrl,
      playbackWebrtcUrl,
      recordingRetentionDays: 90,
      viewerCountCurrent: 0,
      viewerCountPeak: 0,
      totalViews: 0,
      stateCode: req.stateCode || channel.stateCode,
      constituencyInternalId: req.constituencyInternalId || channel.constituencyInternalId,
      createdAt: now,
      updatedAt: now,
    };

    // Generate Ephemeral Ingest Key & Credentials
    const rawStreamKey = `live_k_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawStreamKey).digest('hex');
    const whipBearerToken = `whip_tok_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const credentials: StreamIngestCredentials = {
      streamId,
      channelId: channel.id,
      rtmpIngestUrl: `rtmp://${hosts.ingestHost}:1935/live`,
      rtmpStreamKey: rawStreamKey,
      srtIngestUrl: `srt://${hosts.ingestHost}:8890?streamid=publish:live/${streamId}`,
      whipIngestUrl: `${hosts.scheme}://${hosts.ingestHost}:8889/live/${streamId}/whip`,
      whipBearerToken,
      expiresAt,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('broadcast_streams').insert({
          id: stream.id,
          channel_id: stream.channelId,
          title: stream.title,
          description: stream.description,
          category: stream.category,
          language: stream.language,
          status: stream.status,
          visibility: stream.visibility,
          latency_profile: stream.latencyProfile,
          scheduled_start_time: stream.scheduledStartTime,
          playback_hls_url: stream.playbackHlsUrl,
          playback_llhls_url: stream.playbackLlhlsUrl,
          playback_webrtc_url: stream.playbackWebrtcUrl,
          recording_retention_days: stream.recordingRetentionDays,
          state_code: stream.stateCode || null,
          constituency_internal_id: stream.constituencyInternalId || null,
          created_at: stream.createdAt,
          updated_at: stream.updatedAt,
        });

        await supabase.from('broadcast_stream_keys').insert({
          channel_id: channel.id,
          stream_id: stream.id,
          key_prefix: rawStreamKey.substring(0, 10),
          key_hash: keyHash,
          label: 'Auto-provisioned Session Ingest Key',
          is_active: true,
          expires_at: expiresAt,
        });
      } catch {
        // Fallback to in-memory store when remote staging schema is air-gapped
      }
    }

    this.inMemoryStreams.set(stream.id, stream);
    this.inMemoryStreamKeys.set(stream.id, {
      keyHash,
      rawKey: rawStreamKey,
      streamId,
      channelId: channel.id,
      expiresAt,
    });

    return { stream, credentials };
  }

  /** Get stream by ID */
  async getStream(streamId: string): Promise<BroadcastStream | null> {
    if (this.inMemoryStreams.has(streamId)) {
      return this.inMemoryStreams.get(streamId)!;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('broadcast_streams')
        .select('*')
        .eq('id', streamId)
        .maybeSingle();

      if (!error && data) {
        const stream: BroadcastStream = {
          id: data.id,
          channelId: data.channel_id,
          title: data.title,
          description: data.description,
          category: data.category,
          language: data.language,
          status: data.status,
          visibility: data.visibility,
          latencyProfile: data.latency_profile,
          scheduledStartTime: data.scheduled_start_time,
          actualStartTime: data.actual_start_time,
          actualEndTime: data.actual_end_time,
          playbackHlsUrl: data.playback_hls_url,
          playbackLlhlsUrl: data.playback_llhls_url,
          playbackWebrtcUrl: data.playback_webrtc_url,
          recordingVodUrl: data.recording_vod_url,
          recordingRetentionDays: data.recording_retention_days ?? 90,
          viewerCountCurrent: data.viewer_count_current ?? 0,
          viewerCountPeak: data.viewer_count_peak ?? 0,
          totalViews: data.total_views ?? 0,
          stateCode: data.state_code,
          constituencyInternalId: data.constituency_internal_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        this.inMemoryStreams.set(stream.id, stream);
        return stream;
      }
    }

    return null;
  }

  /** Update stream lifecycle state machine */
  async updateStreamStatus(streamId: string, targetStatus: StreamStatus): Promise<BroadcastStream> {
    const stream = await this.getStream(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    const current = stream.status;
    if (current === targetStatus) return stream;

    // Strict State Machine Rules
    const allowedTransitions: Record<StreamStatus, StreamStatus[]> = {
      SCHEDULED: ['PROVISIONED', 'LIVE'],
      PROVISIONED: ['LIVE', 'SCHEDULED'],
      LIVE: ['PAUSED', 'ENDED'],
      PAUSED: ['LIVE', 'ENDED'],
      ENDED: ['ARCHIVED'],
      ARCHIVED: [],
    };

    if (!allowedTransitions[current]?.includes(targetStatus)) {
      throw new InvalidStateTransitionError(current, targetStatus);
    }

    const now = new Date().toISOString();
    stream.status = targetStatus;
    stream.updatedAt = now;

    if (targetStatus === 'LIVE' && !stream.actualStartTime) {
      stream.actualStartTime = now;
    }
    if (targetStatus === 'ENDED' && !stream.actualEndTime) {
      stream.actualEndTime = now;
      stream.recordingVodUrl = `${stream.playbackHlsUrl}?vod=1`;
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('broadcast_streams')
          .update({
            status: stream.status,
            actual_start_time: stream.actualStartTime,
            actual_end_time: stream.actualEndTime,
            recording_vod_url: stream.recordingVodUrl,
            updated_at: stream.updatedAt,
          })
          .eq('id', streamId);
      } catch {
        // Fallback to in-memory store
      }
    }

    this.inMemoryStreams.set(streamId, stream);
    return stream;
  }

  /** List active and scheduled streams with filtering */
  async listStreams(filter?: { status?: StreamStatus; stateCode?: string; category?: string }): Promise<BroadcastStream[]> {
    let list: BroadcastStream[] = Array.from(this.inMemoryStreams.values());

    if (isSupabaseConfigured) {
      let query = supabase.from('broadcast_streams').select('*');
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.stateCode) query = query.eq('state_code', filter.stateCode.toUpperCase());
      if (filter?.category) query = query.eq('category', filter.category);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        list = data.map((d: any) => ({
          id: d.id,
          channelId: d.channel_id,
          title: d.title,
          description: d.description,
          category: d.category,
          language: d.language,
          status: d.status,
          visibility: d.visibility,
          latencyProfile: d.latency_profile,
          scheduledStartTime: d.scheduled_start_time,
          actualStartTime: d.actual_start_time,
          actualEndTime: d.actual_end_time,
          playbackHlsUrl: d.playback_hls_url,
          playbackLlhlsUrl: d.playback_llhls_url,
          playbackWebrtcUrl: d.playback_webrtc_url,
          recordingVodUrl: d.recording_vod_url,
          recordingRetentionDays: d.recording_retention_days ?? 90,
          viewerCountCurrent: d.viewer_count_current ?? 0,
          viewerCountPeak: d.viewer_count_peak ?? 0,
          totalViews: d.total_views ?? 0,
          stateCode: d.state_code,
          constituencyInternalId: d.constituency_internal_id,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }

    if (filter?.status) list = list.filter(s => s.status === filter.status);
    if (filter?.stateCode) list = list.filter(s => s.stateCode === filter.stateCode?.toUpperCase());
    if (filter?.category) list = list.filter(s => s.category === filter.category);

    return list;
  }

  /** Record incoming telemetry heartbeat from media gateway */
  async recordTelemetry(streamId: string, snapshot: Omit<StreamTelemetrySnapshot, 'id' | 'streamId' | 'capturedAt'>): Promise<StreamTelemetrySnapshot> {
    const stream = await this.getStream(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    const id = crypto.randomUUID();
    const capturedAt = new Date().toISOString();

    const record: StreamTelemetrySnapshot = {
      id,
      streamId,
      bitrateKbps: snapshot.bitrateKbps,
      fps: snapshot.fps,
      resolutionWidth: snapshot.resolutionWidth,
      resolutionHeight: snapshot.resolutionHeight,
      audioBitrateKbps: snapshot.audioBitrateKbps,
      packetLossPercent: snapshot.packetLossPercent,
      ingestProtocol: snapshot.ingestProtocol,
      healthStatus: snapshot.healthStatus,
      capturedAt,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('broadcast_telemetry_snapshots').insert({
          id: record.id,
          stream_id: record.streamId,
          bitrate_kbps: record.bitrateKbps,
          fps: record.fps,
          resolution_width: record.resolutionWidth || null,
          resolution_height: record.resolutionHeight || null,
          audio_bitrate_kbps: record.audioBitrateKbps || null,
          packet_loss_percent: record.packetLossPercent,
          ingest_protocol: record.ingestProtocol,
          health_status: record.healthStatus,
          captured_at: record.capturedAt,
        });
      } catch {
        // Fallback to in-memory store
      }
    }

    const snapshots = this.inMemoryTelemetry.get(streamId) || [];
    snapshots.push(record);
    if (snapshots.length > 50) snapshots.shift(); // retain latest 50
    this.inMemoryTelemetry.set(streamId, snapshots);

    return record;
  }

  /** Fetch latest telemetry snapshot for a stream */
  async getLatestTelemetry(streamId: string): Promise<StreamTelemetrySnapshot | null> {
    const list = this.inMemoryTelemetry.get(streamId);
    if (list && list.length > 0) {
      return list[list.length - 1];
    }
    return null;
  }
}

export const broadcastManagementService = new BroadcastManagementService();
