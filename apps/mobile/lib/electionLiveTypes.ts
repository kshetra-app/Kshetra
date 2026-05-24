// ─── Live Election & Investor Demo Types ───
// Covers: Live election counting mode, real-time data pipeline,
// investor demo/flywheel visualization, DAU metrics, moat showcase

// ─── Enums ───

export type ElectionPhase = 'pre_election' | 'nomination' | 'campaigning' | 'silence_period' | 'polling_day' | 'counting_day' | 'results_declared' | 'government_formation';

export type CountingStatus = 'not_started' | 'evm_verification' | 'postal_ballots' | 'round_in_progress' | 'round_complete' | 'counting_paused' | 'counting_complete' | 'result_declared';

export type DataFreshness = 'real_time' | 'minutes_ago' | 'hours_ago' | 'daily' | 'weekly' | 'stale';

export type InvestorMetricCategory = 'engagement' | 'growth' | 'revenue' | 'content' | 'data_moat' | 'retention';

// ─── Configs ───

export const ELECTION_PHASE_CONFIG: Record<ElectionPhase, { label: string; icon: string; color: string; description: string }> = {
  pre_election: { label: 'Pre-Election', icon: 'calendar', color: '#6B7280', description: 'Election dates not yet announced' },
  nomination: { label: 'Nomination', icon: 'document-text', color: '#3B82F6', description: 'Candidates filing nominations' },
  campaigning: { label: 'Campaigning', icon: 'megaphone', color: '#F59E0B', description: 'Active election campaigning' },
  silence_period: { label: 'Silence Period', icon: 'volume-mute', color: '#8B5CF6', description: '48h silence before polling' },
  polling_day: { label: 'Polling Day', icon: 'checkbox', color: '#EF4444', description: 'Voters casting their ballots' },
  counting_day: { label: 'Counting Day', icon: 'calculator', color: '#F97316', description: 'Live vote counting in progress' },
  results_declared: { label: 'Results Declared', icon: 'trophy', color: '#10B981', description: 'Official results announced' },
  government_formation: { label: 'Govt Formation', icon: 'business', color: '#14B8A6', description: 'Government being formed' },
};

export const COUNTING_STATUS_CONFIG: Record<CountingStatus, { label: string; color: string; isActive: boolean }> = {
  not_started: { label: 'Not Started', color: '#6B7280', isActive: false },
  evm_verification: { label: 'EVM Verification', color: '#3B82F6', isActive: true },
  postal_ballots: { label: 'Postal Ballots', color: '#8B5CF6', isActive: true },
  round_in_progress: { label: 'Round In Progress', color: '#F59E0B', isActive: true },
  round_complete: { label: 'Round Complete', color: '#84CC16', isActive: true },
  counting_paused: { label: 'Paused', color: '#F97316', isActive: false },
  counting_complete: { label: 'Counting Complete', color: '#10B981', isActive: false },
  result_declared: { label: 'Result Declared', color: '#10B981', isActive: false },
};

// ─── Interfaces ───

export interface LiveElectionState {
  electionId: string;
  electionName: string;
  stateCode: string;
  totalSeats: number;
  phase: ElectionPhase;
  pollingDate: string;
  countingDate: string;
  isLive: boolean;
  lastUpdated: string;
  dataFreshness: DataFreshness;
  overallTurnout: number;
  countingProgress: number;
  resultsDeclared: number;
  leadingParty: string;
  partyWise: LivePartyTally[];
  constituencies: LiveConstituencyResult[];
}

export interface LivePartyTally {
  party: string;
  partyColor: string;
  won: number;
  leading: number;
  total: number;
  previousElection: number;
  change: number;
  voteSharePercent: number;
  previousVoteShare: number;
  voteShareChange: number;
}

export interface LiveConstituencyResult {
  acNo: number;
  acName: string;
  districtName: string;
  countingStatus: CountingStatus;
  roundNumber: number;
  totalRounds: number;
  candidates: LiveCandidateResult[];
  totalVotesPolled: number;
  turnoutPercent: number;
  previousWinner: string;
  previousWinnerParty: string;
  isUpset: boolean;
  marginVotes: number;
  lastUpdated: string;
}

