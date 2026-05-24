// ─── Campaign Manager & Ad Engine Types ───
// Covers: Campaign creation, ad targeting, budget management, voter segmentation,
// canvassing, volunteer management, booth-level strategy, political ad disclosure,
// WhatsApp/SMS connectors, campaign analytics, A/B testing

// ─── Enums ───

export type CampaignStatus = 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CampaignType = 'election' | 'awareness' | 'fundraising' | 'outreach' | 'issue_advocacy' | 'brand_building' | 'get_out_vote';

export type AdFormat = 'promoted_post' | 'banner' | 'video_ad' | 'carousel' | 'native_story' | 'constituency_spotlight' | 'push_notification' | 'sms_blast' | 'whatsapp_broadcast';

export type AdStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected' | 'expired';

export type TargetingType = 'demographic' | 'geographic' | 'interest' | 'behavioral' | 'lookalike' | 'retargeting' | 'custom_list';

export type BudgetType = 'daily' | 'lifetime' | 'per_impression' | 'per_click' | 'per_engagement';

export type BiddingStrategy = 'lowest_cost' | 'cost_cap' | 'bid_cap' | 'target_cost';

export type CanvassingStatus = 'not_started' | 'in_progress' | 'completed' | 'follow_up_needed';

export type VolunteerRole = 'canvasser' | 'booth_agent' | 'social_media' | 'logistics' | 'data_entry' | 'coordinator' | 'driver' | 'caller';

export type VolunteerStatus = 'active' | 'inactive' | 'suspended' | 'blacklisted';

export type ABTestStatus = 'running' | 'completed' | 'stopped';

export type VoterSegment = 'loyal_base' | 'swing_voter' | 'opposition_soft' | 'first_time_voter' | 'youth_18_25' | 'women' | 'senior_citizen' | 'urban' | 'rural' | 'sc_st' | 'minority' | 'high_education' | 'low_income' | 'farmer' | 'business_owner';

export type ChannelType = 'in_app' | 'push' | 'sms' | 'whatsapp' | 'email';

// ─── Configs ───

export const CAMPAIGN_TYPE_CONFIG: Record<CampaignType, { label: string; icon: string; color: string; suggestedDurationDays: number }> = {
  election: { label: 'Election Campaign', icon: 'flag', color: '#EF4444', suggestedDurationDays: 45 },
  awareness: { label: 'Awareness', icon: 'megaphone', color: '#3B82F6', suggestedDurationDays: 30 },
  fundraising: { label: 'Fundraising', icon: 'cash', color: '#10B981', suggestedDurationDays: 14 },
  outreach: { label: 'Outreach', icon: 'people', color: '#8B5CF6', suggestedDurationDays: 21 },
  issue_advocacy: { label: 'Issue Advocacy', icon: 'warning', color: '#F59E0B', suggestedDurationDays: 14 },
  brand_building: { label: 'Brand Building', icon: 'star', color: '#F97316', suggestedDurationDays: 60 },
  get_out_vote: { label: 'Get Out The Vote', icon: 'hand-right', color: '#EC4899', suggestedDurationDays: 7 },
};

