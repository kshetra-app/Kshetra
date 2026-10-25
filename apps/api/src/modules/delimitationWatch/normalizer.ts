/**
 * apps/api/src/modules/delimitationWatch/normalizer.ts
 *
 * Stage 2: Normalizer
 *
 * Converts captured raw snapshot payloads into canonical DelimitationCandidate records:
 * - Deterministic parsing using parser version 'v1.0.0'
 * - Preserves provenance and source document references
 * - Strict Data-Truth Invariant: Eliminates authority-by-label
 * - Mandatory Evidence-Based Legal Gate evaluation (prohibits synthetic-to-official escalation)
 * - Verifies candidate against Authoritative Legal Corpus
 * - Ignores/overrides client-supplied dataStatus claims
 * - Preserves uncertainty: defaults to UNVERIFIED or SCENARIO rather than guessing
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationSnapshot,
  DelimitationWatchSource,
  DelimitationCandidate,
  DelimitationProposalCandidate,
  ConstituencyMappingCandidate,
  LegalEvidencePackage,
  LegalInstrumentType,
  LegalEnactmentStatus,
  W012DataStatus,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export const CURRENT_PARSER_VERSION = 'v1.0.0';

// Approved statutory/constitutional issuing authorities
export const APPROVED_OFFICIAL_PUBLISHERS = new Set([
  'President of India',
  'Ministry of Law and Justice',
  'Delimitation Commission of India',
  'Election Commission of India',
  'Parliament of India',
  'Government of India',
  'Chief Electoral Officer',
  'The Gazette of India',
]);

export interface AuthoritativeLegalInstrument {
  instrumentIdentifier: string;
  instrumentType: LegalInstrumentType;
  jurisdiction: string;
  publishers: string[];
  publicationDate: string; // ISO date 'YYYY-MM-DD'
  effectiveDate: string; // ISO date 'YYYY-MM-DD'
  status: LegalEnactmentStatus;
  statutoryAuthority: string;
  seatConstraints?: {
    totalSeats: number;
    scSeats: number;
    stSeats: number;
  };
  officialSourceUrl: string;
  isOperative: boolean;
}

/**
 * Authoritative Legal Instrument Corpus
 * Canonical repository of verified statutory delimitation instruments.
 */
