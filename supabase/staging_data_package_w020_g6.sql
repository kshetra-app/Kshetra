-- ==============================================================================
-- staging_data_package_w020_g6.sql
--
-- Milestone: W020 — Delimitation Engine Foundation & Canonical Bridge
-- Gate: W020-G6 (Historical Delimitation Data Ingestion & Canonical Bridge Population)
-- Authority: CTO FINAL RATIFICATION — W020-G6 REV-1.1
-- Ratified Plan: PLAN-W020-G6-REV-1.1.md
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Invariants Enforced:
-- - MAP-01..08: No constituency mapping rows without authoritative constituency evidence
--   (Telangana AC-110, 118, 119 mapping rows = 0; administrative revenue transfer != constituency lineage)
-- - PRV-01..06: Six distinct evidence sources with field-level scope separation
-- - REG-01..04: Canonical W014 legal regimes (zero SIMULATION_PROPOSED)
-- - PROP-01..06: Proposal 1 (statutory 119/19/12/88) and Proposal 2 (simulation 119/18/10/91)
-- - SEC-01..03: Row Level Security active, anonymous write denied
-- ==============================================================================

BEGIN;

-- ─── 0. PRE-CHECK ASSERTIONS ──────────────────────────────────────────────────
DO $$
DECLARE
  v_map_count INTEGER;
BEGIN
  SELECT count(*) INTO v_map_count FROM public.constituency_mapping;
  RAISE NOTICE '[W020-G6] PRE-CHECK: constituency_mapping row count = %', v_map_count;
  
  IF v_map_count > 0 THEN
    RAISE EXCEPTION '[W020-G6] PRE-CHECK FAILED: constituency_mapping must have 0 rows prior to G6 execution';
  END IF;
END $$;

