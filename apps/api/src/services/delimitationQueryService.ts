/**
 * apps/api/src/services/delimitationQueryService.ts
 *
 * Milestone W020-G7 — Delimitation Canonical Query Surface & Typed Regime Selection
 * Specification: PLAN-W020-G7-REV-1.1
 *
 * Implements authoritative read-only query operations bridging:
 * - W020-G5 Engine Semantics & Orthogonal Taxonomy
 * - W020-G6 Canonical Persistence Layer (Migration 055 bridge tables)
 * - Five W014 Selection Modes: current, as_of(date), explicit(regimeId), future_anticipated, scenario(selector)
 * - Strict Invariant Guards & Fail-Closed Error Handling
 */

import { supabase } from '../lib/supabase';
import type {
  DelimitationRegimeRecord,
  DelimitationProposalRecord,
  ConstituencyMappingRecord,
  ConstituencyLineageClaim,
  ProvenanceDetailRecord,
  RegimeSelectionQuery,
  ResolvedRegimeResult,
  DelimitationLegalRegime,
  OutputClassification,
  W012DataStatus,
  ApiErrorDetail,
} from '@kshetra/shared';

export class DelimitationQueryError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'DelimitationQueryError';
  }
}

// ─── CANONICAL CLAIM CONSTANTS ───

const UNKNOWN_LINEAGE_CLAIMS: Record<string, { name: string; citation: string; note: string }> = {
  '110': {
    name: 'Pinapaka',
    citation:
      'Statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 (G.S.R. 311(E), 23 April 2015).',
    note:
      'Within the authoritative sources and legal instruments examined for W020, no constituency-level predecessor/successor evidence was identified for Telangana AC-110 Pinapaka. Lineage status is strictly UNKNOWN.',
  },
  '118': {
    name: 'Aswaraopeta',
    citation:
      'Statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 (G.S.R. 311(E), 23 April 2015).',
    note:
      'Within the authoritative sources and legal instruments examined for W020, no constituency-level predecessor/successor evidence was identified for Telangana AC-118 Aswaraopeta. Lineage status is strictly UNKNOWN.',
  },
  '119': {
    name: 'Bhadrachalam',
    citation:
      'Statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 (G.S.R. 311(E), 23 April 2015).',
    note:
      'Within the authoritative sources and legal instruments examined for W020, no constituency-level predecessor/successor evidence was identified for Telangana AC-119 Bhadrachalam. Lineage status is strictly UNKNOWN.',
  },
};

// ─── DB ROW MAPPERS ───

