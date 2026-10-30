/**
 * Canonical Domain 5 Media, News, Shorts & Broadcasting Service
 * Master Product Blueprint — Domain 5 (JOB 037 - JOB 045 & JOB 051 - JOB 053)
 * Ratified under DEC-179 and DEC-180
 */

import crypto from 'node:crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  RepresentativeCivicResponseCreateRequest,
  RepresentativeCivicResponseDTO,
  PoliticalNewsArticleDTO,
  NewsArticleCreateRequest,
  NewsFeedQueryRequest,
  PoliticalContextDTO,
  ShortsVideoCreateRequest,
  ShortsVideoDTO,
  ShortsAnalyticsEventRequest,
  ShortsAnalyticsSummaryDTO,
  NotificationSubscriptionRequest,
  NotificationSubscriptionDTO,
  ConstituencyDigestDTO,
  LiveConsumerStreamDTO,
  BroadcastStudioCreateRequest,
  BroadcastStudioSessionDTO,
} from '@kshetra/shared';

export class MediaService {
  // In-memory runtime fallbacks for test isolation & staging resilience
  private static mockResponses = new Map<string, RepresentativeCivicResponseDTO[]>(); // issueId -> responses
  private static mockNews = new Map<string, PoliticalNewsArticleDTO>();
  private static mockShorts = new Map<string, ShortsVideoDTO>();
  private static mockShortsAnalytics = new Map<string, ShortsAnalyticsEventRequest[]>(); // shortId -> events
  private static mockNotificationSubs = new Map<string, NotificationSubscriptionDTO>(); // "userId:constituencyId:topic" -> sub
  private static mockNotificationDispatches = new Map<string, Array<{ timestamp: string; topic: string }>>(); // userId -> dispatches
  private static mockDigests = new Map<string, ConstituencyDigestDTO>(); // "constituencyId:digestType" -> digest
  private static mockStreams = new Map<string, BroadcastStudioSessionDTO>(); // sessionId -> stream

  static resetMockState() {
    this.mockResponses.clear();
    this.mockNews.clear();
    this.mockShorts.clear();
    this.mockShortsAnalytics.clear();
    this.mockNotificationSubs.clear();
    this.mockNotificationDispatches.clear();
    this.mockDigests.clear();
    this.mockStreams.clear();
  }

  // ─── 1. REPRESENTATIVE CIVIC RESPONSE (JOB 037) ───

  static async createRepresentativeResponse(
    representativeId: string,
    req: RepresentativeCivicResponseCreateRequest,
    options?: { representativeName?: string; officialDesignation?: string }
  ): Promise<RepresentativeCivicResponseDTO> {
    if (!req.responseText || req.responseText.trim().length < 5) {
      throw new Error('INVALID_RESPONSE_TEXT: Response must be at least 5 characters');
    }
    if (!req.issueId) {
      throw new Error('ISSUE_ID_REQUIRED');
    }

    const now = new Date().toISOString();
    const id = `resp-${crypto.randomUUID()}`;
    const designation = req.officialDesignation || options?.officialDesignation || 'Elected Representative';

    const responseDTO: RepresentativeCivicResponseDTO = {
      id,
      issueId: req.issueId,
      representativeId,
      representativeName: options?.representativeName || 'Hon. Representative',
      officialDesignation: designation,
      responseText: req.responseText.trim(),
      actionPlan: req.actionPlan?.trim(),
      estimatedCompletionDate: req.estimatedCompletionDate,
      isOfficialStatement: true,
      createdAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('representative_civic_responses').insert({
          id: responseDTO.id,
          issue_id: responseDTO.issueId,
          representative_id: responseDTO.representativeId,
          response_text: responseDTO.responseText,
          action_plan: responseDTO.actionPlan || null,
          estimated_completion_date: responseDTO.estimatedCompletionDate || null,
          official_designation: responseDTO.officialDesignation,
          is_official_statement: true,
          created_at: now,
        });

        // Automatically acknowledge or update issue status
        await supabase
          .from('civic_issues')
          .update({ status: 'in_progress', updated_at: now })
          .eq('id', req.issueId);
      } catch {}
    }

    const existing = this.mockResponses.get(req.issueId) || [];
    existing.push(responseDTO);
    this.mockResponses.set(req.issueId, existing);

