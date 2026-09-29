/**
 * packages/shared/src/types/elections.ts
 *
 * Milestone W019 — Canonical Election Data Normalization Types
 * Authority: PLAN-W019-MASTER-REV-1.md / DEC-074
 */
import type {
  GovernanceDataStatus,
  ElectionTypeEnum,
  CanonicalPerson,
  PoliticalOrganization,
  Candidacy,
} from './politicalEntities';

export type ElectionStatusEnum =
  | 'scheduled'
  | 'ongoing'
  | 'counting'
  | 'completed'
  | 'cancelled';

export type ContestStatusEnum =
  | 'scheduled'
  | 'completed'
  | 'countermanded'
  | 'cancelled'
  | 're_polled';

export type BallotChoiceType =
  | 'NOTA';

export interface ElectionEvent {
  id: string;
  electionCode: string;
  stateCode: string;
  electionType: ElectionTypeEnum;
  electionYear: number;
  title: string;
  notificationDate?: string | null;
  pollingDate: string;
  countingDate?: string | null;
  status: ElectionStatusEnum;
  totalConstituencies: number;
  totalElectors: number;
  totalVotesPolled: number;
  turnoutPercentage: number;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ElectionContest {
  id: string;
  electionId: string;
  contestCode: string;
  constituencyId: string;
  constituencyVersionId?: string | null;
  constituencyName: string;
  reservationStatus: 'GEN' | 'SC' | 'ST';
  status: ContestStatusEnum;
  isUncontested: boolean;
  countermandedContestId?: string | null;
  totalElectors: number;
  totalVotesPolled: number;
  totalValidVotes: number;
  /** Count of rejected ballots. NULL indicates UNKNOWN / not independently established by authoritative evidence (NOT zero). */
  totalRejectedVotes: number | null;
  totalNotaVotes: number;
  turnoutPercentage: number;
  victoryMargin: number;
  winningCandidacyId?: string | null;
  runnerUpCandidacyId?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BallotChoice {
  id: string;
  contestId: string;
  choiceType: BallotChoiceType;
  isValidVote: boolean;
  votesReceived: number;
  voteShare: number;
  createdAt: string;
}

export interface ContestDetail extends ElectionContest {
  election?: ElectionEvent | null;
  candidates: (Candidacy & {
    person?: CanonicalPerson | null;
    party?: PoliticalOrganization | null;
  })[];
  ballotChoices: BallotChoice[];
  winner?: {
    candidacy: Candidacy;
    person: CanonicalPerson;
    party?: PoliticalOrganization | null;
  } | null;
  runnerUp?: {
    candidacy: Candidacy;
    person: CanonicalPerson;
    party?: PoliticalOrganization | null;
  } | null;
}