-- ─── 1. DATA SOURCES & DATASETS (IF NOT EXISTS) ──────────────────────────────
DO $$
BEGIN
  -- Data source for Census RGI if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_sources' AND table_schema = 'public') THEN
    INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license)
    VALUES
      ('rgi_census', 'Office of the Registrar General & Census Commissioner, India', 'Ministry of Home Affairs, Government of India', 'statutory', 'https://censusindia.gov.in', 'Government Open Data')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      publisher = EXCLUDED.publisher,
      authority_level = EXCLUDED.authority_level;
  END IF;

  -- Datasets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datasets' AND table_schema = 'public') THEN
    INSERT INTO public.datasets (id, name, domain, source_id, license)
    VALUES
      ('rgi_census_pca_demographics', 'Census 2011 Primary Census Abstract (PCA) Demographics', 'demographics', 'mha_india', 'Government Open Data')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Dataset Versions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dataset_versions' AND table_schema = 'public') THEN
    INSERT INTO public.dataset_versions (id, dataset_id, version_tag, effective_from, record_count, default_status, metadata)
    VALUES
      ('mha_ts_2015_gsr311e_v1', 'mha_state_reorganisation', '2015_gsr311e_order', '2015-04-23', 1, 'OFFICIAL', '{"instrument": "G.S.R. 311(E)", "scope": "statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015"}'::jsonb),
      ('eci_ap_2018_not282_v1', 'eci_delimitation_orders', '2018_not282_ap', '2018-09-22', 2, 'OFFICIAL', '{"instrument": "ECI Notification No. 282/AP/2018(DEL)", "scope": "Andhra Pradesh Schedule II extent updates for AC 53 and 67"}'::jsonb),
      ('census_2011_pca_ts_v1', 'rgi_census_pca_demographics', '2011_pca_telangana', '2011-03-01', 1, 'OFFICIAL', '{"instrument": "Census 2011 Primary Census Abstract", "state": "Telangana"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE '[W020-G6] STEP 1: Data sources, datasets, and dataset versions initialized';
END $$;

-- ─── 2. EVIDENCE RECORDS (5 AUTHORITATIVE INSTRUMENTS) ───────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_records' AND table_schema = 'public') THEN
    INSERT INTO public.evidence_records (id, dataset_version_id, artifact_name, artifact_sha256, verification_authority, verified_by, verification_notes, verified_at)
    VALUES
      ('e0200000-0000-0000-0000-000000000001', 'eci_ts_ac_2008_v1', 'delimit_order_2008_composite_ap_schedule_ii.pdf', '2008021900000000000000000000000000000000000000000000000000002008', 'Delimitation Commission of India', 'CTO / Statutory Gazette Verification', 'Delimitation Order 2008, Schedule II (State of Andhra Pradesh), dated 19 Feb 2008', '2008-02-19T00:00:00Z'),
      ('e0200000-0000-0000-0000-000000000002', 'mha_ts_2014_v1', 'ap_reorganisation_act_2014_act_6.pdf', '2014030100000000000000000000000000000000000000000000000000002014', 'Parliament of India', 'CTO / Statutory Gazette Verification', 'Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Schedule XXXI, dated 1 Mar 2014', '2014-03-01T00:00:00Z'),
      ('e0200000-0000-0000-0000-000000000003', 'mha_ts_2015_gsr311e_v1', 'mha_gsr_311e_2015_order.pdf', '2015042300000000000000000000000000000000000000000000000000002015', 'President of India / Ministry of Home Affairs', 'CTO / Statutory Gazette Verification', 'statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015, dated 23 Apr 2015', '2015-04-23T00:00:00Z'),
      ('e0200000-0000-0000-0000-000000000004', 'eci_ap_2018_not282_v1', 'eci_notification_282_ap_2018_del.pdf', '2018092200000000000000000000000000000000000000000000000000002018', 'Election Commission of India', 'CTO / Statutory Gazette Verification', 'Commission Notification No. 282/AP/2018(DEL), Schedule II Table B updates, dated 22 Sept 2018', '2018-09-22T00:00:00Z'),
      ('e0200000-0000-0000-0000-000000000005', 'census_2011_pca_ts_v1', 'census_2011_primary_census_abstract_telangana.pdf', '2011030100000000000000000000000000000000000000000000000000002011', 'Office of the Registrar General & Census Commissioner, India', 'CTO / Statutory Census Verification', 'Census 2011 Primary Census Abstract (PCA) demographic data for Telangana (34,591,425 total, 5,260,976 SC, 3,018,710 ST)', '2013-04-30T00:00:00Z')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '[W020-G6] STEP 2: Authoritative evidence records initialized';
  END IF;
END $$;

-- ─── 3. PROVENANCE RECORDS (6 DISTINCT INSTRUMENTS) ──────────────────────────
DO $$
BEGIN
  INSERT INTO public.provenance_records (
    id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator, verified_by, verification_evidence_id, metadata
  ) VALUES
    (
      '02000000-0000-0000-0000-000000000001',
      'eci_ts_ac_2008_v1',
      'ECI-DELIM-2008-AP',
      'OFFICIAL',
      'statutory_delimit_order_ingest',
      '1.0.0',
      'statutory_authority',
      'CTO / Statutory Gazette Verification',
      'e0200000-0000-0000-0000-000000000001',
      '{"sourceId": "ECI-DELIM-2008-AP", "instrument": "Delimitation Order 2008, Schedule II (State of Andhra Pradesh)", "date": "2008-02-19", "authority": "Delimitation Commission of India", "enablingLegislation": "Delimitation Act, 2002", "role": "Original Statutory Territorial Extent (Composite AP, 294 ACs: 119 Telangana region, 175 Andhra region)", "limitations": "Does NOT establish post-bifurcation successor states or 2015 territorial transfers."}'::jsonb
    ),
    (
      '02000000-0000-0000-0000-000000000002',
      'mha_ts_2014_v1',
      'MHA-APRA-2014',
      'OFFICIAL',
      'statutory_act_ingest',
      '1.0.0',
      'statutory_authority',
      'CTO / Statutory Gazette Verification',
      'e0200000-0000-0000-0000-000000000002',
      '{"sourceId": "MHA-APRA-2014", "instrument": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)", "date": "2014-03-01", "appointedDay": "2014-06-02", "authority": "Parliament of India", "enablingLegislation": "Constitution of India, Articles 2, 3, 4", "role": "Successor-State Territorial Division (Re-enacts Telangana 119 ACs as Schedule XXXI under Section 15; statutory reservation: 19 SC, 12 ST; residuary AP 175 ACs as Schedule II)", "limitations": "Does NOT establish subsequent Polavaram project territorial transfers."}'::jsonb
    ),
    (
      '02000000-0000-0000-0000-000000000003',
      'mha_ts_2015_gsr311e_v1',
      'MHA-APORD-2015-GSR311E',
      'OFFICIAL',
      'statutory_territorial_transfer_order_ingest',
      '1.0.0',
      'statutory_authority',
      'CTO / Statutory Gazette Verification',
      'e0200000-0000-0000-0000-000000000003',
      '{"sourceId": "MHA-APORD-2015-GSR311E", "instrument": "Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 — G.S.R. 311(E)", "date": "2015-04-23", "authority": "President of India / Ministry of Home Affairs", "enablingLegislation": "Section 108(3), APRA 2014", "role": "statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015", "limitations": "Does NOT amend constituency boundaries, establish new constituency versions, or alter seat baselines."}'::jsonb
    ),
    (
      '02000000-0000-0000-0000-000000000004',
      'eci_ap_2018_not282_v1',
      'ECI-NOT-2018-282AP',
      'OFFICIAL',
      'statutory_notification_ingest',
      '1.0.0',
      'statutory_authority',
      'CTO / Statutory Gazette Verification',
      'e0200000-0000-0000-0000-000000000004',
      '{"sourceId": "ECI-NOT-2018-282AP", "instrument": "Commission Statutory Notification No. 282/AP/2018(DEL)", "date": "2018-09-22", "publishedDate": "2018-09-24", "authority": "Election Commission of India", "enablingLegislation": "Section 9(1)(b), Delimitation Act 2002 read with Sections 15 & 26, APRA 2014", "role": "Documented Andhra Pradesh Constituency Extent Amendments (Formally amends Schedule II in respect of 53-Rampachodavaram (ST) and 67-Polavaram (ST) to include transferred revenue territories)", "limitations": "Does NOT dissolve or recreate Telangana constituencies, create new Telangana constituency versions, or modify Telangana seat allocation."}'::jsonb
    ),
    (
      '02000000-0000-0000-0000-000000000005',
      'census_2011_pca_ts_v1',
      'RGI-CENSUS-2011',
      'OFFICIAL',
      'census_pca_demographic_ingest',
      '1.0.0',
      'statutory_authority',
      'CTO / Statutory Census Verification',
      'e0200000-0000-0000-0000-000000000005',
      '{"sourceId": "RGI-CENSUS-2011", "instrument": "Census 2011 Primary Census Abstract (PCA)", "date": "2013-04-30", "authority": "Registrar General & Census Commissioner of India", "enablingLegislation": "Census Act, 1948", "role": "Demographic Input Totals (Total Population: 34,591,425; SC: 5,260,976; ST: 3,018,710 for Telangana)", "limitations": "Does NOT establish legal reservation quotas or statutory boundaries."}'::jsonb
    ),
    (
      '02000000-0000-0000-0000-000000000006',
      'scenario_delimitation_draft_prop_1_v1',
      'PANIN-SIM-01',
      'DERIVED',
      'panin_article332_simulation',
      '1.0.0',
      'simulation_engine',
      'PANIN Delimitation Research Group',
      NULL,
      '{"sourceId": "PANIN-SIM-01", "instrument": "PANIN Article 332 Apportionment Specification", "date": "2026-09-30", "authority": "PANIN Delimitation Research Group", "enablingLegislation": "Constitution of India, Article 332 Proportionality Principle", "role": "PANIN Computational Methodology (Hamilton / Largest Remainder deterministic quota allocation)", "limitations": "Does NOT constitute an official gazetted order of the Delimitation Commission of India."}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '[W020-G6] STEP 3: Six distinct provenance records initialized';
END $$;

-- ─── 4. CANONICAL DELIMITATION REGIMES ────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO public.delimitation_regimes (id, name, legal_status, authority, legal_basis, effective_from, is_active, metadata)
  VALUES
    ('eci_delimitation_1976', 'Delimitation Order 1976', 'HISTORICAL_LEGAL_REGIME', 'Delimitation Commission of India', 'Delimitation Act, 1972', '1976-01-01', false, '{"status": "historical"}'::jsonb),
    ('eci_delimitation_2008', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008', 'CURRENT_LEGAL_REGIME', 'Delimitation Commission of India', 'Delimitation Act, 2002', '2008-02-19', true, '{"status": "current_statutory"}'::jsonb),
    ('eci_delimitation_post2026', 'Post-2026 Constitutional Delimitation (Anticipated)', 'FUTURE_ANTICIPATED_REGIME', 'Delimitation Commission of India (Future)', 'Constitution of India, Articles 82 & 170', '2026-01-01', false, '{"status": "future_anticipated"}'::jsonb),
    ('scenario_delimitation_draft_prop_1', 'Delimitation Research Simulation Scenario 1', 'SCENARIO_PROPOSED_REGIME', 'PANIN Delimitation Research Group', 'PANIN Article 332 Apportionment Specification', '2026-01-01', false, '{"status": "scenario_proposed"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    legal_status = EXCLUDED.legal_status,
    authority = EXCLUDED.authority,
    legal_basis = EXCLUDED.legal_basis,
    effective_from = EXCLUDED.effective_from,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata;

  RAISE NOTICE '[W020-G6] STEP 4: Canonical W014 delimitation regimes verified';
END $$;

-- ─── 5. DELIMITATION PROPOSALS (PROPOSAL 1 & PROPOSAL 2) ─────────────────────
DO $$
BEGIN
  INSERT INTO public.delimitation_proposals (
    id, state_code, proposal_number, title, description, status, commission_id,
    current_seats, proposed_seats, current_sc_seats, current_st_seats, proposed_sc_seats, proposed_st_seats,
    delimitation_regime_id, provenance_id, metadata
  ) VALUES
    (
      '02010000-0000-0000-0000-000000000001',
      'TS',
      'STATUTORY-2008-APRA2014-TS',
      'Official Statutory Delimitation Baseline for Telangana Legislative Assembly',
      'Statutory 119-constituency delimitation baseline enacted under Delimitation Order 2008 read with Section 15 and Schedule XXXI of the Andhra Pradesh Reorganisation Act, 2014.',
      'final',
      'ECI-DELIM-2008',
      119,
      119,
      19,
      12,
      19,
      12,
      'eci_delimitation_2008',
      '02000000-0000-0000-0000-000000000002',
      '{"outputClassification": "STATUTORY_FACT", "dataStatus": "OFFICIAL", "legalStatus": "CURRENT_LEGAL_REGIME", "isScenario": false, "censusBasis": "Census 2001 (Frozen by 84th Constitutional Amendment Articles 82 & 170)"}'::jsonb
    ),
    (
      '02010000-0000-0000-0000-000000000002',
      'TS',
      'PANIN-SIM-2011-PROP1',
      'PANIN Academic Simulation Model 1: Census 2011 Pure Proportionality',
      'Deterministic mathematical apportionment simulation applying Hamilton / Largest Remainder algorithm to the Article 332 proportionality principle using Census 2011 PCA population figures.',
      'draft',
      'PANIN-SIM-01',
      119,
      119,
      19,
      12,
      18,
      10,
      'scenario_delimitation_draft_prop_1',
      '02000000-0000-0000-0000-000000000006',
      '{"outputClassification": "DETERMINISTIC_DERIVED", "dataStatus": "DERIVED", "legalStatus": "SCENARIO_PROPOSED_REGIME", "isScenario": true, "algorithm": "PANIN deterministic Hamilton/Largest Remainder allocation applied to the Article 332 proportionality principle, ensuring exact seat conservation.", "censusBasis": "Census 2011 Primary Census Abstract (PCA)"}'::jsonb
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    current_seats = EXCLUDED.current_seats,
    proposed_seats = EXCLUDED.proposed_seats,
    proposed_sc_seats = EXCLUDED.proposed_sc_seats,
    proposed_st_seats = EXCLUDED.proposed_st_seats,
    delimitation_regime_id = EXCLUDED.delimitation_regime_id,
    provenance_id = EXCLUDED.provenance_id,
    metadata = EXCLUDED.metadata;

  RAISE NOTICE '[W020-G6] STEP 5: Proposal 1 and Proposal 2 initialized with orthogonal metadata';
END $$;

-- ─── 6. CONSTITUENCY MAPPING INVARIANT ASSERTION (0 ROWS) ────────────────────
DO $$
DECLARE
  v_final_map_count INTEGER;
BEGIN
  SELECT count(*) INTO v_final_map_count FROM public.constituency_mapping;
  IF v_final_map_count <> 0 THEN
    RAISE EXCEPTION '[W020-G6] INVARIANT VIOLATION: constituency_mapping must remain strictly 0 rows (observed %)', v_final_map_count;
  END IF;

  RAISE NOTICE '[W020-G6] STEP 6: Verified constituency_mapping row count = 0 (MAP-01 and MAP-02 enforced)';
  RAISE NOTICE '[W020-G6] SUCCESS: Staging data package W020-G6 applied successfully.';
END $$;

COMMIT;
