import { create } from 'zustand';
import type {
  LiveElectionState,
  LivePartyTally,
  LiveConstituencyResult,
  ElectionSimulation,
  RealTimeDataConfig,
  DataPipelineStatus,
} from '../lib/electionLiveTypes';

// ─── Seed Live Election (demo / simulation) ───
const SEED_ELECTION: LiveElectionState = {
  electionId: 'le-ts-2028',
  electionName: 'Telangana Assembly Election 2028 (Demo)',
  stateCode: 'TS',
  totalSeats: 119,
  phase: 'counting_day',
  pollingDate: '2028-11-15',
  countingDate: '2028-11-18',
  isLive: true,
  lastUpdated: new Date().toISOString(),
  dataFreshness: 'real_time',
  overallTurnout: 72.3,
  countingProgress: 65,
  resultsDeclared: 42,
  leadingParty: 'INC',
  partyWise: [
    { party: 'INC', partyColor: '#19AAED', won: 28, leading: 18, total: 46, previousElection: 64, change: -18, voteSharePercent: 38.2, previousVoteShare: 39.4, voteShareChange: -1.2 },
    { party: 'BRS', partyColor: '#E91E8C', won: 12, leading: 22, total: 34, previousElection: 39, change: -5, voteSharePercent: 32.1, previousVoteShare: 37.4, voteShareChange: -5.3 },
    { party: 'BJP', partyColor: '#FF6B00', won: 2, leading: 18, total: 20, previousElection: 8, change: 12, voteSharePercent: 22.5, previousVoteShare: 13.9, voteShareChange: 8.6 },
    { party: 'AIMIM', partyColor: '#008000', won: 0, leading: 7, total: 7, previousElection: 7, change: 0, voteSharePercent: 3.8, previousVoteShare: 2.7, voteShareChange: 1.1 },
    { party: 'OTH', partyColor: '#6B7280', won: 0, leading: 12, total: 12, previousElection: 1, change: 11, voteSharePercent: 3.4, previousVoteShare: 6.6, voteShareChange: -3.2 },
  ],
  constituencies: [
    {
      acNo: 1, acName: 'Adilabad', districtName: 'Adilabad', countingStatus: 'result_declared', roundNumber: 22, totalRounds: 22,
      candidates: [
        { name: 'Jogu Ramanna', party: 'INC', partyColor: '#19AAED', votes: 85200, votePercent: 48.5, isLeading: false, isWinner: true, roundWiseVotes: [], swing: 5.2 },
        { name: 'Payal Shankar', party: 'BJP', partyColor: '#FF6B00', votes: 62300, votePercent: 35.5, isLeading: false, isWinner: false, roundWiseVotes: [], swing: 12.1 },
        { name: 'Rathod Bapu Rao', party: 'BRS', partyColor: '#E91E8C', votes: 22800, votePercent: 13.0, isLeading: false, isWinner: false, roundWiseVotes: [], swing: -18.5 },
      ],
      totalVotesPolled: 175600, turnoutPercent: 72.1, previousWinner: 'Jogu Ramanna', previousWinnerParty: 'INC', isUpset: false, marginVotes: 22900, lastUpdated: new Date().toISOString(),
    },
    {
      acNo: 56, acName: 'Nampally', districtName: 'Hyderabad', countingStatus: 'round_in_progress', roundNumber: 15, totalRounds: 22,
      candidates: [
        { name: 'Akbaruddin Owaisi', party: 'AIMIM', partyColor: '#008000', votes: 52100, votePercent: 42.8, isLeading: true, isWinner: false, roundWiseVotes: [{ round: 1, votes: 3200, cumulative: 3200 }, { round: 2, votes: 3500, cumulative: 6700 }], swing: -2.1 },
        { name: 'Feroz Khan', party: 'INC', partyColor: '#19AAED', votes: 38500, votePercent: 31.6, isLeading: false, isWinner: false, roundWiseVotes: [], swing: 8.5 },
        { name: 'Mohammed Azam', party: 'BRS', partyColor: '#E91E8C', votes: 18200, votePercent: 15.0, isLeading: false, isWinner: false, roundWiseVotes: [], swing: -12.3 },
      ],
      totalVotesPolled: 121700, turnoutPercent: 58.3, previousWinner: 'Akbaruddin Owaisi', previousWinnerParty: 'AIMIM', isUpset: false, marginVotes: 13600, lastUpdated: new Date().toISOString(),
    },
    {
      acNo: 116, acName: 'Kodangal', districtName: 'Vikarabad', countingStatus: 'result_declared', roundNumber: 20, totalRounds: 20,
      candidates: [
        { name: 'Revanth Reddy', party: 'INC', partyColor: '#19AAED', votes: 112000, votePercent: 56.2, isLeading: false, isWinner: true, roundWiseVotes: [], swing: 2.8 },
        { name: 'Patnam Narender Reddy', party: 'BRS', partyColor: '#E91E8C', votes: 58000, votePercent: 29.1, isLeading: false, isWinner: false, roundWiseVotes: [], swing: -15.2 },
        { name: 'Kolan Hanmanth Reddy', party: 'BJP', partyColor: '#FF6B00', votes: 25000, votePercent: 12.5, isLeading: false, isWinner: false, roundWiseVotes: [], swing: 8.9 },
      ],
      totalVotesPolled: 199300, turnoutPercent: 78.5, previousWinner: 'Revanth Reddy', previousWinnerParty: 'INC', isUpset: false, marginVotes: 54000, lastUpdated: new Date().toISOString(),
    },
  ],
};

