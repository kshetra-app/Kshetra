/**
 * Canonical Media, News, Shorts & Live Broadcasting Contracts & DTOs
 * Master Product Blueprint — Domain 5 (JOB 037 - JOB 045 & JOB 051 - JOB 053)
 * Ratified under DEC-179 and DEC-180
 */

// ─── 1. REPRESENTATIVE CIVIC RESPONSE (JOB 037) ───

export interface RepresentativeCivicResponseCreateRequest {
  issueId: string;
  responseText: string;
  actionPlan?: string;
  estimatedCompletionDate?: string;
  officialDesignation: string;
}

export interface RepresentativeCivicResponseDTO {
  id: string;
  issueId: string;
  representativeId: string;
  representativeName?: string;
  officialDesignation: string;
  responseText: string;
  actionPlan?: string;
  estimatedCompletionDate?: string;
  isOfficialStatement: boolean;
  createdAt: string;
}

// ─── 2. POLITICAL NEWS, PRESENTATION & CONTEXT (JOB 038, 039, 040) ───

export type NewsCategory =
  | 'elections'
  | 'governance'
  | 'policy'
  | 'infrastructure'
  | 'judiciary'
  | 'welfare'
  | 'general';

export interface PoliticalNewsArticleDTO {
  id: string;
  sourceId: string;
  title: string;
  summary?: string;
  contentUrl: string;
  sourceName: string;
  publishedAt: string;
  category: NewsCategory;
  stateCode?: string;
  constituencyId?: string;
  constituencyName?: string;
  taggedRepresentativeId?: string;
  sentimentScore: number;
  language: string;
  isFactChecked: boolean;
  factCheckVerdict?: string;
  createdAt: string;
}

export interface NewsArticleCreateRequest {
  title: string;
  summary?: string;
  contentUrl: string;
  sourceName: string;
  publishedAt?: string;
  category?: NewsCategory;
  stateCode?: string;
  constituencyId?: string;
  constituencyName?: string;
  taggedRepresentativeId?: string;
  sentimentScore?: number;
  language?: string;
  isFactChecked?: boolean;
  factCheckVerdict?: string;
}

export interface NewsFeedQueryRequest {
  constituencyId?: string;
  stateCode?: string;
  category?: NewsCategory;
  language?: string;
  limit?: number;
  offset?: number;
}

export interface PoliticalContextDTO {
  articleId: string;
  constituency?: {
    id: string;
    name: string;
    stateCode: string;
  };
  representative?: {
    id: string;
    name: string;
    designation: string;
  };
  relatedCivicIssues: string[];
}

// ─── 3. SHORTS PIPELINE, VIEWER & ANALYTICS (JOB 041, 042, 043) ───

export interface ShortsVideoCreateRequest {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  constituencyId: string;
  stateCode?: string;
  candidateId?: string;
  hashtags?: string[];
}

export interface ShortsVideoDTO {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  constituencyId: string;
  stateCode?: string;
  candidateId?: string;
  hashtags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

export interface ShortsAnalyticsEventRequest {
  shortId: string;
  userIdHash: string;
  watchDurationSeconds: number;
  isCompleted: boolean;
  shared?: boolean;
  constituencyId?: string;
}

export interface ShortsAnalyticsSummaryDTO {
  shortId: string;
  totalViews: number;
  totalCompletions: number;
  completionRatePercentage: number;
  totalWatchDurationSeconds: number;
  sharesCount: number;
  uniqueViewersCount: number;
}

// ─── 4. NOTIFICATIONS & RETENTION DIGESTS (JOB 044, 045) ───

export type NotificationTopic =
  | 'civic_alerts'
  | 'breaking_news'
  | 'live_townhalls'
  | 'weekly_digest';

export interface NotificationSubscriptionRequest {
  constituencyId: string;
  topic: NotificationTopic;
  pushToken?: string;
  tokenPlatform?: 'fcm' | 'apns' | 'web';
  isActive?: boolean;
}

export interface NotificationSubscriptionDTO {
  userId: string;
  constituencyId: string;
  topic: NotificationTopic;
  pushToken?: string;
  tokenPlatform?: 'fcm' | 'apns' | 'web';
  isActive: boolean;
  updatedAt: string;
}

export interface ConstituencyDigestDTO {
  id: string;
  constituencyId: string;
  constituencyName: string;
  digestType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  topIssues: Array<{ id: string; title: string; category: string; upvoteCount: number }>;
  topIssuesResolved?: number;
  activeAspirantsCount?: number;
  civicParticipationIndex?: number;
  breakingNews: Array<{ id: string; title: string; sourceName: string; publishedAt: string }>;
  representativeResponses: Array<{ issueId: string; responseText: string; representativeName: string }>;
  upcomingEvents: Array<{ id: string; title: string; eventType: string; startTime: string }>;
  summaryReport?: string;
  createdAt: string;
}

// ─── 5. LIVE STREAMING & BROADCAST STUDIO (JOB 051, 052, 053) ───

export interface LiveConsumerStreamDTO {
  id: string;
  title: string;
  speakerName: string;
  speakerRole: string;
  constituencyId?: string;
  status: 'scheduled' | 'live' | 'ended';
  hlsPlaybackUrl?: string;
  webrtcPlaybackUrl?: string;
  vodArchiveUrl?: string;
  currentLiveViewers: number;
  peakLiveViewers: number;
  totalViews: number;
  startedAt?: string;
  endedAt?: string;
}

export interface BroadcastStudioCreateRequest {
  title: string;
  speakerName: string;
  speakerRole: string;
  constituencyId?: string;
  description?: string;
}

export interface BroadcastStudioSessionDTO {
  id: string;
  hostUserId?: string;
  title: string;
  speakerName: string;
  speakerRole: string;
  constituencyId?: string;
  status: 'scheduled' | 'live' | 'ended';
  rtmpIngestUrl: string;
  streamKey: string;
  whipIngestUrl: string;
  hlsPlaybackUrl: string;
  vodArchiveUrl?: string;
  currentLiveViewers: number;
  peakLiveViewers: number;
  startedAt?: string;
  endedAt?: string;
}
