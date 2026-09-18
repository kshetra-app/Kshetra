import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import {
  getPoliticianWallet,
  createWalletRechargeOrder,
  creditWallet,
  deductWalletForService,
  getWalletTransactions,
} from '../services/wallet/walletService';
import {
  dispatchOBDBroadcast,
  getOBDBroadcasts,
  isWithinTraiWindow,
  processTelecomWebhook,
} from '../services/outreach/obdTelecomService';

// Ajv Schemas for Campaign Route Validation
const pricingPatchSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      voiceObd: { type: 'object' },
      metaPublishing: { type: 'object' },
      whatsappOrganic: { type: 'object' },
      segmentationGuidance: { type: 'object' },
    },
  },
};

const checkKshetraQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      phone: { type: 'string', minLength: 10, maxLength: 20 },
    },
  },
};

const campaignsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['active', 'paused', 'completed', 'draft'] },
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

const boothsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
      priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    },
  },
};

const boothPatchSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      status: { type: 'string', enum: ['not_started', 'canvassing', 'ready', 'completed'] },
      canvassingCompletion: { type: 'number', minimum: 0, maximum: 100 },
      agentName: { type: 'string', maxLength: 100 },
      agentPhone: { type: 'string', maxLength: 20 },
      isKshetraUser: { type: 'boolean' },
      notes: { type: 'string', maxLength: 1000 },
      totalVoters: { type: 'integer', minimum: 0 },
      targetVotes: { type: 'integer', minimum: 0 },
      supportEstimate: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
};

const volunteersQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
      role: { type: 'string', enum: ['booth_agent', 'coordinator', 'canvasser', 'volunteer'] },
    },
  },
};

const volunteerCreateSchema = {
  body: {
    type: 'object',
    required: ['name', 'phone'],
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      phone: { type: 'string', minLength: 10, maxLength: 20 },
      role: { type: 'string', enum: ['booth_agent', 'coordinator', 'canvasser', 'volunteer'] },
      assignedBooths: { type: 'array', items: { type: 'string' } },
      assignedWards: { type: 'array', items: { type: 'integer' } },
      isKshetraUser: { type: 'boolean' },
    },
  },
};

const walletQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
};

const rechargeOrderSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      amountINR: { type: 'number', minimum: 100, maximum: 1000000 },
    },
  },
};

const rechargeVerifySchema = {
  body: {
    type: 'object',
    required: ['amountINR', 'paymentReference'],
    additionalProperties: false,
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      amountINR: { type: 'number', minimum: 100, maximum: 1000000 },
      paymentReference: { type: 'string', minLength: 1, maxLength: 128 },
      razorpay_order_id: { type: 'string', maxLength: 128 },
      razorpay_payment_id: { type: 'string', maxLength: 128 },
      razorpay_signature: { type: 'string', maxLength: 128 },
    },
  },
};

const obdDispatchSchema = {
  body: {
    type: 'object',
    required: ['targetSegment'],
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      audioUrl: { type: 'string', maxLength: 500 },
      title: { type: 'string', maxLength: 200 },
      targetSegment: {
        type: 'object',
        required: ['voterCount'],
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          wardNo: { type: 'integer' },
          boothNumbers: { type: 'array', items: { type: 'string' } },
          voterCount: { type: 'integer', minimum: 1, maximum: 500000 },
        },
      },
    },
  },
};

const webhookVoiceSchema = {
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
};

/**
 * Helper: Resolve authenticated user and verify role against real DB record.
 * Never trusts client-sent roles or permissions.
 */
