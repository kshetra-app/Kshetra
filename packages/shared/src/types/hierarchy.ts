/**
 * @module hierarchy
 * @description
 * Type definitions for the complete administrative / electoral hierarchy
 * in India:
 *
 *   Booth → Panchayat → Village → Mandal → Constituency → District
 *         → Parliamentary → State
 *
 * Key design decisions:
 *   - Booths always belong to exactly ONE Assembly Constituency (1:1).
 *   - Mandal-to-Constituency is **many-to-many** — mandal boundaries are
 *     drawn by Revenue departments while constituency boundaries are drawn
 *     by the Delimitation Commission. They frequently cross each other.
 *   - State-specific terminology is modelled via union types
 *     (mandal / block / tehsil / taluk / circle).
 *   - All aggregations expose validation fields so consumers can verify
 *     data integrity (100 % accuracy goal).
 *
 * @see https://lgdirectory.gov.in  — Local Government Directory (canonical codes)
 * @see https://eci.gov.in          — Election Commission of India
 */

// ═══════════════════════════════════════════════════════════════════════════
// Enums & Union Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Administrative / electoral level in the Indian governance hierarchy,
 * ordered from the lowest granularity to the highest.
 *
 * | Level            | Description                                          |
 * |------------------|------------------------------------------------------|
 * | `booth`          | Polling station (~1 000 – 1 500 voters)              |
 * | `panchayat`      | Gram panchayat or equivalent local body              |
 * | `village`        | Revenue village (Census unit)                        |
 * | `mandal`         | Sub-district unit (mandal / block / tehsil / taluk)  |
 * | `constituency`   | Assembly Constituency (AC / Vidhan Sabha seat)       |
 * | `district`       | Revenue district                                     |
 * | `parliamentary`  | Parliamentary Constituency (PC / Lok Sabha seat)     |
 * | `state`          | State or Union Territory                             |
 */
export type HierarchyLevel =
  | 'booth'
  | 'panchayat'
  | 'village'
  | 'mandal'
  | 'constituency'
  | 'district'
  | 'parliamentary'
  | 'state';

/**
 * State-specific name for the sub-district administrative unit.
 *
 * - `mandal`  — Telangana, Andhra Pradesh
 * - `block`   — Uttar Pradesh, Bihar, Jharkhand, Madhya Pradesh, Rajasthan …
 * - `tehsil`  — Haryana, Himachal Pradesh, Uttarakhand
 * - `taluk`   — Tamil Nadu, Karnataka, Kerala
 * - `circle`  — North-eastern states (Assam, Meghalaya)
 */
export type MandalType = 'mandal' | 'block' | 'tehsil' | 'taluk' | 'circle';

/**
 * Classification of a local body (panchayat or urban equivalent).
 *
 * - `gram_panchayat`    — Rural village council
 * - `village_panchayat` — Alternate naming in some states (TN, Kerala)
 * - `nagar_panchayat`   — Transitional (semi-urban) body
 * - `municipality`      — Urban local body (Class-II / Class-III town)
 * - `corporation`       — Municipal corporation (Class-I city)
 * - `cantonment`        — Military cantonment board area
 */
export type PanchayatType =
  | 'gram_panchayat'
  | 'village_panchayat'
  | 'nagar_panchayat'
  | 'municipality'
  | 'corporation'
  | 'cantonment';

/**
 * Type of local body election conducted by State Election Commissions.
 *
 * - `sarpanch`     — Village head (Sarpanch / Pradhan / Mukhiya)
 * - `ward_member`  — Ward member of a gram panchayat
 * - `municipality` — Municipal council / Nagar Palika election
 * - `zptc`         — Zilla Parishad Territorial Constituency member
 * - `mptc`         — Mandal Parishad Territorial Constituency member
 * - `corporation`  — Municipal corporation ward election
 */
export type LocalElectionType =
  | 'sarpanch'
  | 'ward_member'
  | 'municipality'
  | 'zptc'
  | 'mptc'
  | 'corporation';

// ═══════════════════════════════════════════════════════════════════════════
// Local-Body Representatives (migration 023) — Urban / Rural sub-tiers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classification of an urban local body. Rural bodies remain in
 * {@link GramPanchayat}; this covers the urban tier as a first-class entity.
 */
export type UrbanLocalBodyType =
  | 'corporation'
  | 'municipality'
  | 'nagar_panchayat'
  | 'cantonment';

/**
 * Seat reservation category (incl. woman-reserved `-W` variants) used by
 * State Election Commissions for ward / division rotation each cycle.
 */
export type ReservationCategory =
  | 'GEN' | 'SC' | 'ST' | 'BC'
  | 'GEN-W' | 'SC-W' | 'ST-W' | 'BC-W';

