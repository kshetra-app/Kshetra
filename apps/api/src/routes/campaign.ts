import { isIsolatedTestRuntime, isProductionLikeRuntime } from '../lib/runtimeEnvironment';
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
import { PaymentProviderError, RazorpayProvider } from '../providers/razorpayProvider';
import { TelecomProvider } from '../providers/telecomProvider';
import type { PaymentProvider, VoiceObdProvider } from '../providers/types';

function isProductionRuntime(): boolean { return isProductionLikeRuntime(); }

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

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
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
};

const campaignsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['draft', 'planned', 'active', 'paused', 'completed', 'cancelled'] },
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

const campaignCreateSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'type', 'stateCode', 'startDate', 'endDate'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120 },
      description: { type: 'string', maxLength: 2000 },
      type: { type: 'string', enum: ['election', 'awareness', 'fundraising', 'outreach', 'issue_advocacy', 'brand_building', 'get_out_vote'] },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      totalBudgetINR: { type: 'number', minimum: 0, maximum: 1000000000000 },
      targetConstituencies: { type: 'array', maxItems: 1000, items: { type: 'integer', minimum: 1 } },
      targetDistricts: { type: 'array', maxItems: 1000, items: { type: 'string', minLength: 1, maxLength: 100 } },
    },
  },
};

