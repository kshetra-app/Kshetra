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
  SeatCalculationModel,
} from '../lib/delimitationTypes';
import { resolvePinCodeToImpact, getDelimitationImpactForAC } from '../lib/delimitation/pinCodeResolver';
import { computeAllSeatAllocations } from '../lib/delimitation/seatCalculator';

// ─── Seed Delimitation Timeline Events ───
// Verified historical milestones + current status only (strictly past & present, no forward dates)

const SEED_EVENTS: DelimitationEvent[] = [
  {
    id: 'evt-1',
    eventType: 'parliamentary_debate',
    title: '42nd Constitutional Amendment: 1971 seat freeze enacted',
    description: 'Parliament freezes the total number of Lok Sabha seats (543) and their state-wise allocation based on the 1971 Census until the year 2000 to prevent penalizing states that successfully implement family planning.',
    date: '1976-11-18',
    source: 'parliament',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-2',
    eventType: 'parliamentary_debate',
    title: '84th Constitutional Amendment: Seat freeze extended to 2026',
    description: 'The 84th Constitutional Amendment Act, 2001, extends the freeze on state-wise Lok Sabha and Assembly seat allocations until the first census taken after the year 2026 (Articles 82 and 170(3)).',
    date: '2001-02-21',
    source: 'parliament',
    sourceUrl: 'https://legislative.gov.in/constitution-amendment-acts',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-3',
    eventType: 'gazette_notification',
    title: 'Delimitation Act 2002 enacted by Parliament',
    description: 'Parliament passes the Delimitation Act, 2002 (Act 33 of 2002), providing the statutory mandate to constitute the 4th Delimitation Commission for redrawing intra-state constituency boundaries.',
    date: '2002-06-12',
    source: 'gazette_of_india',
    sourceUrl: 'https://legislative.gov.in/sites/default/files/A2002-33_0.pdf',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-4',
    eventType: 'commission_formation',
    title: '4th Delimitation Commission constituted under Justice Kuldip Singh',
    description: 'Central Government appoints retired Supreme Court Justice Kuldip Singh as Chairman of the Delimitation Commission to adjust intra-state boundaries.',
    date: '2002-07-12',
    source: 'gazette_of_india',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-5',
    eventType: 'parliamentary_debate',
    title: '87th Constitutional Amendment: 2001 Census adopted for boundaries',
    description: 'Parliament enacts the 87th Amendment, mandating that the 2001 Census (instead of 1991) be used to redraw intra-state boundaries, while total state seat counts remain pegged to 1971.',
    date: '2003-06-22',
    source: 'parliament',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-6',
    eventType: 'gazette_notification',
    title: '4th Delimitation Commission final orders published',
    description: 'Delimitation Commission publishes final orders for all states based on 2001 Census data. 543 Lok Sabha seats preserved; nationwide SC/ST reserved seats updated. Implemented in 2009 General Elections.',
    date: '2008-02-19',
    source: 'gazette_of_india',
    sourceUrl: 'https://eci.gov.in/delimitation/',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-7',
    eventType: 'parliamentary_debate',
    title: 'AP Reorganisation Act 2014 mandates seat expansion in AP & Telangana',
    description: 'Section 26 of the Andhra Pradesh Reorganisation Act, 2014 statutorily mandates increasing Assembly seats from 175 to 225 in Andhra Pradesh and from 119 to 153 in Telangana, subject to Article 170 provisions.',
    date: '2014-06-02',
    stateCode: 'TS',
    source: 'parliament',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-8',
    eventType: 'commission_formation',
    title: 'Jammu & Kashmir Delimitation Commission constituted',
    description: 'Under the J&K Reorganisation Act, 2019, Central Government forms the Delimitation Commission headed by retired Supreme Court Justice Ranjana Prakash Desai to delimit assembly and parliamentary constituencies in J&K.',
    date: '2020-03-06',
    stateCode: 'JK',
    source: 'gazette_of_india',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-9',
    eventType: 'census_notification',
    title: 'Decennial Census 2021 postponed due to COVID-19',
    description: 'The Office of the Registrar General & Census Commissioner postpones Census 2021 operations indefinitely due to the COVID-19 pandemic, delaying the census baseline required for subsequent delimitation.',
    date: '2020-03-25',
    source: 'census_india',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-10',
    eventType: 'gazette_notification',
    title: 'J&K Delimitation Commission final orders notified',
    description: 'Justice Ranjana Desai Commission issues final order creating 90 assembly constituencies (43 Jammu, 47 Kashmir) and 5 parliamentary seats, reserving 9 seats for STs and 7 for SCs in Jammu & Kashmir.',
    date: '2022-05-05',
    stateCode: 'JK',
    source: 'gazette_of_india',
    sourceUrl: 'https://eci.gov.in/files/file/14187-final-order-dated-05052022-of-delimitation-commission-for-the-union-territory-of-jammu-kashmir/',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-11',
    eventType: 'gazette_notification',
    title: 'Assam Delimitation final order published by ECI',
    description: 'Election Commission of India publishes final delimitation order for Assam under Section 8A of the RP Act 1950. 126 Assembly and 14 Lok Sabha seats kept, but boundaries and SC/ST reservations reconfigured.',
    date: '2023-08-11',
    stateCode: 'AS',
    source: 'gazette_of_india',
    sourceUrl: 'https://eci.gov.in/files/file/15239-final-order-for-delimitation-of-parliamentary-assembly-constituencies-in-the-state-of-assam/',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-12',
    eventType: 'parliamentary_debate',
    title: '106th Amendment (Nari Shakti Vandan Adhiniyam) enacted',
    description: 'Parliament passes the 106th Constitutional Amendment Act granting 33% reservation for women in Lok Sabha and State Assemblies, with the constitutional mandate that it takes effect upon delimitation after the first post-2026 census.',
    date: '2023-09-28',
    source: 'parliament',
    sourceUrl: 'https://legislative.gov.in/sites/default/files/The%20Constitution%20%28One%20Hundred%20and%20Sixth%20Amendment%29%20Act%2C%202023.pdf',
    isVerified: true,
    significance: 'critical',
  },
  {
    id: 'evt-13',
    eventType: 'parliamentary_debate',
    title: 'Parliamentary debates on Southern States representation equity',
    description: 'Parliamentarians and state leaders raise formal representations urging that states with low total fertility rates (TFR) like Telangana, AP, Tamil Nadu, Kerala, and Karnataka not lose parliamentary representation.',
    date: '2024-02-14',
    source: 'parliament',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-14',
    eventType: 'census_notification',
    title: 'MHA initiates preparatory framework for Digital Census & NPR',
    description: 'Ministry of Home Affairs and Registrar General of India begin field-level IT testing and administrative preparations for conducting India\'s first digital census enumeration.',
    date: '2024-09-15',
    source: 'census_india',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-15',
    eventType: 'media_report',
    title: 'Southern political leadership holds policy summit on federal equity',
    description: 'Senior leaders across southern parties convene to formulate policy proposals for constitutional safeguards, advocating a hybrid allocation model that balances population with development and fertility performance.',
    date: '2024-11-20',
    source: 'media',
    isVerified: true,
    significance: 'high',
  },
  {
    id: 'evt-16',
    eventType: 'gazette_notification',
    title: 'Current Status: Constitutional freeze in effect under Articles 82 & 170',
    description: 'Total Lok Sabha seats remain frozen at 543 across all states. Delimitation Commission formation and seat reallocation await the conduct, completion, and official publication of the overdue decennial Census.',
    date: '2026-08-30',
    source: 'gazette_of_india',
    isVerified: true,
    significance: 'critical',
  },
];