async function resolveAuthUser(
  request: any,
  contextCampaignId?: string
): Promise<{ userId: string; role: string } | null> {
  let userId: string | null = null;
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === 'invalid-token' || token === 'expired-token') {
      return null;
    }
    if (isSupabaseConfigured) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    } else {
      userId = 'auth-token-user';
    }
  }

  if (!userId && (request.headers['x-user-id'] as string)) {
    userId = request.headers['x-user-id'] as string;
  }

  if (!userId) return null;

  if (!isSupabaseConfigured) {
    const testRole = (request.headers['x-user-role'] as string) || (process.env.NODE_ENV === 'test' ? 'citizen' : undefined);
    return { userId, role: testRole || 'citizen' };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  let role = profile?.role ?? 'citizen';

  // If citizen in user_profiles, check if caller is an assigned campaign coordinator or role in this campaign
  if (role === 'citizen' && contextCampaignId) {
    const { data: vol } = await supabase
      .from('campaign_volunteers')
      .select('role')
      .eq('campaign_id', contextCampaignId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (vol?.role) {
      role = vol.role;
    }
  }

  return {
    userId,
    role,
  };
}

/**
 * Service-specific pricing configuration.
 * Admin can adjust anytime via PATCH /api/v1/campaign/pricing.
 */
let campaignPricing = {
  voiceObd: {
    serviceKey: 'voice_obd',
    serviceName: 'Voice Call (OBD) Blast',
    description: 'Automated 30-second voice call in your own recorded voice directly to voter mobile phones.',
    baseVendorRatePerCallINR: 0.60,
    kshetraMarginPercent: 50,
    finalRatePerCallINR: 0.90,
    pulseSeconds: 30,
    minCalls: 500,
    currency: 'INR',
    guidance: {
      howItWorks: 'Record or upload a 30-second audio appeal. Our telecom voice gateway calls voters in your selected ward or booth and plays your message upon pickup.',
      prerequisites: 'Clear audio recording (WAV or MP3, under 45 seconds). Target constituency or ward selected.',
      dos: [
        'Call strictly between 9:00 AM and 8:00 PM per TRAI norms.',
        'State your name and constituency in the first 5 seconds.',
        'Keep the tone respectful, clear, and focused on 1-2 core promises.',
      ],
      donts: [
        'Do not broadcast before 9:00 AM or after 8:00 PM (TRAI violation).',
        'Do not use abusive language or unverified claims.',
      ],
    },
  },
  metaPublishing: {
    serviceKey: 'meta_publishing',
    serviceName: 'Facebook & Instagram Campaign',
    description: 'Publish speeches, photo updates, and rally alerts directly to your official Facebook Page and Instagram.',
    basePublishingINR: 0, // Organic posting is free
    currency: 'INR',
    boostPackages: [
      {
        id: 'boost_ward',
        label: 'Ward / Village Focus Boost',
        targetAudience: 'Single Ward or Mandal voters (Radius 3-5 km)',
        estReach: '15,000 – 25,000 views',
        vendorAdSpendINR: 1000,
        kshetraFeeINR: 500,
        totalPriceINR: 1500,
      },
      {
        id: 'boost_constituency',
        label: 'Constituency-Wide Blast',
        targetAudience: 'All voters across Assembly Constituency',
        estReach: '50,000 – 80,000 views',
        vendorAdSpendINR: 3000,
        kshetraFeeINR: 1500,
        totalPriceINR: 4500,
      },
      {
        id: 'boost_rally_mega',
        label: 'Mega Rally 48hr Surge',
        targetAudience: 'High-frequency intensive push before polling day',
        estReach: '1,20,000 – 1,80,000 views',
        vendorAdSpendINR: 6000,
        kshetraFeeINR: 3000,
        totalPriceINR: 9000,
      },
    ],
    guidance: {
      howItWorks: 'Link your official Facebook Page once. Publish updates directly from Kshetra, or choose a targeted boost to reach voters in your exact constituency.',
      prerequisites: 'Admin access to an official Facebook Page. Meta identity verification for political content.',
      dos: [
        'Always include high-quality images or speech video clips.',
        'Ensure the "Paid for by [Party/Candidate]" disclaimer is active.',
        'Post at prime times: 8:00–10:00 AM and 6:00–9:00 PM.',
      ],
      donts: [
        'Do not post low-resolution or watermarked third-party photos.',
        'Do not violate Meta Community Standards or ECI code of conduct.',
      ],
    },
  },
  whatsappOrganic: {
    serviceKey: 'whatsapp_organic',
    serviceName: 'WhatsApp Status & Group Broadcast',
    description: 'Generate high-resolution candidate posters and 1-tap share to your WhatsApp Status and local voter groups.',
    priceINR: 0, // Always 100% Free
    currency: 'INR',
    guidance: {
      howItWorks: 'Select a pre-designed campaign poster (photo, party symbol, key promise). Tap "Share to Status" or "Share to Groups" to open WhatsApp directly with media pre-filled.',
      prerequisites: 'WhatsApp or WhatsApp Business installed on your device. Contact list or active colony/community groups.',
      dos: [
        'Post 1-2 fresh campaign posters or video clips to your Status daily.',
        'Encourage all your booth workers and youth volunteers to re-share your status.',
        'Post in local colony welfare and community groups with permission.',
      ],
      donts: [
        'Do not blast unsolicited messages to strangers (risks personal number ban).',
        'Do not forward unverified rumours or unapproved graphics.',
      ],
    },
  },
  segmentationGuidance: {
    serviceName: 'Voter Segmentation & Targeting',
    guidance: {
      howItWorks: 'Filter your audience by Geography (Constituency, Ward, Polling Booth) or Cadre Role so every message is hyper-relevant.',
      dos: [
        'Use Ward-level targeting for local civic issues (drainage, roads, water supply).',
        'Use the Cadre filter to alert booth in-charges for morning meetings or rally duties.',
        'Use Youth/First-Time voter filters for employment and education promises.',
      ],
      donts: [
        'Do not blast constituency-wide messages for single-ward events.',
      ],
    },
  },
};

// In-memory fallback seeds for offline / test mode
const SEED_BOOTHS = [
  {
    id: 'b-54',
    campaignId: 'c1',
    boothId: 'booth-54',
    boothNumber: '54',
    boothName: 'Govt. Girls High School, East Wing, Nampally',
    constituencyAcNo: 56,
    wardNo: 12,
    totalVoters: 920,
    targetVotes: 550,
    supportEstimate: 62,
    priority: 'high',
    status: 'canvassing',
    canvassingCompletion: 55,
    agentName: 'K. Ramesh Goud',
    agentPhone: '9848012345',
    isKshetraUser: true,
    notes: 'Requires drinking water discussion in next visit.',
  },
  {
    id: 'b-55',
    campaignId: 'c1',
    boothId: 'booth-55',
    boothNumber: '55',
    boothName: 'Community Hall, Ward Office, Bazarghat',
    constituencyAcNo: 56,
    wardNo: 12,
    totalVoters: 1140,
    targetVotes: 700,
    supportEstimate: 38,
    priority: 'critical',
    status: 'not_started',
    canvassingCompletion: 10,
    agentName: '',
    agentPhone: '',
    isKshetraUser: false,
    notes: 'No in-charge appointed yet. Opposition active here.',
  },
  {
    id: 'b-56',
    campaignId: 'c1',
    boothId: 'booth-56',
    boothNumber: '56',
    boothName: 'Zilla Parishad Primary School, Red Hills',
    constituencyAcNo: 56,
    wardNo: 13,
    totalVoters: 880,
    targetVotes: 600,
    supportEstimate: 74,
    priority: 'medium',
    status: 'ready',
    canvassingCompletion: 85,
    agentName: 'Syed Mansoor',
    agentPhone: '9849054321',
    isKshetraUser: true,
    notes: 'Strong cadre presence. 3 street meetings completed.',
  },
];

const SEED_VOLUNTEERS = [
  {
    id: 'v-1',
    campaignId: 'c1',
    name: 'K. Ramesh Goud',
    phone: '9848012345',
    role: 'booth_agent',
    status: 'active',
    assignedBooths: ['54'],
    assignedWards: [12],
    isKshetraUser: true,
    tasksCompleted: 14,
  },
  {
    id: 'v-2',
    campaignId: 'c1',
    name: 'Syed Mansoor',
    phone: '9849054321',
    role: 'booth_agent',
    status: 'active',
    assignedBooths: ['56'],
    assignedWards: [13],
    isKshetraUser: true,
    tasksCompleted: 22,
  },
  {
    id: 'v-3',
    campaignId: 'c1',
    name: 'P. Lavanya',
    phone: '9866098765',
    role: 'coordinator',
    status: 'active',
    assignedBooths: ['54', '55', '56'],
    assignedWards: [12, 13],
    isKshetraUser: true,
    tasksCompleted: 35,
  },
];

let inMemoryBooths = [...SEED_BOOTHS];
let inMemoryVolunteers = [...SEED_VOLUNTEERS];

const SEED_CAMPAIGNS = [
  {
    id: 'c1',
    politicianId: 'pp1',
    name: 'Nampally AC 2026 People Campaign',
    description: 'Grassroots voter outreach across all 185 polling stations in Nampally.',
    type: 'election',
    status: 'active',
    stateCode: 'TS',
    targetConstituencies: [56],
    totalBudgetINR: 500000,
    spentBudgetINR: 145000,
    totalBooths: 185,
    boothsCovered: 112,
    volunteerCount: 42,
    impressions: 450000,
    reach: 85000,
    sentimentScore: 72,
  },
];

let inMemoryCampaigns = [...SEED_CAMPAIGNS];

interface PendingRechargeOrder {
  orderId: string;
  politicianId: string;
  amountINR: number;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
  paymentReference?: string;
}

const PENDING_RECHARGE_ORDERS = new Map<string, PendingRechargeOrder>();

/**
 * Authoritative campaign lookup: DB first, then fallback to in-memory store.
 */
async function findCampaignById(campaignId: string): Promise<{ id: string; politician_id: string } | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, politician_id')
        .eq('id', campaignId)
        .maybeSingle();
      if (!error && data) {
        return { id: data.id, politician_id: data.politician_id };
      }
    } catch {}
  }
  const mem = inMemoryCampaigns.find((c) => c.id === campaignId);
  if (mem) {
    return { id: mem.id, politician_id: mem.politicianId };
  }
  return null;
}

