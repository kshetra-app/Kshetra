/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: AI News Summary & Content-Addressed Caching Service (JOB 068)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { createHash, randomBytes } from 'crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { defaultAIRegistry } from './aiProvider';
import type {
  NewsSummaryRequest,
  NewsSummaryRecord,
  ChatMessage,
} from '@kshetra/shared';

export interface AICostLedgerEntry {
  id: string;
  tenantId: string;
  userId?: string;
  operationType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costInr: number;
  latencyMs: number;
  cacheHit: boolean;
  createdAt: string;
}

export class AINewsSummaryService {
  // In-memory fallback stores for deterministic offline/test execution
  private static cacheStore = new Map<string, NewsSummaryRecord>();
  private static ledgerStore: AICostLedgerEntry[] = [];

  static resetForTesting(): void {
    this.cacheStore.clear();
    this.ledgerStore = [];
  }

  /** Compute deterministic content-addressed SHA-256 digest */
  static computeContentSha256(canonicalUrl: string, title: string, content: string): string {
    const normalized = `${canonicalUrl.trim().toLowerCase()}:${title.trim()}:${content.trim()}`;
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /** Summarize news article with content-addressed caching and cost telemetry */
  static async summarizeNews(req: NewsSummaryRequest): Promise<NewsSummaryRecord> {
    const startTime = Date.now();
    const contentSha256 = this.computeContentSha256(req.canonicalUrl, req.title, req.content);
    const tenantId = req.tenantId || 'default_tenant';

    // 1. Check in-memory cache first
    const cached = this.cacheStore.get(contentSha256);
    if (cached) {
      cached.hitCount += 1;
      await this.recordCostLedger({
        tenantId,
        userId: req.userId,
        operationType: 'news_summary',
        provider: cached.providerUsed,
        model: 'cached',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        costInr: 0,
        latencyMs: Date.now() - startTime,
        cacheHit: true,
      });

      return {
        ...cached,
        cacheHit: true,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Check persistent Supabase cache if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('ai_news_summary_cache')
          .select('*')
          .eq('content_sha256', contentSha256)
          .maybeSingle();

        if (!error && data) {
          await supabase
            .from('ai_news_summary_cache')
            .update({
              hit_count: (data.hit_count || 1) + 1,
              last_accessed_at: new Date().toISOString(),
            })
            .eq('id', data.id);

          await this.recordCostLedger({
            tenantId,
            userId: req.userId,
            operationType: 'news_summary',
            provider: data.provider_used,
            model: 'cached',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            costInr: 0,
            latencyMs: Date.now() - startTime,
            cacheHit: true,
          });

          const rec: NewsSummaryRecord = {
            id: data.id,
            contentSha256: data.content_sha256,
            canonicalUrl: data.canonical_url,
            title: data.title,
            summary3Bullet: data.summary_3bullet as [string, string, string],
            overallSentiment: data.overall_sentiment,
            keyEntities: data.key_entities || [],
            providerUsed: data.provider_used,
            tokensUsed: data.tokens_used,
            estimatedCostUsd: Number(data.estimated_cost_usd),
            hitCount: (data.hit_count || 1) + 1,
            cacheHit: true,
            latencyMs: Date.now() - startTime,
            createdAt: data.created_at,
          };
          this.cacheStore.set(contentSha256, rec);
          return rec;
        }
      } catch {
        // Table may not exist yet in environment; continue to generation
      }
    }

    // 3. Cache Miss: Execute via Dynamic AI Provider Cascade
    const systemPrompt = `You are POLIGRAM AI News Intelligence.
Summarize the provided news story into strictly 3 factual, non-partisan bullet points.
Also detect overall sentiment (positive, neutral, negative, urgent) and key entities (politicians, parties, districts).
Respond ONLY with a valid JSON object matching this schema:
{
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "entities": ["entity1", "entity2"]
}`;

    const userPrompt = `Title: ${req.title}\nURL: ${req.canonicalUrl}\n\nContent:\n${req.content}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const aiRes = await defaultAIRegistry.generateWithFallback({
      messages,
      responseFormat: 'json',
      tenantId,
      operation: 'news_summary',
    });

    // Parse AI output with robust JSON fallback
    let summaryBullets: [string, string, string] = [
      'Official notification reported in public state proceedings.',
      'Electoral and civic stakeholders review local representation.',
      'Public updates continue under standard administrative oversight.',
    ];
    let sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' = 'neutral';
    let entities: string[] = [];

    try {
      const cleaned = aiRes.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as {
        summary?: string[];
        bullets?: string[];
        sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
        entities?: string[];
      };

      const b = parsed.summary || parsed.bullets;
      if (Array.isArray(b) && b.length >= 3) {
        summaryBullets = [String(b[0]), String(b[1]), String(b[2])];
      } else if (Array.isArray(b) && b.length > 0) {
        summaryBullets = [
          String(b[0] || summaryBullets[0]),
          String(b[1] || summaryBullets[1]),
          String(b[2] || summaryBullets[2]),
        ];
      }

      if (parsed.sentiment && ['positive', 'neutral', 'negative', 'urgent'].includes(parsed.sentiment)) {
        sentiment = parsed.sentiment;
      }
      if (Array.isArray(parsed.entities)) {
        entities = parsed.entities.map(String);
      }
    } catch {
      const lines = req.content
        .split(/[.\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);
      if (lines.length >= 3) {
        summaryBullets = [lines[0], lines[1], lines[2]];
      }
    }

    const id = `news_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const latencyMs = Date.now() - startTime;

    const record: NewsSummaryRecord = {
      id,
      contentSha256,
      canonicalUrl: req.canonicalUrl,
      title: req.title,
      summary3Bullet: summaryBullets,
      overallSentiment: sentiment,
      keyEntities: entities,
      providerUsed: aiRes.provider,
      tokensUsed: aiRes.usage.totalTokens,
      estimatedCostUsd: aiRes.costUsd,
      hitCount: 1,
      cacheHit: false,
      latencyMs,
      createdAt: now,
    };

    // 4. Persist in memory store
    this.cacheStore.set(contentSha256, record);
    await this.recordCostLedger({
      tenantId,
      userId: req.userId,
      operationType: 'news_summary',
      provider: aiRes.provider,
      model: aiRes.model,
      promptTokens: aiRes.usage.promptTokens,
      completionTokens: aiRes.usage.completionTokens,
      totalTokens: aiRes.usage.totalTokens,
      costUsd: aiRes.costUsd,
      costInr: aiRes.costInr,
      latencyMs,
      cacheHit: false,
    });

    // 5. Try Supabase write-through
    if (isSupabaseConfigured) {
      try {
        await supabase.from('ai_news_summary_cache').insert({
          id,
          content_sha256: contentSha256,
          canonical_url: req.canonicalUrl,
          title: req.title,
          summary_3bullet: summaryBullets,
          overall_sentiment: sentiment,
          key_entities: entities,
          provider_used: aiRes.provider,
          tokens_used: aiRes.usage.totalTokens,
          estimated_cost_usd: aiRes.costUsd,
          hit_count: 1,
          created_at: now,
          last_accessed_at: now,
        });
      } catch {
        // Suppress if table not yet created on remote
      }
    }

    return record;
  }

  /** Record cost ledger entry into memory and Supabase */
  static async recordCostLedger(entry: Omit<AICostLedgerEntry, 'id' | 'createdAt'>): Promise<void> {
    const id = `ledg_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    this.ledgerStore.push({
      ...entry,
      id,
      createdAt: now,
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('ai_cost_ledger').insert({
          id,
          tenant_id: entry.tenantId,
          user_id: entry.userId || null,
          operation_type: entry.operationType,
          provider: entry.provider,
          model: entry.model,
          prompt_tokens: entry.promptTokens,
          completion_tokens: entry.completionTokens,
          total_tokens: entry.totalTokens,
          cost_usd: entry.costUsd,
          cost_inr: entry.costInr,
          latency_ms: entry.latencyMs,
          cache_hit: entry.cacheHit,
          created_at: now,
        });
      } catch {
        // Suppress if table not yet created on remote
      }
    }
  }

  static getLedgerEntries(tenantId?: string): AICostLedgerEntry[] {
    if (tenantId) {
      return this.ledgerStore.filter((e) => e.tenantId === tenantId);
    }
    return [...this.ledgerStore];
  }
}