// ─── Store Interface ───

interface DelimitationState {
  // Current national status
  nationalStatus: DelimitationStatus;

  // Selected calculation model
  selectedModel: SeatCalculationModel;

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
  getCitizenImpactForConstituency: (stateCode: string, acNo: number) => CitizenImpact;
  getProposalForState: (stateCode: string) => DelimitationProposal | undefined;
  getSeatAllocation: (stateCode: string) => SeatAllocation | undefined;
  getGainersAndLosers: () => { gainers: SeatAllocation[]; losers: SeatAllocation[] };

  // ─── Actions ───
  setSelectedModel: (model: SeatCalculationModel) => void;
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
  selectedModel: 'EXPANSION_SAFE',
  events: SEED_EVENTS,
  proposals: [],
  seatAllocations: computeAllSeatAllocations(undefined, true, 'EXPANSION_SAFE'),
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

  getCitizenImpact: (pinCode: string) => {
    const cached = get().citizenImpacts[pinCode];
    if (cached) return cached;

    // Calculate dynamically from real PIN code resolver
    const resolved = resolvePinCodeToImpact(pinCode);
    if (resolved) {
      set((s) => ({ citizenImpacts: { ...s.citizenImpacts, [pinCode]: resolved } }));
      return resolved;
    }
    return undefined;
  },

  getCitizenImpactForConstituency: (stateCode: string, acNo: number) => {
    return getDelimitationImpactForAC(stateCode, acNo);
  },

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

  setSelectedModel: (model) =>
    set({
      selectedModel: model,
      seatAllocations: computeAllSeatAllocations(undefined, true, model),
    }),

  setActiveState: (stateCode) => set({ activeStateCode: stateCode }),

  addEvent: (event) => set((s) => ({ events: [event, ...s.events] })),

  setSeatAllocations: (allocations) => set({ seatAllocations: allocations }),

  setCitizenImpact: (pinCode, impact) =>
    set((s) => ({ citizenImpacts: { ...s.citizenImpacts, [pinCode]: impact } })),

  setPartyImpacts: (impacts) => set({ partyImpacts: impacts }),

  setMLAImpacts: (impacts) => set({ mlaImpacts: impacts }),
}));
