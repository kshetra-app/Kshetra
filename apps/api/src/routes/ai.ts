import type { FastifyInstance } from 'fastify';
import {
  chatWithAI,
  analyzeConstituency,
  analyzeElectionTrends,
  type ChatMessage,
} from '../services/ai';

export async function aiRoutes(app: FastifyInstance) {
  /** POST /api/v1/ai/chat — conversational AI */
  app.post('/api/v1/ai/chat', async (request, reply) => {
    const body = request.body as {
      messages?: ChatMessage[];
      constituencyAcNo?: number;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return reply.status(400).send({
        error: 'messages array is required and must not be empty',
      });
    }

    try {
      const response = await chatWithAI({
        messages: body.messages,
        constituencyAcNo: body.constituencyAcNo,
      });

      return { response };
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'AI service error',
        message: error.message,
      });
    }
  });

  /** GET /api/v1/ai/analyze/constituency/:acNo — quick analysis */
  app.get('/api/v1/ai/analyze/constituency/:acNo', async (request, reply) => {
    const { acNo } = request.params as { acNo: string };
    const num = parseInt(acNo, 10);

    if (isNaN(num) || num < 1 || num > 119) {
      return reply.status(400).send({ error: 'Invalid AC number' });
    }

    try {
      const analysis = await analyzeConstituency(num);
      return { acNo: num, analysis };
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'AI service error',
        message: error.message,
      });
    }
  });

  /** GET /api/v1/ai/analyze/trends — election trends */
  app.get('/api/v1/ai/analyze/trends', async (_request, reply) => {
    try {
      const analysis = await analyzeElectionTrends();
      return { analysis };
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'AI service error',
        message: error.message,
      });
    }
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
