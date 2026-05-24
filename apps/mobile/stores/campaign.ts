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
  VoterSegment,
} from '../lib/campaignTypes';

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
  { id: 'v1', userId: 'u-v1', campaignId: 'c1', name: 'Ravi Teja', phone: '+919876543210', role: 'canvasser', status: 'active', assignedBooths: ['B-56-001', 'B-56-002'], assignedWards: [1, 2], constituencyAcNo: 56, tasksCompleted: 23, hoursLogged: 45, rating: 4.5, joinedAt: '2026-05-05', lastActiveAt: '2026-05-23' },
  { id: 'v2', userId: 'u-v2', campaignId: 'c1', name: 'Lakshmi Devi', phone: '+919876543211', role: 'booth_agent', status: 'active', assignedBooths: ['B-56-003'], assignedWards: [3], constituencyAcNo: 56, tasksCompleted: 12, hoursLogged: 28, rating: 4.8, joinedAt: '2026-05-08', lastActiveAt: '2026-05-24' },
  { id: 'v3', userId: 'u-v3', campaignId: 'c1', name: 'Mohammed Saleem', phone: '+919876543212', role: 'social_media', status: 'active', assignedBooths: [], assignedWards: [], tasksCompleted: 35, hoursLogged: 60, rating: 4.2, joinedAt: '2026-05-03', lastActiveAt: '2026-05-24' },
];

// ─── Seed Booth Strategies ───
const SEED_BOOTHS: BoothStrategy[] = [
  { id: 'bs1', campaignId: 'c1', boothId: 'B-56-001', boothName: 'Nampally Govt School', boothNumber: '001', constituencyAcNo: 56, wardNo: 1, totalVoters: 1200, estimatedTurnout: 68.5, targetVotes: 650, historicalResults: [{ year: 2023, party: 'INC', votes: 580 }, { year: 2018, party: 'BRS', votes: 620 }], assignedVolunteers: ['v1'], priority: 'high', status: 'canvassing', canvassingCompletion: 72, supportEstimate: 62, notes: 'Strong INC base, some BRS loyalists remain' },
  { id: 'bs2', campaignId: 'c1', boothId: 'B-56-002', boothName: 'Abids Community Hall', boothNumber: '002', constituencyAcNo: 56, wardNo: 1, totalVoters: 1450, estimatedTurnout: 65.0, targetVotes: 720, historicalResults: [{ year: 2023, party: 'INC', votes: 680 }], assignedVolunteers: ['v1'], priority: 'critical', status: 'canvassing', canvassingCompletion: 45, supportEstimate: 48, notes: 'Swing booth — margin was only 40 votes in 2023' },
  { id: 'bs3', campaignId: 'c1', boothId: 'B-56-003', boothName: 'Sultan Bazar School', boothNumber: '003', constituencyAcNo: 56, wardNo: 2, totalVoters: 980, estimatedTurnout: 72.0, targetVotes: 550, historicalResults: [], assignedVolunteers: ['v2'], agentId: 'v2', agentName: 'Lakshmi Devi', agentPhone: '+919876543211', priority: 'medium', status: 'ready', canvassingCompletion: 100, supportEstimate: 71, notes: 'Well-covered, agent assigned' },
];

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
    { stateCode: 'TS', revenue: 1200000 },
    { stateCode: 'AP', revenue: 900000 },
    { stateCode: 'KA', revenue: 1100000 },
    { stateCode: 'MH', revenue: 800000 },
    { stateCode: 'UP', revenue: 500000 },
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

// ─── Store ───
interface CampaignState {
  campaigns: Campaign[];
  ads: AdCreative[];
  abTests: ABTest[];
  volunteers: Volunteer[];
  booths: BoothStrategy[];
  canvassingRecords: CanvassingRecord[];
  revenueData: RevenueFlowData;

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
  getRevenueFlow: () => RevenueFlowData;

  // Actions
  createCampaign: (campaign: Partial<Campaign>) => void;
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => void;
  createAd: (ad: Partial<AdCreative>) => void;
  pauseAd: (adId: string) => void;
  addVolunteer: (volunteer: Partial<Volunteer>) => void;
  updateBoothStatus: (boothId: string, status: string) => void;
  logCanvassing: (record: Partial<CanvassingRecord>) => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: SEED_CAMPAIGNS,
  ads: SEED_ADS,
  abTests: SEED_AB_TESTS,
  volunteers: SEED_VOLUNTEERS,
  booths: SEED_BOOTHS,
  canvassingRecords: [],
  revenueData: SEED_REVENUE,

  getCampaign: (id) => get().campaigns.find((c) => c.id === id),
  getCampaignsForPolitician: (politicianId) => get().campaigns.filter((c) => c.politicianId === politicianId),
  getActiveCampaigns: () => get().campaigns.filter((c) => c.status === 'active'),
  getAdsForCampaign: (campaignId) => get().ads.filter((a) => a.campaignId === campaignId),
  getActiveAds: () => get().ads.filter((a) => a.status === 'active'),
  getVolunteersForCampaign: (campaignId) => get().volunteers.filter((v) => v.campaignId === campaignId),
  getBoothsForCampaign: (campaignId) => get().booths.filter((b) => b.campaignId === campaignId),
  getCriticalBooths: (campaignId) => get().booths.filter((b) => b.campaignId === campaignId && (b.priority === 'critical' || b.priority === 'high')),
  getABTestsForCampaign: (campaignId) => get().abTests.filter((t) => t.campaignId === campaignId),

