import { create } from 'zustand';
import type {
  Campaign,
  AdCreative,
  ABTest,
  Volunteer,
  BoothStrategy,
  CanvassingRecord,
  CampaignAnalytics,
  RevenueFlowData,
  CampaignStatus,
  AdFormat,
  AdStatus,
  VoterSegment,
  CampaignServicePricing,
} from '../lib/campaignTypes';
import type {
  CampaignWallet,
  WalletTransaction,
  OBDBroadcastJob,
} from '../lib/walletTypes';
import { API_BASE_URL } from '../lib/constants';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { apiClient } from '../lib/api';

// ─── Seed Campaigns ───
const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', politicianId: 'pp1', politicianName: 'Revanth Reddy', party: 'INC',
    name: 'Telangana Development Report Card', description: 'Showcase 2 years of INC governance achievements across Telangana.',
    type: 'brand_building', status: 'active', stateCode: 'TS',
    targetConstituencies: [1, 2, 3, 10, 20, 56, 100, 116, 119], targetDistricts: ['Hyderabad', 'Rangareddy', 'Medchal'],
    startDate: '2026-05-01', endDate: '2026-06-30',
    totalBudgetINR: 500000, spentBudgetINR: 185000, adCount: 4, volunteerCount: 45,
    boothsCovered: 120, totalBooths: 350, impressions: 2500000, reach: 850000,
    engagements: 125000, conversions: 8500, sentimentScore: 72,
    createdAt: '2026-04-25', updatedAt: '2026-05-24',
  },
  {
    id: 'c2', politicianId: 'pp3', politicianName: 'Ananya Rao',
    name: 'Youth Connect 2026', description: 'Outreach campaign targeting first-time voters and young professionals in Hyderabad.',
    type: 'outreach', status: 'active', stateCode: 'TS',
    targetConstituencies: [56, 57, 58], targetDistricts: ['Hyderabad'],
    startDate: '2026-05-15', endDate: '2026-07-15',
    totalBudgetINR: 50000, spentBudgetINR: 12000, adCount: 2, volunteerCount: 12,
    boothsCovered: 0, totalBooths: 0, impressions: 180000, reach: 65000,
    engagements: 12000, conversions: 1200, sentimentScore: 85,
    createdAt: '2026-05-10', updatedAt: '2026-05-24',
  },
  {
    id: 'c3', politicianId: 'pp4', politicianName: 'Siddaramaiah', party: 'INC',
    name: '5 Guarantees Impact Report', description: 'Highlight the reach and impact of Karnataka\'s 5 Guarantee schemes.',
    type: 'awareness', status: 'active', stateCode: 'KA',
    targetConstituencies: [], targetDistricts: [],
    startDate: '2026-04-15', endDate: '2026-06-15',
    totalBudgetINR: 800000, spentBudgetINR: 420000, adCount: 6, volunteerCount: 85,
    boothsCovered: 0, totalBooths: 0, impressions: 5200000, reach: 1800000,
    engagements: 310000, conversions: 22000, sentimentScore: 68,
    createdAt: '2026-04-10', updatedAt: '2026-05-24',
  },
];

// ─── Seed Ads ───
const SEED_ADS: AdCreative[] = [
  {
    id: 'ad1', campaignId: 'c1', format: 'promoted_post', status: 'active',
    name: 'Musi River Progress', headline: 'Musi River: From Sewage to Scenic — See the Transformation',
    body: 'Phase 1 complete: 23km of riverbank transformed. See the before/after.', callToAction: 'View Progress',
    mediaUrls: ['https://example.com/musi-before-after.jpg'], targeting: {
      segments: ['urban', 'high_education'], stateCode: 'TS',
      constituencyAcNos: [56, 57, 58, 59, 60], languages: ['te', 'en'],
      estimatedReach: 250000, targetingType: 'geographic',
    },
    budget: { type: 'daily', totalINR: 50000, dailyCapINR: 2500, spentINR: 18500, biddingStrategy: 'lowest_cost', costPerResult: 0.42 },
    schedule: { startDate: '2026-05-01', endDate: '2026-06-30', activeDays: ['mon','tue','wed','thu','fri','sat','sun'], activeHours: { start: 7, end: 23 }, timezone: 'Asia/Kolkata' },
    performance: {
      impressions: 850000, reach: 320000, clicks: 42000, engagements: 65000,
      shares: 8500, ctr: 4.94, cpm: 21.76, cpc: 0.44, cpe: 0.28,
      frequency: 2.66, spend: 18500, conversions: 3200, conversionRate: 3.76, roi: 280,
      sentimentPositive: 72, sentimentNeutral: 20, sentimentNegative: 8,
      byDay: [
        { date: '2026-05-20', impressions: 45000, clicks: 2200, spend: 980 },
        { date: '2026-05-21', impressions: 48000, clicks: 2500, spend: 1050 },
        { date: '2026-05-22', impressions: 52000, clicks: 2800, spend: 1120 },
      ],
      bySegment: [
        { segment: 'urban', impressions: 520000, clicks: 28000, ctr: 5.38 },
        { segment: 'high_education', impressions: 330000, clicks: 14000, ctr: 4.24 },
      ],
      byConstituency: [
        { acNo: 56, acName: 'Nampally', impressions: 180000, engagements: 14000 },
        { acNo: 57, acName: 'Karwan', impressions: 120000, engagements: 9500 },
      ],
    },
    disclosureText: 'Paid political advertisement', paidForBy: 'Indian National Congress, Telangana',
    isECICompliant: true, createdAt: '2026-05-01', updatedAt: '2026-05-24',
  },
  {
    id: 'ad2', campaignId: 'c1', format: 'video_ad', status: 'active',
    name: 'CM Report Card Video', headline: '2 Years of Progress — Telangana Under INC',
    body: 'Watch the comprehensive report card of the INC government.', callToAction: 'Watch Now',
    mediaUrls: ['https://example.com/report-card-video.mp4'], targeting: {
      segments: ['loyal_base', 'swing_voter'], stateCode: 'TS',
      estimatedReach: 500000, targetingType: 'demographic',
    },
    budget: { type: 'lifetime', totalINR: 150000, spentINR: 72000, biddingStrategy: 'cost_cap', maxBidINR: 120, costPerResult: 0.85 },
    schedule: { startDate: '2026-05-01', endDate: '2026-06-30', activeDays: ['mon','tue','wed','thu','fri','sat','sun'], activeHours: { start: 6, end: 24 }, timezone: 'Asia/Kolkata' },
    performance: {
      impressions: 1200000, reach: 480000, clicks: 85000, engagements: 42000,
      shares: 12000, ctr: 7.08, cpm: 60, cpc: 0.85, cpe: 1.71,
      frequency: 2.5, spend: 72000, conversions: 5000, conversionRate: 4.17, roi: 350,
      sentimentPositive: 68, sentimentNeutral: 22, sentimentNegative: 10,
      byDay: [], bySegment: [], byConstituency: [],
    },
    disclosureText: 'Paid political advertisement', paidForBy: 'Indian National Congress, Telangana',
    isECICompliant: true, createdAt: '2026-05-01', updatedAt: '2026-05-24',
  },
  {
    id: 'ad3', campaignId: 'c2', format: 'native_story', status: 'active',
    name: 'Youth Vision Story', headline: 'A 28-Year-Old\'s Plan to Transform Hyderabad',
    body: 'Meet Ananya Rao and her data-driven vision for urban governance.', callToAction: 'Read More',
    mediaUrls: [], targeting: {
      segments: ['youth_18_25', 'first_time_voter', 'high_education'], stateCode: 'TS',
      constituencyAcNos: [56, 57, 58], estimatedReach: 45000, targetingType: 'interest',
    },
    budget: { type: 'daily', totalINR: 15000, dailyCapINR: 750, spentINR: 5200, biddingStrategy: 'lowest_cost', costPerResult: 0.35 },
    schedule: { startDate: '2026-05-15', endDate: '2026-07-15', activeDays: ['mon','tue','wed','thu','fri','sat','sun'], activeHours: { start: 8, end: 22 }, timezone: 'Asia/Kolkata' },
    performance: {
      impressions: 120000, reach: 48000, clicks: 8500, engagements: 6200,
      shares: 1800, ctr: 7.08, cpm: 43.33, cpc: 0.61, cpe: 0.84,
      frequency: 2.5, spend: 5200, conversions: 850, conversionRate: 7.08, roi: 420,
      sentimentPositive: 82, sentimentNeutral: 14, sentimentNegative: 4,
      byDay: [], bySegment: [], byConstituency: [],
    },
    disclosureText: 'Paid political advertisement', paidForBy: 'Ananya Rao (Independent)',
    isECICompliant: true, createdAt: '2026-05-15', updatedAt: '2026-05-24',
  },
];