export interface LiveCandidateResult {
  name: string;
  party: string;
  partyColor: string;
  votes: number;
  votePercent: number;
  isLeading: boolean;
  isWinner: boolean;
  roundWiseVotes: { round: number; votes: number; cumulative: number }[];
  previousVotes?: number;
  swing: number;
}

export interface ElectionSimulation {
  electionId: string;
  isSimulated: boolean;
  simulationSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  currentRound: number;
  totalRounds: number;
  startedAt: string;
  intervals: number;
}

export interface DataPipelineStatus {
  source: string;
  lastFetched: string;
  freshness: DataFreshness;
  recordCount: number;
  isHealthy: boolean;
  errorMessage?: string;
  nextScheduledFetch: string;
}

export interface RealTimeDataConfig {
  sources: DataPipelineStatus[];
  overallHealth: 'healthy' | 'degraded' | 'down';
  lastFullSync: string;
  totalRecords: number;
  updateFrequency: string;
}

// ─── Investor Demo / Flywheel ───

export interface FlywheelStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
  isActive: boolean;
}

export interface InvestorDemoMetric {
  id: string;
  category: InvestorMetricCategory;
  label: string;
  value: string;
  numericValue: number;
  previousValue?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  description: string;
}

export interface PlatformMoat {
  id: string;
  label: string;
  description: string;
  metric: string;
  icon: string;
  color: string;
  competitorComparison?: string;
}

export interface UnitEconomicsDemo {
  revenuePerUser: number;
  costPerUser: number;
  ltv: number;
  cac: number;
  ltvToCacRatio: number;
  paybackMonths: number;
  grossMargin: number;
  monthlyBurnRate: number;
  monthsOfRunway: number;
  breakEvenUsers: number;
}

export interface DAUMetrics {
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  avgSessionMinutes: number;
  sessionsPerDay: number;
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  topFeatures: { feature: string; usagePercent: number }[];
  usersByState: { stateCode: string; users: number }[];
  growthRate: number;
  organicPercent: number;
}

// ─── Seed Data Generators ───

export function generateFlywheelSteps(): FlywheelStep[] {
  return [
    {
      id: 'content',
      label: 'Journalists Create Content',
      description: 'Grassroot journalists publish local news, ground reports, and investigations',
      icon: 'create',
      color: '#3B82F6',
      metrics: [
        { label: 'Active Journalists', value: '2,500+', trend: 'up' },
        { label: 'Articles/Day', value: '450', trend: 'up' },
      ],
      isActive: true,
    },
    {
      id: 'engage',
      label: 'Citizens Engage',
      description: 'Users read, vouch, flag, and discuss local political content',
      icon: 'people',
      color: '#8B5CF6',
      metrics: [
        { label: 'DAU', value: '125K', trend: 'up' },
        { label: 'Avg Session', value: '12 min', trend: 'up' },
      ],
      isActive: true,
    },
    {
      id: 'respond',
      label: 'Politicians Respond',
      description: 'Leaders engage with constituents, respond to issues, track promises',
      icon: 'chatbubbles',
      color: '#F59E0B',
      metrics: [
        { label: 'Active Politicians', value: '850', trend: 'up' },
        { label: 'Avg Response Time', value: '4.2h', trend: 'down' },
      ],
      isActive: true,
    },
    {
      id: 'pay',
      label: 'Politicians Pay for Reach',
      description: 'Leaders promote their content, events, and campaigns to targeted audiences',
      icon: 'cash',
      color: '#10B981',
      metrics: [
        { label: 'Monthly Revenue', value: '₹45L', trend: 'up' },
        { label: 'Avg Spend/Campaign', value: '₹15K', trend: 'up' },
      ],
      isActive: true,
    },
    {
      id: 'reinvest',
      label: 'Revenue Funds Features',
      description: 'Revenue reinvested into more states, better data, AI features',
      icon: 'rocket',
      color: '#EF4444',
      metrics: [
        { label: 'States Covered', value: '22', trend: 'up' },
        { label: 'Constituencies', value: '4,120', trend: 'up' },
      ],
      isActive: true,
    },
  ];
}