export const AUTHORITATIVE_LEGAL_CORPUS: Record<string, AuthoritativeLegalInstrument> = {
  // 1. Presidential Order S.O. 382(E) / Delimitation Order 2008 Schedule II (AP)
  'S.O. 382(E) (Delimitation of Parliamentary and Assembly Constituencies Order, 2008)': {
    instrumentIdentifier: 'S.O. 382(E) (Delimitation of Parliamentary and Assembly Constituencies Order, 2008)',
    instrumentType: 'PRESIDENTIAL_ORDER',
    jurisdiction: 'AP',
    publishers: ['President of India', 'Ministry of Law and Justice', 'Election Commission of India', 'Government of India', 'The Gazette of India'],
    publicationDate: '2008-02-19',
    effectiveDate: '2008-02-19',
    status: 'ENACTED_COMMENCED',
    statutoryAuthority: 'Delimitation Act, 2002, Section 10(2)',
    seatConstraints: {
      totalSeats: 294,
      scSeats: 48,
      stSeats: 19,
    },
    officialSourceUrl: 'https://www.eci.gov.in/files/file/3931-delimitation-of-parliamentary-and-assembly-constituencies-order-2008/',
    isOperative: true,
  },
  // 2. Delimitation Commission of India Order No. 46 (Andhra Pradesh, 2007)
  'Notification No. 282/AP/2007-III (Order No. 46)': {
    instrumentIdentifier: 'Notification No. 282/AP/2007-III (Order No. 46)',
    instrumentType: 'DELIMITATION_ORDER',
    jurisdiction: 'AP',
    publishers: ['Delimitation Commission of India', 'The Gazette of India'],
    publicationDate: '2007-05-31',
    effectiveDate: '2008-02-19', // Commenced upon S.O. 382(E)
    status: 'PROPOSED_DRAFT',
    statutoryAuthority: 'Delimitation Act, 2002, Section 10(1)',
    seatConstraints: {
      totalSeats: 294,
      scSeats: 48,
      stSeats: 19,
    },
    officialSourceUrl: 'https://www.eci.gov.in/files/file/3931-delimitation-of-parliamentary-and-assembly-constituencies-order-2008/',
    isOperative: true,
  },
  // 3. ECI Polavaram Boundary Amendment Notification (2018)
  'Notification No. 282/AP/2018(DEL)': {
    instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
    instrumentType: 'GAZETTE_NOTIFICATION',
    jurisdiction: 'AP',
    publishers: ['Election Commission of India', 'The Gazette of India'],
    publicationDate: '2018-09-24',
    effectiveDate: '2018-09-24',
    status: 'ENACTED_COMMENCED',
    statutoryAuthority: 'Delimitation Act, 2002, Section 9(1)(b) read with APRA 2014 Sections 15 & 26',
    officialSourceUrl: 'https://www.eci.gov.in/',
    isOperative: true,
  },
  // 4. Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI Telangana)
  'Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI)': {
    instrumentIdentifier: 'Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI)',
    instrumentType: 'REORGANISATION_ACT',
    jurisdiction: 'TG',
    publishers: ['Parliament of India', 'Ministry of Law and Justice', 'Government of India'],
    publicationDate: '2014-03-01',
    effectiveDate: '2014-06-02',
    status: 'ENACTED_COMMENCED',
    statutoryAuthority: 'Constitution of India, Article 3 & APRA 2014 Section 15',
    seatConstraints: {
      totalSeats: 119,
      scSeats: 19,
      stSeats: 12,
    },
    officialSourceUrl: 'https://legislative.gov.in/',
    isOperative: true,
  },
};

export class Normalizer {
  private readonly repo: IDelimitationWatchRepository;

  constructor(repo: IDelimitationWatchRepository) {
    this.repo = repo;
  }

