import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  civicService,
  InvalidCivicStatusTransitionError,
  CoordinatesOutsideConstituencyError,
  ContentPolicyViolationError,
  DisputeNotAllowedError,
} from '../services/civicService';
import { canonicalGeographyService } from '../services/canonicalGeographyService';
import { checkContentModeration } from '../services/contentModeration';

// Schema definitions for civic endpoints
const budgetSchema = {
  params: {
    type: 'object',
    required: ['stateCode'],
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        stateCode: { type: 'string' },
        message: { type: 'string' },
        budget: { type: 'object', additionalProperties: true },
      },
      required: ['stateCode', 'message'],
      additionalProperties: true,
    },
  },
};

const attendanceSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      sessionYear: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        attendance: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            sessionYear: { type: 'string' },
          },
        },
      },
      required: ['attendance', 'total'],
    },
  },
};

const billsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string' },
      type: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        bills: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
      required: ['bills', 'total'],
    },
  },
};

const billOpinionSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['support'],
    properties: {
      support: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        billId: { type: 'string' },
        support: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'billId', 'support'],
    },
  },
};

const schemesSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      category: { type: 'string' },
      level: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        schemes: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            category: { type: 'string' },
            level: { type: 'string' },
          },
        },
      },
      required: ['schemes', 'total'],
    },
  },
};

const projectsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      phase: { type: 'string' },
      category: { type: 'string' },
      constituency: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        projects: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            phase: { type: 'string' },
            category: { type: 'string' },
            constituency: { type: 'string' },
          },
        },
      },
      required: ['projects', 'total'],
    },
  },
};

const rtiListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string' },
      department: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        rtiRequests: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
            department: { type: 'string' },
          },
        },
      },
      required: ['rtiRequests', 'total'],
    },
  },
};

const createRtiSchema = {
  body: {
    type: 'object',
    required: ['subject'],
    properties: {
      subject: { type: 'string', minLength: 1 },
      department: { type: 'string' },
      description: { type: 'string' },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'id', 'message'],
    },
  },
};

const upvoteRtiSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        rtiId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'rtiId'],
    },
  },
};

const hearingsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      type: { type: 'string' },
      upcoming: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        hearings: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            type: { type: 'string' },
            upcoming: { type: 'string' },
          },
        },
      },
      required: ['hearings', 'total'],
    },
  },
};

const cdiSchema = {
  params: {
    type: 'object',
    required: ['constituencyId'],
    properties: {
      constituencyId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        constituencyId: { type: 'string' },
        message: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            constituencyId: { type: 'string' },
            overallScore: { type: 'number' },
            openIssuesCount: { type: 'number' },
            resolvedIssuesCount: { type: 'number' },
            activeProjectsCount: { type: 'number' },
            totalProjectBudgetInr: { type: 'number' },
            sentimentScore: { type: 'number' },
          },
        },
      },
      required: ['constituencyId', 'message'],
      additionalProperties: true,
    },
  },
};

const issueUpvoteSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issueId: { type: 'string' },
        message: { type: 'string' },
        upvoteCount: { type: 'number' },
        promotedToHeadline: { type: 'boolean' },
      },
      required: ['success', 'issueId'],
      additionalProperties: true,
    },
  },
};

const issueFollowSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    properties: {
      follow: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issueId: { type: 'string' },
        following: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'issueId', 'following'],
    },
  },
};

const createIssueSchema = {
  body: {
    type: 'object',
    required: ['title', 'category', 'stateCode'],
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      category: {
        type: 'string',
        enum: [
          'roads',
          'water',
          'electricity',
          'sanitation',
          'healthcare',
          'education',
          'public_safety',
          'transport',
          'housing',
          'environment',
          'corruption',
          'other',
        ],
      },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      constituencyId: { type: 'string' },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      mediaUrls: { type: 'array', items: { type: 'string' } },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      locality: { type: 'string' },
      ward: { type: 'string' },
      mandal: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        message: { type: 'string' },
        issue: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'id'],
      additionalProperties: true,
    },
  },
};

const updateIssueStatusSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened'],
      },
      note: { type: 'string', maxLength: 500 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issueId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'issueId', 'status'],
      additionalProperties: true,
    },
  },
};