// ─── Seed Data Pipeline ───
const SEED_PIPELINE: DataPipelineStatus[] = [
  { source: 'ECI Results API', lastFetched: new Date().toISOString(), freshness: 'real_time', recordCount: 1674, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 300000).toISOString() },
  { source: 'MyNeta Affidavits', lastFetched: new Date(Date.now() - 86400000).toISOString(), freshness: 'daily', recordCount: 2045, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 604800000).toISOString() },
  { source: 'Census 2011 Data', lastFetched: '2024-01-01T00:00:00Z', freshness: 'stale', recordCount: 54, isHealthy: true, nextScheduledFetch: '' },
  { source: 'GeoJSON Boundaries', lastFetched: new Date(Date.now() - 604800000).toISOString(), freshness: 'weekly', recordCount: 22, isHealthy: true, nextScheduledFetch: '' },
  { source: 'Gazette Monitor', lastFetched: new Date(Date.now() - 21600000).toISOString(), freshness: 'hours_ago', recordCount: 0, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 21600000).toISOString() },
  { source: 'ECI Website Monitor', lastFetched: new Date(Date.now() - 21600000).toISOString(), freshness: 'hours_ago', recordCount: 0, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 21600000).toISOString() },
  { source: 'Parliament Monitor', lastFetched: new Date(Date.now() - 21600000).toISOString(), freshness: 'hours_ago', recordCount: 0, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 21600000).toISOString() },
  { source: 'PRS Attendance', lastFetched: new Date(Date.now() - 604800000).toISOString(), freshness: 'weekly', recordCount: 0, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 604800000).toISOString() },
  { source: 'Wikipedia Enricher', lastFetched: new Date(Date.now() - 86400000).toISOString(), freshness: 'daily', recordCount: 1665, isHealthy: true, nextScheduledFetch: new Date(Date.now() + 86400000).toISOString() },
];

// ─── Store ───
interface ElectionLiveState {
  liveElection: LiveElectionState | null;
  simulation: ElectionSimulation | null;
  pipelineStatus: DataPipelineStatus[];

  // Queries
  getLiveElection: () => LiveElectionState | null;
  getConstituencyResult: (acNo: number) => LiveConstituencyResult | undefined;
  getPartyTallies: () => LivePartyTally[];
  getPipelineHealth: () => { healthy: number; total: number; overallStatus: 'healthy' | 'degraded' | 'down' };

  // Actions
  setLiveElection: (election: LiveElectionState | null) => void;
  startSimulation: (speed: ElectionSimulation['simulationSpeed']) => void;
  stopSimulation: () => void;
  advanceSimulationRound: () => void;
  refreshPipelineStatus: () => void;
}

export const useElectionLiveStore = create<ElectionLiveState>((set, get) => ({
  liveElection: SEED_ELECTION,
  simulation: null,
  pipelineStatus: SEED_PIPELINE,

  getLiveElection: () => get().liveElection,
  getConstituencyResult: (acNo) => get().liveElection?.constituencies.find((c) => c.acNo === acNo),
  getPartyTallies: () => get().liveElection?.partyWise || [],

  getPipelineHealth: () => {
    const pipeline = get().pipelineStatus;
    const healthy = pipeline.filter((p) => p.isHealthy).length;
    const total = pipeline.length;
    const overallStatus = healthy === total ? 'healthy' : healthy >= total * 0.7 ? 'degraded' : 'down';
    return { healthy, total, overallStatus };
  },

  setLiveElection: (election) => set({ liveElection: election }),

  startSimulation: (speed) => set({
    simulation: {
      electionId: get().liveElection?.electionId || '',
      isSimulated: true, simulationSpeed: speed,
      currentRound: 0, totalRounds: 22,
      startedAt: new Date().toISOString(),
      intervals: speed === 'slow' ? 5000 : speed === 'normal' ? 2000 : speed === 'fast' ? 500 : 0,
    },
  }),

  stopSimulation: () => set({ simulation: null }),

  advanceSimulationRound: () => set((s) => {
    if (!s.simulation) return s;
    const next = s.simulation.currentRound + 1;
    if (next > s.simulation.totalRounds) return { ...s, simulation: null };
    return { simulation: { ...s.simulation, currentRound: next } };
  }),

  refreshPipelineStatus: () => set((s) => ({
    pipelineStatus: s.pipelineStatus.map((p) => ({
      ...p, lastFetched: new Date().toISOString(), isHealthy: true,
    })),
  })),
}));