  async normalize(snapshot: DelimitationSnapshot, source: DelimitationWatchSource): Promise<DelimitationCandidate> {
    if (!snapshot.rawContent || snapshot.rawContent.trim() === '') {
      throw new Error('NORMALIZATION_ERROR: Snapshot raw content is empty');
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(snapshot.rawContent);
    } catch (err: any) {
      throw new Error(`NORMALIZATION_ERROR: Failed to parse snapshot JSON: ${err.message}`);
    }

    // 1. Extract raw proposal fields
    const rawProposal = parsedPayload.proposal || parsedPayload;

    const stateCode = (rawProposal.stateCode || rawProposal.state_code || source.geographicScope.replace('IN-', '')).toUpperCase();
    const title = rawProposal.title || `${source.name} - ${stateCode} Delimitation`;
    const description = rawProposal.description || rawProposal.summary;
    const proposalStatus = rawProposal.status === 'final' ? 'final' : 'draft';

    const currentSeats = Number(rawProposal.currentSeats ?? rawProposal.current_seats ?? 0);
    const proposedSeats = Number(rawProposal.proposedSeats ?? rawProposal.proposed_seats ?? 0);
    const currentScSeats = Number(rawProposal.currentScSeats ?? rawProposal.current_sc_seats ?? 0);
    const currentStSeats = Number(rawProposal.currentStSeats ?? rawProposal.current_st_seats ?? 0);
    const proposedScSeats = Number(rawProposal.proposedScSeats ?? rawProposal.proposed_sc_seats ?? 0);
    const proposedStSeats = Number(rawProposal.proposedStSeats ?? rawProposal.proposed_st_seats ?? 0);

    const instrumentType: LegalInstrumentType = rawProposal.instrumentType || rawProposal.instrument_type || 'UNKNOWN';
    const instrumentIdentifier: string | undefined =
      rawProposal.instrumentIdentifier ||
      rawProposal.instrument_identifier ||
      rawProposal.orderNumber ||
      rawProposal.order_number;
    const legalEnactmentStatus: LegalEnactmentStatus =
      rawProposal.legalEnactmentStatus || rawProposal.legal_enactment_status || 'UNVERIFIED';
    const effectiveDate: string | undefined =
      rawProposal.effectiveDate || rawProposal.effective_date || snapshot.declaredEffectiveDate;

    const proposalData: DelimitationProposalCandidate = {
      stateCode,
      proposalNumber: rawProposal.proposalNumber || rawProposal.proposal_number,
      title,
      description,
      status: proposalStatus,
      commissionId: rawProposal.commissionId || rawProposal.commission_id,
      currentSeats,
      proposedSeats,
      currentScSeats,
      currentStSeats,
      proposedScSeats,
      proposedStSeats,
      gazetteUrl: rawProposal.gazetteUrl || rawProposal.gazette_url || source.canonicalUrl,
      sourceUrl: rawProposal.sourceUrl || rawProposal.source_url || source.canonicalUrl,
      publishedAt: rawProposal.publishedAt || rawProposal.published_at || snapshot.declaredPublicationDate,
      objectionsDeadline: rawProposal.objectionsDeadline || rawProposal.objections_deadline,
      delimitationRegimeId: rawProposal.delimitationRegimeId || rawProposal.delimitation_regime_id,
      provenanceId: rawProposal.provenanceId || rawProposal.provenance_id,
      instrumentType,
      instrumentIdentifier,
      legalEnactmentStatus,
      effectiveDate,
      metadata: rawProposal.metadata || {},
    };

    // 2. Extract and normalize constituency mappings
    const rawMappings: any[] = Array.isArray(parsedPayload.constituencyMappings)
      ? parsedPayload.constituencyMappings
      : Array.isArray(parsedPayload.mappings)
      ? parsedPayload.mappings
      : [];

    const constituencyMappings: ConstituencyMappingCandidate[] = rawMappings.map((m: any) => {
      const oldAcNo = Number(m.oldAcNo ?? m.old_ac_no ?? m.predecessor_ac_no ?? 0);
      const newAcNo = Number(m.newAcNo ?? m.new_ac_no ?? 0);
      const oldName = String(m.oldName ?? m.old_name ?? `AC-${oldAcNo}`);
      const newName = String(m.newName ?? m.new_name ?? `AC-${newAcNo}`);
      const overlapPct = Number(m.overlapPercentage ?? m.overlap_percentage ?? 100);

      return {
        stateCode,
        oldAcNo,
        oldName,
        newAcNo,
        newName,
        overlapPercentage: overlapPct,
        populationTransferred: m.populationTransferred ?? m.population_transferred,
        votersTransferred: m.votersTransferred ?? m.voters_transferred,
        notes: m.notes,
      };
    });

    // 3. Evidence-Based Legal Gate Evaluation
    // Non-Negotiable Invariants:
    // a. Authority-by-label eliminated: statutory classification + status: final does NOT establish OFFICIAL.
    // b. Synthetic-to-official prohibition: file_fixture, synthetic_model, mock URLs, or local files CANNOT become OFFICIAL.
    // c. Client-supplied override rejection: client rawProposal.dataStatus = 'OFFICIAL' is ignored.
    // d. Corpus-backed verification: Instrument must reconcile with authoritative legal determinations.
    const isSyntheticOrFixture =
      source.sourceType === 'synthetic_fixture' ||
      source.authorityClassification === 'synthetic_model' ||
      source.retrievalMethod === 'file_fixture' ||
      source.canonicalUrl.startsWith('file:') ||
      source.canonicalUrl.includes('fixtures/delimitation') ||
      source.canonicalUrl.includes('localhost') ||
      source.canonicalUrl.includes('127.0.0.1');

    const hasApprovedPublisher = APPROVED_OFFICIAL_PUBLISHERS.has(source.publisher);
    const hasStatutoryAuthority = source.authorityClassification === 'statutory' || source.authorityClassification === 'constitutional';
    const hasInstrumentId = Boolean(instrumentIdentifier && instrumentIdentifier.trim().length > 0);
    const isEnactedInstrumentType = [
      'DELIMITATION_ORDER',
      'PARLIAMENT_ACT',
      'PRESIDENTIAL_ORDER',
      'REORGANISATION_ACT',
      'GAZETTE_NOTIFICATION',
    ].includes(instrumentType);
    const isOperativeStatus = legalEnactmentStatus === 'ENACTED_COMMENCED';
    const hasExplicitEffectiveDate = Boolean(effectiveDate && effectiveDate.trim().length > 0 && !isNaN(new Date(effectiveDate).getTime()));
    const isMarkedFinal = proposalStatus === 'final';

    // Cross-check against Authoritative Legal Corpus
    const matchedCorpusInstrument = instrumentIdentifier ? AUTHORITATIVE_LEGAL_CORPUS[instrumentIdentifier] : undefined;

    let corpusReconciled = false;
    let corpusReconciliationDeficit: string | undefined;

    if (matchedCorpusInstrument) {
      const pubMatch = matchedCorpusInstrument.publishers.includes(source.publisher);
      const effDateMatch = !effectiveDate || effectiveDate.startsWith(matchedCorpusInstrument.effectiveDate);
      const jurMatch = matchedCorpusInstrument.jurisdiction === stateCode;
      const statusMatch = matchedCorpusInstrument.status === 'ENACTED_COMMENCED';

      let seatMatch = true;
      if (matchedCorpusInstrument.seatConstraints) {
        const sc = matchedCorpusInstrument.seatConstraints;
        if (
          proposedSeats !== sc.totalSeats ||
          proposedScSeats !== sc.scSeats ||
          proposedStSeats !== sc.stSeats
        ) {
          seatMatch = false;
        }
      }

      if (pubMatch && effDateMatch && jurMatch && statusMatch && seatMatch && matchedCorpusInstrument.isOperative) {
        corpusReconciled = true;
      } else {
        const issues: string[] = [];
        if (!pubMatch) issues.push(`Publisher '${source.publisher}' does not match authoritative issuers [${matchedCorpusInstrument.publishers.join(', ')}]`);
        if (!effDateMatch) issues.push(`Effective date '${effectiveDate}' does not match authoritative date '${matchedCorpusInstrument.effectiveDate}'`);
        if (!jurMatch) issues.push(`Jurisdiction '${stateCode}' does not match instrument jurisdiction '${matchedCorpusInstrument.jurisdiction}'`);
        if (!statusMatch) issues.push(`Authoritative instrument status is '${matchedCorpusInstrument.status}', not ENACTED_COMMENCED`);
        if (!seatMatch) issues.push(`Seat allocation (${proposedSeats}/${proposedScSeats}/${proposedStSeats}) conflicts with statutory allocation (${matchedCorpusInstrument.seatConstraints?.totalSeats}/${matchedCorpusInstrument.seatConstraints?.scSeats}/${matchedCorpusInstrument.seatConstraints?.stSeats})`);
        corpusReconciliationDeficit = issues.join('; ');
      }
    } else if (hasInstrumentId) {
      corpusReconciliationDeficit = `Instrument identifier '${instrumentIdentifier}' is unverified in Authoritative Legal Corpus`;
    }

    // A candidate is eligible for OFFICIAL ONLY when ALL conditions are met simultaneously
    const isOfficialEligible =
      !isSyntheticOrFixture &&
      hasStatutoryAuthority &&
      hasApprovedPublisher &&
      hasInstrumentId &&
      isEnactedInstrumentType &&
      isOperativeStatus &&
      hasExplicitEffectiveDate &&
      isMarkedFinal &&
      corpusReconciled;

    let normalizedDataStatus: W012DataStatus;
    let isProposed: boolean;
    let ruleApplied: string;
    let decisionRationale: string;

    if (isOfficialEligible) {
      normalizedDataStatus = 'OFFICIAL';
      isProposed = false;
      ruleApplied = 'RULE_STATUTORY_ENACTED_LEGAL_EVIDENCE_PASSED';
      decisionRationale = `Legitimate official enactment confirmed: instrument '${instrumentIdentifier}' (${instrumentType}) published by '${source.publisher}' verified in Authoritative Legal Corpus with effective date ${effectiveDate}.`;
    } else {
      // Fail-closed status: SCENARIO or UNVERIFIED
      isProposed = true;

      if (source.authorityClassification === 'synthetic_model' || rawProposal.isScenario) {
        normalizedDataStatus = 'SCENARIO';
        ruleApplied = 'RULE_SYNTHETIC_MODEL_CLASSIFIED_SCENARIO';
        decisionRationale = 'Source is classified as synthetic_model or scenario calculation; data status assigned to SCENARIO.';
      } else {
        normalizedDataStatus = 'UNVERIFIED';
        ruleApplied = 'RULE_DEFICIENT_LEGAL_EVIDENCE_FAIL_CLOSED';

        const deficits: string[] = [];
        if (isSyntheticOrFixture) deficits.push('Synthetic test fixture / file source cannot produce official data');
        if (!hasStatutoryAuthority) deficits.push(`Authority classification '${source.authorityClassification}' is non-statutory`);
        if (!hasApprovedPublisher) deficits.push(`Publisher '${source.publisher}' is not in approved official authorities`);
        if (!hasInstrumentId) deficits.push('Missing statutory instrument identifier / order number');
        if (!isEnactedInstrumentType) deficits.push(`Instrument type '${instrumentType}' is not an enacted legal instrument`);
        if (!isOperativeStatus) deficits.push(`Enactment status is '${legalEnactmentStatus}', not 'ENACTED_COMMENCED'`);
        if (!hasExplicitEffectiveDate) deficits.push('Missing or invalid legal effective date');
        if (!isMarkedFinal) deficits.push('Proposal is marked as draft / consultation, not final');
        if (!corpusReconciled && corpusReconciliationDeficit) deficits.push(corpusReconciliationDeficit);

        decisionRationale = `Candidate failed legal evidence gate and is classified as UNVERIFIED. Deficits: ${deficits.join('; ')}.`;
      }
    }

    const legalEvidencePackage: LegalEvidencePackage = {
      instrumentType,
      instrumentIdentifier: instrumentIdentifier || 'UNSPECIFIED_INSTRUMENT',
      publisher: source.publisher,
      gazetteNotificationNumber: rawProposal.gazetteNotificationNumber || rawProposal.gazette_notification_number,
      publicationDate: proposalData.publishedAt,
      effectiveDate,
      enactmentStatus: legalEnactmentStatus,
      isStatutoryOrConstitutional: hasStatutoryAuthority,
      sourceVerificationDigest: snapshot.contentSha256,
      decisionRecord: {
        ruleApplied,
        isOfficialEligible,
        rationale: decisionRationale,
      },
    };

    const candidate: DelimitationCandidate = {
      id: randomUUID(),
      snapshotId: snapshot.id,
      sourceId: source.id,
      parserVersion: CURRENT_PARSER_VERSION,
      proposalData,
      constituencyMappings,
      normalizedDataStatus,
      isProposed,
      legalEvidencePackage,
      hasLegalEvidence: isOfficialEligible,
      legalEvidenceDecision: decisionRationale,
      legalEvidenceRecord: legalEvidencePackage.decisionRecord,
      provenanceId: proposalData.provenanceId,
      metadata: {
        sourceType: source.sourceType,
        sourcePublisher: source.publisher,
        rawKeysCount: Object.keys(parsedPayload).length,
        legalEvidenceDecision: decisionRationale,
      },
      normalizedAt: new Date().toISOString(),
    };

    await this.repo.saveCandidate(candidate);
    return candidate;
  }
}
