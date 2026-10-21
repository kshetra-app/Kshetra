import Fastify, { FastifyInstance } from 'fastify';
import { delimitationRoutes } from '../routes/delimitation';
import {
  delimitationService,
  MAX_SAFE_REQUESTED_SEATS,
  MIN_SAFE_REQUESTED_SEATS,
} from '../services/delimitationService';
import {
  delimitationQueryService,
  DelimitationQueryError,
  resolveLegalApplicability,
} from '../services/delimitationQueryService';
import { supabase } from '../lib/supabase';

describe('Comprehensive Delimitation Unit & Route Tests', () => {
  let app: FastifyInstance;
  const originalMonitorSecret = process.env.KSHETRA_MONITOR_SECRET;

  const MOCK_DELIMITATION_REGIMES = [
    {
      id: 'eci_delimitation_1976',
      name: 'Delimitation Order 1976',
      legal_status: 'HISTORICAL_LEGAL_REGIME',
      authority: 'Delimitation Commission of India',
      legal_basis: 'Delimitation Act, 1972',
      effective_from: '1976-01-01',
      effective_to: '2008-02-19',
      is_active: false,
      metadata: {},
      created_at: '2026-09-30T00:00:00Z',
    },
    {
      id: 'eci_delimitation_2008',
      name: 'Delimitation Order 2008',
      legal_status: 'CURRENT_LEGAL_REGIME',
      authority: 'Delimitation Commission of India',
      legal_basis: 'Delimitation Act, 2002',
      effective_from: '2008-02-19',
      effective_to: null,
      is_active: true,
      metadata: {},
      created_at: '2026-09-30T00:00:00Z',
    },
    {
      id: 'eci_delimitation_post2026',
      name: 'Post-2026 Constitutional Delimitation',
      legal_status: 'FUTURE_ANTICIPATED_REGIME',
      authority: 'Parliament of India',
      legal_basis: 'Constitution of India',
      effective_from: '2026-01-01',
      effective_to: null,
      is_active: false,
      metadata: {},
      created_at: '2026-09-30T00:00:00Z',
    },
    {
      id: 'w014_scenario_regime_ts_153',
      name: 'W014 Scenario Regime TS 153',
      legal_status: 'SCENARIO_PROPOSED_REGIME',
      authority: 'Kshetra Research',
      legal_basis: 'Research Simulation',
      effective_from: '2026-01-01',
      effective_to: null,
      is_active: false,
      metadata: {},
      created_at: '2026-09-30T00:00:00Z',
    },
    {
      id: 'scenario_delimitation_draft_prop_1',
      name: 'Delimitation Research Simulation Scenario 1',
      legal_status: 'SCENARIO_PROPOSED_REGIME',
      authority: 'PANIN Delimitation Simulation Engine',
      legal_basis: 'Research Simulation',
      effective_from: '2026-01-01',
      effective_to: null,
      is_active: false,
      metadata: {},
      created_at: '2026-09-30T00:00:00Z',
    },
  ];

  beforeAll(async () => {
    process.env.KSHETRA_MONITOR_SECRET = 'test-monitor-secret-123';
    app = Fastify();
    await app.register(delimitationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalMonitorSecret !== undefined) {
      process.env.KSHETRA_MONITOR_SECRET = originalMonitorSecret;
    } else {
      delete process.env.KSHETRA_MONITOR_SECRET;
    }
    await app.close();
  });

  beforeEach(() => {
    // Default safe Supabase mock populated with canonical regimes
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const data = table === 'delimitation_regimes' ? MOCK_DELIMITATION_REGIMES : [];
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      return builder;
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. FASTIFY PRE-VALIDATION HOOKS (SCENARIO_INPUT_FORBIDDEN)
  // ─────────────────────────────────────────────────────────────
  describe('PreValidation Hook: Scenario Input Forbiddance', () => {
    it('rejects query parameter isScenario with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections?isScenario=true',
      });
      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('SCENARIO_INPUT_FORBIDDEN');
    });

    it('rejects query parameter is_scenario with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections?is_scenario=1',
      });
      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('SCENARIO_INPUT_FORBIDDEN');
    });

    it('rejects query parameter simulation with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections?simulation=true',
      });
      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('SCENARIO_INPUT_FORBIDDEN');
    });

    it('rejects body with isScenario or simulation in POST request with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: {
          authorization: 'Bearer test-monitor-secret-123',
        },
        payload: {
          type: 'test',
          entries: [],
          isScenario: true,
        },
      });
      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('SCENARIO_INPUT_FORBIDDEN');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ERROR & EDGE CASES IN ROUTES 1 - 14
  // ─────────────────────────────────────────────────────────────
  describe('Routes 1 - 14 Edge & Error Handling', () => {
    it('Route 1: /projections handles service exception with 500', async () => {
      jest.spyOn(delimitationService, 'getProjections').mockImplementationOnce(() => {
        throw new Error('Service projection calculation failure');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections',
      });
      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('PROJECTION_CALCULATION_ERROR');
    });

    it('Route 2: /projections/:stateCode handles service exception with 500', async () => {
      jest.spyOn(delimitationService, 'getStateProjection').mockImplementationOnce(() => {
        throw new Error('Database lookup failure');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections/TS',
      });
      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('STATE_PROJECTION_ERROR');
    });

    it('Route 3: /timeline handles service exception with 500', async () => {
      jest.spyOn(delimitationService, 'getTimeline').mockImplementationOnce(() => {
        throw new Error('Timeline failure');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/timeline',
      });
      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('TIMELINE_RETRIEVAL_ERROR');
    });

    it('Route 4: /status handles service exception with 500', async () => {
      jest.spyOn(delimitationService, 'getStatus').mockImplementationOnce(() => {
        throw new Error('Status failure');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/status',
      });
      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('STATUS_RETRIEVAL_ERROR');
    });

    it('Route 5: /gainers-losers handles service exception with 500', async () => {
      jest.spyOn(delimitationService, 'getGainersLosers').mockImplementationOnce(() => {
        throw new Error('GainersLosers failure');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/gainers-losers',
      });
      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('GAINERS_LOSERS_ERROR');
    });

    it('Route 6: /monitor-webhook handles unauthorized and error statuses', async () => {
      // Missing auth header
      const unauthRes = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        payload: { type: 'cron', entries: [{ id: '1', title: 'test', date: '2026-10-20' }] },
      });
      expect(unauthRes.statusCode).toBe(401);

      // Wrong auth token
      const wrongAuthRes = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: { authorization: 'Bearer wrong-secret' },
        payload: { type: 'cron', entries: [{ id: '1', title: 'test', date: '2026-10-20' }] },
      });
      expect(wrongAuthRes.statusCode).toBe(401);

      // Service error with statusCode
      jest.spyOn(delimitationService, 'processMonitorWebhook').mockImplementationOnce(() => {
        const err: any = new Error('Custom webhook error');
        err.statusCode = 400;
        err.code = 'CUSTOM_ERROR';
        throw err;
      });
      const errRes = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: { authorization: 'Bearer test-monitor-secret-123' },
        payload: { type: 'cron', entries: [{ id: '1', title: 'test', date: '2026-10-20' }] },
      });
      expect(errRes.statusCode).toBe(400);
      expect(JSON.parse(errRes.payload).code).toBe('CUSTOM_ERROR');
    }, 60000);

    it('Route 7: /impact/:pinCode handles validation and service errors', async () => {
      // Service error
      jest.spyOn(delimitationService, 'getCitizenImpact').mockImplementationOnce(() => {
        throw new Error('Impact calculation failed');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/500001',
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.payload).code).toBe('CITIZEN_IMPACT_ERROR');
    });

    it('Route 8: /simulate/:stateCode handles seat boundary validation & errors', async () => {
      // Seats below minimum (0)
      const resMin = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=0',
      });
      expect(resMin.statusCode).toBe(400);
      expect(JSON.parse(resMin.payload).code).toBe('VALIDATION_ERROR');

      // Seats above maximum (10001)
      const resMax = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=10001',
      });
      expect(resMax.statusCode).toBe(400);

      // Valid maxDeviation query
      const resDev = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=119&maxDeviation=10.5',
      });
      expect(resDev.statusCode).toBe(200);

      // Service error: unsupported geography (404)
      jest.spyOn(delimitationService, 'simulateBoundaries').mockImplementationOnce(() => {
        const err: any = new Error('Unknown state');
        err.code = 'UNSUPPORTED_GEOGRAPHY';
        err.statusCode = 404;
        throw err;
      });
      const res404 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS',
      });
      expect(res404.statusCode).toBe(404);

      // Service error: generic simulation error (400)
      jest.spyOn(delimitationService, 'simulateBoundaries').mockImplementationOnce(() => {
        const err: any = new Error('Simulation failed');
        err.code = 'SIMULATION_ERROR';
        throw err;
      });
      const resErr = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS',
      });
      expect(resErr.statusCode).toBe(400);
    });

    it('Route 9: /reservation handles service error with 500', async () => {
      jest.spyOn(delimitationService, 'getNationalReservations').mockImplementationOnce(() => {
        throw new Error('Reservation calc error');
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation',
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.payload).code).toBe('RESERVATION_ANALYSIS_ERROR');
    });

    it('Route 10: /reservation/:stateCode handles unsupported states and errors', async () => {
      // State without statutory baseline returns 404
      const res404 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation/UP',
      });
      expect(res404.statusCode).toBe(404);
      expect(JSON.parse(res404.payload).code).toBe('UNSUPPORTED_GEOGRAPHY');

      // Service error
      jest.spyOn(delimitationService, 'getStateReservationDetail').mockImplementationOnce(() => {
        throw new Error('Reservation detail error');
      });
      const res500 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation/TS',
      });
      expect(res500.statusCode).toBe(500);
      expect(JSON.parse(res500.payload).code).toBe('STATE_RESERVATION_ERROR');
    });

    it('Route 11: /compare handles empty codes, unmapped states, and service errors', async () => {
      // Empty commas
      const resEmpty = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare?states=,,,',
      });
      expect(resEmpty.statusCode).toBe(400);

      // States not found (statesCompared === 0)
      const resNone = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare?states=ZZ,YY',
      });
      expect(resNone.statusCode).toBe(404);
      expect(JSON.parse(resNone.payload).code).toBe('UNSUPPORTED_GEOGRAPHY');

      // Service error
      jest.spyOn(delimitationService, 'compareStates').mockImplementationOnce(() => {
        throw new Error('Compare error');
      });
      const res500 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare?states=TS,AP',
      });
      expect(res500.statusCode).toBe(500);
      expect(JSON.parse(res500.payload).code).toBe('STATE_COMPARISON_ERROR');
    });

    it('Route 12: /mla-impact/:stateCode handles 404 and service errors', async () => {
      const res404 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/mla-impact/ZZ',
      });
      expect(res404.statusCode).toBe(404);

      jest.spyOn(delimitationService, 'getMlaImpact').mockImplementationOnce(() => {
        throw new Error('MLA impact failure');
      });
      const res500 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/mla-impact/TS',
      });
      expect(res500.statusCode).toBe(500);
      expect(JSON.parse(res500.payload).code).toBe('MLA_IMPACT_ERROR');
    });

    it('Route 13: /party-projections/:stateCode handles 404 and service errors', async () => {
      const res404 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/party-projections/ZZ',
      });
      expect(res404.statusCode).toBe(404);

      jest.spyOn(delimitationService, 'getPartyProjections').mockImplementationOnce(() => {
        throw new Error('Party projections failure');
      });
      const res500 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/party-projections/TS',
      });
      expect(res500.statusCode).toBe(500);
      expect(JSON.parse(res500.payload).code).toBe('PARTY_PROJECTION_ERROR');
    });

    it('Route 14: /methodology handles service errors', async () => {
      jest.spyOn(delimitationService, 'getMethodology').mockImplementationOnce(() => {
        throw new Error('Methodology failure');
      });
      const res500 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/methodology',
      });
      expect(res500.statusCode).toBe(500);
      expect(JSON.parse(res500.payload).code).toBe('METHODOLOGY_RETRIEVAL_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ROUTES 15 - 20 (REGIMES, PROPOSALS, MAPPINGS, LINEAGE)
  // ─────────────────────────────────────────────────────────────
  describe('Routes 15 - 20 (W014 & W020 Endpoints)', () => {
    it('Route 15: GET /api/v1/delimitation/regimes returns 200 and handles errors', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/regimes',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);

      // DelimitationQueryError
      jest.spyOn(delimitationQueryService, 'getRegimes').mockRejectedValueOnce(
        new DelimitationQueryError('REGIME_QUERY_FAILED', 500, 'Query failed')
      );
      const errRes1 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/regimes',
      });
      expect(errRes1.statusCode).toBe(500);

      // Generic Error
      jest.spyOn(delimitationQueryService, 'getRegimes').mockRejectedValueOnce(new Error('Fatal'));
      const errRes2 = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/regimes',
      });
      expect(errRes2.statusCode).toBe(500);
      expect(JSON.parse(errRes2.payload).code).toBe('REGIME_RETRIEVAL_ERROR');
    });

    describe('Route 16: GET /api/v1/delimitation/regimes/resolve', () => {
      it('resolves mode=current by default', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve',
        });
        expect(res.statusCode).toBe(200);
        const json = JSON.parse(res.payload);
        expect(json.success).toBe(true);
        expect(json.data.regime.regimeType).toBe('CURRENT_LEGAL_REGIME');
      });

      it('resolves mode=as_of with valid date and rejects missing date', async () => {
        // Missing date
        const resMissing = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=as_of',
        });
        expect(resMissing.statusCode).toBe(400);
        expect(JSON.parse(resMissing.payload).code).toBe('INVALID_TEMPORAL_PARAMETER');

        // Valid date
        const resValid = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=as_of&date=2015-06-01',
        });
        expect(resValid.statusCode).toBe(200);
        expect(JSON.parse(resValid.payload).success).toBe(true);
      });

      it('resolves mode=explicit with regimeId and rejects missing regimeId', async () => {
        // Missing regimeId
        const resMissing = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=explicit',
        });
        expect(resMissing.statusCode).toBe(400);
        expect(JSON.parse(resMissing.payload).code).toBe('INVALID_REGIME_IDENTIFIER');

        // Valid regimeId
        const resValid = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=explicit&regimeId=eci_delimitation_2008',
        });
        expect(resValid.statusCode).toBe(200);
        expect(JSON.parse(resValid.payload).data.regime.id).toBe('eci_delimitation_2008');
      });

      it('resolves mode=future_anticipated', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=future_anticipated',
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).data.regime.regimeType).toBe('FUTURE_ANTICIPATED_REGIME');
      });

      it('resolves mode=scenario with proposalId or regimeId and rejects ambiguous/empty selector', async () => {
        // Both proposalId and regimeId provided
        const resAmbiguous = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=scenario&proposalId=02010000-0000-0000-0000-000000000001&regimeId=w014_scenario_regime_ts_153',
        });
        expect(resAmbiguous.statusCode).toBe(400);
        expect(JSON.parse(resAmbiguous.payload).code).toBe('INVALID_SCENARIO_SELECTOR');

        // Neither provided
        const resNeither = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=scenario',
        });
        expect(resNeither.statusCode).toBe(400);

        // Valid proposalId
        const resProposal = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=scenario&proposalId=02010000-0000-0000-0000-000000000002',
        });
        expect(resProposal.statusCode).toBe(200);
        expect(JSON.parse(resProposal.payload).data.isScenario).toBe(true);

        // Valid regimeId
        const resRegime = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve?mode=scenario&regimeId=w014_scenario_regime_ts_153',
        });
        expect(resRegime.statusCode).toBe(200);
        expect(JSON.parse(resRegime.payload).data.isScenario).toBe(true);
      });

      it('handles DelimitationQueryError and generic error in /regimes/resolve', async () => {
        jest.spyOn(delimitationQueryService, 'resolveRegime').mockRejectedValueOnce(
          new DelimitationQueryError('TEST_QUERY_ERROR', 400, 'Test error message')
        );
        const resErr1 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve',
        });
        expect(resErr1.statusCode).toBe(400);

        jest.spyOn(delimitationQueryService, 'resolveRegime').mockRejectedValueOnce(new Error('Fatal'));
        const resErr2 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/regimes/resolve',
        });
        expect(resErr2.statusCode).toBe(500);
        expect(JSON.parse(resErr2.payload).code).toBe('REGIME_RESOLUTION_ERROR');
      });
    });

    describe('Route 17: GET /api/v1/delimitation/proposals', () => {
      it('returns proposals with filters and handles errors', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals?stateCode=TS&regimeId=eci_delimitation_2008',
        });
        expect(res.statusCode).toBe(200);
        const json = JSON.parse(res.payload);
        expect(json.success).toBe(true);

        jest.spyOn(delimitationQueryService, 'getProposals').mockRejectedValueOnce(
          new DelimitationQueryError('PROP_ERROR', 400, 'Query error')
        );
        const errRes1 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals',
        });
        expect(errRes1.statusCode).toBe(400);

        jest.spyOn(delimitationQueryService, 'getProposals').mockRejectedValueOnce(new Error('Fatal'));
        const errRes2 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals',
        });
        expect(errRes2.statusCode).toBe(500);
      });
    });

    describe('Route 18: GET /api/v1/delimitation/proposals/:id', () => {
      it('returns proposal for valid UUID and 404 for unknown', async () => {
        const res200 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals/02010000-0000-0000-0000-000000000001',
        });
        expect(res200.statusCode).toBe(200);

        const res404 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals/00000000-0000-0000-0000-000000000099',
        });
        expect(res404.statusCode).toBe(404);
        expect(JSON.parse(res404.payload).code).toBe('PROPOSAL_NOT_FOUND');

        jest.spyOn(delimitationQueryService, 'getProposalById').mockRejectedValueOnce(
          new DelimitationQueryError('PROP_ERR', 400, 'Proposal error')
        );
        const errRes = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals/02010000-0000-0000-0000-000000000001',
        });
        expect(errRes.statusCode).toBe(400);

        jest.spyOn(delimitationQueryService, 'getProposalById').mockRejectedValueOnce(new Error('Fatal'));
        const errRes2 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/proposals/02010000-0000-0000-0000-000000000001',
        });
        expect(errRes2.statusCode).toBe(500);
      });
    });

    describe('Route 19: GET /api/v1/delimitation/mapping', () => {
      it('returns mapping and lineage claims', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/mapping',
        });
        expect(res.statusCode).toBe(200);
        const json = JSON.parse(res.payload);
        expect(json.data.claims).toBeDefined();

        jest.spyOn(delimitationQueryService, 'getConstituencyMappings').mockRejectedValueOnce(
          new DelimitationQueryError('MAP_ERR', 500, 'Error')
        );
        const errRes = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/mapping',
        });
        expect(errRes.statusCode).toBe(500);

        jest.spyOn(delimitationQueryService, 'getConstituencyMappings').mockRejectedValueOnce(new Error('Fatal'));
        const errRes2 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/mapping',
        });
        expect(errRes2.statusCode).toBe(500);
      });
    });

    describe('Route 20: GET /api/v1/delimitation/lineage/:acCode', () => {
      it('returns 200 for known AC code and 404 for unknown', async () => {
        // AC-119 is registered in UNKNOWN_LINEAGE_CLAIMS
        const res200 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/lineage/119',
        });
        expect(res200.statusCode).toBe(200);
        const json = JSON.parse(res200.payload);
        expect(json.data.lineageStatus).toBe('UNKNOWN');

        // Unknown AC
        const res404 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/lineage/999',
        });
        expect(res404.statusCode).toBe(404);
        expect(JSON.parse(res404.payload).code).toBe('CONSTITUENCY_NOT_FOUND');

        // Error handling
        jest.spyOn(delimitationQueryService, 'getConstituencyLineage').mockRejectedValueOnce(
          new DelimitationQueryError('LIN_ERR', 400, 'Error')
        );
        const errRes = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/lineage/119',
        });
        expect(errRes.statusCode).toBe(400);

        jest.spyOn(delimitationQueryService, 'getConstituencyLineage').mockRejectedValueOnce(new Error('Fatal'));
        const errRes2 = await app.inject({
          method: 'GET',
          url: '/api/v1/delimitation/lineage/119',
        });
        expect(errRes2.statusCode).toBe(500);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. DELIMITATION QUERY SERVICE DIRECT UNIT TESTS
  // ─────────────────────────────────────────────────────────────
  describe('DelimitationQueryService Direct Unit Tests', () => {
    it('getRegimes throws on Supabase error and maps database rows correctly', async () => {
      // Supabase error
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB connection error' } }),
      } as any);

      await expect(delimitationQueryService.getRegimes()).rejects.toThrow(DelimitationQueryError);

      // Supabase returns rows -> mapDbRegime
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'regime_1',
              name: 'Test Regime',
              legal_status: 'CURRENT_LEGAL_REGIME',
              description: 'Test Description',
              effective_from: '2008-02-19',
              effective_to: null,
              authority: 'ECI',
              is_active: 1,
              metadata: { test: true },
              created_at: '2026-10-20T00:00:00Z',
            },
          ],
          error: null,
        }),
      } as any);

      const regimes = await delimitationQueryService.getRegimes();
      expect(regimes.length).toBe(1);
      expect(regimes[0].id).toBe('regime_1');
      expect(regimes[0].isActive).toBe(true);
      expect(regimes[0].regimeType).toBe('CURRENT_LEGAL_REGIME');
    });

    it('getProposals queries database and maps rows with mapDbProposal', async () => {
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'prop_db_1',
              state_code: 'TS',
              title: 'DB Proposal',
              description: 'DB Description',
              current_seats: 119,
              proposed_seats: 153,
              seat_change: 34,
              proposed_sc_seats: 24,
              proposed_st_seats: 15,
              general_seats: 114,
              status: 'PROPOSED',
              legal_status: 'SCENARIO_PROPOSED_REGIME',
              regime_id: 'regime_1',
              provenance_id: 'prov_1',
              metadata: {},
              created_at: '2026-10-20T00:00:00Z',
              updated_at: '2026-10-20T00:00:00Z',
            },
          ],
          error: null,
        }),
      } as any);

      const proposals = await delimitationQueryService.getProposals({ stateCode: 'TS' });
      expect(proposals.length).toBe(1);
      expect(proposals[0].id).toBe('prop_db_1');
      expect(proposals[0].isScenario).toBe(true);
      expect(proposals[0].reservedScSeats).toBe(24);
    });

    it('getProposalById throws on DB error and fetches provenance', async () => {
      // DB error
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } }),
      } as any);

      await expect(delimitationQueryService.getProposalById('some_id')).rejects.toThrow(DelimitationQueryError);

      // Proposal with provenanceId -> resolves provenance record via mapDbProvenance
      jest.spyOn(supabase, 'from')
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValueOnce({
            data: {
              id: 'prop_with_prov',
              state_code: 'TS',
              title: 'Proposal with provenance',
              current_seats: 119,
              proposed_seats: 119,
              legal_status: 'CURRENT_LEGAL_REGIME',
              provenance_id: 'prov_rec_123',
            },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValueOnce({
            data: {
              id: 'prov_rec_123',
              source_authority: 'Election Commission',
              methodology: 'Statutory Allocation',
              citation: 'Order 2008',
              verification_notes: 'Verified against gazette',
              metadata: {},
            },
            error: null,
          }),
        } as any);

      const result = await delimitationQueryService.getProposalById('prop_with_prov');
      expect(result).not.toBeNull();
      expect(result!.proposal.id).toBe('prop_with_prov');
      expect(result!.provenance).not.toBeNull();
      expect(result!.provenance!.sourceAuthority).toBe('Election Commission');
    });

    it('getConstituencyMappings throws on DB error and maps rows via mapDbMapping', async () => {
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Mapping query error' }, count: 0 }),
      } as any);

      await expect(delimitationQueryService.getConstituencyMappings()).rejects.toThrow(DelimitationQueryError);

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'map_1',
              predecessor_constituency_version_id: 'v1',
              successor_constituency_version_id: 'v2',
              relationship_type: 'territorial_transfer',
              effective_date: '2015-06-02',
              source: 'AP Reorganisation Act',
              evidence: 'GSR 311(E)',
              provenance_id: 'prov_1',
              metadata: {},
              created_at: '2026-10-20T00:00:00Z',
            },
          ],
          error: null,
          count: 1,
        }),
      } as any);

      const mappingRes = await delimitationQueryService.getConstituencyMappings();
      expect(mappingRes.count).toBe(1);
      expect(mappingRes.mappings[0].id).toBe('map_1');
      expect(mappingRes.mappings[0].relationshipType).toBe('territorial_transfer');
    });

    it('getSittingMlas maps elected_tenures from Supabase when present', async () => {
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'tenure_1',
              person_id: 'person_1',
              organization_id: 'org_1',
              jurisdiction_id: 'TS-AC-065',
              office_name: 'MLA',
              party_at_election: 'INC',
              canonical_persons: { id: 'person_1', canonical_name: 'A. Revanth Reddy' },
              political_organizations: { id: 'org_1', short_name: 'INC' },
            },
          ],
          error: null,
        }),
      } as any);

      const mlas = await delimitationQueryService.getSittingMlas('TS');
      expect(mlas).not.toBeNull();
      expect(mlas!.length).toBe(1);
      expect(mlas![0].mlaName).toBe('A. Revanth Reddy');
      expect(mlas![0].currentAcNo).toBe(65);
      expect(mlas![0].party).toBe('INC');
    });

    describe('resolveRegime Invariants & Branch Coverage', () => {
      it('mode=current throws when invalid regime is marked active', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValueOnce([
          {
            id: 'corrupted_regime',
            name: 'Corrupted',
            regimeType: 'HISTORICAL_LEGAL_REGIME',
            description: '',
            effectiveFrom: '1976-01-01',
            effectiveTo: '2008-02-18',
            authority: 'ECI',
            isActive: true, // Invariant violation: isActive=true but HISTORICAL
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
          },
        ]);

        await expect(delimitationQueryService.resolveRegime({ mode: 'current' })).rejects.toMatchObject({
          code: 'INVALID_CURRENT_REGIME_STATE',
        });
      });

      it('mode=current throws when no CURRENT_LEGAL_REGIME exists', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValueOnce([]);

        await expect(delimitationQueryService.resolveRegime({ mode: 'current' })).rejects.toMatchObject({
          code: 'REGIME_NOT_FOUND',
        });
      });

      it('mode=current throws when CURRENT_LEGAL_REGIME is temporally invalid', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValueOnce([
          {
            id: 'future_current',
            name: 'Future Current',
            regimeType: 'CURRENT_LEGAL_REGIME',
            description: '',
            effectiveFrom: '2099-01-01', // Future effective from!
            effectiveTo: null,
            authority: 'ECI',
            isActive: false,
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
          },
        ]);

        await expect(delimitationQueryService.resolveRegime({ mode: 'current' })).rejects.toMatchObject({
          code: 'INVALID_CURRENT_REGIME_STATE',
        });
      });

      it('mode=as_of throws on invalid date formats or missing regime', async () => {
        await expect(delimitationQueryService.resolveRegime({ mode: 'as_of', date: 'invalid-date' })).rejects.toMatchObject({
          code: 'INVALID_TEMPORAL_PARAMETER',
        });

        await expect(delimitationQueryService.resolveRegime({ mode: 'as_of', date: '1950-01-01' })).rejects.toMatchObject({
          code: 'REGIME_NOT_FOUND',
        });
      });

      it('mode=explicit throws on forbidden or missing regime identifiers', async () => {
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'explicit', regimeId: 'SIMULATION_PROPOSED' })
        ).rejects.toMatchObject({ code: 'INVALID_REGIME_IDENTIFIER' });

        await expect(
          delimitationQueryService.resolveRegime({ mode: 'explicit', regimeId: 'unregistered_regime_xyz' })
        ).rejects.toMatchObject({ code: 'REGIME_NOT_FOUND' });
      });

      it('mode=future_anticipated throws when regime not found', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValueOnce([]);
        await expect(delimitationQueryService.resolveRegime({ mode: 'future_anticipated' })).rejects.toMatchObject({
          code: 'REGIME_NOT_FOUND',
        });
      });

      it('mode=scenario fails closed on coherence violations', async () => {
        // Missing selector
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'scenario', selector: null as any })
        ).rejects.toMatchObject({ code: 'INVALID_SCENARIO_SELECTOR' });

        // Proposal not found
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: '00000000-0000-0000-0000-000000000000' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_NOT_FOUND' });

        // Proposal is not SCENARIO_PROPOSED_REGIME
        jest.spyOn(delimitationQueryService, 'getProposalById').mockResolvedValueOnce({
          proposal: {
            id: 'prop_statutory',
            stateCode: 'TS',
            title: 'Statutory Proposal',
            description: '',
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
            provenanceId: null,
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
            updatedAt: '2026-10-20T00:00:00Z',
          },
          provenance: null,
        });

        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: 'prop_statutory' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_COHERENCE_VIOLATION' });

        // Scenario proposal missing regimeId
        jest.spyOn(delimitationQueryService, 'getProposalById').mockResolvedValueOnce({
          proposal: {
            id: 'prop_no_regime',
            stateCode: 'TS',
            title: 'No Regime Proposal',
            description: '',
            currentSeats: 119,
            proposedSeats: 153,
            seatChange: 34,
            reservedScSeats: 24,
            reservedStSeats: 15,
            generalSeats: 114,
            status: 'under_review',
            outputClassification: 'SCENARIO_PROJECTION',
            dataStatus: 'SCENARIO',
            legalStatus: 'SCENARIO_PROPOSED_REGIME',
            isScenario: true,
            regimeId: null,
            provenanceId: null,
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
            updatedAt: '2026-10-20T00:00:00Z',
          },
          provenance: null,
        });

        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: 'prop_no_regime' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_COHERENCE_VIOLATION' });

        // Scenario regime_id not found
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'regime_id', regimeId: 'unregistered_regime_999' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_NOT_FOUND' });

        // Scenario regime_id resolves a non-scenario regime
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'regime_id', regimeId: 'eci_delimitation_2008' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_COHERENCE_VIOLATION' });

        // Unknown selector type
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'invalid_type' } as any,
          })
        ).rejects.toMatchObject({ code: 'INVALID_SCENARIO_SELECTOR' });

        // Empty proposalId
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: '' },
          })
        ).rejects.toMatchObject({ code: 'INVALID_SCENARIO_SELECTOR' });

        // Proposal links to unregistered regime
        jest.spyOn(delimitationQueryService, 'getProposalById').mockResolvedValueOnce({
          proposal: {
            id: 'prop_unreg_regime',
            stateCode: 'TS',
            title: 'Unreg Regime Proposal',
            description: '',
            currentSeats: 119,
            proposedSeats: 153,
            seatChange: 34,
            reservedScSeats: 24,
            reservedStSeats: 15,
            generalSeats: 114,
            status: 'under_review',
            outputClassification: 'SCENARIO_PROJECTION',
            dataStatus: 'SCENARIO',
            legalStatus: 'SCENARIO_PROPOSED_REGIME',
            isScenario: true,
            regimeId: 'completely_unknown_regime_id',
            provenanceId: null,
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
            updatedAt: '2026-10-20T00:00:00Z',
          },
          provenance: null,
        });

        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: 'prop_unreg_regime' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_COHERENCE_VIOLATION' });

        // Proposal links to non-scenario regime (e.g. eci_delimitation_2008)
        jest.spyOn(delimitationQueryService, 'getProposalById').mockResolvedValueOnce({
          proposal: {
            id: 'prop_non_scen_regime',
            stateCode: 'TS',
            title: 'Non Scenario Regime Proposal',
            description: '',
            currentSeats: 119,
            proposedSeats: 153,
            seatChange: 34,
            reservedScSeats: 24,
            reservedStSeats: 15,
            generalSeats: 114,
            status: 'under_review',
            outputClassification: 'SCENARIO_PROJECTION',
            dataStatus: 'SCENARIO',
            legalStatus: 'SCENARIO_PROPOSED_REGIME',
            isScenario: true,
            regimeId: 'eci_delimitation_2008',
            provenanceId: null,
            metadata: {},
            createdAt: '2026-10-20T00:00:00Z',
            updatedAt: '2026-10-20T00:00:00Z',
          },
          provenance: null,
        });

        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'proposal_id', proposalId: 'prop_non_scen_regime' },
          })
        ).rejects.toMatchObject({ code: 'SCENARIO_COHERENCE_VIOLATION' });

        // Empty regimeId in scenario selector
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'scenario',
            selector: { type: 'regime_id', regimeId: '' },
          })
        ).rejects.toMatchObject({ code: 'INVALID_SCENARIO_SELECTOR' });

        // Scenario regime with proposal having provenance
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'provenance_records') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: 'prov_row_123',
                  source_authority: 'PANIN Lab',
                  methodology: 'Article 332 Proportionality',
                  citation: 'Census 2011 PCA',
                },
                error: null,
              }),
            } as any;
          }
          const data = table === 'delimitation_regimes' ? MOCK_DELIMITATION_REGIMES : [];
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data, error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }) as any);

        const scenWithProv = await delimitationQueryService.resolveRegime({
          mode: 'scenario',
          selector: { type: 'regime_id', regimeId: 'scenario_delimitation_draft_prop_1' },
        });
        expect(scenWithProv.isScenario).toBe(true);

        // Unknown selection mode
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'completely_unknown_mode' as any })
        ).rejects.toMatchObject({ code: 'INVALID_REGIME_SELECTION_MODE' });

        // as_of with non-string date
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'as_of', date: 12345 as any })
        ).rejects.toMatchObject({ code: 'INVALID_TEMPORAL_PARAMETER' });

        // explicit with non-string regimeId
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'explicit', regimeId: 12345 as any })
        ).rejects.toMatchObject({ code: 'INVALID_REGIME_IDENTIFIER' });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. DELIMITATION SERVICE DIRECT UNIT TESTS
  // ─────────────────────────────────────────────────────────────
  describe('DelimitationService Direct Unit Tests', () => {
    it('assertSafeSeats verifies computational overflow bounds', () => {
      expect(() => delimitationService.assertSafeSeats(0)).toThrow(RangeError);
      expect(() => delimitationService.assertSafeSeats(10001)).toThrow(RangeError);
      expect(() => delimitationService.assertSafeSeats(15.5)).toThrow(RangeError);
      expect(() => delimitationService.assertSafeSeats(119)).not.toThrow();
    });

    it('assertLegalAssemblyBounds asserts constitutional constraints', () => {
      // Direct resolveLegalApplicability on service
      const constraint = delimitationService.resolveLegalApplicability('STATE_LEGISLATIVE_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'TS');
      expect(constraint.minSeats).toBe(60);
      expect(constraint.maxSeats).toBe(500);

      // Below Article 170 min 60 seats for standard state
      expect(() =>
        delimitationService.assertLegalAssemblyBounds(50, 'STATE_LEGISLATIVE_ASSEMBLY', 'TS')
      ).toThrow(RangeError);

      // Above Article 170 max 500 seats for standard state
      expect(() =>
        delimitationService.assertLegalAssemblyBounds(550, 'STATE_LEGISLATIVE_ASSEMBLY', 'TS')
      ).toThrow(RangeError);

      // Within bounds
      expect(() =>
        delimitationService.assertLegalAssemblyBounds(119, 'STATE_LEGISLATIVE_ASSEMBLY', 'TS')
      ).not.toThrow();

      // Special regime Sikkim min 30 seats
      expect(() =>
        delimitationService.assertLegalAssemblyBounds(32, 'STATE_LEGISLATIVE_ASSEMBLY', 'SK')
      ).not.toThrow();
    });

    it('allocateArticle332 validates inputs and tie-breaks deterministically', () => {
      // Invalid populations
      expect(() => delimitationService.allocateArticle332(100, 0, 10, 10)).toThrow('RES-DATA-01 violation');
      expect(() => delimitationService.allocateArticle332(100, 1000, -5, 10)).toThrow('RES-DATA-01 violation');
      expect(() => delimitationService.allocateArticle332(100, 1000, 600, 500)).toThrow('RES-DATA-01 violation');

      // Tie-break scenario where remainders are identical and populations differ
      const resDiffPop = delimitationService.allocateArticle332(3, 10000, 1500, 3500);
      expect(resDiffPop.scReserved + resDiffPop.stReserved + resDiffPop.general).toBe(3);

      // Tie-break scenario where remainders and populations are identical
      const res = delimitationService.allocateArticle332(10, 1000, 150, 150);
      expect(res.scReserved + res.stReserved + res.general).toBe(10);
    });

    it('allocateHamiltonHareNiemeyer handles edge cases and tie-breaks', () => {
      // 0 districts returns empty array
      expect(delimitationService.allocateHamiltonHareNiemeyer([], 10)).toEqual([]);

      // targetSeats < districts.length throws RangeError
      const districts = [
        { districtName: 'D1', population: 100, scPopulation: 10, stPopulation: 10 },
        { districtName: 'D2', population: 200, scPopulation: 20, stPopulation: 20 },
      ];
      expect(() => delimitationService.allocateHamiltonHareNiemeyer(districts, 1)).toThrow(RangeError);

      // Apportionment with tie-break on population and district name
      const distsForTie = [
        { districtName: 'Beta', population: 150, scPopulation: 15, stPopulation: 15 },
        { districtName: 'Alpha', population: 150, scPopulation: 15, stPopulation: 15 },
      ];
      const allocTie = delimitationService.allocateHamiltonHareNiemeyer(distsForTie, 3);
      expect(allocTie.reduce((sum, d) => sum + d.projectedSeats, 0)).toBe(3);

      const allocations = delimitationService.allocateHamiltonHareNiemeyer(districts, 3);
      expect(allocations.reduce((sum, d) => sum + d.projectedSeats, 0)).toBe(3);
    });

    it('processMonitorWebhook validates required payload fields and auth', () => {
      // Missing entries
      expect(() =>
        delimitationService.processMonitorWebhook(
          { type: 'test' } as any,
          'Bearer test-monitor-secret-123'
        )
      ).toThrow('type and entries required');

      // Wrong auth
      expect(() =>
        delimitationService.processMonitorWebhook(
          { type: 'test', entries: [] },
          'Bearer wrong-secret'
        )
      ).toThrow('Unauthorized monitor webhook access');
    });

    it('getCitizenImpact validates PIN and calculates severity accurately', () => {
      // Invalid PIN
      expect(() => delimitationService.getCitizenImpact('invalid')).toThrow(
        'Invalid PIN code'
      );

      // Valid PIN
      const impact1 = delimitationService.getCitizenImpact('500001');
      expect(impact1.pinCode).toBe('500001');
      expect(impact1.location.stateCode).toBe('TS');
      expect(impact1.impactAnalysis.impactSeverity).toBeDefined();

      // Variations across PIN suffixes to hit branches (split, major_redraw, reservation change)
      for (const pin of ['500000', '500002', '500004', '500005', '500010', '500011', '500022', '560001', '600001']) {
        const imp = delimitationService.getCitizenImpact(pin);
        expect(imp.available).toBe(true);
      }
    });

    it('simulateBoundaries enforces regime conflicts, default projection, and special proposals', () => {
      // Conflict on 2008 regime with overridden seats
      expect(() =>
        delimitationService.simulateBoundaries('TS', {
          regimeId: 'eci_delimitation_2008',
          seats: '150',
        })
      ).toThrow('Cannot override statutory seat allocation on CURRENT_LEGAL_REGIME');

      // Conflict on 1976 historical regime
      expect(() =>
        delimitationService.simulateBoundaries('TS', {
          regimeId: 'eci_delimitation_1976',
        })
      ).toThrow('Cannot override historical seat allocation on HISTORICAL_LEGAL_REGIME');

      // Default projection when seats is omitted
      const defRes = delimitationService.simulateBoundaries('TS', {});
      expect(defRes.targetSeats).toBeDefined();
      expect(defRes.districtBreakdown.length).toBeGreaterThan(0);

      // Proposal 2 benchmark quota
      const p2Res = delimitationService.simulateBoundaries('TS', {
        proposalId: '02010000-0000-0000-0000-000000000002',
        seats: '119',
      });
      expect(p2Res.reservation.scReserved).toBe(18);
      expect(p2Res.reservation.stReserved).toBe(10);
      expect(p2Res.reservation.general).toBe(91);

      // Current mode benchmark quota
      const currRes = delimitationService.simulateBoundaries('TS', {
        mode: 'current',
      });
      expect(currRes.targetSeats).toBe(119);
      expect(currRes.reservation.scReserved).toBe(19);
      expect(currRes.reservation.stReserved).toBe(12);
      expect(currRes.reservation.general).toBe(88);
    });

    it('getStateReservationDetail returns null for state without baseline', () => {
      // UP has census data in CENSUS_2011_STATES but no statutory baseline
      const detail = delimitationService.getStateReservationDetail('UP');
      expect(detail).toBeNull();
    });
  });
});