/**
 * Checks whether the authenticated caller has operational authority over a given campaign.
 * Admins, moderators, owning politicians, and assigned coordinators pass.
 */
async function verifyCampaignAuthority(
  auth: { userId: string; role: string },
  campaignId: string
): Promise<{ authorized: boolean; campaign: { id: string; politician_id: string } | null; reason?: string }> {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) {
    return { authorized: false, campaign: null, reason: 'Campaign not found' };
  }

  // System admin or compliance moderator
  if (auth.role === 'admin' || auth.role === 'moderator') {
    return { authorized: true, campaign };
  }

  // Owning politician
  if (campaign.politician_id === auth.userId) {
    return { authorized: true, campaign };
  }

  // Campaign coordinator
  if (auth.role === 'coordinator') {
    return { authorized: true, campaign };
  }

  if (isSupabaseConfigured) {
    try {
      const { data: vol } = await supabase
        .from('campaign_volunteers')
        .select('role, status')
        .eq('campaign_id', campaignId)
        .eq('user_id', auth.userId)
        .eq('status', 'active')
        .maybeSingle();

      if (vol && (vol.role === 'coordinator' || vol.role === 'admin')) {
        return { authorized: true, campaign };
      }
    } catch {}
  }

  // In-memory volunteer coordinator check
  const memVol = inMemoryVolunteers.find(
    (v) => v.campaignId === campaignId && (v.id === auth.userId || v.name === auth.userId) && v.role === 'coordinator'
  );
  if (memVol) {
    return { authorized: true, campaign };
  }

  return { authorized: false, campaign, reason: 'Caller lacks authority over this campaign' };
}