/**
 * Every local-body elected office modelled by the unified
 * {@link Representative} table.
 */
export type OfficeType =
  | 'mayor'
  | 'deputy_mayor'
  | 'corporator'
  | 'ulb_chairperson'
  | 'ulb_vice_chairperson'
  | 'ward_member'
  | 'sarpanch'
  | 'gp_ward_member'
  | 'mptc_member'
  | 'mandal_parishad_president'
  | 'zptc_member'
  | 'zilla_parishad_chairperson';

/**
 * The polymorphic jurisdiction entity a {@link Representative} governs.
 * Resolved against the matching table by `jurisdictionType`.
 */
export type JurisdictionType =
  | 'urban_local_body'
  | 'ulb_ward'
  | 'zilla_parishad'
  | 'zptc_division'
  | 'mandal_parishad'
  | 'mptc_division'
  | 'gram_panchayat'
  | 'gp_ward';

/**
 * Origin of a representative record or a crowdsourced edit.
 */
export type RepresentativeSourceType =
  | 'lgd' | 'sec' | 'lok_dhaba' | 'opencity' | 'wikipedia'
  | 'eci' | 'myneta' | 'news' | 'curated' | 'crowdsourced';

/**
 * Honest data-availability state — the backbone of the zero-fabrication policy.
 *
 * - `verified`                 — sourced from an official / authoritative source
 * - `data_pending`             — the seat exists but the holder is not yet known
 * - `crowdsourced_unverified`  — user-submitted, awaiting moderation
 */
export type DataStatus = 'verified' | 'data_pending' | 'crowdsourced_unverified';

/** Optional polygon geometry as GeoJSON (null → "boundary pending" in UI). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Urban local body — corporation / municipality / nagar panchayat. */
export interface UrbanLocalBody {
  /** Convention: `{stateCode}-ULB-{lgdCode}` */
  id: string;
  name: string;
  localName?: string;
  stateCode: string;
  district: string;
  lgdCode?: number;
  type: UrbanLocalBodyType;
  /** Mayor (corporation) or Chairperson (municipality / nagar panchayat). */
  headOfficeType: 'mayor' | 'chairperson';
  primaryConstituencyId?: string;
  totalWards?: number;
  population2011?: number;
  totalVoters?: number;
  areaSqKm?: number;
  centroid?: GeoPoint;
  /** True when a boundary polygon exists in the DB. */
  hasBoundary?: boolean;
}

/** Ward inside an urban local body — the corporator / councillor seat. */
export interface ULBWard {
  /** Convention: `{ulbId}-W{wardNo}` */
  id: string;
  ulbId: string;
  stateCode: string;
  wardNo: number;
  name?: string;
  localName?: string;
  lgdWardCode?: number;
  reservation: ReservationCategory;
  constituencyId?: string;
  population2011?: number;
  totalVoters?: number;
  centroid?: GeoPoint;
  hasBoundary?: boolean;
}

/** District rural council. Head is the Zilla Parishad Chairperson. */
export interface ZillaParishad {
  /** Convention: `{stateCode}-ZP-{districtSlug}` */
  id: string;
  name: string;
  localName?: string;
  stateCode: string;
  district: string;
  lgdCode?: number;
  totalDivisions?: number;
  population2011?: number;
  hasBoundary?: boolean;
}

/** Zilla Parishad Territorial Constituency — one ZPTC member per division. */
export interface ZPTCDivision {
  id: string;
  zillaParishadId: string;
  /** ZPTC divisions are usually coterminous with a mandal. */
  mandalId?: string;
  stateCode: string;
  name: string;
  divisionNo?: number;
  reservation: ReservationCategory;
  population2011?: number;
  hasBoundary?: boolean;
}

/** Mandal Parishad — block-level rural body. Head is the MPP. */
export interface MandalParishad {
  /** Convention: `{mandalId}-MP` */
  id: string;
  mandalId: string;
  stateCode: string;
  district: string;
  name: string;
  totalDivisions?: number;
  population2011?: number;
  hasBoundary?: boolean;
}

/** Mandal Parishad Territorial Constituency — one MPTC member per division. */
export interface MPTCDivision {
  id: string;
  mandalParishadId: string;
  primaryPanchayatId?: string;
  stateCode: string;
  name: string;
  divisionNo?: number;
  reservation: ReservationCategory;
  population2011?: number;
  hasBoundary?: boolean;
}