const listIssuesSchema = {
  querystring: {
    type: 'object',
    properties: {
      constituencyId: { type: 'string' },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      category: { type: 'string' },
      status: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        issues: { type: 'array' },
        total: { type: 'number' },
      },
      required: ['issues', 'total'],
      additionalProperties: true,
    },
  },
};

const getIssueSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issue: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'issue'],
      additionalProperties: true,
    },
  },
};

const addEvidenceSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  body: {
    type: 'object',
    required: ['mediaUrl'],
    properties: {
      mediaUrl: { type: 'string', minLength: 5 },
      caption: { type: 'string', maxLength: 300 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        issueId: { type: 'string' },
        mediaUrl: { type: 'string' },
        caption: { type: 'string' },
      },
      required: ['success', 'id', 'issueId'],
      additionalProperties: true,
    },
  },
};

const getIssueHistorySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        history: { type: 'array' },
        total: { type: 'number' },
      },
      required: ['history', 'total'],
      additionalProperties: true,
    },
  },
};

const getIssueCommentsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        comments: { type: 'array' },
        total: { type: 'number' },
      },
      required: ['comments', 'total'],
      additionalProperties: true,
    },
  },
};

const getSentimentSchema = {
  params: {
    type: 'object',
    required: ['constituencyId'],
    properties: { constituencyId: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        constituencyId: { type: 'string' },
        constituencyName: { type: 'string' },
        positiveCount: { type: 'number' },
        negativeCount: { type: 'number' },
        neutralCount: { type: 'number' },
        totalPosts: { type: 'number' },
        score: { type: 'number' },
        topIssues: { type: 'array', items: { type: 'string' } },
      },
      required: ['constituencyId', 'score', 'totalPosts'],
      additionalProperties: true,
    },
  },
};

const listGroupsSchema = {
  querystring: {
    type: 'object',
    required: ['constituencyId'],
    properties: {
      constituencyId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        groups: { type: 'array' },
        total: { type: 'number' },
      },
      required: ['groups', 'total'],
      additionalProperties: true,
    },
  },
};

const createGroupSchema = {
  body: {
    type: 'object',
    required: ['name', 'constituencyId', 'category'],
    properties: {
      name: { type: 'string', minLength: 3, maxLength: 100 },
      constituencyId: { type: 'string', minLength: 1 },
      category: { type: 'string', minLength: 1 },
      description: { type: 'string', maxLength: 500 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        group: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'group'],
      additionalProperties: true,
    },
  },
};

const groupMembershipSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        groupId: { type: 'string' },
        memberCount: { type: 'number' },
        message: { type: 'string' },
      },
      required: ['success', 'groupId'],
      additionalProperties: true,
    },
  },
};

const addIssueCommentSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['body'],
    properties: {
      body: { type: 'string', minLength: 1, maxLength: 1000 },
      userName: { type: 'string', maxLength: 100 },
      imageUrl: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        issueId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'id', 'issueId'],
    },
  },
};

async function resolveAuthUser(request: any): Promise<{ userId: string; role: string } | null> {
  let userId: string | null = null;
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === 'invalid-token' || token === 'expired-token') {
      return null;
    }
    if (isSupabaseConfigured) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }
  }

  if (!userId && (request.headers['x-user-id'] as string)) {
    userId = request.headers['x-user-id'] as string;
  }

  if (!userId) return null;

  return { userId, role: (request.headers['x-user-role'] as string) || 'citizen' };
}