// ─── Seed A/B Tests ───
const SEED_AB_TESTS: ABTest[] = [
  {
    id: 'abt1', campaignId: 'c1', name: 'Headline Test: Musi Ad',
    status: 'completed',
    variants: [
      { variant: 'A', adId: 'ad1', headline: 'Musi River: From Sewage to Scenic', impressions: 420000, clicks: 22000, ctr: 5.24, conversions: 1800 },
      { variant: 'B', adId: 'ad1-b', headline: 'See How Musi River Was Transformed', impressions: 430000, clicks: 20000, ctr: 4.65, conversions: 1400 },
    ],
    winnerId: 'ad1', winnerVariant: 'A', confidenceLevel: 94.5,
    startedAt: '2026-05-01', completedAt: '2026-05-15',
  },
];

// ─── Seed Volunteers ───
const SEED_VOLUNTEERS: Volunteer[] = [
  { id: 'v1', userId: 'u-v1', campaignId: 'c1', name: 'K. Ramesh Goud', phone: '9848012345', role: 'booth_agent', status: 'active', assignedBooths: ['001'], assignedWards: [1], constituencyAcNo: 56, tasksCompleted: 23, hoursLogged: 45, rating: 4.8, isKshetraUser: true, joinedAt: '2026-05-05', lastActiveAt: '2026-05-23' },
  { id: 'v2', userId: 'u-v2', campaignId: 'c1', name: 'Lakshmi Devi', phone: '9876543211', role: 'booth_agent', status: 'active', assignedBooths: ['003'], assignedWards: [2], constituencyAcNo: 56, tasksCompleted: 12, hoursLogged: 28, rating: 4.8, isKshetraUser: true, joinedAt: '2026-05-08', lastActiveAt: '2026-05-24' },
  { id: 'v3', userId: 'u-v3', campaignId: 'c1', name: 'Mohammed Saleem', phone: '9876543212', role: 'coordinator', status: 'active', assignedBooths: ['001', '002', '003'], assignedWards: [1, 2], tasksCompleted: 35, hoursLogged: 60, rating: 4.9, isKshetraUser: true, joinedAt: '2026-05-03', lastActiveAt: '2026-05-24' },
  { id: 'v4', userId: 'u-v4', campaignId: 'c1', name: 'G. Venkatesh', phone: '9848098765', role: 'canvasser', status: 'active', assignedBooths: ['004'], assignedWards: [2], tasksCompleted: 8, hoursLogged: 16, rating: 4.2, isKshetraUser: false, joinedAt: '2026-05-12', lastActiveAt: '2026-05-22' },
];

// ─── Seed Booth Strategies ───
const SEED_BOOTHS: BoothStrategy[] = [
  { id: 'bs1', campaignId: 'c1', boothId: 'B-56-001', boothName: 'Govt. Boys High School, Nampally', boothNumber: '001', constituencyAcNo: 56, wardNo: 1, totalVoters: 1200, estimatedTurnout: 68.5, targetVotes: 650, historicalResults: [{ year: 2023, party: 'INC', votes: 580 }, { year: 2018, party: 'BRS', votes: 620 }], assignedVolunteers: ['v1'], agentId: 'v1', agentName: 'K. Ramesh Goud', agentPhone: '9848012345', isKshetraUser: true, priority: 'high', status: 'canvassing', canvassingCompletion: 72, supportEstimate: 62, notes: 'Good ground cadre presence, 2 street corners done.' },
  { id: 'bs2', campaignId: 'c1', boothId: 'B-56-002', boothName: 'Community Hall, Ward Office, Bazarghat', boothNumber: '002', constituencyAcNo: 56, wardNo: 1, totalVoters: 1450, estimatedTurnout: 65.0, targetVotes: 720, historicalResults: [{ year: 2023, party: 'INC', votes: 680 }], assignedVolunteers: [], priority: 'critical', status: 'not_started', canvassingCompletion: 15, supportEstimate: 38, notes: 'Urgent: No booth in-charge assigned yet. Strong opposition campaigning.' },
  { id: 'bs3', campaignId: 'c1', boothId: 'B-56-003', boothName: 'Sultan Bazar Primary School, Red Hills', boothNumber: '003', constituencyAcNo: 56, wardNo: 2, totalVoters: 980, estimatedTurnout: 72.0, targetVotes: 550, historicalResults: [], assignedVolunteers: ['v2'], agentId: 'v2', agentName: 'Lakshmi Devi', agentPhone: '9876543211', isKshetraUser: true, priority: 'medium', status: 'ready', canvassingCompletion: 90, supportEstimate: 74, notes: 'Well-covered, women self-help group meeting completed.' },
  { id: 'bs4', campaignId: 'c1', boothId: 'B-56-004', boothName: 'Zilla Parishad High School, Mallepally', boothNumber: '004', constituencyAcNo: 56, wardNo: 2, totalVoters: 1120, estimatedTurnout: 60.0, targetVotes: 600, historicalResults: [], assignedVolunteers: [], priority: 'critical', status: 'not_started', canvassingCompletion: 10, supportEstimate: 34, notes: 'No in-charge assigned. High youth population needing outreach.' },
  { id: 'bs5', campaignId: 'c1', boothId: 'B-56-005', boothName: 'Anganwadi Center, Habeeb Nagar', boothNumber: '005', constituencyAcNo: 56, wardNo: 3, totalVoters: 890, estimatedTurnout: 76.0, targetVotes: 520, historicalResults: [], assignedVolunteers: ['v3'], agentId: 'v3', agentName: 'Mohammed Saleem', agentPhone: '9876543212', isKshetraUser: true, priority: 'low', status: 'ready', canvassingCompletion: 95, supportEstimate: 80, notes: 'Stronghold. Cadre active and door-to-door slips distributed.' },
];

// ─── Default Service Pricing ───
export const DEFAULT_PRICING: CampaignServicePricing = {
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
        'Use the configured 9:00 AM to 8:00 PM IST dispatch window. Verify current legal and provider requirements before enabling production delivery.',
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
    basePublishingINR: 0,
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
      howItWorks: 'Link your official Facebook Page once. Publish updates directly from Poligram, or choose a targeted boost to reach voters in your exact constituency.',
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
    priceINR: 0,
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

// ─── Seed Revenue Data ───
const SEED_REVENUE: RevenueFlowData = {
  totalRevenue: 4500000,
  totalCampaigns: 28,
  totalAds: 85,
  activePoliticians: 42,
  avgSpendPerCampaign: 160714,
  avgROI: 285,
  mrr: 4500000,
  revenueByMonth: [
    { month: '2026-01', revenue: 1200000, campaigns: 8 },
    { month: '2026-02', revenue: 1800000, campaigns: 12 },
    { month: '2026-03', revenue: 2500000, campaigns: 16 },
    { month: '2026-04', revenue: 3200000, campaigns: 22 },
    { month: '2026-05', revenue: 4500000, campaigns: 28 },
  ],
  revenueByFormat: [
    { format: 'promoted_post', revenue: 1200000, count: 35 },
    { format: 'video_ad', revenue: 1500000, count: 18 },
    { format: 'native_story', revenue: 800000, count: 15 },
    { format: 'constituency_spotlight', revenue: 600000, count: 8 },
    { format: 'push_notification', revenue: 250000, count: 5 },
    { format: 'whatsapp_broadcast', revenue: 150000, count: 4 },
  ],
  revenueByState: [
    { stateCode: 'TS', revenue: 2800000 },
    { stateCode: 'KA', revenue: 1200000 },
    { stateCode: 'AP', revenue: 500000 },
  ],
  topSpenders: [
    { politicianId: 'pp1', name: 'Revanth Reddy', party: 'INC', totalSpend: 500000 },
    { politicianId: 'pp4', name: 'Siddaramaiah', party: 'INC', totalSpend: 800000 },
    { politicianId: 'pp2', name: 'Chandrababu Naidu', party: 'TDP', totalSpend: 650000 },
  ],
  projectedMRR: 8000000,
  unitEconomics: {
    costPerPromotedPost: 500,
    avgPoliticiansPerState: 8,
    statesActive: 5,
    monthlyRevenuePerState: 900000,
  },
};

const CAMPAIGN_TYPES = new Set<Campaign['type']>([
  'election', 'awareness', 'fundraising', 'outreach', 'issue_advocacy', 'brand_building', 'get_out_vote',
]);
const CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  'draft', 'planned', 'active', 'paused', 'completed', 'cancelled',
]);

function readNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(readNumber).filter((item): item is number => item !== undefined)
    : [];
}

function mapCampaignRow(row: any): Campaign | null {
  if (!row || typeof row !== 'object') return null;
  const id = row.id;
  const name = row.name;
  const type = row.type;
  const status = row.status;
  if (
    typeof id !== 'string' || !id || typeof name !== 'string' || !name ||
    !CAMPAIGN_TYPES.has(type) || !CAMPAIGN_STATUSES.has(status)
  ) return null;

  const totalBudget = readNumber(row.total_budget_inr ?? row.totalBudgetINR);
  const politicianProfile = row.politician_portal_profiles ?? row.politicianProfile;
  return {
    id,
    politicianId: String(row.politician_id ?? row.politicianId ?? ''),
    politicianName: row.politician_name ?? row.politicianName ?? politicianProfile?.display_name,
    party: row.party ?? politicianProfile?.party,
    name,
    description: String(row.description ?? ''),
    type,
    status,
    stateCode: String(row.state_code ?? row.stateCode ?? ''),
    targetConstituencies: readNumberArray(row.target_constituencies ?? row.targetConstituencies),
    targetDistricts: readStringArray(row.target_districts ?? row.targetDistricts),
    startDate: String(row.start_date ?? row.startDate ?? ''),
    endDate: String(row.end_date ?? row.endDate ?? ''),
    totalBudgetINR: totalBudget !== undefined && totalBudget > 0 ? totalBudget : undefined,
    // Spend/performance stay absent until tied to durable billing and delivery events.
    spentBudgetINR: undefined,
    adCount: undefined,
    volunteerCount: undefined,
    boothsCovered: undefined,
    totalBooths: undefined,
    impressions: undefined,
    reach: undefined,
    engagements: undefined,
    conversions: undefined,
    sentimentScore: undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
  };
}

function mapBoothRow(row: any): BoothStrategy | null {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string') return null;
  return {
    id: row.id,
    campaignId: String(row.campaign_id ?? row.campaignId ?? ''),
    boothId: String(row.booth_id ?? row.boothId ?? ''),
    boothName: String(row.booth_name ?? row.boothName ?? ''),
    boothNumber: String(row.booth_number ?? row.boothNumber ?? ''),
    constituencyAcNo: readNumber(row.constituency_ac_no ?? row.constituencyAcNo) ?? 0,
    wardNo: readNumber(row.ward_no ?? row.wardNo),
    totalVoters: readNumber(row.total_voters ?? row.totalVoters) ?? 0,
    estimatedTurnout: readNumber(row.estimated_turnout ?? row.estimatedTurnout) ?? 0,
    targetVotes: readNumber(row.target_votes ?? row.targetVotes) ?? 0,
    historicalResults: Array.isArray(row.historical_results ?? row.historicalResults)
      ? row.historical_results ?? row.historicalResults
      : [],
    assignedVolunteers: readStringArray(row.assigned_volunteers ?? row.assignedVolunteers),
    agentId: row.agent_id ?? row.agentId,
    agentName: row.agent_name ?? row.agentName,
    agentPhone: row.agent_phone ?? row.agentPhone,
    isKshetraUser: row.agent_id !== undefined
      ? Boolean(row.agent_id)
      : row.is_kshetra_user ?? row.isKshetraUser,
    priority: row.priority,
    status: row.status,
    canvassingCompletion: readNumber(row.canvassing_completion ?? row.canvassingCompletion) ?? 0,
    supportEstimate: readNumber(row.support_estimate ?? row.supportEstimate) ?? 0,
    notes: String(row.notes ?? ''),
  };
}

function mapVolunteerRow(row: any): Volunteer | null {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string') return null;
  return {
    id: row.id,
    userId: String(row.user_id ?? row.userId ?? ''),
    campaignId: String(row.campaign_id ?? row.campaignId ?? ''),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    role: row.role,
    status: row.status,
    assignedBooths: readStringArray(row.assigned_booths ?? row.assignedBooths),
    assignedWards: readNumberArray(row.assigned_wards ?? row.assignedWards),
    constituencyAcNo: readNumber(row.constituency_ac_no ?? row.constituencyAcNo),
    tasksCompleted: readNumber(row.tasks_completed ?? row.tasksCompleted) ?? 0,
    hoursLogged: readNumber(row.hours_logged ?? row.hoursLogged) ?? 0,
    rating: readNumber(row.rating) ?? 0,
    isKshetraUser: row.user_id !== undefined
      ? Boolean(row.user_id)
      : row.is_kshetra_user ?? row.isKshetraUser,
    joinedAt: String(row.joined_at ?? row.joinedAt ?? row.created_at ?? ''),
    lastActiveAt: String(row.last_active_at ?? row.lastActiveAt ?? ''),
  };
}

const AD_FORMATS = new Set<AdFormat>([
  'promoted_post', 'banner', 'video_ad', 'carousel', 'native_story',
  'constituency_spotlight', 'push_notification', 'sms_blast', 'whatsapp_broadcast',
]);
const AD_STATUSES = new Set<AdStatus>([
  'draft', 'pending_review', 'approved', 'active', 'paused', 'completed', 'rejected', 'expired',
]);

function mapAdRow(row: any): AdCreative | null {
  if (
    !row || typeof row !== 'object' || typeof row.id !== 'string' ||
    typeof (row.campaign_id ?? row.campaignId) !== 'string' ||
    !AD_FORMATS.has(row.format) || !AD_STATUSES.has(row.status) ||
    typeof row.name !== 'string' || typeof row.headline !== 'string'
  ) return null;

  return {
    id: row.id,
    campaignId: row.campaign_id ?? row.campaignId,
    format: row.format,
    status: row.status,
    name: row.name,
    headline: row.headline,
    body: String(row.body ?? ''),
    callToAction: String(row.call_to_action ?? row.callToAction ?? ''),
    mediaUrls: readStringArray(row.media_urls ?? row.mediaUrls),
    thumbnailUrl: row.thumbnail_url ?? row.thumbnailUrl ?? undefined,
    landingUrl: row.landing_url ?? row.landingUrl ?? undefined,
    disclosureText: String(row.disclosure_text ?? row.disclosureText ?? ''),
    paidForBy: String(row.paid_for_by ?? row.paidForBy ?? ''),
    eciDisclosureId: row.eci_disclosure_id ?? row.eciDisclosureId ?? undefined,
    isECICompliant: Boolean(row.is_eci_compliant ?? row.isECICompliant),
    reviewNote: row.review_note ?? row.reviewNote ?? undefined,
    // Delivery metrics are intentionally not selected from the legacy JSON default.
    performance: null,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
  };
}

type CampaignAdDraftInput = Pick<AdCreative, 'format' | 'name' | 'headline' | 'paidForBy' | 'disclosureText'> &
  Partial<Pick<AdCreative, 'body' | 'callToAction' | 'mediaUrls' | 'thumbnailUrl' | 'landingUrl'>>;

