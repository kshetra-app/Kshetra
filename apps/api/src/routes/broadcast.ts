import type { FastifyInstance } from 'fastify';
import { STATES } from '@kshetra/shared';
import { getConstituencies, getConstituencyElectionData } from '../services/stateData';
import { sendApiError } from '../lib/replyHelper';
import { renderStudioHtml } from '../modules/broadcast/studioHtml';
import { 
  broadcastManagementService, 
  InvalidStateTransitionError 
} from '../services/broadcastManagementService';
import { 
  broadcastInteractivityService, 
  DuplicateVoteError, 
  PollClosedError, 
  ContentModerationError 
} from '../services/broadcastInteractivityService';
import type { 
  CreateChannelRequest, 
  CreateStreamRequest, 
  StreamStatus, 
  CreatePollRequest, 
  CastVoteRequest, 
  SubmitQuestionRequest, 
  ModerateQuestionRequest 
} from '@kshetra/shared';

interface BroadcastConstituency {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  status: 'WON' | 'LEADING';
  winnerParty: string;
  winnerName: string;
  winnerVotes: number;
  runnerUpParty: string;
  margin: number;
}

function getDetailedConstituencies(stateCode: string): BroadcastConstituency[] {
  const code = stateCode?.toUpperCase();
  const list = getConstituencies(code);
  if (!list || list.length === 0) return [];

  return list.map((c) => {
    const election = getConstituencyElectionData(code, c.acNo);
    const recent = election?.recentElection;
    return {
      acNo: c.acNo,
      name: c.name,
      district: c.district,
      type: (c.reservationStatus as 'GEN' | 'SC' | 'ST') || 'GEN',
      status: 'WON',
      winnerParty: recent?.winner || c.currentParty || 'UNKNOWN',
      winnerName: recent?.winnerName || c.currentMLA || 'UNKNOWN',
      winnerVotes: recent?.winnerVotes ?? 0,
      runnerUpParty: recent?.runnerUp || '',
      margin: recent?.margin ?? 0,
    };
  });
}

// ─── AJV SCHEMAS FOR BROADCAST ROUTES ───

const broadcastStateParamsSchema = {
  params: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const broadcastConstituencyParamsSchema = {
  params: {
    type: 'object',
    required: ['code', 'acNo'],
    properties: {
      code: { type: 'string', pattern: '^[A-Z]{2}$' },
      acNo: { type: 'integer', minimum: 1, maximum: 1000 },
    },
  },
};

const createChannelBodySchema = {
  body: {
    type: 'object',
    required: ['slug', 'title', 'channelType'],
    properties: {
      slug: { type: 'string', minLength: 3, maxLength: 64, pattern: '^[a-z0-9-]+$' },
      title: { type: 'string', minLength: 2, maxLength: 120 },
      description: { type: 'string', maxLength: 1000 },
      channelType: { 
        type: 'string', 
        enum: ['CANDIDATE', 'POLITICAL_PARTY', 'ELECTION_AUTHORITY', 'MEDIA_OUTLET', 'CIVIC_BODY'] 
      },
      personInternalId: { type: 'string', format: 'uuid' },
      organizationInternalId: { type: 'string', format: 'uuid' },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituencyInternalId: { type: 'string', format: 'uuid' },
      avatarUrl: { type: 'string', format: 'uri' },
      bannerUrl: { type: 'string', format: 'uri' },
      contactEmail: { type: 'string', format: 'email' },
    },
  },
};

const createStreamBodySchema = {
  body: {
    type: 'object',
    required: ['channelId', 'title'],
    properties: {
      channelId: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 3, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      category: { 
        type: 'string', 
        enum: ['TOWN_HALL', 'SPEECH', 'MANIFESTO_RELEASE', 'PRESS_CONFERENCE', 'DEBATE', 'ELECTION_UPDATE', 'EMERGENCY_CIVIC', 'GENERAL'] 
      },
      language: { type: 'string', maxLength: 10 },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED', 'RESTRICTED'] },
      latencyProfile: { type: 'string', enum: ['BROADCAST_HLS', 'LOW_LATENCY_LLHLS', 'INTERACTIVE_SFU'] },
      scheduledStartTime: { type: 'string', format: 'date-time' },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituencyInternalId: { type: 'string', format: 'uuid' },
    },
  },
};

const updateStreamStatusSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['SCHEDULED', 'PROVISIONED', 'LIVE', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    },
  },
};

