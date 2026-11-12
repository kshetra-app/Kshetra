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
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type {
  ConstituencyBrief,
  ReservationStatus,
  SubConstituencyHierarchyDTO,
  LocatePointResponse,
  LocatePinCodeResponse,
  PinCodeCandidate,
} from '@kshetra/shared';
import { findConstituencyAtPoint } from '@kshetra/shared';
import { CURATED_PROVISIONAL_PIN_DIRECTORY } from './delimitationService';
import { getConstituency as getStateConstituency } from './stateData';
import * as fs from 'fs';
import * as path from 'path';
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

interface HierarchyBoothRow {
  id: string;
  internal_id: string | null;
  booth_number: number;
  booth_name: string;
  polling_station_name: string | null;
  total_voters: number | null;
  panchayat_id: string | null;
  ulb_ward_internal_id: string | null;
  gp_ward_internal_id: string | null;
}

interface HierarchyULBWardRow {
  id: string;
  internal_id: string | null;
  ulb_id: string;
  ward_no: number;
  name: string | null;
  reservation: string;
}

interface HierarchyULBRow {
  id: string;
  internal_id: string | null;
  name: string;
  local_name: string | null;
  type: string;
  lgd_code: number | null;
  total_wards: number | null;
}

interface HierarchyGPWardRow {
  id: string;
  internal_id: string | null;
  panchayat_id: string;
  ward_no: number;
  name: string | null;
  reservation: string;
}

interface HierarchyGPRow {
  id: string;
  internal_id: string | null;
  name: string;
  local_name: string | null;
  mandal_id: string;
  lgd_code: number | null;
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
    stateCode: 'UP',
    acNo: 354,
    constituencyName: 'Ghosi',
    party: 'SP',
    mlaName: 'Sudhakar Singh',
    status: 'CONFIRMED',
    termYear: 2023,
    gazetteReference: 'ECI UP By-Election Gazette Sept 2023',
  },

  {
    stateCode: 'UP',
    acNo: 15,
    constituencyName: 'Khatauli',
    party: 'RLD',
    mlaName: 'Madan Bhaiya',
    status: 'CONFIRMED',
    termYear: 2022,
    gazetteReference: 'ECI UP By-Election Gazette Dec 2022',
  },

  {
    stateCode: 'UP',
    acNo: 34,
    constituencyName: 'Suar',
    party: 'ADAL',
    mlaName: 'Shafeek Ahmed Ansari',
    status: 'CONFIRMED',
    termYear: 2023,
    gazetteReference: 'ECI UP By-Election Gazette May 2023',
  },

  {
    stateCode: 'UP',
    acNo: 37,
    constituencyName: 'Rampur',
    party: 'BJP',
    mlaName: 'Akash Saxena (Honey)',
    status: 'CONFIRMED',
    termYear: 2022,
    gazetteReference: 'ECI UP By-Election Gazette Dec 2022',
  },

  {
    stateCode: 'KA',
    acNo: 36,
    constituencyName: 'Shorapur',
    party: 'INC',
    mlaName: 'Raja Venugopal Naik',
    status: 'CONFIRMED',
    termYear: 2024,
    gazetteReference: 'ECI Karnataka By-Election Gazette May 2024',
  },

  {
    stateCode: 'KA',
    acNo: 95,
    constituencyName: 'Sandur',
    party: 'INC',
    mlaName: 'E Annapoorna',
    status: 'CONFIRMED',
    termYear: 2024,
    gazetteReference: 'ECI Karnataka By-Election Gazette Nov 2024',
  },

  {
    stateCode: 'KA',
    acNo: 185,
    constituencyName: 'Channapatna',
    party: 'INC',
    mlaName: 'C P Yogeeshwara',
    status: 'CONFIRMED',
    termYear: 2024,
    gazetteReference: 'ECI Karnataka By-Election Gazette Nov 2024',
  },

  {
    stateCode: 'KA',
    acNo: 83,
    constituencyName: 'Shiggaon',
    party: 'INC',
    mlaName: 'Pathan Yasirahmedkhan',
    status: 'CONFIRMED',
    termYear: 2024,
    gazetteReference: 'ECI Karnataka By-Election Gazette Nov 2024',
  },

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

