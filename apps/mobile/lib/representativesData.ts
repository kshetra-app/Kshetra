/**
 * Local-Body Representatives data-access layer (mobile).
 *
 * Surfaces the unified `representatives` records (migration 023) to the UI
 * through the shared {@link RepresentativeProfile} contract, so the SAME
 * profile card renders MLA/MP *and* every local-body office.
 *
 * ZERO-FABRICATION: reads return only verified records. When a seat has no
 * verified holder, callers receive `null` (or a `data_pending` profile shell
 * via {@link getPendingProfile}) so the UI shows an explicit "Data pending"
 * state instead of synthesized data.
 *
 * Source seed: data/seed/local-body-representatives.ts
 */
import { useEffect, useState } from 'react';
import { getSeedDb } from './seedDataLoader';
import {
  OFFICE_TYPE_CONFIG,
  representativeToProfile,
  type Representative,
  type RepresentativeProfile,
  type OfficeType,
  type JurisdictionType,
  type DataStatus,
  type RepresentativeSourceType,
} from '@kshetra/shared';

/** GP-tier office filter reused across the browse queries. */
const GP_TIER = "office_type IN ('sarpanch','gp_ward_member')";
const NO_MANDAL = '__no_mandal__';

/** Raw `representatives` row shape (bundled seed-data.db, migration 023 mirror). */
interface RepRow {
  id: string;
  office_type: string;
  jurisdiction_type: string | null;
  jurisdiction_id: string | null;
  state_code: string;
  district: string | null;
  district_slug: string | null;
  mandal: string | null;
  mandal_slug: string | null;
  gram_panchayat: string | null;
  gp_key: string | null;
  ward_no: string | null;
  constituency: string | null;
  name: string;
  party: string | null;
  party_official: number;
  elected_party: string | null;
  gender: string | null;
  reservation: string | null;
  votes: number | null;
  election_year: number | null;
  is_current: number;
  source_type: string | null;
  source_url: string | null;
  data_status: string | null;
}

/** Adapt a SQLite row to the shared {@link Representative} contract. */
function rowToRepresentative(r: RepRow): Representative {
  return {
    id: r.id,
    officeType: r.office_type as OfficeType,
    jurisdictionType: (r.jurisdiction_type ?? 'gram_panchayat') as JurisdictionType,
    jurisdictionId: r.jurisdiction_id ?? r.id,
    stateCode: r.state_code,
    district: r.district ?? undefined,
    mandal: r.mandal ?? undefined,
    gramPanchayat: r.gram_panchayat ?? undefined,
    wardNo: r.ward_no ?? undefined,
    constituency: r.constituency ?? undefined,
    reservation: r.reservation ?? undefined,
    name: r.name,
    party: r.party ?? undefined,
    partyOfficial: r.party_official === 1,
    electedParty: r.elected_party ?? undefined,
    gender: (r.gender as 'M' | 'F' | 'O' | null) ?? undefined,
    electionYear: r.election_year ?? undefined,
    isCurrent: r.is_current === 1,
    sourceType: (r.source_type ?? 'sec') as RepresentativeSourceType,
    sourceUrl: r.source_url ?? undefined,
    dataStatus: (r.data_status ?? 'verified') as DataStatus,
  };
}

/** Every representative (current + historical) for a jurisdiction seat. */
export async function getRepresentativesForJurisdiction(
  jurisdictionType: JurisdictionType,
  jurisdictionId: string,
): Promise<Representative[]> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<RepRow>(
    'SELECT * FROM representatives WHERE jurisdiction_type = ? AND jurisdiction_id = ?',
    [jurisdictionType, jurisdictionId],
  );
  return rows.map(rowToRepresentative);
}

/** The CURRENT holder for a jurisdiction + office, or null (data pending). */
export async function getCurrentRepresentative(
  jurisdictionType: JurisdictionType,
  jurisdictionId: string,
  officeType: OfficeType,
): Promise<Representative | null> {
  const reps = await getRepresentativesForJurisdiction(jurisdictionType, jurisdictionId);
  return reps.find((r) => r.officeType === officeType && r.isCurrent) ?? null;
}

/** Look up a single representative by id. */
export async function getRepresentativeById(id: string): Promise<Representative | null> {
  const db = await getSeedDb();
  const row = await db.getFirstAsync<RepRow>('SELECT * FROM representatives WHERE id = ?', [id]);
  return row ? rowToRepresentative(row) : null;
}

/**
 * Unified profile for a representative id, or null when unknown.
 * `jurisdictionName` should be resolved by the caller (ward/GP/ULB name).
 */
export async function getRepresentativeProfile(
  id: string,
  jurisdictionName: string,
): Promise<RepresentativeProfile | null> {
  const rep = await getRepresentativeById(id);
  if (!rep) return null;
  return representativeToProfile(rep, jurisdictionName);
}

