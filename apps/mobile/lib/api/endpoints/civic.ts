/**
 * Civic API Endpoint
 * Master Execution Framework — JOB W009-B4
 *
 * Target Fastify Routes:
 * - POST   /api/v1/civic/issues/:id/upvote
 * - DELETE /api/v1/civic/issues/:id/upvote
 * - POST   /api/v1/civic/issues/:id/follow
 * - POST   /api/v1/civic/issues
 * - PATCH  /api/v1/civic/issues/:id/status
 * - POST   /api/v1/civic/issues/:id/comments
 * - POST   /api/v1/civic/bills/:id/opinion
 * - POST   /api/v1/civic/rti
 * - POST   /api/v1/civic/rti/:id/upvote
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';
import { trackProductEvent } from '../../analytics';
import {
  parseStateBudgetSummary,
  type Bill,
  type DevelopmentProject,
  type GovernmentScheme,
  type HearingType,
  type PublicHearing,
  type RTIRequest,
  type StateBudgetSummary,
} from '../../civicMetricsTypes';

export interface ReportIssueRequestDTO {
  title: string;
  description?: string;
  category: string;
  severity?: string;
  constituencyId?: string;
  stateCode: string;
  mediaUrls?: string[];
}

export interface CivicIssueListFilters {
  scope: 'constituency' | 'state' | 'national';
  stateCode: string;
  constituencyId?: string;
  page?: number;
  limit?: number;
}

export interface CivicIssueListResponse {
  issues: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

function readPublicRtiNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const BILL_TYPES = ['ordinary', 'money', 'finance', 'constitutional_amendment', 'private_member'] as const;
const BILL_STATUSES = [
  'introduced', 'first_reading', 'committee_review', 'second_reading', 'passed_lower',
  'passed_upper', 'presidential_assent', 'enacted', 'lapsed', 'withdrawn', 'referred_select',
] as const;
const BILL_HOUSES = ['lok_sabha', 'rajya_sabha', 'state_assembly', 'state_council'] as const;
const BILL_NUMERIC_FIELDS = new Set(['votesFor', 'votesAgainst', 'votesAbstain', 'support', 'oppose', 'neutral']);
const BILL_ARRAY_FIELDS = new Set(['relatedDepartments', 'tags', 'affectedConstituencies', 'amendments', 'timeline']);

function normalizeBillDatabaseValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeBillDatabaseValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    const normalizedKey = key.replace(/_([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase());
    if (BILL_ARRAY_FIELDS.has(normalizedKey) && child == null) return [normalizedKey, []];
    const normalizedValue = normalizeBillDatabaseValue(child);
    return BILL_NUMERIC_FIELDS.has(normalizedKey)
      ? [normalizedKey, readPublicRtiNumber(normalizedValue)]
      : [normalizedKey, normalizedValue];
  }));
}

function parseBill(value: unknown): Bill | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = normalizeBillDatabaseValue(value) as Record<string, unknown>;
  const opinion = row.publicOpinion && typeof row.publicOpinion === 'object' && !Array.isArray(row.publicOpinion)
    ? row.publicOpinion as Record<string, unknown>
    : {};
  const listOfStrings = (candidate: unknown) =>
    candidate == null
      ? []
      : Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')
        ? candidate as string[]
        : null;
  const departments = listOfStrings(row.relatedDepartments);
  const tags = listOfStrings(row.tags);
  const amendments = row.amendments == null ? [] : row.amendments;
  const timeline = row.timeline == null ? [] : row.timeline;
  const validAmendments = Array.isArray(amendments) && amendments.every((item) =>
    !!item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.id === 'string' && typeof item.proposedBy === 'string' &&
    typeof item.description === 'string' && ['accepted', 'rejected', 'pending'].includes(item.status),
  );
  const validTimeline = Array.isArray(timeline) && timeline.every((item) =>
    !!item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.date === 'string' && typeof item.action === 'string' &&
    (item.details == null || typeof item.details === 'string'),
  );
  const affectedConstituencies = row.affectedConstituencies == null ? [] : row.affectedConstituencies;

  if (
    typeof row.id !== 'string' ||
    typeof row.title !== 'string' ||
    typeof row.shortTitle !== 'string' ||
    typeof row.type !== 'string' || !BILL_TYPES.includes(row.type as (typeof BILL_TYPES)[number]) ||
    typeof row.status !== 'string' || !BILL_STATUSES.includes(row.status as (typeof BILL_STATUSES)[number]) ||
    typeof row.introducedBy !== 'string' ||
    typeof row.houseIntroduced !== 'string' || !BILL_HOUSES.includes(row.houseIntroduced as (typeof BILL_HOUSES)[number]) ||
    typeof row.introducedDate !== 'string' || !Number.isFinite(Date.parse(row.introducedDate)) ||
    departments === null || tags === null || !validAmendments || !validTimeline ||
    !Array.isArray(affectedConstituencies) ||
    !affectedConstituencies.every((item) => Number.isInteger(item) && item >= 0)
  ) return null;

  return {
    id: row.id,
    title: row.title,
    shortTitle: row.shortTitle,
    type: row.type as Bill['type'],
    status: row.status as Bill['status'],
    introducedBy: row.introducedBy,
    introducedByParty: typeof row.introducedByParty === 'string' ? row.introducedByParty : null,
    houseIntroduced: row.houseIntroduced as Bill['houseIntroduced'],
    stateCode: typeof row.stateCode === 'string' ? row.stateCode : undefined,
    introducedDate: row.introducedDate,
    lastActionDate: typeof row.lastActionDate === 'string' ? row.lastActionDate : null,
    summary: typeof row.summary === 'string' ? row.summary : '',
    fullTextUrl: typeof row.fullTextUrl === 'string' ? row.fullTextUrl : undefined,
    committeeReportUrl: typeof row.committeeReportUrl === 'string' ? row.committeeReportUrl : undefined,
    relatedDepartments: departments,
    tags,
    affectedConstituencies,
    votesFor: readPublicRtiNumber(row.votesFor),
    votesAgainst: readPublicRtiNumber(row.votesAgainst),
    votesAbstain: readPublicRtiNumber(row.votesAbstain),
    publicOpinion: {
      support: readPublicRtiNumber(opinion.support),
      oppose: readPublicRtiNumber(opinion.oppose),
      neutral: readPublicRtiNumber(opinion.neutral),
    },
    amendments: amendments as Bill['amendments'],
    timeline: timeline as Bill['timeline'],
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}

function normalizeCivicDatabaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeCivicDatabaseKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key.replace(/_([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase()),
    normalizeCivicDatabaseKeys(child),
  ]));
}

function civicRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function civicDate(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)) ? value : null;
}

function nonNegativeCivicNumber(value: unknown): number | null {
  const parsed = readPublicRtiNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

const SCHEME_CATEGORIES = [
  'agriculture', 'education', 'health', 'housing', 'employment', 'social_security', 'women_child',
  'skill_development', 'digital', 'infrastructure', 'rural', 'urban', 'tribal', 'minority',
] as const;
const SCHEME_STATUSES = ['active', 'suspended', 'completed', 'merged', 'discontinued'] as const;
const PROJECT_CATEGORIES = [
  'road', 'bridge', 'flyover', 'school', 'hospital', 'water_supply', 'sewage', 'electricity', 'housing',
  'community_hall', 'park', 'stadium', 'market', 'bus_depot', 'railway', 'metro', 'airport', 'port',
  'irrigation', 'dam',
] as const;
const PROJECT_PHASES = [
  'proposed', 'approved', 'tendered', 'under_construction', 'delayed', 'completed', 'inaugurated',
  'cancelled', 'stalled',
] as const;

function parseGovernmentScheme(value: unknown): GovernmentScheme | null {
  const row = civicRecord(normalizeCivicDatabaseKeys(value));
  if (!row) return null;

  const launchedDate = civicDate(row.launchedDate);
  const category = row.category;
  const status = row.status;
  const level = row.level;
  const districtCoverageRaw = row.districtWiseCoverage == null ? [] : row.districtWiseCoverage;
  const constituencyCoverageRaw = row.constituencyWiseCoverage == null ? [] : row.constituencyWiseCoverage;
  const documentsRaw = row.documents == null ? [] : row.documents;
  if (
    typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.shortName !== 'string' ||
    typeof category !== 'string' || !SCHEME_CATEGORIES.includes(category as (typeof SCHEME_CATEGORIES)[number]) ||
    typeof status !== 'string' || !SCHEME_STATUSES.includes(status as (typeof SCHEME_STATUSES)[number]) ||
    typeof row.ministry !== 'string' ||
    (level !== 'central' && level !== 'state' && level !== 'joint') || !launchedDate ||
    typeof row.description !== 'string' || typeof row.eligibility !== 'string' || typeof row.benefits !== 'string' ||
    (row.stateCode != null && typeof row.stateCode !== 'string') ||
    !Array.isArray(districtCoverageRaw) || !Array.isArray(constituencyCoverageRaw) || !Array.isArray(documentsRaw)
  ) return null;

  const districtWiseCoverage = districtCoverageRaw.map((item) => {
    const record = civicRecord(item);
    if (!record || typeof record.districtName !== 'string') return null;
    return {
      districtName: record.districtName,
      beneficiaries: nonNegativeCivicNumber(record.beneficiaries),
      target: nonNegativeCivicNumber(record.target),
    };
  });
  const constituencyWiseCoverage = constituencyCoverageRaw.map((item) => {
    const record = civicRecord(item);
    const acNo = readPublicRtiNumber(record?.acNo);
    if (!record || !Number.isInteger(acNo) || typeof record.acName !== 'string') return null;
    return {
      acNo: acNo!,
      acName: record.acName,
      beneficiaries: nonNegativeCivicNumber(record.beneficiaries),
    };
  });
  const documents = documentsRaw.map((item) => {
    const record = civicRecord(item);
    if (!record || typeof record.title !== 'string' || typeof record.url !== 'string') return null;
    return { title: record.title, url: record.url };
  });
  if (districtWiseCoverage.some((item) => item === null) || constituencyWiseCoverage.some((item) => item === null) || documents.some((item) => item === null)) {
    return null;
  }

  const budgetCrores = nonNegativeCivicNumber(row.budgetCrores);
  const beneficiariesTarget = nonNegativeCivicNumber(row.beneficiariesTarget);
  const beneficiariesActual = nonNegativeCivicNumber(row.beneficiariesActual);
  const coveragePercent = nonNegativeCivicNumber(row.coveragePercent);

  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    category: category as GovernmentScheme['category'],
    status: status as GovernmentScheme['status'],
    launchedDate,
    ministry: row.ministry,
    level,
    stateCode: typeof row.stateCode === 'string' ? row.stateCode : undefined,
    description: row.description,
    eligibility: row.eligibility,
    benefits: row.benefits,
    applicationUrl: typeof row.applicationUrl === 'string' ? row.applicationUrl : undefined,
    budgetCrores,
    beneficiariesTarget,
    beneficiariesActual,
    coveragePercent: coveragePercent !== null && coveragePercent <= 100 ? coveragePercent : null,
    districtWiseCoverage: districtWiseCoverage as NonNullable<GovernmentScheme['districtWiseCoverage']>,
    constituencyWiseCoverage: constituencyWiseCoverage as NonNullable<GovernmentScheme['constituencyWiseCoverage']>,
    documents: documents as GovernmentScheme['documents'],
    updatedAt: civicDate(row.updatedAt),
  };
}

function parseDevelopmentProject(value: unknown): DevelopmentProject | null {
  const row = civicRecord(normalizeCivicDatabaseKeys(value));
  if (!row) return null;
  const category = row.category;
  const phase = row.phase;
  const issuesRaw = row.issues == null ? [] : row.issues;
  const photosRaw = row.photos == null ? [] : row.photos;
  const milestonesRaw = row.milestones == null ? [] : row.milestones;
  if (
    typeof row.id !== 'string' || typeof row.name !== 'string' ||
    typeof category !== 'string' || !PROJECT_CATEGORIES.includes(category as (typeof PROJECT_CATEGORIES)[number]) ||
    typeof phase !== 'string' || !PROJECT_PHASES.includes(phase as (typeof PROJECT_PHASES)[number]) ||
    typeof row.stateCode !== 'string' || typeof row.districtName !== 'string' || typeof row.description !== 'string' ||
    !Array.isArray(issuesRaw) || !issuesRaw.every((item) => typeof item === 'string') ||
    !Array.isArray(photosRaw) || !Array.isArray(milestonesRaw)
  ) return null;

  const photos = photosRaw.map((item) => {
    const record = civicRecord(item);
    if (!record || typeof record.url !== 'string' || typeof record.caption !== 'string' || !civicDate(record.date)) return null;
    return { url: record.url, caption: record.caption, date: record.date as string };
  });
  const milestones = milestonesRaw.map((item) => {
    const record = civicRecord(item);
    if (
      !record || typeof record.title !== 'string' || !civicDate(record.targetDate) ||
      (record.completedDate != null && !civicDate(record.completedDate)) ||
      (record.status !== 'pending' && record.status !== 'completed' && record.status !== 'delayed')
    ) return null;
    return {
      title: record.title,
      targetDate: record.targetDate as string,
      completedDate: civicDate(record.completedDate) || undefined,
      status: record.status,
    };
  });
  if (photos.some((item) => item === null) || milestones.some((item) => item === null)) return null;

  const constituencyAcNo = nonNegativeCivicNumber(row.constituencyAcNo);
  const wardNo = nonNegativeCivicNumber(row.wardNo);
  const gpsLat = readPublicRtiNumber(row.gpsLat);
  const gpsLng = readPublicRtiNumber(row.gpsLng);
  const sanctionedCostCrores = nonNegativeCivicNumber(row.sanctionedCostCrores);
  const revisedCostCrores = nonNegativeCivicNumber(row.revisedCostCrores);
  const expenditureCrores = nonNegativeCivicNumber(row.expenditureCrores);
  const delayDays = nonNegativeCivicNumber(row.delayDays);
  const physicalProgress = nonNegativeCivicNumber(row.physicalProgress);
  const financialProgress = nonNegativeCivicNumber(row.financialProgress);

  return {
    id: row.id,
    name: row.name,
    category: category as DevelopmentProject['category'],
    phase: phase as DevelopmentProject['phase'],
    stateCode: row.stateCode,
    districtName: row.districtName,
    constituencyAcNo: constituencyAcNo !== null && Number.isInteger(constituencyAcNo) ? constituencyAcNo : undefined,
    wardNo: wardNo !== null && Number.isInteger(wardNo) ? wardNo : undefined,
    description: row.description,
    contractor: typeof row.contractor === 'string' ? row.contractor : undefined,
    sanctionedCostCrores,
    revisedCostCrores,
    expenditureCrores,
    sanctionedDate: civicDate(row.sanctionedDate),
    expectedCompletion: civicDate(row.expectedCompletion),
    actualCompletion: civicDate(row.actualCompletion) || undefined,
    delayDays: delayDays !== null && Number.isInteger(delayDays) ? delayDays : null,
    physicalProgress: physicalProgress !== null && physicalProgress <= 100 ? physicalProgress : null,
    financialProgress: financialProgress !== null && financialProgress <= 100 ? financialProgress : null,
    gpsLat: gpsLat ?? undefined,
    gpsLng: gpsLng ?? undefined,
    photos: photos as DevelopmentProject['photos'],
    milestones: milestones as DevelopmentProject['milestones'],
    issues: issuesRaw,
    source: typeof row.source === 'string' && row.source.trim() !== '' ? row.source : null,
    updatedAt: civicDate(row.updatedAt),
  };
}

function parsePublicRtiRequest(value: unknown): RTIRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = row.id;
  const status = row.status;
  const isPublic = row.is_public ?? row.isPublic;
  const department = row.department;
  const authority = row.authority;
  const subject = row.subject;
  const stateCode = row.state_code ?? row.stateCode;
  const questionText = row.question_text ?? row.questionText;
  const createdAt = row.created_at ?? row.createdAt;
  const filedDate = row.filed_date ?? row.filedDate;
  const fees = readPublicRtiNumber(row.fees);
  const upvotes = readPublicRtiNumber(row.upvotes);
  const views = readPublicRtiNumber(row.views);
  const allowedStatuses = [
    'draft', 'filed', 'acknowledged', 'first_appeal', 'second_appeal',
    'information_received', 'denied', 'partial_response', 'transferred', 'closed',
  ];

  if (
    typeof id !== 'string' ||
    typeof status !== 'string' ||
    isPublic !== true ||
    status === 'draft' ||
    !allowedStatuses.includes(status) ||
    typeof department !== 'string' ||
    typeof authority !== 'string' ||
    typeof subject !== 'string' ||
    typeof questionText !== 'string' ||
    typeof stateCode !== 'string' ||
    typeof createdAt !== 'string' ||
    fees === null ||
    upvotes === null ||
    views === null
  ) return null;

  const tags = Array.isArray(row.tags) && row.tags.every((tag) => typeof tag === 'string')
    ? row.tags as string[]
    : [];
  const optionalString = (snakeCase: string, camelCase: string) => {
    const candidate = row[snakeCase] ?? row[camelCase];
    return typeof candidate === 'string' ? candidate : undefined;
  };
  const constituency = row.constituency_ac_no ?? row.constituencyAcNo;

  return {
    id,
    userId: '',
    status: status as RTIRequest['status'],
    department,
    authority,
    subject,
    questionText,
    stateCode,
    districtName: optionalString('district_name', 'districtName'),
    constituencyAcNo: readPublicRtiNumber(constituency) ?? undefined,
    filedDate: typeof filedDate === 'string' ? filedDate : undefined,
    acknowledgedDate: optionalString('acknowledged_date', 'acknowledgedDate'),
    responseDate: optionalString('response_date', 'responseDate'),
    responseText: optionalString('response_text', 'responseText'),
    attachmentUrls: [],
    responseAttachmentUrls: [],
    firstAppealDate: optionalString('first_appeal_date', 'firstAppealDate'),
    secondAppealDate: optionalString('second_appeal_date', 'secondAppealDate'),
    fees,
    isPublic: true,
    upvotes,
    views,
    tags,
    createdAt,
  };
}

function parsePublicHearing(value: unknown): PublicHearing | null {
  const row = civicRecord(normalizeCivicDatabaseKeys(value));
  if (!row) return null;

  const hearingTypes: HearingType[] = [
    'public_hearing',
    'gram_sabha',
    'ward_meeting',
    'town_hall',
    'environment_clearance',
    'land_acquisition',
    'budget_consultation',
    'grievance_redressal',
  ];
  const type = row.type;
  const constituencyAcNo = row.constituencyAcNo == null
    ? undefined
    : readPublicRtiNumber(row.constituencyAcNo);
  const agendaItems = row.agendaItems == null ? [] : row.agendaItems;
  const date = civicDate(row.date);
  const createdAt = civicDate(row.createdAt);
  const isOpen = typeof row.isOpen === 'boolean' ? row.isOpen : row.isOpen == null ? null : undefined;

  if (
    constituencyAcNo === null ||
    (constituencyAcNo !== undefined &&
      (!Number.isInteger(constituencyAcNo) || constituencyAcNo < 1))
  ) return null;

  if (
    typeof row.id !== 'string' ||
    typeof type !== 'string' ||
    !hearingTypes.includes(type as HearingType) ||
    typeof row.title !== 'string' ||
    typeof row.organizer !== 'string' ||
    typeof row.stateCode !== 'string' ||
    !/^[A-Z]{2}$/.test(row.stateCode) ||
    typeof row.districtName !== 'string' ||
    typeof row.venue !== 'string' ||
    typeof row.time !== 'string' ||
    isOpen === undefined ||
    !date ||
    !Array.isArray(agendaItems) ||
    !agendaItems.every((item) => typeof item === 'string')
  ) return null;

  const optionalString = (key: string) =>
    typeof row[key] === 'string' && row[key].trim() !== '' ? row[key] as string : undefined;

  return {
    id: row.id,
    type: type as HearingType,
    title: row.title,
    description: typeof row.description === 'string' ? row.description : '',
    organizer: row.organizer,
    stateCode: row.stateCode,
    districtName: row.districtName,
    constituencyAcNo,
    venue: row.venue,
    date,
    time: row.time,
    isOpen,
    registrationUrl: optionalString('registrationUrl'),
    agendaItems,
    minutesUrl: optionalString('minutesUrl'),
    outcome: optionalString('outcome'),
    relatedProjectId: optionalString('relatedProjectId'),
    createdAt,
  };
}

export class CivicEndpoint {
  constructor(private readonly client: ApiClient) {}

  /** Load a bounded, newest-first page of civic issues for the selected dashboard scope. */
  async listIssues(filters: CivicIssueListFilters): Promise<CivicIssueListResponse> {
    const { scope, stateCode, constituencyId } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    if (scope !== 'national' && !/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (scope === 'constituency' && (!constituencyId || constituencyId.trim() === '')) {
      throw new ApiValidationError('A constituencyId is required for constituency civic issues');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{
      issues: unknown[];
      total: number;
      page: number;
      limit: number;
    }>('/api/v1/civic/issues', {
      authPolicy: 'public',
      query: {
        stateCode: scope === 'national' ? undefined : stateCode,
        constituencyId: scope === 'constituency' ? constituencyId : undefined,
        page,
        limit,
      },
    });

    const { issues, total: resultTotal, page: resultPage, limit: resultLimit } = response.data;
    if (
      !Array.isArray(issues) ||
      !Number.isInteger(resultTotal) || resultTotal < 0 ||
      resultPage !== page || resultLimit !== limit
    ) {
      throw new ApiValidationError('Invalid civic issue list response from the server');
    }

    const validIssues = issues.every((issue) => {
      if (!issue || typeof issue !== 'object' || Array.isArray(issue)) return false;
      const row = issue as Record<string, unknown>;
      const rowStateCode = row.state_code ?? row.stateCode;
      const rowConstituencyId = row.constituency_id ?? row.constituencyId;
      return (
        typeof row.id === 'string' &&
        typeof row.title === 'string' &&
        typeof row.status === 'string' &&
        typeof row.category === 'string' &&
        typeof rowStateCode === 'string' &&
        (scope === 'national' || rowStateCode === stateCode) &&
        (scope !== 'constituency' || rowConstituencyId === constituencyId)
      );
    });
    if (!validIssues) {
      throw new ApiValidationError('A civic issue record does not match the requested scope or contains invalid fields');
    }

    return {
      issues: issues as Record<string, unknown>[],
      total: resultTotal,
      page: resultPage,
      limit: resultLimit,
    };
  }

  /** Load a state budget only from the API's persisted record. */
  async getStateBudgetSummary(stateCode: string): Promise<StateBudgetSummary | null> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    const response = await this.client.get<{
      stateCode: string;
      message: string;
      budget: unknown | null;
    }>(`/api/v1/civic/budget/${encodeURIComponent(stateCode)}`, { authPolicy: 'public' });
    if (response.data.budget === null) return null;
    const summary = parseStateBudgetSummary(response.data.budget, response.data.stateCode || stateCode);
    if (!summary) throw new ApiValidationError('Invalid state budget response from the server');
    return summary;
  }

  /** List legislation records from the canonical civic API. */
  async listBills(
    stateCode: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: Bill[]; total: number }> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{ bills: unknown[]; total: number }>(
      '/api/v1/civic/bills',
      { authPolicy: 'public', query: { state: stateCode, page, limit } },
    );
    if (!Array.isArray(response.data.bills) || !Number.isInteger(response.data.total) || response.data.total < 0) {
      throw new ApiValidationError('Invalid public legislation response from the server');
    }
    const bills = response.data.bills.map(parseBill);
    if (bills.some((bill) => bill === null || bill.stateCode !== stateCode)) {
      throw new ApiValidationError('A public legislation record contains invalid fields or does not match the requested state');
    }
    return { items: bills as Bill[], total: response.data.total };
  }

  /** List state and central welfare schemes from the civic API. */
  async listGovernmentSchemes(
    stateCode: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: GovernmentScheme[]; total: number }> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{ schemes: unknown[]; total: number }>(
      '/api/v1/civic/schemes',
      { authPolicy: 'public', query: { state: stateCode, page, limit } },
    );
    if (!Array.isArray(response.data.schemes) || !Number.isInteger(response.data.total) || response.data.total < 0) {
      throw new ApiValidationError('Invalid public scheme response from the server');
    }
    const schemes = response.data.schemes.map(parseGovernmentScheme);
    if (schemes.some((scheme) =>
      scheme === null || (scheme.stateCode !== stateCode && !(scheme.level === 'central' && !scheme.stateCode)),
    )) {
      throw new ApiValidationError('A public scheme record contains invalid fields or does not match the requested state');
    }
    return { items: schemes as GovernmentScheme[], total: response.data.total };
  }

  /** List state development projects from the civic API. */
  async listDevelopmentProjects(
    stateCode: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: DevelopmentProject[]; total: number }> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{ projects: unknown[]; total: number }>(
      '/api/v1/civic/projects',
      { authPolicy: 'public', query: { state: stateCode, page, limit } },
    );
    if (!Array.isArray(response.data.projects) || !Number.isInteger(response.data.total) || response.data.total < 0) {
      throw new ApiValidationError('Invalid public project response from the server');
    }
    const projects = response.data.projects.map(parseDevelopmentProject);
    if (projects.some((project) => project === null || project.stateCode !== stateCode)) {
      throw new ApiValidationError('A public project record contains invalid fields or does not match the requested state');
    }
    return { items: projects as DevelopmentProject[], total: response.data.total };
  }

  /** List public, submitted RTI requests without exposing their owner identifiers. */
  async listPublicRtiRequests(
    stateCode: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: RTIRequest[]; total: number }> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{ rtiRequests: unknown[]; total: number }>(
      '/api/v1/civic/rti',
      { authPolicy: 'public', query: { state: stateCode, page, limit } },
    );
    if (!Array.isArray(response.data.rtiRequests) || !Number.isInteger(response.data.total) || response.data.total < 0) {
      throw new ApiValidationError('Invalid public RTI response from the server');
    }
    const requests = response.data.rtiRequests.map(parsePublicRtiRequest);
    if (requests.some((request) => request === null)) {
      throw new ApiValidationError('A public RTI record contains invalid or incomplete fields');
    }
    return { items: requests as RTIRequest[], total: response.data.total };
  }

  /** List persisted, upcoming public hearings for one state. */
  async listPublicHearings(
    stateCode: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: PublicHearing[]; total: number }> {
    if (!/^[A-Z]{2}$/.test(stateCode)) {
      throw new ApiValidationError('Invalid stateCode: expected a two-letter uppercase code');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiValidationError('Invalid page: expected a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid limit: expected an integer between 1 and 100');
    }

    const response = await this.client.get<{ hearings: unknown[]; total: number }>(
      '/api/v1/civic/hearings',
      {
        authPolicy: 'public',
        query: { state: stateCode, upcoming: 'true', page, limit },
      },
    );
    if (!Array.isArray(response.data.hearings) || !Number.isInteger(response.data.total) || response.data.total < 0) {
      throw new ApiValidationError('Invalid public hearing response from the server');
    }
    const hearings = response.data.hearings.map(parsePublicHearing);
    if (hearings.some((hearing) => hearing === null || hearing.stateCode !== stateCode)) {
      throw new ApiValidationError('A public hearing record contains invalid fields or does not match the requested state');
    }
    return { items: hearings as PublicHearing[], total: response.data.total };
  }

  /**
   * 1. Upvote a civic issue.
   */
  async upvoteIssue(issueId: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.post<{ success: boolean; issueId: string; message?: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/upvote`,
      {},
      { authPolicy: 'authenticated' },
    );
    if (response.data.success) {
      void trackProductEvent(this.client, 'issue_upvoted', {
        screen: '/civic/issue',
        entityType: 'civic_issue',
        entityId: response.data.issueId,
      });
    }
    return { success: response.data.success, issueId: response.data.issueId };
  }

  /**
   * 2. Remove an upvote from a civic issue.
   */
  async removeUpvote(issueId: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.delete<{ success: boolean; issueId: string; message?: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/upvote`,
      { authPolicy: 'authenticated' },
    );
    return { success: response.data.success, issueId: response.data.issueId };
  }

  /**
   * 3. Follow or unfollow a civic issue.
   */
  async followIssue(
    issueId: string,
    follow: boolean = true,
  ): Promise<{ success: boolean; issueId: string; following: boolean }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      issueId: string;
      following: boolean;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/follow`,
      { follow },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      issueId: response.data.issueId,
      following: response.data.following,
    };
  }

  /**
   * 4. Report a civic issue.
   */
  async reportIssue(payload: ReportIssueRequestDTO): Promise<{ success: boolean; id: string }> {
    if (!payload || !payload.title || !payload.category || !payload.stateCode) {
      throw new ApiValidationError('Invalid issue report: title, category, and stateCode are required');
    }
    const response = await this.client.post<{ success: boolean; id: string; message?: string }>(
      '/api/v1/civic/issues',
      payload,
      { authPolicy: 'authenticated' },
    );
    if (response.data.success) {
      void trackProductEvent(this.client, 'issue_created', {
        screen: '/civic/issues/create',
        constituencyId: payload.constituencyId,
        entityType: 'civic_issue',
        entityId: response.data.id,
      });
    }
    return { success: response.data.success, id: response.data.id };
  }

  /**
   * 5. Update status of a civic issue.
   */
  async updateIssueStatus(
    issueId: string,
    status: string,
    note?: string,
  ): Promise<{ success: boolean; issueId: string; status: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    if (!status || typeof status !== 'string') {
      throw new ApiValidationError('Invalid status: must be a non-empty string');
    }
    const response = await this.client.patch<{
      success: boolean;
      issueId: string;
      status: string;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/status`,
      { status, note },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      issueId: response.data.issueId,
      status: response.data.status,
    };
  }

  /**
   * 6. Add a comment to a civic issue.
   */
  async addIssueComment(
    issueId: string,
    body: string,
    userName?: string,
    imageUrl?: string,
  ): Promise<{ success: boolean; id: string; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    if (!body || typeof body !== 'string') {
      throw new ApiValidationError('Invalid comment body: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      id: string;
      issueId: string;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/comments`,
      { body, userName, imageUrl },
      { authPolicy: 'authenticated' },
    );
    if (response.data.success) {
      void trackProductEvent(this.client, 'comment_posted', {
        screen: '/civic/issue',
        entityType: 'civic_issue',
        entityId: response.data.issueId,
      });
    }
    return {
      success: response.data.success,
      id: response.data.id,
      issueId: response.data.issueId,
    };
  }

  /**
   * 11. Record citizen opinion on a bill.
   */
  async postCitizenOpinion(
    billId: string,
    support: boolean,
  ): Promise<{
    success: boolean;
    billId: string;
    support: boolean;
    publicOpinion: { support: number; oppose: number; neutral: number } | null;
  }> {
    if (!billId || typeof billId !== 'string') {
      throw new ApiValidationError('Invalid billId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      billId: string;
      support: boolean;
      publicOpinion?: { support?: unknown; oppose?: unknown; neutral?: unknown };
      message?: string;
    }>(
      `/api/v1/civic/bills/${encodeURIComponent(billId)}/opinion`,
      { support },
      { authPolicy: 'authenticated' },
    );
    const opinion = response.data.publicOpinion;
    const supportCount = readPublicRtiNumber(opinion?.support);
    const opposeCount = readPublicRtiNumber(opinion?.oppose);
    const neutralCount = readPublicRtiNumber(opinion?.neutral);
    const publicOpinion = [supportCount, opposeCount, neutralCount].every(
      (count) => count !== null && Number.isSafeInteger(count) && count >= 0,
    )
      ? { support: supportCount!, oppose: opposeCount!, neutral: neutralCount! }
      : null;

    return {
      success: response.data.success,
      billId: response.data.billId,
      support: response.data.support,
      publicOpinion,
    };
  }

  /**
   * 12a. File an RTI query.
   */
  async submitRtiQuery(
    payload: { subject: string; department?: string; description?: string; state?: string },
  ): Promise<{ success: boolean; id: string; message?: string }> {
    if (!payload || !payload.subject) {
      throw new ApiValidationError('Invalid RTI query: subject is required');
    }
    const response = await this.client.post<{
      success: boolean;
      id: string;
      message: string;
      data?: Record<string, unknown>;
    }>(
      '/api/v1/civic/rti',
      payload,
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      id: response.data.id,
      message: response.data.message,
    };
  }

  /**
   * 12b. Upvote an RTI query.
   */
  async upvoteRtiQuery(rtiId: string): Promise<{ success: boolean; rtiId: string }> {
    if (!rtiId || typeof rtiId !== 'string') {
      throw new ApiValidationError('Invalid rtiId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      rtiId: string;
      message?: string;
    }>(
      `/api/v1/civic/rti/${encodeURIComponent(rtiId)}/upvote`,
      {},
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      rtiId: response.data.rtiId,
    };
  }

  /**
   * 13. Tag MLA on issue.
   */
  async tagMLAOnIssue(issueId: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId) {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.post<{ success: boolean; issueId: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/tag-mla`,
      {},
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }

  /**
   * 14. Dispute issue resolution.
   */
  async disputeIssueResolution(issueId: string, reason: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId || !reason) {
      throw new ApiValidationError('Invalid dispute: issueId and reason are required');
    }
    const response = await this.client.post<{ success: boolean; issueId: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/dispute`,
      { reason },
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }
}
