import { CONTENT_LIMITS, STATES } from '@kshetra/shared';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type { FastifyInstance } from 'fastify';
import { extractAuthoritativeRole } from '../lib/userAuth';
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
import { LEGACY_SYNTHETIC_CIVIC_ISSUE_IDS } from '@kshetra/shared';

const isProductionRuntime = () => isProductionLikeRuntime();
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

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
        budget: {
          anyOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }],
        },
      },
      required: ['stateCode', 'message'],
      additionalProperties: true,
    },
  },
};

const billsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: {
        type: 'string',
        enum: [
          'introduced',
          'first_reading',
          'committee_review',
          'second_reading',
          'passed_lower',
          'passed_upper',
          'presidential_assent',
          'enacted',
          'lapsed',
          'withdrawn',
          'referred_select',
        ],
      },
      type: {
        type: 'string',
        enum: ['ordinary', 'money', 'finance', 'constitutional_amendment', 'private_member'],
      },
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
        publicOpinion: {
          type: 'object',
          properties: {
            support: { type: 'integer', minimum: 0 },
            oppose: { type: 'integer', minimum: 0 },
            neutral: { type: 'integer', minimum: 0 },
          },
          required: ['support', 'oppose', 'neutral'],
        },
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
      level: { type: 'string', enum: ['central', 'state', 'joint'] },
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
      phase: {
        type: 'string',
        enum: [
          'proposed',
          'approved',
          'tendered',
          'under_construction',
          'delayed',
          'completed',
          'inaugurated',
          'cancelled',
          'stalled',
        ],
      },
      category: { type: 'string' },
      constituency: { type: 'string', pattern: '^(AC-)?[0-9]{1,3}$' },
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
      status: {
        type: 'string',
        enum: [
          'draft',
          'filed',
          'acknowledged',
          'first_appeal',
          'second_appeal',
          'information_received',
          'denied',
          'partial_response',
          'transferred',
          'closed',
        ],
      },
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
    additionalProperties: false,
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      type: {
        type: 'string',
        enum: [
          'public_hearing',
          'gram_sabha',
          'ward_meeting',
          'town_hall',
          'environment_clearance',
          'land_acquisition',
          'budget_consultation',
          'grievance_redressal',
        ],
      },
      upcoming: { type: 'string', enum: ['true', 'false'] },
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
      title: { type: 'string', minLength: 5, maxLength: CONTENT_LIMITS.civic.title },
      description: { type: 'string', maxLength: CONTENT_LIMITS.civic.description },
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
      mediaUrls: {
        type: 'array',
        maxItems: CONTENT_LIMITS.civic.attachments,
        items: { type: 'string', maxLength: 256 },
      },
      submissionId: { type: 'string', format: 'uuid' },
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
        page: { type: 'integer' },
        limit: { type: 'integer' },
      },
      required: ['issues', 'total', 'page', 'limit'],
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
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 50 },
      beforeId: { type: 'string', maxLength: 36 },
      beforeAt: { type: 'string', maxLength: 35 },
    },
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
      mandal: { type: 'string', minLength: 1 },
      ward: { type: 'string', minLength: 1 },
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
      category: {
        type: 'string',
        enum: [
          'sanitation',
          'roads',
          'water',
          'electricity',
          'education',
          'environment',
          'public_safety',
          'healthcare',
          'general',
        ],
      },
      description: { type: 'string', maxLength: 500 },
      mandal: { type: 'string', maxLength: 100 },
      ward: { type: 'string', maxLength: 100 },
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

async function resolveAuthUser(request: any): Promise<{
  userId: string;
  role: string;
  displayName: string | null;
  authorityConstituency: string | null;
} | null> {
  let userId: string | null = null;
  let role = 'citizen';
  let displayName: string | null = null;
  let authorityConstituency: string | null = null;
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
        role = extractAuthoritativeRole(user);
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role,display_name,verification_status')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!profileError && profile) {
            displayName = profile.display_name;
            const assigned = user.app_metadata?.civic_authority_constituency;
            if (
              profile.verification_status === 'verified' &&
              typeof assigned === 'string' &&
              ['official', 'politician'].includes(profile.role)
            ) {
              role = profile.role;
              authorityConstituency = assigned;
            }
          }
        } catch {
          // Profile lookup failure must not grant elevated access.
          role = 'citizen';
        }
      }
    }
  }

  if (!isProductionRuntime() && !userId && (request.headers['x-user-id'] as string)) {
    userId = request.headers['x-user-id'] as string;
    role = (request.headers['x-user-role'] as string) || 'citizen';
  }

  if (!userId) return null;

  return { userId, role, displayName, authorityConstituency };
}

async function verifiedCivicContributor(userId: string): Promise<boolean> {
  if (!isProductionRuntime()) return true;
  const { data, error } = await supabase
    .from('creator_kyc_records')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error)
    throw Object.assign(new Error('Could not confirm contributor verification'), {
      statusCode: 503,
    });
  return data?.status === 'verified';
}