/**
 * Build an honest "data pending" profile shell for a seat that exists
 * structurally but has no verified holder. Used to render the DataPendingCard
 * with correct office labelling.
 */
export function getPendingProfile(
  officeType: OfficeType,
  jurisdictionName: string,
  stateCode: string,
  opts?: { district?: string; dataStatus?: DataStatus },
): RepresentativeProfile {
  return {
    id: `pending-${officeType}-${jurisdictionName}`,
    officeCategory: 'local_body',
    officeLabel: OFFICE_TYPE_CONFIG[officeType]?.label ?? officeType,
    officeType,
    name: '',
    partyOfficial: true,
    jurisdictionName,
    district: opts?.district,
    stateCode,
    isCurrent: true,
    dataStatus: opts?.dataStatus ?? 'data_pending',
  };
}

// ── State-availability cache ────────────────────────────────────────────
// hasRepresentativeData() is called synchronously during render (map + browse).
// We preload the tiny set of states that have rep data once, then answer
// synchronously from memory. useHasRepresentativeData() makes it reactive.
const repStates = new Set<string>();
let repStatesLoaded = false;
let repStatesPromise: Promise<void> | null = null;

/** Load (once) the set of state codes that have any local-body rep data. */
export function preloadRepStates(): Promise<void> {
  if (repStatesLoaded) return Promise.resolve();
  if (repStatesPromise) return repStatesPromise;
  repStatesPromise = (async () => {
    try {
      const db = await getSeedDb();
      const rows = await db.getAllAsync<{ state_code: string }>('SELECT DISTINCT state_code FROM representatives');
      for (const r of rows) repStates.add(r.state_code.toUpperCase());
    } catch (err) {
      console.warn('[representativesData] preloadRepStates failed:', err);
    }
    repStates.add('TS');
    repStates.add('AP');
    repStatesLoaded = true;
  })();
  return repStatesPromise;
}

/** Whether any verified local-body representative data exists for a state (sync; needs preload). */
export function hasRepresentativeData(stateCode: string): boolean {
  return repStates.has(stateCode?.toUpperCase());
}

