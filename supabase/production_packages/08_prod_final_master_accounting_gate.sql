-- ==============================================================================
-- KSHETRA / PANIN: MASTER PRODUCTION ACCOUNTING & SYNCHRONIZATION AUDIT GATE
-- Target: Production Supabase (ehfafcnimmjusyvplbah / panIN-production)
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Scope: Full Inventory Verification across Geography, Organizations,
--        Persons, Candidacies, Civic Extensions, SaaS & Delimitation Watch.
-- ==============================================================================

WITH master_counts AS (
  SELECT
    -- 1. Electoral Geography Baseline (B1)
    (SELECT count(*) FROM public.states) AS states_count,
    (SELECT count(*) FROM public.parliamentary_constituencies) AS pcs_count,
    (SELECT count(*) FROM public.constituencies) AS acs_count,
    (SELECT count(*) FROM public.constituency_parliamentary_mappings WHERE is_current = true) AS ac_pc_mappings_count,

    -- 2. Political Organizations Registry (B2.2-C)
    (SELECT count(*) FROM public.political_organizations) AS orgs_count,
    (SELECT count(*) FROM public.organization_aliases) AS aliases_count,
    (SELECT count(*) FROM public.organization_multilingual_names) AS multilingual_orgs_count,
    (SELECT count(*) FROM public.organization_symbols) AS symbols_count,
    (SELECT count(*) FROM public.organization_relationships) AS org_relationships_count,
    (SELECT count(*) FROM public.political_organizations WHERE id ILIKE '%indep%' OR name ILIKE '%indep%') AS synth_orgs_count,

    -- 3. Persons & Candidacies (B2.2-D)
    (SELECT count(*) FROM public.canonical_persons) AS persons_count,
    (SELECT count(*) FROM public.candidacies) AS candidacies_count,

    -- 4. Civic Extensions (B2.2-E)
    (SELECT count(*) FROM public.candidate_affidavits) AS affidavits_count,
    (SELECT count(*) FROM public.constituency_demographics) AS demographics_count,
    (SELECT count(*) FROM public.constituency_lineage) AS lineage_count,

    -- 5. Provenance Anchors
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS anchor_c,
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS anchor_d,
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS anchor_e,

    -- 6. SaaS & Delimitation Tables
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
      'saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger',
      'saas_webhook_subscriptions', 'saas_webhook_events', 'saas_webhook_deliveries',
      'candidate_affidavit_disclosures',
      'delimitation_orders', 'delimitation_notices', 'delimitation_hearings',
      'delimitation_boundary_drafts', 'delimitation_comments', 'delimitation_impact_summaries',
      'delimitation_notifications', 'delimitation_sync_history', 'delimitation_audit_log'
    )) AS saas_and_delim_tables
)
SELECT
  json_build_object(
    'audit_title', 'PANIN_PRODUCTION_MASTER_ACCOUNTING_VERIFICATION',
    'target_database', 'ehfafcnimmjusyvplbah',
    'status', CASE
      WHEN states_count = 36
       AND pcs_count = 543
       AND acs_count = 4123
       AND ac_pc_mappings_count = 4123
       AND orgs_count = 107
       AND aliases_count = 1043
       AND multilingual_orgs_count = 27
       AND symbols_count = 19
       AND org_relationships_count = 10
       AND persons_count = 9083
       AND candidacies_count = 11298
       AND affidavits_count = 4523
       AND demographics_count = 4123
       AND lineage_count = 126
       AND synth_orgs_count = 0
       AND anchor_c = 1 AND anchor_d = 1 AND anchor_e = 1
       AND saas_and_delim_tables = 17
      THEN 'PROD_MASTER_SYNC_CERTIFIED_PASS'
      ELSE 'PROD_MASTER_SYNC_FAIL'
    END,
    'metrics', json_build_object(
      'geography', json_build_object(
        'states', states_count,
        'parliamentary_constituencies', pcs_count,
        'assembly_constituencies', acs_count,
        'mappings', ac_pc_mappings_count
      ),
      'organizations', json_build_object(
        'recognized_parties', orgs_count,
        'aliases', aliases_count,
        'multilingual_names', multilingual_orgs_count,
        'symbols', symbols_count,
        'relationships', org_relationships_count,
        'synthetic_independents', synth_orgs_count
      ),
      'canonical_data', json_build_object(
        'canonical_persons', persons_count,
        'candidacies', candidacies_count,
        'candidate_affidavits', affidavits_count,
        'constituency_demographics', demographics_count,
        'lineage_transitions', lineage_count
      ),
      'governance', json_build_object(
        'provenance_anchors', anchor_c + anchor_d + anchor_e,
        'saas_and_delim_tables', saas_and_delim_tables
      )
    ),
    'audit_timestamp', now()
  ) AS master_audit_manifest
FROM master_counts;