// ─── Store ───
interface CampaignState {
  campaigns: Campaign[];
  selectedCampaignId: string;
  ads: AdCreative[];
  adsLoading: boolean;
  adsAvailable: boolean;
  adsError: string | null;
  abTests: ABTest[];
  volunteers: Volunteer[];
  booths: BoothStrategy[];
  canvassingRecords: CanvassingRecord[];
  revenueData: RevenueFlowData | null;
  campaignsLoading: boolean;
  campaignsAvailable: boolean;
  campaignsError: string | null;
  boothsLoading: boolean;
  boothsAvailable: boolean;
  boothsError: string | null;
  volunteersLoading: boolean;
  volunteersAvailable: boolean;
  volunteersError: string | null;
  pricing: CampaignServicePricing;
  pricingAvailable: boolean;
  wallet: CampaignWallet;
  walletAvailable: boolean;
  walletTransactions: WalletTransaction[];
  walletTransactionsAvailable: boolean;
  walletTransactionsLoading: boolean;
  walletTransactionsError: string | null;
  obdBroadcasts: OBDBroadcastJob[];
  obdBroadcastsAvailable: boolean;
  obdBroadcastsLoading: boolean;
  obdBroadcastsError: string | null;

  // Queries
  getCampaign: (id: string) => Campaign | undefined;
  getCampaignsForPolitician: (politicianId: string) => Campaign[];
  getActiveCampaigns: () => Campaign[];
  getAdsForCampaign: (campaignId: string) => AdCreative[];
  getActiveAds: () => AdCreative[];
  getVolunteersForCampaign: (campaignId: string) => Volunteer[];
  getBoothsForCampaign: (campaignId: string) => BoothStrategy[];
  getCriticalBooths: (campaignId: string) => BoothStrategy[];
  getABTestsForCampaign: (campaignId: string) => ABTest[];
  getCampaignAnalytics: (campaignId: string) => CampaignAnalytics;
  getRevenueFlow: () => RevenueFlowData | null;

  // Actions
  loadCampaignWorkspace: () => Promise<void>;
  selectCampaign: (campaignId: string) => Promise<void>;
  fetchCampaigns: () => Promise<Campaign[]>;
  fetchAds: (campaignId: string) => Promise<void>;
  fetchBooths: (campaignId: string) => Promise<void>;
  fetchVolunteers: (campaignId: string) => Promise<void>;
  fetchPricing: () => Promise<void>;
  fetchWallet: () => Promise<void>;
  fetchWalletTransactions: () => Promise<void>;
  fetchOBDBroadcasts: () => Promise<void>;
  rechargeWallet: (amountINR: number) => Promise<{ success: boolean; message: string }>;
  dispatchVoiceOBD: (
    title: string,
    targetSegment: { type: string; wardNo?: number; boothNumbers?: string[]; voterCount: number },
    audioUrl?: string,
  ) => Promise<{ success: boolean; message: string; warning?: string; remainingBalance?: number }>;
  createCampaign: (campaign: Partial<Campaign>) => Promise<Campaign>;
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => void;
  createAd: (ad: CampaignAdDraftInput) => Promise<AdCreative>;
  pauseAd: (adId: string) => void;
  addVolunteer: (volunteer: Partial<Volunteer>) => void;
  addCadre: (cadre: { name: string; phone: string; role: Volunteer['role']; assignedBooths: string[]; isKshetraUser: boolean }) => Promise<void>;
  assignBoothIncharge: (boothId: string, agentName: string, agentPhone: string, isKshetraUser: boolean) => Promise<void>;
  checkKshetraUser: (phone: string) => Promise<{ isKshetraUser: boolean; displayName?: string }>;
  dispatchObdBroadcast: (title: string, voterCount: number) => Promise<{ success: boolean; cost: number | null; message: string }>;
  updateBoothStatus: (boothId: string, status: BoothStrategy['status']) => Promise<void>;
  logCanvassing: (record: Partial<CanvassingRecord>) => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: IS_LIVE_ENVIRONMENT ? [] : SEED_CAMPAIGNS,
  selectedCampaignId: IS_LIVE_ENVIRONMENT ? '' : (SEED_CAMPAIGNS[0]?.id || ''),
  ads: IS_LIVE_ENVIRONMENT ? [] : SEED_ADS,
  adsLoading: false,
  adsAvailable: !IS_LIVE_ENVIRONMENT,
  adsError: null,
  abTests: IS_LIVE_ENVIRONMENT ? [] : SEED_AB_TESTS,
  volunteers: IS_LIVE_ENVIRONMENT ? [] : SEED_VOLUNTEERS,
  booths: IS_LIVE_ENVIRONMENT ? [] : SEED_BOOTHS,
  canvassingRecords: [],
  revenueData: IS_LIVE_ENVIRONMENT ? null : SEED_REVENUE,
  campaignsLoading: false,
  campaignsAvailable: !IS_LIVE_ENVIRONMENT,
  campaignsError: null,
  boothsLoading: false,
  boothsAvailable: !IS_LIVE_ENVIRONMENT,
  boothsError: null,
  volunteersLoading: false,
  volunteersAvailable: !IS_LIVE_ENVIRONMENT,
  volunteersError: null,
  pricing: DEFAULT_PRICING,
  pricingAvailable: !IS_LIVE_ENVIRONMENT,
  wallet: {
    id: IS_LIVE_ENVIRONMENT ? '' : 'w-pp1',
    politicianId: IS_LIVE_ENVIRONMENT ? '' : 'pp1',
    balanceINR: IS_LIVE_ENVIRONMENT ? 0 : 5000,
    totalRechargedINR: IS_LIVE_ENVIRONMENT ? 0 : 10000,
    totalSpentINR: IS_LIVE_ENVIRONMENT ? 0 : 5000,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
  },
  walletAvailable: !IS_LIVE_ENVIRONMENT,
  walletTransactions: IS_LIVE_ENVIRONMENT ? [] : [
    {
      id: 'tx-1',
      walletId: 'w-pp1',
      politicianId: 'pp1',
      type: 'credit',
      amountINR: 10000,
      serviceType: 'recharge',
      referenceId: 'pay_rzp_mock_12345',
      description: 'Wallet Recharge via UPI / Razorpay',
      balanceAfterINR: 10000,
      createdAt: '2026-05-01T10:00:00Z',
    },
    {
      id: 'tx-2',
      walletId: 'w-pp1',
      politicianId: 'pp1',
      type: 'debit',
      amountINR: 1080,
      serviceType: 'voice_obd',
      referenceId: 'obd-demo-1',
      description: 'Voice Call Blast: Ward 12 (1,200 voters @ ₹0.90)',
      balanceAfterINR: 8920,
      createdAt: '2026-05-20T10:30:00Z',
    },
  ],
  walletTransactionsAvailable: !IS_LIVE_ENVIRONMENT,
  walletTransactionsLoading: false,
  walletTransactionsError: null,
  obdBroadcasts: IS_LIVE_ENVIRONMENT ? [] : [
    {
      id: 'obd-demo-1',
      campaignId: 'c1',
      politicianId: 'pp1',
      title: 'Ward 12 Drinking Water Promise',
      audioUrl: 'https://assets.kshetra.app/audio/c1-manifesto-water.mp3',
      audioDurationSeconds: 28,
      targetSegment: { type: 'ward', wardNo: 12, voterCount: 1200 },
      totalRecipients: 1200,
      ratePerCallINR: 0.90,
      totalCostINR: 1080,
      status: 'completed',
      answeredCount: 1056,
      busyCount: 88,
      unreachableCount: 56,
      startedAt: '2026-05-20T10:30:00Z',
      completedAt: '2026-05-20T10:48:00Z',
      createdAt: '2026-05-20T10:25:00Z',
    },
  ],
  obdBroadcastsAvailable: !IS_LIVE_ENVIRONMENT,
  obdBroadcastsLoading: false,
  obdBroadcastsError: null,

  getCampaign: (id) => get().campaigns.find((c) => c.id === id),
  getCampaignsForPolitician: (politicianId) => get().campaigns.filter((c) => c.politicianId === politicianId),
  getActiveCampaigns: () => get().campaigns.filter((c) => c.status === 'active'),
  getAdsForCampaign: (campaignId) => get().ads.filter((a) => a.campaignId === campaignId),
  getActiveAds: () => get().ads.filter((a) => a.status === 'active'),
  getVolunteersForCampaign: (campaignId) => get().volunteers.filter((v) => v.campaignId === campaignId),
  getBoothsForCampaign: (campaignId) => get().booths.filter((b) => b.campaignId === campaignId),
  getCriticalBooths: (campaignId) => get().booths.filter((b) => b.campaignId === campaignId && (b.priority === 'critical' || b.priority === 'high')),
  getABTestsForCampaign: (campaignId) => get().abTests.filter((t) => t.campaignId === campaignId),