export async function broadcastRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LEGACY ELECTION SUMMARY ROUTES (Preserved with 100% Backward Compatibility)
  // ─────────────────────────────────────────────────────────────────────────────

  /** 1. GET /api/v1/broadcast/summary — statewide ruling party standings summary */
  app.get('/api/v1/broadcast/summary', async () => {
    const summary: Record<string, number> = {};
    for (const state of Object.values(STATES)) {
      const p = state.rulingParty;
      if (p) {
        summary[p] = (summary[p] ?? 0) + 1;
      }
    }

    const statesList = Object.values(STATES).map((s) => ({
      code: s.code,
      name: s.name,
      rulingParty: s.rulingParty,
      assemblySeats: s.assemblySeats,
      parliamentarySeats: s.parliamentarySeats,
    }));

    return {
      summary,
      states: statesList,
    };
  });

  /** 2. GET /api/v1/broadcast/state/:code — detailed standings & constituencies for a state */
  app.get<{ Params: { code: string } }>(
    '/api/v1/broadcast/state/:code',
    { schema: broadcastStateParamsSchema },
    async (request, reply) => {
      const { code } = request.params;
      const stateInfo = STATES[code.toUpperCase()];

      if (!stateInfo) {
        return sendApiError(reply, request, 404, 'Not Found', `State ${code} not found`, {
          code: 'NOT_FOUND',
        });
      }

      const constituencies = getDetailedConstituencies(code);

      // Compute standings
      const partyCounts: Record<string, { won: number; leading: number }> = {};
      for (const c of constituencies) {
        const p = c.winnerParty;
        if (!partyCounts[p]) {
          partyCounts[p] = { won: 0, leading: 0 };
        }
        if (c.status === 'WON') {
          partyCounts[p].won += 1;
        } else {
          partyCounts[p].leading += 1;
        }
      }

      const standings = Object.entries(partyCounts)
        .map(([party, counts]) => ({
          party,
          won: counts.won,
          leading: counts.leading,
          total: counts.won + counts.leading,
        }))
        .sort((a, b) => b.won - a.won);

      return {
        stateCode: stateInfo.code,
        stateName: stateInfo.name,
        totalSeats: stateInfo.assemblySeats,
        standings,
        constituencies,
      };
    },
  );

  /** 3. GET /api/v1/broadcast/state/:code/constituency/:acNo — specific assembly constituency in state */
  app.get<{ Params: { code: string; acNo: number } }>(
    '/api/v1/broadcast/state/:code/constituency/:acNo',
    { schema: broadcastConstituencyParamsSchema },
    async (request, reply) => {
      const { code, acNo } = request.params;
      const stateInfo = STATES[code.toUpperCase()];

      if (!stateInfo) {
        return sendApiError(reply, request, 404, 'Not Found', `State ${code} not found`, {
          code: 'NOT_FOUND',
        });
      }

      const constituencies = getDetailedConstituencies(code);
      const parsedAcNo = typeof acNo === 'number' ? acNo : parseInt(acNo as any, 10);
      const constituency = constituencies.find((c) => c.acNo === parsedAcNo);

      if (!constituency) {
        return sendApiError(
          reply,
          request,
          404,
          'Not Found',
          `Constituency #${acNo} not found in state ${code}`,
          {
            code: 'NOT_FOUND',
          },
        );
      }

      return constituency;
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROFESSIONAL BROADCAST MANAGEMENT & CHANNEL ROUTES
  // ─────────────────────────────────────────────────────────────────────────────

  /** 4. POST /api/v1/broadcast/channels — create official broadcast channel */
  app.post<{ Body: CreateChannelRequest }>(
    '/api/v1/broadcast/channels',
    { schema: createChannelBodySchema },
    async (request, reply) => {
      try {
        const channel = await broadcastManagementService.createChannel(request.body);
        return reply.status(201).send({ channel });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'CHANNEL_CREATION_FAILED' });
      }
    },
  );

  /** 5. GET /api/v1/broadcast/channels/:idOrSlug — get broadcast channel profile */
  app.get<{ Params: { idOrSlug: string } }>(
    '/api/v1/broadcast/channels/:idOrSlug',
    async (request, reply) => {
      const channel = await broadcastManagementService.getChannel(request.params.idOrSlug);
      if (!channel) {
        return sendApiError(reply, request, 404, 'Not Found', 'Broadcast channel not found', { code: 'CHANNEL_NOT_FOUND' });
      }
      return { channel };
    },
  );

  /** 6. POST /api/v1/broadcast/streams — schedule / create a stream */
  app.post<{ Body: CreateStreamRequest }>(
    '/api/v1/broadcast/streams',
    { schema: createStreamBodySchema },
    async (request, reply) => {
      try {
        const result = await broadcastManagementService.createStream(request.body);
        return reply.status(201).send(result);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'STREAM_CREATION_FAILED' });
      }
    },
  );

  /** 7. GET /api/v1/broadcast/streams — list public streams with filter */
  app.get<{ Querystring: { status?: StreamStatus; state?: string; category?: string } }>(
    '/api/v1/broadcast/streams',
    async (request) => {
      const { status, state, category } = request.query;
      const streams = await broadcastManagementService.listStreams({
        status,
        stateCode: state,
        category,
      });
      return { streams, count: streams.length };
    },
  );

  /** 8. GET /api/v1/broadcast/streams/:id — get stream details and playback URLs */
  app.get<{ Params: { id: string } }>(
    '/api/v1/broadcast/streams/:id',
    async (request, reply) => {
      const stream = await broadcastManagementService.getStream(request.params.id);
      if (!stream) {
        return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', { code: 'STREAM_NOT_FOUND' });
      }
      return { stream };
    },
  );

  /** 9. POST /api/v1/broadcast/streams/:id/status — update stream state machine */
  app.post<{ Params: { id: string }; Body: { status: StreamStatus } }>(
    '/api/v1/broadcast/streams/:id/status',
    { schema: updateStreamStatusSchema },
    async (request, reply) => {
      try {
        const stream = await broadcastManagementService.updateStreamStatus(
          request.params.id,
          request.body.status
        );
        return { stream };
      } catch (err: any) {
        if (err instanceof InvalidStateTransitionError) {
          return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'INVALID_STATE_TRANSITION' });
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, { code: 'UPDATE_FAILED' });
      }
    },
  );

  /** 10. POST /api/v1/broadcast/streams/:id/telemetry — ingest health telemetry heartbeat */
  app.post<{ Params: { id: string }; Body: any }>(
    '/api/v1/broadcast/streams/:id/telemetry',
    async (request, reply) => {
      try {
        const snapshot = await broadcastManagementService.recordTelemetry(
          request.params.id,
          request.body as any
        );
        return reply.status(201).send({ snapshot });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'TELEMETRY_RECORD_FAILED' });
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. INTERACTIVE AUDIENCE ENGINE (Live Polls & Moderated Q&A)
  // ─────────────────────────────────────────────────────────────────────────────

  /** 11. POST /api/v1/broadcast/streams/:id/polls — broadcaster launches a live poll */
  app.post<{ Params: { id: string }; Body: CreatePollRequest }>(
    '/api/v1/broadcast/streams/:id/polls',
    async (request, reply) => {
      try {
        const poll = await broadcastInteractivityService.createPoll(request.params.id, request.body);
        return reply.status(201).send({ poll });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'POLL_CREATION_FAILED' });
      }
    },
  );

  /** 12. GET /api/v1/broadcast/streams/:id/polls/active — get active poll with live tallies */
  app.get<{ Params: { id: string }; Querystring: { voterToken?: string } }>(
    '/api/v1/broadcast/streams/:id/polls/active',
    async (request) => {
      const poll = await broadcastInteractivityService.getActivePoll(
        request.params.id,
        request.query.voterToken
      );
      return { poll };
    },
  );

  /** 13. POST /api/v1/broadcast/streams/:id/polls/:pollId/vote — cast anonymous vote (Anti-Sybil) */
  app.post<{ Params: { id: string; pollId: string }; Body: CastVoteRequest }>(
    '/api/v1/broadcast/streams/:id/polls/:pollId/vote',
    async (request, reply) => {
      try {
        const result = await broadcastInteractivityService.castVote(
          request.params.pollId,
          request.body
        );
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof DuplicateVoteError) {
          return sendApiError(reply, request, 409, 'Conflict', err.message, { code: 'DUPLICATE_VOTE_PROHIBITED' });
        }
        if (err instanceof PollClosedError) {
          return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'POLL_CLOSED' });
        }
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'VOTE_FAILED' });
      }
    },
  );

  /** 14. POST /api/v1/broadcast/streams/:id/polls/:pollId/close — close live poll */
  app.post<{ Params: { id: string; pollId: string } }>(
    '/api/v1/broadcast/streams/:id/polls/:pollId/close',
    async (request, reply) => {
      try {
        const poll = await broadcastInteractivityService.closePoll(request.params.pollId);
        return reply.send({ poll });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'CLOSE_POLL_FAILED' });
      }
    },
  );

  /** 15. POST /api/v1/broadcast/streams/:id/questions — citizen submits audience question */
  app.post<{ Params: { id: string }; Body: SubmitQuestionRequest }>(
    '/api/v1/broadcast/streams/:id/questions',
    async (request, reply) => {
      try {
        const question = await broadcastInteractivityService.submitQuestion(
          request.params.id,
          request.body
        );
        return reply.status(201).send({ question });
      } catch (err: any) {
        if (err instanceof ContentModerationError) {
          return sendApiError(reply, request, 422, 'Unprocessable Entity', err.message, { code: 'CONTENT_MODERATION_FAILED' });
        }
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'QUESTION_SUBMISSION_FAILED' });
      }
    },
  );

  /** 16. GET /api/v1/broadcast/streams/:id/questions — list approved questions */
  app.get<{ Params: { id: string }; Querystring: { voterToken?: string } }>(
    '/api/v1/broadcast/streams/:id/questions',
    async (request) => {
      const questions = await broadcastInteractivityService.listQuestions(
        request.params.id,
        request.query.voterToken
      );
      return { questions, count: questions.length };
    },
  );

  /** 17. POST /api/v1/broadcast/streams/:id/questions/:qId/vote — upvote question */
  app.post<{ Params: { id: string; qId: string }; Body: { voterToken: string } }>(
    '/api/v1/broadcast/streams/:id/questions/:qId/vote',
    async (request, reply) => {
      try {
        const result = await broadcastInteractivityService.upvoteQuestion(
          request.params.qId,
          request.body.voterToken
        );
        return reply.send(result);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'UPVOTE_FAILED' });
      }
    },
  );

  /** 18. POST /api/v1/broadcast/streams/:id/questions/:qId/moderate — moderate/pin question */
  app.post<{ Params: { id: string; qId: string }; Body: ModerateQuestionRequest }>(
    '/api/v1/broadcast/streams/:id/questions/:qId/moderate',
    async (request, reply) => {
      try {
        const question = await broadcastInteractivityService.moderateQuestion(
          request.params.qId,
          request.body
        );
        return reply.send({ question });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, { code: 'MODERATION_FAILED' });
      }
    },
  );

  /** 19. GET /studio & GET /broadcast/studio — In-browser WebRTC-WHIP Creator Studio (DEF-003 Decoupled Web Ingest) */
  app.get('/studio', async (_req, reply) => {
    return reply.type('text/html').send(renderStudioHtml());
  });

  app.get('/broadcast/studio', async (_req, reply) => {
    return reply.type('text/html').send(renderStudioHtml());
  });
}
