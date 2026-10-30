import {
  DelimitationQueryService,
  DelimitationQueryError,
  delimitationQueryService,
  resolveLegalApplicability,
} from '../services/delimitationQueryService';
import { supabase } from '../lib/supabase';

describe('Delimitation Query Service & Legal Applicability (W020-G8/G9) Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      return builder;
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('DelimitationQueryError', () => {
    it('initializes with code, statusCode, and message', () => {
      const err = new DelimitationQueryError('TEST_CODE', 418, 'I am a teapot');
      expect(err.code).toBe('TEST_CODE');
      expect(err.statusCode).toBe(418);
      expect(err.message).toBe('I am a teapot');
      expect(err.name).toBe('DelimitationQueryError');
    });
  });

  describe('resolveLegalApplicability', () => {
    describe('Scenario Proposed Regime (SCENARIO_PROPOSED_REGIME)', () => {
      it('returns non-statutory exploratory scenario projection', () => {
        const res = resolveLegalApplicability(
          'STATE_LEGISLATIVE_ASSEMBLY',
          'SCENARIO_PROPOSED_REGIME',
          'TS',
        );
        expect(res.isStatutoryFact).toBe(false);
        expect(res.isScenario).toBe(true);
        expect(res.poligramComputationalSafetyCeiling).toBe(10000);
        expect(res.regimeType).toBe('SCENARIO_PROPOSED_REGIME');
        expect(res.provenance.sourceAuthority).toContain('POLIGRAM Delimitation Simulation Engine');
      });

      it('accepts query object format with custom evidence reference', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'SCENARIO_PROPOSED_REGIME',
          jurisdictionCode: 'KA',
          evidenceReference: 'CUSTOM-SIM-REF-001',
        });
        expect(res.provenance.evidenceReference).toBe('CUSTOM-SIM-REF-001');
        expect(res.jurisdictionCode).toBe('KA');
      });
    });

    describe('Future Anticipated Regime (FUTURE_ANTICIPATED_REGIME)', () => {
      it('returns prospective non-enacted post-2026 tracking constraint', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'FUTURE_ANTICIPATED_REGIME',
          jurisdictionCode: 'TS',
        });
        expect(res.isStatutoryFact).toBe(false);
        expect(res.isScenario).toBe(false);
        expect(res.constitutionalProvision).toContain('84th Amendment');
        expect(res.temporalValidity.validFrom).toBe('2026-01-01');
      });
    });

    describe('Invalid entity types fail-closed', () => {
      it('throws INVALID_ENTITY_TYPE for unsupported political entity', () => {
        const invalidEntity1: any = 'VILLAGE_PANCHAYAT';
        const invalidEntity2: any = 'MUNICIPAL_CORPORATION';
        expect(() => {
          resolveLegalApplicability(invalidEntity1, 'CURRENT_LEGAL_REGIME');
        }).toThrow(DelimitationQueryError);

        try {
          resolveLegalApplicability(invalidEntity2, 'CURRENT_LEGAL_REGIME');
        } catch (err: any) {
          expect(err.code).toBe('INVALID_ENTITY_TYPE');
          expect(err.statusCode).toBe(400);
        }
      });
    });

    describe('Current Legal Regime (CURRENT_LEGAL_REGIME) Statutory Invariants', () => {
      it('evaluates standard State Legislative Assembly rule (Article 170: 60-500)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
        });
        expect(res.isStatutoryFact).toBe(true);
        expect(res.isScenario).toBe(false);
        expect(res.constitutionalFloor).toBe(60);
        expect(res.constitutionalCeiling).toBe(500);
        expect(res.constitutionalProvision).toContain('Article 170(1)');
      });

      it('evaluates Sikkim Article 371F assembly exception (floor 30, factual 32)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'SK',
        });
        expect(res.constitutionalFloor).toBe(30);
        expect(res.currentFactualSeats).toBe(32);
        expect(res.notwithstandingClause).toBe(true);
        expect(res.constitutionalProvision).toContain('Article 371F(f)');
      });

      it('evaluates Mizoram Article 371G assembly exception (floor 40, factual 40)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'MZ',
        });
        expect(res.constitutionalFloor).toBe(40);
        expect(res.currentFactualSeats).toBe(40);
        expect(res.notwithstandingClause).toBe(true);
        expect(res.constitutionalProvision).toContain('Article 371G');
      });

      it('evaluates Goa Article 371I assembly exception (floor 30, statutory exact 40, factual 40)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'GA',
        });
        expect(res.constitutionalFloor).toBe(30);
        expect(res.statutoryExactSeats).toBe(40);
        expect(res.currentFactualSeats).toBe(40);
        expect(res.constitutionalProvision).toContain('Article 371-I');
      });

      it('evaluates Puducherry UT assembly statutory rule (30 seats)', () => {
        const res = resolveLegalApplicability({
          entityType: 'UNION_TERRITORY_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'PY',
        });
        expect(res.statutoryExactSeats).toBe(30);
        expect(res.statutoryProvision).toContain('Government of Union Territories Act, 1963');
      });

      it('evaluates Telangana statutory baseline (119 seats under AP Reorganisation Act 2014)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'TS',
        });
        expect(res.statutoryExactSeats).toBe(119);
        expect(res.statutoryProvision).toContain('Section 17');
        expect(res.provenance.evidenceReference).toBe('MHA-ACT-2014-6-TS');
      });

      it('evaluates Andhra Pradesh statutory baseline (175 seats under AP Reorganisation Act 2014)', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'AP',
        });
        expect(res.statutoryExactSeats).toBe(175);
        expect(res.provenance.evidenceReference).toBe('MHA-ACT-2014-6-AP');
      });

      it('evaluates Lok Sabha (HOUSE_OF_THE_PEOPLE) composition rule (Article 81, max 550)', () => {
        const res = resolveLegalApplicability({
          entityType: 'HOUSE_OF_THE_PEOPLE',
          regimeType: 'CURRENT_LEGAL_REGIME',
        });
        expect(res.constitutionalCeiling).toBe(550);
        expect(res.constitutionalProvision).toBe('Article 81');
      });

      it('fails closed with LEGAL_RULE_NOT_FOUND for uncataloged parliamentary houses', () => {
        expect(() => {
          resolveLegalApplicability({
            entityType: 'COUNCIL_OF_STATES',
            regimeType: 'CURRENT_LEGAL_REGIME',
          });
        }).toThrow(DelimitationQueryError);

        expect(() => {
          resolveLegalApplicability({
            entityType: 'LEGISLATIVE_COUNCIL',
            regimeType: 'CURRENT_LEGAL_REGIME',
          });
        }).toThrow(DelimitationQueryError);
      });
    });

    describe('Temporal Validity Verification [valid_from, valid_to)', () => {
      it('throws TEMPORAL_VALIDITY_MISMATCH if query date is prior to validFrom', () => {
        expect(() => {
          resolveLegalApplicability({
            entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
            regimeType: 'CURRENT_LEGAL_REGIME',
            jurisdictionCode: 'TS',
            asOfDate: '2010-01-01', // AP Reorganisation Act became effective in 2014
          });
        }).toThrow(DelimitationQueryError);
      });

      it('throws TEMPORAL_VALIDITY_MISMATCH for invalid date string', () => {
        expect(() => {
          resolveLegalApplicability({
            entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
            regimeType: 'CURRENT_LEGAL_REGIME',
            asOfDate: 'NOT_A_VALID_DATE',
          });
        }).toThrow(DelimitationQueryError);
      });

      it('succeeds when query date is inside the temporal validity range', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'TS',
          asOfDate: '2024-01-01',
        });
        expect(res.isStatutoryFact).toBe(true);
      });
    });

    describe('Evidence Provenance Reference Check', () => {
      it('passes when evidenceReference exactly matches governing rule', () => {
        const res = resolveLegalApplicability({
          entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
          regimeType: 'CURRENT_LEGAL_REGIME',
          jurisdictionCode: 'TS',
          evidenceReference: 'MHA-ACT-2014-6-TS',
        });
        expect(res.provenance.evidenceReference).toBe('MHA-ACT-2014-6-TS');
      });

      it('throws EVIDENCE_PROVENANCE_MISMATCH when reference does not match', () => {
        expect(() => {
          resolveLegalApplicability({
            entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
            regimeType: 'CURRENT_LEGAL_REGIME',
            jurisdictionCode: 'TS',
            evidenceReference: 'FABRICATED-REFERENCE-999',
          });
        }).toThrow(DelimitationQueryError);
      });
    });

    describe('Uncataloged rules fail-closed', () => {
      it('throws LEGAL_RULE_NOT_FOUND when no matching rule exists', () => {
        expect(() => {
          resolveLegalApplicability({
            entityType: 'UNION_TERRITORY_ASSEMBLY',
            regimeType: 'CURRENT_LEGAL_REGIME',
            jurisdictionCode: 'LAKSHADWEEP', // No UT assembly in Lakshadweep
          });
        }).toThrow(DelimitationQueryError);
      });
    });
  });

  describe('DelimitationQueryService repository methods', () => {
    it('getConstituencyLineage returns AC-119 special lineage claim with UNKNOWN status', async () => {
      const claim = await delimitationQueryService.getConstituencyLineage('119');
      expect(claim).not.toBeNull();
      expect(claim?.lineageStatus).toBe('UNKNOWN');
      expect(claim?.evidenceNote).toContain('AC-119 Bhadrachalam');
      expect(claim?.statutoryTransferCitation).toContain('G.S.R. 311(E)');
    });

    it('getSittingMlas returns 119 MLAs for TS and null for unsupported state', async () => {
      const tsMlas = await delimitationQueryService.getSittingMlas('TS');
      expect(tsMlas).not.toBeNull();
      expect(tsMlas?.length).toBe(119);
      expect(tsMlas?.[0].currentAcNo).toBe(1);

      const invalidMlas = await delimitationQueryService.getSittingMlas('ZZ');
      expect(invalidMlas).toBeNull();
    });

    it('getPartyResults returns party seat counts for TS and null for unsupported state', async () => {
      const tsResults = await delimitationQueryService.getPartyResults('TS');
      expect(tsResults).not.toBeNull();
      expect(tsResults?.length).toBeGreaterThan(0);
      const inc = tsResults?.find((p) => p.party === 'INC');
      expect(inc).toBeDefined();

      const invalidResults = await delimitationQueryService.getPartyResults('ZZ');
      expect(invalidResults).toBeNull();
    });

    it('getProposals falls back gracefully to CANONICAL_PROPOSALS', async () => {
      const proposals = await delimitationQueryService.getProposals();
      expect(proposals.length).toBeGreaterThanOrEqual(2);
      expect(proposals[0].stateCode).toBe('TS');
      expect(proposals[0].outputClassification).toBe('STATUTORY_FACT');
      expect(proposals[1].outputClassification).toBe('DETERMINISTIC_DERIVED');

      // Filter by stateCode
      const tsOnly = await delimitationQueryService.getProposals({ stateCode: 'TS' });
      expect(tsOnly.length).toBeGreaterThanOrEqual(2);

      // Filter by non-existent state
      const empty = await delimitationQueryService.getProposals({ stateCode: 'ZZ' });
      expect(empty).toEqual([]);
    });

    describe('resolveRegime modes and validation', () => {
      const mockRegimes = [
        {
          id: 'regime-current-001',
          name: 'Current Legal Regime 2008/2014',
          regimeType: 'CURRENT_LEGAL_REGIME' as const,
          description: 'Current statutory regime',
          effectiveFrom: '2008-02-19T00:00:00Z',
          effectiveTo: null,
          authority: 'Delimitation Commission of India',
          isActive: true,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'regime-historical-001',
          name: 'Historical Legal Regime 1976',
          regimeType: 'HISTORICAL_LEGAL_REGIME' as const,
          description: '1976 delimitation',
          effectiveFrom: '1976-01-01T00:00:00Z',
          effectiveTo: '2008-02-18T23:59:59Z',
          authority: 'Delimitation Commission of India',
          isActive: false,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'regime-future-001',
          name: 'Post-2026 Delimitation',
          regimeType: 'FUTURE_ANTICIPATED_REGIME' as const,
          description: 'Anticipated post-freeze delimitation',
          effectiveFrom: '2028-01-01T00:00:00Z',
          effectiveTo: null,
          authority: 'Future Commission',
          isActive: false,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'regime-scenario-001',
          name: 'Exploratory Scenario A',
          regimeType: 'SCENARIO_PROPOSED_REGIME' as const,
          description: 'Computational scenario',
          effectiveFrom: '2025-01-01T00:00:00Z',
          effectiveTo: null,
          authority: 'POLIGRAM Delimitation Engine',
          isActive: false,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      beforeEach(() => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValue(mockRegimes);
      });

      it('resolves current regime successfully', async () => {
        const res = await delimitationQueryService.resolveRegime({ mode: 'current' });
        expect(res.regime.id).toBe('regime-current-001');
        expect(res.isScenario).toBe(false);
      });

      it('throws when active regime is not CURRENT_LEGAL_REGIME', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValue([
          {
            ...mockRegimes[3],
            isActive: true,
          },
        ]);

        await expect(delimitationQueryService.resolveRegime({ mode: 'current' })).rejects.toThrow(
          DelimitationQueryError,
        );
      });

      it('resolves as_of regime for date in force', async () => {
        const res = await delimitationQueryService.resolveRegime({
          mode: 'as_of',
          date: '1995-05-15',
        });
        expect(res.regime.id).toBe('regime-historical-001');
        expect(res.isScenario).toBe(false);
      });

      it('throws 400 for invalid date format in as_of mode', async () => {
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'as_of', date: 'INVALID_DATE' }),
        ).rejects.toThrow(DelimitationQueryError);
      });

      it('throws 404 when no regime was in force on as_of date', async () => {
        await expect(
          delimitationQueryService.resolveRegime({ mode: 'as_of', date: '1950-01-01' }),
        ).rejects.toThrow(DelimitationQueryError);
      });

      it('resolves explicit regime by valid id', async () => {
        const res = await delimitationQueryService.resolveRegime({
          mode: 'explicit',
          regimeId: 'regime-historical-001',
        });
        expect(res.regime.id).toBe('regime-historical-001');
      });

      it('throws for forbidden explicit regime ID', async () => {
        await expect(
          delimitationQueryService.resolveRegime({
            mode: 'explicit',
            regimeId: 'SIMULATION_PROPOSED',
          }),
        ).rejects.toThrow(DelimitationQueryError);
      });

      it('resolves future_anticipated regime', async () => {
        const res = await delimitationQueryService.resolveRegime({ mode: 'future_anticipated' });
        expect(res.regime.regimeType).toBe('FUTURE_ANTICIPATED_REGIME');
        expect(res.proposals).toEqual([]);
      });

      it('resolves scenario regime by regime_id selector', async () => {
        const res = await delimitationQueryService.resolveRegime({
          mode: 'scenario',
          selector: { type: 'regime_id', regimeId: 'regime-scenario-001' },
        });
        expect(res.isScenario).toBe(true);
        expect(res.regime.id).toBe('regime-scenario-001');
      });
    });

    describe('Timeline events and delimitation status', () => {
      it('getTimelineEvents returns statutory timeline events', async () => {
        const events = await delimitationQueryService.getTimelineEvents();
        expect(events.length).toBeGreaterThan(5);
        expect(events[0].id).toBe('LEG-2002-01');
        expect(events[1].verified).toBe(true);
      });

      it('getDelimitationStatus returns national status DTO and provenance', async () => {
        jest.spyOn(delimitationQueryService, 'getRegimes').mockResolvedValue([
          {
            id: 'regime-future-001',
            name: 'Post-Census 2027 Operation',
            regimeType: 'FUTURE_ANTICIPATED_REGIME' as const,
            description: 'Post freeze',
            effectiveFrom: '2028-01-01',
            effectiveTo: null,
            authority: 'ECI',
            isActive: false,
            metadata: {},
            createdAt: '2024-01-01',
          },
        ]);

        const status = await delimitationQueryService.getDelimitationStatus();
        expect(status.nationalStatus).toBe('pre_census');
        expect(status.censusTracking.finalPopulationAvailable).toBe(false);
        expect(status.provenance.methodology).toBe('CONSTITUTIONAL_STATUS_AUDIT');
      });
    });
  });
});