/** Gram Panchayat ward — the ward-member seat (highest-volume tier). */
export interface GPWard {
  /** Convention: `{panchayatId}-W{wardNo}` */
  id: string;
  panchayatId: string;
  stateCode: string;
  wardNo: number;
  name?: string;
  reservation: ReservationCategory;
  population2011?: number;
  centroid?: GeoPoint;
  hasBoundary?: boolean;
}

/**
 * Unified local-body office-holder (migration 023 `representatives`).
 *
 * Mirrors the MLA/MP profile fields so a single UI can render every tier.
 * All enrichment fields are optional → when absent the UI shows an explicit
 * "data pending" state rather than a fabricated value.
 */
export interface Representative {
  id: string;

  officeType: OfficeType;
  jurisdictionType: JurisdictionType;
  jurisdictionId: string;

  stateCode: string;
  district?: string;
  /** Sub-district territorial context (rural: mandal/block). */
  mandal?: string;
  /** Gram-panchayat name for GP-tier offices (sarpanch, GP ward member). */
  gramPanchayat?: string;
  /** Ward number within the GP (GP ward members only). */
  wardNo?: string;
  /** Seat reservation category as published by the SEC (e.g. "ST", "BC-Woman"). */
  reservation?: string;

  // Identity
  name: string;
  localName?: string;
  /** De-facto party; undefined when officially non-party. */
  party?: string;
  /** False for officially non-party polls (e.g. AP gram panchayats). */
  partyOfficial: boolean;
  electedParty?: string;
  gender?: 'M' | 'F' | 'O';
  age?: number;
  dob?: string; // YYYY-MM-DD
  dobEstimated?: boolean;
  education?: string;
  profession?: string;
  maritalStatus?: string;
  terms?: number;

  // Affidavit-derived (nullable → data pending)
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;

  // Contact / media (sparse — crowdsourced over time)
  photoUrl?: string;
  phone?: string;
  email?: string;

  // Tenure
  electionYear?: number;
  electionId?: number;
  termStart?: string;
  termEnd?: string;
  isCurrent: boolean;

  // Provenance summary
  sourceType: RepresentativeSourceType;
  sourceUrl?: string;
  dataStatus: DataStatus;
}

/**
 * A single Wikipedia-style edit to a {@link Representative}, carrying source
 * provenance + a forensic fingerprint + moderation status.
 */
export interface RepresentativeEdit {
  id: number;
  representativeId: string;
  editorUserId?: string;
  editorKycVerified: boolean;
  sourceType: RepresentativeSourceType;
  sourceUrl?: string;
  citation?: string;
  /** `{ field: { from, to } }` proposed changes. */
  diff: Record<string, { from: unknown; to: unknown }>;
  /** CCA/KYC forensic snapshot captured at submit time. */
  digitalFingerprint?: Record<string, unknown>;
  submittedAt: string;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNote?: string;
}

/**
 * Interface-unification shape: one profile card renders MLA / MP *and* every
 * local-body office. Local reps map here directly; existing `acNo`-keyed
 * MLA/MP data is adapted via {@link representativeToProfile}-style adapters in
 * the mobile layer. This is NOT a storage merge — purely a display contract.
 */
export interface RepresentativeProfile {
  id: string;
  /** Broad category used to pick labels / icons. */
  officeCategory: 'legislator' | 'local_body';
  /** Specific office label, e.g. 'MLA', 'Mayor', 'Sarpanch', 'ZPTC Member'. */
  officeLabel: string;
  officeType?: OfficeType;

  name: string;
  localName?: string;
  party?: string;
  partyOfficial: boolean;

  /** Jurisdiction display name (constituency name, ward name, GP name, …). */
  jurisdictionName: string;
  district?: string;
  stateCode: string;

  gender?: 'M' | 'F' | 'O';
  age?: number;
  terms?: number;
  education?: string;
  profession?: string;
  maritalStatus?: string;

  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;

  photoUrl?: string;
  phone?: string;
  email?: string;

  isCurrent: boolean;
  termStart?: string;
  termEnd?: string;

  // Provenance (drives the "Source & Provenance" section)
  sourceType?: RepresentativeSourceType | string;
  sourceUrl?: string;
  dataStatus: DataStatus;
  lastEditedBy?: string;
  lastEditedAt?: string;
  fingerprintVerified?: boolean;
}