  fetchCampaigns: async () => {
    if (!IS_LIVE_ENVIRONMENT) return get().campaigns;

    set({
      campaigns: [], campaignsLoading: true, campaignsAvailable: false, campaignsError: null,
      ads: [], adsLoading: false, adsAvailable: false, adsError: null,
      booths: [], boothsLoading: false, boothsAvailable: false, boothsError: null,
      volunteers: [], volunteersLoading: false, volunteersAvailable: false, volunteersError: null,
    });
    try {
      const { data } = await apiClient.request<{ campaigns?: unknown[] }>(
        '/api/v1/campaign/campaigns',
      );
      if (!Array.isArray(data.campaigns)) throw new Error('Invalid campaign response');
      const rows = data.campaigns;
      const mapped = rows
        .map(mapCampaignRow)
        .filter((campaign): campaign is Campaign => campaign !== null)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const hasInvalidRows = mapped.length !== rows.length;
      set({
        campaigns: mapped,
        campaignsAvailable: !hasInvalidRows,
        campaignsError: hasInvalidRows ? 'Some campaign records could not be displayed.' : null,
      });
      return mapped;
    } catch {
      set({
        campaigns: [], campaignsAvailable: false, campaignsError: 'Campaign data could not be loaded.',
        ads: [], adsLoading: false, adsAvailable: false, adsError: 'Campaign data could not be loaded.',
      });
      return [];
    } finally {
      set({ campaignsLoading: false });
    }
  },

  fetchAds: async (campaignId) => {
    if (!IS_LIVE_ENVIRONMENT) return;
    if (!campaignId) {
      set({ ads: [], adsLoading: false, adsAvailable: true, adsError: null });
      return;
    }

    set({ ads: [], adsLoading: true, adsAvailable: false, adsError: null });
    try {
      const { data } = await apiClient.request<{ ads?: unknown[] }>(
        '/api/v1/campaign/ads',
        { query: { campaignId } },
      );
      if (!Array.isArray(data.ads)) throw new Error('Invalid campaign ad response');
      const rows = data.ads;
      const mapped = rows.map(mapAdRow).filter((ad): ad is AdCreative => ad !== null);
      if (get().selectedCampaignId !== campaignId) return;
      set({
        ads: mapped,
        adsAvailable: mapped.length === rows.length,
        adsError: mapped.length === rows.length ? null : 'Some ad drafts could not be displayed.',
      });
    } catch {
      if (get().selectedCampaignId === campaignId) {
        set({ ads: [], adsAvailable: false, adsError: 'Campaign ad drafts could not be loaded.' });
      }
    } finally {
      if (get().selectedCampaignId === campaignId) set({ adsLoading: false });
    }
  },

  fetchBooths: async (campaignId) => {
    if (!IS_LIVE_ENVIRONMENT) return;
    if (!campaignId) {
      set({ booths: [], boothsLoading: false, boothsAvailable: true, boothsError: null });
      return;
    }

    set({ booths: [], boothsLoading: true, boothsAvailable: false, boothsError: null });
    try {
      const { data } = await apiClient.request<{ booths?: unknown[] }>(
        '/api/v1/campaign/booths',
        { query: { campaignId } },
      );
      if (!Array.isArray(data.booths)) throw new Error('Invalid booth response');
      const rows = data.booths;
      const mapped = rows.map(mapBoothRow).filter((booth): booth is BoothStrategy => booth !== null);
      const hasInvalidRows = mapped.length !== rows.length;
      if (get().selectedCampaignId !== campaignId) return;
      set({
        booths: mapped,
        boothsAvailable: !hasInvalidRows,
        boothsError: hasInvalidRows ? 'Some booth records could not be displayed.' : null,
      });
    } catch {
      if (get().selectedCampaignId === campaignId) {
        set({ booths: [], boothsAvailable: false, boothsError: 'Booth data could not be loaded.' });
      }
    } finally {
      if (get().selectedCampaignId === campaignId) set({ boothsLoading: false });
    }
  },

  fetchVolunteers: async (campaignId) => {
    if (!IS_LIVE_ENVIRONMENT) return;
    if (!campaignId) {
      set({ volunteers: [], volunteersLoading: false, volunteersAvailable: true, volunteersError: null });
      return;
    }

    set({ volunteers: [], volunteersLoading: true, volunteersAvailable: false, volunteersError: null });
    try {
      const { data } = await apiClient.request<{ volunteers?: unknown[] }>(
        '/api/v1/campaign/volunteers',
        { query: { campaignId } },
      );
      if (!Array.isArray(data.volunteers)) throw new Error('Invalid worker response');
      const rows = data.volunteers;
      const mapped = rows.map(mapVolunteerRow).filter((volunteer): volunteer is Volunteer => volunteer !== null);
      const hasInvalidRows = mapped.length !== rows.length;
      if (get().selectedCampaignId !== campaignId) return;
      set({
        volunteers: mapped,
        volunteersAvailable: !hasInvalidRows,
        volunteersError: hasInvalidRows ? 'Some worker records could not be displayed.' : null,
      });
    } catch {
      if (get().selectedCampaignId === campaignId) {
        set({ volunteers: [], volunteersAvailable: false, volunteersError: 'Worker data could not be loaded.' });
      }
    } finally {
      if (get().selectedCampaignId === campaignId) set({ volunteersLoading: false });
    }
  },

  loadCampaignWorkspace: async () => {
    if (!IS_LIVE_ENVIRONMENT) {
      await get().fetchPricing();
      return;
    }

    const [, , , , campaigns] = await Promise.all([
      get().fetchPricing(),
      get().fetchWallet(),
      get().fetchWalletTransactions(),
      get().fetchOBDBroadcasts(),
      get().fetchCampaigns(),
    ]);
    if (!get().campaignsAvailable) {
      const message = get().campaignsError || 'Campaign data could not be loaded.';
      set({
        booths: [], boothsLoading: false, boothsAvailable: false, boothsError: message,
        volunteers: [], volunteersLoading: false, volunteersAvailable: false, volunteersError: message,
      });
      return;
    }

    const selectedCampaign = campaigns.find((item) => item.id === get().selectedCampaignId);
    const campaign = selectedCampaign || campaigns.find((item) => item.status === 'active') || campaigns[0];
    set({ selectedCampaignId: campaign?.id || '' });
    if (!campaign) {
      set({
        ads: [], adsLoading: false, adsAvailable: true, adsError: null,
        booths: [], boothsLoading: false, boothsAvailable: true, boothsError: null,
        volunteers: [], volunteersLoading: false, volunteersAvailable: true, volunteersError: null,
      });
      return;
    }

    await Promise.all([get().fetchAds(campaign.id), get().fetchBooths(campaign.id), get().fetchVolunteers(campaign.id)]);
  },

  selectCampaign: async (campaignId) => {
    const campaign = get().campaigns.find((item) => item.id === campaignId);
    if (!campaign) throw new Error('Choose a campaign available to this account.');
    set({
      selectedCampaignId: campaign.id,
      ads: IS_LIVE_ENVIRONMENT ? [] : get().ads,
      adsLoading: false,
      adsAvailable: !IS_LIVE_ENVIRONMENT,
      adsError: null,
      booths: IS_LIVE_ENVIRONMENT ? [] : SEED_BOOTHS.filter((booth) => booth.campaignId === campaign.id),
      boothsLoading: false,
      boothsAvailable: !IS_LIVE_ENVIRONMENT,
      boothsError: null,
      volunteers: IS_LIVE_ENVIRONMENT ? [] : SEED_VOLUNTEERS.filter((volunteer) => volunteer.campaignId === campaign.id),
      volunteersLoading: false,
      volunteersAvailable: !IS_LIVE_ENVIRONMENT,
      volunteersError: null,
    });
    if (IS_LIVE_ENVIRONMENT) {
      await Promise.all([get().fetchAds(campaign.id), get().fetchBooths(campaign.id), get().fetchVolunteers(campaign.id)]);
    }
  },

  fetchPricing: async () => {
    if (IS_LIVE_ENVIRONMENT) set({ pricingAvailable: false });
    try {
      const { data: json } = await apiClient.request<{ pricing?: CampaignServicePricing }>(
        '/api/v1/campaign/pricing',
        { authPolicy: 'public' },
      );
      if (json.pricing) {
        set({ pricing: json.pricing, pricingAvailable: true });
        return;
      }
    } catch {
      // A production client must not present cached demo pricing as a live quote.
    }
    if (IS_LIVE_ENVIRONMENT) set({ pricingAvailable: false });
  },