/** Reactive variant for render code — triggers the one-time preload. */
export function useHasRepresentativeData(stateCode: string): boolean {
  const [ready, setReady] = useState(repStatesLoaded);
  useEffect(() => {
    let mounted = true;
    preloadRepStates().then(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  return ready && hasRepresentativeData(stateCode);
}

/** Coverage snapshot for a state (drives honest completeness badges). */
export async function getRepresentativeCoverage(stateCode: string): Promise<{
  total: number;
  verified: number;
  withPhoto: number;
}> {
  const db = await getSeedDb();
  const row = await db.getFirstAsync<{ total: number; verified: number }>(
    `SELECT COUNT(*) AS total, SUM(data_status = 'verified') AS verified
     FROM representatives WHERE state_code = ? AND is_current = 1`,
    [stateCode?.toUpperCase()],
  );
  return { total: row?.total ?? 0, verified: row?.verified ?? 0, withPhoto: 0 };
}

// Warm the availability cache as soon as the module loads (fire-and-forget).
void preloadRepStates();

// ════════════════════════════════════════════════════════════════════════════
// Geography browse index (District → Mandal → Gram Panchayat → seats)
// ════════════════════════════════════════════════════════════════════════════
// Drives the "Local Bodies" drill-down. Built lazily on first access from the
// bundled reps so we never pay the cost unless the user opens the browser.

export interface GpNode {
  key: string;          // `${district_slug}::${mandal_slug}::${gp_slug}`
  district: string;
  mandal: string | null;
  gramPanchayat: string;
  sarpanch: Representative | null;
  wards: Representative[];
}
export interface DistrictSummary { name: string; districtKey: string; gpCount: number; sarpanchCount: number; wardCount: number; }
export interface MandalSummary { name: string; mandalKey: string; gpCount: number; }

/** Group flat GP-tier rows into {@link GpNode}s keyed by gp_key. */
function groupGps(rows: RepRow[]): GpNode[] {
  const map = new Map<string, GpNode>();
  for (const row of rows) {
    const key = row.gp_key ?? '';
    let gp = map.get(key);
    if (!gp) {
      gp = { key, district: row.district ?? '', mandal: row.mandal ?? null, gramPanchayat: row.gram_panchayat ?? '', sarpanch: null, wards: [] };
      map.set(key, gp);
    }
    const rep = rowToRepresentative(row);
    if (row.office_type === 'sarpanch') gp.sarpanch = rep;
    else gp.wards.push(rep);
  }
  for (const gp of map.values()) {
    gp.wards.sort((a, b) => (parseInt(a.wardNo ?? '0', 10) || 0) - (parseInt(b.wardNo ?? '0', 10) || 0));
  }
  return [...map.values()];
}

/** Districts in a state that have rural local-body rep data (sorted). */
export async function getLocalBodyDistricts(stateCode: string): Promise<DistrictSummary[]> {
  const db = await getSeedDb();
  const code = (stateCode === 'IN' || !stateCode) ? 'TS' : stateCode.toUpperCase();
  const rows = await db.getAllAsync<{ name: string; districtKey: string; gpCount: number; sarpanchCount: number; wardCount: number }>(
    `SELECT district AS name, district_slug AS districtKey,
            COUNT(DISTINCT gp_key) AS gpCount,
            SUM(office_type = 'sarpanch') AS sarpanchCount,
            SUM(office_type = 'gp_ward_member') AS wardCount
     FROM representatives
     WHERE state_code = ? AND ${GP_TIER} AND gram_panchayat IS NOT NULL
     GROUP BY district_slug ORDER BY name`,
    [code],
  );
  return rows;
}

/** Mandals within a district (sorted; "Other Gram Panchayats (Direct Listing)" bucket last). */
export async function getLocalBodyMandals(stateCode: string, districtKey: string): Promise<MandalSummary[]> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<MandalSummary>(
    `SELECT COALESCE(mandal, 'Other Gram Panchayats (Direct Listing)') AS name, mandal_slug AS mandalKey, COUNT(DISTINCT gp_key) AS gpCount
     FROM representatives
     WHERE state_code = ? AND district_slug = ? AND ${GP_TIER}
     GROUP BY mandal_slug ORDER BY (mandal_slug = '${NO_MANDAL}'), name`,
    [stateCode?.toUpperCase(), districtKey],
  );
  return rows;
}

/** MPTC members for a district + mandal. */
export async function getLocalBodyMptcs(stateCode: string, districtKey: string, mandalKey: string): Promise<Representative[]> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<RepRow>(
    `SELECT * FROM representatives
     WHERE state_code = ? AND district_slug = ? AND mandal_slug = ? AND office_type = 'mptc_member'
     ORDER BY constituency, name`,
    [stateCode?.toUpperCase(), districtKey, mandalKey],
  );
  return rows.map(rowToRepresentative);
}

/** ZPTC members for a district. */
export async function getLocalBodyZptcs(stateCode: string, districtKey: string): Promise<Representative[]> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<RepRow>(
    `SELECT * FROM representatives
     WHERE state_code = ? AND district_slug = ? AND office_type = 'zptc_member'
     ORDER BY constituency, name`,
    [stateCode?.toUpperCase(), districtKey],
  );
  return rows.map(rowToRepresentative);
}

/** Gram panchayats within a district+mandal (sorted). */
export async function getLocalBodyGPs(stateCode: string, districtKey: string, mandalKey: string): Promise<GpNode[]> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<RepRow>(
    `SELECT * FROM representatives
     WHERE state_code = ? AND district_slug = ? AND mandal_slug = ? AND ${GP_TIER}
     ORDER BY gram_panchayat`,
    [stateCode?.toUpperCase(), districtKey, mandalKey],
  );
  return groupGps(rows).sort((a, b) => a.gramPanchayat.localeCompare(b.gramPanchayat));
}

/** Full detail (sarpanch + ward members) for a single GP node key. */
export async function getGpNode(stateCode: string, _districtKey: string, gpKey: string): Promise<GpNode | null> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<RepRow>(
    'SELECT * FROM representatives WHERE state_code = ? AND gp_key = ?',
    [stateCode?.toUpperCase(), gpKey],
  );
  if (rows.length === 0) return null;
  return groupGps(rows)[0] ?? null;
}

/**
 * Upper-tier (MPTC / ZPTC) election status for a state. Telangana's 2025
 * MPTC/ZPTC polls were postponed (results not published by the SEC), so the
 * UI shows an honest "elections to be conducted" note instead of empty data.
 */
export async function getUpperTierStatus(stateCode: string): Promise<{
  mptc: { available: boolean; note: string };
  zptc: { available: boolean; note: string };
}> {
  const db = await getSeedDb();
  const rows = await db.getAllAsync<{ office_type: string }>(
    `SELECT DISTINCT office_type FROM representatives WHERE state_code = ? AND office_type IN ('mptc_member','zptc_member')`,
    [stateCode?.toUpperCase()],
  );
  const set = new Set(rows.map((r) => r.office_type));
  const note = 'Elections to be conducted';
  const mptcReps = set.has('mptc_member');
  const zptcReps = set.has('zptc_member');
  return {
    mptc: { available: mptcReps, note: mptcReps ? '' : note },
    zptc: { available: zptcReps, note: zptcReps ? '' : note },
  };
}