export function generateMoatData(): PlatformMoat[] {
  return [
    { id: 'data', label: 'Constituency Intelligence', description: '1,674 ACs mapped with full election data, MLA profiles, demographics', metric: '1,674 ACs', icon: 'map', color: '#3B82F6', competitorComparison: 'No competitor has AC-level granularity' },
    { id: 'profiles', label: 'Legislator Profiles', description: '2,018 legislator profiles with photos, affidavits, criminal records, assets', metric: '2,018 profiles', icon: 'people', color: '#8B5CF6', competitorComparison: 'MyNeta has data but no engagement layer' },
    { id: 'geo', label: 'GeoJSON Boundaries', description: '22-state AC-level polygon boundaries for interactive map visualization', metric: '22 states', icon: 'globe', color: '#10B981', competitorComparison: 'ECI publishes PDFs, not interactive maps' },
    { id: 'kyc', label: 'Creator Accountability', description: 'Full KYC + forensic fingerprinting for every content action', metric: '100% traceable', icon: 'shield-checkmark', color: '#F59E0B', competitorComparison: 'No political platform has forensic-grade accountability' },
    { id: 'content', label: 'Content Promotion Pipeline', description: 'Local-first content with community review before wider reach', metric: '3-tier gating', icon: 'funnel', color: '#EC4899', competitorComparison: 'Unique — no social network does constituency-level gating' },
    { id: 'delimitation', label: 'Delimitation Simulator', description: 'India-first seat projection engine with reservation analysis', metric: '13 states simulated', icon: 'calculator', color: '#F97316', competitorComparison: 'No competitor tracks delimitation impact' },
  ];
}

export function generateDemoDAUMetrics(): DAUMetrics {
  return {
    dau: 125000,
    wau: 450000,
    mau: 1200000,
    dauMauRatio: 0.104,
    avgSessionMinutes: 12.5,
    sessionsPerDay: 2.3,
    retentionD1: 0.62,
    retentionD7: 0.38,
    retentionD30: 0.22,
    topFeatures: [
      { feature: 'Interactive Map', usagePercent: 78 },
      { feature: 'News Feed', usagePercent: 65 },
      { feature: 'Civic Dashboard', usagePercent: 52 },
      { feature: 'Legislator Profiles', usagePercent: 48 },
      { feature: 'Promise Tracker', usagePercent: 35 },
    ],
    usersByState: [
      { stateCode: 'TS', users: 180000 },
      { stateCode: 'AP', users: 165000 },
      { stateCode: 'KA', users: 150000 },
      { stateCode: 'MH', users: 200000 },
      { stateCode: 'TN', users: 130000 },
      { stateCode: 'UP', users: 175000 },
      { stateCode: 'WB', users: 95000 },
      { stateCode: 'KL', users: 85000 },
    ],
    growthRate: 18.5,
    organicPercent: 72,
  };
}

export function generateUnitEconomicsDemo(): UnitEconomicsDemo {
  return {
    revenuePerUser: 8.5,
    costPerUser: 3.2,
    ltv: 285,
    cac: 45,
    ltvToCacRatio: 6.3,
    paybackMonths: 5.3,
    grossMargin: 0.72,
    monthlyBurnRate: 1500000,
    monthsOfRunway: 24,
    breakEvenUsers: 500000,
  };
}

export function getDataFreshnessColor(freshness: DataFreshness): string {
  const colors: Record<DataFreshness, string> = {
    real_time: '#10B981',
    minutes_ago: '#84CC16',
    hours_ago: '#F59E0B',
    daily: '#F97316',
    weekly: '#EF4444',
    stale: '#6B7280',
  };
  return colors[freshness];
}

export function getDataFreshnessLabel(freshness: DataFreshness): string {
  const labels: Record<DataFreshness, string> = {
    real_time: 'Live',
    minutes_ago: 'Updated minutes ago',
    hours_ago: 'Updated hours ago',
    daily: 'Updated today',
    weekly: 'Updated this week',
    stale: 'Data may be outdated',
  };
  return labels[freshness];
}
