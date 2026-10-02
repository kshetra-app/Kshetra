/**
 * apps/api/src/routes/saasV1.ts
 *
 * Milestone W021 — B2B Political SaaS & Public/Partner Developer API Foundation
 * Gate W021-G4: Public/Partner SaaS API Routes
 * Authority: PLAN-W021-MASTER-REV-1.0.md & CTO AUTHORIZATION — W021-G4
 *
 * Route Family: /api/vsaas/v1/...
 *
 * Exposes approved institutional public factual data and governed simulations:
 * 1. Geography & Hierarchy (/api/vsaas/v1/geo/...)
 *    - GET /api/vsaas/v1/geo/states — List states with statutory totals & provenance
 *    - GET /api/vsaas/v1/geo/states/:stateCode — State details & seat counts
 *    - GET /api/vsaas/v1/geo/states/:stateCode/constituencies — Assembly constituencies
 *    - GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo — Single AC details
 * 2. Normalized Elections (/api/vsaas/v1/elections/...)
 *    - GET /api/vsaas/v1/elections — List election events with provenance
 *    - GET /api/vsaas/v1/elections/:id — Election details & macro aggregates
 *    - GET /api/vsaas/v1/elections/:id/contests — Contests with winner/runner-up & NOTA
 *    - GET /api/vsaas/v1/elections/:id/contests/:constituencyId — Contest details & candidates
 * 3. Canonical Political Entities (/api/vsaas/v1/entities/...)
 *    - GET /api/vsaas/v1/entities/search — Query canonical persons & organizations
 *    - GET /api/vsaas/v1/entities/persons/:id — Person profile & official identifiers
 *    - GET /api/vsaas/v1/entities/organizations/:id — Party/alliance profile & recognition
 *    - GET /api/vsaas/v1/entities/legislators — Sitting gazetted legislators
 * 4. Delimitation Regimes & Governed Scenarios (/api/vsaas/v1/delim/...)
 *    - GET /api/vsaas/v1/delim/regimes — Gazette orders & statutory timelines (1976, 2008)
 *    - GET /api/vsaas/v1/delim/projections — Article 170 / Census 2011 seat distributions
 *    - GET /api/vsaas/v1/delim/simulate/:stateCode — Governed simulation (PANIN_SCENARIO)
 *
 * Security & Governance Invariants:
 * - Executes strictly behind accepted G3 saasAuthPlugin (preHandler).
 * - Enforces request.saasAuth; client-supplied tenant_id overrides are strictly ignored.
 * - Zero citizen PII; zero raw database credentials; zero mutations (strictly GET routes).
 * - Strict JSON schema validation and canonical ECC-001 response/error envelopes.
 * - Server-owned provenance guarantees fail-closed adherence.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiSuccessEnvelope } from '@kshetra/shared';
import { sendApiError } from '../lib/replyHelper';
import { getAllStatesInfo, getStateInfo, getConstituencies, getConstituency } from '../services/stateData';
import { electionService } from '../services/electionService';
import { politicalEntityService } from '../services/politicalEntityService';
import { delimitationService, MIN_SAFE_REQUESTED_SEATS, MAX_SAFE_REQUESTED_SEATS } from '../services/delimitationService';

// ─── CANONICAL RESPONSE ENVELOPE HELPER ───

function sendSaasSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(200).send(envelope);
}

/**
 * Standardize state codes to canonical internal codes (e.g. TG -> TS for Telangana).
 */
function resolveStateCode(input: string): string {
  const upper = input.toUpperCase();
  if (upper === 'TG') return 'TS';
  return upper;
}

// ─── VALIDATION SCHEMAS ───

const stateCodeParamSchema = {
  type: 'object',
  required: ['stateCode'],
  properties: {
    stateCode: { type: 'string', pattern: '^[A-Za-z]{2}$' },
  },
};

const constituencyParamSchema = {
  type: 'object',
  required: ['stateCode', 'acNo'],
  properties: {
    stateCode: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    acNo: { type: 'integer', minimum: 1 },
  },
};