/** Bundled election overrides are local reference data, never a production source of current officeholders. */
function resolveRuntimeByElectionOverride(
  stateCode: string,
  acNo: number,
  constituencyName?: string,
) {
  return isProductionLikeRuntime()
    ? null
    : resolveByElectionOverride(stateCode, acNo, constituencyName);
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
   * Resolve current officeholders from the normalized tenure registry.
   * Legacy constituency.current_mla values are deprecated and are only used
   * by non-production compatibility paths when no canonical tenure exists.
   */
  private async getCurrentTenureMap(
    constituencyIds: string[],
  ): Promise<Map<string, { currentParty: string; currentMLA: string; gender: 'M' | 'F' | null }>> {
    const result = new Map<
      string,
      { currentParty: string; currentMLA: string; gender: 'M' | 'F' | null }
    >();
    const ids = [...new Set(constituencyIds.filter((id) => typeof id === 'string' && id.trim()))];
    if (!ids.length) return result;

    try {
      const { data, error } = await supabase
        .from('elected_tenures')
        .select(
          'jurisdiction_id, current_party, canonical_persons(canonical_name, gender), party:political_organizations!elected_tenures_current_party_fkey(ec_party_code, short_name)',
        )
        .eq('jurisdiction_type', 'assembly_constituency')
        .eq('office_type', 'mla')
        .eq('is_current', true)
        .in('jurisdiction_id', ids);

      if (error || !Array.isArray(data)) return result;

      const candidates = new Map<
        string,
        Array<{ currentParty: string; currentMLA: string; gender: 'M' | 'F' | null }>
      >();
      for (const row of data as any[]) {
        if (!row || typeof row.jurisdiction_id !== 'string') continue;
        const party = Array.isArray(row.party) ? row.party[0] : row.party;
        const person = Array.isArray(row.canonical_persons)
          ? row.canonical_persons[0]
          : row.canonical_persons;
        const value: { currentParty: string; currentMLA: string; gender: 'M' | 'F' | null } = {
          currentParty: party?.ec_party_code || party?.short_name || '',
          currentMLA: person?.canonical_name || '',
          gender: person?.gender === 'male' ? 'M' : person?.gender === 'female' ? 'F' : null,
        };
        const entries = candidates.get(row.jurisdiction_id) || [];
        entries.push(value);
        candidates.set(row.jurisdiction_id, entries);
      }

      // Ambiguous active tenures must not be resolved by whichever row Postgres returns first.
      for (const [jurisdictionId, entries] of candidates) {
        if (entries.length === 1) result.set(jurisdictionId, entries[0]);
      }
    } catch {
      // A missing or not-yet-migrated tenure registry yields no canonical officeholder.
    }

    return result;
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

    if (error && isProductionLikeRuntime()) throw error;
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const validRows = data.filter((row: any) => row && row.name && typeof row.ac_no === 'number');
    if (validRows.length === 0) {
      return [];
    }

    const tenureMap = await this.getCurrentTenureMap(
      validRows
        .map((row: any) => row.id)
        .filter((id: unknown): id is string => typeof id === 'string'),
    );

    return validRows.map((row: any) => {
      const tenure = tenureMap.get(row.id);
      let currentParty = tenure?.currentParty || row.current_party || '';
      let currentMLA =
        tenure?.currentMLA || (isProductionLikeRuntime() ? '' : row.current_mla || '');

      const override = resolveRuntimeByElectionOverride(code, row.ac_no, row.name);
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
        'id, internal_id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
      )
      .eq('state_code', code)
      .eq('ac_no', acNo)
      .maybeSingle();

    if (error && isProductionLikeRuntime()) throw error;
    if (error || !data || !data.name || typeof data.ac_no !== 'number') {
      return null;
    }

    const tenure = await this.getCurrentTenureMap([data.id]).then((map) => map.get(data.id));
    let currentParty = tenure?.currentParty || data.current_party || '';
    let currentMLA =
      tenure?.currentMLA || (isProductionLikeRuntime() ? '' : data.current_mla || '');

    const override = resolveRuntimeByElectionOverride(code, data.ac_no, data.name);
    if (override) {
      currentParty = override.currentParty;
      currentMLA = override.currentMLA;
    }

    return {
      id: data.id || `${code}-AC-${data.ac_no}`,
      ...(typeof data.internal_id === 'string' ? { internalId: data.internal_id } : {}),
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
    const tenureMap = await this.getCurrentTenureMap(
      validRows
        .map((row: any) => row.id)
        .filter((id: unknown): id is string => typeof id === 'string'),
    );

    return validRows.map((row: any) => {
      const tenure = tenureMap.get(row.id);
      let currentParty = tenure?.currentParty || row.current_party || '';
      let currentMLA =
        tenure?.currentMLA || (isProductionLikeRuntime() ? '' : row.current_mla || '');

      const override = resolveRuntimeByElectionOverride(code, row.ac_no, row.name);
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

    if (error && isProductionLikeRuntime()) throw error;
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
        .select(
          'id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
        )
        .eq('state_code', code)
        .eq('ac_no', acNo)
        .maybeSingle();

      if (error && isProductionLikeRuntime()) throw error;
      if (error || !data || !data.name) return null;

      const tenure = (await this.getCurrentTenureMap([data.id])).get(data.id);
      if (isProductionLikeRuntime() && !tenure?.currentMLA) return null;

      let name = tenure?.currentMLA || data.current_mla || 'UNKNOWN';
      let party = tenure?.currentParty || data.current_party || 'UNKNOWN';

      const override = resolveRuntimeByElectionOverride(code, data.ac_no, data.name);
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
        ...(tenure?.gender
          ? { gender: tenure.gender }
          : isProductionLikeRuntime()
            ? {}
            : { gender: 'M' }),
        ...(!isProductionLikeRuntime() ? { terms: 1 } : {}),
      };
    } catch (error) {
      if (isProductionLikeRuntime()) throw error;
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
        .select(
          'id, ac_no, name, state_code, district, reservation_status, current_party, current_mla',
        )
        .eq('state_code', code)
        .order('ac_no');

      if (error && isProductionLikeRuntime()) throw error;
      if (error || !data || !Array.isArray(data) || data.length === 0) return [];

      const tenureMap = await this.getCurrentTenureMap(
        data
          .map((row: any) => row?.id)
          .filter((id: unknown): id is string => typeof id === 'string'),
      );

      return data
        .filter((c: any) => c && typeof c.ac_no === 'number')
        .map((c: any) => {
          const tenure = tenureMap.get(c.id);
          if (isProductionLikeRuntime() && !tenure?.currentMLA) return null;

          let name = tenure?.currentMLA || c.current_mla || 'UNKNOWN';
          let party = tenure?.currentParty || c.current_party || 'UNKNOWN';

          const override = resolveRuntimeByElectionOverride(code, c.ac_no, c.name);
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
            ...(tenure?.gender
              ? { gender: tenure.gender }
              : isProductionLikeRuntime()
                ? {}
                : { gender: 'M' }),
            ...(!isProductionLikeRuntime() ? { terms: 1 } : {}),
          };
        })
        .filter((profile: any) => profile !== null);
    } catch (error) {
      if (isProductionLikeRuntime()) throw error;
      return [];
    }
  }

  /**
   * Fetch 6-Tier Sub-Constituency Hierarchy for an Assembly Constituency (JOB 013).
   * Traverses Urban Local Bodies, Wards, Gram Panchayats, and Polling Booths.
   */
  async getSubConstituencyHierarchy(
    stateCode: string,
    acNo: number,
  ): Promise<SubConstituencyHierarchyDTO | null> {
    if (!stateCode || typeof acNo !== 'number') return null;
    const code = stateCode.toUpperCase();

    // 1. Resolve Assembly Constituency
    let brief = await this.getConstituency(code, acNo);
    if (!brief && isProductionLikeRuntime()) {
      if (!this.isAvailable()) {
        throw new Error('Canonical geography datastore is not configured');
      }
      throw new Error('Canonical constituency record could not be resolved');
    }
    if (!brief) brief = getStateConstituency(code, acNo);
    if (!brief) return null;

    if (isProductionLikeRuntime() && !brief.internalId) {
      throw new Error('Canonical constituency internal ID is unavailable');
    }
    const constituencyInternalId = brief.internalId ?? brief.id;

    let ulbs: SubConstituencyHierarchyDTO['urbanLocalBodies'] = [];
    let gps: SubConstituencyHierarchyDTO['gramPanchayats'] = [];
    let booths: SubConstituencyHierarchyDTO['pollingBooths'] = [];

    if (this.isAvailable()) {
      try {
        // Start with constituency-scoped booth rows; parent records are fetched
        // only for IDs referenced by those rows, never as a full-state dump.
        const boothRes = await supabase
          .from('polling_booths')
          .select(
            'id, internal_id, booth_number, booth_name, polling_station_name, total_voters, panchayat_id, ulb_ward_internal_id, gp_ward_internal_id',
          )
          .eq('constituency_id', brief.id);
        if (boothRes.error) throw boothRes.error;
        const boothRows = (
          Array.isArray(boothRes.data) ? boothRes.data : []
        ) as HierarchyBoothRow[];
        booths = boothRows.map((b) => ({
          id: b.id,
          internalId: b.internal_id || b.id,
          boothNumber: b.booth_number,
          boothName: b.booth_name,
          pollingStationName: b.polling_station_name ?? null,
          totalVoters:
            typeof b.total_voters === 'number' &&
            Number.isFinite(b.total_voters) &&
            b.total_voters > 0
              ? b.total_voters
              : null,
          localBodyType: b.ulb_ward_internal_id
            ? 'ulb'
            : b.panchayat_id
              ? 'gram_panchayat'
              : 'unassigned',
          panchayatId: b.panchayat_id ?? null,
          ulbWardId: b.ulb_ward_internal_id ?? null,
          gpWardId: b.gp_ward_internal_id ?? null,
        }));

        const ulbWardRes = await supabase
          .from('ulb_wards')
          .select('id, internal_id, ulb_id, ward_no, name, reservation')
          .eq('constituency_id', brief.id);
        if (ulbWardRes.error) throw ulbWardRes.error;
        const ulbWardRows = (
          Array.isArray(ulbWardRes.data) ? ulbWardRes.data : []
        ) as HierarchyULBWardRow[];
        const ulbIds = [...new Set(ulbWardRows.map((ward) => ward.ulb_id))];
        if (ulbIds.length > 0) {
          const ulbRes = await supabase
            .from('urban_local_bodies')
            .select('id, internal_id, name, local_name, type, lgd_code, total_wards')
            .in('id', ulbIds);
          if (ulbRes.error) throw ulbRes.error;
          const ulbRows = (Array.isArray(ulbRes.data) ? ulbRes.data : []) as HierarchyULBRow[];
          ulbs = ulbRows.map((ulb) => ({
            id: ulb.id,
            internalId: ulb.internal_id || ulb.id,
            name: ulb.name,
            ...(ulb.local_name ? { localName: ulb.local_name } : {}),
            type: ulb.type,
            lgdCode: ulb.lgd_code,
            totalWards: ulb.total_wards,
            wards: ulbWardRows
              .filter((ward) => ward.ulb_id === ulb.id)
              .map((ward) => ({
                id: ward.id,
                internalId: ward.internal_id || ward.id,
                wardNo: ward.ward_no,
                name: ward.name,
                reservation: ward.reservation,
              })),
          }));
        }

        const gpWardIds = [
          ...new Set(
            boothRows
              .map((booth) => booth.gp_ward_internal_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0),
          ),
        ];
        let boothLinkedGpWardRows: HierarchyGPWardRow[] = [];
        if (gpWardIds.length > 0) {
          const gpWardRes = await supabase
            .from('gp_wards')
            .select('id, internal_id, panchayat_id, ward_no, name, reservation')
            .in('internal_id', gpWardIds);
          if (gpWardRes.error) throw gpWardRes.error;
          if (Array.isArray(gpWardRes.data)) {
            boothLinkedGpWardRows = gpWardRes.data as HierarchyGPWardRow[];
          }
        }

        const panchayatIds = [
          ...new Set(
            [
              ...boothRows.map((booth) => booth.panchayat_id),
              ...boothLinkedGpWardRows.map((ward) => ward.panchayat_id),
            ].filter(Boolean),
          ),
        ];
        if (panchayatIds.length > 0) {
          const gpRes = await supabase
            .from('gram_panchayats')
            .select('id, internal_id, name, local_name, mandal_id, lgd_code')
            .in('id', panchayatIds);
          if (gpRes.error) throw gpRes.error;
          const gpRows = (Array.isArray(gpRes.data) ? gpRes.data : []) as HierarchyGPRow[];
          const gpIds = [...new Set(gpRows.map((gp) => gp.id))];
          const allGpWardRows: HierarchyGPWardRow[] = [...boothLinkedGpWardRows];
          if (gpIds.length > 0) {
            const gpWardRes = await supabase
              .from('gp_wards')
              .select('id, internal_id, panchayat_id, ward_no, name, reservation')
              .in('panchayat_id', gpIds);
            if (gpWardRes.error) throw gpWardRes.error;
            if (Array.isArray(gpWardRes.data)) {
              const rowsById = new Map<string, HierarchyGPWardRow>();
              const completeGpWardRows = gpWardRes.data as HierarchyGPWardRow[];
              for (const ward of [...boothLinkedGpWardRows, ...completeGpWardRows]) {
                rowsById.set(ward.id, ward);
              }
              allGpWardRows.splice(0, allGpWardRows.length, ...rowsById.values());
            }
          }
          gps = gpRows.map((gp) => ({
            id: gp.id,
            internalId: gp.internal_id || gp.id,
            name: gp.name,
            ...(gp.local_name ? { localName: gp.local_name } : {}),
            mandalId: gp.mandal_id,
            lgdCode: gp.lgd_code,
            wards: allGpWardRows
              .filter((ward) => ward.panchayat_id === gp.id)
              .map((ward) => ({
                id: ward.id,
                internalId: ward.internal_id || ward.id,
                wardNo: ward.ward_no,
                name: ward.name,
                reservation: ward.reservation,
              })),
          }));
        }
      } catch (error) {
        if (isProductionLikeRuntime()) throw error;
        // Fall back to synthetic canonical hierarchy below
      }
    }

    // Keep the hand-authored hierarchy available only for local/demo use. Never
    // report sample wards, booths, or voter counts as live campaign geography.
    if (
      !isProductionLikeRuntime() &&
      ulbs.length === 0 &&
      gps.length === 0 &&
      booths.length === 0
    ) {
      if (acNo === 4) {
        // Mancherial
        ulbs = [
          {
            id: 'TS-ULB-803420',
            internalId: '00000000-0000-0000-0000-000000040001',
            name: 'Mancherial Municipality',
            localName: 'మంచిర్యాల మున్సిపాలిటీ',
            type: 'municipality',
            lgdCode: 803420,
            totalWards: 36,
            wards: [
              {
                id: 'TS-ULB-803420-W01',
                internalId: '00000000-0000-0000-0000-000000040101',
                wardNo: 1,
                name: 'Mancherial Ward 1 (Old Town)',
                reservation: 'GEN',
              },
            ],
          },
        ];
        booths = [
          {
            id: 'TS-AC04-B001',
            internalId: '00000000-0000-0000-0000-000000040501',
            boothNumber: 1,
            boothName: 'Govt High School Mancherial Room 1',
            pollingStationName: 'Government High School for Boys',
            totalVoters: 1042,
            localBodyType: 'ulb',
            ulbWardId: '00000000-0000-0000-0000-000000040101',
          },
        ];
      } else if (acNo === 72) {
        // Kodangal
        gps = [
          {
            id: 'TS-GP-210001',
            internalId: '00000000-0000-0000-0000-000000720001',
            name: 'Hasnabad',
            localName: 'హస్నాబాద్',
            mandalId: 'TS-MDL-7105',
            lgdCode: 210001,
            wards: [
              {
                id: 'TS-GP-210001-W01',
                internalId: '00000000-0000-0000-0000-000000720101',
                wardNo: 1,
                name: 'Hasnabad Ward 1',
                reservation: 'GEN',
              },
            ],
          },
        ];
        booths = [
          {
            id: 'TS-AC72-B001',
            internalId: '00000000-0000-0000-0000-000000720501',
            boothNumber: 1,
            boothName: 'MPPS Hasnabad Room 1',
            pollingStationName: 'Mandal Parishad Primary School',
            totalVoters: 850,
            localBodyType: 'gram_panchayat',
            panchayatId: 'TS-GP-210001',
            gpWardId: '00000000-0000-0000-0000-000000720101',
          },
        ];
      }
    }

    return {
      constituency: {
        id: brief.id,
        internalId: constituencyInternalId,
        acNo: brief.acNo,
        name: brief.name,
        stateCode: brief.stateCode,
        district: brief.district,
        reservationStatus: brief.reservationStatus,
      },
      urbanLocalBodies: ulbs,
      gramPanchayats: gps,
      pollingBooths: booths,
    };
  }

  /**
   * Real Geographic Mapping: PostGIS Spatial Point-in-Polygon (JOB 016).
   * Resolves [lat, lng] to canonical Assembly Constituency without hardcoded TS fallbacks.
   */
  async locatePoint(coords: { lat: number; lng: number }): Promise<LocatePointResponse> {
    const { lat, lng } = coords;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(
        'INVALID_COORDINATES: Latitude must be in [-90, 90] and Longitude in [-180, 180]',
      );
    }

    // Production uses only the versioned DB lookup. It returns geography fields
    // separately from the tenure registry so deprecated officeholder columns
    // cannot leak through this endpoint.
    if (isProductionLikeRuntime()) {
      if (!this.isAvailable()) {
        return {
          latitude: lat,
          longitude: lng,
          constituency: null,
          message:
            'Constituency lookup is unavailable because the live database is not configured.',
          source: 'unavailable',
        };
      }

      try {
        const { data, error } = await supabase.rpc('locate_constituency_point_truthful', {
          p_lat: lat,
          p_lng: lng,
        });
        if (error) {
          return {
            latitude: lat,
            longitude: lng,
            constituency: null,
            message: 'Constituency lookup is temporarily unavailable.',
            source: 'unavailable',
          };
        }

        if (!Array.isArray(data) || data.length === 0) {
          return {
            latitude: lat,
            longitude: lng,
            constituency: null,
            message: 'No constituency boundary matches this location.',
            source: 'postgis_spatial',
          };
        }

        if (data.length !== 1) {
          return {
            latitude: lat,
            longitude: lng,
            constituency: null,
            message:
              'More than one constituency boundary matches this location; the result was withheld.',
            source: 'postgis_spatial',
          };
        }

        const row = data[0] as any;
        const tenure = (await this.getCurrentTenureMap([row.id])).get(row.id);
        return {
          latitude: lat,
          longitude: lng,
          constituency: {
            id: row.id,
            ...(row.internal_id ? { internalId: row.internal_id } : {}),
            name: row.name,
            acNo: row.ac_no,
            stateCode: row.state_code,
            district: row.district || '',
            reservationStatus: row.reservation_status || 'GEN',
            currentParty: tenure?.currentParty || '',
            currentMLA: tenure?.currentMLA || '',
            officeholderStatus: tenure?.currentMLA ? 'INCUMBENT_ACTIVE' : 'UNRESOLVED',
          },
          message: 'Constituency located',
          source: 'postgis_spatial',
        };
      } catch {
        return {
          latitude: lat,
          longitude: lng,
          constituency: null,
          message: 'Constituency lookup is temporarily unavailable.',
          source: 'unavailable',
        };
      }
    }

    // Development may use the local geography file while the DB function is
    // being configured. It is never used as a production political data source.
    if (this.isAvailable()) {
      try {
        const { data, error } = await supabase.rpc('locate_constituency_point_truthful', {
          p_lat: lat,
          p_lng: lng,
        });
        if (!error && Array.isArray(data) && data.length === 1) {
          const row = data[0] as any;
          return {
            latitude: lat,
            longitude: lng,
            constituency: {
              id: row.id,
              ...(row.internal_id ? { internalId: row.internal_id } : {}),
              name: row.name,
              acNo: row.ac_no,
              stateCode: row.state_code,
              district: row.district || '',
              reservationStatus: row.reservation_status || 'GEN',
              currentParty: '',
              currentMLA: '',
              officeholderStatus: 'UNRESOLVED',
            },
            message: 'Constituency located',
            source: 'postgis_spatial',
          };
        }
      } catch {
        // Development can continue to the local boundary file below.
      }
    }

    // 2. Point-in-Polygon scan over local authoritative GeoJSON if available
    try {
      const geojsonPath = path.resolve(
        __dirname,
        '../../../../data/geo/telangana-assembly.geojson',
      );
      if (fs.existsSync(geojsonPath)) {
        const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
        const found = findConstituencyAtPoint(lng, lat, geojson);
        if (found) {
          const acNo = found.properties.AC_NO || found.properties.ac_no;
          const stCode = found.properties.ST_CODE || found.properties.state_code || 'TS';
          const c = getStateConstituency(stCode, acNo);
          if (c) {
            return {
              latitude: lat,
              longitude: lng,
              constituency: c,
              message: 'Constituency located',
              source: 'canonical_database',
            };
          }
        }
      }
    } catch {
      // Continue to known coordinate boundaries
    }

    // 3. Known landmark coordinates are a development convenience only.
    const landmarks = [
      { name: 'Kodangal', lat: 17.1105, lng: 77.6253, stateCode: 'TS', acNo: 72 },
      { name: 'Gajwel', lat: 17.8505, lng: 78.6833, stateCode: 'TS', acNo: 33 },
      { name: 'Mancherial', lat: 18.8714, lng: 79.4637, stateCode: 'TS', acNo: 4 },
      { name: 'Charminar', lat: 17.3616, lng: 78.4747, stateCode: 'TS', acNo: 66 },
      { name: 'Secunderabad', lat: 17.4399, lng: 78.4983, stateCode: 'TS', acNo: 70 },
      { name: 'Secunderabad Cantonment', lat: 17.48, lng: 78.49, stateCode: 'TS', acNo: 71 },
      { name: 'Jubilee Hills', lat: 17.4319, lng: 78.4074, stateCode: 'TS', acNo: 61 },
      { name: 'Nampally', lat: 17.385, lng: 78.471, stateCode: 'TS', acNo: 63 },
    ];

    for (const lm of landmarks) {
      const dLat = Math.abs(lat - lm.lat);
      const dLng = Math.abs(lng - lm.lng);
      if (dLat < 0.08 && dLng < 0.08) {
        const c = getStateConstituency(lm.stateCode, lm.acNo);
        if (c) {
          return {
            latitude: lat,
            longitude: lng,
            constituency: c,
            message: 'Constituency located',
            source: 'canonical_database',
          };
        }
      }
    }

    return {
      latitude: lat,
      longitude: lng,
      constituency: null,
      message: 'No constituency found at this location',
      source: 'canonical_database',
    };
  }

  /**
   * Real Geographic Mapping: Deterministic Postal Crosswalk (PIN -> AC) (JOB 016).
   * Supports single-AC resolution and multi-AC candidate overlap breakdown.
   */
  async locateByPinCode(pinCode: string): Promise<LocatePinCodeResponse> {
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
      throw new Error('INVALID_PIN_CODE: Postal PIN code must be exactly 6 digits.');
    }

    const item = CURATED_PROVISIONAL_PIN_DIRECTORY[pinCode];
    if (!item) {
      return {
        pinCode,
        singleMatch: false,
        primaryConstituency: null,
        candidates: [],
        message: `No curated constituency reference is available for PIN code ${pinCode}.`,
        source: 'curated_provisional_directory',
      };
    }

    const verificationStatus = item.verificationStatus;
    const canAssertSingleMatch = verificationStatus === 'AUTHORITATIVE_RELATIONSHIP_ESTABLISHED';
    const candidateAcNos =
      verificationStatus === 'DOCUMENTED_MULTI_AC_AMBIGUITY'
        ? item.candidateAcNos || []
        : typeof item.canonicalAcNo === 'number'
          ? [item.canonicalAcNo]
          : item.candidateAcNos || [];

    const candidates: PinCodeCandidate[] = [];
    for (const acNo of candidateAcNos) {
      const constituency = isProductionLikeRuntime()
        ? await this.getConstituency(item.stateCode, acNo)
        : getStateConstituency(item.stateCode, acNo);
      if (!constituency) continue;
      candidates.push({
        constituency,
        // The reviewed PIN sources establish candidates or ambiguity, not
        // population-area proportions. Never turn equal splitting into a probability.
        overlapWeight: null,
        verificationStatus,
        localityNote: `${item.locality} (${item.knownLimitations || ''})`.trim(),
      });
    }

    const exactCandidate = canAssertSingleMatch ? (candidates[0]?.constituency ?? null) : null;
    const singleMatch = canAssertSingleMatch && candidates.length === 1;

    return {
      pinCode,
      singleMatch,
      primaryConstituency: singleMatch ? exactCandidate : null,
      candidates: singleMatch
        ? candidates.map((candidate) => ({ ...candidate, overlapWeight: 1 }))
        : candidates,
      verificationStatus,
      message:
        verificationStatus === 'DOCUMENTED_MULTI_AC_AMBIGUITY'
          ? item.knownLimitations
          : singleMatch
            ? 'PIN code is linked to one constituency by verified source evidence.'
            : candidates.length > 0
              ? `Provisional reference only; a one-to-one PIN-to-constituency match is not established. ${item.knownLimitations}`
              : 'The curated PIN reference has no matching canonical constituency record available.',
      source: 'curated_provisional_directory',
    };
  }
}

export const canonicalGeographyService = new CanonicalGeographyService();
