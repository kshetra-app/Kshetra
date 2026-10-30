/**
 * Poligram Professional Broadcast Architecture Contracts
 * Standard: DPDP Act 2023 Compliant (Zero Voter PII), Multi-Tier Streaming
 */

export type ChannelType = 
  | 'CANDIDATE' 
  | 'POLITICAL_PARTY' 
  | 'ELECTION_AUTHORITY' 
  | 'MEDIA_OUTLET' 
  | 'CIVIC_BODY';

export type ChannelVerificationStatus = 
  | 'UNVERIFIED' 
  | 'VERIFIED_OFFICIAL' 
  | 'VERIFIED_MEDIA' 
  | 'SUSPENDED';

export interface BroadcastChannel {
  id: string;
  slug: string;
  title: string;
  description?: string;
  channelType: ChannelType;
  verificationStatus: ChannelVerificationStatus;
  personInternalId?: string;
  organizationInternalId?: string;
  stateCode?: string;
  constituencyInternalId?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type StreamCategory = 
  | 'TOWN_HALL' 
  | 'SPEECH' 
  | 'MANIFESTO_RELEASE' 
  | 'PRESS_CONFERENCE' 
  | 'DEBATE' 
  | 'ELECTION_UPDATE' 
  | 'EMERGENCY_CIVIC' 
  | 'GENERAL';

export type StreamStatus = 
  | 'SCHEDULED' 
  | 'PROVISIONED' 
  | 'LIVE' 
  | 'PAUSED' 
  | 'ENDED' 
  | 'ARCHIVED';

export type StreamVisibility = 'PUBLIC' | 'UNLISTED' | 'RESTRICTED';

export type LatencyProfile = 'BROADCAST_HLS' | 'LOW_LATENCY_LLHLS' | 'INTERACTIVE_SFU';

export interface BroadcastStream {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  category: StreamCategory;
  language: string;
  status: StreamStatus;
  visibility: StreamVisibility;
  latencyProfile: LatencyProfile;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  playbackHlsUrl?: string;
  playbackLlhlsUrl?: string;
  playbackWebrtcUrl?: string;
  recordingVodUrl?: string;
  recordingRetentionDays: number;
  viewerCountCurrent: number;
  viewerCountPeak: number;
  totalViews: number;
  stateCode?: string;
  constituencyInternalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type IngestProtocol = 'RTMP' | 'SRT' | 'WHIP';

export interface StreamIngestCredentials {
  streamId: string;
  channelId: string;
  rtmpIngestUrl: string;
  rtmpStreamKey: string;
  srtIngestUrl: string;
  whipIngestUrl: string;
  whipBearerToken: string;
  expiresAt: string;
}

export type TelemetryHealthStatus = 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL' | 'DISCONNECTED';

export interface StreamTelemetrySnapshot {
  id: string;
  streamId: string;
  bitrateKbps: number;
  fps: number;
  resolutionWidth?: number;
  resolutionHeight?: number;
  audioBitrateKbps?: number;
  packetLossPercent: number;
  ingestProtocol: IngestProtocol;
  healthStatus: TelemetryHealthStatus;
  capturedAt: string;
}

export type PollStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface BroadcastPollOption {
  id: string;
  pollId: string;
  optionIndex: number;
  optionText: string;
  voteCount: number;
  percentage?: number;
}

export interface BroadcastPoll {
  id: string;
  streamId: string;
  question: string;
  status: PollStatus;
  durationSeconds: number;
  startedAt?: string;
  closedAt?: string;
  totalVotes: number;
  options: BroadcastPollOption[];
  hasVoted?: boolean;
}

export type QaStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PINNED' | 'ANSWERED';

export interface BroadcastQaThread {
  id: string;
  streamId: string;
  authorDisplayName: string;
  questionText: string;
  status: QaStatus;
  upvotes: number;
  isPinned: boolean;
  answeredAt?: string;
  createdAt: string;
  hasUpvoted?: boolean;
}

// Request and Response Envelopes
export interface CreateChannelRequest {
  slug: string;
  title: string;
  description?: string;
  channelType: ChannelType;
  personInternalId?: string;
  organizationInternalId?: string;
  stateCode?: string;
  constituencyInternalId?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  contactEmail?: string;
}

export interface CreateStreamRequest {
  channelId: string;
  title: string;
  description?: string;
  category?: StreamCategory;
  language?: string;
  visibility?: StreamVisibility;
  latencyProfile?: LatencyProfile;
  scheduledStartTime?: string;
  stateCode?: string;
  constituencyInternalId?: string;
}

export interface UpdateStreamStatusRequest {
  status: StreamStatus;
}

export interface CreatePollRequest {
  question: string;
  durationSeconds?: number;
  options: string[];
}

export interface CastVoteRequest {
  optionId: string;
  voterToken: string;
}

export interface SubmitQuestionRequest {
  authorDisplayName?: string;
  authorToken: string;
  questionText: string;
}

export interface ModerateQuestionRequest {
  status: QaStatus;
  moderationReason?: string;
  isPinned?: boolean;
}
