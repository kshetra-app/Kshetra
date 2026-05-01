import { create } from 'zustand';
import type {
  DelimitationEvent,
  DelimitationProposal,
  ProposedConstituency,
  ConstituencyMapping,
  CitizenImpact,
  PartyDelimitationImpact,
  MLAImpact,
  SeatAllocation,
  DelimitationStatus,
} from '../lib/delimitationTypes';

// ─── Seed Delimitation Timeline Events ───
// Real historical + anticipated events for context

const SEED_EVENTS: DelimitationEvent[] = [
  // Historical context
  {
    id: 'evt-1',
    eventType: 'gazette_notification',
    title: 'Delimitation Act 2002 enacted',
    description: 'Parliament passes the Delimitation Act, 2002, establishing the framework for the Delimitation Commission to redraw constituency boundaries based on Census 2001 data.',
    date: '2002-06-12',
    source: 'gazette_of_india',
    sourceUrl: 'https://legislative.gov.in/sites/default/files/A2002-33_0.pdf',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-2',
    eventType: 'commission_formation',
    title: 'Delimitation Commission (2002) constituted',
    description: 'Justice Kuldip Singh appointed as Chairman of the Delimitation Commission. Commission tasked with redrawing all Lok Sabha and State Assembly constituencies.',
    date: '2002-07-12',
    source: 'gazette_of_india',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-3',
    eventType: 'gazette_notification',
    title: 'Final delimitation orders published',
    description: 'Delimitation Commission publishes final orders for all states. New boundaries based on Census 2001 data. Total Lok Sabha seats remain 543. Several state assembly seats redistributed.',
    date: '2008-02-19',
    source: 'gazette_of_india',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-4',
    eventType: 'parliamentary_debate',
    title: '84th Constitutional Amendment freezes seats until 2026',
    description: 'The 84th Amendment (2001) froze the allocation of Lok Sabha seats and readjustment of territorial constituencies until the first census after 2026. This was to protect southern states that controlled population growth.',
    date: '2001-02-22',
    source: 'parliament',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-5',
    eventType: 'parliamentary_debate',
    title: '87th Constitutional Amendment: Census 2001 for delimitation',
    description: 'The 87th Amendment (2003) specified that the 2001 Census would be the basis for delimitation of constituencies, while the 1971 Census remained the basis for allocation of seats to states.',
    date: '2003-06-22',
    source: 'parliament',
    isVerified: true,
    significance: 'high',
  },
  // COVID-era Census delays
  {
    id: 'evt-6',
    eventType: 'census_notification',
    title: 'Census 2021 postponed due to COVID-19',
    description: 'The decennial Census of India 2021, originally scheduled to begin in April 2020, is postponed indefinitely due to the COVID-19 pandemic. This delays the entire delimitation process.',
    date: '2020-03-25',
    source: 'census_india',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-7',
    eventType: 'census_notification',
    title: 'NPR/Census preparation resumes',
    description: 'Government signals resumption of Census preparations. Updated National Population Register (NPR) and Census enumeration expected to begin soon.',
    date: '2024-09-15',
    source: 'media',
    sourceUrl: 'https://www.thehindu.com/news/national/census-2024/',
    isVerified: false,
    significance: 'medium',
  },
  // Forward-looking events
  {
    id: 'evt-8',
    eventType: 'parliamentary_debate',
    title: 'Lok Sabha debate on delimitation timeline',
    description: 'Multiple MPs raise questions about the timeline for the next delimitation exercise. Southern state MPs express concern about potential seat loss. Government assures "census-first, delimitation-after" approach.',
    date: '2025-02-10',
    source: 'parliament',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-9',
    eventType: 'expert_analysis',
    title: 'PRS analysis: Impact of delimitation on state representation',
    description: 'PRS Legislative Research publishes detailed analysis showing that equal-population-based delimitation could see UP gain 100+ seats and southern states lose 30-60 seats each. Calls for political consensus on methodology.',
    date: '2025-06-20',
    source: 'prs_legislative',
    sourceUrl: 'https://prsindia.org/theprsblog/delimitation-impact-analysis',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-10',
    eventType: 'census_notification',
    title: 'Census 2025 enumeration begins',
    description: 'Census enumeration officially begins across India. First digital census with mobile app-based data collection. Results expected by late 2026. This will be the foundation for the next delimitation exercise.',
    date: '2025-10-01',
    source: 'census_india',
    isVerified: false,
    significance: 'critical',
  },
  // Telangana-specific
  {
    id: 'evt-11',
    eventType: 'media_report',
    title: 'Telangana assembly passes resolution against seat reduction',
    description: 'Telangana Legislative Assembly unanimously passes a resolution opposing any reduction in Lok Sabha or Assembly seats during delimitation, arguing that states that invested in family planning should not be penalized.',
    date: '2025-08-12',
    stateCode: 'TS',
    source: 'media',
    isVerified: false,
    significance: 'high',
  },
  {
    id: 'evt-12',
    eventType: 'media_report',
    title: 'AP demands separate delimitation for newly created districts',
    description: 'Andhra Pradesh CM writes to PM requesting that delimitation account for the 26 districts created in 2022 (up from 13). New district boundaries should guide constituency drawing.',
    date: '2025-07-05',
    stateCode: 'AP',
    source: 'media',
    isVerified: false,
    significance: 'medium',
  },
  {
    id: 'evt-13',
    eventType: 'expert_analysis',
    title: 'Karnataka political scientists model 3 delimitation scenarios',
    description: 'Political science department at Bangalore University models 3 scenarios: (A) proportional reduction to ~170 seats, (B) total seats held constant with boundary redraw, (C) hybrid model with population weighting. Scenario B most politically feasible.',
    date: '2025-11-18',
    stateCode: 'KA',
    source: 'media',
    isVerified: false,
    significance: 'medium',
  },
  // National political dynamics
  {
    id: 'evt-14',
    eventType: 'parliamentary_debate',
    title: 'Opposition INDIA bloc demands "no seat reduction" guarantee',
    description: 'Opposition parties in Parliament demand a constitutional amendment guaranteeing that no state will lose assembly or Lok Sabha seats in delimitation. Debate ongoing.',
    date: '2026-01-15',
    source: 'parliament',
    isVerified: false,
    significance: 'high',
  },
  {
    id: 'evt-15',
    eventType: 'expert_analysis',
    title: 'KSHETRA launches Delimitation Simulator',
    description: 'KSHETRA platform launches India\'s first public delimitation simulator, allowing citizens to explore how constituency boundaries might change based on Census 2011 projections. Coverage: 4 fully-supported states (TS, AP, KA, MH).',
    date: '2026-04-30',
    source: 'media',
    isVerified: true,
    significance: 'medium',
  },
];