export const AD_FORMAT_CONFIG: Record<AdFormat, { label: string; icon: string; minBudgetINR: number; cpmRangeINR: [number, number]; engagementMultiplier: number }> = {
  promoted_post: { label: 'Promoted Post', icon: 'arrow-up-circle', minBudgetINR: 500, cpmRangeINR: [20, 80], engagementMultiplier: 1.5 },
  banner: { label: 'Banner Ad', icon: 'image', minBudgetINR: 1000, cpmRangeINR: [10, 50], engagementMultiplier: 1.0 },
  video_ad: { label: 'Video Ad', icon: 'videocam', minBudgetINR: 2000, cpmRangeINR: [50, 200], engagementMultiplier: 2.0 },
  carousel: { label: 'Carousel', icon: 'albums', minBudgetINR: 1000, cpmRangeINR: [30, 100], engagementMultiplier: 1.8 },
  native_story: { label: 'Native Story', icon: 'book', minBudgetINR: 1500, cpmRangeINR: [40, 150], engagementMultiplier: 2.5 },
  constituency_spotlight: { label: 'Constituency Spotlight', icon: 'location', minBudgetINR: 5000, cpmRangeINR: [100, 500], engagementMultiplier: 3.0 },
  push_notification: { label: 'Push Notification', icon: 'notifications', minBudgetINR: 2000, cpmRangeINR: [80, 300], engagementMultiplier: 2.0 },
  sms_blast: { label: 'SMS Campaign', icon: 'chatbox', minBudgetINR: 3000, cpmRangeINR: [150, 500], engagementMultiplier: 1.5 },
  whatsapp_broadcast: { label: 'WhatsApp Broadcast', icon: 'logo-whatsapp', minBudgetINR: 5000, cpmRangeINR: [200, 800], engagementMultiplier: 3.0 },
};

export const VOTER_SEGMENT_CONFIG: Record<VoterSegment, { label: string; icon: string; description: string; estimatedPctOfPopulation: number }> = {
  loyal_base: { label: 'Loyal Base', icon: 'heart', description: 'Consistent party voters', estimatedPctOfPopulation: 25 },
  swing_voter: { label: 'Swing Voters', icon: 'swap-horizontal', description: 'Changes party frequently', estimatedPctOfPopulation: 15 },
  opposition_soft: { label: 'Opposition Soft', icon: 'trending-down', description: 'Dissatisfied opposition voters', estimatedPctOfPopulation: 10 },
  first_time_voter: { label: 'First-Time Voters', icon: 'sparkles', description: 'Age 18-21, voting first time', estimatedPctOfPopulation: 8 },
  youth_18_25: { label: 'Youth (18-25)', icon: 'school', description: 'Young voters', estimatedPctOfPopulation: 18 },
  women: { label: 'Women', icon: 'female', description: 'Female voters', estimatedPctOfPopulation: 48 },
  senior_citizen: { label: 'Senior Citizens', icon: 'accessibility', description: 'Age 60+', estimatedPctOfPopulation: 12 },
  urban: { label: 'Urban', icon: 'business', description: 'City/town residents', estimatedPctOfPopulation: 35 },
  rural: { label: 'Rural', icon: 'leaf', description: 'Village residents', estimatedPctOfPopulation: 65 },
  sc_st: { label: 'SC/ST', icon: 'people', description: 'Scheduled Caste/Tribe voters', estimatedPctOfPopulation: 25 },
  minority: { label: 'Minorities', icon: 'globe', description: 'Religious/linguistic minorities', estimatedPctOfPopulation: 15 },
  high_education: { label: 'Educated', icon: 'school', description: 'Graduate and above', estimatedPctOfPopulation: 20 },
  low_income: { label: 'Low Income', icon: 'wallet', description: 'Below median income', estimatedPctOfPopulation: 50 },
  farmer: { label: 'Farmers', icon: 'leaf', description: 'Agricultural workers', estimatedPctOfPopulation: 45 },
  business_owner: { label: 'Business Owners', icon: 'storefront', description: 'Self-employed/business', estimatedPctOfPopulation: 12 },
};

export const VOLUNTEER_ROLE_CONFIG: Record<VolunteerRole, { label: string; icon: string; color: string }> = {
  canvasser: { label: 'Door-to-Door Canvasser', icon: 'walk', color: '#3B82F6' },
  booth_agent: { label: 'Booth Agent', icon: 'location', color: '#EF4444' },
  social_media: { label: 'Social Media', icon: 'logo-twitter', color: '#06B6D4' },
  logistics: { label: 'Logistics', icon: 'car', color: '#F59E0B' },
  data_entry: { label: 'Data Entry', icon: 'laptop', color: '#8B5CF6' },
  coordinator: { label: 'Area Coordinator', icon: 'flag', color: '#10B981' },
  driver: { label: 'Driver/Transport', icon: 'car-sport', color: '#F97316' },
  caller: { label: 'Phone Caller', icon: 'call', color: '#EC4899' },
};

