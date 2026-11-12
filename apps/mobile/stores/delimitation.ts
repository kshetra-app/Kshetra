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
import type { DelimitationStatusDTO, TimelineEventItem } from '@kshetra/shared';
import { apiClient } from '../lib/api';
import { resolvePinCodeToImpact, getDelimitationImpactForAC } from '../lib/delimitation/pinCodeResolver';
import { computeAllSeatAllocations } from '../lib/delimitation/seatCalculator';

// Timeline and status come from the canonical API; production does not ship local claims.

let latestOfficialDataRequest = 0;

function mapTimelineEvent(event: TimelineEventItem): DelimitationEvent {
  const eventType: DelimitationEvent['eventType'] =
    event.category ??
    (event.billNumber
      ? 'parliamentary_debate'
      : /census/i.test(`${event.title} ${event.instrument ?? ''}`)
        ? 'census_notification'
        : 'gazette_notification');
  const source: DelimitationEvent['source'] =
    eventType === 'census_notification'
      ? 'census_india'
      : eventType === 'parliamentary_debate'
        ? 'parliament'
        : /election commission/i.test(event.authority ?? '')
          ? 'eci'
          : /ministry|president/i.test(event.authority ?? '')
            ? 'gazette_of_india'
            : 'parliament';

  return {
    id: event.id,
    eventType,
    title: event.title,
    description: event.description ?? event.instrument ?? event.title,
    date: event.date,
    source,
    sourceUrl: event.sourceUrl,
    isVerified: event.verified,
    significance: event.significance === 'informational' ? 'low' : event.significance,
    billNumber: event.billNumber,
    houseOfIntroduction: event.houseOfIntroduction,
    legislativeEventType: event.eventType,
    outcome: event.outcome,
    divisionAyes: event.divisionAyes,
    divisionNoes: event.divisionNoes,
    constitutionalArticleTarget: event.constitutionalArticleTarget,
    proposedCeiling: event.proposedCeiling,
    classification: event.classification,
    officialSource: event.officialSource,
    sourceReference: event.sourceReference,
    sourcePublicationMetadata: event.sourcePublicationMetadata,
  };
}

const DELIMITATION_STATUSES: readonly DelimitationStatus[] = [
  'pre_census',
  'census_underway',
  'census_published',
  'commission_formed',
  'draft_published',
  'objections_period',
  'final_notified',
  'implemented',
];

function isDelimitationStatus(value: string): value is DelimitationStatus {
  return DELIMITATION_STATUSES.includes(value as DelimitationStatus);
}

function isStatusPayload(value: DelimitationStatusDTO): value is DelimitationStatusDTO & { nationalStatus: DelimitationStatus } {
  return isDelimitationStatus(value.nationalStatus);
}

interface DelimitationState {
  // Current national status
  nationalStatus: DelimitationStatus | null;
  statusAvailable: boolean;
  statusLabel: string | null;
  statusDescription: string | null;

  // Selected calculation model
  selectedModel: SeatCalculationModel;

  // Timeline events
  events: DelimitationEvent[];
  timelineAvailable: boolean;

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
  refreshOfficialData: () => Promise<void>;
}

export const useDelimitationStore = create<DelimitationState>((set, get) => ({
  // ─── State ───
  nationalStatus: null,
  statusAvailable: false,
  statusLabel: null,
  statusDescription: null,
  selectedModel: 'EXPANSION_SAFE',
  events: [],
  timelineAvailable: false,
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

  refreshOfficialData: async () => {
    const requestId = ++latestOfficialDataRequest;
    set({
      nationalStatus: null,
      statusAvailable: false,
      statusLabel: null,
      statusDescription: null,
      events: [],
      timelineAvailable: false,
      isLoadingEvents: true,
    });

    const [timelineResult, statusResult] = await Promise.allSettled([
      apiClient.delimitation.getTimeline(),
      apiClient.delimitation.getStatus(),
    ]);

    if (requestId !== latestOfficialDataRequest) return;

    const nextState: Partial<DelimitationState> = { isLoadingEvents: false };

    if (timelineResult.status === 'fulfilled') {
      nextState.events = timelineResult.value.events.map(mapTimelineEvent);
      nextState.timelineAvailable = true;
    }

    if (statusResult.status === 'fulfilled' && isStatusPayload(statusResult.value)) {
      nextState.nationalStatus = statusResult.value.nationalStatus;
      nextState.statusAvailable = true;
      nextState.statusLabel = statusResult.value.statusLabel;
      nextState.statusDescription = statusResult.value.description;
    }

    set(nextState);
  },
}));