// ─── Store Interface ───

interface DelimitationState {
  // Current national status
  nationalStatus: DelimitationStatus;

  // Timeline events
  events: DelimitationEvent[];

  // Proposals (when available)
  proposals: DelimitationProposal[];

  // Seat projections
  seatAllocations: SeatAllocation[];

  // Active state for detailed view
  activeStateCode: string | null;

  // Citizen impact cache
  citizenImpacts: Record<string, CitizenImpact>; // keyed by pinCode

  // Party impacts
  partyImpacts: PartyDelimitationImpact[];

  // MLA impacts
  mlaImpacts: MLAImpact[];

  // Loading states
  isLoadingEvents: boolean;
  isLoadingProjections: boolean;

  // ─── Queries ───
  getEventsForState: (stateCode: string) => DelimitationEvent[];
  getEventsByType: (eventType: string) => DelimitationEvent[];
  getEventsBySignificance: (significance: string) => DelimitationEvent[];
  getTimelineEvents: () => DelimitationEvent[];
  getVerifiedEvents: () => DelimitationEvent[];
  getCitizenImpact: (pinCode: string) => CitizenImpact | undefined;
  getProposalForState: (stateCode: string) => DelimitationProposal | undefined;
  getSeatAllocation: (stateCode: string) => SeatAllocation | undefined;
  getGainersAndLosers: () => { gainers: SeatAllocation[]; losers: SeatAllocation[] };

  // ─── Actions ───
  setActiveState: (stateCode: string | null) => void;
  addEvent: (event: DelimitationEvent) => void;
  setSeatAllocations: (allocations: SeatAllocation[]) => void;
  setCitizenImpact: (pinCode: string, impact: CitizenImpact) => void;
  setPartyImpacts: (impacts: PartyDelimitationImpact[]) => void;
  setMLAImpacts: (impacts: MLAImpact[]) => void;
}

export const useDelimitationStore = create<DelimitationState>((set, get) => ({
  // ─── State ───
  nationalStatus: 'pre_census',
  events: SEED_EVENTS,
  proposals: [],
  seatAllocations: [],
  activeStateCode: null,
  citizenImpacts: {},
  partyImpacts: [],
  mlaImpacts: [],
  isLoadingEvents: false,
  isLoadingProjections: false,

  // ─── Queries ───

  getEventsForState: (stateCode: string) =>
    get().events.filter((e) => e.stateCode === stateCode || !e.stateCode),

  getEventsByType: (eventType: string) =>
    get().events.filter((e) => e.eventType === eventType),

  getEventsBySignificance: (significance: string) =>
    get().events.filter((e) => e.significance === significance),

  getTimelineEvents: () =>
    [...get().events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),

  getVerifiedEvents: () =>
    get().events.filter((e) => e.isVerified),

  getCitizenImpact: (pinCode: string) =>
    get().citizenImpacts[pinCode],

  getProposalForState: (stateCode: string) =>
    get().proposals.find((p) => p.stateCode === stateCode && p.status !== 'superseded'),

  getSeatAllocation: (stateCode: string) =>
    get().seatAllocations.find((a) => a.stateCode === stateCode),

  getGainersAndLosers: () => {
    const allocs = get().seatAllocations;
    const gainers = allocs.filter((a) => a.seatChange > 0).sort((a, b) => b.seatChange - a.seatChange);
    const losers = allocs.filter((a) => a.seatChange < 0).sort((a, b) => a.seatChange - b.seatChange);
    return { gainers, losers };
  },

  // ─── Actions ───

  setActiveState: (stateCode) => set({ activeStateCode: stateCode }),

  addEvent: (event) => set((s) => ({ events: [event, ...s.events] })),

  setSeatAllocations: (allocations) => set({ seatAllocations: allocations }),

  setCitizenImpact: (pinCode, impact) =>
    set((s) => ({ citizenImpacts: { ...s.citizenImpacts, [pinCode]: impact } })),

  setPartyImpacts: (impacts) => set({ partyImpacts: impacts }),

  setMLAImpacts: (impacts) => set({ mlaImpacts: impacts }),
}));