  fetchWallet: async () => {
    if (IS_LIVE_ENVIRONMENT) set({ walletAvailable: false });
    try {
      const { data: json } = await apiClient.request<{ wallet?: CampaignWallet }>('/api/v1/campaign/wallet');
      if (json.wallet) {
        set({ wallet: json.wallet, walletAvailable: true });
        return;
      }
    } catch {
      // No wallet is displayed as current unless the API returns it successfully.
    }
    if (IS_LIVE_ENVIRONMENT) set({ walletAvailable: false });
  },

  fetchWalletTransactions: async () => {
    if (IS_LIVE_ENVIRONMENT) set({ walletTransactionsAvailable: false, walletTransactionsLoading: true, walletTransactionsError: null });
    try {
      const { data: json } = await apiClient.request<{ transactions?: WalletTransaction[] }>(
        '/api/v1/campaign/wallet/transactions',
      );
      if (!Array.isArray(json.transactions)) throw new Error('Invalid wallet transaction response');
      set({ walletTransactions: json.transactions, walletTransactionsAvailable: true, walletTransactionsError: null });
    } catch {
      if (IS_LIVE_ENVIRONMENT) {
        set({ walletTransactions: [], walletTransactionsAvailable: false, walletTransactionsError: 'Transaction history is unavailable.' });
      }
    } finally {
      if (IS_LIVE_ENVIRONMENT) set({ walletTransactionsLoading: false });
    }
  },

  fetchOBDBroadcasts: async () => {
    if (IS_LIVE_ENVIRONMENT) set({ obdBroadcastsAvailable: false, obdBroadcastsLoading: true, obdBroadcastsError: null });
    try {
      const { data: json } = await apiClient.request<{ broadcasts?: OBDBroadcastJob[] }>(
        '/api/v1/campaign/obd/broadcasts',
      );
      if (!Array.isArray(json.broadcasts)) throw new Error('Invalid broadcast response');
      set({ obdBroadcasts: json.broadcasts, obdBroadcastsAvailable: true, obdBroadcastsError: null });
    } catch {
      if (IS_LIVE_ENVIRONMENT) {
        set({ obdBroadcasts: [], obdBroadcastsAvailable: false, obdBroadcastsError: 'Broadcast history is unavailable.' });
      }
    } finally {
      if (IS_LIVE_ENVIRONMENT) set({ obdBroadcastsLoading: false });
    }
  },

