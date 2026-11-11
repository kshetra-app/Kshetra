import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const isProductionRuntime = () => isProductionLikeRuntime();

async function resolveAuthUser(request: any): Promise<{ userId: string; role: string } | null> {
  let userId: string | null = null;
  let role = 'citizen';
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
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!profileError && profile?.role) role = profile.role;
        } catch {
          // Keep the least-privileged role if profile lookup is unavailable.
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

  return { userId, role };
}

const PROFILE_PUBLIC_COLUMNS = [
  'id',
  'display_name',
  'tier',
  'party',
  'constituency_ac_no',
  'state_code',
  'district_name',
  'bio',
  'photo_url',
  'cover_photo_url',
  'social_links',
  'is_verified',
  'is_active',
  'endorsement_count',
  'manifesto_id',
  'mentor_id',
  'joined_at',
  'created_at',
].join(',');

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function publicProfile(row: any) {
  const socialLinks = Array.isArray(row.social_links)
    ? row.social_links.filter(
        (link: any) => link && typeof link.platform === 'string' && typeof link.url === 'string',
      )
    : [];

  return {
    id: String(row.id),
    displayName: String(row.display_name),
    tier: row.tier,
    party: optionalString(row.party),
    constituencyAcNo: finiteNumber(row.constituency_ac_no) ?? undefined,
    stateCode: String(row.state_code),
    districtName: optionalString(row.district_name),
    bio: typeof row.bio === 'string' ? row.bio : '',
    photoUrl: optionalString(row.photo_url),
    coverPhotoUrl: optionalString(row.cover_photo_url),
    socialLinks,
    isVerified: row.is_verified === true,
    isActive: row.is_active === true,
    // These values are deliberately absent until their producing events are wired.
    followerCount: null,
    endorsementCount: finiteNumber(row.endorsement_count),
    endorsementScore: null,
    eventsHosted: null,
    issuesResponded: null,
    responseRate: null,
    avgResponseTimeHours: null,
    manifestoId: optionalString(row.manifesto_id),
    mentorId: optionalString(row.mentor_id),
    menteesCount: null,
    totalFundsRaised: null,
    joinedAt: optionalString(row.joined_at) ?? optionalString(row.created_at) ?? null,
    lastActiveAt: null,
  };
}

function portalReadError(reply: any, request: any, resource: string, error?: any) {
  if (error) request.log.error({ err: error, resource }, 'Politician portal read failed');
  const code = error?.code;
  if (!isSupabaseConfigured || code === 'PGRST200' || code === 'PGRST205' || code === '42P01') {
    return sendApiError(
      reply,
      request,
      503,
      'Service Unavailable',
      'Politician portal data is not available on this server yet',
      { code: 'PORTAL_DATA_UNAVAILABLE' },
    );
  }
  return sendApiError(
    reply,
    request,
    500,
    'Internal Server Error',
    'Unable to load politician portal data right now',
    { code: 'DATABASE_ERROR' },
  );
}

function joinedPolitician(row: any): any | null {
  const joined = row.politician;
  if (Array.isArray(joined)) return joined[0] ?? null;
  return joined && typeof joined === 'object' ? joined : null;
}

const EVENT_TYPES = new Set([
  'rally',
  'padayatra',
  'town_hall',
  'press_conference',
  'inauguration',
  'meeting',
  'protest',
  'cultural',
  'charity',
  'workshop',
]);
const EVENT_STATUSES = new Set([
  'planned',
  'confirmed',
  'live',
  'completed',
  'cancelled',
  'postponed',
]);
const MANIFESTO_CATEGORIES = new Set([
  'education',
  'healthcare',
  'infrastructure',
  'agriculture',
  'employment',
  'women_empowerment',
  'youth',
  'environment',
  'governance',
  'social_justice',
  'economy',
  'security',
  'housing',
  'technology',
  'culture',
]);
const SURVEY_QUESTION_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'rating',
  'text',
  'yes_no',
  'ranking',
]);

function manifestoItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: any) => {
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.description !== 'string' ||
      !MANIFESTO_CATEGORIES.has(item.category) ||
      !['high', 'medium', 'low'].includes(item.priority)
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        timeline: typeof item.timeline === 'string' ? item.timeline : '',
        budgetEstimate: optionalString(item.budgetEstimate),
        beneficiaries: optionalString(item.beneficiaries),
        kpis: Array.isArray(item.kpis)
          ? item.kpis.filter((entry: unknown) => typeof entry === 'string')
          : [],
        priority: item.priority,
        // Voting has no durable table or active write endpoint; never expose embedded/demo counts.
        supportVotes: null,
        opposeVotes: null,
      },
    ];
  });
}

function surveyQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((question: any, index: number) => {
    if (
      !question ||
      typeof question.id !== 'string' ||
      typeof question.text !== 'string' ||
      !SURVEY_QUESTION_TYPES.has(question.type)
    ) {
      return [];
    }
    return [
      {
        id: question.id,
        type: question.type,
        text: question.text,
        options: Array.isArray(question.options)
          ? question.options.filter((option: unknown) => typeof option === 'string')
          : undefined,
        isRequired: question.isRequired === true,
        order: finiteNumber(question.order) ?? index,
      },
    ];
  });
}

// ─── AJV SCHEMAS FOR POLITICIAN ROUTES ───

const profilesListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      tier: {
        type: 'string',
        enum: ['aspirant', 'local_leader', 'corporator', 'mla', 'mp', 'minister', 'chief_minister'],
      },
      party: { type: 'string', minLength: 1, maxLength: 50 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        politicians: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              displayName: { type: 'string' },
              stateCode: { type: 'string' },
              party: { type: ['string', 'null'] },
              tier: { type: 'string' },
            },
            required: ['id', 'displayName'],
            additionalProperties: true,
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            tier: { type: 'string' },
            party: { type: 'string' },
          },
        },
      },
      required: ['politicians', 'total'],
      additionalProperties: true,
    },
  },
};

const profileDetailSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        stateCode: { type: 'string' },
        party: { type: ['string', 'null'] },
        tier: { type: 'string' },
      },
      required: ['id', 'displayName'],
      additionalProperties: true,
    },
  },
};

const eventsListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      type: { type: 'string', minLength: 1, maxLength: 50 },
      upcoming: { type: 'string', enum: ['true', 'false', '1', '0'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              stateCode: { type: 'string' },
            },
            required: ['id', 'title', 'startTime', 'endTime'],
            additionalProperties: true,
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            type: { type: 'string' },
            upcoming: { type: 'string' },
          },
        },
      },
      required: ['events', 'total'],
      additionalProperties: true,
    },
  },
};

const rsvpSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        eventId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'eventId', 'message'],
    },
  },
};

const manifestosListSchema = {
  querystring: {
    type: 'object',
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        manifestos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              politicianId: { type: 'string' },
            },
            required: ['id', 'title'],
            additionalProperties: true,
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            politicianId: { type: 'string' },
            state: { type: 'string' },
          },
        },
      },
      required: ['manifestos', 'total'],
      additionalProperties: true,
    },
  },
};

const manifestoVoteSchema = {
  params: {
    type: 'object',
    required: ['manifestoId', 'itemId'],
    properties: {
      manifestoId: { type: 'string', minLength: 1, maxLength: 64 },
      itemId: { type: 'string', minLength: 1, maxLength: 64 },
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
        manifestoId: { type: 'string' },
        itemId: { type: 'string' },
        support: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'manifestoId', 'itemId', 'support', 'message'],
    },
  },
};

const surveysListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string', enum: ['active'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        surveys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
            },
            required: ['id', 'title'],
            additionalProperties: true,
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
      required: ['surveys', 'total'],
      additionalProperties: true,
    },
  },
};

const surveyRespondSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  body: {
    type: 'object',
    required: ['answers'],
    properties: {
      answers: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        surveyId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'surveyId', 'message'],
    },
  },
};

const politicianGrievanceSchema = {
  body: {
    type: 'object',
    required: ['politicianId', 'subject', 'description', 'category'],
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      subject: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', minLength: 1, maxLength: 5000 },
      category: { type: 'string', minLength: 1, maxLength: 50 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        politicianId: { type: 'string' },
        subject: { type: 'string' },
        category: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'politicianId', 'subject', 'category', 'message'],
    },
  },
};

