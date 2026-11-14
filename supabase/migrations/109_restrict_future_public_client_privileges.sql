-- Close the client-access gap left by migration 023. That migration grants
-- broad default Data API privileges, while these later operational/ledger
-- tables have no client-facing access path in the application. Keep their
-- server-side service_role access and require explicit grants plus reviewed
-- RLS policies for any future client-facing feature.

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'ad_pricing_configurations',
    'ad_telemetry_events',
    'ai_cost_ledger',
    'ai_news_summary_cache',
    'ai_tenant_budgets',
    'commercial_ad_accounts',
    'commercial_ads',
    'db_performance_audit_ledger',
    'disaster_recovery_drill_ledger',
    'gst_tax_invoices',
    'migration_conflicts',
    'mobile_size_gate_manifests',
    'political_campaign_content',
    'political_campaign_members',
    'political_campaigns',
    'security_pentest_audit_ledger',
    'spatial_topology_certification_ledger'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', v_table);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    END IF;
  END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- PostgreSQL grants EXECUTE to PUBLIC on new functions by default. Remove
-- that global default for functions created by the migration role; public
-- client RPCs must receive an explicit reviewed grant.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

