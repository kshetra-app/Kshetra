/**
 * Canonical Geography Service (API)
 *
 * Milestone W021.5 — Canonical Geography Adapter Service
 *
 * Implements normalized PostgreSQL access against:
 * - public.states
 * - public.parliamentary_constituencies
 * - public.constituencies
 * - public.elected_tenures (with canonical_persons & political_organizations)
 * - public.election_events & public.election_contests
 *
 * Eliminates legacy hardcoded Telangana-first conditionals and replaces
 * ad-hoc state by-election overrides with an extensible, queryable
 * election schedule model.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ConstituencyBrief, ReservationStatus } from '@kshetra/shared';
import type {
  ConstituencyElectionData,
  ConstituencyElectionSummary,
  StateDataInfo,
  GeographicCapability,
} from './stateData';

// ─── CANONICAL DATABASE ENTITY INTERFACES ───

export interface CanonicalStateRecord {
  code: string;
  name: string;
  totalSeats: number;
  rulingParty: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
  lgdCode: number | null;
  censusCode2011: string | null;
  internalId: string | null;
}

export interface CanonicalParliamentaryConstituencyRecord {
  id: string;
  code: string;
  stateCode: string;
  pcNumber: number;
  name: string;
  reservation: 'general' | 'sc' | 'st' | 'GEN' | 'SC' | 'ST';
  eciPcCode: string | null;
}

export interface CanonicalConstituencyRecord {
  id: string;
  acNo: number;
  name: string;
  stateCode: string;
  district: string;
  reservationStatus: ReservationStatus;
  boundary?: any;
  canonicalCode?: string | null;
  parliamentaryConstituencyId?: string | null;
  districtId?: string | null;
  eciAcCode?: string | null;
  nameTe?: string | null;
  currentParty?: string | null;
  currentMLA?: string | null;
}

// ─── DYNAMIC BY-ELECTION SCHEDULE REGISTRY ───

export interface ByElectionScheduleItem {
  stateCode: string;
  acNo: number;
  constituencyName: string;
  party: string;
  mlaName: string;
  status: 'CONFIRMED' | 'SEATED' | 'SCHEDULED';
  termYear?: number;
  gazetteReference?: string;
}

/**
 * Authoritative registry of confirmed by-election outcomes and scheduled terms.
 * Replaces hardcoded conditionals with a structured, queryable data structure.
 */