/** Human-readable label + icon for each {@link OfficeType}. */
export const OFFICE_TYPE_CONFIG: Record<OfficeType, { label: string; short: string; category: 'urban' | 'rural' }> = {
  mayor:                       { label: 'Mayor',                        short: 'Mayor',      category: 'urban' },
  deputy_mayor:                { label: 'Deputy Mayor',                 short: 'Dy. Mayor',  category: 'urban' },
  corporator:                  { label: 'Corporator',                   short: 'Corporator', category: 'urban' },
  ulb_chairperson:             { label: 'Municipal Chairperson',        short: 'Chairperson',category: 'urban' },
  ulb_vice_chairperson:        { label: 'Municipal Vice-Chairperson',   short: 'Vice-Chair', category: 'urban' },
  ward_member:                 { label: 'Ward Member',                  short: 'Ward Member',category: 'urban' },
  sarpanch:                    { label: 'Sarpanch',                     short: 'Sarpanch',   category: 'rural' },
  gp_ward_member:              { label: 'GP Ward Member',               short: 'Ward Member',category: 'rural' },
  mptc_member:                 { label: 'MPTC Member',                  short: 'MPTC',       category: 'rural' },
  mandal_parishad_president:   { label: 'Mandal Parishad President',    short: 'MPP',        category: 'rural' },
  zptc_member:                 { label: 'ZPTC Member',                  short: 'ZPTC',       category: 'rural' },
  zilla_parishad_chairperson:  { label: 'Zilla Parishad Chairperson',   short: 'ZP Chair',   category: 'rural' },
};

