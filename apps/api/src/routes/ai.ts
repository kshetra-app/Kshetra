/**
 * POLIGRAM PLATFORM
 * AI Subsystem Routes (Domain 8: JOB 067–071)
 *
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 * Features:
 * - AI Provider Abstraction (JOB 067)
 * - AI News Summarization & Content-Addressed Caching (JOB 068)
 * - AI Civic Classification & Structured Taxonomy Fallback (JOB 069)
 * - Ask POLIGRAM Grounded RAG & Statutory Citations (JOB 070)
 * - AI Cost Control, Token Quotas & Circuit Breakers (JOB 071)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  chatWithAI,
  analyzeConstituency,
  analyzeElectionTrends,
  smartSearch,
  summarizeIssues,
  generateCampaignCopy,
  defaultAIRegistry,
  AINewsSummaryService,
  AICivicClassifier,
  AskPoligramService,
  AICostControlService,
  AIProviderUnavailableError,
  AIBudgetUnavailableError,
  AIBudgetLimitError,
  AICostLedgerUnavailableError,
} from '../services/ai';
import { validate } from '../lib/validation';
import { sendApiError } from '../lib/replyHelper';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import type { AIProviderType } from '@kshetra/shared';

const MIN_AC_NO = 1;
const MAX_AC_NO = 500;
const MIN_SEARCH_QUERY_LENGTH = 3;
const MAX_SEARCH_QUERY_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_COUNT = 50;
const MAX_ISSUES_COUNT = 50;
const MAX_ISSUE_LENGTH = 1000;
const MAX_TOPIC_LENGTH = 1000;
const MAX_NAME_LENGTH = 200;

function sendAIServiceError(
  reply: FastifyReply,
  request: FastifyRequest,
  error: unknown,
  fallbackMessage: string,
) {
  const budgetExceeded = error instanceof AIBudgetLimitError;
  const unavailable =
    error instanceof AIProviderUnavailableError ||
    error instanceof AIBudgetUnavailableError ||
    error instanceof AICostLedgerUnavailableError;
  const code =
    budgetExceeded || unavailable
      ? (error as Error & { code?: string }).code || 'AI_SERVICE_UNAVAILABLE'
      : 'AI_PROVIDER_ERROR';
  if (error instanceof AIBudgetLimitError)
    reply.header('Retry-After', String(error.resetInSeconds));
  return sendApiError(
    reply,
    request,
    budgetExceeded ? 429 : unavailable ? 503 : 500,
    budgetExceeded
      ? 'Too Many Requests'
      : unavailable
        ? 'Service Unavailable'
        : 'Internal Server Error',
    error instanceof AIBudgetLimitError
      ? error.message
      : unavailable
        ? 'AI processing or durable usage accounting is currently unavailable.'
        : fallbackMessage,
    { code },
  );
}

async function requireAIAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const actor = await resolveAuthenticatedUser(request, reply);
  if (!actor) return false;
  if (!['admin', 'super_admin', 'data_engineer'].includes(actor.role)) {
    sendApiError(
      reply,
      request,
      403,
      'Forbidden',
      'Administrator access is required for AI budget and provider controls.',
      {
        code: 'FORBIDDEN',
      },
    );
    return false;
  }
  return true;
}

// --- ZOD SCHEMAS ---

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1, 'messages array is required and must not be empty')
    .max(MAX_MESSAGES_COUNT)
    .refine(
      (messages) => messages.some((message) => message.role === 'user'),
      'At least one user message is required',
    ),
  constituencyAcNo: z.number().int().min(MIN_AC_NO).max(MAX_AC_NO).optional(),
  stateCode: z.string().trim().length(2).optional(),
  tenantId: z.string().trim().min(1).optional(),
});

const newsSummarizeSchema = z.object({
  canonicalUrl: z.string().url('canonicalUrl must be a valid URL'),
  title: z.string().min(3).max(500),
  content: z.string().min(10, 'content must be at least 10 characters').max(50000),
  tenantId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
});

const civicClassifySchema = z.object({
  description: z.string().min(5, 'description must be at least 5 characters').max(2000),
  stateCode: z.string().trim().length(2).optional(),
  acNo: z.number().int().min(MIN_AC_NO).max(MAX_AC_NO).optional(),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional(),
    })
    .optional(),
  tenantId: z.string().trim().min(1).optional(),
});

const askPoligramSchema = z.object({
  query: z.string().min(3, 'query must be at least 3 characters').max(1000),
  stateCode: z.string().trim().length(2).optional(),
  acNo: z.number().int().min(MIN_AC_NO).max(MAX_AC_NO).optional(),
  tenantId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
});

const costReportQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  period: z.enum(['day', 'week', 'month']).optional(),
});

const tenantBudgetBodySchema = z.object({
  tenantId: z.string().trim().min(1),
  tier: z.string().optional(),
  dailyTokenBudget: z.number().int().positive().optional(),
  dailySpendLimitUsd: z.number().positive().optional(),
});

const configureProviderSchema = z.object({
  priorityOrder: z
    .array(z.enum(['gemini', 'openai', 'custom', 'offline_heuristic']))
    .max(4, 'At most four providers can be prioritized')
    .optional(),
  customConfig: z
    .object({
      baseUrl: z.string().url(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      headerName: z.string().optional(),
    })
    .optional(),
});

const acNoParamSchema = z.object({
  acNo: z.coerce.number().int().min(MIN_AC_NO).max(MAX_AC_NO),
});

const constituencyQuerySchema = z.object({
  stateCode: z.string().trim().length(2).optional(),
});

const smartSearchBodySchema = z.object({
  query: z
    .string()
    .trim()
    .min(MIN_SEARCH_QUERY_LENGTH, 'query string is required (min 3 characters)')
    .max(MAX_SEARCH_QUERY_LENGTH),
  stateCode: z.string().trim().length(2).optional(),
});

const summarizeIssuesBodySchema = z.object({
  constituencyName: z
    .string()
    .min(1, 'constituencyName and issues array required')
    .max(MAX_NAME_LENGTH),
  issues: z
    .array(z.string().min(1).max(MAX_ISSUE_LENGTH))
    .min(1, 'constituencyName and issues array required')
    .max(MAX_ISSUES_COUNT),
});

const campaignCopyBodySchema = z.object({
  candidateName: z
    .string()
    .min(1, 'candidateName, constituencyName, and topic are required')
    .max(MAX_NAME_LENGTH),
  constituencyName: z
    .string()
    .min(1, 'candidateName, constituencyName, and topic are required')
    .max(MAX_NAME_LENGTH),
  topic: z
    .string()
    .min(1, 'candidateName, constituencyName, and topic are required')
    .max(MAX_TOPIC_LENGTH),
  format: z.enum(['whatsapp', 'press_release', 'speech']).optional(),
  language: z.enum(['english', 'telugu', 'hindi']).optional(),
  isPro: z.boolean().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  // =========================================================================
  // DOMAIN 8 CORE ROUTES
  // =========================================================================

  /**
   * POST /api/v1/ai/news/summarize (JOB 068)
   * Content-addressed SHA-256 deduplication cache with cost ledger logging
   */
  app.post('/api/v1/ai/news/summarize', async (request, reply) => {
    const parsed = validate(newsSummarizeSchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const summary = await AINewsSummaryService.summarizeNews({
        canonicalUrl: parsed.data.canonicalUrl,
        title: parsed.data.title,
        content: parsed.data.content,
        tenantId: 'default_tenant',
      });
      return reply.status(200).send(summary);
    } catch (err: unknown) {
      if (err instanceof AIProviderUnavailableError) {
        return sendApiError(reply, request, 503, 'Service Unavailable', err.message, {
          code: 'AI_PROVIDER_UNAVAILABLE',
        });
      }
      request.log.error({ err }, 'AI news summarization failed');
      return sendAIServiceError(reply, request, err, 'Failed to summarize news article');
    }
  });

  /**
   * POST /api/v1/ai/civic/classify (JOB 069)
   * Comprehensive structured taxonomy dictionary first (>=0.85 conf), AI fallback
   */
  app.post('/api/v1/ai/civic/classify', async (request, reply) => {
    const parsed = validate(civicClassifySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const result = await AICivicClassifier.classify({
        ...parsed.data,
        tenantId: 'default_tenant',
      });
      return reply.status(200).send(result);
    } catch (err: unknown) {
      request.log.error({ err }, 'Civic issue classification failed');
      return sendAIServiceError(reply, request, err, 'Failed to classify civic complaint');
    }
  });

  /**
   * POST /api/v1/ai/ask-poligram & /api/v1/ai/ask (JOB 070)
   * Q&A over bundled reference data with explicit unverified-source disclosure
   */
  const handleAskPoligram = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = validate(askPoligramSchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const response = await AskPoligramService.ask({ ...parsed.data, tenantId: 'default_tenant' });
      return reply.status(200).send(response);
    } catch (err: unknown) {
      request.log.error({ err }, 'Ask POLIGRAM query failed');
      return sendAIServiceError(
        reply,
        request,
        err,
        'Failed to process POLIGRAM intelligence query',
      );
    }
  };

  app.post('/api/v1/ai/ask-poligram', handleAskPoligram);
  app.post('/api/v1/ai/ask', handleAskPoligram);

  /**
   * GET /api/v1/ai/cost-report (JOB 071)
   * Executive cost telemetry and quota report
   */
  app.get('/api/v1/ai/cost-report', async (request, reply) => {
    if (!(await requireAIAdmin(request, reply))) return;
    const parsed = validate(costReportQuerySchema, request.query);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }
    const tenantId = parsed.data.tenantId || 'default_tenant';
    const period = parsed.data.period || 'day';

    try {
      const report = await AICostControlService.generateCostReport(tenantId, period);
      return reply.status(200).send(report);
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to generate AI cost report');
      return sendAIServiceError(reply, request, err, 'Failed to generate cost report');
    }
  });

  /**
   * GET /api/v1/ai/tenant-budget (JOB 071)
   */
  app.get('/api/v1/ai/tenant-budget', async (request, reply) => {
    if (!(await requireAIAdmin(request, reply))) return;
    const parsed = validate(costReportQuerySchema, request.query);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }
    const tenantId = parsed.data.tenantId || 'default_tenant';

    try {
      const budget = await AICostControlService.getTenantBudget(tenantId);
      return reply.status(200).send(budget);
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to get tenant budget');
      return sendAIServiceError(reply, request, err, 'Failed to retrieve tenant budget');
    }
  });

  /**
   * POST /api/v1/ai/tenant-budget (JOB 071)
   */
  app.post('/api/v1/ai/tenant-budget', async (request, reply) => {
    if (!(await requireAIAdmin(request, reply))) return;
    const parsed = validate(tenantBudgetBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const updated = await AICostControlService.configureBudget(parsed.data);
      return reply.status(200).send(updated);
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to update tenant budget');
      return sendAIServiceError(reply, request, err, 'Failed to update tenant budget');
    }
  });

  /**
   * GET /api/v1/ai/providers (JOB 067)
   * Lists active provider cascade and availability
   */
  app.get('/api/v1/ai/providers', async () => {
    const chain = defaultAIRegistry.getActiveChain();
    const primaryProvider = chain[0]?.name;
    const defaultModel =
      primaryProvider === 'gemini'
        ? process.env.GEMINI_MODEL || 'gemini-2.0-flash'
        : primaryProvider === 'openai'
          ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
          : primaryProvider === 'custom'
            ? process.env.CUSTOM_LLM_MODEL || null
            : null;
    return {
      activeChain: chain.map((p) => ({
        name: p.name,
        available: p.isAvailable(),
      })),
      defaultModel,
      configured: chain.some((provider) => provider.name !== 'offline_heuristic'),
      offlineFallbackEnabled: !isProductionLikeRuntime(),
    };
  });

  /**
   * POST /api/v1/ai/configure-provider (JOB 067)
   * Configure custom LLM or priority cascade dynamically at runtime (zero hardcoding)
   */
  app.post('/api/v1/ai/configure-provider', async (request, reply) => {
    const parsed = validate(configureProviderSchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    if (!(await requireAIAdmin(request, reply))) return;
    if (isProductionLikeRuntime()) {
      return sendApiError(
        reply,
        request,
        409,
        'Conflict',
        'Production AI providers must be configured through the deployment environment and rate-card release process.',
        {
          code: 'RUNTIME_PROVIDER_CONFIGURATION_DISABLED',
        },
      );
    }

    try {
      defaultAIRegistry.configure(parsed.data);
      const chain = defaultAIRegistry.getActiveChain();
      return reply.status(200).send({
        success: true,
        activeChain: chain.map((p) => ({ name: p.name, available: p.isAvailable() })),
      });
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to configure AI provider');
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        'Failed to configure AI provider',
        {
          code: 'PROVIDER_CONFIG_ERROR',
        },
      );
    }
  });

  // =========================================================================
  // LEGACY AI ROUTES (PRESERVED WITH ZERO REGRESSION)
  // =========================================================================

  /** POST /api/v1/ai/chat — conversational AI */
  app.post('/api/v1/ai/chat', async (request, reply) => {
    const parsed = validate(chatBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    const requiresActor = Boolean(request.headers.authorization) || isProductionLikeRuntime();
    const actor = requiresActor ? await resolveAuthenticatedUser(request, reply) : undefined;
    if (requiresActor && !actor) return reply;

    try {
      const response = await chatWithAI({
        // The validated conversation history cannot contain caller-supplied system prompts.
        messages: parsed.data.messages,
        constituencyAcNo: parsed.data.constituencyAcNo,
        stateCode: parsed.data.stateCode,
        tenantId: 'default_tenant',
        userId: actor?.userId,
        operation: 'ai_chat',
      });
      return { response, groundingStatus: 'reference_data_unverified' as const };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI chat processing failed');
      return sendAIServiceError(reply, request, err, 'Failed to process AI chat request');
    }
  });

  /** GET /api/v1/ai/analyze/constituency/:acNo — quick analysis */
  app.get('/api/v1/ai/analyze/constituency/:acNo', async (request, reply) => {
    const parsed = validate(acNoParamSchema, request.params);
    if (!parsed.ok) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid AC number. Expected integer between 1 and 500.',
        {
          code: 'FST_ERR_VALIDATION',
        },
      );
    }

    const queryParsed = validate(constituencyQuerySchema, request.query);
    const stateCode =
      queryParsed.ok && queryParsed.data?.stateCode
        ? queryParsed.data.stateCode.toUpperCase()
        : 'TS';
    const num = parsed.data.acNo;
    const requiresActor = Boolean(request.headers.authorization) || isProductionLikeRuntime();
    const actor = requiresActor ? await resolveAuthenticatedUser(request, reply) : undefined;
    if (requiresActor && !actor) return reply;
    try {
      const analysis = await analyzeConstituency(num, stateCode, {
        tenantId: 'default_tenant',
        userId: actor?.userId,
      });
      return {
        acNo: num,
        stateCode,
        analysis,
        groundingStatus: 'reference_data_unverified' as const,
      };
    } catch (err: unknown) {
      request.log.error({ err, acNo: num, stateCode }, 'AI constituency analysis failed');
      return sendAIServiceError(reply, request, err, 'Failed to analyze constituency');
    }
  });

  /** GET /api/v1/ai/analyze/trends — election trends */
  app.get('/api/v1/ai/analyze/trends', async (request, reply) => {
    try {
      const analysis = await analyzeElectionTrends();
      return { analysis };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI trend analysis failed');
      return sendAIServiceError(reply, request, err, 'Failed to analyze election trends');
    }
  });

  /** POST /api/v1/ai/smart-search — natural language constituency search */
  app.post('/api/v1/ai/smart-search', async (request, reply) => {
    const parsed = validate(smartSearchBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const results = await smartSearch(parsed.data.query, parsed.data.stateCode);
      return { results };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI smart search failed');
      return sendAIServiceError(reply, request, err, 'Failed to perform smart search');
    }
  });

  /** POST /api/v1/ai/summarize-issues — summarize civic issues */
  app.post('/api/v1/ai/summarize-issues', async (request, reply) => {
    const parsed = validate(summarizeIssuesBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const summary = await summarizeIssues(parsed.data.constituencyName, parsed.data.issues);
      return { summary };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI issue summarization failed');
      return sendAIServiceError(reply, request, err, 'Failed to summarize issues');
    }
  });

  /** POST /api/v1/ai/campaign-copy — generate AI copy for candidates */
  app.post('/api/v1/ai/campaign-copy', async (request, reply) => {
    const parsed = validate(campaignCopyBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    const {
      candidateName,
      constituencyName,
      topic,
      format = 'whatsapp',
      language = 'english',
    } = parsed.data;

    try {
      const copy = await generateCampaignCopy({
        candidateName,
        constituencyName,
        topic,
        format,
        language,
      });

      return {
        success: true,
        copy,
        format,
        language,
      };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI campaign copy generation failed');
      return sendAIServiceError(reply, request, err, 'Failed to generate campaign copy');
    }
  });

  /** GET /api/v1/ai/status — check AI status */
  app.get('/api/v1/ai/status', async () => {
    const chain = defaultAIRegistry.getActiveChain();
    const configuredProviders = chain.filter((provider) => provider.name !== 'offline_heuristic');
    const primary = configuredProviders[0];
    const offlineFallbackActive = !primary && chain.some((p) => p.name === 'offline_heuristic');
    return {
      configured: chain.some((provider) => provider.name !== 'offline_heuristic'),
      provider: primary?.name || null,
      model: (primary as { model?: string } | undefined)?.model || null,
      activeProviders: chain.map((p) => p.name),
      degradedOffline: offlineFallbackActive,
      offlineFallbackEnabled: !isProductionLikeRuntime(),
    };
  });
}