export async function politicianRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/politician/profiles — list politicians on the portal */
  app.get<{
    Querystring: { state?: string; tier?: string; party?: string };
  }>(
    '/api/v1/politician/profiles',
    {
      schema: profilesListSchema,
    },
    async (request, reply) => {
      const { state, tier, party } = request.query;
      if (!isSupabaseConfigured)
        return portalReadError(reply, request, 'politician_portal_profiles');

      try {
        let query: any = supabase
          .from('politician_portal_profiles')
          .select(PROFILE_PUBLIC_COLUMNS)
          .eq('is_active', true);
        if (state) query = query.eq('state_code', state);
        if (tier) query = query.eq('tier', tier);
        if (party) query = query.eq('party', party);

        const { data, error } = await query
          .order('is_verified', { ascending: false })
          .order('display_name', { ascending: true })
          .limit(1000);
        if (error) return portalReadError(reply, request, 'politician_portal_profiles', error);

        const politicians = (Array.isArray(data) ? data : []).map(publicProfile);
        return {
          politicians,
          total: politicians.length,
          filters: { state, tier, party },
        };
      } catch (error) {
        return portalReadError(reply, request, 'politician_portal_profiles', error);
      }
    },
  );

  /** 2. GET /api/v1/politician/profiles/:id — single politician portal profile */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/politician/profiles/:id',
    {
      schema: profileDetailSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!isSupabaseConfigured)
        return portalReadError(reply, request, 'politician_portal_profiles');

      try {
        const { data, error } = await supabase
          .from('politician_portal_profiles')
          .select(PROFILE_PUBLIC_COLUMNS)
          .eq('id', id)
          .eq('is_active', true)
          .maybeSingle();
        if (error) return portalReadError(reply, request, 'politician_portal_profiles', error);
        if (!data) {
          return sendApiError(reply, request, 404, 'Not Found', `Politician ${id} not found`, {
            code: 'NOT_FOUND',
          });
        }
        return publicProfile(data);
      } catch (error) {
        return portalReadError(reply, request, 'politician_portal_profiles', error);
      }
    },
  );

  /** 3. GET /api/v1/politician/events — upcoming political events */
  app.get<{
    Querystring: { state?: string; type?: string; upcoming?: string };
  }>(
    '/api/v1/politician/events',
    {
      schema: eventsListSchema,
    },
    async (request, reply) => {
      const { state, type, upcoming } = request.query;
      if (!isSupabaseConfigured) return portalReadError(reply, request, 'political_events');

      try {
        let query: any = supabase
          .from('political_events')
          .select(
            'id,politician_id,type,status,title,description,venue,address,gps_lat,gps_lng,state_code,district_name,constituency_ac_no,start_time,end_time,expected_attendance,actual_attendance,is_public,rsvp_count,cover_image_url,live_stream_url,media_urls,created_at,updated_at,politician:politician_portal_profiles!inner(display_name,party)',
          )
          .eq('is_public', true);
        if (state) query = query.eq('state_code', state);
        if (type) query = query.eq('type', type);
        if (upcoming === 'true' || upcoming === '1') {
          query = query.gte('start_time', new Date().toISOString()).neq('status', 'cancelled');
        } else if (upcoming === 'false' || upcoming === '0') {
          query = query.lt('start_time', new Date().toISOString());
        }

        const { data, error } = await query.order('start_time', { ascending: true }).limit(1000);
        if (error) return portalReadError(reply, request, 'political_events', error);

        const events = (Array.isArray(data) ? data : []).flatMap((row: any) => {
          const politician = joinedPolitician(row);
          if (
            !politician ||
            typeof row.start_time !== 'string' ||
            typeof row.end_time !== 'string' ||
            !EVENT_TYPES.has(row.type) ||
            !EVENT_STATUSES.has(row.status)
          )
            return [];

          return [
            {
              id: String(row.id),
              politicianId: String(row.politician_id),
              politicianName: String(politician.display_name),
              party: optionalString(politician.party),
              type: row.type,
              status: row.status,
              title: String(row.title),
              description: typeof row.description === 'string' ? row.description : '',
              venue: String(row.venue),
              address: typeof row.address === 'string' ? row.address : '',
              gpsLat: finiteNumber(row.gps_lat) ?? undefined,
              gpsLng: finiteNumber(row.gps_lng) ?? undefined,
              stateCode: String(row.state_code),
              districtName: optionalString(row.district_name),
              constituencyAcNo: finiteNumber(row.constituency_ac_no) ?? undefined,
              startTime: row.start_time,
              endTime: row.end_time,
              expectedAttendance: finiteNumber(row.expected_attendance) ?? undefined,
              actualAttendance: finiteNumber(row.actual_attendance) ?? undefined,
              isPublic: row.is_public === true,
              rsvpCount: finiteNumber(row.rsvp_count),
              coverImageUrl: optionalString(row.cover_image_url),
              liveStreamUrl: optionalString(row.live_stream_url),
              mediaUrls: Array.isArray(row.media_urls)
                ? row.media_urls.filter((url: unknown) => typeof url === 'string')
                : [],
              createdAt: optionalString(row.created_at) ?? '',
              updatedAt: optionalString(row.updated_at) ?? '',
            },
          ];
        });

        return { events, total: events.length, filters: { state, type, upcoming } };
      } catch (error) {
        return portalReadError(reply, request, 'political_events', error);
      }
    },
  );

  /** 4. POST /api/v1/politician/events/:id/rsvp — RSVP to event */
  app.post<{
    Params: { id: string };
  }>(
    '/api/v1/politician/events/:id/rsvp',
    {
      schema: rsvpSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to RSVP',
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
        .from('event_rsvps')
        .upsert(
          { event_id: id, user_id: auth.userId, status: 'going' },
          { onConflict: 'event_id,user_id' },
        );
      if (error) {
        request.log.error({ err: error, eventId: id }, 'Failed to persist event RSVP');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Unable to record RSVP right now',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return { success: true, eventId: id, message: 'RSVP recorded' };
    },
  );

  /** 5. GET /api/v1/politician/manifestos — e-manifestos */
  app.get<{
    Querystring: { politicianId?: string; state?: string };
  }>(
    '/api/v1/politician/manifestos',
    {
      schema: manifestosListSchema,
    },
    async (request, reply) => {
      const { politicianId, state } = request.query;
      if (!isSupabaseConfigured) return portalReadError(reply, request, 'e_manifestos');

      try {
        let query: any = supabase
          .from('e_manifestos')
          .select(
            'id,politician_id,title,preamble,status,items,target_election,state_code,constituency_ac_no,published_at,created_at,updated_at,politician:politician_portal_profiles!inner(display_name,party)',
          )
          .eq('status', 'published');
        if (politicianId) query = query.eq('politician_id', politicianId);
        if (state) query = query.eq('state_code', state);

        const { data, error } = await query.order('published_at', { ascending: false }).limit(1000);
        if (error) return portalReadError(reply, request, 'e_manifestos', error);

        const manifestos = (Array.isArray(data) ? data : []).flatMap((row: any) => {
          const politician = joinedPolitician(row);
          if (!politician || typeof row.title !== 'string') return [];
          return [
            {
              id: String(row.id),
              politicianId: String(row.politician_id),
              politicianName: String(politician.display_name),
              party: optionalString(politician.party),
              title: row.title,
              preamble: typeof row.preamble === 'string' ? row.preamble : '',
              status: 'published',
              items: manifestoItems(row.items),
              targetElection: optionalString(row.target_election),
              stateCode: String(row.state_code),
              constituencyAcNo: finiteNumber(row.constituency_ac_no) ?? undefined,
              publishedAt: optionalString(row.published_at),
              // These counters have no view/endorsement/feedback event writer yet.
              views: null,
              endorsements: null,
              feedbackCount: null,
              createdAt: optionalString(row.created_at) ?? '',
              updatedAt: optionalString(row.updated_at) ?? '',
            },
          ];
        });

        return { manifestos, total: manifestos.length, filters: { politicianId, state } };
      } catch (error) {
        return portalReadError(reply, request, 'e_manifestos', error);
      }
    },
  );

  /** 6. POST /api/v1/politician/manifestos/:manifestoId/items/:itemId/vote — vote on manifesto item (BLOCKED in B4 per CTO directive: no persistence table) */
  app.post<{
    Params: { manifestoId: string; itemId: string };
    Body: { support: boolean };
  }>(
    '/api/v1/politician/manifestos/:manifestoId/items/:itemId/vote',
    {
      schema: manifestoVoteSchema,
    },
    async (request, reply) => {
      return sendApiError(
        reply,
        request,
        501,
        'Not Implemented',
        'Manifesto item voting persistence target is not available in current database schema (Operation 8 blocked in W009-B4)',
        { code: 'PERSISTENCE_TARGET_UNAVAILABLE' },
      );
    },
  );

  /** 7. GET /api/v1/politician/surveys — opinion surveys */
  app.get<{
    Querystring: { state?: string; status?: string };
  }>(
    '/api/v1/politician/surveys',
    {
      schema: surveysListSchema,
    },
    async (request, reply) => {
      const { state, status } = request.query;
      if (!isSupabaseConfigured) return portalReadError(reply, request, 'politician_surveys');

      try {
        const today = new Date().toISOString().slice(0, 10);
        let query: any = supabase
          .from('politician_surveys')
          .select(
            'id,politician_id,title,description,status,target_scope,target_state_code,target_constituency_ac_no,questions,response_count,start_date,end_date,created_at',
          )
          .eq('status', 'active')
          .lte('start_date', today)
          .gte('end_date', today);
        if (state) query = query.eq('target_state_code', state);

        const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);
        if (error) return portalReadError(reply, request, 'politician_surveys', error);

        const surveys = (Array.isArray(data) ? data : []).flatMap((row: any) => {
          if (
            typeof row.title !== 'string' ||
            !['constituency', 'district', 'state'].includes(row.target_scope)
          )
            return [];
          return [
            {
              id: String(row.id),
              politicianId: String(row.politician_id),
              title: row.title,
              description: typeof row.description === 'string' ? row.description : '',
              status: 'active',
              targetScope: row.target_scope,
              targetStateCode: String(row.target_state_code),
              targetConstituencyAcNo: finiteNumber(row.target_constituency_ac_no) ?? undefined,
              questions: surveyQuestions(row.questions),
              responseCount: finiteNumber(row.response_count),
              startDate: String(row.start_date),
              endDate: String(row.end_date),
              // No response aggregation job exists; do not surface a manually seeded results blob.
              results: undefined,
              createdAt: optionalString(row.created_at) ?? '',
            },
          ];
        });

        return { surveys, total: surveys.length, filters: { state, status } };
      } catch (error) {
        return portalReadError(reply, request, 'politician_surveys', error);
      }
    },
  );

  /** 8. POST /api/v1/politician/surveys/:id/respond — submit survey response */
  app.post<{
    Params: { id: string };
    Body: { answers: Record<string, string> };
  }>(
    '/api/v1/politician/surveys/:id/respond',
    {
      schema: surveyRespondSchema,
    },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to respond to survey',
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
      const { answers } = request.body;
      const { error } = await supabase
        .from('survey_responses')
        .upsert(
          { survey_id: id, user_id: auth.userId, answers },
          { onConflict: 'survey_id,user_id' },
        );
      if (error) {
        request.log.error({ err: error, surveyId: id }, 'Failed to persist survey response');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Unable to submit survey response right now',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return { success: true, surveyId: id, message: 'Response submitted' };
    },
  );

  /** 9. POST /api/v1/politician/grievances — file a grievance (BLOCKED in B4 per CTO directive: no persistence table) */
  app.post<{
    Body: {
      politicianId: string;
      subject: string;
      description: string;
      category: string;
    };
  }>(
    '/api/v1/politician/grievances',
    {
      schema: politicianGrievanceSchema,
    },
    async (request, reply) => {
      return sendApiError(
        reply,
        request,
        501,
        'Not Implemented',
        'Politician grievance persistence target is not available in current database schema (Operation 10 blocked in W009-B4)',
        { code: 'PERSISTENCE_TARGET_UNAVAILABLE' },
      );
    },
  );
}