/** Map a {@link Representative} row to the unified {@link RepresentativeProfile}. */
export function representativeToProfile(
  rep: Representative,
  jurisdictionName: string,
): RepresentativeProfile {
  return {
    id: rep.id,
    officeCategory: 'local_body',
    officeLabel: OFFICE_TYPE_CONFIG[rep.officeType]?.label ?? rep.officeType,
    officeType: rep.officeType,
    name: rep.name,
    localName: rep.localName,
    party: rep.party,
    partyOfficial: rep.partyOfficial,
    jurisdictionName,
    district: rep.district,
    stateCode: rep.stateCode,
    gender: rep.gender,
    age: rep.age,
    terms: rep.terms,
    education: rep.education,
    profession: rep.profession,
    maritalStatus: rep.maritalStatus,
    criminalCases: rep.criminalCases,
    totalAssets: rep.totalAssets,
    totalLiabilities: rep.totalLiabilities,
    photoUrl: rep.photoUrl,
    phone: rep.phone,
    email: rep.email,
    isCurrent: rep.isCurrent,
    termStart: rep.termStart,
    termEnd: rep.termEnd,
    sourceType: rep.sourceType,
    sourceUrl: rep.sourceUrl,
    dataStatus: rep.dataStatus,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Hierarchy Entities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Polling Booth — the atomic, indivisible unit of election data in India.
 *
 * Each booth serves approximately 1 000 – 1 500 voters and maps to
 * **exactly one** Assembly Constituency. Booth-level results are the
 * finest granularity published by the Election Commission of India.
 *
 * @example
 * ```ts
 * const booth: PollingBooth = {
 *   id: 'TS-AC1-B001',
 *   boothNumber: 1,
 *   boothName: 'ZP High School Main Hall',
 *   pollingStationName: 'ZP High School',
 *   constituencyId: 'TS-AC-001',
 *   stateCode: 'TS',
 *   totalVoters: 1243,
 *   maleVoters: 612,
 *   femaleVoters: 626,
 *   thirdGenderVoters: 5,
 *   isAuxiliary: false,
 * };
 * ```
 */
export interface PollingBooth {
  /** Unique booth identifier. Convention: `{stateCode}-AC{acNo}-B{boothNo}` */
  id: string;

  /** Sequential booth number within the constituency (ECI-assigned) */
  boothNumber: number;

  /** Human-readable booth name (often the room / hall description) */
  boothName: string;

  /** Name of the polling station (building / institution) */
  pollingStationName: string;

  /** Full postal address of the polling station (optional for rural areas) */
  pollingStationAddress?: string;

  /** Assembly Constituency this booth belongs to — always exactly one */
  constituencyId: string;

  /** Gram panchayat / local body this booth falls within (if mapped) */
  panchayatId?: string;

  /** Mandal / block / tehsil this booth falls within (if mapped) */
  mandalId?: string;

  /** Two-letter ISO-style state code (e.g. `'TS'`, `'AP'`, `'KA'`) */
  stateCode: string;

  /** Total registered electors on the voter roll */
  totalVoters: number;

  /** Male registered electors */
  maleVoters: number;

  /** Female registered electors */
  femaleVoters: number;

  /** Third-gender registered electors */
  thirdGenderVoters: number;

  /**
   * Whether this is an auxiliary booth.
   *
   * Auxiliary booths are created when the main booth exceeds ~1 500
   * voters; they share the same polling station but have a separate
   * ballot unit.
   */
  isAuxiliary: boolean;

  /** WGS-84 coordinates of the polling station (if geo-tagged) */
  location?: {
    /** Latitude in decimal degrees */
    latitude: number;
    /** Longitude in decimal degrees */
    longitude: number;
  };
}

/**
 * Gram Panchayat — village-level local self-government body.
 *
 * A gram panchayat typically covers one or more revenue villages and is
 * headed by a Sarpanch (elected). Panchayats always fall within a single
 * mandal but may straddle constituency boundaries in rare edge cases.
 */
export interface GramPanchayat {
  /** Unique panchayat identifier. Convention: `{stateCode}-GP-{lgdCode}` */
  id: string;

  /** Official English name of the panchayat */
  name: string;

  /** Name in the regional language (Telugu, Tamil, Hindi, etc.) */
  localName?: string;

  /** Parent mandal / block this panchayat belongs to */
  mandalId: string;

  /** Two-letter state code */
  stateCode: string;

  /** Local Government Directory numeric code (canonical national ID) */
  lgdCode?: number;

  /** Classification of the local body */
  type: PanchayatType;

  /** Population as per Census 2011 */
  population2011?: number;

  /** Number of households as per Census 2011 */
  totalHouseholds?: number;

  /** Total registered voters across all booths in this panchayat */
  totalVoters?: number;

  /** Geographic area in square kilometres */
  areaSqKm?: number;

  /** Centroid coordinates for map rendering */
  centroid?: {
    /** Latitude in decimal degrees */
    latitude: number;
    /** Longitude in decimal degrees */
    longitude: number;
  };

  // ── Aggregated from child booths ──

  /** Number of polling booths within this panchayat */
  boothCount?: number;

  /** Embedded list of child booths (populated only on detail fetch) */
  booths?: PollingBooth[];
}

/**
 * Revenue Village — the Census / land-record unit of India.
 *
 * Revenue villages are smaller than gram panchayats and are the basic
 * unit of the Census of India. One gram panchayat may contain multiple
 * revenue villages.
 */
export interface RevenueVillage {
  /** Unique village identifier */
  id: string;

  /** Official English name */
  name: string;

  /** Name in the regional language */
  localName?: string;

  /** Parent gram panchayat */
  panchayatId: string;

  /** Parent mandal / block */
  mandalId: string;

  /** Two-letter state code */
  stateCode: string;

  /** Census of India village code (6-digit) */
  censusCode?: string;

  /** Local Government Directory numeric code */
  lgdCode?: number;

  /** Population as per Census 2011 */
  population2011?: number;
}

/**
 * Mandal / Block / Tehsil / Taluk — the sub-district administrative unit.
 *
 * **Critical**: Mandal boundaries do **NOT** align perfectly with Assembly
 * Constituency boundaries. A single mandal may span multiple ACs, and a
 * single AC may include parts of multiple mandals. The relationship is
 * captured via {@link MandalConstituencyOverlap}.
 *
 * @example
 * ```ts
 * const mandal: Mandal = {
 *   id: 'TS-MDL-501',
 *   name: 'Rajendranagar',
 *   stateCode: 'TS',
 *   district: 'Rangareddy',
 *   type: 'mandal',
 * };
 * ```
 */
export interface Mandal {
  /** Unique mandal identifier. Convention: `{stateCode}-MDL-{lgdCode}` */
  id: string;

  /** Official English name */
  name: string;

  /** Name in the regional language */
  localName?: string;

  /** Two-letter state code */
  stateCode: string;

  /** Parent district name */
  district: string;

  /** Local Government Directory numeric code */
  lgdCode?: number;

  /** State-specific terminology for this sub-district unit */
  type: MandalType;

  /** Name of the mandal headquarters town / village */
  headquarters?: string;

  /** Geographic area in square kilometres */
  areaSqKm?: number;

  /** Population as per Census 2011 */
  population2011?: number;

  // ── Relationships ──

  /**
   * How this mandal overlaps with Assembly Constituencies.
   * Populated when the caller needs cross-boundary analysis.
   */
  constituencyOverlaps?: MandalConstituencyOverlap[];

  /** Count of gram panchayats within this mandal */
  panchayatCount?: number;

  /** Embedded list of child panchayats (populated only on detail fetch) */
  panchayats?: GramPanchayat[];

  /** Total polling booths across all panchayats in this mandal */
  boothCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cross-Boundary Relationships
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Describes how a mandal overlaps with an Assembly Constituency.
 *
 * Because mandal and constituency boundaries are drawn by different
 * authorities (Revenue Department vs. Delimitation Commission), they
 * frequently cross each other. This record captures the degree of overlap.
 *
 * @example
 * ```
 * Mandal "Rajendranagar" (TS-MDL-501)
 *   ├─ 65 % in AC "Rajendranagar" (TS-AC-146)  → overlapType: 'partial'
 *   └─ 35 % in AC "Maheshwaram"   (TS-AC-147)  → overlapType: 'partial'
 * ```
 */
export interface MandalConstituencyOverlap {
  /** Mandal identifier */
  mandalId: string;

  /** Assembly Constituency identifier */
  constituencyId: string;

  /**
   * Whether the mandal falls fully or partially within this AC.
   * - `'full'`    — 100 % of the mandal is inside this single AC
   * - `'partial'` — the mandal is split across multiple ACs
   */
  overlapType: 'full' | 'partial';

  /**
   * Percentage of the mandal's area / voters that fall within this AC.
   * Range: `0 < overlapPercentage <= 100`.
   * All overlaps for a given mandal **must** sum to 100.
   */
  overlapPercentage: number;

  /** Number of panchayats from this mandal that are inside this AC */
  panchayatsInAc: number;

  /** Number of registered voters from this mandal that are inside this AC */
  votersInAc: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Election Data — Booth Level & Local Body
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Booth-level election result for an Assembly or Parliamentary election.
 *
 * This is the most granular election data published by ECI. Every record
 * must satisfy these invariants:
 *
 * ```
 * validVotes + rejectedVotes + notaVotes === votesPolled
 * sum(candidateVotes[*].votes)           === validVotes
 * turnoutPercent === (votesPolled / totalVotersInRoll) * 100
 * ```
 */
export interface BoothElectionResult {
  /** The booth this result belongs to */
  boothId: string;

  /** Year of the election (e.g. `2024`) */
  electionYear: number;

  /** Assembly Constituency where this booth was counted */
  constituencyId: string;

  /** Number of electors on the voter roll for this booth */
  totalVotersInRoll: number;

  /** Total ballots cast (including rejected / NOTA) */
  votesPolled: number;

  /** Ballots accepted as valid (excluding rejected + NOTA) */
  validVotes: number;

  /** Ballots rejected by the returning officer */
  rejectedVotes: number;

  /** Votes cast for NOTA ("None of the Above") */
  notaVotes: number;

  /**
   * Voter turnout at this booth as a percentage.
   *
   * Invariant: `turnoutPercent ≈ (votesPolled / totalVotersInRoll) × 100`
   */
  turnoutPercent: number;

  /** Per-candidate breakdown of votes at this booth */
  candidateVotes: BoothCandidateVote[];
}

/**
 * Per-candidate vote count at a single polling booth.
 */
export interface BoothCandidateVote {
  /** Full name of the candidate as on the ballot */
  candidateName: string;

  /** Party affiliation (`'IND'` for independent, `'NOTA'` for NOTA option) */
  party: string;

  /** Number of votes received at this booth */
  votes: number;

  /** Whether this candidate received the highest votes at this booth */
  isWinnerAtBooth: boolean;
}

/**
 * Local body (panchayat / municipality) election conducted by the
 * State Election Commission (SEC).
 *
 * These are separate from Assembly / Parliamentary elections and follow
 * different schedules per state.
 */
export interface LocalBodyElection {
  /** Auto-increment primary key */
  id: number;

  /** The panchayat / municipality this election was held for */
  panchayatId: string;

  /** Two-letter state code */
  stateCode: string;

  /** Year of the election */
  electionYear: number;

  /** Type of local body election */
  electionType: LocalElectionType;

  /**
   * Ward number (applicable for `ward_member`, `municipality`, `corporation`).
   * `undefined` for sarpanch elections (whole-panchayat contest).
   */
  wardNumber?: number;

  /** Total registered voters for this local body / ward */
  totalVoters: number;

  /** Total ballots cast */
  votesPolled: number;

  /**
   * Voter turnout as a percentage.
   *
   * Invariant: `turnoutPercent ≈ (votesPolled / totalVoters) × 100`
   */
  turnoutPercent: number;

  /**
   * Status of the election result:
   * - `'declared'`  — Result officially declared by SEC
   * - `'pending'`   — Counting not yet completed
   * - `'disputed'`  — Result under legal challenge
   * - `'unanimous'` — Candidate elected unopposed (no voting)
   */
  resultStatus: 'declared' | 'pending' | 'disputed' | 'unanimous';

  /** List of candidates who contested this election */
  candidates: LocalBodyCandidate[];
}

/**
 * A candidate in a local body election.
 */
export interface LocalBodyCandidate {
  /** Full name of the candidate */
  candidateName: string;

  /**
   * Party affiliation.
   *
   * Local body elections in many states are officially "non-partisan",
   * but de-facto party affiliations are tracked. Use `'IND'` for
   * genuinely independent candidates.
   */
  party: string;

  /** Votes received (`0` for unanimous elections) */
  votes: number;

  /**
   * Outcome for this candidate:
   * - `'won'`               — Declared winner
   * - `'lost'`              — Did not win
   * - `'forfeited_deposit'` — Lost and forfeited security deposit
   * - `'unanimous'`         — Elected unopposed without voting
   */
  result: 'won' | 'lost' | 'forfeited_deposit' | 'unanimous';

  /** Whether this candidate held the seat before this election */
  isIncumbent: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI / Tree Rendering
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic hierarchy tree node used for rendering drill-down UIs.
 *
 * The tree can be built top-down (State → District → … → Booth) or
 * bottom-up (Booth → Panchayat → … → State) depending on the use case.
 *
 * @typeParam T — Optional payload type for level-specific data
 *               (e.g. `HierarchyNode<Mandal>`).
 *
 * @example
 * ```ts
 * const node: HierarchyNode<Mandal> = {
 *   id: 'TS-MDL-501',
 *   name: 'Rajendranagar',
 *   level: 'mandal',
 *   data: mandalDetail,
 *   totalVoters: 125_000,
 *   totalBooths: 94,
 *   childCount: 12,
 * };
 * ```
 */
export interface HierarchyNode<T = unknown> {
  /** Unique identifier of this entity */
  id: string;

  /** Display name */
  name: string;

  /** Which level of the hierarchy this node represents */
  level: HierarchyLevel;

  /** Level-specific payload (e.g. full `Mandal` or `GramPanchayat` object) */
  data?: T;

  /** Child nodes one level below (lazy-loaded in the UI) */
  children?: HierarchyNode[];

  /** Total registered voters aggregated from all descendant booths */
  totalVoters: number;

  /** Total polling booths under this node */
  totalBooths: number;

  /** Direct child count (not recursive) */
  childCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Aggregation & Analytics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregated data at any level of the hierarchy.
 *
 * Produced by rolling up booth-level data through the hierarchy.
 * All voter counts must satisfy:
 *
 * ```
 * maleVoters + femaleVoters ≈ totalVoters
 * ```
 *
 * (Third-gender voters are captured at booth level; higher aggregations
 * fold them into `totalVoters` but don't break them out separately to
 * avoid zero-heavy columns at aggregate levels.)
 */
export interface AggregatedHierarchyData {
  /** Which level this aggregation represents */
  level: HierarchyLevel;

  /** ID of the entity at this level */
  entityId: string;

  /** Display name of the entity */
  entityName: string;

  /** Two-letter state code */
  stateCode: string;

  // ── Voter statistics (aggregated from booths) ──

  /** Total registered voters */
  totalVoters: number;

  /** Total male registered voters */
  maleVoters: number;

  /** Total female registered voters */
  femaleVoters: number;

  // ── Structural counts ──

  /** Number of polling booths */
  totalBooths: number;

  /** Number of gram panchayats */
  totalPanchayats: number;

  /** Number of mandals / blocks */
  totalMandals: number;

  /** Number of revenue villages */
  totalVillages: number;

  // ── Election data (optional — present when results are loaded) ──

  /** Most recent election year for which data is available */
  lastElectionYear?: number;

  /** Voter turnout in the most recent election (percentage) */
  lastTurnoutPercent?: number;

  /**
   * Party-wise total votes aggregated from booth results.
   * Key: party code (e.g. `'BJP'`, `'INC'`). Value: total votes.
   */
  partyWiseVotes?: Record<string, number>;

  /**
   * Number of booths where each party's candidate received the most votes.
   * Key: party code. Value: number of booths won.
   */
  partyWiseBoothsWon?: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constituency Hierarchy Summary
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Summary of the full hierarchy beneath a single Assembly Constituency.
 *
 * Designed to be embedded as an optional field on `ConstituencyDetail`
 * (from `./constituency.ts`) to bridge the legacy constituency model
 * with the new hierarchy framework.
 *
 * Data integrity is tracked via `dataIntegrityScore`:
 * - `100` → `boothVoterSum === officialVoterTotal` (perfect)
 * - `< 100` → proportional to deviation; investigate missing booths
 */
export interface ConstituencyHierarchy {
  /** Assembly Constituency ID */
  constituencyId: string;

  /** Total polling booths mapped to this AC */
  totalBooths: number;

  /** Total gram panchayats (fully or partially) in this AC */
  totalPanchayats: number;

  /** Total mandals that overlap with this AC */
  totalMandals: number;

  /** Total revenue villages in this AC */
  totalVillages: number;

  /** Detailed mandal-constituency overlap records */
  mandals: MandalConstituencyOverlap[];

  // ── Validation ──

  /**
   * Sum of `totalVoters` across all booths assigned to this AC.
   * Should match `officialVoterTotal` if data is complete.
   */
  boothVoterSum: number;

  /**
   * Official voter total as published by the ECI / CEO for this AC.
   */
  officialVoterTotal: number;

  /**
   * Data integrity score (0 – 100).
   *
   * Calculated as:
   * ```
   * 100 - abs((boothVoterSum - officialVoterTotal) / officialVoterTotal × 100)
   * ```
   *
   * A score of `100` means booth-level data perfectly matches the
   * official total.
   */
  dataIntegrityScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of a hierarchy data-integrity audit for one constituency.
 *
 * Run after data ingestion to catch missing mappings, double-counted
 * booths, voter-total mismatches, and other anomalies.
 */
export interface HierarchyValidationResult {
  /** State code of the constituency being validated */
  stateCode: string;

  /** Constituency ID being validated */
  constituencyId: string;

  /** Individual validation checks */
  checks: {
    /** `true` if every booth has a valid `constituencyId` assignment */
    allBoothsMapped: boolean;

    /**
     * `true` if `boothVoterSum === officialVoterTotal`
     * (within a small tolerance — 0.5 % by default).
     */
    voterTotalMatch: boolean;

    /**
     * Percentage deviation between booth sum and official total.
     * `0` is perfect; positive means booths report more voters than
     * the official count.
     */
    voterTotalDeviation: number;

    /** `true` if every booth has a `panchayatId` assigned */
    allPanchayatsMapped: boolean;

    /** `true` if every booth has a `mandalId` assigned */
    allMandalsMapped: boolean;

    /**
     * Overall completeness score (0 – 100).
     * Factors in booth mapping, voter match, panchayat + mandal coverage.
     */
    completenessScore: number;
  };

  /** Hard errors that must be fixed (e.g. missing booths, duplicates) */
  errors: string[];

  /** Soft warnings (e.g. minor voter-count deviations < 1 %) */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// State-Specific Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Per-state configuration for the hierarchy framework.
 *
 * Each Indian state has different terminology, different data sources,
 * and different scale. This config drives the data-ingestion pipeline
 * and the UI label layer.
 *
 * @example
 * ```ts
 * const telanganaConfig: StateHierarchyConfig = {
 *   stateCode: 'TS',
 *   stateName: 'Telangana',
 *   ceoUrl: 'https://ceotelangana.nic.in',
 *   secUrl: 'https://tsec.gov.in',
 *   lgdStateCode: '36',
 *   terminology: {
 *     mandal: 'mandal',
 *     panchayat: 'gram_panchayat',
 *     subDistrict: 'Mandal',
 *   },
 *   estimates: {
 *     totalMandals: 596,
 *     totalPanchayats: 12769,
 *     totalBooths: 35655,
 *     totalVillages: 10128,
 *   },
 * };
 * ```
 */
export interface StateHierarchyConfig {
  /** Two-letter state code (e.g. `'TS'`, `'AP'`, `'KA'`) */
  stateCode: string;

  /** Full state name (e.g. `'Telangana'`) */
  stateName: string;

  /**
   * Chief Electoral Officer (CEO) portal URL.
   * Used to scrape / fetch booth-level voter lists and election results.
   */
  ceoUrl: string;

  /**
   * State Election Commission (SEC) portal URL.
   * Used to fetch local body (panchayat / municipality) election data.
   */
  secUrl: string;

  /**
   * LGD (Local Government Directory) numeric state code.
   * Used as the canonical key when cross-referencing national datasets.
   *
   * @see https://lgdirectory.gov.in
   */
  lgdStateCode: string;

  /**
   * State-specific terminology mapping.
   * Drives UI labels so users see familiar terms (e.g. "Mandal" in TS,
   * "Block" in UP, "Taluk" in TN).
   */
  terminology: {
    /** What the sub-district unit is called in this state */
    mandal: MandalType;

    /** What the local body is called in this state */
    panchayat: PanchayatType;

    /**
     * Display label for the sub-district level in the UI.
     * E.g. `'Mandal'`, `'Block'`, `'Tehsil'`, `'Taluk'`.
     */
    subDistrict: string;
  };

  /**
   * Estimated entity counts for progress tracking during data ingestion.
   * These are approximate and used for progress bars / completeness checks.
   */
  estimates: {
    /** Estimated number of mandals / blocks in the state */
    totalMandals: number;

    /** Estimated number of gram panchayats */
    totalPanchayats: number;

    /** Estimated number of polling booths */
    totalBooths: number;

    /** Estimated number of revenue villages */
    totalVillages: number;
  };
}
