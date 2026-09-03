import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

/**
 * Service-specific pricing configuration.
 * Admin can adjust anytime via PATCH /api/v1/campaign/pricing.
 * Includes a 50% platform margin on prevailing telecom/vendor rates.
 */
let campaignPricing = {
  voiceObd: {
    serviceKey: 'voice_obd',
    serviceName: 'Voice Call (OBD) Blast',
    description: 'Automated 30-second voice call in your own recorded voice directly to voter mobile phones.',
    baseVendorRatePerCallINR: 0.60,
    kshetraMarginPercent: 50,
    finalRatePerCallINR: 0.90, // 0.60 + 50% margin (0.30)
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
        'Do not exceed 45 seconds to avoid call drops.',
        'Do not broadcast during the 48-hour election silence period.',
        'Do not use aggressive or unverified claims.',
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
        kshetraFeeINR: 500, // 50% margin
        totalPriceINR: 1500,
      },
      {
        id: 'boost_constituency',
        label: 'Constituency-Wide Blast',
        targetAudience: 'All voters across Assembly Constituency',
        estReach: '50,000 – 80,000 views',
        vendorAdSpendINR: 3000,
        kshetraFeeINR: 1500, // 50% margin
        totalPriceINR: 4500,
      },
      {
        id: 'boost_rally_mega',
        label: 'Mega Rally 48hr Surge',
        targetAudience: 'High-frequency intensive push before polling day',
        estReach: '1,20,000 – 1,80,000 views',
        vendorAdSpendINR: 6000,
        kshetraFeeINR: 3000, // 50% margin
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
  app.patch('/api/v1/campaign/pricing', async (request, reply) => {
    const updates = request.body as Partial<typeof campaignPricing>;
    if (!updates || typeof updates !== 'object') {
      return reply.code(400).send({ error: 'Invalid pricing update payload' });
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
  app.get('/api/v1/campaign/users/check-kshetra', async (request) => {
    const { phone } = request.query as { phone?: string };
    const cleaned = (phone || '').replace(/\D/g, '').slice(-10);

    if (!cleaned) {
      return { isKshetraUser: false, message: 'Phone number required' };
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
  app.get('/api/v1/campaign/campaigns', async (request) => {
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
  app.get('/api/v1/campaign/booths', async (request) => {
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
  app.patch('/api/v1/campaign/booths/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Record<string, any>;

    if (isSupabaseConfigured) {
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

    const idx = inMemoryBooths.findIndex((b) => b.id === id || b.boothId === id);
    if (idx >= 0) {
      inMemoryBooths[idx] = { ...inMemoryBooths[idx], ...updates };
      return { success: true, booth: inMemoryBooths[idx] };
    }

    return reply.code(404).send({ error: 'Booth not found' });
  });

  /** GET /api/v1/campaign/volunteers — list ground cadre */
  app.get('/api/v1/campaign/volunteers', async (request) => {
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
  app.post('/api/v1/campaign/volunteers', async (request) => {
    const body = request.body as Record<string, any>;
    const newVol = {
      id: `v-${Date.now().toString(36)}`,
      campaignId: body.campaignId || 'c1',
      name: body.name || '',
      phone: body.phone || '',
      role: body.role || 'booth_agent',
      status: 'active',
      assignedBooths: body.assignedBooths || [],
      assignedWards: body.assignedWards || [],
      isKshetraUser: !!body.isKshetraUser,
      tasksCompleted: 0,
      createdAt: new Date().toISOString(),
    };

    inMemoryVolunteers.unshift(newVol);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('campaign_volunteers').insert(newVol);
      } catch {}
    }

    return { success: true, volunteer: newVol, message: 'Cadre member registered successfully' };
  });

  /** GET /api/v1/campaign/wallet — get campaign prepaid balance */
  app.get('/api/v1/campaign/wallet', async (request) => {
    const { politicianId } = request.query as { politicianId?: string };
    const wallet = await getPoliticianWallet(politicianId || 'pp1');
    return { status: 'ok', wallet };
  });

  /** GET /api/v1/campaign/wallet/transactions — get wallet transaction history */
  app.get('/api/v1/campaign/wallet/transactions', async (request) => {
    const { politicianId } = request.query as { politicianId?: string };
    const transactions = await getWalletTransactions(politicianId || 'pp1');
    return { status: 'ok', transactions, total: transactions.length };
  });

  /** POST /api/v1/campaign/wallet/recharge/order — create Razorpay / UPI recharge order */
  app.post('/api/v1/campaign/wallet/recharge/order', async (request, reply) => {
    const body = request.body as { politicianId?: string; amountINR?: number };
    const amountINR = body.amountINR || 1000;

    try {
      const order = await createWalletRechargeOrder(body.politicianId || 'pp1', amountINR);
      return { success: true, order };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message || 'Failed to create order' });
    }
  });

  /** POST /api/v1/campaign/wallet/recharge/verify — verify payment and credit wallet balance */
  app.post('/api/v1/campaign/wallet/recharge/verify', async (request, reply) => {
    const body = request.body as {
      politicianId?: string;
      amountINR: number;
      paymentReference: string;
    };

    if (!body.amountINR || !body.paymentReference) {
      return reply.code(400).send({ error: 'amountINR and paymentReference required' });
    }

    const updatedWallet = await creditWallet(body.politicianId || 'pp1', body.amountINR, body.paymentReference);
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
  app.get('/api/v1/campaign/obd/broadcasts', async (request) => {
    const { politicianId } = request.query as { politicianId?: string };
    const broadcasts = await getOBDBroadcasts(politicianId || 'pp1');
    return { status: 'ok', broadcasts, total: broadcasts.length };
  });

  /** POST /api/v1/campaign/obd/dispatch — check wallet, check TRAI, deduct funds, and dispatch voice broadcast */
  app.post('/api/v1/campaign/obd/dispatch', async (request, reply) => {
    const body = request.body as {
      campaignId?: string;
      politicianId?: string;
      audioUrl?: string;
      title?: string;
      targetSegment?: { type: string; wardNo?: number; boothNumbers?: string[]; voterCount: number };
    };

    const politicianId = body.politicianId || 'pp1';

    if (!body.targetSegment || !body.targetSegment.voterCount) {
      return reply.code(400).send({ error: 'Target segment and voter count required' });
    }

    const voterCount = body.targetSegment.voterCount;
    const rate = campaignPricing.voiceObd.finalRatePerCallINR;
    const totalCostINR = Math.round(voterCount * rate);

    // 1. Check wallet and deduct funds (Throws error if insufficient)
    let updatedWallet;
    try {
      updatedWallet = await deductWalletForService(
        politicianId,
        totalCostINR,
        'voice_obd',
        `obd_${Date.now()}`,
        `Voice Call: ${body.title || 'Voter Appeal'} (${voterCount.toLocaleString('en-IN')} voters @ ₹${rate.toFixed(2)})`,
      );
    } catch (err: any) {
      return reply.code(402).send({
        error: err.message,
        requiredAmountINR: totalCostINR,
        insufficientBalance: true,
      });
    }

    // 2. Dispatch via telecom gateway (with TRAI checks)
    const result = await dispatchOBDBroadcast({
      campaignId: body.campaignId || 'c1',
      politicianId,
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
  app.post('/api/v1/webhooks/voice/:provider', async (request) => {
    const payload = (request.body as Record<string, any>) || {};
    const result = await processTelecomWebhook(payload);
    return { status: 'acknowledged', ...result };
  });
}
