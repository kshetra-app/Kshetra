import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  chatWithAI,
  analyzeConstituency,
  analyzeElectionTrends,
  smartSearch,
  summarizeIssues,
  generateCampaignCopy,
} from '../services/ai';
import { validate } from '../lib/validation';
import { sendApiError } from '../lib/replyHelper';

/** Telangana has 119 assembly constituencies (Phase 1 scope). */
const TS_MIN_AC = 1;
const TS_MAX_AC = 119;
const MIN_SEARCH_QUERY_LENGTH = 3;
const MAX_SEARCH_QUERY_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_COUNT = 50;
const MAX_ISSUES_COUNT = 50;
const MAX_ISSUE_LENGTH = 1000;
const MAX_TOPIC_LENGTH = 1000;
const MAX_NAME_LENGTH = 200;

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1, 'messages array is required and must not be empty')
    .max(MAX_MESSAGES_COUNT),
  constituencyAcNo: z.number().int().min(TS_MIN_AC).max(TS_MAX_AC).optional(),
});

const acNoParamSchema = z.object({
  acNo: z.coerce.number().int().min(TS_MIN_AC).max(TS_MAX_AC),
});

const smartSearchBodySchema = z.object({
  query: z
    .string()
    .trim()
    .min(MIN_SEARCH_QUERY_LENGTH, 'query string is required (min 3 characters)')
    .max(MAX_SEARCH_QUERY_LENGTH),
});

const summarizeIssuesBodySchema = z.object({
  constituencyName: z.string().min(1, 'constituencyName and issues array required').max(MAX_NAME_LENGTH),
  issues: z
    .array(z.string().min(1).max(MAX_ISSUE_LENGTH))
    .min(1, 'constituencyName and issues array required')
    .max(MAX_ISSUES_COUNT),
});

const campaignCopyBodySchema = z.object({
  candidateName: z.string().min(1, 'candidateName, constituencyName, and topic are required').max(MAX_NAME_LENGTH),
  constituencyName: z.string().min(1, 'candidateName, constituencyName, and topic are required').max(MAX_NAME_LENGTH),
  topic: z.string().min(1, 'candidateName, constituencyName, and topic are required').max(MAX_TOPIC_LENGTH),
  format: z.enum(['whatsapp', 'press_release', 'speech']).optional(),
  language: z.enum(['english', 'telugu', 'hindi']).optional(),
  isPro: z.boolean().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  /** POST /api/v1/ai/chat — conversational AI */
  app.post('/api/v1/ai/chat', async (request, reply) => {
    const parsed = validate(chatBodySchema, request.body);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', parsed.error, {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const response = await chatWithAI({
        messages: parsed.data.messages,
        constituencyAcNo: parsed.data.constituencyAcNo,
      });
      return { response };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI chat processing failed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to process AI chat request', {
        code: 'AI_PROVIDER_ERROR',
      });
    }
  });

  /** GET /api/v1/ai/analyze/constituency/:acNo — quick analysis */
  app.get('/api/v1/ai/analyze/constituency/:acNo', async (request, reply) => {
    const parsed = validate(acNoParamSchema, request.params);
    if (!parsed.ok) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid AC number. Expected integer between 1 and 119.', {
        code: 'FST_ERR_VALIDATION',
      });
    }

    const num = parsed.data.acNo;
    try {
      const analysis = await analyzeConstituency(num);
      return { acNo: num, analysis };
    } catch (err: unknown) {
      request.log.error({ err, acNo: num }, 'AI constituency analysis failed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to analyze constituency', {
        code: 'AI_PROVIDER_ERROR',
      });
    }
  });

  /** GET /api/v1/ai/analyze/trends — election trends */
  app.get('/api/v1/ai/analyze/trends', async (request, reply) => {
    try {
      const analysis = await analyzeElectionTrends();
      return { analysis };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI trend analysis failed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to analyze election trends', {
        code: 'AI_PROVIDER_ERROR',
      });
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
      const results = await smartSearch(parsed.data.query);
      return { results };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI smart search failed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to perform smart search', {
        code: 'AI_PROVIDER_ERROR',
      });
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
      const summary = await summarizeIssues(
        parsed.data.constituencyName,
        parsed.data.issues,
      );
      return { summary };
    } catch (err: unknown) {
      request.log.error({ err }, 'AI issue summarization failed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to summarize issues', {
        code: 'AI_PROVIDER_ERROR',
      });
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

    const { candidateName, constituencyName, topic, format = 'whatsapp', language = 'english' } = parsed.data;

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
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to generate campaign copy', {
        code: 'AI_PROVIDER_ERROR',
      });
    }
  });

  /** GET /api/v1/ai/status — check if AI is configured */
  app.get('/api/v1/ai/status', async () => {
    const isConfigured = !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY;
    const provider = process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY ? 'openai' : 'gemini';
    return {
      configured: isConfigured,
      model: provider === 'gemini' ? 'gemini-flash-lite-latest' : 'gpt-4o-mini',
      provider,
    };
  });
}