const campaignAdsQuerySchema = {
  querystring: {
    type: 'object',
    required: ['campaignId'],
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
};

const campaignAdDraftSchema = {
  body: {
    type: 'object',
    required: ['campaignId', 'format', 'name', 'headline', 'paidForBy', 'disclosureText'],
    additionalProperties: false,
    properties: {
      campaignId: { type: 'string', minLength: 1, maxLength: 64 },
      format: { type: 'string', enum: ['promoted_post', 'banner', 'video_ad', 'carousel', 'native_story', 'constituency_spotlight', 'push_notification', 'sms_blast', 'whatsapp_broadcast'] },
      name: { type: 'string', minLength: 1, maxLength: 120 },
      headline: { type: 'string', minLength: 1, maxLength: 300 },
      body: { type: 'string', maxLength: 4000 },
      callToAction: { type: 'string', maxLength: 80 },
      mediaUrls: { type: 'array', maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 2048 } },
      thumbnailUrl: { type: 'string', maxLength: 2048 },
      landingUrl: { type: 'string', maxLength: 2048 },
      paidForBy: { type: 'string', minLength: 1, maxLength: 200 },
      disclosureText: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
};

const CAMPAIGN_AD_DRAFT_COLUMNS = [
  'id', 'campaign_id', 'format', 'status', 'name', 'headline', 'body',
  'call_to_action', 'media_urls', 'thumbnail_url', 'landing_url',
  'disclosure_text', 'paid_for_by', 'eci_disclosure_id', 'is_eci_compliant',
  'review_note', 'created_at', 'updated_at',
].join(',');

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
      status: { type: 'string', enum: ['not_started', 'canvassing', 'ready', 'polling_day', 'counted'] },
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
      role: { type: 'string', enum: ['canvasser', 'booth_agent', 'social_media', 'logistics', 'data_entry', 'coordinator', 'driver', 'caller'] },
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
      role: { type: 'string', enum: ['canvasser', 'booth_agent', 'social_media', 'logistics', 'data_entry', 'coordinator', 'driver', 'caller'] },
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
  contextCampaignId?: string,
): Promise<{ userId: string; role: string } | null> {
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

  if (!isProductionRuntime() && !userId && (request.headers['x-user-id'] as string)) {
    userId = request.headers['x-user-id'] as string;
  }

  if (!userId) return null;

  if (!isSupabaseConfigured) {
    if (isProductionRuntime()) return null;
    const testRole =
      (request.headers['x-user-role'] as string) ||
      (isIsolatedTestRuntime() ? 'citizen' : undefined);
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
    description:
      'Automated 30-second voice call in your own recorded voice directly to voter mobile phones.',
    baseVendorRatePerCallINR: 0.6,
    kshetraMarginPercent: 50,
    finalRatePerCallINR: 0.9,
    pulseSeconds: 30,
    minCalls: 500,
    currency: 'INR',
    guidance: {
      howItWorks:
        'Record or upload a 30-second audio appeal. Our telecom voice gateway calls voters in your selected ward or booth and plays your message upon pickup.',
      prerequisites:
        'Clear audio recording (WAV or MP3, under 45 seconds). Target constituency or ward selected.',
      dos: [
        'Use the configured 9:00 AM to 8:00 PM IST dispatch window. Verify current legal and provider requirements before enabling production delivery.',
        'State your name and constituency in the first 5 seconds.',
        'Keep the tone respectful, clear, and focused on 1-2 core promises.',
      ],
      donts: [
        'Do not dispatch outside the configured 9:00 AM to 8:00 PM IST product window.',
        'Do not use abusive language or unverified claims.',
      ],
    },
  },
  metaPublishing: {
    serviceKey: 'meta_publishing',
    serviceName: 'Facebook & Instagram Campaign',
    description:
      'Publish speeches, photo updates, and rally alerts directly to your official Facebook Page and Instagram.',
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
      howItWorks:
        'Link your official Facebook Page once. Publish updates directly from Kshetra, or choose a targeted boost to reach voters in your exact constituency.',
      prerequisites:
        'Admin access to an official Facebook Page. Meta identity verification for political content.',
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
    description:
      'Generate high-resolution candidate posters and 1-tap share to your WhatsApp Status and local voter groups.',
    priceINR: 0, // Always 100% Free
    currency: 'INR',
    guidance: {
      howItWorks:
        'Select a pre-designed campaign poster (photo, party symbol, key promise). Tap "Share to Status" or "Share to Groups" to open WhatsApp directly with media pre-filled.',
      prerequisites:
        'WhatsApp or WhatsApp Business installed on your device. Contact list or active colony/community groups.',
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
      howItWorks:
        'Filter your audience by Geography (Constituency, Ward, Polling Booth) or Cadre Role so every message is hyper-relevant.',
      dos: [
        'Use Ward-level targeting for local civic issues (drainage, roads, water supply).',
        'Use the Cadre filter to alert booth in-charges for morning meetings or rally duties.',
        'Use Youth/First-Time voter filters for employment and education promises.',
      ],
      donts: ['Do not blast constituency-wide messages for single-ward events.'],
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
const inMemoryCampaignAdDrafts: Array<Record<string, unknown>> = [];

/**
 * Authoritative campaign lookup: DB first, then fallback to in-memory store.
 */
async function findCampaignById(
  campaignId: string,
): Promise<{ id: string; politician_id: string } | null> {
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
  if (isProductionRuntime()) return null;
  const mem = inMemoryCampaigns.find((c) => c.id === campaignId);
  if (mem) {
    return { id: mem.id, politician_id: mem.politicianId };
  }
  return null;
}

async function findPoliticianProfileIdForUser(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('politician_portal_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`POLITICIAN_PROFILE_LOOKUP_FAILED: ${error.message}`);
  return data?.id || null;
}

/**
 * Checks whether the authenticated caller has operational authority over a given campaign.
 * Admins, moderators, owning politicians, and assigned coordinators pass.
 */
async function verifyCampaignAuthority(
  auth: { userId: string; role: string },
  campaignId: string,
): Promise<{
  authorized: boolean;
  campaign: { id: string; politician_id: string } | null;
  reason?: string;
}> {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) {
    return { authorized: false, campaign: null, reason: 'Campaign not found' };
  }

  // System admin or compliance moderator
  if (auth.role === 'admin' || auth.role === 'moderator') {
    return { authorized: true, campaign };
  }

  // Owning politician. The campaign FK points at politician_portal_profiles.id,
  // while the authenticated principal is auth.users.id.
  if (isProductionRuntime()) {
    const politicianProfileId = await findPoliticianProfileIdForUser(auth.userId);
    if (politicianProfileId && campaign.politician_id === politicianProfileId) {
      return { authorized: true, campaign };
    }
  } else if (campaign.politician_id === auth.userId) {
    return { authorized: true, campaign };
  }

  // A coordinator is authorized only when persisted campaign membership
  // below grants that role for this specific campaign.
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
  const memVol = isProductionRuntime() ? undefined : inMemoryVolunteers.find(
    (v) =>
      v.campaignId === campaignId &&
      (v.id === auth.userId || v.name === auth.userId) &&
      v.role === 'coordinator',
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
async function resolveEffectivePoliticianId(
  auth: { userId: string; role: string },
  requestedPoliticianId?: string,
): Promise<{ authorized: boolean; effectivePoliticianId: string }> {
  if (!isProductionRuntime()) {
    if (auth.role === 'admin') {
      return { authorized: true, effectivePoliticianId: requestedPoliticianId || auth.userId };
    }
    if (requestedPoliticianId && requestedPoliticianId !== auth.userId) {
      return { authorized: false, effectivePoliticianId: auth.userId };
    }
    return { authorized: true, effectivePoliticianId: auth.userId };
  }

  if (auth.role === 'admin') {
    if (!requestedPoliticianId) {
      return { authorized: false, effectivePoliticianId: auth.userId };
    }
    if (!isSupabaseConfigured) {
      return { authorized: false, effectivePoliticianId: auth.userId };
    }
    const { data, error } = await supabase
      .from('politician_portal_profiles')
      .select('id')
      .eq('id', requestedPoliticianId)
      .maybeSingle();
    if (error) throw new Error(`POLITICIAN_PROFILE_LOOKUP_FAILED: ${error.message}`);
    return {
      authorized: Boolean(data),
      effectivePoliticianId: data?.id || auth.userId,
    };
  }

  const profileId = await findPoliticianProfileIdForUser(auth.userId);
  if (!profileId || (requestedPoliticianId && requestedPoliticianId !== profileId)) {
    return { authorized: false, effectivePoliticianId: auth.userId };
  }

  return { authorized: true, effectivePoliticianId: profileId };
}

export async function campaignRoutes(app: FastifyInstance) {
  const paymentProvider: PaymentProvider = new RazorpayProvider();
  const voiceObdProvider: VoiceObdProvider = new TelecomProvider();

  /**
   * GET /api/v1/campaign/pricing
   * Returns individual pricing per service (Voice OBD, Meta Boost, WhatsApp Organic)
   * with transparent 50% platform margin and complete guidance notes.
   */
  app.get('/api/v1/campaign/pricing', async (request, reply) => {
    if (isProductionRuntime()) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Campaign pricing is unavailable until rates are backed by durable configuration and approved for production delivery.',
        { code: 'PRICING_UNAVAILABLE' },
      );
    }

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
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', {
        code: 'UNAUTHORIZED',
      });
    }
    if (isProductionRuntime()) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Pricing updates require a durable, audited production configuration store.',
        { code: 'PRICING_PERSISTENCE_UNAVAILABLE' },
      );
    }
    if (auth.role !== 'admin') {
      return sendApiError(
        reply,
        request,
        403,
        'Forbidden',
        'Pricing updates require admin privileges',
        {
          code: 'FORBIDDEN',
        },
      );
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
  app.get(
    '/api/v1/campaign/users/check-kshetra',
    { schema: checkKshetraQuerySchema },
    async (request, reply) => {
      const { phone, campaignId } = request.query as { phone?: string; campaignId?: string };
      const cleaned = (phone || '').replace(/\D/g, '').slice(-10);

      if (!cleaned) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Valid phone number required', {
          code: 'VALIDATION_ERROR',
        });
      }

      if (isProductionRuntime()) {
        if (!campaignId) {
          return sendApiError(reply, request, 400, 'Bad Request', 'campaignId is required to check a campaign contact.', {
            code: 'VALIDATION_ERROR',
          });
        }
        const auth = await resolveAuthUser(request, campaignId);
        if (!auth) {
          return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to check account registration.', {
            code: 'UNAUTHORIZED',
          });
        }
        const authority = await verifyCampaignAuthority(auth, campaignId);
        if (!authority.authorized) {
          return sendApiError(reply, request, 403, 'Forbidden', 'Not authorized to manage contacts for this campaign.', {
            code: 'FORBIDDEN',
          });
        }
        if (!isSupabaseConfigured) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Account registration could not be verified.', {
            code: 'DATABASE_UNAVAILABLE',
          });
        }
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, display_name, avatar_url, role')
            .eq('phone', cleaned)
            .maybeSingle();
          if (error) throw error;
          return {
            isKshetraUser: Boolean(data),
            displayName: data?.display_name,
            avatarUrl: data?.avatar_url,
            role: data?.role,
          };
        } catch {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Account registration could not be verified.', {
            code: 'DATABASE_ERROR',
          });
        }
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
      const match = inMemoryVolunteers.find(
        (v) => v.phone.replace(/\D/g, '').slice(-10) === cleaned,
      );
      return {
        isKshetraUser: match ? match.isKshetraUser : false,
        displayName: match ? match.name : undefined,
        phone: cleaned,
      };
    },
  );

  /** POST /api/v1/campaign/campaigns — create a persisted draft campaign */
  app.post('/api/v1/campaign/campaigns', { schema: campaignCreateSchema }, async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      type: string;
      stateCode: string;
      startDate: string;
      endDate: string;
      totalBudgetINR?: number;
      targetConstituencies?: number[];
      targetDistricts?: string[];
    };
    if (body.endDate < body.startDate) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Campaign end date must be on or after the start date.', {
        code: 'VALIDATION_ERROR',
      });
    }

    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to create a campaign.', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!['politician', 'aspirant', 'party'].includes(auth.role)) {
      return sendApiError(reply, request, 403, 'Forbidden', 'A verified campaign owner account is required to create a campaign.', {
        code: 'FORBIDDEN',
      });
    }

    if (isProductionRuntime()) {
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign persistence is not configured.', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      let binding: { authorized: boolean; effectivePoliticianId: string };
      try {
        binding = await resolveEffectivePoliticianId(auth);
      } catch {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign owner profile could not be resolved.', {
          code: 'POLITICIAN_PROFILE_UNAVAILABLE',
        });
      }
      if (!binding.authorized) {
        return sendApiError(reply, request, 403, 'Forbidden', 'An active campaign owner profile is required to create a campaign.', {
          code: 'POLITICIAN_PROFILE_REQUIRED',
        });
      }

      try {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            politician_id: binding.effectivePoliticianId,
            name: body.name.trim(),
            description: body.description?.trim() || '',
            type: body.type,
            status: 'draft',
            state_code: body.stateCode,
            start_date: body.startDate,
            end_date: body.endDate,
            total_budget_inr: body.totalBudgetINR ?? 0,
            target_constituencies: body.targetConstituencies || [],
            target_districts: body.targetDistricts || [],
          })
          .select('*, politician_portal_profiles(display_name, party)')
          .single();
        if (error || !data) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign could not be saved to the authoritative database.', {
            code: 'CAMPAIGN_PERSISTENCE_FAILED',
          });
        }
        return reply.code(201).send({ campaign: data });
      } catch {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign could not be saved to the authoritative database.', {
          code: 'CAMPAIGN_PERSISTENCE_FAILED',
        });
      }
    }

    const campaign = {
      id: crypto.randomUUID(),
      politicianId: auth.userId,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      type: body.type,
      status: 'draft',
      stateCode: body.stateCode,
      startDate: body.startDate,
      endDate: body.endDate,
      targetConstituencies: body.targetConstituencies || [],
      targetDistricts: body.targetDistricts || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryCampaigns = [campaign as unknown as (typeof inMemoryCampaigns)[number], ...inMemoryCampaigns];
    return reply.code(201).send({ campaign });
  });

  /** GET /api/v1/campaign/campaigns — list campaigns */
  app.get('/api/v1/campaign/campaigns', { schema: campaignsQuerySchema }, async (request, reply) => {
    const { status, politicianId } = request.query as { status?: string; politicianId?: string };
    let scopedPoliticianId = politicianId;

    if (isProductionRuntime()) {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to read campaign records.', {
          code: 'UNAUTHORIZED',
        });
      }
      if (auth.role === 'admin') {
        if (politicianId) {
          const binding = await resolveEffectivePoliticianId(auth, politicianId);
          if (!binding.authorized) {
            return sendApiError(reply, request, 403, 'Forbidden', 'Unknown campaign owner profile.', {
              code: 'FORBIDDEN',
            });
          }
          scopedPoliticianId = binding.effectivePoliticianId;
        }
      } else {
        let profileId: string | null;
        try {
          profileId = await findPoliticianProfileIdForUser(auth.userId);
        } catch {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign owner profile could not be resolved.', {
            code: 'POLITICIAN_PROFILE_UNAVAILABLE',
          });
        }
        if (!profileId) return { campaigns: [], total: 0 };
        if (politicianId && politicianId !== profileId) {
          return sendApiError(reply, request, 403, 'Forbidden', 'Cannot read another principal’s campaign records.', {
            code: 'FORBIDDEN',
          });
        }
        scopedPoliticianId = profileId;
      }
    }

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('campaigns')
          .select('*, politician_portal_profiles(display_name, party)');
        if (status) query = query.eq('status', status);
        if (scopedPoliticianId) query = query.eq('politician_id', scopedPoliticianId);
        const { data, error } = await query;
        if (!error) {
          const campaigns = data || [];
          return { campaigns, total: campaigns.length };
        }
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch {
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      }
    }

    if (isProductionRuntime()) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign persistence is not configured.', {
        code: 'DATABASE_UNAVAILABLE',
      });
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

  /** GET /api/v1/campaign/ads — list persisted draft creatives for an authorized campaign */
  app.get('/api/v1/campaign/ads', { schema: campaignAdsQuerySchema }, async (request, reply) => {
    const { campaignId } = request.query as { campaignId: string };
    const auth = await resolveAuthUser(request, campaignId);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to read campaign ad drafts.', {
        code: 'UNAUTHORIZED',
      });
    }

    let authority: Awaited<ReturnType<typeof verifyCampaignAuthority>>;
    try {
      authority = await verifyCampaignAuthority(auth, campaignId);
    } catch {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign access could not be verified.', {
        code: 'CAMPAIGN_AUTHORITY_UNAVAILABLE',
      });
    }
    if (!authority.authorized) {
      const notFound = !authority.campaign;
      return sendApiError(reply, request, notFound ? 404 : 403, notFound ? 'Not Found' : 'Forbidden', authority.reason || 'Not authorized to read this campaign.', {
        code: notFound ? 'CAMPAIGN_NOT_FOUND' : 'FORBIDDEN',
      });
    }

    if (isProductionRuntime()) {
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad draft storage is not configured.', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      try {
        const { data, error } = await supabase
          .from('ad_creatives')
          .select(CAMPAIGN_AD_DRAFT_COLUMNS)
          .eq('campaign_id', campaignId)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        if (error || !data) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad drafts could not be loaded from the authoritative database.', {
            code: 'CAMPAIGN_AD_READ_FAILED',
          });
        }
        return reply.send({ ads: data, total: data.length });
      } catch {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad drafts could not be loaded from the authoritative database.', {
          code: 'CAMPAIGN_AD_READ_FAILED',
        });
      }
    }

    const ads = inMemoryCampaignAdDrafts.filter((ad) => ad.campaign_id === campaignId);
    return reply.send({ ads, total: ads.length });
  });

  /** POST /api/v1/campaign/ads — persist a draft only; no review or delivery is implied */
  app.post('/api/v1/campaign/ads', { schema: campaignAdDraftSchema }, async (request, reply) => {
    const body = request.body as {
      campaignId: string;
      format: string;
      name: string;
      headline: string;
      body?: string;
      callToAction?: string;
      mediaUrls?: string[];
      thumbnailUrl?: string;
      landingUrl?: string;
      paidForBy: string;
      disclosureText: string;
    };
    const auth = await resolveAuthUser(request, body.campaignId);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to save a campaign ad draft.', {
        code: 'UNAUTHORIZED',
      });
    }

    let authority: Awaited<ReturnType<typeof verifyCampaignAuthority>>;
    try {
      authority = await verifyCampaignAuthority(auth, body.campaignId);
    } catch {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign access could not be verified.', {
        code: 'CAMPAIGN_AUTHORITY_UNAVAILABLE',
      });
    }
    if (!authority.authorized) {
      const notFound = !authority.campaign;
      return sendApiError(reply, request, notFound ? 404 : 403, notFound ? 'Not Found' : 'Forbidden', authority.reason || 'Not authorized to manage this campaign.', {
        code: notFound ? 'CAMPAIGN_NOT_FOUND' : 'FORBIDDEN',
      });
    }

    const draft = {
      campaign_id: body.campaignId,
      format: body.format,
      status: 'draft',
      name: body.name.trim(),
      headline: body.headline.trim(),
      body: body.body?.trim() || '',
      call_to_action: body.callToAction?.trim() || '',
      media_urls: body.mediaUrls || [],
      thumbnail_url: body.thumbnailUrl?.trim() || null,
      landing_url: body.landingUrl?.trim() || null,
      disclosure_text: body.disclosureText.trim(),
      paid_for_by: body.paidForBy.trim(),
      is_eci_compliant: false,
      updated_at: new Date().toISOString(),
    };

    if (isProductionRuntime()) {
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad draft storage is not configured.', {
          code: 'DATABASE_UNAVAILABLE',
        });
      }
      try {
        const { data, error } = await supabase
          .from('ad_creatives')
          .insert(draft)
          .select(CAMPAIGN_AD_DRAFT_COLUMNS)
          .single();
        if (error || !data) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad draft could not be saved to the authoritative database.', {
            code: 'CAMPAIGN_AD_WRITE_FAILED',
          });
        }
        return reply.code(201).send({ ad: data });
      } catch {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign ad draft could not be saved to the authoritative database.', {
          code: 'CAMPAIGN_AD_WRITE_FAILED',
        });
      }
    }

    const saved = {
      ...draft,
      id: crypto.randomUUID(),
      created_at: draft.updated_at,
    };
    inMemoryCampaignAdDrafts.unshift(saved);
    return reply.code(201).send({ ad: saved });
  });

  /** GET /api/v1/campaign/booths — booth strategy and in-charge management */
  app.get('/api/v1/campaign/booths', { schema: boothsQuerySchema }, async (request, reply) => {
    const { campaignId, priority } = request.query as { campaignId?: string; priority?: string };

    if (isProductionRuntime()) {
      const auth = await resolveAuthUser(request, campaignId);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to read booth records.', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!campaignId) {
        return sendApiError(reply, request, 400, 'Bad Request', 'campaignId is required.', {
          code: 'VALIDATION_ERROR',
        });
      }
      const authority = await verifyCampaignAuthority(auth, campaignId);
      if (!authority.authorized) {
        return sendApiError(reply, request, 403, 'Forbidden', authority.reason || 'Not authorized for this campaign.', {
          code: 'FORBIDDEN',
        });
      }
    }

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('booth_strategies').select('*');
        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (priority) query = query.eq('priority', priority);
        const { data, error } = await query;
        if (!error) {
          const booths = data || [];
          return {
            booths,
            total: booths.length,
            assignedCount: booths.filter((booth) => !!booth.agent_phone).length,
            unassignedCount: booths.filter((booth) => !booth.agent_phone).length,
          };
        }
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Booth data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch {
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Booth data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      }
    }

    if (isProductionRuntime()) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign persistence is not configured.', {
        code: 'DATABASE_UNAVAILABLE',
      });
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
      return sendApiError(
        reply,
        request,
        401,
        'Unauthorized',
        'Authentication required to mutate campaign booth',
        {
          code: 'UNAUTHORIZED',
        },
      );
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
      return sendApiError(reply, request, 404, 'Not Found', 'Booth not found', {
        code: 'NOT_FOUND',
      });
    }

    // 3. Verify campaign authority
    const authCheck = await verifyCampaignAuthority(auth, boothCampaignId!);
    if (!authCheck.authorized) {
      return sendApiError(
        reply,
        request,
        403,
        'Forbidden',
        authCheck.reason || 'Unauthorized to modify booths for this campaign',
        {
          code: 'FORBIDDEN',
        },
      );
    }

    // 4. Perform mutation
    if (isSupabaseConfigured && existingDbBooth) {
      try {
        const databaseColumnByField: Record<string, string> = {
          canvassingCompletion: 'canvassing_completion',
          agentName: 'agent_name',
          agentPhone: 'agent_phone',
          totalVoters: 'total_voters',
          targetVotes: 'target_votes',
          supportEstimate: 'support_estimate',
        };
        const databaseUpdates = Object.fromEntries(
          Object.entries(updates).map(([field, value]) => [databaseColumnByField[field] || field, value]),
        );
        delete databaseUpdates.isKshetraUser;
        if (typeof updates.agentPhone === 'string') {
          const cleanedPhone = normalizePhoneNumber(updates.agentPhone);
          if (cleanedPhone.length === 10) {
            const { data: agentProfile, error: agentLookupError } = await supabase
              .from('user_profiles')
              .select('user_id')
              .eq('phone', cleanedPhone)
              .maybeSingle();
            if (agentLookupError) {
              return sendApiError(reply, request, 503, 'Service Unavailable', 'In-charge account registration could not be verified.', {
                code: 'ACCOUNT_LOOKUP_FAILED',
              });
            }
            databaseUpdates.agent_id = agentProfile?.user_id || null;
          } else {
            databaseUpdates.agent_id = null;
          }
          databaseUpdates.agent_phone = updates.agentPhone.trim();
        }
        const { data, error } = await supabase
          .from('booth_strategies')
          .update(databaseUpdates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return { success: true, booth: data };
        }
        if (error) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            `Failed to update booth strategy: ${error.message}`,
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to update booth strategy',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    }

    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Database persistence unavailable. Cannot update booth strategy.',
        {
          code: 'DATABASE_UNAVAILABLE',
        },
      );
    }

    return sendApiError(reply, request, 404, 'Not Found', 'Booth not found', { code: 'NOT_FOUND' });
  });

  /** GET /api/v1/campaign/volunteers — list ground cadre */
  app.get('/api/v1/campaign/volunteers', { schema: volunteersQuerySchema }, async (request, reply) => {
    const { campaignId, role } = request.query as { campaignId?: string; role?: string };

    if (isProductionRuntime()) {
      const auth = await resolveAuthUser(request, campaignId);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication is required to read campaign volunteer records.', {
          code: 'UNAUTHORIZED',
        });
      }
      if (!campaignId) {
        return sendApiError(reply, request, 400, 'Bad Request', 'campaignId is required.', {
          code: 'VALIDATION_ERROR',
        });
      }
      const authority = await verifyCampaignAuthority(auth, campaignId);
      if (!authority.authorized) {
        return sendApiError(reply, request, 403, 'Forbidden', authority.reason || 'Not authorized for this campaign.', {
          code: 'FORBIDDEN',
        });
      }
    }

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('campaign_volunteers').select('*');
        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (role) query = query.eq('role', role);
        const { data, error } = await query;
        if (!error) {
          const volunteers = data || [];
          return { volunteers, total: volunteers.length };
        }
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign volunteer data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch {
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign volunteer data could not be loaded from the authoritative database.', {
            code: 'DATABASE_ERROR',
          });
        }
      }
    }

    if (isProductionRuntime()) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign persistence is not configured.', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    let filtered = inMemoryVolunteers;
    if (role) filtered = filtered.filter((v) => v.role === role);
    return { volunteers: filtered, total: filtered.length };
  });

  /** POST /api/v1/campaign/volunteers — add new cadre member */
  app.post(
    '/api/v1/campaign/volunteers',
    { schema: volunteerCreateSchema },
    async (request, reply) => {
      const body = request.body as Record<string, any>;
      if (!body.name || !body.phone) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Name and phone are required', {
          code: 'VALIDATION_ERROR',
        });
      }

      if (isProductionRuntime() && !body.campaignId) {
        return sendApiError(reply, request, 400, 'Bad Request', 'campaignId is required for campaign cadre registration.', {
          code: 'VALIDATION_ERROR',
        });
      }
      const campaignId = body.campaignId || 'c1';

      // 1. Authenticate caller
      const auth = await resolveAuthUser(request, campaignId);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to manage campaign cadre',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }

      // 2. Ordinary citizens cannot create cadre or manage volunteers
      if (auth.role === 'citizen') {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Ordinary citizens cannot create campaign volunteers',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      // 3. Verify campaign authority
      const authCheck = await verifyCampaignAuthority(auth, campaignId);
      if (!authCheck.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          authCheck.reason || 'Unauthorized to manage cadre for this campaign',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      // 4. Privilege Controls:
      // Only admin, moderator, or owning politician can assign 'coordinator' role
      const assignedRole = body.role || 'booth_agent';
      if (assignedRole === 'coordinator') {
        const ownerId = isProductionRuntime()
          ? await findPoliticianProfileIdForUser(auth.userId)
          : auth.userId;
        const isOwner = Boolean(ownerId && authCheck.campaign?.politician_id === ownerId);
        const isAdminOrMod = auth.role === 'admin' || auth.role === 'moderator';
        if (!isOwner && !isAdminOrMod) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Only campaign owners and administrators can appoint coordinators',
            {
              code: 'PRIVILEGE_SPOOFING_REJECTED',
            },
          );
        }
      }

      // Resolve the added worker by phone; never bind the campaign manager
      // (the authenticated caller) as the worker account by default.
      const cleanedPhone = normalizePhoneNumber(body.phone);
      if (cleanedPhone.length !== 10) {
        return sendApiError(reply, request, 400, 'Bad Request', 'A valid 10-digit phone number is required.', {
          code: 'VALIDATION_ERROR',
        });
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database persistence unavailable. Cannot register volunteer.',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('phone', cleanedPhone)
          .maybeSingle();
        if (profileError) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Worker account registration could not be verified.', {
            code: 'ACCOUNT_LOOKUP_FAILED',
          });
        }
        if (body.isKshetraUser === true && !userProfile) {
          return sendApiError(reply, request, 403, 'Forbidden', 'The supplied phone number is not linked to a registered account.', {
            code: 'PRIVILEGE_SPOOFING_REJECTED',
          });
        }

        const { data: existingContact, error: contactLookupError } = await supabase
          .from('campaign_volunteers')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('phone', cleanedPhone)
          .maybeSingle();
        if (contactLookupError) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Existing campaign contacts could not be checked.', {
            code: 'CONTACT_LOOKUP_FAILED',
          });
        }
        if (existingContact) {
          return sendApiError(reply, request, 409, 'Conflict', 'This phone number is already registered on the campaign team.', {
            code: 'DUPLICATE_VOLUNTEER',
          });
        }

        const { data, error } = await supabase
          .from('campaign_volunteers')
          .insert({
            campaign_id: campaignId,
            user_id: userProfile?.user_id || null,
            name: body.name || '',
            phone: cleanedPhone,
            role: assignedRole,
            status: 'active',
            assigned_booths: body.assignedBooths || [],
            assigned_wards: body.assignedWards || [],
          })
          .select()
          .single();

        if (error || !data) {
          if (error?.code === '23505') {
            return sendApiError(reply, request, 409, 'Conflict', 'This account is already registered on the campaign team.', {
              code: 'DUPLICATE_VOLUNTEER',
            });
          }
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            error?.message || 'Failed to persist campaign volunteer',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        return reply.status(201).send({
          success: true,
          volunteer: data,
          message: 'Cadre member registered successfully',
        });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to register volunteer',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** GET /api/v1/campaign/wallet — get campaign prepaid balance */
  app.get('/api/v1/campaign/wallet', { schema: walletQuerySchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(
        reply,
        request,
        401,
        'Unauthorized',
        'Authentication required to view wallet balance',
        {
          code: 'UNAUTHORIZED',
        },
      );
    }

    const { politicianId } = request.query as { politicianId?: string };
    const binding = await resolveEffectivePoliticianId(auth, politicianId);
    if (!binding.authorized) {
      return sendApiError(
        reply,
        request,
        403,
        'Forbidden',
        'Cross-principal wallet access forbidden',
        {
          code: 'FORBIDDEN',
        },
      );
    }

    try {
      const wallet = await getPoliticianWallet(binding.effectivePoliticianId);
      return { status: 'ok', wallet };
    } catch (error: any) {
      if (isProductionRuntime()) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Campaign wallet data is unavailable from the durable ledger.', {
          code: 'WALLET_UNAVAILABLE',
        });
      }
      throw error;
    }
  });

  /** GET /api/v1/campaign/wallet/transactions — get wallet transaction history */
  app.get(
    '/api/v1/campaign/wallet/transactions',
    { schema: walletQuerySchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to view wallet transactions',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }

      const { politicianId } = request.query as { politicianId?: string };
      const binding = await resolveEffectivePoliticianId(auth, politicianId);
      if (!binding.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cross-principal wallet transaction access forbidden',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      try {
        const transactions = await getWalletTransactions(binding.effectivePoliticianId);
        return { status: 'ok', transactions, total: transactions.length };
      } catch (error: any) {
        if (isProductionRuntime()) {
          return sendApiError(reply, request, 503, 'Service Unavailable', 'Wallet transactions are unavailable from the durable ledger.', {
            code: 'WALLET_UNAVAILABLE',
          });
        }
        throw error;
      }
    },
  );

  /** POST /api/v1/campaign/wallet/recharge/order — create Razorpay / UPI recharge order */
  app.post(
    '/api/v1/campaign/wallet/recharge/order',
    { schema: rechargeOrderSchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to create recharge order',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }

      const body = request.body as { politicianId?: string; amountINR?: number };
      const binding = await resolveEffectivePoliticianId(auth, body.politicianId);
      if (!binding.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cannot create recharge order for another principal',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      if (isProductionRuntime() && !isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Durable wallet storage is required before recharge orders can be created.', {
          code: 'WALLET_PERSISTENCE_UNAVAILABLE',
        });
      }

      const amountINR = body.amountINR || 1000;

      if (amountINR < 500) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Minimum wallet recharge is ₹500', {
          code: 'PAYMENT_ORDER_ERROR',
        });
      }

      try {
        const order = await paymentProvider.createOrder({
          amountINR,
          currency: 'INR',
          politicianId: binding.effectivePoliticianId,
        });

        // 1. Production / Supabase Mode: Database is authoritative.
        if (isSupabaseConfigured) {
          const { error: dbErr } = await supabase.from('campaign_recharge_orders').insert({
            provider_order_id: order.orderId,
            politician_id: binding.effectivePoliticianId,
            amount_inr: amountINR,
            currency: 'INR',
            status: 'pending',
          });

          if (dbErr) {
            // In production mode, DB failure MUST NOT fall back to in-memory order. Fail closed immediately.
            return sendApiError(
              reply,
              request,
              500,
              'Database Error',
              'Failed to persist durable recharge order in database. Order creation aborted.',
              { code: 'DATABASE_ERROR' },
            );
          }

          // Cache for read performance if needed, but DB is primary
          const orderRecord: PendingRechargeOrder = {
            orderId: order.orderId,
            politicianId: binding.effectivePoliticianId,
            amountINR,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          PENDING_RECHARGE_ORDERS.set(order.orderId, orderRecord);

          return { success: true, order };
        }

        // 2. Offline / Test Mode: Only when Supabase is NOT configured
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
        const providerError = err instanceof PaymentProviderError ? err : null;
        const statusCode = providerError?.statusCode ?? 500;
        const statusText = statusCode === 503
          ? 'Service Unavailable'
          : statusCode === 502
            ? 'Bad Gateway'
            : statusCode === 400
              ? 'Bad Request'
              : 'Internal Server Error';
        return sendApiError(
          reply,
          request,
          statusCode,
          statusText,
          providerError?.message || 'Unable to create payment order.',
          {
            code: providerError?.code || 'PAYMENT_ORDER_FAILED',
          },
        );
      }
    },
  );

  /** POST /api/v1/campaign/wallet/recharge/verify — verify payment and credit wallet balance */
  app.post(
    '/api/v1/campaign/wallet/recharge/verify',
    { schema: rechargeVerifySchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to verify recharge payment',
          {
            code: 'UNAUTHORIZED',
          },
        );
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
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'amountINR and paymentReference required',
          {
            code: 'VALIDATION_ERROR',
          },
        );
      }

      // 1. Identity binding: check caller authority
      const binding = await resolveEffectivePoliticianId(auth, body.politicianId);
      if (!binding.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cannot verify recharge for another principal',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      if (isProductionRuntime() && !isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Durable wallet storage is required before payment verification can be processed.', {
          code: 'WALLET_PERSISTENCE_UNAVAILABLE',
        });
      }

      // Check test bypass header for test suites that explicitly simulate mock payments
      const testBypassRequested = request.headers['x-test-bypass-signature'] === 'true';
      const isExplicitTestBypass =
        isIsolatedTestRuntime() && testBypassRequested;
      if (testBypassRequested && !isExplicitTestBypass) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Test payment verification bypass is disabled in this runtime.',
          { code: 'TEST_BYPASS_DISABLED' },
        );
      }

      // 2. Strict Provider Verification Tuple Requirement (No optional signature in real mode)
      if (!isExplicitTestBypass) {
        if (!body.razorpay_order_id) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Missing provider order identity (razorpay_order_id). Payment verification rejected.',
            { code: 'MISSING_PROVIDER_ORDER_ID' },
          );
        }
        if (!body.razorpay_payment_id) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Missing provider payment identity (razorpay_payment_id). Payment verification rejected.',
            { code: 'MISSING_PROVIDER_PAYMENT_ID' },
          );
        }
        if (!body.razorpay_signature) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Missing cryptographic payment signature (razorpay_signature). Payment verification rejected.',
            { code: 'MISSING_SIGNATURE' },
          );
        }
      }

      const orderKey = body.razorpay_order_id || body.paymentReference;

      // 3. Authoritative Order Lookup
      let dbOrder: any = null;
      let memOrder: PendingRechargeOrder | undefined = undefined;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('campaign_recharge_orders')
            .select('*')
            .or(`provider_order_id.eq.${orderKey},payment_reference.eq.${body.paymentReference}`)
            .maybeSingle();

          if (error) {
            // DB error during lookup: Fail closed in Supabase mode! Do NOT fall back to memory registry.
            return sendApiError(
              reply,
              request,
              500,
              'Database Error',
              'Database error while retrieving durable recharge order. Verification aborted.',
              { code: 'DATABASE_ERROR' },
            );
          }
          dbOrder = data;
        } catch (err: any) {
          return sendApiError(
            reply,
            request,
            500,
            'Database Error',
            'Database connection error while retrieving durable recharge order. Verification aborted.',
            { code: 'DATABASE_ERROR' },
          );
        }

        // In Supabase mode, if not in DB, fail closed. Never use memory fallback as production resilience!
        if (!dbOrder) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'No matching recharge order found in database for the supplied payment reference.',
            { code: 'PAYMENT_ORDER_NOT_FOUND' },
          );
        }
      } else {
        // Offline / Test Mode: Use in-memory map
        memOrder = PENDING_RECHARGE_ORDERS.get(orderKey);
        if (!memOrder) {
          for (const ord of PENDING_RECHARGE_ORDERS.values()) {
            if (
              ord.orderId === body.paymentReference ||
              ord.paymentReference === body.paymentReference
            ) {
              memOrder = ord;
              break;
            }
          }
        }

        if (!memOrder) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'No matching recharge order found for the supplied payment reference. Arbitrary wallet crediting is rejected.',
            { code: 'PAYMENT_ORDER_NOT_FOUND' },
          );
        }
      }

      const effectiveOrderId = dbOrder?.provider_order_id || memOrder?.orderId || orderKey;
      const orderPoliticianId = dbOrder?.politician_id || memOrder?.politicianId;
      const orderAmount = dbOrder ? Number(dbOrder.amount_inr) : (memOrder?.amountINR ?? 0);

      if (
        !isExplicitTestBypass &&
        body.razorpay_order_id !== effectiveOrderId
      ) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'The submitted provider order does not match the stored recharge order.',
          { code: 'PAYMENT_ORDER_MISMATCH' },
        );
      }

      // 4. Verify order ownership
      if (orderPoliticianId !== binding.effectivePoliticianId && auth.role !== 'admin') {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cross-wallet recharge verification rejected',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      // 5. Verify amount consistency
      if (orderAmount !== body.amountINR) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          `Amount mismatch. Expected ₹${orderAmount}, received ₹${body.amountINR}`,
          { code: 'AMOUNT_MISMATCH' },
        );
      }

      // 6. Fail-Closed Cryptographic Verification
      if (body.razorpay_signature) {
        const paymentIdForSig = body.razorpay_payment_id || body.paymentReference;
        try {
          const verifyResult = await paymentProvider.verifyPaymentSignature({
            orderId: effectiveOrderId,
            paymentId: paymentIdForSig,
            signature: body.razorpay_signature,
            expectedAmountPaise: Math.round(orderAmount * 100),
            expectedCurrency: dbOrder?.currency || 'INR',
          });

          if (!verifyResult.valid) {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              'Invalid cryptographic payment signature',
              {
                code: verifyResult.reason || 'INVALID_SIGNATURE',
              },
            );
          }
        } catch (err: any) {
          if (err instanceof PaymentProviderError) {
            const statusCode = err.statusCode;
            const statusText = statusCode === 503
              ? 'Service Unavailable'
              : statusCode === 502
                ? 'Bad Gateway'
                : 'Bad Request';
            // Fail closed: if a signature verification was requested or supplied, but secret is missing, do not credit!
            return sendApiError(
              reply,
              request,
              statusCode,
              statusText,
              `${err.message} Wallet crediting aborted.`,
              { code: err.code },
            );
          }
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Payment verification could not be completed. Wallet crediting aborted.',
            {
              code: 'PAYMENT_VERIFICATION_FAILED',
            },
          );
        }
      }

      // 7. Atomic DB execution if Supabase is configured
      if (isSupabaseConfigured && dbOrder) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_credit_recharge', {
            p_provider_order_id: effectiveOrderId,
            p_politician_id: binding.effectivePoliticianId,
            p_amount_inr: body.amountINR,
            p_payment_reference: body.paymentReference,
            p_provider_payment_id: body.razorpay_payment_id || null,
          });

          if (rpcErr) {
            return sendApiError(reply, request, 500, 'Database Error', rpcErr.message, {
              code: 'DATABASE_ERROR',
            });
          }

          if (!rpcRes.success) {
            const statusMap: Record<string, number> = {
              PAYMENT_ORDER_NOT_FOUND: 400,
              FORBIDDEN: 403,
              AMOUNT_MISMATCH: 400,
            };
            return sendApiError(
              reply,
              request,
              statusMap[rpcRes.code] || 400,
              'Bad Request',
              rpcRes.message,
              { code: rpcRes.code },
            );
          }

          const cached = PENDING_RECHARGE_ORDERS.get(effectiveOrderId);
          if (cached) {
            cached.status = 'completed';
            cached.completedAt = new Date().toISOString();
            cached.paymentReference = body.paymentReference;
          }

          if (rpcRes.idempotent) {
            return {
              success: true,
              wallet: rpcRes.wallet,
              idempotent: true,
              message:
                rpcRes.message ||
                'Payment already verified and credited previously. Idempotent replay acknowledged.',
            };
          }

          return {
            success: true,
            wallet: rpcRes.wallet,
            message: `Successfully added ₹${body.amountINR.toLocaleString('en-IN')} to Campaign Wallet!`,
          };
        } catch (err: any) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            err.message || 'Atomic wallet verification failed',
            {
              code: 'VERIFICATION_FAILED',
            },
          );
        }
      }

      // 8. Concurrency-safe in-memory fallback (ONLY for offline / non-database execution)
      if (memOrder) {
        if (memOrder.status === 'completed') {
          const existingWallet = await getPoliticianWallet(binding.effectivePoliticianId);
          return {
            success: true,
            wallet: existingWallet,
            idempotent: true,
            message: `Payment already verified and credited previously. Idempotent replay acknowledged.`,
          };
        }

        // Re-entrancy & race condition protection: mark completed synchronously
        memOrder.status = 'completed';
        memOrder.completedAt = new Date().toISOString();
        memOrder.paymentReference = body.paymentReference;

        const updatedWallet = await creditWallet(
          binding.effectivePoliticianId,
          body.amountINR,
          body.paymentReference,
        );
        return {
          success: true,
          wallet: updatedWallet,
          message: `Successfully added ₹${body.amountINR.toLocaleString('en-IN')} to Campaign Wallet!`,
        };
      }

      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Unable to complete payment verification',
        {
          code: 'VERIFICATION_FAILED',
        },
      );
    },
  );

  /** GET /api/v1/campaign/obd/trai-status — check configured voice dispatch window */
  app.get('/api/v1/campaign/obd/trai-status', async () => {
    const trai = isWithinTraiWindow();
    return { status: 'ok', ...trai };
  });

  /** GET /api/v1/campaign/obd/broadcasts — list past and active voice call broadcasts */
  app.get(
    '/api/v1/campaign/obd/broadcasts',
    { schema: walletQuerySchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to view OBD broadcasts',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }

      const { politicianId } = request.query as { politicianId?: string };
      const binding = await resolveEffectivePoliticianId(auth, politicianId);
      if (!binding.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cross-principal broadcast access forbidden',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      const broadcasts = await getOBDBroadcasts(binding.effectivePoliticianId);
      return { status: 'ok', broadcasts, total: broadcasts.length };
    },
  );

  /** POST /api/v1/campaign/obd/dispatch — validate, settle wallet, and dispatch voice broadcast */
  app.post(
    '/api/v1/campaign/obd/dispatch',
    { schema: obdDispatchSchema },
    async (request, reply) => {
      const body = request.body as {
        campaignId?: string;
        politicianId?: string;
        audioUrl?: string;
        title?: string;
        targetSegment?: {
          type: string;
          wardNo?: number;
          boothNumbers?: string[];
          voterCount: number;
        };
      };

      const campaignId = body.campaignId || 'c1';

      // 1. Authenticate caller
      const auth = await resolveAuthUser(request, campaignId);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to dispatch OBD broadcasts',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }

      // 2. Check campaign operational authority BEFORE financial mutation or telecom dispatch
      const authCheck = await verifyCampaignAuthority(auth, campaignId);
      if (!authCheck.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          authCheck.reason || 'Unauthorized to operate this campaign',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      // 3. Resolve effective politician ID bound to authenticated principal
      const binding = await resolveEffectivePoliticianId(auth, body.politicianId);
      if (!binding.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Cannot dispatch OBD broadcast using another politician wallet',
          {
            code: 'FORBIDDEN',
          },
        );
      }

      const effectivePoliticianId = binding.effectivePoliticianId;

      if (isProductionRuntime()) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Production voice dispatch is unavailable until opted-in recipients, batch delivery, provider acceptance, and atomic wallet settlement are connected.',
          { code: 'VOICE_DISPATCH_UNAVAILABLE' },
        );
      }

      if (!body.targetSegment || !body.targetSegment.voterCount) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Target segment and voter count required',
          {
            code: 'VALIDATION_ERROR',
          },
        );
      }

      const voterCount = body.targetSegment.voterCount;
      const rate = campaignPricing.voiceObd.finalRatePerCallINR;
      const totalCostINR = Math.round(voterCount * rate);

      // 4. Configured political voice dispatch window check (09:00–20:00 IST)
      const traiCheck = voiceObdProvider.isWithinTraiCallingWindow();
      if (!traiCheck.permitted) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          traiCheck.message ||
            'Outbound voice calls are unavailable outside the configured 09:00–20:00 IST dispatch window.',
          {
            code: 'OUTSIDE_TRAI_WINDOW',
            details: [
              { path: 'timing', message: `Current IST hour: ${traiCheck.currentISTHour}:00` },
            ],
          },
        );
      }

      // 5. Check wallet and deduct funds (Throws error if insufficient)
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

      // 6. Dispatch via telecom gateway (with configured calling-window checks)
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
    },
  );

  /** POST /api/v1/webhooks/voice/:provider — receive real-time telecom delivery status reports */
  app.post(
    '/api/v1/webhooks/voice/:provider',
    { schema: webhookVoiceSchema },
    async (request, reply) => {
      const isValid = voiceObdProvider.validateWebhook({
        headers: request.headers as Record<string, any>,
        body: request.body,
      });
      if (!isValid) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Invalid webhook payload structure',
          {
            code: 'INVALID_WEBHOOK_PAYLOAD',
          },
        );
      }

      const payload = (request.body as Record<string, any>) || {};
      const report = voiceObdProvider.parseDeliveryReport(payload);
      const result = await processTelecomWebhook(payload);
      return { status: 'acknowledged', reportParsed: Boolean(report), ...result };
    },
  );
}