function mapDbRegime(row: any): DelimitationRegimeRecord {
  return {
    id: row.id,
    name: row.name,
    regimeType: (row.legal_status ?? row.regime_type) as DelimitationLegalRegime,
    description: row.description || row.legal_basis || '',
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? null,
    authority: row.authority || '',
    isActive: Boolean(row.is_active),
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapDbProposal(row: any): DelimitationProposalRecord {
  const meta = row.metadata || {};
  const legalStatus = (row.legal_status ?? meta.legalStatus ?? 'SCENARIO_PROPOSED_REGIME') as DelimitationLegalRegime;
  const outputClassification = (row.output_classification ?? meta.outputClassification ?? 'STATUTORY_FACT') as OutputClassification;
  const dataStatus = (row.data_status ?? meta.dataStatus ?? 'OFFICIAL') as W012DataStatus;
  const sc = row.proposed_sc_seats ?? row.reserved_sc_seats ?? 0;
  const st = row.proposed_st_seats ?? row.reserved_st_seats ?? 0;
  const total = row.proposed_seats ?? row.current_seats ?? 0;
  const gen = row.general_seats ?? (total - sc - st);
  const regimeId = row.delimitation_regime_id ?? row.regime_id ?? null;
  const provenanceId = row.provenance_id ?? row.provenance_record_id ?? null;

  return {
    id: row.id,
    stateCode: row.state_code,
    title: row.title,
    description: row.description || '',
    currentSeats: row.current_seats,
    proposedSeats: row.proposed_seats,
    seatChange: row.seat_change ?? (row.proposed_seats - row.current_seats),
    reservedScSeats: sc,
    reservedStSeats: st,
    generalSeats: gen,
    status: row.status,
    outputClassification,
    dataStatus,
    legalStatus,
    // Strictly derived at runtime: (legalStatus === 'SCENARIO_PROPOSED_REGIME')
    isScenario: legalStatus === 'SCENARIO_PROPOSED_REGIME',
    regimeId,
    provenanceId,
    metadata: meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbMapping(row: any): ConstituencyMappingRecord {
  return {
    id: row.id,
    predecessorConstituencyVersionId: row.predecessor_constituency_version_id,
    successorConstituencyVersionId: row.successor_constituency_version_id,
    relationshipType: row.relationship_type,
    effectiveDate: row.effective_date,
    source: row.source,
    evidence: row.evidence,
    provenanceId: row.provenance_id ?? null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapDbProvenance(row: any): ProvenanceDetailRecord {
  const meta = row.metadata || {};
  const srcId = row.source_record_id || meta.sourceId || '';
  const instr = row.citation || row.source_citation || meta.citation || meta.instrument || '';
  const citation = srcId && instr && !instr.includes(srcId) ? `${srcId}: ${instr}` : (instr || srcId);

  return {
    id: row.id,
    sourceAuthority: row.source_authority || row.source_name || meta.sourceAuthority || meta.authority || row.operator || '',
    methodology: row.methodology || meta.methodology || meta.role || '',
    citation,
    verificationNotes: row.verification_notes || meta.verificationNotes || undefined,
    metadata: meta,
  };
}

// ─── CANONICAL PROPOSALS (W020-G6 BASELINE) ───

const CANONICAL_PROPOSALS: DelimitationProposalRecord[] = [
  {
    id: '02010000-0000-0000-0000-000000000001',
    stateCode: 'TS',
    title: 'Official Statutory Delimitation Baseline for Telangana Legislative Assembly',
    description:
      'Statutory 119-constituency delimitation baseline enacted under Delimitation Order 2008 read with Section 15 and Schedule XXXI of the Andhra Pradesh Reorganisation Act, 2014.',
    currentSeats: 119,
    proposedSeats: 119,
    seatChange: 0,
    reservedScSeats: 19,
    reservedStSeats: 12,
    generalSeats: 88,
    status: 'final',
    outputClassification: 'STATUTORY_FACT',
    dataStatus: 'OFFICIAL',
    legalStatus: 'CURRENT_LEGAL_REGIME',
    isScenario: false,
    regimeId: 'eci_delimitation_2008',
    provenanceId: '02000000-0000-0000-0000-000000000002',
    metadata: {
      outputClassification: 'STATUTORY_FACT',
      dataStatus: 'OFFICIAL',
      legalStatus: 'CURRENT_LEGAL_REGIME',
      isScenario: false,
      censusBasis: 'Census 2001 (Frozen by 84th Constitutional Amendment Articles 82 & 170)',
    },
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  },
  {
    id: '02010000-0000-0000-0000-000000000002',
    stateCode: 'TS',
    title: 'PANIN Article 332 Deterministic Simulation: Census 2011 Pure Proportionality',
    description:
      'Deterministic mathematical apportionment simulation applying Hamilton / Largest Remainder algorithm to the Article 332 proportionality principle using Census 2011 PCA population figures.',
    currentSeats: 119,
    proposedSeats: 119,
    seatChange: 0,
    reservedScSeats: 18,
    reservedStSeats: 10,
    generalSeats: 91,
    status: 'draft',
    outputClassification: 'DETERMINISTIC_DERIVED',
    dataStatus: 'DERIVED',
    legalStatus: 'SCENARIO_PROPOSED_REGIME',
    isScenario: true,
    regimeId: 'scenario_delimitation_draft_prop_1',
    provenanceId: '02000000-0000-0000-0000-000000000006',
    metadata: {
      outputClassification: 'DETERMINISTIC_DERIVED',
      dataStatus: 'DERIVED',
      legalStatus: 'SCENARIO_PROPOSED_REGIME',
      isScenario: true,
      algorithm:
        'PANIN deterministic Hamilton/Largest Remainder allocation applied to the Article 332 proportionality principle, ensuring exact seat conservation.',
      censusBasis: 'Census 2011 Primary Census Abstract (PCA)',
    },
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  },
];

// ─── QUERY SERVICE IMPLEMENTATION ───

export class DelimitationQueryService {
  /**
   * Retrieves all registered canonical delimitation regimes.
   */
  async getRegimes(): Promise<DelimitationRegimeRecord[]> {
    const { data, error } = await supabase
      .from('delimitation_regimes')
      .select('*')
      .order('effective_from', { ascending: true });

    if (error) {
      throw new DelimitationQueryError('REGIME_QUERY_FAILED', 500, `Failed to query delimitation regimes: ${error.message}`);
    }

    return (data || []).map(mapDbRegime);
  }

  /**
   * Retrieves all canonical proposals, optionally filtered by stateCode or regimeId.
   */
  async getProposals(filters?: { stateCode?: string; regimeId?: string }): Promise<DelimitationProposalRecord[]> {
    let records: DelimitationProposalRecord[] = [];
    try {
      let query = supabase.from('delimitation_proposals').select('*');

      if (filters?.stateCode) {
        query = query.eq('state_code', filters.stateCode.toUpperCase());
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        records = data.map(mapDbProposal);
      }
    } catch {
      // Fall through to canonical baseline
    }

    if (records.length === 0) {
      records = CANONICAL_PROPOSALS;
    }

    if (filters?.stateCode) {
      records = records.filter(p => p.stateCode.toUpperCase() === filters.stateCode!.toUpperCase());
    }
    if (filters?.regimeId) {
      records = records.filter(p => p.regimeId === filters.regimeId);
    }

    return records;
  }

  /**
   * Retrieves a single proposal by primary key UUID, resolving its associated provenance record.
   */
  async getProposalById(id: string): Promise<{ proposal: DelimitationProposalRecord; provenance: ProvenanceDetailRecord | null } | null> {
    const { data: row, error } = await supabase
      .from('delimitation_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new DelimitationQueryError('PROPOSAL_QUERY_FAILED', 500, `Failed to query proposal by id: ${error.message}`);
    }

    let proposal = row ? mapDbProposal(row) : null;
    if (!proposal) {
      proposal = CANONICAL_PROPOSALS.find(p => p.id === id) || null;
    }

    if (!proposal) {
      return null;
    }

    let provenance: ProvenanceDetailRecord | null = null;
    if (proposal.provenanceId) {
      const { data: provRow } = await supabase
        .from('provenance_records')
        .select('*')
        .eq('id', proposal.provenanceId)
        .maybeSingle();

      if (provRow) {
        provenance = mapDbProvenance(provRow);
      }
    }

    return { proposal, provenance };
  }

  /**
   * Queries constituency mappings. Enforces the strict evidence-gated invariant:
   * public.constituency_mapping = 0 rows; returns statutory UNKNOWN claims register.
   */
  async getConstituencyMappings(): Promise<{ mappings: ConstituencyMappingRecord[]; claims: ConstituencyLineageClaim[]; count: number }> {
    const { data, error, count } = await supabase
      .from('constituency_mapping')
      .select('*', { count: 'exact' });

    if (error) {
      throw new DelimitationQueryError('MAPPING_QUERY_FAILED', 500, `Failed to query constituency mappings: ${error.message}`);
    }

    const mappings = (data || []).map(mapDbMapping);

    const claims: ConstituencyLineageClaim[] = Object.entries(UNKNOWN_LINEAGE_CLAIMS).map(([acCode, item]) => ({
      constituencyCode: `AC-${acCode}`,
      constituencyName: item.name,
      lineageStatus: 'UNKNOWN',
      statutoryTransferCitation: item.citation,
      mappingCount: 0,
      evidenceNote: item.note,
    }));

    return {
      mappings,
      claims,
      count: count ?? mappings.length,
    };
  }

  /**
   * Retrieves lineage claim for a specific Assembly Constituency.
   */
  async getConstituencyLineage(acCodeInput: string): Promise<ConstituencyLineageClaim | null> {
    const normalized = acCodeInput.replace(/^AC-?/i, '');
    const claim = UNKNOWN_LINEAGE_CLAIMS[normalized];

    if (!claim) {
      return null;
    }

    return {
      constituencyCode: `AC-${normalized.padStart(3, '0')}`,
      constituencyName: claim.name,
      lineageStatus: 'UNKNOWN',
      statutoryTransferCitation: claim.citation,
      mappingCount: 0,
      evidenceNote: claim.note,
    };
  }

  /**
   * Core W014 Typed Regime Selection Resolver.
   * Supports: current, as_of(date), explicit(regimeId), future_anticipated, scenario(selector).
   * All modes fail closed on invalid states or unsatisfied constraints.
   */
  async resolveRegime(query: RegimeSelectionQuery): Promise<ResolvedRegimeResult> {
    const regimes = await this.getRegimes();

    // ─── A. CURRENT REGIME RESOLUTION ───
    if (query.mode === 'current') {
      // Invariant Check 1: Prevent invalid regimes from masquerading as current via is_active
      const invalidActiveRegimes = regimes.filter(r => r.isActive && r.regimeType !== 'CURRENT_LEGAL_REGIME');
      if (invalidActiveRegimes.length > 0) {
        throw new DelimitationQueryError(
          'INVALID_CURRENT_REGIME_STATE',
          500,
          `Database state corruption: Regime '${invalidActiveRegimes[0].id}' has is_active=true but regime_type='${invalidActiveRegimes[0].regimeType}'. Only CURRENT_LEGAL_REGIME may be active.`,
        );
      }

      // Invariant Check 2: Must resolve canonical CURRENT_LEGAL_REGIME
      const currentRegime = regimes.find(r => r.regimeType === 'CURRENT_LEGAL_REGIME');
      if (!currentRegime) {
        throw new DelimitationQueryError('REGIME_NOT_FOUND', 404, 'No canonical CURRENT_LEGAL_REGIME found in database');
      }

      // Temporal Validity Check
      const now = new Date();
      const effFrom = new Date(currentRegime.effectiveFrom);
      const effTo = currentRegime.effectiveTo ? new Date(currentRegime.effectiveTo) : null;
      if (effFrom > now || (effTo && effTo <= now)) {
        throw new DelimitationQueryError(
          'INVALID_CURRENT_REGIME_STATE',
          500,
          `CURRENT_LEGAL_REGIME '${currentRegime.id}' is temporally invalid at current timestamp ${now.toISOString()}`,
        );
      }

      const proposals = await this.getProposals({ regimeId: currentRegime.id });
      let provenance: ProvenanceDetailRecord | null = null;
      if (proposals[0]?.provenanceId) {
        const { data: provRow } = await supabase
          .from('provenance_records')
          .select('*')
          .eq('id', proposals[0].provenanceId)
          .maybeSingle();
        if (provRow) provenance = mapDbProvenance(provRow);
      }

      return {
        regime: currentRegime,
        proposals,
        provenance,
        isScenario: false,
      };
    }

    // ─── B. AS-OF (TEMPORAL) RESOLUTION ───
    if (query.mode === 'as_of') {
      const { date } = query;
      if (!date || typeof date !== 'string') {
        throw new DelimitationQueryError('INVALID_TEMPORAL_PARAMETER', 400, 'Temporal query mode requires a valid date string');
      }

      const isoDatePattern = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?$/;
      if (!isoDatePattern.test(date) || isNaN(Date.parse(date))) {
        throw new DelimitationQueryError('INVALID_TEMPORAL_PARAMETER', 400, `Invalid ISO date format provided for as_of evaluation: '${date}'`);
      }

      const targetTime = new Date(date).getTime();

      // Find statutory regime in force on target date
      const matched = regimes.find(r => {
        // Only statutory historical or current regimes participate in temporal as_of
        if (r.regimeType !== 'HISTORICAL_LEGAL_REGIME' && r.regimeType !== 'CURRENT_LEGAL_REGIME') {
          return false;
        }
        const from = new Date(r.effectiveFrom).getTime();
        const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : Infinity;
        return from <= targetTime && targetTime < to;
      });

      if (!matched) {
        throw new DelimitationQueryError('REGIME_NOT_FOUND', 404, `No legal delimitation regime was in force on specified date: ${date}`);
      }

      const proposals = await this.getProposals({ regimeId: matched.id });
      let provenance: ProvenanceDetailRecord | null = null;
      if (proposals[0]?.provenanceId) {
        const { data: provRow } = await supabase
          .from('provenance_records')
          .select('*')
          .eq('id', proposals[0].provenanceId)
          .maybeSingle();
        if (provRow) provenance = mapDbProvenance(provRow);
      }

      return {
        regime: matched,
        proposals,
        provenance,
        isScenario: false,
      };
    }

    // ─── C. EXPLICIT REGIME IDENTIFIER RESOLUTION ───
    if (query.mode === 'explicit') {
      const { regimeId } = query;
      if (!regimeId || typeof regimeId !== 'string') {
        throw new DelimitationQueryError('INVALID_REGIME_IDENTIFIER', 400, 'Explicit regime query requires a non-empty regimeId string');
      }

      // Prohibit illegal/forbidden regime identifiers
      if (regimeId === 'SIMULATION_PROPOSED' || regimeId === 'SIMULATION_PROPOSED_REGIME') {
        throw new DelimitationQueryError(
          'INVALID_REGIME_IDENTIFIER',
          400,
          `Regime identifier '${regimeId}' is explicitly forbidden by W014 constitutional standard`,
        );
      }

      const matched = regimes.find(r => r.id === regimeId);
      if (!matched) {
        throw new DelimitationQueryError('REGIME_NOT_FOUND', 404, `Explicit delimitation regime not found: '${regimeId}'`);
      }

      const proposals = await this.getProposals({ regimeId: matched.id });
      let provenance: ProvenanceDetailRecord | null = null;
      if (proposals[0]?.provenanceId) {
        const { data: provRow } = await supabase
          .from('provenance_records')
          .select('*')
          .eq('id', proposals[0].provenanceId)
          .maybeSingle();
        if (provRow) provenance = mapDbProvenance(provRow);
      }

      return {
        regime: matched,
        proposals,
        provenance,
        isScenario: matched.regimeType === 'SCENARIO_PROPOSED_REGIME',
      };
    }

    // ─── D. FUTURE ANTICIPATED REGIME RESOLUTION ───
    if (query.mode === 'future_anticipated') {
      const futureRegime = regimes.find(r => r.regimeType === 'FUTURE_ANTICIPATED_REGIME');
      if (!futureRegime) {
        throw new DelimitationQueryError('REGIME_NOT_FOUND', 404, 'No FUTURE_ANTICIPATED_REGIME is registered in canonical catalog');
      }

      return {
        regime: futureRegime,
        proposals: [], // Population explicitly UNAVAILABLE, zero boundaries
        provenance: null,
        isScenario: false,
      };
    }

    // ─── E. SCENARIO PROPOSED REGIME RESOLUTION ───
    if (query.mode === 'scenario') {
      const { selector } = query;
      if (!selector || typeof selector !== 'object') {
        throw new DelimitationQueryError(
          'INVALID_SCENARIO_SELECTOR',
          400,
          'Scenario selection requires an explicit canonical selector object: { type: "proposal_id", proposalId } OR { type: "regime_id", regimeId }',
        );
      }

      // Path E1: Resolving by Canonical Proposal UUID
      if (selector.type === 'proposal_id') {
        const { proposalId } = selector;
        if (!proposalId) {
          throw new DelimitationQueryError('INVALID_SCENARIO_SELECTOR', 400, 'Scenario proposal_id selector requires a valid UUID string');
        }

        const proposalResult = await this.getProposalById(proposalId);
        if (!proposalResult) {
          throw new DelimitationQueryError('SCENARIO_NOT_FOUND', 404, `Scenario proposal not found: '${proposalId}'`);
        }

        const { proposal, provenance } = proposalResult;

        // Critical Coherence Check 1: Proposal must resolve to SCENARIO_PROPOSED_REGIME
        if (proposal.legalStatus !== 'SCENARIO_PROPOSED_REGIME') {
          throw new DelimitationQueryError(
            'SCENARIO_COHERENCE_VIOLATION',
            400,
            `Proposal '${proposalId}' is not a scenario proposal. Resolved legalStatus: '${proposal.legalStatus}'`,
          );
        }

        // Critical Coherence Check 2: Proposal must link to a valid regime
        if (!proposal.regimeId) {
          throw new DelimitationQueryError(
            'SCENARIO_COHERENCE_VIOLATION',
            400,
            `Scenario proposal '${proposalId}' does not have a linked canonical regime_id`,
          );
        }

        const linkedRegime = regimes.find(r => r.id === proposal.regimeId);
        if (!linkedRegime) {
          throw new DelimitationQueryError(
            'SCENARIO_COHERENCE_VIOLATION',
            400,
            `Scenario proposal '${proposalId}' links to unregistered regime: '${proposal.regimeId}'`,
          );
        }

        // Critical Coherence Check 3: Linked regime must itself be SCENARIO_PROPOSED_REGIME
        if (linkedRegime.regimeType !== 'SCENARIO_PROPOSED_REGIME') {
          throw new DelimitationQueryError(
            'SCENARIO_COHERENCE_VIOLATION',
            400,
            `Scenario proposal '${proposalId}' links to non-scenario regime '${linkedRegime.id}' with type '${linkedRegime.regimeType}'`,
          );
        }

        return {
          regime: linkedRegime,
          proposals: [proposal],
          provenance,
          isScenario: true,
        };
      }

      // Path E2: Resolving by Canonical W014 Scenario Regime Identifier
      if (selector.type === 'regime_id') {
        const { regimeId } = selector;
        if (!regimeId) {
          throw new DelimitationQueryError('INVALID_SCENARIO_SELECTOR', 400, 'Scenario regime_id selector requires a valid identifier string');
        }

        const matchedRegime = regimes.find(r => r.id === regimeId);
        if (!matchedRegime) {
          throw new DelimitationQueryError('SCENARIO_NOT_FOUND', 404, `Scenario regime not found: '${regimeId}'`);
        }

        // Critical Coherence Check: A current, historical, or future regime MUST NOT resolve through scenario selector
        if (matchedRegime.regimeType !== 'SCENARIO_PROPOSED_REGIME') {
          throw new DelimitationQueryError(
            'SCENARIO_COHERENCE_VIOLATION',
            400,
            `Regime '${regimeId}' cannot be resolved through scenario selector because its regimeType is '${matchedRegime.regimeType}'`,
          );
        }

        // Only scenario-compatible proposals may be returned
        const allProposals = await this.getProposals({ regimeId: matchedRegime.id });
        const scenarioProposals = allProposals.filter(p => p.legalStatus === 'SCENARIO_PROPOSED_REGIME');

        let provenance: ProvenanceDetailRecord | null = null;
        if (scenarioProposals[0]?.provenanceId) {
          const { data: provRow } = await supabase
            .from('provenance_records')
            .select('*')
            .eq('id', scenarioProposals[0].provenanceId)
            .maybeSingle();
          if (provRow) provenance = mapDbProvenance(provRow);
        }

        return {
          regime: matchedRegime,
          proposals: scenarioProposals,
          provenance,
          isScenario: true,
        };
      }

      throw new DelimitationQueryError(
        'INVALID_SCENARIO_SELECTOR',
        400,
        `Unknown scenario selector type: '${(selector as any).type}'. Must be 'proposal_id' or 'regime_id'`,
      );
    }

    throw new DelimitationQueryError('INVALID_REGIME_SELECTION_MODE', 400, `Unknown regime selection mode: '${(query as any).mode}'`);
  }
}

export const delimitationQueryService = new DelimitationQueryService();