const electionsQuerySchema = {
  type: 'object',
  properties: {
    state: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    year: { type: 'integer', minimum: 1947, maximum: 2100 },
    type: { type: 'string', enum: ['assembly', 'parliamentary', 'local_body', 'by_election'] },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
};

const electionIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const contestParamSchema = {
  type: 'object',
  required: ['id', 'constituencyId'],
  properties: {
    id: { type: 'string', minLength: 1 },
    constituencyId: { type: 'string', minLength: 1 },
  },
};

const entitySearchQuerySchema = {
  type: 'object',
  properties: {
    q: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['person', 'organization'] },
    state: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    role: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
};

const entityIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const legislatorsQuerySchema = {
  type: 'object',
  properties: {
    state: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    house: { type: 'string', enum: ['assembly', 'parliament'] },
    currentOnly: { type: 'boolean', default: true },
  },
};

const delimSimulationQuerySchema = {
  type: 'object',
  properties: {
    seats: { type: 'string' },
    maxDeviation: { type: 'string' },
    mode: { type: 'string', enum: ['current', 'as_of', 'explicit', 'future_anticipated', 'scenario'] },
    regimeId: { type: 'string' },
    proposalId: { type: 'string' },
    date: { type: 'string' },
  },
};

export async function saasV1Routes(app: FastifyInstance): Promise<void> {
  // Pre-validation guard: Strictly block client-supplied scenario overrides on all SaaS routes
  app.addHook('preValidation', async (request, reply) => {
    const q = request.query as Record<string, unknown> | undefined;
    if (q && ('isScenario' in q || 'is_scenario' in q || 'simulation' in q)) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Direct provision or override of isScenario or simulation boolean is strictly forbidden. Provenance is derived exclusively by the server.',
        { code: 'SCENARIO_INPUT_FORBIDDEN' }
      );
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. GEOGRAPHY & CONSTITUENCY DATA FAMILY (/api/vsaas/v1/geo/...)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vsaas/v1/geo/states
   * List all states and Union Territories with statutory totals and provenance.
   */
  app.get('/api/vsaas/v1/geo/states', async (request, reply) => {
    try {
      const states = getAllStatesInfo().map((s) => ({
        stateCode: s.code,
        name: s.name,
        totalSeats: s.totalSeats,
        loadedConstituencies: s.loadedCount,
        provenance: {
          authorityLayer: 'STATUTORY_FACT',
          dataStatus: 'OFFICIAL',
          sourceReference: 'ECI Schedule XXXI / Delimitation of Parliamentary and Assembly Constituencies Order, 2008',
        },
      }));

      return sendSaasSuccess(reply, request, { states, total: states.length });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve states list', {
        code: 'GEO_LOOKUP_FAILURE',
      });
    }
  });

  /**
   * GET /api/vsaas/v1/geo/states/:stateCode
   * Single state metadata and assembly seat parameters.
   */
  app.get<{ Params: { stateCode: string } }>(
    '/api/vsaas/v1/geo/states/:stateCode',
    { schema: { params: stateCodeParamSchema } },
    async (request, reply) => {
      const stateCode = resolveStateCode(request.params.stateCode);
      const info = getStateInfo(stateCode);

      if (!info) {
        return sendApiError(reply, request, 404, 'Not Found', `State with code '${request.params.stateCode}' is not supported or not found.`, {
          code: 'STATE_NOT_FOUND',
        });
      }

      const responseData = {
        stateCode: info.code,
        name: info.name,
        totalSeats: info.totalSeats,
        loadedConstituencies: info.loadedCount,
        hasSpatialBoundaries: info.hasGeoJSON,
        provenance: {
          authorityLayer: 'STATUTORY_FACT',
          dataStatus: 'OFFICIAL',
          sourceReference: 'ECI Schedule XXXI / Delimitation of Parliamentary and Assembly Constituencies Order, 2008',
        },
      };

      return sendSaasSuccess(reply, request, responseData);
    }
  );

  /**
   * GET /api/vsaas/v1/geo/states/:stateCode/constituencies
   * List assembly constituencies for a state.
   */
  app.get<{ Params: { stateCode: string } }>(
    '/api/vsaas/v1/geo/states/:stateCode/constituencies',
    { schema: { params: stateCodeParamSchema } },
    async (request, reply) => {
      const stateCode = resolveStateCode(request.params.stateCode);
      const info = getStateInfo(stateCode);

      if (!info) {
        return sendApiError(reply, request, 404, 'Not Found', `State with code '${request.params.stateCode}' is not supported or not found.`, {
          code: 'STATE_NOT_FOUND',
        });
      }

      const list = getConstituencies(stateCode).map((c) => ({
        id: c.id,
        acNo: c.acNo,
        name: c.name,
        stateCode: c.stateCode,
        district: c.district,
        reservationStatus: c.reservationStatus,
        currentParty: c.currentParty || null,
        currentMLA: c.currentMLA || null,
        provenance: {
          authorityLayer: 'STATUTORY_FACT',
          dataStatus: 'OFFICIAL',
          sourceReference: 'Delimitation Order, 2008 & State Gazette',
        },
      }));

      return sendSaasSuccess(reply, request, {
        stateCode,
        stateName: info.name,
        count: list.length,
        constituencies: list,
      });
    }
  );

  /**
   * GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo
   * Specific constituency details by AC number.
   */
  app.get<{ Params: { stateCode: string; acNo: number } }>(
    '/api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo',
    { schema: { params: constituencyParamSchema } },
    async (request, reply) => {
      const stateCode = resolveStateCode(request.params.stateCode);
      const acNo = Number(request.params.acNo);

      const info = getStateInfo(stateCode);
      if (!info) {
        return sendApiError(reply, request, 404, 'Not Found', `State with code '${request.params.stateCode}' not found.`, {
          code: 'STATE_NOT_FOUND',
        });
      }

      const c = getConstituency(stateCode, acNo);
      if (!c) {
        return sendApiError(
          reply,
          request,
          404,
          'Not Found',
          `Constituency AC-${acNo} not found in state '${request.params.stateCode}'.`,
          { code: 'CONSTITUENCY_NOT_FOUND' }
        );
      }

      const responseData = {
        id: c.id,
        acNo: c.acNo,
        name: c.name,
        stateCode: c.stateCode,
        district: c.district,
        reservationStatus: c.reservationStatus,
        currentParty: c.currentParty || null,
        currentMLA: c.currentMLA || null,
        provenance: {
          authorityLayer: 'STATUTORY_FACT',
          dataStatus: 'OFFICIAL',
          sourceReference: 'ECI Official Gazette & Delimitation Order, 2008',
        },
      };

      return sendSaasSuccess(reply, request, responseData);
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 2. NORMALIZED ELECTIONS DATA FAMILY (/api/vsaas/v1/elections/...)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vsaas/v1/elections
   * Query macro election events.
   */
  app.get<{
    Querystring: { state?: string; year?: number; type?: string; limit?: number; offset?: number };
  }>(
    '/api/vsaas/v1/elections',
    { schema: { querystring: electionsQuerySchema } },
    async (request, reply) => {
      try {
        const { state, year, type, limit, offset } = request.query;
        const result = await electionService.listElectionEvents({
          state: state ? state.toUpperCase() : undefined,
          year: year ? Number(year) : undefined,
          type,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        const sanitizedEvents = result.events.map((e) => ({
          ...e,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: e.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Official Results Feed & Gazette Notification',
          },
        }));

        return sendSaasSuccess(reply, request, {
          total: result.total,
          limit: limit ?? 20,
          offset: offset ?? 0,
          events: sanitizedEvents,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve elections list', {
          code: 'ELECTION_LOOKUP_FAILURE',
        });
      }
    }
  );

  /**
   * GET /api/vsaas/v1/elections/:id
   * Single election event details and turnout totals.
   */
  app.get<{ Params: { id: string } }>(
    '/api/vsaas/v1/elections/:id',
    { schema: { params: electionIdParamSchema } },
    async (request, reply) => {
      try {
        const event = await electionService.getElectionEventById(request.params.id);
        if (!event) {
          return sendApiError(reply, request, 404, 'Not Found', `Election event '${request.params.id}' not found.`, {
            code: 'ELECTION_NOT_FOUND',
          });
        }

        return sendSaasSuccess(reply, request, {
          ...event,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: event.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Statistical Report',
          },
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve election event', {
          code: 'ELECTION_LOOKUP_FAILURE',
        });
      }
    }
  );

  /**
   * GET /api/vsaas/v1/elections/:id/contests
   * List contests within an election event.
   */
  app.get<{
    Params: { id: string };
    Querystring: { search?: string; party?: string; limit?: number; offset?: number };
  }>(
    '/api/vsaas/v1/elections/:id/contests',
    { schema: { params: electionIdParamSchema } },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { search, party, limit, offset } = request.query;

        const event = await electionService.getElectionEventById(id);
        if (!event) {
          return sendApiError(reply, request, 404, 'Not Found', `Election event '${id}' not found.`, {
            code: 'ELECTION_NOT_FOUND',
          });
        }

        const result = await electionService.listElectionContests(id, {
          search,
          party,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        const contestsWithProv = result.contests.map((c: any) => ({
          ...c,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: c.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Form 20 / Form 21E Gazette Entry',
          },
        }));

        return sendSaasSuccess(reply, request, {
          electionId: id,
          total: result.total,
          limit: limit ?? 20,
          offset: offset ?? 0,
          contests: contestsWithProv,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve election contests', {
          code: 'CONTESTS_LOOKUP_FAILURE',
        });
      }
    }
  );

  /**
   * GET /api/vsaas/v1/elections/:id/contests/:constituencyId
   * Full contest details, votes, margins, and candidate breakdown.
   */
  app.get<{ Params: { id: string; constituencyId: string } }>(
    '/api/vsaas/v1/elections/:id/contests/:constituencyId',
    { schema: { params: contestParamSchema } },
    async (request, reply) => {
      try {
        const { id, constituencyId } = request.params;
        const detail = await electionService.getContestDetail(id, constituencyId);

        if (!detail) {
          return sendApiError(
            reply,
            request,
            404,
            'Not Found',
            `Contest for constituency '${constituencyId}' in election '${id}' not found.`,
            { code: 'CONTEST_NOT_FOUND' }
          );
        }

        // Sanitize candidates and ensure zero citizen PII is exposed
        const sanitizedCandidates = (detail.candidates || []).map((cand: any) => ({
          id: cand.id,
          candidateName: cand.person ? cand.person.canonicalName : 'Unknown Candidate',
          party: cand.party ? cand.party.shortName || cand.party.name : 'Independent',
          partyId: cand.partyId,
          partyAtElection: cand.partyAtElection,
          votesReceived: cand.votesReceived,
          voteShare: cand.voteShare,
          rank: cand.rank,
          result: cand.result,
          evmVotes: cand.evmVotes,
          postalVotes: cand.postalVotes,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: cand.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Form 21E Official Declaration of Result',
          },
        }));

        const { candidates, ballotChoices, election, winner, runnerUp, ...contestFields } = detail;

        return sendSaasSuccess(reply, request, {
          contest: {
            ...contestFields,
            provenance: {
              authorityLayer: 'STATUTORY_FACT',
              dataStatus: detail.dataStatus || 'OFFICIAL',
              sourceReference: 'ECI Form 20 Final Result Sheet',
            },
          },
          candidates: sanitizedCandidates,
          ballotChoices: detail.ballotChoices || [],
          winner: winner || null,
          runnerUp: runnerUp || null,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve contest details', {
          code: 'CONTEST_DETAIL_FAILURE',
        });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 3. CANONICAL POLITICAL ENTITY FAMILY (/api/vsaas/v1/entities/...)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vsaas/v1/entities/search
   * Search canonical political persons and recognized organizations.
   */
  app.get<{
    Querystring: { q?: string; type?: 'person' | 'organization'; state?: string; role?: string; limit?: number; offset?: number };
  }>(
    '/api/vsaas/v1/entities/search',
    { schema: { querystring: entitySearchQuerySchema } },
    async (request, reply) => {
      try {
        const { q, type, state, role, limit, offset } = request.query;
        const result = await politicalEntityService.searchEntities({
          q,
          type,
          state: state ? state.toUpperCase() : undefined,
          role,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        // Ensure zero personal PII (e.g. mobile/email) is returned; only canonical public attributes
        const sanitizedPersons = result.persons.map((p) => ({
          id: p.id,
          canonicalName: p.canonicalName,
          aliases: p.aliases,
          gender: p.gender,
          photoUrl: p.photoUrl,
          eciCandidateId: p.eciCandidateId,
          sansadMemberId: p.sansadMemberId,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: p.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Gazetted Affidavits & Parliamentary Secretariats',
          },
        }));

        const sanitizedOrgs = result.organizations.map((o) => ({
          id: o.id,
          name: o.name,
          shortName: o.shortName,
          orgType: o.orgType,
          ecPartyCode: o.ecPartyCode,
          recognitionLevel: o.recognitionLevel,
          headquartersState: o.headquartersState,
          symbolUrl: o.symbolUrl,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: o.dataStatus || 'OFFICIAL',
            sourceReference: 'Election Commission of India Political Parties List',
          },
        }));

        return sendSaasSuccess(reply, request, {
          total: result.total,
          limit: limit ?? 20,
          offset: offset ?? 0,
          persons: sanitizedPersons,
          organizations: sanitizedOrgs,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to execute entity search', {
          code: 'ENTITY_SEARCH_FAILURE',
        });
      }
    }
  );

  /**
   * GET /api/vsaas/v1/entities/persons/:id
   * Canonical public profile of an elected representative or candidate.
   */
  app.get<{ Params: { id: string } }>(
    '/api/vsaas/v1/entities/persons/:id',
    { schema: { params: entityIdParamSchema } },
    async (request, reply) => {
      try {
        const person = await politicalEntityService.getPersonById(request.params.id);
        if (!person) {
          return sendApiError(reply, request, 404, 'Not Found', `Political person '${request.params.id}' not found.`, {
            code: 'PERSON_NOT_FOUND',
          });
        }

        const sanitizedPerson = {
          id: person.id,
          canonicalName: person.canonicalName,
          aliases: person.aliases,
          gender: person.gender,
          photoUrl: person.photoUrl,
          eciCandidateId: person.eciCandidateId,
          sansadMemberId: person.sansadMemberId,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: person.dataStatus || 'OFFICIAL',
            sourceReference: 'Official Gazette & Statutory Election Filing',
          },
        };

        return sendSaasSuccess(reply, request, sanitizedPerson);
      } catch (err: any) {
        const statusCode = err.statusCode || (err.code === 'PERSON_NOT_FOUND' ? 404 : 500);
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : 'Internal Server Error',
          err.message || 'Failed to retrieve person profile',
          { code: err.code || 'PERSON_LOOKUP_FAILURE' }
        );
      }
    }
  );

  /**
   * GET /api/vsaas/v1/entities/organizations/:id
   * Political organization profile and recognition status.
   */
  app.get<{ Params: { id: string } }>(
    '/api/vsaas/v1/entities/organizations/:id',
    { schema: { params: entityIdParamSchema } },
    async (request, reply) => {
      try {
        const org = await politicalEntityService.getOrganizationById(request.params.id);
        if (!org) {
          return sendApiError(
            reply,
            request,
            404,
            'Not Found',
            `Political organization '${request.params.id}' not found.`,
            { code: 'ORGANIZATION_NOT_FOUND' }
          );
        }

        const sanitizedOrg = {
          id: org.id,
          name: org.name,
          shortName: org.shortName,
          orgType: org.orgType,
          ecPartyCode: org.ecPartyCode,
          recognitionLevel: org.recognitionLevel,
          headquartersState: org.headquartersState,
          symbolUrl: org.symbolUrl,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: org.dataStatus || 'OFFICIAL',
            sourceReference: 'ECI Notification of Recognized Political Parties and Election Symbols',
          },
        };

        return sendSaasSuccess(reply, request, sanitizedOrg);
      } catch (err: any) {
        const statusCode = err.statusCode || (err.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 500);
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : 'Internal Server Error',
          err.message || 'Failed to retrieve organization profile',
          { code: err.code || 'ORGANIZATION_LOOKUP_FAILURE' }
        );
      }
    }
  );

  /**
   * GET /api/vsaas/v1/entities/legislators
   * Roster of current gazetted legislators with tenure and jurisdiction.
   */
  app.get<{
    Querystring: { state?: string; house?: 'assembly' | 'parliament'; currentOnly?: boolean };
  }>(
    '/api/vsaas/v1/entities/legislators',
    { schema: { querystring: legislatorsQuerySchema } },
    async (request, reply) => {
      try {
        const { state, house, currentOnly } = request.query;
        const result = await politicalEntityService.listCurrentLegislators({
          state: state ? state.toUpperCase() : undefined,
          house,
          currentOnly: currentOnly ?? true,
        });

        const sanitizedRoster = result.legislators.map((item: any) => ({
          tenureId: item.tenure.id,
          officeName: item.tenure.officeName,
          jurisdictionId: item.tenure.jurisdictionId,
          stateCode: item.tenure.stateCode,
          person: {
            id: item.person.id,
            canonicalName: item.person.canonicalName,
            photoUrl: item.person.photoUrl,
          },
          party: item.organization
            ? {
                id: item.organization.id,
                name: item.organization.name,
                shortName: item.organization.shortName,
              }
            : null,
          startDate: item.tenure.startDate,
          endDate: item.tenure.endDate,
          isCurrent: item.tenure.isCurrent,
          provenance: {
            authorityLayer: 'STATUTORY_FACT',
            dataStatus: 'OFFICIAL',
            sourceReference: 'Legislative Assembly Secretariat Notification',
          },
        }));

        return sendSaasSuccess(reply, request, {
          count: sanitizedRoster.length,
          legislators: sanitizedRoster,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve legislators roster', {
          code: 'LEGISLATORS_LOOKUP_FAILURE',
        });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DELIMITATION REGIMES & GOVERNED SCENARIOS (/api/vsaas/v1/delim/...)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vsaas/v1/delim/regimes
   * Statutory timelines and historical legal delimitation orders (1976, 2008).
   */
  app.get('/api/vsaas/v1/delim/regimes', async (request, reply) => {
    try {
      const timeline = delimitationService.getTimeline();
      const status = delimitationService.getStatus();

      return sendSaasSuccess(reply, request, {
        currentOperativeLaw: {
          regimeId: 'eci_delimitation_2008',
          legalStatus: 'CURRENT_LEGAL_REGIME',
          orderName: 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008',
          constitutionalFreeze: 'Article 82 & 170 (84th Constitutional Amendment freeze until first census after 2026)',
        },
        constitutionalStatus: status,
        timelineEvents: timeline.events,
        provenance: {
          authorityLayer: 'STATUTORY_FACT',
          dataStatus: 'OFFICIAL',
          sourceReference: 'Constitution of India (Articles 81, 82, 170, 330, 332) & Delimitation Acts',
        },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve delimitation regimes', {
        code: 'DELIMITATION_REGIMES_FAILURE',
      });
    }
  });

  /**
   * GET /api/vsaas/v1/delim/projections
   * National seat apportionment models across states under Article 170 / Census 2011.
   */
  app.get<{ Querystring: { model?: string } }>(
    '/api/vsaas/v1/delim/projections',
    async (request, reply) => {
      try {
        const model = request.query.model;
        const projections = delimitationService.getProjections(model);

        return sendSaasSuccess(reply, request, {
          ...projections,
          provenance: {
            authorityLayer: 'PANIN_SCENARIO',
            computationalType: 'ACADEMIC_SIMULATION',
            officialDelimitationOrder: false,
            governingInstrument: 'PANIN Algorithmic Projection Engine (Article 170 Framework)',
            constitutionalBasis: 'Article 170(1)',
            legalStatus: 'SCENARIO_PROPOSED_REGIME',
            sourceReference: 'Census 2011 Primary Census Abstract (RGI)',
            statutoryDisclaimer:
              'This projection is an algorithmic simulation based on Census 2011 data and mathematical modeling. It does NOT represent an official order or draft proposal of the Delimitation Commission of India or the Election Commission of India.',
          },
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to compute seat projections', {
          code: 'PROJECTIONS_FAILURE',
        });
      }
    }
  );

  /**
   * GET /api/vsaas/v1/delim/simulate/:stateCode
   * Governed boundary redistribution simulation (Hare-Niemeyer / Hamilton method).
   * Invariant: Returns server-owned PANIN_SCENARIO metadata and statutory disclaimers.
   */
  app.get<{
    Params: { stateCode: string };
    Querystring: { seats?: string; maxDeviation?: string; mode?: string; regimeId?: string; proposalId?: string; date?: string };
  }>(
    '/api/vsaas/v1/delim/simulate/:stateCode',
    { schema: { params: stateCodeParamSchema, querystring: delimSimulationQuerySchema } },
    async (request, reply) => {
      const stateCode = resolveStateCode(request.params.stateCode);
      const query = request.query;

      // Computational bounds validation
      if (query.seats !== undefined) {
        const parsedSeats = parseInt(query.seats, 10);
        if (isNaN(parsedSeats) || parsedSeats < MIN_SAFE_REQUESTED_SEATS || parsedSeats > MAX_SAFE_REQUESTED_SEATS) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            `Requested seats must be an integer between ${MIN_SAFE_REQUESTED_SEATS} and ${MAX_SAFE_REQUESTED_SEATS}. (Note: MAX_SAFE_REQUESTED_SEATS is an ingress computational protection, not a constitutional limit).`,
            { code: 'VALIDATION_ERROR' }
          );
        }
      }

      try {
        const result = delimitationService.simulateBoundaries(stateCode, {
          mode: query.mode,
          seats: query.seats,
          maxDeviation: query.maxDeviation,
          regimeId: query.regimeId,
          proposalId: query.proposalId,
          date: query.date,
        });

        // Enforce strict server-owned provenance block per Section 7 of PLAN-W021-MASTER-REV-1.0
        const serverOwnedProvenance = {
          authorityLayer: 'PANIN_SCENARIO',
          computationalType: 'ACADEMIC_SIMULATION',
          officialDelimitationOrder: false,
          governingInstrument: 'PANIN Algorithmic Simulation (Article 170 Framework)',
          constitutionalBasis: 'Article 170(1)',
          legalStatus: 'SCENARIO_PROPOSED_REGIME',
          sourceReference: 'Census 2011 Primary Census Abstract (RGI)',
          effectiveVersion: '2026-PANIN-SIM-V1',
          generatedAt: new Date().toISOString(),
          statutoryDisclaimer:
            'This projection is a research simulation based on Census 2011 data and mathematical modeling. It does NOT represent an official order, draft proposal, or gazette notification of the Delimitation Commission of India or the Election Commission of India.',
        };

        const responsePayload = {
          ...result,
          provenance: serverOwnedProvenance,
        };

        return sendSaasSuccess(reply, request, responsePayload);
      } catch (err: any) {
        if (err.code === 'UNSUPPORTED_GEOGRAPHY' || err.statusCode === 404) {
          return sendApiError(reply, request, 404, 'Not Found', err.message, {
            code: 'UNSUPPORTED_GEOGRAPHY',
          });
        }
        return sendApiError(reply, request, err.statusCode || 400, 'Bad Request', err.message || 'Simulation error', {
          code: err.code || 'SIMULATION_ERROR',
        });
      }
    }
  );
}
