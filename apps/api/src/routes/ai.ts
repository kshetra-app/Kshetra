import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  chatWithAI,
  analyzeConstituency,
  analyzeElectionTrends,
  smartSearch,
  summarizeIssues,
} from '../services/ai';
import { validate } from '../lib/validation';

/** Telangana has 119 assembly constituencies (Phase 1 scope). */
const TS_MIN_AC = 1;
const TS_MAX_AC = 119;
const MIN_SEARCH_QUERY_LENGTH = 3;

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1),
      }),
    )
    .min(1, 'messages array is required and must not be empty'),
  constituencyAcNo: z.number().int().min(TS_MIN_AC).max(TS_MAX_AC).optional(),
});

const acNoParamSchema = z.object({
  acNo: z.coerce.number().int().min(TS_MIN_AC).max(TS_MAX_AC),
});

const smartSearchBodySchema = z.object({
  query: z.string().trim().min(MIN_SEARCH_QUERY_LENGTH, 'query string is required (min 3 characters)'),
});

const summarizeIssuesBodySchema = z.object({
  constituencyName: z.string().min(1, 'constituencyName and issues array required'),
  issues: z.array(z.string()).min(1, 'constituencyName and issues array required'),
});

export async function aiRoutes(app: FastifyInstance) {
  /** POST /api/v1/ai/chat — conversational AI */
  app.post('/api/v1/ai/chat', async (request, reply) => {
    const parsed = validate(chatBodySchema, request.body);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const response = await chatWithAI({
      messages: parsed.data.messages,
      constituencyAcNo: parsed.data.constituencyAcNo,
    });
    return { response };
  });

  /** GET /api/v1/ai/analyze/constituency/:acNo — quick analysis */
  app.get('/api/v1/ai/analyze/constituency/:acNo', async (request, reply) => {
    const parsed = validate(acNoParamSchema, request.params);
    if (!parsed.ok) {
      return reply.status(400).send({ error: 'Invalid AC number' });
    }

    const num = parsed.data.acNo;
    const analysis = await analyzeConstituency(num);
    return { acNo: num, analysis };
  });

  /** GET /api/v1/ai/analyze/trends — election trends */
  app.get('/api/v1/ai/analyze/trends', async () => {
    const analysis = await analyzeElectionTrends();
    return { analysis };
  });

  /** POST /api/v1/ai/smart-search — natural language constituency search */
  app.post('/api/v1/ai/smart-search', async (request, reply) => {
    const parsed = validate(smartSearchBodySchema, request.body);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const results = await smartSearch(parsed.data.query);
    return { results };
  });

  /** POST /api/v1/ai/summarize-issues — summarize civic issues */
  app.post('/api/v1/ai/summarize-issues', async (request, reply) => {
    const parsed = validate(summarizeIssuesBodySchema, request.body);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const summary = await summarizeIssues(
      parsed.data.constituencyName,
      parsed.data.issues,
    );
    return { summary };
  });

  /** GET /api/v1/ai/status — check if AI is configured */
  app.get('/api/v1/ai/status', async () => {
    return {
      configured: !!process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      provider: 'openai',
    };
  });
}