// ─── Interfaces ───

export interface Campaign {
  id: string;
  politicianId: string;
  politicianName: string;
  party?: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  stateCode: string;
  targetConstituencies: number[];
  targetDistricts: string[];
  startDate: string;
  endDate: string;
  totalBudgetINR: number;
  spentBudgetINR: number;
  adCount: number;
  volunteerCount: number;
  boothsCovered: number;
  totalBooths: number;
  impressions: number;
  reach: number;
  engagements: number;
  conversions: number;
  sentimentScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdCreative {
  id: string;
  campaignId: string;
  format: AdFormat;
  status: AdStatus;
  name: string;
  headline: string;
  body: string;
  callToAction: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  landingUrl?: string;
  targeting: AdTargeting;
  budget: AdBudget;
  schedule: AdSchedule;
  performance: AdPerformance;
  abTestId?: string;
  abVariant?: 'A' | 'B' | 'C';
  disclosureText: string;
  paidForBy: string;
  eciDisclosureId?: string;
  isECICompliant: boolean;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdTargeting {
  segments: VoterSegment[];
  ageRange?: { min: number; max: number };
  gender?: 'male' | 'female' | 'all';
  stateCode?: string;
  constituencyAcNos?: number[];
  districtNames?: string[];
  pinCodes?: string[];
  interests?: string[];
  excludeSegments?: VoterSegment[];
  languages?: string[];
  estimatedReach: number;
  targetingType: TargetingType;
}

export interface AdBudget {
  type: BudgetType;
  totalINR: number;
  dailyCapINR?: number;
  spentINR: number;
  biddingStrategy: BiddingStrategy;
  maxBidINR?: number;
  costPerResult: number;
}

export interface AdSchedule {
  startDate: string;
  endDate: string;
  activeDays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  activeHours: { start: number; end: number };
  timezone: string;
}

export interface AdPerformance {
  impressions: number;
  reach: number;
  clicks: number;
  engagements: number;
  shares: number;
  ctr: number;
  cpm: number;
  cpc: number;
  cpe: number;
  frequency: number;
  spend: number;
  conversions: number;
  conversionRate: number;
  roi: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  byDay: { date: string; impressions: number; clicks: number; spend: number }[];
  bySegment: { segment: VoterSegment; impressions: number; clicks: number; ctr: number }[];
  byConstituency: { acNo: number; acName: string; impressions: number; engagements: number }[];
}

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  status: ABTestStatus;
  variants: { variant: 'A' | 'B' | 'C'; adId: string; headline: string; impressions: number; clicks: number; ctr: number; conversions: number }[];
  winnerId?: string;
  winnerVariant?: 'A' | 'B' | 'C';
  confidenceLevel: number;
  startedAt: string;
  completedAt?: string;
}

export interface CanvassingRecord {
  id: string;
  campaignId: string;
  volunteerId: string;
  volunteerName: string;
  boothId: string;
  boothName: string;
  wardNo?: number;
  constituencyAcNo: number;
  status: CanvassingStatus;
  householdsVisited: number;
  householdsTotal: number;
  supporterCount: number;
  oppositionCount: number;
  undecidedCount: number;
  issuesRaised: string[];
  notes: string;
  gpsTrack?: { lat: number; lng: number; timestamp: string }[];
  startTime: string;
  endTime?: string;
  createdAt: string;
}

export interface Volunteer {
  id: string;
  userId: string;
  campaignId: string;
  name: string;
  phone: string;
  role: VolunteerRole;
  status: VolunteerStatus;
  assignedBooths: string[];
  assignedWards: number[];
  constituencyAcNo?: number;
  tasksCompleted: number;
  hoursLogged: number;
  rating: number;
  joinedAt: string;
  lastActiveAt: string;
}

export interface BoothStrategy {
  id: string;
  campaignId: string;
  boothId: string;
  boothName: string;
  boothNumber: string;
  constituencyAcNo: number;
  wardNo?: number;
  totalVoters: number;
  estimatedTurnout: number;
  targetVotes: number;
  historicalResults: { year: number; party: string; votes: number }[];
  assignedVolunteers: string[];
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'canvassing' | 'ready' | 'polling_day' | 'counted';
  canvassingCompletion: number;
  supportEstimate: number;
  notes: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'total';
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  totalConversions: number;
  overallCTR: number;
  overallROI: number;
  costPerVoterReached: number;
  sentimentTrend: { date: string; positive: number; neutral: number; negative: number }[];
  topPerformingAds: { adId: string; name: string; roi: number; impressions: number }[];
  segmentPerformance: { segment: VoterSegment; reached: number; engaged: number; cost: number }[];
  geographicHeatmap: { acNo: number; acName: string; impressions: number; sentiment: number }[];
  volunteerMetrics: { totalVolunteers: number; activeVolunteers: number; totalHours: number; householdsReached: number };
  boothReadiness: { total: number; ready: number; inProgress: number; notStarted: number };
  channelBreakdown: { channel: ChannelType; impressions: number; engagements: number; cost: number }[];
  dailyMetrics: { date: string; spend: number; impressions: number; engagements: number; newVolunteers: number }[];
}

export interface RevenueFlowData {
  totalRevenue: number;
  totalCampaigns: number;
  totalAds: number;
  activePoliticians: number;
  avgSpendPerCampaign: number;
  avgROI: number;
  mrr: number;
  revenueByMonth: { month: string; revenue: number; campaigns: number }[];
  revenueByFormat: { format: AdFormat; revenue: number; count: number }[];
  revenueByState: { stateCode: string; revenue: number }[];
  topSpenders: { politicianId: string; name: string; party: string; totalSpend: number }[];
  projectedMRR: number;
  unitEconomics: { costPerPromotedPost: number; avgPoliticiansPerState: number; statesActive: number; monthlyRevenuePerState: number };
}

// ─── Utility Functions ───

export function estimateReach(targeting: AdTargeting, budget: AdBudget): number {
  const baseCPM = 50;
  const impressions = (budget.totalINR / baseCPM) * 1000;
  const segmentMultiplier = targeting.segments.length > 0 ? 0.8 : 1.0;
  return Math.round(impressions * segmentMultiplier * 0.6);
}

export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100;
}