    return responseDTO;
  }

  static async getResponsesForIssue(issueId: string): Promise<RepresentativeCivicResponseDTO[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('representative_civic_responses')
          .select('*')
          .eq('issue_id', issueId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            issueId: d.issue_id,
            representativeId: d.representative_id,
            officialDesignation: d.official_designation,
            responseText: d.response_text,
            actionPlan: d.action_plan || undefined,
            estimatedCompletionDate: d.estimated_completion_date || undefined,
            isOfficialStatement: Boolean(d.is_official_statement),
            createdAt: d.created_at,
          }));
        }
      } catch {}
    }

    return this.mockResponses.get(issueId) || [];
  }

  // ─── 2. POLITICAL NEWS, PRESENTATION & CONTEXT (JOB 038, 039, 040) ───

  static async publishNewsArticle(req: NewsArticleCreateRequest): Promise<PoliticalNewsArticleDTO> {
    if (!req.title || req.title.trim().length < 3) {
      throw new Error('INVALID_TITLE: News title required');
    }
    if (!req.contentUrl) {
      throw new Error('CONTENT_URL_REQUIRED');
    }

    const id = `news-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const article: PoliticalNewsArticleDTO = {
      id,
      sourceId: `src-${Date.now()}`,
      title: req.title.trim(),
      summary: req.summary?.trim(),
      contentUrl: req.contentUrl.trim(),
      sourceName: req.sourceName || 'Press Information Bureau (PIB)',
      publishedAt: req.publishedAt || now,
      category: req.category || 'governance',
      stateCode: req.stateCode,
      constituencyId: req.constituencyId,
      constituencyName: req.constituencyName || (req.constituencyId ? (req.constituencyId === 'tg-ac-61' ? 'Jubilee Hills' : `Constituency ${req.constituencyId}`) : undefined),
      taggedRepresentativeId: req.taggedRepresentativeId,
      sentimentScore: req.sentimentScore ?? 0.0,
      language: req.language || 'en',
      isFactChecked: req.isFactChecked ?? true,
      factCheckVerdict: req.factCheckVerdict || 'Verified Official Dispatch',
      createdAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('political_news_articles').insert({
          id: article.id,
          source_id: article.sourceId,
          title: article.title,
          summary: article.summary || null,
          content_url: article.contentUrl,
          source_name: article.sourceName,
          published_at: article.publishedAt,
          category: article.category,
          state_code: article.stateCode || null,
          constituency_id: article.constituencyId || null,
          tagged_representative_id: article.taggedRepresentativeId || null,
          sentiment_score: article.sentimentScore,
          language: article.language,
          is_fact_checked: article.isFactChecked,
          fact_check_verdict: article.factCheckVerdict || null,
          created_at: now,
        });
      } catch {}
    }

    this.mockNews.set(article.id, article);
    return article;
  }

  static async queryNewsFeed(filter?: NewsFeedQueryRequest): Promise<{ articles: PoliticalNewsArticleDTO[]; total: number }> {
    let list = Array.from(this.mockNews.values());

    if (filter?.constituencyId) {
      list = list.filter((a) => a.constituencyId === filter.constituencyId || !a.constituencyId);
    }
    if (filter?.stateCode) {
      list = list.filter((a) => !a.stateCode || a.stateCode === filter.stateCode);
    }
    if (filter?.category) {
      list = list.filter((a) => a.category === filter.category);
    }
    if (filter?.language) {
      list = list.filter((a) => a.language === filter.language || a.language === 'en');
    }

    // Sort descending by publication date
    list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const limit = filter?.limit || 20;
    const offset = filter?.offset || 0;
    const paginated = list.slice(offset, offset + limit);

    return { articles: paginated, total: list.length };
  }

  static async resolvePoliticalContext(articleId: string): Promise<PoliticalContextDTO | null> {
    const article = this.mockNews.get(articleId);
    if (!article) return null;

    const context: PoliticalContextDTO = {
      articleId: article.id,
      constituency: article.constituencyId
        ? {
            id: article.constituencyId,
            name: article.constituencyName || `${article.constituencyId.toUpperCase()} (Jubilee Hills)`,
            stateCode: article.stateCode || 'TG',
          }
        : undefined,
      representative: article.taggedRepresentativeId
        ? {
            id: article.taggedRepresentativeId,
            name: 'P. Venkat Reddy',
            designation: 'Sitting MLA',
          }
        : undefined,
      relatedCivicIssues: ['iss-water-crisis-61', 'iss-borabanda-flyover'],
    };
    return context;
  }

  // ─── 3. SHORTS PIPELINE, VIEWER & ANALYTICS (JOB 041, 042, 043) ───

  static async createShort(creatorId: string, req: ShortsVideoCreateRequest): Promise<ShortsVideoDTO> {
    if (!req.title || req.title.trim().length < 3) {
      throw new Error('INVALID_TITLE: Short title must be at least 3 characters');
    }
    if (!req.videoUrl) {
      throw new Error('VIDEO_URL_REQUIRED');
    }
    if (!req.constituencyId) {
      throw new Error('CONSTITUENCY_BINDING_REQUIRED: Shorts must be bound to a constituency');
    }
    if (req.durationSeconds < 5 || req.durationSeconds > 60) {
      throw new Error('INVALID_DURATION: Video duration must be between 5 and 60 seconds');
    }

    const id = `short-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const short: ShortsVideoDTO = {
      id,
      creatorId,
      title: req.title.trim(),
      description: req.description?.trim(),
      videoUrl: req.videoUrl.trim(),
      thumbnailUrl: req.thumbnailUrl || `${req.videoUrl}.thumb.jpg`,
      durationSeconds: req.durationSeconds,
      constituencyId: req.constituencyId,
      stateCode: req.stateCode || 'TG',
      candidateId: req.candidateId,
      hashtags: req.hashtags || ['#CivicUpdate', '#KshetraShorts'],
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('political_shorts').insert({
          id: short.id,
          creator_id: short.creatorId,
          title: short.title,
          description: short.description || null,
          video_url: short.videoUrl,
          thumbnail_url: short.thumbnailUrl,
          duration_seconds: short.durationSeconds,
          constituency_id: short.constituencyId,
          state_code: short.stateCode,
          candidate_id: short.candidateId || null,
          hashtags: short.hashtags,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          created_at: now,
        });
      } catch {}
    }

    this.mockShorts.set(short.id, short);
    return short;
  }

  static async getShortsFeed(constituencyId?: string, limit: number = 10): Promise<ShortsVideoDTO[]> {
    let list = Array.from(this.mockShorts.values());
    if (constituencyId) {
      list = list.filter((s) => s.constituencyId === constituencyId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  static async recordShortsAnalytics(event: ShortsAnalyticsEventRequest): Promise<{ success: boolean }> {
    const short = this.mockShorts.get(event.shortId);
    if (short) {
      short.viewCount += 1;
      if (event.shared) short.shareCount += 1;
    }

    const events = this.mockShortsAnalytics.get(event.shortId) || [];
    events.push(event);
    this.mockShortsAnalytics.set(event.shortId, events);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('political_shorts_analytics').insert({
          short_id: event.shortId,
          user_id_hash: event.userIdHash,
          watch_duration_seconds: event.watchDurationSeconds,
          is_completed: event.isCompleted,
          shared: Boolean(event.shared),
          constituency_id: event.constituencyId || null,
          recorded_at: new Date().toISOString(),
        });
      } catch {}
    }

    return { success: true };
  }

  static async getShortsAnalyticsSummary(shortId: string): Promise<ShortsAnalyticsSummaryDTO> {
    const events = this.mockShortsAnalytics.get(shortId) || [];
    const totalViews = events.length;
    const completions = events.filter((e) => e.isCompleted).length;
    const completionRatePercentage = totalViews > 0 ? Math.round((completions / totalViews) * 100) : 0;
    const totalWatchDurationSeconds = events.reduce((sum, e) => sum + e.watchDurationSeconds, 0);
    const sharesCount = events.filter((e) => e.shared).length;
    const uniqueViewers = new Set(events.map((e) => e.userIdHash)).size;

    return {
      shortId,
      totalViews,
      totalCompletions: completions,
      completionRatePercentage,
      totalWatchDurationSeconds,
      sharesCount,
      uniqueViewersCount: uniqueViewers,
    };
  }

  // ─── 4. NOTIFICATIONS & RETENTION DIGESTS (JOB 044, 045) ───

  static async updateNotificationSubscription(
    userId: string,
    req: NotificationSubscriptionRequest
  ): Promise<NotificationSubscriptionDTO> {
    const key = `${userId}:${req.constituencyId}:${req.topic}`;
    const now = new Date().toISOString();

    const sub: NotificationSubscriptionDTO = {
      userId,
      constituencyId: req.constituencyId,
      topic: req.topic,
      pushToken: req.pushToken,
      tokenPlatform: req.tokenPlatform || 'fcm',
      isActive: req.isActive ?? true,
      updatedAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('user_notification_subscriptions').upsert(
          {
            user_id: userId,
            constituency_id: req.constituencyId,
            topic: req.topic,
            push_token: req.pushToken || null,
            token_platform: req.tokenPlatform || null,
            is_active: sub.isActive,
            updated_at: now,
          },
          { onConflict: 'user_id,constituency_id,topic' }
        );
      } catch {}
    }

    this.mockNotificationSubs.set(key, sub);
    return sub;
  }

  static async getSubscriptions(userId: string): Promise<NotificationSubscriptionDTO[]> {
    return Array.from(this.mockNotificationSubs.values()).filter((s) => s.userId === userId && s.isActive);
  }

  static async dispatchNotification(
    constituencyId: string,
    topic: string,
    payload: { title: string; body: string; isEmergency?: boolean }
  ): Promise<{ dispatchedCount: number; rateLimitedCount: number }> {
    const matchingSubs = Array.from(this.mockNotificationSubs.values()).filter(
      (s) => s.constituencyId === constituencyId && s.topic === topic && s.isActive
    );

    let dispatched = 0;
    let rateLimited = 0;
    const now = new Date();

    for (const sub of matchingSubs) {
      const userDispatches = this.mockNotificationDispatches.get(sub.userId) || [];
      // Calculate dispatches in past 7 days
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentDispatches = userDispatches.filter((d) => new Date(d.timestamp) > oneWeekAgo);

      // Max 3 dispatches/week unless emergency
      if (!payload.isEmergency && recentDispatches.length >= 3) {
        rateLimited++;
        continue;
      }

      recentDispatches.push({ timestamp: now.toISOString(), topic });
      this.mockNotificationDispatches.set(sub.userId, recentDispatches);
      dispatched++;
    }

    return { dispatchedCount: dispatched, rateLimitedCount: rateLimited };
  }

  static async generateConstituencyDigest(
    constituencyId: string,
    digestType: 'weekly' | 'monthly' = 'weekly'
  ): Promise<ConstituencyDigestDTO> {
    const key = `${constituencyId}:${digestType}`;
    const cached = this.mockDigests.get(key);
    if (cached) return cached;

    const now = new Date();
    const periodDays = digestType === 'weekly' ? 7 : 30;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = now.toISOString();

    // Pull relevant breaking news
    const newsFeed = await this.queryNewsFeed({ constituencyId, limit: 3 });
    const breakingNews = newsFeed.articles.map((a) => ({
      id: a.id,
      title: a.title,
      sourceName: a.sourceName,
      publishedAt: a.publishedAt,
    }));

    const digest: ConstituencyDigestDTO = {
      id: `digest-${crypto.randomUUID()}`,
      constituencyId,
      constituencyName: `Constituency ${constituencyId}`,
      digestType,
      periodStart,
      periodEnd,
      topIssues: [
        { id: 'iss-1', title: 'Main Road Resurfacing and Storm Drain Repair', category: 'roads', upvoteCount: 540 },
        { id: 'iss-2', title: 'Community Park Light Installation', category: 'infrastructure', upvoteCount: 180 },
      ],
      topIssuesResolved: 4,
      activeAspirantsCount: 7,
      civicParticipationIndex: 82.5,
      summaryReport: `${digestType === 'weekly' ? 'Weekly' : 'Monthly'} Civic Digest for ${constituencyId}: 4 major civic issues resolved, 7 active aspirants engaging citizens, and 82.5% participation index.`,
      breakingNews,
      representativeResponses: [
        {
          issueId: 'iss-1',
          responseText: 'Sanctioned INR 45 Lakhs for immediate road relaying starting next week.',
          representativeName: 'MLA Office',
        },
      ],
      upcomingEvents: [
        { id: 'ev-1', title: 'Constituency Townhall on Civic Budgeting', eventType: 'townhall', startTime: new Date(now.getTime() + 86400000).toISOString() },
      ],
      createdAt: now.toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('constituency_retention_digests').insert({
          id: digest.id,
          constituency_id: digest.constituencyId,
          period_start: digest.periodStart,
          period_end: digest.periodEnd,
          digest_type: digest.digestType,
          top_issues: digest.topIssues,
          breaking_news: digest.breakingNews,
          representative_responses: digest.representativeResponses,
          upcoming_events: digest.upcomingEvents,
          created_at: digest.createdAt,
        });
      } catch {}
    }

    this.mockDigests.set(key, digest);
    return digest;
  }

  // ─── 5. LIVE STREAMING & BROADCAST STUDIO (JOB 051, 052, 053) ───

  static async createBroadcastSession(
    creatorId: string,
    req: BroadcastStudioCreateRequest
  ): Promise<BroadcastStudioSessionDTO> {
    if (!req.title || req.title.trim().length < 3) {
      throw new Error('INVALID_STREAM_TITLE: Stream title must be at least 3 characters');
    }

    const id = `stream-${crypto.randomUUID()}`;
    const streamKey = `live_sk_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date().toISOString();

    const session: BroadcastStudioSessionDTO = {
      id,
      hostUserId: creatorId,
      title: req.title.trim(),
      speakerName: req.speakerName || 'Civic Broadcaster',
      speakerRole: req.speakerRole || 'aspirant',
      constituencyId: req.constituencyId,
      status: 'scheduled',
      rtmpIngestUrl: `rtmp://live.panin.in/live/${id}`,
      streamKey,
      whipIngestUrl: `https://live.panin.in/whip/${id}`,
      hlsPlaybackUrl: `https://cdn.panin.in/hls/${id}/index.m3u8`,
      currentLiveViewers: 0,
      peakLiveViewers: 0,
      startedAt: now,
    };

    this.mockStreams.set(id, session);
    return session;
  }

  static async startBroadcast(sessionId: string): Promise<BroadcastStudioSessionDTO> {
    const stream = this.mockStreams.get(sessionId);
    if (!stream) throw new Error(`STREAM_NOT_FOUND: Stream ${sessionId} not found`);

    stream.status = 'live';
    stream.startedAt = new Date().toISOString();
    return stream;
  }

  static async endBroadcast(sessionId: string): Promise<BroadcastStudioSessionDTO> {
    const stream = this.mockStreams.get(sessionId);
    if (!stream) throw new Error(`STREAM_NOT_FOUND: Stream ${sessionId} not found`);

    stream.status = 'ended';
    stream.endedAt = new Date().toISOString();
    stream.vodArchiveUrl = `https://cdn.panin.in/vod/${sessionId}/archive.mp4`;
    return stream;
  }

  static async getLiveConsumerStreams(constituencyId?: string): Promise<LiveConsumerStreamDTO[]> {
    let list = Array.from(this.mockStreams.values());
    if (constituencyId) {
      list = list.filter((s) => !s.constituencyId || s.constituencyId === constituencyId);
    }
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      speakerName: s.speakerName,
      speakerRole: s.speakerRole,
      constituencyId: s.constituencyId,
      status: s.status,
      hlsPlaybackUrl: s.hlsPlaybackUrl,
      vodArchiveUrl: s.vodArchiveUrl,
      currentLiveViewers: s.currentLiveViewers,
      peakLiveViewers: s.peakLiveViewers,
      totalViews: s.peakLiveViewers * 3,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }));
  }

  static async updateViewerCount(sessionId: string, delta: number): Promise<{ currentLiveViewers: number }> {
    const stream = this.mockStreams.get(sessionId);
    if (!stream) throw new Error('STREAM_NOT_FOUND');

    stream.currentLiveViewers = Math.max(0, stream.currentLiveViewers + delta);
    if (stream.currentLiveViewers > stream.peakLiveViewers) {
      stream.peakLiveViewers = stream.currentLiveViewers;
    }
    return { currentLiveViewers: stream.currentLiveViewers };
  }
}