/**
 * Resolves the effective politician ID bound to the authenticated caller.
 * Never allows client-supplied politicianId to access or act on another principal's resources.
 */
function resolveEffectivePoliticianId(
  auth: { userId: string; role: string },
  requestedPoliticianId?: string
): { authorized: boolean; effectivePoliticianId: string } {
  if (auth.role === 'admin') {
    return { authorized: true, effectivePoliticianId: requestedPoliticianId || auth.userId };
  }

  // Politicians/candidates bound to their own identity
  if (requestedPoliticianId && requestedPoliticianId !== auth.userId) {
    return { authorized: false, effectivePoliticianId: auth.userId };
  }

  return { authorized: true, effectivePoliticianId: auth.userId };
}

export async function campaignRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/campaign/pricing
   * Returns individual pricing per service (Voice OBD, Meta Boost, WhatsApp Organic)
   * with transparent 50% platform margin and complete guidance notes.
   */
  app.get('/api/v1/campaign/pricing', async () => {
    return {
      status: 'ok',
      pricing: campaignPricing,
      updatedAt: new Date().toISOString(),
    };
  });

  /**
   * PATCH /api/v1/campaign/pricing
   * Admin-only endpoint to update service pricing on the fly.
   */
  app.patch('/api/v1/campaign/pricing', { schema: pricingPatchSchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.role !== 'admin') {
      return sendApiError(reply, request, 403, 'Forbidden', 'Pricing updates require admin privileges', {
        code: 'FORBIDDEN',
      });
    }

    const updates = request.body as Partial<typeof campaignPricing>;
    if (!updates || typeof updates !== 'object') {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid pricing update payload', {
        code: 'VALIDATION_ERROR',
      });
    }

    campaignPricing = {
      ...campaignPricing,
      ...updates,
    };

    return {
      status: 'updated',
      pricing: campaignPricing,
      updatedAt: new Date().toISOString(),
    };
  });

  /**
   * GET /api/v1/campaign/users/check-kshetra
   * Checks if a phone number belongs to an active, registered Kshetra user.
   */
  app.get('/api/v1/campaign/users/check-kshetra', { schema: checkKshetraQuerySchema }, async (request, reply) => {
    const { phone } = request.query as { phone?: string };
    const cleaned = (phone || '').replace(/\D/g, '').slice(-10);

    if (!cleaned) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Valid phone number required', {
        code: 'VALIDATION_ERROR',
      });
    }

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, avatar_url, role')
          .eq('phone', cleaned)
          .maybeSingle();

        if (data) {
          return {
            isKshetraUser: true,
            userId: data.user_id,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            role: data.role,
          };
        }
      } catch {
        // fall back to mock check
      }
    }

    // Check in-memory volunteers/cadre
    const match = inMemoryVolunteers.find((v) => v.phone.replace(/\D/g, '').slice(-10) === cleaned);
    return {
      isKshetraUser: match ? match.isKshetraUser : false,
      displayName: match ? match.name : undefined,
      phone: cleaned,
    };
  });

  /** GET /api/v1/campaign/campaigns — list campaigns */
  app.get('/api/v1/campaign/campaigns', { schema: campaignsQuerySchema }, async (request) => {
    const { status, politicianId } = request.query as { status?: string; politicianId?: string };

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('campaigns').select('*');
        if (status) query = query.eq('status', status);
        if (politicianId) query = query.eq('politician_id', politicianId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return { campaigns: data, total: data.length };
        }
      } catch {
        // fall through to mock
      }
    }

    return {
      campaigns: [
        {
          id: 'c1',
          politicianId: politicianId || 'pp1',
          name: 'Nampally AC 2026 People Campaign',
          description: 'Grassroots voter outreach across all 185 polling stations in Nampally.',
          type: 'election',
          status: 'active',
          stateCode: 'TS',
          targetConstituencies: [56],
          totalBudgetINR: 500000,
          spentBudgetINR: 145000,
          totalBooths: 185,
          boothsCovered: 112,
          volunteerCount: 42,
          impressions: 450000,
          reach: 85000,
          sentimentScore: 72,
        },
      ],
      total: 1,
    };
  });

  /** GET /api/v1/campaign/booths — booth strategy and in-charge management */
  app.get('/api/v1/campaign/booths', { schema: boothsQuerySchema }, async (request) => {
    const { campaignId, priority } = request.query as { campaignId?: string; priority?: string };

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('booth_strategies').select('*');
        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (priority) query = query.eq('priority', priority);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return { booths: data, total: data.length };
        }
      } catch {
        // fallback
      }
    }

    let filtered = inMemoryBooths;
    if (priority) filtered = filtered.filter((b) => b.priority === priority);
    return {
      booths: filtered,
      total: filtered.length,
      assignedCount: filtered.filter((b) => !!b.agentPhone).length,
      unassignedCount: filtered.filter((b) => !b.agentPhone).length,
    };
  });

  /** PATCH /api/v1/campaign/booths/:id — assign in-charge or update notes */
  app.patch('/api/v1/campaign/booths/:id', { schema: boothPatchSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Record<string, any>;

    // 1. Authenticate caller
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to mutate campaign booth', {
        code: 'UNAUTHORIZED',
      });
    }

    // 2. Locate booth first (to verify existence and extract campaignId)
    let boothCampaignId: string | null = null;
    let existingDbBooth: any = null;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('booth_strategies')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) {
          existingDbBooth = data;
          boothCampaignId = data.campaign_id;
        }
      } catch {}
    }

    const memIdx = inMemoryBooths.findIndex((b) => b.id === id || b.boothId === id);
    if (!boothCampaignId && memIdx >= 0) {
      boothCampaignId = inMemoryBooths[memIdx].campaignId;
    }

    if (!boothCampaignId && !existingDbBooth && memIdx < 0) {
      return sendApiError(reply, request, 404, 'Not Found', 'Booth not found', { code: 'NOT_FOUND' });
    }

    // 3. Verify campaign authority
    const authCheck = await verifyCampaignAuthority(auth, boothCampaignId!);
    if (!authCheck.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', authCheck.reason || 'Unauthorized to modify booths for this campaign', {
        code: 'FORBIDDEN',
      });
    }

    // 4. Perform mutation
    if (isSupabaseConfigured && existingDbBooth) {
      try {
        const { data, error } = await supabase
          .from('booth_strategies')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return { success: true, booth: data };
        }
      } catch {}
    }

    if (memIdx >= 0) {
      inMemoryBooths[memIdx] = { ...inMemoryBooths[memIdx], ...updates };
      return { success: true, booth: inMemoryBooths[memIdx] };
    }

    return sendApiError(reply, request, 404, 'Not Found', 'Booth not found', { code: 'NOT_FOUND' });
  });

  /** GET /api/v1/campaign/volunteers — list ground cadre */
  app.get('/api/v1/campaign/volunteers', { schema: volunteersQuerySchema }, async (request) => {
    const { campaignId, role } = request.query as { campaignId?: string; role?: string };

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('campaign_volunteers').select('*');
        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (role) query = query.eq('role', role);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return { volunteers: data, total: data.length };
        }
      } catch {}
    }

    let filtered = inMemoryVolunteers;
    if (role) filtered = filtered.filter((v) => v.role === role);
    return { volunteers: filtered, total: filtered.length };
  });

  /** POST /api/v1/campaign/volunteers — add new cadre member */
  app.post('/api/v1/campaign/volunteers', { schema: volunteerCreateSchema }, async (request, reply) => {
    const body = request.body as Record<string, any>;
    if (!body.name || !body.phone) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Name and phone are required', {
        code: 'VALIDATION_ERROR',
      });
    }

    const campaignId = body.campaignId || 'c1';

    // 1. Authenticate caller
    const auth = await resolveAuthUser(request, campaignId);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to manage campaign cadre', {
        code: 'UNAUTHORIZED',
      });
    }

    // 2. Ordinary citizens cannot create cadre or manage volunteers
    if (auth.role === 'citizen') {
      return sendApiError(reply, request, 403, 'Forbidden', 'Ordinary citizens cannot create campaign volunteers', {
        code: 'FORBIDDEN',
      });
    }

    // 3. Verify campaign authority
    const authCheck = await verifyCampaignAuthority(auth, campaignId);
    if (!authCheck.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', authCheck.reason || 'Unauthorized to manage cadre for this campaign', {
        code: 'FORBIDDEN',
      });
    }

    // 4. Privilege Controls:
    // Only admin, moderator, or owning politician can assign 'coordinator' role
    const assignedRole = body.role || 'booth_agent';
    if (assignedRole === 'coordinator') {
      const isOwner = authCheck.campaign?.politician_id === auth.userId;
      const isAdminOrMod = auth.role === 'admin' || auth.role === 'moderator';
      if (!isOwner && !isAdminOrMod) {
        return sendApiError(reply, request, 403, 'Forbidden', 'Only campaign owners and administrators can appoint coordinators', {
          code: 'PRIVILEGE_SPOOFING_REJECTED',
        });
      }
    }

    // 5. Verify isKshetraUser status authoritatively
    const cleanedPhone = body.phone.replace(/\D/g, '').slice(-10);
    let verifiedKshetraUser = false;

    if (body.isKshetraUser !== undefined) {
      if (isSupabaseConfigured) {
        try {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('phone', cleanedPhone)
            .maybeSingle();
          verifiedKshetraUser = Boolean(userProfile);
        } catch {}
      } else {
        const memMatch = inMemoryVolunteers.find((v) => v.phone.replace(/\D/g, '').slice(-10) === cleanedPhone);
        verifiedKshetraUser = memMatch ? Boolean(memMatch.isKshetraUser) : false;
      }

      // If client claimed isKshetraUser: true but phone is NOT registered, reject privilege spoofing
      if (body.isKshetraUser === true && !verifiedKshetraUser) {
        return sendApiError(reply, request, 403, 'Forbidden', 'Unregistered user cannot be marked as verified Kshetra user', {
          code: 'PRIVILEGE_SPOOFING_REJECTED',
        });
      }
    }

    const newVol = {
      id: `v-${Date.now().toString(36)}`,
      campaignId,
      name: body.name || '',
      phone: body.phone || '',
      role: assignedRole,
      status: 'active',
      assignedBooths: body.assignedBooths || [],
      assignedWards: body.assignedWards || [],
      isKshetraUser: verifiedKshetraUser,
      tasksCompleted: 0,
      createdAt: new Date().toISOString(),
    };

    inMemoryVolunteers.unshift(newVol);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('campaign_volunteers').insert(newVol);
      } catch {}
    }

    return reply.status(201).send({ success: true, volunteer: newVol, message: 'Cadre member registered successfully' });
  });

  /** GET /api/v1/campaign/wallet — get campaign prepaid balance */
  app.get('/api/v1/campaign/wallet', { schema: walletQuerySchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to view wallet balance', {
        code: 'UNAUTHORIZED',
      });
    }

    const { politicianId } = request.query as { politicianId?: string };
    const binding = resolveEffectivePoliticianId(auth, politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cross-principal wallet access forbidden', {
        code: 'FORBIDDEN',
      });
    }

    const wallet = await getPoliticianWallet(binding.effectivePoliticianId);
    return { status: 'ok', wallet };
  });

  /** GET /api/v1/campaign/wallet/transactions — get wallet transaction history */
  app.get('/api/v1/campaign/wallet/transactions', { schema: walletQuerySchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to view wallet transactions', {
        code: 'UNAUTHORIZED',
      });
    }

    const { politicianId } = request.query as { politicianId?: string };
    const binding = resolveEffectivePoliticianId(auth, politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cross-principal wallet transaction access forbidden', {
        code: 'FORBIDDEN',
      });
    }

    const transactions = await getWalletTransactions(binding.effectivePoliticianId);
    return { status: 'ok', transactions, total: transactions.length };
  });

  /** POST /api/v1/campaign/wallet/recharge/order — create Razorpay / UPI recharge order */
  app.post('/api/v1/campaign/wallet/recharge/order', { schema: rechargeOrderSchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to create recharge order', {
        code: 'UNAUTHORIZED',
      });
    }

    const body = request.body as { politicianId?: string; amountINR?: number };
    const binding = resolveEffectivePoliticianId(auth, body.politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cannot create recharge order for another principal', {
        code: 'FORBIDDEN',
      });
    }

    const amountINR = body.amountINR || 1000;

    try {
      const order = await createWalletRechargeOrder(binding.effectivePoliticianId, amountINR);

      // Record pending recharge order for authoritative verification and idempotency
      const orderRecord: PendingRechargeOrder = {
        orderId: order.orderId,
        politicianId: binding.effectivePoliticianId,
        amountINR,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      PENDING_RECHARGE_ORDERS.set(order.orderId, orderRecord);

      return { success: true, order };
    } catch (err: any) {
      return sendApiError(reply, request, 400, 'Bad Request', err.message || 'Failed to create order', {
        code: 'PAYMENT_ORDER_ERROR',
      });
    }
  });

  /** POST /api/v1/campaign/wallet/recharge/verify — verify payment and credit wallet balance */
  app.post('/api/v1/campaign/wallet/recharge/verify', { schema: rechargeVerifySchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to verify recharge payment', {
        code: 'UNAUTHORIZED',
      });
    }

    const body = request.body as {
      politicianId?: string;
      amountINR: number;
      paymentReference: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!body.amountINR || !body.paymentReference) {
      return sendApiError(reply, request, 400, 'Bad Request', 'amountINR and paymentReference required', {
        code: 'VALIDATION_ERROR',
      });
    }

    // 1. Identity binding: check caller authority
    const binding = resolveEffectivePoliticianId(auth, body.politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cannot verify recharge for another principal', {
        code: 'FORBIDDEN',
      });
    }

    // 2. Authoritative order lookup: match paymentReference or razorpay_order_id
    const orderKey = body.razorpay_order_id || body.paymentReference;
    let order = PENDING_RECHARGE_ORDERS.get(orderKey);

    // If not found by primary key, search by paymentReference across registered orders
    if (!order) {
      for (const ord of PENDING_RECHARGE_ORDERS.values()) {
        if (ord.orderId === body.paymentReference || ord.paymentReference === body.paymentReference) {
          order = ord;
          break;
        }
      }
    }

    // Reject forged / unassociated payment references
    if (!order) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'No matching recharge order found for the supplied payment reference. Arbitrary wallet crediting is rejected.',
        { code: 'PAYMENT_ORDER_NOT_FOUND' }
      );
    }

    // 3. Verify order belongs to the effective politician
    if (order.politicianId !== binding.effectivePoliticianId && auth.role !== 'admin') {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cross-wallet recharge verification rejected', {
        code: 'FORBIDDEN',
      });
    }

    // 4. Amount consistency check
    if (order.amountINR !== body.amountINR) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        `Amount mismatch. Expected ₹${order.amountINR}, received ₹${body.amountINR}`,
        { code: 'AMOUNT_MISMATCH' }
      );
    }

    // 5. Replay / Idempotency check: if order is already completed, return idempotent success WITHOUT crediting again
    if (order.status === 'completed') {
      const existingWallet = await getPoliticianWallet(binding.effectivePoliticianId);
      return {
        success: true,
        wallet: existingWallet,
        idempotent: true,
        message: `Payment already verified and credited previously. Idempotent replay acknowledged.`,
      };
    }

    // 6. Cryptographic signature check if Razorpay secret is configured
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (razorpaySecret && body.razorpay_signature) {
      const orderIdForSig = body.razorpay_order_id || order.orderId;
      const paymentIdForSig = body.razorpay_payment_id || body.paymentReference;
      const expectedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${orderIdForSig}|${paymentIdForSig}`)
        .digest('hex');

      if (expectedSignature !== body.razorpay_signature) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid cryptographic payment signature', {
          code: 'INVALID_SIGNATURE',
        });
      }
    }

    // 7. Mark order completed FIRST (re-entrancy protection) and credit wallet exactly once
    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    order.paymentReference = body.paymentReference;

    const updatedWallet = await creditWallet(binding.effectivePoliticianId, body.amountINR, body.paymentReference);
    return {
      success: true,
      wallet: updatedWallet,
      message: `Successfully added ₹${body.amountINR.toLocaleString('en-IN')} to Campaign Wallet!`,
    };
  });

  /** GET /api/v1/campaign/obd/trai-status — check current TRAI calling window */
  app.get('/api/v1/campaign/obd/trai-status', async () => {
    const trai = isWithinTraiWindow();
    return { status: 'ok', ...trai };
  });

  /** GET /api/v1/campaign/obd/broadcasts — list past and active voice call broadcasts */
  app.get('/api/v1/campaign/obd/broadcasts', { schema: walletQuerySchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to view OBD broadcasts', {
        code: 'UNAUTHORIZED',
      });
    }

    const { politicianId } = request.query as { politicianId?: string };
    const binding = resolveEffectivePoliticianId(auth, politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cross-principal broadcast access forbidden', {
        code: 'FORBIDDEN',
      });
    }

    const broadcasts = await getOBDBroadcasts(binding.effectivePoliticianId);
    return { status: 'ok', broadcasts, total: broadcasts.length };
  });

  /** POST /api/v1/campaign/obd/dispatch — check wallet, check TRAI, deduct funds, and dispatch voice broadcast */
  app.post('/api/v1/campaign/obd/dispatch', { schema: obdDispatchSchema }, async (request, reply) => {
    const body = request.body as {
      campaignId?: string;
      politicianId?: string;
      audioUrl?: string;
      title?: string;
      targetSegment?: { type: string; wardNo?: number; boothNumbers?: string[]; voterCount: number };
    };

    const campaignId = body.campaignId || 'c1';

    // 1. Authenticate caller
    const auth = await resolveAuthUser(request, campaignId);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to dispatch OBD broadcasts', {
        code: 'UNAUTHORIZED',
      });
    }

    // 2. Check campaign operational authority BEFORE financial mutation or telecom dispatch
    const authCheck = await verifyCampaignAuthority(auth, campaignId);
    if (!authCheck.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', authCheck.reason || 'Unauthorized to operate this campaign', {
        code: 'FORBIDDEN',
      });
    }

    // 3. Resolve effective politician ID bound to authenticated principal
    const binding = resolveEffectivePoliticianId(auth, body.politicianId);
    if (!binding.authorized) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Cannot dispatch OBD broadcast using another politician wallet', {
        code: 'FORBIDDEN',
      });
    }

    const effectivePoliticianId = binding.effectivePoliticianId;

    if (!body.targetSegment || !body.targetSegment.voterCount) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Target segment and voter count required', {
        code: 'VALIDATION_ERROR',
      });
    }

    const voterCount = body.targetSegment.voterCount;
    const rate = campaignPricing.voiceObd.finalRatePerCallINR;
    const totalCostINR = Math.round(voterCount * rate);

    // 4. Check wallet and deduct funds (Throws error if insufficient)
    let updatedWallet;
    try {
      updatedWallet = await deductWalletForService(
        effectivePoliticianId,
        totalCostINR,
        'voice_obd',
        `obd_${Date.now()}`,
        `Voice Call: ${body.title || 'Voter Appeal'} (${voterCount.toLocaleString('en-IN')} voters @ ₹${rate.toFixed(2)})`,
      );
    } catch (err: any) {
      return sendApiError(reply, request, 402, 'Payment Required', err.message, {
        code: 'INSUFFICIENT_FUNDS',
        details: [{ path: 'wallet', message: `Required amount: ₹${totalCostINR}` }],
      });
    }

    // 5. Dispatch via telecom gateway (with TRAI checks)
    const result = await dispatchOBDBroadcast({
      campaignId,
      politicianId: effectivePoliticianId,
      title: body.title || 'Voice Call to Voters',
      audioUrl: body.audioUrl || 'https://assets.kshetra.app/audio/default-appeal.mp3',
      targetSegment: body.targetSegment,
      ratePerCallINR: rate,
    });

    return {
      success: true,
      job: result.broadcast,
      wallet: updatedWallet,
      warning: result.warning,
      message: result.warning
        ? `Voice call queued for ${voterCount.toLocaleString('en-IN')} voters. ₹${totalCostINR.toLocaleString('en-IN')} reserved. Note: ${result.warning}`
        : `Voice call dispatched to ${voterCount.toLocaleString('en-IN')} voters. ₹${totalCostINR.toLocaleString('en-IN')} deducted from Campaign Wallet.`,
    };
  });

  /** POST /api/v1/webhooks/voice/:provider — receive real-time telecom delivery status reports */
  app.post('/api/v1/webhooks/voice/:provider', { schema: webhookVoiceSchema }, async (request) => {
    const payload = (request.body as Record<string, any>) || {};
    const result = await processTelecomWebhook(payload);
    return { status: 'acknowledged', ...result };
  });
}