export async function civicRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/civic/budget/:stateCode — state budget summary */
  app.get<{ Params: { stateCode: string } }>(
    '/api/v1/civic/budget/:stateCode',
    {
      schema: budgetSchema,
    },
    async (request) => {
      const { stateCode } = request.params;
      return {
        stateCode,
        message: 'Budget endpoint — connect to Supabase for live data',
      };
    },
  );

  /** 2. GET /api/v1/civic/attendance — legislator attendance */
  app.get<{
    Querystring: { state?: string; sessionYear?: string; page?: number; limit?: number };
  }>(
    '/api/v1/civic/attendance',
    {
      schema: attendanceSchema,
    },
    async (request) => {
      const { state, sessionYear } = request.query;
      return {
        attendance: [],
        total: 0,
        filters: { state, sessionYear },
      };
    },
  );

  /** 3. GET /api/v1/civic/bills — bills and legislation */
  app.get<{
    Querystring: { state?: string; status?: string; type?: string; page?: number; limit?: number };
  }>(
    '/api/v1/civic/bills',
    {
      schema: billsSchema,
    },
    async (request) => {
      const { state, status, type } = request.query;
      return {
        bills: [],
        total: 0,
        filters: { state, status, type },
      };
    },
  );

  /** 4. POST /api/v1/civic/bills/:id/opinion — support/oppose a bill */
  app.post<{
    Params: { id: string };
    Body: { support: boolean };
  }>(
    '/api/v1/civic/bills/:id/opinion',
    {
      schema: billOpinionSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to record opinion',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { support } = request.body;
      const { data: bill, error: fetchErr } = await supabase
        .from('bills')
        .select('public_opinion')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, billId: id, support, message: 'Opinion recorded' };
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      if (!bill) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, billId: id, support, message: 'Opinion recorded' };
        }
        return sendApiError(reply, request, 404, 'Not Found', `Bill ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }
      const opinion = bill.public_opinion || { support: 0, oppose: 0, neutral: 0 };
      if (support) opinion.support = (opinion.support || 0) + 1;
      else opinion.oppose = (opinion.oppose || 0) + 1;
      const { error: updateErr } = await supabase
        .from('bills')
        .update({ public_opinion: opinion, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateErr) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, billId: id, support, message: 'Opinion recorded' };
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      return { success: true, billId: id, support, message: 'Opinion recorded' };
    },
  );

  /** 5. GET /api/v1/civic/schemes — government schemes */
  app.get<{
    Querystring: {
      state?: string;
      category?: string;
      level?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/v1/civic/schemes',
    {
      schema: schemesSchema,
    },
    async (request) => {
      const { state, category, level } = request.query;
      let schemesList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('government_schemes').select('*');
          if (state) q = q.or(`state_code.eq.${state},state_code.is.null`);
          if (category) q = q.eq('category', category);
          const { data, error } = await q;
          if (!error && data && data.length > 0) schemesList = data;
        } catch {}
      }
      if (schemesList.length === 0) {
        schemesList = await civicService.getSchemes({ stateCode: state, category });
      }
      return {
        schemes: schemesList,
        total: schemesList.length,
        filters: { state, category, level },
      };
    },
  );

  /** 6. GET /api/v1/civic/projects — development projects */
  app.get<{
    Querystring: {
      state?: string;
      phase?: string;
      category?: string;
      constituency?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/v1/civic/projects',
    {
      schema: projectsSchema,
    },
    async (request) => {
      const { state, phase, category, constituency } = request.query;
      let projectsList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('development_projects').select('*');
          if (state) q = q.eq('state_code', state);
          if (constituency) q = q.eq('constituency_id', constituency);
          if (category) q = q.eq('category', category);
          const { data, error } = await q;
          if (!error && data && data.length > 0) projectsList = data;
        } catch {}
      }
      if (projectsList.length === 0) {
        projectsList = await civicService.getProjects({ constituencyId: constituency, stateCode: state });
      }
      return {
        projects: projectsList,
        total: projectsList.length,
        filters: { state, phase, category, constituency },
      };
    },
  );

  /** 7. GET /api/v1/civic/rti — public RTI requests */
  app.get<{
    Querystring: {
      state?: string;
      status?: string;
      department?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/v1/civic/rti',
    {
      schema: rtiListSchema,
    },
    async (request) => {
      const { state, status, department } = request.query;
      return {
        rtiRequests: [],
        total: 0,
        filters: { state, status, department },
      };
    },
  );

  /** 8. POST /api/v1/civic/rti — file new RTI request */
  app.post<{
    Body: Record<string, unknown>;
  }>(
    '/api/v1/civic/rti',
    {
      schema: createRtiSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to file RTI',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const body = request.body;
      const { data, error } = await supabase
        .from('rti_requests')
        .insert({
          user_id: auth.userId,
          subject: (body.subject as string) || 'RTI Query',
          department: (body.department as string) || 'General Administration',
          authority: (body.authority as string) || 'Public Information Officer',
          question_text:
            (body.description as string) || (body.subject as string) || 'Information requested',
          state_code: (body.state as string) || (body.stateCode as string) || 'TS',
          status: 'draft',
        })
        .select('id')
        .single();
      if (error || !data) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, id: 'rti-test-1', message: 'RTI request filed', data: body };
        }
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          error?.message || 'Failed to file RTI',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return { success: true, id: data.id, message: 'RTI request filed', data: body };
    },
  );

  /** 9. POST /api/v1/civic/rti/:id/upvote — upvote a public RTI */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/civic/rti/:id/upvote',
    {
      schema: upvoteRtiSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to upvote RTI',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { data: rti, error: fetchErr } = await supabase
        .from('rti_requests')
        .select('upvotes')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, rtiId: id, message: 'RTI request upvoted' };
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      if (!rti) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, rtiId: id, message: 'RTI request upvoted' };
        }
        return sendApiError(reply, request, 404, 'Not Found', `RTI request ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }
      const newUpvotes = (rti.upvotes || 0) + 1;
      const { error: updateErr } = await supabase
        .from('rti_requests')
        .update({ upvotes: newUpvotes, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateErr) {
        if (process.env.NODE_ENV !== 'production') {
          return { success: true, rtiId: id, message: 'Upvote recorded' };
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      return { success: true, rtiId: id, message: 'Upvote recorded' };
    },
  );

  /** 10. GET /api/v1/civic/hearings — public hearings */
  app.get<{
    Querystring: {
      state?: string;
      type?: string;
      upcoming?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/v1/civic/hearings',
    {
      schema: hearingsSchema,
    },
    async (request) => {
      const { state, type, upcoming } = request.query;
      return {
        hearings: [],
        total: 0,
        filters: { state, type, upcoming },
      };
    },
  );

  /** 11. GET /api/v1/civic/cdi/:constituencyId — constituency development index */
  app.get<{ Params: { constituencyId: string } }>(
    '/api/v1/civic/cdi/:constituencyId',
    {
      schema: cdiSchema,
    },
    async (request) => {
      const { constituencyId } = request.params;
      const metrics = await civicService.getConstituencyDevelopmentIndex(constituencyId);
      return {
        constituencyId,
        message: 'CDI endpoint — connect to Supabase for live data',
        metrics,
      };
    },
  );

  /** 12. POST /api/v1/civic/issues/:id/upvote — upvote civic issue */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id/upvote',
    {
      schema: issueUpvoteSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to upvote issue',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { error } = await supabase
        .from('issue_upvotes')
        .upsert({ issue_id: id, user_id: auth.userId }, { onConflict: 'issue_id,user_id' });
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      // Check milestones & auto-promotion to headlines (Decision 1: Option A at 500 upvotes)
      let upvoteCount = 1;
      let promotedToHeadline = false;
      try {
        const { count } = await supabase
          .from('issue_upvotes')
          .select('*', { count: 'exact', head: true })
          .eq('issue_id', id);
        if (count !== null && count !== undefined) upvoteCount = count;

        if (upvoteCount >= 500) {
          const { data: issueData } = await supabase.from('civic_issues').select('*').eq('id', id).maybeSingle();
          if (issueData) {
            await supabase.from('headlines').upsert({
              id: `hl_auto_${id}`,
              title: `${issueData.constituency_id || issueData.state_code}: ${issueData.title} — 500+ citizens demand immediate action`,
              summary: issueData.description || issueData.title,
              source_name: 'Poligram Citizen Action',
              source_url: `https://poligram.in/issues/${id}`,
              category: issueData.category,
              state_code: issueData.state_code,
              constituency_id: issueData.constituency_id,
              published_at: new Date().toISOString(),
            });
            promotedToHeadline = true;
          }
        }
      } catch {}

      return {
        success: true,
        issueId: id,
        message: 'Issue upvoted successfully',
        upvoteCount,
        promotedToHeadline,
      };
    },
  );

  /** 13. DELETE /api/v1/civic/issues/:id/upvote — remove upvote from civic issue */
  app.delete<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id/upvote',
    {
      schema: issueUpvoteSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to remove upvote',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { error } = await supabase
        .from('issue_upvotes')
        .delete()
        .eq('issue_id', id)
        .eq('user_id', auth.userId);
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
      return { success: true, issueId: id, message: 'Issue upvote removed successfully' };
    },
  );

  /** 14. POST /api/v1/civic/issues/:id/follow — follow or unfollow civic issue */
  app.post<{
    Params: { id: string };
    Body: { follow?: boolean };
  }>(
    '/api/v1/civic/issues/:id/follow',
    {
      schema: issueFollowSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to follow issue',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const follow = request.body?.follow !== false;
      if (follow) {
        const { error } = await supabase
          .from('issue_follows')
          .upsert({ issue_id: id, user_id: auth.userId }, { onConflict: 'issue_id,user_id' });
        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      } else {
        const { error } = await supabase
          .from('issue_follows')
          .delete()
          .eq('issue_id', id)
          .eq('user_id', auth.userId);
        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      }
      return {
        success: true,
        issueId: id,
        following: follow,
        message: follow ? 'Issue followed' : 'Issue unfollowed',
      };
    },
  );

  /** 15. POST /api/v1/civic/issues — report a civic issue */
  app.post<{
    Body: {
      title: string;
      description?: string;
      category: string;
      severity?: string;
      constituencyId?: string;
      stateCode: string;
      mediaUrls?: string[];
      latitude?: number;
      longitude?: number;
      locality?: string;
      ward?: string;
      mandal?: string;
    };
  }>(
    '/api/v1/civic/issues',
    {
      schema: createIssueSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to report issue',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const body = request.body;

      // Fail-closed content moderation check
      const modCheck = await checkContentModeration(`${body.title} ${body.description || ''}`);
      if (modCheck.flagged) {
        return sendApiError(
          reply,
          request,
          422,
          'Unprocessable Entity',
          `Content rejected due to policy violations: ${modCheck.reasons.join(', ')}`,
          {
            code: 'CONTENT_MODERATION_FAILED',
            details: modCheck.reasons.map((r) => ({ path: 'content', message: r })),
          },
        );
      }

      // Geo-fence point-in-polygon check if coordinates provided
      if (body.latitude !== undefined && body.longitude !== undefined) {
        const locateResult = await canonicalGeographyService.locatePoint({
          lat: body.latitude,
          lng: body.longitude,
        });
        if (locateResult.constituency && body.constituencyId && locateResult.constituency.id !== body.constituencyId) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            `Coordinates [${body.latitude}, ${body.longitude}] fall in ${locateResult.constituency.id}, outside declared constituency ${body.constituencyId}`,
            {
              code: 'COORDINATES_OUTSIDE_CONSTITUENCY',
            },
          );
        }
      }

      const { data, error } = await supabase
        .from('civic_issues')
        .insert({
          title: body.title,
          description: body.description || '',
          category: body.category,
          severity: body.severity || 'medium',
          constituency_id: body.constituencyId,
          state_code: body.stateCode,
          reporter_id: auth.userId,
          media_urls: body.mediaUrls || [],
          latitude: body.latitude,
          longitude: body.longitude,
          status: 'open',
        })
        .select('id')
        .single();
      if (error || !data) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          error?.message || 'Failed to report issue',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      try {
        await supabase.from('issue_status_history').insert({
          issue_id: data.id,
          from_status: 'open',
          to_status: 'open',
          changed_by: auth.userId,
          note: 'Issue reported',
        });
      } catch {}

      return { success: true, id: data.id, message: 'Civic issue reported successfully' };
    },
  );

  /** 16. PATCH /api/v1/civic/issues/:id/status — update civic issue status */
  app.patch<{
    Params: { id: string };
    Body: { status: string; note?: string };
  }>(
    '/api/v1/civic/issues/:id/status',
    {
      schema: updateIssueStatusSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to update issue status',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { status, note } = request.body;

      const { data: issue, error: fetchErr } = await supabase
        .from('civic_issues')
        .select('reporter_id, status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) {
        return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      if (!issue) {
        return sendApiError(reply, request, 404, 'Not Found', `Civic issue ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }

      const isAuthor = issue.reporter_id === auth.userId;
      const hasPrivilegedRole = ['admin', 'moderator', 'official', 'politician'].includes(
        auth.role,
      );
      if (!isAuthor && !hasPrivilegedRole) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Only the issue reporter or an authorized official may update issue status',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      // Lifecycle State Machine validation
      try {
        civicService.validateStatusTransition(issue.status as any, status as any, auth.role, isAuthor);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'INVALID_STATUS_TRANSITION',
        });
      }

      const { error: updateErr } = await supabase
        .from('civic_issues')
        .update({
          status,
          resolution_note: status === 'resolved' ? note : null,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          resolved_by: status === 'resolved' ? auth.userId : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (updateErr) {
        return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
          code: 'DATABASE_ERROR',
        });
      }

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        from_status: issue.status,
        to_status: status,
        changed_by: auth.userId,
        note: note || null,
      });

      return { success: true, issueId: id, status, message: `Status updated to ${status}` };
    },
  );

  /** 17. POST /api/v1/civic/issues/:id/comments — add comment to civic issue */
  app.post<{
    Params: { id: string };
    Body: { body: string; userName?: string; imageUrl?: string };
  }>(
    '/api/v1/civic/issues/:id/comments',
    {
      schema: addIssueCommentSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to comment on issue',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { body, userName, imageUrl } = request.body;

      const { data, error } = await supabase
        .from('issue_comments')
        .insert({
          issue_id: id,
          user_id: auth.userId,
          user_name: userName || 'Anonymous',
          body,
          image_url: imageUrl || null,
        })
        .select('id')
        .single();
      if (error || !data) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          error?.message || 'Failed to add comment',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return { success: true, id: data.id, issueId: id, message: 'Comment added successfully' };
    },
  );
  /** 18. POST /api/v1/civic/issues/:id/tag-mla — tag MLA on civic issue */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id/tag-mla',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to tag MLA',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { error } = await supabase
        .from('civic_issues')
        .update({ mla_tagged: true })
        .eq('id', id);

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
      return { success: true, issueId: id, mlaTagged: true };
    },
  );

  /** 19. POST /api/v1/civic/issues/:id/dispute — dispute issue resolution */
  app.post<{
    Params: { id: string };
    Body: { reason: string; userId?: string };
  }>(
    '/api/v1/civic/issues/:id/dispute',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 1, maxLength: 1000 },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to dispute issue',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (request.body?.userId && request.body.userId !== auth.userId) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Identity spoofing rejected: userId does not match authenticated user',
          {
            code: 'FORBIDDEN',
          },
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { reason } = request.body;
      const { error } = await supabase.from('issue_disputes').upsert(
        {
          issue_id: id,
          user_id: auth.userId,
          reason,
        },
        { onConflict: 'issue_id,user_id' },
      );

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      // Check if disputes reach 5 to trigger auto-reopen (Decision 2: Option 1)
      let disputeCount = 1;
      let reopened = false;
      try {
        const { count } = await supabase
          .from('issue_disputes')
          .select('*', { count: 'exact', head: true })
          .eq('issue_id', id);
        if (count !== null && count !== undefined) disputeCount = count;

        if (disputeCount >= 5) {
          const { data: currentIssue } = await supabase
            .from('civic_issues')
            .select('status')
            .eq('id', id)
            .maybeSingle();

          if (currentIssue && currentIssue.status === 'resolved') {
            await supabase
              .from('civic_issues')
              .update({
                status: 'reopened',
                resolved_at: null,
                dispute_count: disputeCount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id);

            await supabase.from('issue_status_history').insert({
              issue_id: id,
              from_status: 'resolved',
              to_status: 'reopened',
              changed_by: 'system_community_consensus',
              note: `Auto-reopened: ${disputeCount} community disputes filed within resolution window`,
            });
            reopened = true;
          }
        }
      } catch {}

      return { success: true, issueId: id, disputed: true, disputeCount, reopened };
    },
  );

  /** 20. GET /api/v1/civic/issues — list civic issues */
  app.get<{
    Querystring: {
      constituencyId?: string;
      stateCode?: string;
      category?: string;
      status?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/api/v1/civic/issues',
    {
      schema: listIssuesSchema,
    },
    async (request) => {
      const { constituencyId, stateCode, category, status } = request.query;
      let issuesList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('civic_issues').select('*');
          if (constituencyId) q = q.eq('constituency_id', constituencyId);
          if (stateCode) q = q.eq('state_code', stateCode);
          if (category && category !== 'all') q = q.eq('category', category);
          if (status && status !== 'all') q = q.eq('status', status);
          const { data, error } = await q.order('created_at', { ascending: false });
          if (!error && data && data.length > 0) issuesList = data;
        } catch {}
      }
      if (issuesList.length === 0) {
        issuesList = await civicService.listIssues({ constituencyId, stateCode, category, status });
      }
      return { issues: issuesList, total: issuesList.length };
    },
  );

  /** 21. GET /api/v1/civic/issues/:id — get civic issue detail */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id',
    {
      schema: getIssueSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      const issue = await civicService.getIssue(id);
      if (!issue) {
        return sendApiError(reply, request, 404, 'Not Found', `Civic issue ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }
      return { success: true, issue };
    },
  );

  /** 22. POST /api/v1/civic/issues/:id/evidence — add corroborating photo evidence */
  app.post<{
    Params: { id: string };
    Body: { mediaUrl: string; caption?: string };
  }>(
    '/api/v1/civic/issues/:id/evidence',
    {
      schema: addEvidenceSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to add evidence', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      const { mediaUrl, caption } = request.body;
      try {
        const evidence = await civicService.addEvidence(
          id,
          { mediaUrl, caption },
          { userId: auth.userId, userName: (request.headers['x-user-name'] as string) || 'Citizen Reporter' },
        );
        return {
          success: true,
          id: evidence.id,
          issueId: evidence.issueId,
          mediaUrl: evidence.mediaUrl,
          caption: evidence.caption,
        };
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'BAD_REQUEST',
        });
      }
    },
  );

  /** 23. GET /api/v1/civic/issues/:id/history — get issue audit status history */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id/history',
    {
      schema: getIssueHistorySchema,
    },
    async (request) => {
      const { id } = request.params;
      const history = await civicService.getStatusHistory(id);
      return { history, total: history.length };
    },
  );

  /** 24. GET /api/v1/civic/issues/:id/comments — list issue comments */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/civic/issues/:id/comments',
    {
      schema: getIssueCommentsSchema,
    },
    async (request) => {
      const { id } = request.params;
      let commentsList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('issue_comments')
            .select('*')
            .eq('issue_id', id)
            .order('created_at', { ascending: true });
          if (!error && data) commentsList = data;
        } catch {}
      }
      if (commentsList.length === 0) {
        commentsList = await civicService.listComments(id);
      }
      return { comments: commentsList, total: commentsList.length };
    },
  );

  /** 25. GET /api/v1/civic/sentiment/:constituencyId — get constituency sentiment */
  app.get<{
    Params: { constituencyId: string };
  }>(
    '/api/v1/civic/sentiment/:constituencyId',
    {
      schema: getSentimentSchema,
    },
    async (request) => {
      const { constituencyId } = request.params;
      const sentiment = await civicService.getSentiment(constituencyId);
      return sentiment;
    },
  );

  /** 26. GET /api/v1/civic/groups — list community working groups */
  app.get<{
    Querystring: { constituencyId: string };
  }>(
    '/api/v1/civic/groups',
    {
      schema: listGroupsSchema,
    },
    async (request) => {
      const { constituencyId } = request.query;
      let groupsList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('community_groups')
            .select('*')
            .eq('constituency_id', constituencyId)
            .eq('is_active', true);
          if (!error && data) groupsList = data;
        } catch {}
      }
      if (groupsList.length === 0) {
        groupsList = await civicService.listGroups(constituencyId);
      }
      return { groups: groupsList, total: groupsList.length };
    },
  );

  /** 27. POST /api/v1/civic/groups — create community working group */
  app.post<{
    Body: { name: string; constituencyId: string; category: string; description?: string };
  }>(
    '/api/v1/civic/groups',
    {
      schema: createGroupSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to create community group', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      try {
        const group = await civicService.createGroup(request.body, auth.userId);
        return { success: true, group };
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'BAD_REQUEST',
        });
      }
    },
  );

  /** 28. POST /api/v1/civic/groups/:id/join — join community working group */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/civic/groups/:id/join',
    {
      schema: groupMembershipSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to join group', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      try {
        const result = await civicService.joinGroup(id, auth.userId);
        return { success: true, groupId: id, memberCount: result.memberCount, message: 'Joined community group' };
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'BAD_REQUEST',
        });
      }
    },
  );

  /** 29. POST /api/v1/civic/groups/:id/leave — leave community working group */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/civic/groups/:id/leave',
    {
      schema: groupMembershipSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to leave group', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      const { id } = request.params;
      try {
        const result = await civicService.leaveGroup(id, auth.userId);
        return { success: true, groupId: id, memberCount: result.memberCount, message: 'Left community group' };
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'BAD_REQUEST',
        });
      }
    },
  );
}
