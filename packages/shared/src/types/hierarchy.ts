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