export const CONFIRMED_BY_ELECTIONS: ByElectionScheduleItem[] = [
  {
    stateCode: 'TN',
    acNo: 35,
    constituencyName: 'Madurantakam',
    party: 'TVK',
    mlaName: 'K. Maragatham Kumaravel',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'TN',
    acNo: 101,
    constituencyName: 'Dharapuram',
    party: 'TVK',
    mlaName: 'P. Sathyabama',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'WB',
    acNo: 210,
    constituencyName: 'Nandigram',
    party: 'BJP',
    mlaName: 'Hasi Rani Rath',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'WB',
    acNo: 70,
    constituencyName: 'Swarupnagar',
    party: 'BJP',
    mlaName: 'Shankharavh Sarkar',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'PY',
    acNo: 9,
    constituencyName: 'Thattanchavady',
    party: 'AINRC',
    mlaName: 'Ashok Anand',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
];

/**
 * Resolves active by-election sitting representative for a constituency.
 * Used across the API layer to guarantee that seated by-election winners
 * correctly supersede the prior general election baseline without ad-hoc code.
 */
export function resolveByElectionOverride(
  stateCode: string,
  acNo: number,
  constituencyName?: string,
): { currentParty: string; currentMLA: string; status: string } | null {
  if (!stateCode) return null;
  const code = stateCode.toUpperCase();
  const entry = CONFIRMED_BY_ELECTIONS.find((e) => {
    if (e.stateCode !== code) return false;
    if (e.acNo === acNo) return true;
    if (constituencyName && e.constituencyName.toLowerCase() === constituencyName.toLowerCase())
      return true;
    return false;
  });
  if (!entry) return null;
  return {
    currentParty: entry.party,
    currentMLA: entry.mlaName,
    status: entry.status,
  };
}

// ─── CANONICAL GEOGRAPHY SERVICE IMPLEMENTATION ───

export class CanonicalGeographyService {
  /**
   * Fail-closed check whether live PostgreSQL connection is configured.
   */
  isAvailable(): boolean {
    return isSupabaseConfigured;
  }

  /**
   * Fetch all states from normalized PostgreSQL public.states table.
   */
  async getStates(): Promise<CanonicalStateRecord[]> {
    if (!this.isAvailable()) return [];

    const { data, error } = await supabase
      .from('states')
      .select(
        'code, name, total_seats, ruling_party, centroid_lat, centroid_lng, lgd_code, census_code_2011, internal_id',
      )
      .order('name');

    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    return data
      .filter((row: any) => row && row.code && row.name)
      .map((row: any) => ({
        code: row.code,
        name: row.name,
        totalSeats: row.total_seats ?? 0,
        rulingParty: row.ruling_party ?? null,
        centroidLat: row.centroid_lat ?? null,
        centroidLng: row.centroid_lng ?? null,
        lgdCode: row.lgd_code ?? null,
        censusCode2011: row.census_code_2011 ?? null,
        internalId: row.internal_id ?? null,
      }));
  }

  /**
   * Fetch a single state from normalized PostgreSQL public.states table.
   */
  async getState(code: string): Promise<CanonicalStateRecord | null> {
    if (!this.isAvailable() || !code) return null;
    const cleanCode = code.toUpperCase();

    const { data, error } = await supabase
      .from('states')
      .select(
        'code, name, total_seats, ruling_party, centroid_lat, centroid_lng, lgd_code, census_code_2011, internal_id',
      )
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !data || !data.code || !data.name) {
      return null;
    }

    return {
      code: data.code,
      name: data.name,
      totalSeats: data.total_seats ?? 0,
      rulingParty: data.ruling_party ?? null,
      centroidLat: data.centroid_lat ?? null,
      centroidLng: data.centroid_lng ?? null,
      lgdCode: data.lgd_code ?? null,
      censusCode2011: data.census_code_2011 ?? null,
      internalId: data.internal_id ?? null,
    };
  }

  /**
   * Fetch Lok Sabha parliamentary constituencies from PostgreSQL public.parliamentary_constituencies.
   */
  async getParliamentaryConstituencies(
    stateCode?: string,
  ): Promise<CanonicalParliamentaryConstituencyRecord[]> {
    if (!this.isAvailable()) return [];

    let query = supabase
      .from('parliamentary_constituencies')
      .select('id, code, state_code, pc_number, name, reservation, eci_pc_code');

    if (stateCode) {
      query = query.eq('state_code', stateCode.toUpperCase());
    }

    const { data, error } = await query.order('pc_number');
    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    return data
      .filter((row: any) => row && row.code && row.name)
      .map((row: any) => ({
        id: row.id,
        code: row.code,
        stateCode: row.state_code,
        pcNumber: row.pc_number,
        name: row.name,
        reservation: row.reservation || 'general',
        eciPcCode: row.eci_pc_code ?? null,
      }));
  }

  /**
   * Fetch a single Lok Sabha constituency by code or UUID.
   */
  async getParliamentaryConstituency(
    codeOrId: string,
  ): Promise<CanonicalParliamentaryConstituencyRecord | null> {
    if (!this.isAvailable() || !codeOrId) return null;

    let query = supabase
      .from('parliamentary_constituencies')
      .select('id, code, state_code, pc_number, name, reservation, eci_pc_code');

    if (codeOrId.includes('-PC-')) {
      query = query.eq('code', codeOrId);
    } else {
      query = query.eq('id', codeOrId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data || !data.code || !data.name) return null;

    return {
      id: data.id,
      code: data.code,
      stateCode: data.state_code,
      pcNumber: data.pc_number,
      name: data.name,
      reservation: data.reservation || 'general',
      eciPcCode: data.eci_pc_code ?? null,
    };
  }

  /**
   * Fetch all assembly constituencies for a state from public.constituencies.
   * Maps rows into unified ConstituencyBrief format, reconciling with active
   * by-election overrides.
   */
  async getConstituencies(stateCode: string): Promise<ConstituencyBrief[]> {
    if (!this.isAvailable() || !stateCode) return [];
    const code = stateCode.toUpperCase();

    const { data, error } = await supabase
      .from('constituencies')
      .select(
        'id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
      )
      .eq('state_code', code)
      .order('ac_no');

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const validRows = data.filter((row: any) => row && row.name && typeof row.ac_no === 'number');
    if (validRows.length === 0) {
      return [];
    }

    // Enrich with elected_tenures if available
    const tenureMap = new Map<string, { currentParty: string; currentMLA: string }>();
    try {
      const { data: tenures } = await supabase
        .from('elected_tenures')
        .select('jurisdiction_id, current_party, canonical_persons(name)')
        .eq('jurisdiction_type', 'assembly_constituency')
        .eq('is_current', true);

      if (tenures && Array.isArray(tenures)) {
        for (const t of tenures as any[]) {
          if (t && t.jurisdiction_id) {
            tenureMap.set(t.jurisdiction_id, {
              currentParty: t.current_party || '',
              currentMLA: t.canonical_persons?.name || '',
            });
          }
        }
      }
    } catch {
      // Graceful fallback if elected_tenures is unmigrated or unpopulated
    }

    return validRows.map((row: any) => {
      let currentParty = row.current_party || '';
      let currentMLA = row.current_mla || '';

      const tenure = tenureMap.get(row.id);
      if (tenure) {
        if (!currentParty && tenure.currentParty) currentParty = tenure.currentParty;
        if (!currentMLA && tenure.currentMLA) currentMLA = tenure.currentMLA;
      }

      const override = resolveByElectionOverride(code, row.ac_no, row.name);
      if (override) {
        currentParty = override.currentParty;
        currentMLA = override.currentMLA;
      }

      return {
        id: row.id || `${code}-AC-${row.ac_no}`,
        name: row.name,
        acNo: row.ac_no,
        stateCode: row.state_code || code,
        district: row.district || '',
        reservationStatus: (row.reservation_status as ReservationStatus) || 'GEN',
        currentParty,
        currentMLA,
      };
    });
  }

  /**
   * Fetch single assembly constituency by state and acNo from public.constituencies.
   */
  async getConstituency(stateCode: string, acNo: number): Promise<ConstituencyBrief | null> {
    if (!this.isAvailable() || !stateCode || acNo == null) return null;
    const code = stateCode.toUpperCase();

    const { data, error } = await supabase
      .from('constituencies')
      .select(
        'id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
      )
      .eq('state_code', code)
      .eq('ac_no', acNo)
      .maybeSingle();

    if (error || !data || !data.name || typeof data.ac_no !== 'number') {
      return null;
    }

    let currentParty = data.current_party || '';
    let currentMLA = data.current_mla || '';

    const override = resolveByElectionOverride(code, data.ac_no, data.name);
    if (override) {
      currentParty = override.currentParty;
      currentMLA = override.currentMLA;
    }

    return {
      id: data.id || `${code}-AC-${data.ac_no}`,
      name: data.name,
      acNo: data.ac_no,
      stateCode: data.state_code || code,
      district: data.district || '',
      reservationStatus: (data.reservation_status as ReservationStatus) || 'GEN',
      currentParty,
      currentMLA,
    };
  }

  /**
   * Search constituencies across a state using database filter.
   */
  async searchConstituencies(stateCode: string, query: string): Promise<ConstituencyBrief[]> {
    if (!this.isAvailable() || !stateCode) return [];
    const code = stateCode.toUpperCase();
    const q = query.trim();
    if (!q) return this.getConstituencies(code);

    const { data, error } = await supabase
      .from('constituencies')
      .select(
        'id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
      )
      .eq('state_code', code)
      .or(`name.ilike.%${q}%,district.ilike.%${q}%`)
      .order('ac_no');

    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    const validRows = data.filter((row: any) => row && row.name && typeof row.ac_no === 'number');

    return validRows.map((row: any) => {
      let currentParty = row.current_party || '';
      let currentMLA = row.current_mla || '';

      const override = resolveByElectionOverride(code, row.ac_no, row.name);
      if (override) {
        currentParty = override.currentParty;
        currentMLA = override.currentMLA;
      }

      return {
        id: row.id || `${code}-AC-${row.ac_no}`,
        name: row.name,
        acNo: row.ac_no,
        stateCode: row.state_code || code,
        district: row.district || '',
        reservationStatus: (row.reservation_status as ReservationStatus) || 'GEN',
        currentParty,
        currentMLA,
      };
    });
  }

  /**
   * Query normalized election contests and events from PostgreSQL for a constituency.
   */
  async getConstituencyElectionData(
    stateCode: string,
    acNo: number,
  ): Promise<ConstituencyElectionData | null> {
    if (!this.isAvailable() || !stateCode || acNo == null) return null;
    const code = stateCode.toUpperCase();
    const constituencyId = `${code}-AC-${acNo}`;

    // Query election contests for this constituency joined with election events
    const { data: contests, error } = await supabase
      .from('election_contests')
      .select(
        `
        id,
        contest_code,
        constituency_id,
        status,
        total_votes_polled,
        victory_margin,
        winning_candidacy_id,
        runner_up_candidacy_id,
        election_id,
        election_events (
          id,
          election_code,
          state_code,
          election_type,
          election_year,
          title
        )
      `,
      )
      .eq('constituency_id', constituencyId);

    if (error || !contests || contests.length === 0) {
      return null;
    }

    const elections: ConstituencyElectionSummary[] = [];

    for (const contest of contests) {
      const event = contest.election_events as any;
      const electionYear = event?.election_year ?? null;
      const rawType = event?.election_type;
      const electionType: 'GENERAL' | 'BYPOLL' | null =
        rawType === 'by_election' ? 'BYPOLL' : rawType === 'assembly' ? 'GENERAL' : null;

      const votes =
        typeof contest.total_votes_polled === 'number' ? contest.total_votes_polled : null;
      const margin = typeof contest.victory_margin === 'number' ? contest.victory_margin : null;
      const marginPercent =
        votes != null && votes > 0 && margin != null && margin >= 0
          ? parseFloat(((margin / votes) * 100).toFixed(1))
          : null;

      elections.push({
        electionYear,
        electionType,
        winner: '',
        winnerName: '',
        winnerVotes: votes,
        runnerUp: '',
        margin,
        marginPercent,
      });
    }

    elections.sort((a, b) => {
      if (a.electionYear == null && b.electionYear == null) return 0;
      if (a.electionYear == null) return 1;
      if (b.electionYear == null) return -1;
      return b.electionYear - a.electionYear;
    });

    const recentElection = elections[0] ?? {
      electionYear: null,
      electionType: null,
      winner: '',
      winnerName: '',
      winnerVotes: null,
      runnerUp: '',
      margin: null,
      marginPercent: null,
    };

    return {
      recentElection,
      elections,
    };
  }

  /**
   * Return confirmed by-elections, optionally filtered by state.
   */
  getConfirmedByElections(stateCode?: string): ByElectionScheduleItem[] {
    if (!stateCode) return [...CONFIRMED_BY_ELECTIONS];
    const code = stateCode.toUpperCase();
    return CONFIRMED_BY_ELECTIONS.filter((e) => e.stateCode === code);
  }

  /**
   * Fetch sitting MLA / representative profile for a constituency from PostgreSQL.
   */
  async getConstituencyMLA(stateCode: string, acNo: number): Promise<any | null> {
    if (!this.isAvailable() || !stateCode || acNo == null) return null;
    const code = stateCode.toUpperCase();

    try {
      const { data, error } = await supabase
        .from('constituencies')
        .select('id, ac_no, name, state_code, district, reservation_status, current_party, current_mla')
        .eq('state_code', code)
        .eq('ac_no', acNo)
        .maybeSingle();

      if (error || !data || !data.name) return null;

      let name = data.current_mla || 'UNKNOWN';
      let party = data.current_party || 'UNKNOWN';

      const override = resolveByElectionOverride(code, data.ac_no, data.name);
      if (override) {
        name = override.currentMLA;
        party = override.currentParty;
      }

      return {
        acNo: data.ac_no,
        name,
        party,
        constituencyName: data.name,
        district: data.district || '',
        stateCode: code,
        gender: 'M',
        terms: 1,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch all sitting MLAs / representative profiles for a state from PostgreSQL.
   */
  async getConstituencyMLAs(stateCode: string): Promise<any[]> {
    if (!this.isAvailable() || !stateCode) return [];
    const code = stateCode.toUpperCase();

    try {
      const { data, error } = await supabase
        .from('constituencies')
        .select('id, ac_no, name, state_code, district, reservation_status, current_party, current_mla')
        .eq('state_code', code)
        .order('ac_no');

      if (error || !data || !Array.isArray(data) || data.length === 0) return [];

      return data
        .filter((c: any) => c && typeof c.ac_no === 'number')
        .map((c: any) => {
          let name = c.current_mla || 'UNKNOWN';
          let party = c.current_party || 'UNKNOWN';

          const override = resolveByElectionOverride(code, c.ac_no, c.name);
          if (override) {
            name = override.currentMLA;
            party = override.currentParty;
          }

          return {
            acNo: c.ac_no,
            name,
            party,
            constituencyName: c.name,
            district: c.district || '',
            stateCode: code,
            gender: 'M',
            terms: 1,
          };
        });
    } catch {
      return [];
    }
  }
}

export const canonicalGeographyService = new CanonicalGeographyService();