export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return 0;
  return Math.round(((revenue - cost) / cost) * 100);
}

export function getBoothPriority(historicalMargin: number): 'critical' | 'high' | 'medium' | 'low' {
  if (historicalMargin < 500) return 'critical';
  if (historicalMargin < 2000) return 'high';
  if (historicalMargin < 5000) return 'medium';
  return 'low';
}

export function formatBudget(amountINR: number): string {
  if (amountINR >= 10000000) return `₹${(amountINR / 10000000).toFixed(1)}Cr`;
  if (amountINR >= 100000) return `₹${(amountINR / 100000).toFixed(1)}L`;
  if (amountINR >= 1000) return `₹${(amountINR / 1000).toFixed(1)}K`;
  return `₹${amountINR}`;
}

export function calculateECICompliance(ad: AdCreative): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!ad.disclosureText) issues.push('Missing disclosure text (ECI mandatory)');
  if (!ad.paidForBy) issues.push('Missing "Paid for by" attribution');
  if (ad.format === 'sms_blast' && !ad.eciDisclosureId) issues.push('SMS campaigns require ECI pre-certification');
  if (ad.budget.totalINR > 7000000) issues.push('Expenditure may exceed ECI limit for AC');
  return { compliant: issues.length === 0, issues };
}

export function generateUnitEconomics(activePoliticians: number, avgSpend: number, states: number): RevenueFlowData['unitEconomics'] {
  return {
    costPerPromotedPost: 500,
    avgPoliticiansPerState: Math.round(activePoliticians / Math.max(states, 1)),
    statesActive: states,
    monthlyRevenuePerState: Math.round((activePoliticians / Math.max(states, 1)) * avgSpend),
  };
}