  rechargeWallet: async (amountINR: number) => {
    if (IS_LIVE_ENVIRONMENT) {
      return {
        success: false,
        message: 'Payment checkout is not connected. No payment was requested and no wallet balance was changed.',
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/campaign/wallet/recharge/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountINR,
          paymentReference: `pay_rzp_${Date.now()}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success === true && json.wallet) {
          set({ wallet: json.wallet, walletAvailable: true });
          get().fetchWalletTransactions();
          return { success: true, message: json.message };
        }
      }
    } catch {}

    // Offline / fallback credit
    const current = get().wallet;
    const newBal = current.balanceINR + amountINR;
    const updatedWallet: CampaignWallet = {
      ...current,
      balanceINR: newBal,
      totalRechargedINR: current.totalRechargedINR + amountINR,
      updatedAt: new Date().toISOString(),
    };
    const newTx: WalletTransaction = {
      id: `tx-${Date.now().toString(36)}`,
      walletId: current.id,
      politicianId: 'pp1',
      type: 'credit',
      amountINR,
      serviceType: 'recharge',
      referenceId: `pay_mock_${Date.now()}`,
      description: `Wallet Recharge via UPI (₹${amountINR.toLocaleString('en-IN')})`,
      balanceAfterINR: newBal,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      wallet: updatedWallet,
      walletAvailable: true,
      walletTransactions: [newTx, ...s.walletTransactions],
    }));

    return {
      success: true,
      message: `Successfully recharged ₹${amountINR.toLocaleString('en-IN')}! Available balance: ₹${newBal.toLocaleString('en-IN')}`,
    };
  },

  dispatchVoiceOBD: async (title, targetSegment, audioUrl) => {
    const campaign = get().campaigns.find((item) => item.id === get().selectedCampaignId)
      || get().campaigns.find((item) => item.status === 'active')
      || get().campaigns[0];
    if (IS_LIVE_ENVIRONMENT && !campaign) {
      return { success: false, message: 'Load a persisted campaign before scheduling a voice broadcast.' };
    }
    if (IS_LIVE_ENVIRONMENT && (!get().pricingAvailable || !get().walletAvailable)) {
      return {
        success: false,
        message: 'Voice broadcast is unavailable because verified campaign pricing or wallet data has not loaded.',
      };
    }

    const rate = get().pricing.voiceObd.finalRatePerCallINR;
    const totalCost = Math.round(targetSegment.voterCount * rate);
    const wallet = get().wallet;

    if (wallet.balanceINR < totalCost) {
      const deficit = totalCost - wallet.balanceINR;
      return {
        success: false,
        message: `Insufficient wallet balance. Available: ₹${wallet.balanceINR.toLocaleString('en-IN')}, Required: ₹${totalCost.toLocaleString('en-IN')}. Please top-up ₹${deficit.toLocaleString('en-IN')} to proceed.`,
      };
    }

    try {
      const { data: json } = await apiClient.request<{
        success?: boolean;
        job?: OBDBroadcastJob;
        wallet?: CampaignWallet;
        message?: string;
        warning?: string;
      }>('/api/v1/campaign/obd/dispatch', {
        method: 'POST',
        body: {
          campaignId: campaign?.id || 'c1',
          title,
          targetSegment,
          audioUrl: audioUrl || 'https://assets.kshetra.app/audio/c1-manifesto.mp3',
        },
      });

      if (json.success === true && json.job && json.wallet) {
        set((s) => ({
          wallet: json.wallet!,
          walletAvailable: true,
          obdBroadcasts: [json.job!, ...s.obdBroadcasts],
        }));
        get().fetchWalletTransactions();
        return {
          success: true,
          message: json.message || 'The voice provider accepted the broadcast.',
          warning: json.warning,
          remainingBalance: json.wallet.balanceINR,
        };
      }
    } catch {}

    if (IS_LIVE_ENVIRONMENT) {
      return {
        success: false,
        message: 'The voice provider did not confirm this broadcast. No local delivery was recorded.',
      };
    }

    // Offline / dev fallback: deduct and record job
    const newBal = wallet.balanceINR - totalCost;
    const updatedWallet: CampaignWallet = {
      ...wallet,
      balanceINR: newBal,
      totalSpentINR: wallet.totalSpentINR + totalCost,
      updatedAt: new Date().toISOString(),
    };

    const newJob: OBDBroadcastJob = {
      id: `obd-${Date.now().toString(36)}`,
      campaignId: 'c1',
      politicianId: 'pp1',
      title,
      audioUrl: audioUrl || 'https://assets.kshetra.app/audio/c1-manifesto.mp3',
      audioDurationSeconds: 30,
      targetSegment,
      totalRecipients: targetSegment.voterCount,
      ratePerCallINR: rate,
      totalCostINR: totalCost,
      status: 'calling',
      answeredCount: 0,
      busyCount: 0,
      unreachableCount: 0,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const newTx: WalletTransaction = {
      id: `tx-${Date.now().toString(36)}`,
      walletId: wallet.id,
      politicianId: 'pp1',
      type: 'debit',
      amountINR: totalCost,
      serviceType: 'voice_obd',
      referenceId: newJob.id,
      description: `Voice Call: ${title} (${targetSegment.voterCount.toLocaleString('en-IN')} voters)`,
      balanceAfterINR: newBal,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      wallet: updatedWallet,
      walletAvailable: true,
      walletTransactions: [newTx, ...s.walletTransactions],
      obdBroadcasts: [newJob, ...s.obdBroadcasts],
    }));

    // Simulate completion in 4s
    setTimeout(() => {
      set((s) => ({
        obdBroadcasts: s.obdBroadcasts.map((b) =>
          b.id === newJob.id
            ? {
                ...b,
                status: 'completed',
                answeredCount: Math.floor(targetSegment.voterCount * 0.88),
                busyCount: Math.floor(targetSegment.voterCount * 0.08),
                unreachableCount: Math.floor(targetSegment.voterCount * 0.04),
                completedAt: new Date().toISOString(),
              }
            : b,
        ),
      }));
    }, 4000);

    return {
      success: true,
      message: `Voice call dispatched to ${targetSegment.voterCount.toLocaleString('en-IN')} voters. ₹${totalCost.toLocaleString('en-IN')} deducted.`,
      remainingBalance: newBal,
    };
  },

  checkKshetraUser: async (phone: string) => {
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (cleaned.length !== 10) {
      throw new Error('Enter a valid 10-digit phone number.');
    }

    if (!IS_LIVE_ENVIRONMENT) {
      const localMatch = get().volunteers.find((v) => v.phone.replace(/\D/g, '').slice(-10) === cleaned);
      if (localMatch) {
        return { isKshetraUser: !!localMatch.isKshetraUser, displayName: localMatch.name };
      }
    }

    const campaign = get().campaigns.find((item) => item.id === get().selectedCampaignId)
      || get().campaigns.find((item) => item.status === 'active')
      || get().campaigns[0];
    if (IS_LIVE_ENVIRONMENT && !campaign) {
      throw new Error('Load a persisted campaign before checking a campaign contact.');
    }

    try {
      const { data } = await apiClient.request<{ isKshetraUser?: boolean; displayName?: string }>(
        '/api/v1/campaign/users/check-kshetra',
        { query: { phone: cleaned, campaignId: campaign?.id } },
      );
      return { isKshetraUser: data.isKshetraUser === true, displayName: data.displayName };
    } catch {
      if (IS_LIVE_ENVIRONMENT) {
        throw new Error('Account registration could not be verified. Check the connection and try again.');
      }
    }

    // Default: If phone starts with 9848 or 9849, treat as active demo Poligram user
    const isMockRegistered = cleaned.startsWith('9848') || cleaned.startsWith('9876');
    return { isKshetraUser: isMockRegistered, displayName: isMockRegistered ? 'Verified Poligram User' : undefined };
  },

  assignBoothIncharge: async (boothId, agentName, agentPhone, isKshetraUser) => {
    if (IS_LIVE_ENVIRONMENT) {
      const { data } = await apiClient.request<{ success: boolean; booth?: unknown }>(
        `/api/v1/campaign/booths/${encodeURIComponent(boothId)}`,
        {
          method: 'PATCH',
          body: { agentName, agentPhone, isKshetraUser },
        },
      );
      const persisted = mapBoothRow(data.booth);
      if (data.success !== true || !persisted) {
        throw new Error('The campaign service did not confirm saving this booth assignment.');
      }
      set((s) => ({
        booths: s.booths.map((booth) => booth.id === persisted.id ? persisted : booth),
      }));
      return;
    }

    set((s) => ({
      booths: s.booths.map((b) =>
        b.id === boothId || b.boothId === boothId
          ? {
              ...b,
              agentName,
              agentPhone,
              isKshetraUser,
              priority: b.priority === 'critical' ? 'high' : b.priority,
              status: b.status === 'not_started' ? 'canvassing' : b.status,
            }
          : b,
      ),
    }));

    if (!IS_LIVE_ENVIRONMENT) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/campaign/booths/${boothId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentName, agentPhone, isKshetraUser }),
        });
      } catch {}
    }
  },

  addCadre: async (cadre) => {
    if (IS_LIVE_ENVIRONMENT) {
      const campaign = get().campaigns.find((item) => item.id === get().selectedCampaignId)
        || get().campaigns.find((item) => item.status === 'active')
        || get().campaigns[0];
      if (!campaign) {
        throw new Error('Load a persisted campaign before adding a campaign worker.');
      }

      const response = await apiClient.request<{
        success: boolean;
        volunteer?: {
          id: string;
          user_id: string | null;
          campaign_id: string;
          name: string;
          phone: string;
          role: Volunteer['role'];
          status: Volunteer['status'];
          assigned_booths: string[];
          assigned_wards: number[];
          created_at?: string;
        };
      }>('/api/v1/campaign/volunteers', {
        method: 'POST',
        body: {
          campaignId: campaign.id,
          name: cadre.name,
          phone: cadre.phone,
          role: cadre.role,
          assignedBooths: cadre.assignedBooths,
          assignedWards: [],
          isKshetraUser: cadre.isKshetraUser,
        },
      });

      const persisted = response.data.volunteer;
      if (response.data.success !== true || !persisted) {
        throw new Error('The campaign service did not confirm saving this worker.');
      }

      const savedCadre: Volunteer = {
        id: persisted.id,
        userId: persisted.user_id || '',
        campaignId: persisted.campaign_id,
        name: persisted.name,
        phone: persisted.phone,
        role: persisted.role,
        status: persisted.status,
        assignedBooths: persisted.assigned_booths || [],
        assignedWards: persisted.assigned_wards || [],
        isKshetraUser: Boolean(persisted.user_id),
        tasksCompleted: 0,
        hoursLogged: 0,
        rating: 0,
        joinedAt: persisted.created_at || new Date().toISOString(),
        lastActiveAt: persisted.created_at || new Date().toISOString(),
      };
      set((s) => ({ volunteers: [savedCadre, ...s.volunteers] }));
      return;
    }

    const newCadre: Volunteer = {
      id: `v-${Date.now().toString(36)}`,
      userId: `u-${Date.now()}`,
      campaignId: 'c1',
      name: cadre.name,
      phone: cadre.phone,
      role: cadre.role,
      status: 'active',
      assignedBooths: cadre.assignedBooths,
      assignedWards: [1],
      isKshetraUser: cadre.isKshetraUser,
      tasksCompleted: 0,
      hoursLogged: 0,
      rating: 5.0,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    set((s) => ({ volunteers: [newCadre, ...s.volunteers] }));

    try {
      await fetch(`${API_BASE_URL}/api/v1/campaign/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCadre),
      });
    } catch {}
  },

  dispatchObdBroadcast: async (title, voterCount) => {
    if (IS_LIVE_ENVIRONMENT) {
      return {
        success: false,
        cost: null,
        message: 'The legacy voice broadcast endpoint is not connected to the production delivery service.',
      };
    }

    const rate = get().pricing.voiceObd.finalRatePerCallINR;
    const cost = Math.round(voterCount * rate);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/campaign/obd-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          targetSegment: { type: 'constituency', voterCount },
        }),
      });
      if (res.ok) {
        const json = await res.json();
      if (json.success === true) return { success: true, cost, message: json.message };
      }
    } catch {}

    if (IS_LIVE_ENVIRONMENT) {
      return {
        success: false,
        cost,
        message: 'The campaign service did not confirm the broadcast. Nothing was queued.',
      };
    }

    return {
      success: true,
      cost,
      message: `Voice call queued for ${voterCount.toLocaleString('en-IN')} voters. Estimated cost: ₹${cost.toLocaleString('en-IN')}`,
    };
  },

  getCampaignAnalytics: (campaignId) => {
    const campaign = get().getCampaign(campaignId);
    const ads = get().getAdsForCampaign(campaignId);
    const vols = get().getVolunteersForCampaign(campaignId);
    const booths = get().getBoothsForCampaign(campaignId);
    const adsWithPerformance = ads.filter((ad) =>
      ad.performance !== null && ad.performance !== undefined &&
      Number.isFinite(ad.performance.roi) &&
      Number.isFinite(ad.performance.impressions) && ad.performance.impressions >= 0 &&
      Number.isFinite(ad.performance.clicks) && ad.performance.clicks >= 0,
    );
    const hasCompleteAdPerformance = ads.length > 0 && adsWithPerformance.length === ads.length;
    const totalAdImpressions = hasCompleteAdPerformance
      ? adsWithPerformance.reduce((total, ad) => total + ad.performance!.impressions, 0)
      : 0;
    const totalAdClicks = hasCompleteAdPerformance
      ? adsWithPerformance.reduce((total, ad) => total + ad.performance!.clicks, 0)
      : 0;
    return {
      campaignId, period: 'total',
      totalSpend: campaign?.spentBudgetINR ?? null,
      totalImpressions: campaign?.impressions ?? null,
      totalReach: campaign?.reach ?? null,
      totalEngagements: campaign?.engagements ?? null,
      totalConversions: campaign?.conversions ?? null,
      overallCTR: hasCompleteAdPerformance && totalAdImpressions > 0
        ? Math.round((totalAdClicks / totalAdImpressions) * 10000) / 100
        : null,
      overallROI: IS_LIVE_ENVIRONMENT ? null : 285,
      costPerVoterReached: campaign?.reach && campaign.spentBudgetINR !== undefined
        ? Math.round((campaign.spentBudgetINR / campaign.reach) * 100) / 100
        : null,
      sentimentTrend: [],
      topPerformingAds: !get().adsAvailable
        ? null
        : ads.length === 0
          ? []
          : hasCompleteAdPerformance
            ? [...adsWithPerformance]
              .sort((a, b) => b.performance!.roi - a.performance!.roi)
              .slice(0, 5)
              .map((ad) => ({
                adId: ad.id,
                name: ad.name,
                roi: ad.performance!.roi,
                impressions: ad.performance!.impressions,
              }))
            : null,
      segmentPerformance: [],
      geographicHeatmap: [],
      volunteerMetrics: get().volunteersAvailable
        ? {
            totalVolunteers: vols.length,
            activeVolunteers: vols.filter((v) => v.status === 'active').length,
            totalHours: vols.reduce((total, volunteer) => total + volunteer.hoursLogged, 0),
            householdsReached: null,
          }
        : null,
      boothReadiness: get().boothsAvailable
        ? {
            total: booths.length,
            ready: booths.filter((booth) => booth.status === 'ready').length,
            inProgress: booths.filter((booth) => booth.status === 'canvassing').length,
            notStarted: booths.filter((booth) => booth.status === 'not_started').length,
          }
        : null,
      channelBreakdown: [],
      dailyMetrics: [],
    };
  },

  getRevenueFlow: () => get().revenueData,

  createCampaign: async (campaign) => {
    if (!campaign.name?.trim() || !campaign.stateCode?.trim() || !campaign.startDate || !campaign.endDate) {
      throw new Error('Campaign name, state, start date, and end date are required.');
    }

    if (IS_LIVE_ENVIRONMENT) {
      const { data } = await apiClient.request<{ campaign?: unknown }>(
        '/api/v1/campaign/campaigns',
        {
          method: 'POST',
          body: {
            name: campaign.name.trim(),
            description: campaign.description?.trim() || '',
            type: campaign.type || 'awareness',
            stateCode: campaign.stateCode.trim().toUpperCase(),
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            totalBudgetINR: campaign.totalBudgetINR,
            targetConstituencies: campaign.targetConstituencies || [],
            targetDistricts: campaign.targetDistricts || [],
          },
        },
      );
      const persisted = mapCampaignRow(data.campaign);
      if (!persisted) throw new Error('The campaign service did not return the saved campaign.');
      set((state) => ({
        campaigns: [persisted, ...state.campaigns.filter((item) => item.id !== persisted.id)],
        selectedCampaignId: persisted.id,
        booths: [], boothsLoading: false, boothsAvailable: false, boothsError: null,
        volunteers: [], volunteersLoading: false, volunteersAvailable: false, volunteersError: null,
        campaignsAvailable: true,
        campaignsError: null,
      }));
      return persisted;
    }

    const created: Campaign = {
      id: `c-${Date.now().toString(36)}`,
      politicianId: campaign.politicianId || '',
      politicianName: campaign.politicianName,
      party: campaign.party,
      name: campaign.name.trim(),
      description: campaign.description || '',
      type: campaign.type || 'awareness',
      status: 'draft',
      stateCode: campaign.stateCode.trim().toUpperCase(),
      targetConstituencies: campaign.targetConstituencies || [],
      targetDistricts: campaign.targetDistricts || [],
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      totalBudgetINR: campaign.totalBudgetINR,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      campaigns: [created, ...state.campaigns],
      selectedCampaignId: created.id,
      booths: [], boothsAvailable: true,
      volunteers: [], volunteersAvailable: true,
    }));
    return created;
  },

  updateCampaignStatus: (campaignId, status) => {
    if (IS_LIVE_ENVIRONMENT) throw new Error('Campaign status updates are not connected to a persisted service yet.');
    set((s) => ({ campaigns: s.campaigns.map((c) => c.id === campaignId ? { ...c, status, updatedAt: new Date().toISOString() } : c) }));
  },

  createAd: async (ad) => {
    const campaignId = get().selectedCampaignId;
    if (!campaignId) throw new Error('Choose a campaign before creating an ad draft.');
    if (IS_LIVE_ENVIRONMENT) {
      const { data } = await apiClient.request<{ ad?: unknown }>(
        '/api/v1/campaign/ads',
        {
          method: 'POST',
          body: {
            campaignId,
            ...ad,
          },
        },
      );
      const saved = mapAdRow(data.ad);
      if (!saved || saved.campaignId !== campaignId || saved.status !== 'draft') {
        throw new Error('The campaign service did not confirm the saved ad draft.');
      }
      set((state) => ({ ads: [saved, ...state.ads.filter((item) => item.id !== saved.id)], adsAvailable: true, adsError: null }));
      return saved;
    }

    const now = new Date().toISOString();
    const saved: AdCreative = {
      id: `ad-${Date.now()}`,
      campaignId,
      format: ad.format,
      status: 'draft',
      name: ad.name,
      headline: ad.headline,
      body: ad.body || '',
      callToAction: ad.callToAction || '',
      mediaUrls: ad.mediaUrls || [],
      thumbnailUrl: ad.thumbnailUrl,
      landingUrl: ad.landingUrl,
      disclosureText: ad.disclosureText,
      paidForBy: ad.paidForBy,
      isECICompliant: false,
      performance: null,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ ads: [saved, ...state.ads] }));
    return saved;
  },

  pauseAd: (adId) => {
    if (IS_LIVE_ENVIRONMENT) throw new Error('Ad status changes are unavailable until the persisted review service is connected.');
    set((s) => ({ ads: s.ads.map((a) => a.id === adId ? { ...a, status: 'paused' as const } : a) }));
  },

  addVolunteer: (volunteer) => {
    if (IS_LIVE_ENVIRONMENT) throw new Error('Use the persisted campaign cadre workflow to add a worker.');
    set((s) => ({ volunteers: [...s.volunteers, { id: `v-${Date.now()}`, userId: '', campaignId: '', name: '', phone: '', role: 'canvasser', status: 'active', assignedBooths: [], assignedWards: [], tasksCompleted: 0, hoursLogged: 0, rating: 0, joinedAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), ...volunteer } as Volunteer] }));
  },

  updateBoothStatus: async (boothId, status) => {
    if (IS_LIVE_ENVIRONMENT) {
      const { data } = await apiClient.request<{ success: boolean; booth?: unknown }>(
        `/api/v1/campaign/booths/${encodeURIComponent(boothId)}`,
        { method: 'PATCH', body: { status } },
      );
      const persisted = mapBoothRow(data.booth);
      if (data.success !== true || !persisted) {
        throw new Error('The campaign service did not confirm the booth status update.');
      }
      set((state) => ({ booths: state.booths.map((booth) => booth.id === persisted.id ? persisted : booth) }));
      return;
    }
    set((state) => ({
      booths: state.booths.map((booth) => booth.id === boothId ? { ...booth, status, updatedAt: new Date().toISOString() } : booth),
    }));
  },

  logCanvassing: (record) => {
    if (IS_LIVE_ENVIRONMENT) throw new Error('Canvassing records are unavailable until their persistence workflow is connected.');
    set((s) => ({ canvassingRecords: [...s.canvassingRecords, { id: `cr-${Date.now()}`, campaignId: '', volunteerId: '', boothId: '', boothName: '', constituencyAcNo: 0, status: 'in_progress', householdsVisited: 0, householdsTotal: 0, supporterCount: 0, oppositionCount: 0, undecidedCount: 0, issuesRaised: [], notes: '', startTime: new Date().toISOString(), createdAt: new Date().toISOString(), ...record } as CanvassingRecord] }));
  },
}));