  getCampaignAnalytics: (campaignId) => {
    const campaign = get().getCampaign(campaignId);
    const ads = get().getAdsForCampaign(campaignId);
    const vols = get().getVolunteersForCampaign(campaignId);
    const booths = get().getBoothsForCampaign(campaignId);
    return {
      campaignId, period: 'total',
      totalSpend: campaign?.spentBudgetINR || 0,
      totalImpressions: campaign?.impressions || 0,
      totalReach: campaign?.reach || 0,
      totalEngagements: campaign?.engagements || 0,
      totalConversions: campaign?.conversions || 0,
      overallCTR: campaign && campaign.impressions > 0 ? Math.round((campaign.engagements / campaign.impressions) * 10000) / 100 : 0,
      overallROI: 285,
      costPerVoterReached: campaign && campaign.reach > 0 ? Math.round((campaign.spentBudgetINR / campaign.reach) * 100) / 100 : 0,
      sentimentTrend: [],
      topPerformingAds: ads.sort((a, b) => (b.performance?.roi || 0) - (a.performance?.roi || 0)).slice(0, 5).map((a) => ({ adId: a.id, name: a.name, roi: a.performance?.roi || 0, impressions: a.performance?.impressions || 0 })),
      segmentPerformance: [],
      geographicHeatmap: [],
      volunteerMetrics: { totalVolunteers: vols.length, activeVolunteers: vols.filter((v) => v.status === 'active').length, totalHours: vols.reduce((s, v) => s + v.hoursLogged, 0), householdsReached: 0 },
      boothReadiness: { total: booths.length, ready: booths.filter((b) => b.status === 'ready').length, inProgress: booths.filter((b) => b.status === 'canvassing').length, notStarted: booths.filter((b) => b.status === 'not_started').length },
      channelBreakdown: [],
      dailyMetrics: [],
    };
  },

  getRevenueFlow: () => get().revenueData,

  createCampaign: (campaign) => set((s) => ({ campaigns: [...s.campaigns, { id: `c-${Date.now()}`, politicianId: '', politicianName: '', name: '', description: '', type: 'outreach', status: 'draft', stateCode: '', targetConstituencies: [], targetDistricts: [], startDate: '', endDate: '', totalBudgetINR: 0, spentBudgetINR: 0, adCount: 0, volunteerCount: 0, boothsCovered: 0, totalBooths: 0, impressions: 0, reach: 0, engagements: 0, conversions: 0, sentimentScore: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...campaign } as Campaign] })),

  updateCampaignStatus: (campaignId, status) => set((s) => ({ campaigns: s.campaigns.map((c) => c.id === campaignId ? { ...c, status, updatedAt: new Date().toISOString() } : c) })),

  createAd: (ad) => set((s) => ({ ads: [...s.ads, { id: `ad-${Date.now()}`, campaignId: '', format: 'promoted_post', status: 'draft', name: '', headline: '', body: '', callToAction: '', mediaUrls: [], targeting: { segments: [], estimatedReach: 0, targetingType: 'demographic' }, budget: { type: 'daily', totalINR: 0, spentINR: 0, biddingStrategy: 'lowest_cost', costPerResult: 0 }, schedule: { startDate: '', endDate: '', activeDays: [], activeHours: { start: 6, end: 23 }, timezone: 'Asia/Kolkata' }, performance: { impressions: 0, reach: 0, clicks: 0, engagements: 0, shares: 0, ctr: 0, cpm: 0, cpc: 0, cpe: 0, frequency: 0, spend: 0, conversions: 0, conversionRate: 0, roi: 0, sentimentPositive: 0, sentimentNeutral: 0, sentimentNegative: 0, byDay: [], bySegment: [], byConstituency: [] }, disclosureText: '', paidForBy: '', isECICompliant: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...ad } as AdCreative] })),

  pauseAd: (adId) => set((s) => ({ ads: s.ads.map((a) => a.id === adId ? { ...a, status: 'paused' as const } : a) })),

  addVolunteer: (volunteer) => set((s) => ({ volunteers: [...s.volunteers, { id: `v-${Date.now()}`, userId: '', campaignId: '', name: '', phone: '', role: 'canvasser', status: 'active', assignedBooths: [], assignedWards: [], tasksCompleted: 0, hoursLogged: 0, rating: 0, joinedAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), ...volunteer } as Volunteer] })),

  updateBoothStatus: (boothId, status) => set((s) => ({ booths: s.booths.map((b) => b.id === boothId ? { ...b, status: status as any, updatedAt: new Date().toISOString() } : b) })),

  logCanvassing: (record) => set((s) => ({ canvassingRecords: [...s.canvassingRecords, { id: `cr-${Date.now()}`, campaignId: '', volunteerId: '', boothId: '', boothName: '', constituencyAcNo: 0, status: 'in_progress', householdsVisited: 0, householdsTotal: 0, supporterCount: 0, oppositionCount: 0, undecidedCount: 0, issuesRaised: [], notes: '', startTime: new Date().toISOString(), createdAt: new Date().toISOString(), ...record } as CanvassingRecord] })),
}));
