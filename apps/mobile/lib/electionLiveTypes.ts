// ─── Live Election & Investor Demo Types ───
// Covers: Live election counting mode, real-time data pipeline,
// investor demo/flywheel visualization, DAU metrics, moat showcase

// ─── Enums ───

export type ElectionPhase = 'pre_election' | 'nomination' | 'campaigning' | 'silence_period' | 'polling_day' | 'counting_day' | 'results_declared' | 'government_formation';

export type CountingStatus = 'not_started' | 'evm_verification' | 'postal_ballots' | 'round_in_progress' | 'round_complete' | 'counting_paused' | 'counting_complete' | 'result_declared';

export type DataFreshness = 'real_time' | 'minutes_ago' | 'hours_ago' | 'daily' | 'weekly' | 'stale';

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
