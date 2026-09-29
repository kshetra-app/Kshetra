/**
 * apps/api/src/services/electionService.ts
 *
 * Milestone W019 — Canonical Election Service
 * Authority: PLAN-W019-MASTER-REV-1.md / DEC-074
 *
 * Implements normalized election queries against:
 * - election_events
 * - election_contests
 * - candidacies
 * - ballot_choices
 * - canonical_persons
 * - political_organizations
 */
import { supabase } from '../lib/supabase';
import type {
  ElectionEvent,
  ElectionContest,
  ContestDetail,
  BallotChoice,
  Candidacy,
  CanonicalPerson,
  PoliticalOrganization,
} from '@kshetra/shared';

export interface ListElectionsOptions {
  state?: string;
  year?: number;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface ListContestsOptions {
  search?: string;
  party?: string;
  limit?: number;
  offset?: number;
}

function mapDbElectionEvent(row: any): ElectionEvent {
  return {
    id: row.id,
    electionCode: row.election_code,
    stateCode: row.state_code,
    electionType: row.election_type,
    electionYear: row.election_year,
    title: row.title,
    notificationDate: row.notification_date ?? null,
    pollingDate: row.polling_date,
    countingDate: row.counting_date ?? null,
    status: row.status,
    totalConstituencies: row.total_constituencies ?? 0,
    totalElectors: Number(row.total_electors ?? 0),
    totalVotesPolled: Number(row.total_votes_polled ?? 0),
    turnoutPercentage: Number(row.turnout_percentage ?? 0),
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbElectionContest(row: any): ElectionContest {
  return {
    id: row.id,
    electionId: row.election_id,
    contestCode: row.contest_code,
    constituencyId: row.constituency_id,
    constituencyVersionId: row.constituency_version_id ?? null,
    constituencyName: row.constituency_name,
    reservationStatus: row.reservation_status,
    status: row.status,
    isUncontested: Boolean(row.is_uncontested),
    countermandedContestId: row.countermanded_contest_id ?? null,
    totalElectors: row.total_electors ?? 0,
    totalVotesPolled: row.total_votes_polled ?? 0,
    totalValidVotes: row.total_valid_votes ?? 0,
    totalRejectedVotes: row.total_rejected_votes === null || row.total_rejected_votes === undefined ? null : Number(row.total_rejected_votes),
    totalNotaVotes: row.total_nota_votes ?? 0,
    turnoutPercentage: Number(row.turnout_percentage ?? 0),
    victoryMargin: row.victory_margin ?? 0,
    winningCandidacyId: row.winning_candidacy_id ?? null,
    runnerUpCandidacyId: row.runner_up_candidacy_id ?? null,
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbBallotChoice(row: any): BallotChoice {
  return {
    id: row.id,
    contestId: row.contest_id,
    choiceType: row.choice_type,
    isValidVote: row.is_valid_vote ?? true,
    votesReceived: row.votes_received ?? 0,
    voteShare: Number(row.vote_share ?? 0),
    createdAt: row.created_at,
  };
}

export class ElectionService {
  /**
   * List macro election events
   */
  async listElectionEvents(options: ListElectionsOptions = {}): Promise<{ events: ElectionEvent[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);

    let query = supabase
      .from('election_events')
      .select('*', { count: 'exact' });

    if (options.state) {
      query = query.eq('state_code', options.state);
    }
    if (options.year) {
      query = query.eq('election_year', options.year);
    }
    if (options.type) {
      query = query.eq('election_type', options.type);
    }

    query = query
      .order('polling_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to list election events: ${error.message}`);
    }

    return {
      events: (data || []).map(mapDbElectionEvent),
      total: count ?? 0,
    };
  }

  /**
   * Get an election event by UUID or election_code
   */
  async getElectionEventById(idOrCode: string): Promise<ElectionEvent | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const column = isUuid ? 'id' : 'election_code';

    const { data, error } = await supabase
      .from('election_events')
      .select('*')
      .eq(column, idOrCode)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get election event: ${error.message}`);
    }
    if (!data) return null;

    return mapDbElectionEvent(data);
  }

  /**
   * List contests within an election event
   */
  async listElectionContests(
    electionIdOrCode: string,
    options: ListContestsOptions = {}
  ): Promise<{ contests: ElectionContest[]; total: number }> {
    const election = await this.getElectionEventById(electionIdOrCode);
    if (!election) {
      return { contests: [], total: 0 };
    }

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    let query = supabase
      .from('election_contests')
      .select('*', { count: 'exact' })
      .eq('election_id', election.id);

    if (options.search) {
      query = query.or(`constituency_name.ilike.%${options.search}%,constituency_id.ilike.%${options.search}%`);
    }

    query = query
      .order('constituency_name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to list election contests: ${error.message}`);
    }

    return {
      contests: (data || []).map(mapDbElectionContest),
      total: count ?? 0,
    };
  }

  /**
   * Get full contest return (candidates, NOTA, winner, runner-up)
   */
  async getContestDetail(electionIdOrCode: string, constituencyId: string): Promise<ContestDetail | null> {
    const election = await this.getElectionEventById(electionIdOrCode);
    if (!election) return null;

    // Fetch contest
    const { data: contestData, error: contestError } = await supabase
      .from('election_contests')
      .select('*')
      .eq('election_id', election.id)
      .eq('constituency_id', constituencyId)
      .maybeSingle();

    if (contestError) {
      throw new Error(`Failed to get contest: ${contestError.message}`);
    }
    if (!contestData) return null;

    const contest = mapDbElectionContest(contestData);

    // Fetch candidates with persons and parties
    const { data: candidatesData, error: candError } = await supabase
      .from('candidacies')
      .select(`
        *,
        canonical_persons (*),
        political_organizations (*)
      `)
      .eq('contest_id', contest.id)
      .order('rank', { ascending: true });

    if (candError) {
      throw new Error(`Failed to get contest candidates: ${candError.message}`);
    }

    // Fetch ballot choices (NOTA, etc.)
    const { data: ballotData, error: ballotError } = await supabase
      .from('ballot_choices')
      .select('*')
      .eq('contest_id', contest.id)
      .order('votes_received', { ascending: false });

    if (ballotError) {
      throw new Error(`Failed to get ballot choices: ${ballotError.message}`);
    }

    const candidates = (candidatesData || []).map((row: any) => ({
      id: row.id,
      contestId: row.contest_id,
      personId: row.person_id,
      electionYear: row.election_year,
      electionType: row.election_type,
      constituencyType: row.constituency_type,
      constituencyId: row.constituency_id,
      partyId: row.party_id ?? null,
      isIndependent: Boolean(row.is_independent),
      result: row.result,
      votesReceived: row.votes_received ?? 0,
      evmVotes: row.evm_votes === null || row.evm_votes === undefined ? null : Number(row.evm_votes),
      postalVotes: row.postal_votes === null || row.postal_votes === undefined ? null : Number(row.postal_votes),
      voteShare: Number(row.vote_share ?? 0),
      rank: row.rank ?? 0,
      affidavitId: row.affidavit_id ?? null,
      dataStatus: row.data_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      person: row.canonical_persons ? {
        id: row.canonical_persons.id,
        canonicalName: row.canonical_persons.canonical_name,
        aliases: row.canonical_persons.aliases || [],
        dataStatus: row.canonical_persons.data_status,
        photoUrl: row.canonical_persons.photo_url ?? null,
        metadata: row.canonical_persons.metadata || {},
        createdAt: row.canonical_persons.created_at,
        updatedAt: row.canonical_persons.updated_at,
        dobEstimated: Boolean(row.canonical_persons.dob_estimated),
      } : null,
      party: row.political_organizations ? {
        id: row.political_organizations.id,
        orgType: row.political_organizations.org_type,
        name: row.political_organizations.name,
        shortName: row.political_organizations.short_name,
        symbolUrl: row.political_organizations.symbol_url ?? null,
        brandColors: row.political_organizations.brand_colors || {},
        dataStatus: row.political_organizations.data_status,
        createdAt: row.political_organizations.created_at,
        updatedAt: row.political_organizations.updated_at,
      } : null,
    }));

    const ballotChoices = (ballotData || []).map(mapDbBallotChoice);

    const winnerCand = candidates.find(c => c.id === contest.winningCandidacyId) || candidates[0] || null;
    const runnerUpCand = candidates.find(c => c.id === contest.runnerUpCandidacyId) || candidates[1] || null;

    return {
      ...contest,
      election,
      candidates,
      ballotChoices,
      winner: winnerCand && winnerCand.person ? {
        candidacy: winnerCand,
        person: winnerCand.person,
        party: winnerCand.party,
      } : null,
      runnerUp: runnerUpCand && runnerUpCand.person ? {
        candidacy: runnerUpCand,
        person: runnerUpCand.person,
        party: runnerUpCand.party,
      } : null,
    };
  }

  /**
   * Get complete electoral contest history for a canonical person
   */
  async getPersonElections(personId: string): Promise<Candidacy[]> {
    const { data, error } = await supabase
      .from('candidacies')
      .select(`
        *,
        election_contests!candidacies_contest_id_fkey (*),
        political_organizations (*)
      `)
      .eq('person_id', personId)
      .order('election_year', { ascending: false });

    if (error) {
      throw new Error(`Failed to get person elections: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      contestId: row.contest_id,
      personId: row.person_id,
      electionYear: row.election_year,
      electionType: row.election_type,
      constituencyType: row.constituency_type,
      constituencyId: row.constituency_id,
      partyId: row.party_id ?? null,
      isIndependent: Boolean(row.is_independent),
      result: row.result,
      votesReceived: row.votes_received ?? 0,
      evmVotes: row.evm_votes === null || row.evm_votes === undefined ? null : Number(row.evm_votes),
      postalVotes: row.postal_votes === null || row.postal_votes === undefined ? null : Number(row.postal_votes),
      voteShare: Number(row.vote_share ?? 0),
      rank: row.rank ?? 0,
      affidavitId: row.affidavit_id ?? null,
      dataStatus: row.data_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const electionService = new ElectionService();