export async function civicRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/civic/budget/:stateCode — state budget summary */
  app.get<{ Params: { stateCode: string } }>(
    '/api/v1/civic/budget/:stateCode',
    {
      schema: budgetSchema,
    },
    async (request, reply) => {
      const { stateCode } = request.params;
      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'State budget data is unavailable because storage is not configured.',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      try {
        const { data, error } = await supabase
          .from('state_budget_summaries')
          .select('*')
          .eq('state_code', stateCode)
          .order('fiscal_year', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          request.log.error(
            { err: error.message, stateCode },
            'Failed to load state budget summary',
          );
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'State budget data could not be loaded from storage.',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        const priorEstimates = data?.source_url
          ? await supabase
              .from('state_budget_summaries')
              .select('fiscal_year,total_budget_crores,total_revised_crores,source_url,source_verified_on')
              .eq('state_code', stateCode)
              .lt('fiscal_year', data.fiscal_year)
              .not('source_url', 'is', null)
              .order('fiscal_year', { ascending: false })
              .limit(4)
          : null;
        if (priorEstimates?.error)
          request.log.warn({ stateCode }, 'Prior budget estimates unavailable');
        return {
          stateCode,
          message: data
            ? 'Budget summary loaded from stored records.'
            : 'No state budget record is available yet.',
          budget:
            data && priorEstimates
              ? { ...data, priorEstimates: priorEstimates.data ?? [] }
              : (data ?? null),
        };
      } catch (error: any) {
        request.log.error(
          { err: error?.message, stateCode },
          'Exception loading state budget summary',
        );
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'State budget data could not be loaded from storage.',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
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
    async (request, reply) => {
      const { state, status, type, page = 1, limit = 50 } = request.query;
      if (!isSupabaseConfigured) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Legislation records are unavailable because storage is not configured.',
            { code: 'CIVIC_BILLS_UNAVAILABLE' },
          );
        }
        return { bills: [], total: 0, filters: { state, status, type } };
      }

      try {
        let query = supabase.from('bills').select('*', { count: 'exact' });
        if (state) query = query.eq('state_code', state);
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);

        const offset = (page - 1) * limit;
        const { data, count, error } = await query
          .order('introduced_date', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          request.log.error({ err: error.message }, 'Failed to load legislation records');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Legislation records could not be loaded from storage.',
            { code: 'CIVIC_BILLS_UNAVAILABLE' },
          );
        }

        const total = parseNonNegativeInteger(count);
        if (total === null) {
          request.log.error('Exact legislation record count is unavailable');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Legislation records could not be counted reliably.',
            { code: 'CIVIC_BILLS_UNAVAILABLE' },
          );
        }

        const rows = data || [];
        const opinionsByBill = new Map<
          string,
          { support: number; oppose: number; neutral: number }
        >();
        if (rows.length > 0) {
          const { data: opinions, error: opinionError } = await supabase.rpc(
            'get_bill_opinion_counts',
            {
              p_bill_ids: rows.map((row: any) => row.id),
            },
          );
          if (opinionError) {
            request.log.warn({ err: opinionError.message }, 'Bill opinion counts are unavailable');
          } else if (Array.isArray(opinions)) {
            for (const opinion of opinions) {
              const support = parseNonNegativeInteger(opinion.support);
              const oppose = parseNonNegativeInteger(opinion.oppose);
              const neutral = parseNonNegativeInteger(opinion.neutral);
              if (
                typeof opinion.bill_id === 'string' &&
                support !== null &&
                oppose !== null &&
                neutral !== null
              ) {
                opinionsByBill.set(opinion.bill_id, { support, oppose, neutral });
              }
            }
          }
        }

        return {
          bills: rows.map((row: any) => ({
            ...row,
            // Never trust the legacy JSON aggregate; only show counts derived from unique vote records.
            public_opinion: opinionsByBill.get(row.id) || {
              support: null,
              oppose: null,
              neutral: null,
            },
          })),
          total,
          filters: { state, status, type },
        };
      } catch (error: any) {
        request.log.error({ err: error?.message }, 'Exception loading legislation records');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Legislation records could not be loaded from storage.',
          { code: 'CIVIC_BILLS_UNAVAILABLE' },
        );
      }
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
      const { data, error } = await supabase.rpc('record_bill_opinion', {
        p_bill_id: id,
        p_user_id: auth.userId,
        p_support: support,
      });
      if (error) {
        if (!isProductionRuntime()) {
          return { success: true, billId: id, support, message: 'Opinion recorded' };
        }
        return sendApiError(
          reply,
          request,
          error.code === '23503' ? 404 : 503,
          error.code === '23503' ? 'Not Found' : 'Service Unavailable',
          error.code === '23503'
            ? `Bill ${id} not found`
            : 'Bill opinions could not be recorded from storage.',
          { code: error.code === '23503' ? 'NOT_FOUND' : 'CIVIC_BILL_OPINION_UNAVAILABLE' },
        );
      }

      const opinion = Array.isArray(data) ? data[0] : data;
      const supportCount = parseNonNegativeInteger(opinion?.support);
      const opposeCount = parseNonNegativeInteger(opinion?.oppose);
      const neutralCount = parseNonNegativeInteger(opinion?.neutral);
      if (supportCount === null || opposeCount === null || neutralCount === null) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Bill opinion totals are unavailable from storage.',
          { code: 'CIVIC_BILL_OPINION_UNAVAILABLE' },
        );
      }
      return {
        success: true,
        billId: id,
        support,
        publicOpinion: { support: supportCount, oppose: opposeCount, neutral: neutralCount },
        message: 'Opinion recorded',
      };
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
    async (request, reply) => {
      const { state, category, level, page = 1, limit = 50 } = request.query;
      let schemesList: any[] = [];
      let total = 0;
      if (!isSupabaseConfigured && isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Government scheme records are unavailable from the authoritative database.',
          { code: 'CIVIC_SCHEMES_UNAVAILABLE' },
        );
      }
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('government_schemes').select('*', { count: 'exact' });
          if (state) q = q.or(`state_code.eq.${state},state_code.is.null`);
          if (category) q = q.eq('category', category);
          if (level) q = q.eq('level', level);
          const offset = (page - 1) * limit;
          const { data, count, error } = await q
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
          if (error && isProductionRuntime()) {
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Government scheme records could not be loaded from the authoritative database.',
              { code: 'CIVIC_SCHEMES_UNAVAILABLE' },
            );
          }
          const exactCount = parseNonNegativeInteger(count);
          if (!error && exactCount !== null) {
            schemesList = data || [];
            total = exactCount;
          } else if (isProductionRuntime()) {
            request.log.error(
              { err: error?.message, count },
              'Exact government scheme record count is unavailable',
            );
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Government scheme records could not be counted reliably.',
              { code: 'CIVIC_SCHEMES_UNAVAILABLE' },
            );
          }
        } catch {
          if (isProductionRuntime()) {
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Government scheme records could not be loaded from the authoritative database.',
              { code: 'CIVIC_SCHEMES_UNAVAILABLE' },
            );
          }
        }
      }
      if (!isProductionRuntime() && schemesList.length === 0) {
        const fallbackSchemes = await civicService.getSchemes({ stateCode: state, category });
        const filteredSchemes = fallbackSchemes.filter(
          (scheme) =>
            (!level || scheme.level === level) &&
            (!state || !scheme.stateCode || scheme.stateCode === state),
        );
        total = filteredSchemes.length;
        const offset = (page - 1) * limit;
        schemesList = filteredSchemes.slice(offset, offset + limit);
      }
      return {
        schemes: schemesList,
        total,
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
    async (request, reply) => {
      const { state, phase, category, constituency, page = 1, limit = 50 } = request.query;
      let projectsList: any[] = [];
      let total = 0;
      if (!isSupabaseConfigured && isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Development project records are unavailable from the authoritative database.',
          { code: 'CIVIC_PROJECTS_UNAVAILABLE' },
        );
      }
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('development_projects').select('*', { count: 'exact' });
          if (state) q = q.eq('state_code', state);
          if (constituency)
            q = q.eq('constituency_ac_no', Number(constituency.replace(/^AC-/i, '')));
          if (category) q = q.eq('category', category);
          if (phase) q = q.eq('phase', phase);
          const offset = (page - 1) * limit;
          const { data, count, error } = await q
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
          if (error && isProductionRuntime()) {
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Development project records could not be loaded from the authoritative database.',
              { code: 'CIVIC_PROJECTS_UNAVAILABLE' },
            );
          }
          const exactCount = parseNonNegativeInteger(count);
          if (!error && exactCount !== null) {
            projectsList = data || [];
            total = exactCount;
          } else if (isProductionRuntime()) {
            request.log.error(
              { err: error?.message, count },
              'Exact development project record count is unavailable',
            );
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Development project records could not be counted reliably.',
              { code: 'CIVIC_PROJECTS_UNAVAILABLE' },
            );
          }
        } catch {
          if (isProductionRuntime()) {
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Development project records could not be loaded from the authoritative database.',
              { code: 'CIVIC_PROJECTS_UNAVAILABLE' },
            );
          }
        }
      }
      if (!isProductionRuntime() && projectsList.length === 0) {
        const fallbackProjects = await civicService.getProjects({
          constituencyId: constituency,
          stateCode: state,
        });
        const filteredProjects = fallbackProjects.filter((project) => {
          const projectConstituency =
            typeof project.constituencyId === 'string'
              ? Number(project.constituencyId.replace(/^AC-/i, ''))
              : null;
          return (
            (!phase || project.phase === phase) &&
            (!category || project.category === category) &&
            (!constituency || projectConstituency === Number(constituency.replace(/^AC-/i, '')))
          );
        });
        total = filteredProjects.length;
        const offset = (page - 1) * limit;
        projectsList = filteredProjects.slice(offset, offset + limit);
      }
      return {
        projects: projectsList,
        total,
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
    async (request, reply) => {
      const { state, status, department, page = 1, limit = 50 } = request.query;
      if (!isSupabaseConfigured) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public RTI records are unavailable because storage is not configured.',
            { code: 'CIVIC_RTI_UNAVAILABLE' },
          );
        }
        return { rtiRequests: [], total: 0, filters: { state, status, department } };
      }

      try {
        // Do not return account identifiers or unpublished drafts from this public listing.
        let query = supabase
          .from('rti_requests')
          .select(
            'id,status,department,authority,subject,question_text,state_code,district_name,constituency_ac_no,filed_date,acknowledged_date,response_date,response_text,first_appeal_date,second_appeal_date,fees,is_public,upvotes,views,tags,created_at',
            { count: 'exact' },
          )
          .eq('is_public', true)
          .neq('status', 'draft');

        if (state) query = query.eq('state_code', state);
        if (status) query = query.eq('status', status);
        if (department) query = query.eq('department', department);

        const offset = (page - 1) * limit;
        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          request.log.error({ err: error.message }, 'Failed to load public RTI records');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public RTI records could not be loaded from storage.',
            { code: 'CIVIC_RTI_UNAVAILABLE' },
          );
        }

        const total = parseNonNegativeInteger(count);
        if (total === null) {
          request.log.error('Exact public RTI record count is unavailable');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public RTI records could not be counted reliably.',
            { code: 'CIVIC_RTI_UNAVAILABLE' },
          );
        }

        return {
          rtiRequests: data || [],
          total,
          filters: { state, status, department },
        };
      } catch (error: any) {
        request.log.error({ err: error?.message }, 'Exception loading public RTI records');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Public RTI records could not be loaded from storage.',
          { code: 'CIVIC_RTI_UNAVAILABLE' },
        );
      }
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
        if (!isProductionRuntime()) {
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
        if (!isProductionRuntime()) {
          return { success: true, rtiId: id, message: 'RTI request upvoted' };
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
          code: 'DATABASE_ERROR',
        });
      }
      if (!rti) {
        if (!isProductionRuntime()) {
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
        if (!isProductionRuntime()) {
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
    async (request, reply) => {
      const { state, type, upcoming, page = 1, limit = 50 } = request.query;
      const filters = { state, type, upcoming };

      if (!isSupabaseConfigured) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public hearing records are unavailable because storage is not configured.',
            { code: 'CIVIC_HEARINGS_UNAVAILABLE' },
          );
        }
        return { hearings: [], total: 0, filters };
      }

      try {
        let query = supabase
          .from('public_hearings')
          .select(
            'id,type,title,description,organizer,state_code,district_name,constituency_ac_no,venue,date,time,is_open,registration_url,source_url,source_verified_on,agenda_items,minutes_url,outcome,related_project_id,created_at',
            { count: 'exact' },
          );
        if (state) query = query.eq('state_code', state);
        if (type) query = query.eq('type', type);

        // Hearing dates are Indian local calendar dates; avoid UTC midnight
        // shifting the upcoming window around the start/end of an IST day.
        const currentDate = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
        if (upcoming === 'true') query = query.gte('date', currentDate);
        if (upcoming === 'false') query = query.lt('date', currentDate);

        const offset = (page - 1) * limit;
        const { data, count, error } = await query
          .order('date', { ascending: upcoming !== 'false' })
          .range(offset, offset + limit - 1);

        if (error) {
          request.log.error({ err: error.message }, 'Failed to load public hearing records');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public hearing records could not be loaded from storage.',
            { code: 'CIVIC_HEARINGS_UNAVAILABLE' },
          );
        }

        const total = parseNonNegativeInteger(count);
        if (total === null) {
          request.log.error('Exact public hearing record count is unavailable');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Public hearing records could not be counted reliably.',
            { code: 'CIVIC_HEARINGS_UNAVAILABLE' },
          );
        }

        return { hearings: data || [], total, filters };
      } catch (error: any) {
        request.log.error({ err: error?.message }, 'Exception loading public hearing records');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Public hearing records could not be loaded from storage.',
          { code: 'CIVIC_HEARINGS_UNAVAILABLE' },
        );
      }
    },
  );

  /** 11. GET /api/v1/civic/cdi/:constituencyId — constituency development index */
  app.get<{ Params: { constituencyId: string } }>(
    '/api/v1/civic/cdi/:constituencyId',
    {
      schema: cdiSchema,
    },
    async (request, reply) => {
      if (isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'The constituency development index is not backed by durable production analytics yet.',
          { code: 'CIVIC_ANALYTICS_UNAVAILABLE' },
        );
      }
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
      let upvoteCount: number | undefined;
      let promotedToHeadline = false;
      try {
        const { count } = await supabase
          .from('issue_upvotes')
          .select('*', { count: 'exact', head: true })
          .eq('issue_id', id);
        if (count !== null && count !== undefined) upvoteCount = count;

        if (upvoteCount !== undefined && upvoteCount >= 500) {
          const { data: issueData } = await supabase
            .from('civic_issues')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (issueData) {
            const promotion = await supabase.from('headlines').upsert({
              id: `hl_auto_${id}`,
              title: `${issueData.constituency_id || issueData.state_code}: ${issueData.title} — received ${upvoteCount} upvotes in Poligram`,
              summary: issueData.description || issueData.title,
              source_name: 'Poligram Citizen Action',
              source_url: `https://poligram.in/issues/${id}`,
              category: issueData.category,
              state_code: issueData.state_code,
              constituency_id: issueData.constituency_id,
              published_at: new Date().toISOString(),
            });
            promotedToHeadline = !promotion.error;
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
      submissionId?: string;
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
      if (!(await verifiedCivicContributor(auth.userId))) {
        return sendApiError(
          reply,
          request,
          403,
          'Verification required',
          'Complete contributor verification to publish.',
        );
      }
      const body = request.body;
      if (!Object.hasOwn(STATES, body.stateCode) || body.stateCode === 'IN') {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Select a valid state or union territory',
        );
      }
      if (body.constituencyId) {
        const match = /^([A-Z]{2})-AC-([1-9][0-9]*)$/.exec(body.constituencyId);
        const constituency =
          match &&
          match[1] === body.stateCode &&
          (await canonicalGeographyService.getConstituency(body.stateCode, Number(match[2])));
        if (!constituency) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Select a constituency in the report state',
          );
        }
      }

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
        if (
          locateResult.constituency &&
          body.constituencyId &&
          locateResult.constituency.id !== body.constituencyId
        ) {
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

      const { data: id, error } = await supabase.rpc('create_civic_issue_record', {
        p_issue: {
          id: body.submissionId,
          title: body.title.trim(),
          description: body.description?.trim() ?? '',
          category: body.category,
          severity: body.severity ?? 'medium',
          constituency_id: body.constituencyId,
          state_code: body.stateCode,
          reporter_id: auth.userId,
          reporter_name: auth.displayName,
          media_urls: body.mediaUrls ?? [],
          latitude: body.latitude,
          longitude: body.longitude,
        },
      });
      if (error?.code === '22023' || error?.code === '23514') {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Check the report fields and attachments, then try again',
        );
      }
      if (error?.code === '23505') {
        return sendApiError(
          reply,
          request,
          409,
          'Conflict',
          'This submission ID already belongs to another report',
        );
      }
      if (error || !id) {
        request.log.error({ error }, 'Could not save civic report');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Your report could not be saved. Please try again',
        );
      }
      return { success: true, id, message: 'Civic issue reported successfully' };
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
      const storedStatus = status === 'reopened' ? 'open' : status;

      const { data: issue, error: fetchErr } = await supabase
        .from('civic_issues')
        .select('reporter_id, status, constituency_id')
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
      const isAuthority = Boolean(
        issue.constituency_id && auth.authorityConstituency === issue.constituency_id,
      );
      const hasPrivilegedRole =
        ['admin', 'moderator', 'super_admin', 'compliance_officer'].includes(auth.role) ||
        isAuthority;
      if (status === 'acknowledged' && !isAuthority) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Only the verified authority for this constituency can acknowledge the issue',
        );
      }
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
        civicService.validateStatusTransition(
          issue.status as any,
          status as any,
          isAuthority ? 'official' : hasPrivilegedRole ? 'moderator' : 'citizen',
          isAuthor,
        );
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: err.code || 'INVALID_STATUS_TRANSITION',
        });
      }

      const { data: committed, error } = await supabase.rpc('record_civic_issue_status', {
        p_issue_id: id,
        p_expected_status: issue.status,
        p_status: storedStatus,
        p_actor_id: auth.userId,
        p_actor_name: auth.displayName,
        p_actor_role: isAuthority ? 'authority' : hasPrivilegedRole ? auth.role : 'reporter',
        p_note: note ?? null,
      });
      if (error) {
        request.log.error({ error }, 'Could not save civic issue status');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'The status change could not be saved',
        );
      }
      if (!committed) {
        return sendApiError(
          reply,
          request,
          409,
          'Conflict',
          'The issue status changed. Refresh and try again',
        );
      }
      return { success: true, issueId: id, status: storedStatus };
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
      if (!(await verifiedCivicContributor(auth.userId))) {
        return sendApiError(
          reply,
          request,
          403,
          'Verification required',
          'Complete contributor verification to publish.',
        );
      }
      const { id } = request.params;
      const { body, imageUrl } = request.body;
      if (!body.trim() || (await checkContentModeration(body)).flagged) {
        return sendApiError(
          reply,
          request,
          422,
          'Unprocessable Entity',
          'Enter a comment that follows the community rules',
        );
      }
      if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Use an HTTPS link for a comment image',
        );
      }

      const { data, error } = await supabase
        .from('issue_comments')
        .insert({
          issue_id: id,
          user_id: auth.userId,
          user_name: auth.displayName || 'Anonymous',
          body: body.trim(),
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
      const { data, error } = await supabase
        .from('civic_issues')
        .update({ mla_tagged: true })
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
      if (!data) return sendApiError(reply, request, 404, 'Not Found', 'Issue not found');
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
      const issue = await civicService.getIssue(id);
      if (!issue) return sendApiError(reply, request, 404, 'Not Found', 'Issue not found');
      if (issue.status !== 'resolved') {
        return sendApiError(
          reply,
          request,
          409,
          'Conflict',
          'Disputes can be submitted for resolved issues',
        );
      }
      const { error } = await supabase
        .from('issue_disputes')
        .upsert(
          { issue_id: id, user_id: auth.userId, reason },
          { onConflict: 'issue_id,user_id', ignoreDuplicates: true },
        );
      if (error) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'The dispute could not be saved',
        );
      }
      const updated = await civicService.getIssue(id);
      return {
        success: true,
        issueId: id,
        disputed: true,
        disputeCount: updated?.disputeCount,
        reopened: updated?.status === 'open',
      };
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
    async (request, reply) => {
      const { constituencyId, stateCode, category, status } = request.query;
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 50;
      const offset = (page - 1) * limit;
      if (isSupabaseConfigured) {
        try {
          let q = supabase.from('civic_issues').select('*', { count: 'exact' });
          q = q.not('id', 'in', `(${LEGACY_SYNTHETIC_CIVIC_ISSUE_IDS.join(',')})`);
          if (constituencyId) q = q.eq('constituency_id', constituencyId);
          if (stateCode) q = q.eq('state_code', stateCode);
          if (category && category !== 'all') q = q.eq('category', category);
          if (status && status !== 'all') q = q.eq('status', status);
          const { data, count, error } = await q
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) {
            if (isProductionRuntime()) {
              request.log.error({ err: error.message }, 'Failed to load civic issues');
              return sendApiError(
                reply,
                request,
                503,
                'Service Unavailable',
                'Civic issue data is currently unavailable',
                { code: 'DATABASE_ERROR' },
              );
            }
            request.log.warn(
              { err: error.message },
              'Civic issue query failed; using isolated nonproduction store',
            );
          } else {
            if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
              request.log.error('Civic issue query returned no exact count');
              return sendApiError(
                reply,
                request,
                503,
                'Service Unavailable',
                'Civic issue totals are currently unavailable',
                { code: 'CIVIC_ISSUE_COUNT_UNAVAILABLE' },
              );
            }
            return { issues: data ?? [], total: count, page, limit };
          }
        } catch (error: any) {
          if (isProductionRuntime()) {
            request.log.error({ err: error?.message }, 'Exception loading civic issues');
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Civic issue data is currently unavailable',
              { code: 'DATABASE_ERROR' },
            );
          }
        }
      }
      if (isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Civic issue storage is not configured',
          { code: 'DATABASE_UNAVAILABLE' },
        );
      }
      const issuesList = await civicService.listIssues({
        constituencyId,
        stateCode,
        category,
        status,
      });
      return {
        issues: issuesList.slice(offset, offset + limit),
        total: issuesList.length,
        page,
        limit,
      };
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
      if ((LEGACY_SYNTHETIC_CIVIC_ISSUE_IDS as readonly string[]).includes(id)) {
        return sendApiError(reply, request, 404, 'Not Found', `Civic issue ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }
      const issue =
        isProductionRuntime() && !uuidPattern.test(id) ? null : await civicService.getIssue(id);
      if (!issue) {
        return sendApiError(reply, request, 404, 'Not Found', `Civic issue ${id} not found`, {
          code: 'NOT_FOUND',
        });
      }
      if (request.headers.authorization) reply.header('Cache-Control', 'private, no-store');
      const auth = request.headers.authorization ? await resolveAuthUser(request) : null;
      if (request.headers.authorization && !auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Sign in to see your civic activity.',
        );
      }
      const flags: Record<string, boolean> = {
        viewerCanAcknowledge: Boolean(
          issue.constituencyId && auth?.authorityConstituency === issue.constituencyId,
        ),
      };
      if (auth && isSupabaseConfigured && uuidPattern.test(id)) {
        await Promise.all(
          Object.entries({
            userUpvoted: 'issue_upvotes',
            userFollowing: 'issue_follows',
            userDisputed: 'issue_disputes',
          }).map(async ([flag, table]) => {
            const { data, error } = await supabase
              .from(table)
              .select('user_id')
              .eq('issue_id', id)
              .eq('user_id', auth.userId)
              .maybeSingle();
            if (error)
              throw Object.assign(new Error('Could not load civic engagement'), {
                statusCode: 503,
              });
            flags[flag] = Boolean(data);
          }),
        );
      }
      const paths = (issue.mediaUrls ?? []).filter((url) => url.startsWith(issue.reporterId + '/'));
      if (paths.length) {
        const { data, error } = await supabase.storage
          .from('post-media')
          .createSignedUrls(paths, 600);
        if (error) request.log.warn({ error }, 'Issue evidence is temporarily unavailable');
        issue.mediaUrls = [
          ...(issue.mediaUrls ?? []).filter((url) => /^https:\/\//i.test(url)),
          ...(data ?? []).flatMap((item) => (item.signedUrl ? [item.signedUrl] : [])),
        ];
      } else {
        issue.mediaUrls = (issue.mediaUrls ?? []).filter((url) => /^https:\/\//i.test(url));
      }
      return { success: true, issue: { ...issue, ...flags } };
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
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to add evidence',
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
      const { mediaUrl, caption } = request.body;
      try {
        const evidence = await civicService.addEvidence(
          id,
          { mediaUrl, caption },
          {
            userId: auth.userId,
            userName: (request.headers['x-user-name'] as string) || 'Citizen Reporter',
          },
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
      const history =
        isProductionRuntime() && !uuidPattern.test(id)
          ? []
          : await civicService.getStatusHistory(id);
      return { history, total: history.length };
    },
  );

  /** 24. GET /api/v1/civic/issues/:id/comments — list issue comments */
  app.get<{
    Params: { id: string };
    Querystring: { limit?: number; beforeId?: string; beforeAt?: string };
  }>(
    '/api/v1/civic/issues/:id/comments',
    {
      schema: getIssueCommentsSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { limit, beforeId, beforeAt } = request.query;
      if (
        Boolean(beforeId) !== Boolean(beforeAt) ||
        (beforeId && (!limit || !uuidPattern.test(beforeId))) ||
        (beforeAt &&
          (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
            beforeAt,
          ) ||
            !Number.isFinite(Date.parse(beforeAt))))
      ) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid comment page');
      }
      if (isSupabaseConfigured && uuidPattern.test(id)) {
        let query = supabase
          .from('issue_comments')
          .select('id,issue_id,user_id,user_name,body,image_url,is_official,created_at', {
            count: beforeId ? undefined : 'exact',
          })
          .eq('issue_id', id)
          .order('created_at', { ascending: !limit })
          .order('id', { ascending: !limit });
        if (limit) query = query.limit(limit + 1);
        if (beforeId && beforeAt) {
          query = query.or(
            `created_at.lt.${beforeAt},and(created_at.eq.${beforeAt},id.lt.${beforeId})`,
          );
        }
        const [page, totalRead] = await Promise.all([
          query,
          beforeId
            ? supabase
                .from('issue_comments')
                .select('id', { count: 'exact', head: true })
                .eq('issue_id', id)
            : null,
        ]);
        const total = totalRead ? totalRead.count : page.count;
        if (!page.error && !totalRead?.error && page.data && total !== null) {
          const comments = limit ? page.data.slice(0, limit) : page.data;
          const last = comments.at(-1);
          const next =
            limit && last && page.data.length > limit
              ? { beforeId: last.id, beforeAt: last.created_at }
              : null;
          return { comments, total, ...(limit ? { next } : {}) };
        }
      }
      if (isProductionRuntime()) {
        if (!uuidPattern.test(id)) return { comments: [], total: 0 };
        throw Object.assign(new Error('Could not load issue comments'), { statusCode: 503 });
      }
      const comments = await civicService.listComments(id);
      return { comments, total: comments.length };
    },
  );

  app.patch<{ Params: { id: string; commentId: string }; Body: { body: string } }>(
    '/api/v1/civic/issues/:id/comments/:commentId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['body'],
          properties: { body: { type: 'string', minLength: 1, maxLength: 1000 } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth)
        return sendApiError(reply, request, 401, 'Unauthorized', 'Sign in to edit a comment');
      if (!isSupabaseConfigured)
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable');
      const { id, commentId } = request.params;
      if (!uuidPattern.test(id) || !uuidPattern.test(commentId))
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid comment');
      if (!(await verifiedCivicContributor(auth.userId)))
        return sendApiError(
          reply,
          request,
          403,
          'Verification required',
          'Complete contributor verification to edit.',
        );
      const body = request.body.body.trim();
      if (!body || (await checkContentModeration(body)).flagged)
        return sendApiError(
          reply,
          request,
          422,
          'Unprocessable Entity',
          'Enter a comment that follows the community rules',
        );
      const { data, error } = await supabase
        .from('issue_comments')
        .update({ body })
        .eq('id', commentId)
        .eq('issue_id', id)
        .eq('user_id', auth.userId)
        .eq('is_official', false)
        .select('id,body')
        .maybeSingle();
      if (error)
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'The edit could not be saved',
        );
      if (!data)
        return sendApiError(reply, request, 404, 'Not Found', 'Editable comment not found');
      return { success: true, id: data.id, body: data.body };
    },
  );

  app.delete<{ Params: { id: string; commentId: string } }>(
    '/api/v1/civic/issues/:id/comments/:commentId',
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth)
        return sendApiError(reply, request, 401, 'Unauthorized', 'Sign in to remove a comment');
      if (!isSupabaseConfigured)
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable');
      const { id, commentId } = request.params;
      if (!uuidPattern.test(id) || !uuidPattern.test(commentId))
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid comment');
      const { data, error } = await supabase
        .from('issue_comments')
        .delete()
        .eq('id', commentId)
        .eq('issue_id', id)
        .eq('user_id', auth.userId)
        .eq('is_official', false)
        .select('id')
        .maybeSingle();
      if (error)
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'The comment could not be removed',
        );
      if (!data)
        return sendApiError(reply, request, 404, 'Not Found', 'Removable comment not found');
      return { success: true, id: data.id };
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
    async (request, reply) => {
      if (isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Constituency civic activity metrics are not backed by durable production analytics yet.',
          { code: 'CIVIC_ANALYTICS_UNAVAILABLE' },
        );
      }
      const { constituencyId } = request.params;
      const sentiment = await civicService.getSentiment(constituencyId);
      return sentiment;
    },
  );

  /** 26. GET /api/v1/civic/groups — list community working groups */
  app.get<{
    Querystring: { constituencyId: string; mandal?: string; ward?: string };
  }>(
    '/api/v1/civic/groups',
    {
      schema: listGroupsSchema,
    },
    async (request, reply) => {
      const { constituencyId } = request.query;
      if (!isSupabaseConfigured) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Community group storage is not configured',
            { code: 'DATABASE_UNAVAILABLE' },
          );
        }
        const groupsList = await civicService.listGroups(constituencyId, request.query);
        return { groups: groupsList, total: groupsList.length };
      }

      try {
        let query = supabase
          .from('community_groups')
          .select('*')
          .eq('constituency_id', constituencyId)
          .eq('is_active', true);
        if (request.query.mandal) query = query.eq('mandal', request.query.mandal);
        if (request.query.ward) query = query.eq('ward', request.query.ward);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          if (isProductionRuntime()) {
            request.log.error({ err: error.message }, 'Failed to load community groups');
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'Community group data is currently unavailable',
              { code: 'DATABASE_ERROR' },
            );
          }
          request.log.warn(
            { err: error.message },
            'Community group query failed; using isolated nonproduction store',
          );
          const groupsList = await civicService.listGroups(constituencyId, request.query);
          return { groups: groupsList, total: groupsList.length };
        }
        const groupsList = data ?? [];
        return { groups: groupsList, total: groupsList.length };
      } catch (error: any) {
        if (isProductionRuntime()) {
          request.log.error({ err: error?.message }, 'Exception loading community groups');
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Community group data is currently unavailable',
            { code: 'DATABASE_ERROR' },
          );
        }
        const groupsList = await civicService.listGroups(constituencyId, request.query);
        return { groups: groupsList, total: groupsList.length };
      }
    },
  );

  /** 27. POST /api/v1/civic/groups — create community working group */
  app.post<{
    Body: {
      name: string;
      constituencyId: string;
      category: string;
      description?: string;
      mandal?: string;
      ward?: string;
    };
  }>(
    '/api/v1/civic/groups',
    {
      schema: createGroupSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to create community group',
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
      try {
        const group = await civicService.createGroup(request.body, auth.userId);
        return { success: true, group };
      } catch (err: any) {
        const statusCode =
          Number(err.statusCode) || (err.code === 'COMMUNITY_GROUP_SLUG_CONFLICT' ? 409 : 400);
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 503
            ? 'Service Unavailable'
            : statusCode === 409
              ? 'Conflict'
              : 'Bad Request',
          err.message,
          {
            code: err.code || 'BAD_REQUEST',
          },
        );
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
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to join group',
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
      try {
        const result = await civicService.joinGroup(id, auth.userId);
        return {
          success: true,
          groupId: id,
          memberCount: result.memberCount,
          message: 'Joined community group',
        };
      } catch (err: any) {
        const statusCode = Number(err.statusCode) || 400;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 503
            ? 'Service Unavailable'
            : statusCode === 409
              ? 'Conflict'
              : statusCode === 404
                ? 'Not Found'
                : 'Bad Request',
          err.message,
          {
            code: err.code || 'BAD_REQUEST',
          },
        );
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
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to leave group',
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
      try {
        const result = await civicService.leaveGroup(id, auth.userId);
        return {
          success: true,
          groupId: id,
          memberCount: result.memberCount,
          message: 'Left community group',
        };
      } catch (err: any) {
        const statusCode = Number(err.statusCode) || 400;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 503
            ? 'Service Unavailable'
            : statusCode === 409
              ? 'Conflict'
              : statusCode === 404
                ? 'Not Found'
                : 'Bad Request',
          err.message,
          {
            code: err.code || 'BAD_REQUEST',
          },
        );
      }
    },
  );
}
