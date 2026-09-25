-- ==============================================================================
-- W014: DETERMINISTIC 23-CHECK MIGRATION 041 RELATIONAL VERIFICATION ARTIFACT
-- Repository Path: supabase/verification_w014_migration_041_23checks.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Mode: Strictly READ-ONLY (Single top-level SELECT statement)
-- Result Set: Exactly 23 rows (check_id, check_name, expected, observed, verdict)
-- Guaranteed Return: Static 23-row driver cross-joined with single-row assertion CTEs
-- ==============================================================================

WITH checks (check_id, check_name, expected) AS (
    VALUES
        (1, 'Delimitation Regimes Catalog Count', 'At least 4 delimitation regimes in public.delimitation_regimes'),
        (2, 'State Versions TS Presence', 'At least 1 state_versions record for TS'),
        (3, 'Current District Versions Count', 'Exactly 33 current district_versions'),
        (4, 'Current Parliamentary Constituency Versions Count', 'Exactly 17 current PC versions'),
        (5, 'Current Assembly Constituency Versions Count', 'Exactly 119 current AC versions'),
        (6, 'Anchor Table Current Version Pointers', 'Zero NULL current_version_id on TS districts and TS constituencies'),
        (7, 'AC 109 (Mulug) Historical Timeline Intervals', 'Exactly 3 statutory intervals for AC 109 in constituency_district_timeline'),
        (8, 'Entity Split Lineage Records (Mulugu & Narayanpet)', 'Split lineage records explicitly verified for Mulugu (from Jayashankar, G.O. 18) and Narayanpet (from Mahbubnagar, G.O. 19)'),
        (9, 'Delimitation Scenario Isolation Invariant', 'scenario_delimitation_draft_prop_1 legal_status != CURRENT_LEGAL_REGIME'),
        (10, 'Row Level Security on W014 Core Tables', 'RLS enabled (rowsecurity = true) on all 7 core W014 tables'),
        (11, 'Mandal Versions Table Existence', 'public.mandal_versions table exists in catalog'),
        (12, 'Mandals Anchor Current Version Column', 'mandals.current_version_id column exists'),
        (13, 'Composite Same-Anchor Foreign Key Constraint', 'fk_mandals_current_version_same_anchor constraint exists on public.mandals'),
        (14, 'Mandal Versions GiST Non-Overlap Exclusion', 'uq_mandal_versions_no_overlap GiST exclusion constraint exists on public.mandal_versions'),
        (15, 'Mandal Versions Single Current Unique Index', 'uq_mandal_versions_single_current unique index exists on public.mandal_versions'),
        (16, 'Mandal Versions Currentness Invariants Constraint', 'chk_mandal_versions_current_invariants check constraint exists on public.mandal_versions'),
        (17, 'Deferred Currentness & Retirement Constraint Triggers', 'Both trg_guard_mandal_current_version and trg_guard_mandal_version_retirement triggers exist'),
        (18, 'Transition Function Identity, Security Definer & Pinning', 'public.fn_transition_mandal_current_version(text,uuid,date,text,uuid) exists, prosecdef=true, owner=panin_boundary_definer, search_path=public, pg_temp'),
        (19, 'Boundary Definer Role Attributes & Schema Security', 'panin_boundary_definer has rolcanlogin=false, rolsuper=false, rolcreatedb=false, rolcreaterole=false, 0 inherited roles, USAGE on public, NO CREATE on public, CURRENT_USER cannot SET ROLE'),
        (20, 'Boundary Definer Table-Level Least-Privilege Allocation', 'SELECT only on dataset_versions, provenance_records, mandals, mandal_versions (NO table-level UPDATE, zero INSERT, zero DELETE/TRUNCATE/REFERENCES/TRIGGER)'),
        (21, 'Boundary Definer Column-Level UPDATE Privilege Pinning', 'UPDATE permitted strictly on mandals(current_version_id, updated_at) and mandal_versions(is_current, valid_from, valid_to, updated_at) (zero unintended column UPDATE grants)'),
        (22, 'Complete Transition Function EXECUTE Privilege Boundary', 'service_role=EXECUTE, panin_boundary_admin=EXECUTE, panin_boundary_definer=EXECUTE (owner), PUBLIC=NO EXECUTE, anon=NO EXECUTE, authenticated=NO EXECUTE (zero unauthorized grantees)'),
        (23, 'Row Level Security on Mandal Versions Table', 'RLS enabled (rowsecurity = true) on public.mandal_versions')
),
c1 AS (
    SELECT count(*)::int AS regimes_count
    FROM public.delimitation_regimes
),
c2 AS (
    SELECT count(*)::int AS sv_count
    FROM public.state_versions
    WHERE state_code = 'TS'
),
c3 AS (
    SELECT count(*)::int AS dv_count
    FROM public.district_versions
    WHERE is_current = true
),
c4 AS (
    SELECT count(*)::int AS pcv_count
    FROM public.parliamentary_constituency_versions
    WHERE is_current = true
),
c5 AS (
    SELECT count(*)::int AS cv_count
    FROM public.constituency_versions
    WHERE is_current = true
),
c6 AS (
    SELECT 
        (SELECT count(*)::int FROM public.districts WHERE current_version_id IS NULL AND state_code = 'TS') AS null_districts,
        (SELECT count(*)::int FROM public.constituencies WHERE current_version_id IS NULL AND state_code = 'TS') AS null_constituencies
),
c7 AS (
    SELECT count(*)::int AS mulug_timeline_count
    FROM public.constituency_district_timeline cdt
    JOIN public.constituencies c ON cdt.constituency_internal_id = c.internal_id
    WHERE c.canonical_code = 'TS-AC-109'
),
c8 AS (
    SELECT 
        (SELECT count(*)::int FROM public.geography_entity_lineage WHERE transition_type = 'split') AS total_splits,
        EXISTS (
            SELECT 1 
            FROM public.geography_entity_lineage l
            JOIN public.districts pred ON l.predecessor_internal_id = pred.id
            JOIN public.districts succ ON l.successor_internal_id = succ.id
            WHERE l.entity_type = 'district'
              AND l.transition_type = 'split'
              AND pred.code = 'TS-DIST-JAYASHANKAR-BHUPALPALLY'
              AND succ.code = 'TS-DIST-MULUGU'
              AND l.effective_date = '2019-02-17'::date
              AND l.statutory_order ILIKE '%G.O.Ms.No. 18%'
        ) AS mulugu_split_verified,
        EXISTS (
            SELECT 1 
            FROM public.geography_entity_lineage l
            JOIN public.districts pred ON l.predecessor_internal_id = pred.id
            JOIN public.districts succ ON l.successor_internal_id = succ.id
            WHERE l.entity_type = 'district'
              AND l.transition_type = 'split'
              AND pred.code = 'TS-DIST-MAHABUBNAGAR'
              AND succ.code = 'TS-DIST-NARAYANPET'
              AND l.effective_date = '2019-02-17'::date
              AND l.statutory_order ILIKE '%G.O.Ms.No. 19%'
        ) AS narayanpet_split_verified
),
c9 AS (
    SELECT (
        SELECT legal_status 
        FROM public.delimitation_regimes 
        WHERE id = 'scenario_delimitation_draft_prop_1'
    ) AS scenario_status
),
c10 AS (
    SELECT 
        count(*)::int AS total_expected_tables,
        count(*) FILTER (WHERE rowsecurity = true)::int AS rls_enabled_tables,
        COALESCE(string_agg(tablename, ', ' ORDER BY tablename) FILTER (WHERE rowsecurity = false), 'NONE') AS non_rls_tables
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'delimitation_regimes',
        'state_versions',
        'district_versions',
        'parliamentary_constituency_versions',
        'constituency_versions',
        'constituency_district_timeline',
        'geography_entity_lineage'
      )
),
c11 AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'mandal_versions'
    ) AS table_exists
),
c12 AS (
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'mandals' AND column_name = 'current_version_id'
    ) AS column_exists
),
c13 AS (
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'mandals' AND constraint_name = 'fk_mandals_current_version_same_anchor'
    ) AS fk_exists
),
c14 AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = to_regclass('public.mandal_versions') AND conname = 'uq_mandal_versions_no_overlap'
    ) AS gist_exists
),
c15 AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'mandal_versions' AND indexname = 'uq_mandal_versions_single_current'
    ) AS index_exists
),
c16 AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = to_regclass('public.mandal_versions') AND conname = 'chk_mandal_versions_current_invariants'
    ) AS chk_exists
),
c17 AS (
    SELECT 
        EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgrelid = to_regclass('public.mandals') AND tgname = 'trg_guard_mandal_current_version'
        ) AS trg_mandal_exists,
        EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgrelid = to_regclass('public.mandal_versions') AND tgname = 'trg_guard_mandal_version_retirement'
        ) AS trg_version_exists
),
c18 AS (
    SELECT 
        p.oid,
        p.prosecdef,
        pg_get_userbyid(p.proowner) AS function_owner,
        p.proconfig,
        p.oid IS NOT NULL 
          AND p.prosecdef = true 
          AND pg_get_userbyid(p.proowner) = 'panin_boundary_definer'
          AND (p.proconfig = ARRAY['search_path=public, pg_temp']) AS is_valid
    FROM (SELECT to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c19 AS (
    SELECT 
        r.rolname IS NOT NULL AS role_exists,
        COALESCE(r.rolcanlogin = false, false) AS canlogin_ok,
        COALESCE(r.rolsuper = false, false) AS super_ok,
        COALESCE(r.rolcreatedb = false, false) AS createdb_ok,
        COALESCE(r.rolcreaterole = false, false) AS createrole_ok,
        COALESCE((SELECT count(*)::int FROM pg_auth_members WHERE member = r.oid), 0) = 0 AS inherited_memberships_ok,
        has_schema_privilege('panin_boundary_definer', 'public', 'USAGE') AS schema_usage_ok,
        NOT has_schema_privilege('panin_boundary_definer', 'public', 'CREATE') AS schema_no_create_ok,
        NOT pg_has_role(CURRENT_USER, 'panin_boundary_definer', 'MEMBER') AS current_user_no_set_role_ok,
        COALESCE((SELECT count(*)::int FROM pg_auth_members WHERE roleid = r.oid), 0) = 0 AS definer_has_no_members_ok
    FROM (SELECT 1) dummy
    LEFT JOIN pg_roles r ON r.rolname = 'panin_boundary_definer'
),
c20 AS (
    SELECT 
        (
            has_table_privilege('panin_boundary_definer', 'public.dataset_versions', 'SELECT') AND
            has_table_privilege('panin_boundary_definer', 'public.provenance_records', 'SELECT') AND
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'SELECT') AND
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'SELECT')
        ) AS select_all_ok,
        NOT EXISTS (
            SELECT 1 
            FROM pg_class cl
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            CROSS JOIN LATERAL aclexplode(COALESCE(cl.relacl, acldefault('r', cl.relowner))) acl
            WHERE n.nspname = 'public'
              AND cl.relname IN ('mandals', 'mandal_versions', 'dataset_versions', 'provenance_records')
              AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
              AND acl.privilege_type = 'UPDATE'
        ) AS no_table_level_update,
        (
            SELECT count(*)::int
            FROM pg_class cl
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            CROSS JOIN LATERAL aclexplode(COALESCE(cl.relacl, acldefault('r', cl.relowner))) acl
            WHERE n.nspname = 'public'
              AND cl.relname IN ('mandals', 'mandal_versions', 'dataset_versions', 'provenance_records')
              AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
              AND acl.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
        ) AS prohibited_relacl_count,
        (
            SELECT count(*)::int 
            FROM information_schema.table_privileges 
            WHERE table_schema = 'public'
              AND table_name IN ('mandals', 'mandal_versions', 'dataset_versions', 'provenance_records')
              AND grantee = 'panin_boundary_definer' 
              AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
        ) AS prohibited_info_schema_count,
        (
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'INSERT') OR
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'DELETE') OR
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'TRUNCATE') OR
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'REFERENCES') OR
            has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'TRIGGER') OR
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'INSERT') OR
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'DELETE') OR
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'TRUNCATE') OR
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'REFERENCES') OR
            has_table_privilege('panin_boundary_definer', 'public.mandals', 'TRIGGER') OR
            has_table_privilege('panin_boundary_definer', 'public.dataset_versions', 'INSERT') OR
            has_table_privilege('panin_boundary_definer', 'public.dataset_versions', 'UPDATE') OR
            has_table_privilege('panin_boundary_definer', 'public.dataset_versions', 'DELETE') OR
            has_table_privilege('panin_boundary_definer', 'public.provenance_records', 'INSERT') OR
            has_table_privilege('panin_boundary_definer', 'public.provenance_records', 'UPDATE') OR
            has_table_privilege('panin_boundary_definer', 'public.provenance_records', 'DELETE')
        ) AS any_prohibited_has_table_privilege
),
c21 AS (
    SELECT 
        (
            has_column_privilege('panin_boundary_definer', 'public.mandals', 'current_version_id', 'UPDATE') AND
            has_column_privilege('panin_boundary_definer', 'public.mandals', 'updated_at', 'UPDATE')
        ) AS mandals_permitted_update_ok,
        (
            SELECT count(*)::int 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'mandals' 
              AND column_name NOT IN ('current_version_id', 'updated_at')
              AND has_column_privilege('panin_boundary_definer', 'public.mandals', column_name, 'UPDATE')
        ) AS mandals_unintended_update_count,
        (
            has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'is_current', 'UPDATE') AND
            has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'valid_from', 'UPDATE') AND
            has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'valid_to', 'UPDATE') AND
            has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'updated_at', 'UPDATE')
        ) AS versions_permitted_update_ok,
        (
            SELECT count(*)::int 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'mandal_versions' 
              AND column_name NOT IN ('is_current', 'valid_from', 'valid_to', 'updated_at')
              AND has_column_privilege('panin_boundary_definer', 'public.mandal_versions', column_name, 'UPDATE')
        ) AS versions_unintended_update_count
),
c22_proc AS (
    SELECT 
        p.oid,
        p.proowner,
        pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.proconfig,
        (p.proacl IS NULL) AS proacl_is_null,
        COALESCE(p.proacl, acldefault('f', p.proowner)) AS effective_proacl
    FROM (SELECT to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c22_acl_entries AS (
    SELECT 
        acl.grantee,
        COALESCE(pg_get_userbyid(acl.grantee), 'PUBLIC') AS grantee_name,
        acl.privilege_type
    FROM c22_proc
    CROSS JOIN LATERAL aclexplode(c22_proc.effective_proacl) acl
),
c22 AS (
    SELECT 
        p.oid IS NOT NULL AS func_exists,
        COALESCE(p.proacl_is_null, true) AS proacl_is_null,
        CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_role_execute,
        CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('panin_boundary_admin', p.oid, 'EXECUTE') END AS admin_execute,
        CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
        CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS auth_execute,
        EXISTS (SELECT 1 FROM c22_acl_entries WHERE grantee = 0 AND privilege_type = 'EXECUTE') AS public_grantee_0_has_execute,
        EXISTS (
            SELECT 1 FROM c22_acl_entries 
            WHERE privilege_type = 'EXECUTE' 
              AND grantee_name NOT IN ('panin_boundary_definer', 'service_role', 'panin_boundary_admin')
        ) AS unauthorized_grantee_exists,
        EXISTS (SELECT 1 FROM c22_acl_entries WHERE privilege_type = 'EXECUTE' AND grantee_name = 'panin_boundary_definer') AS definer_in_acl,
        EXISTS (SELECT 1 FROM c22_acl_entries WHERE privilege_type = 'EXECUTE' AND grantee_name = 'service_role') AS service_role_in_acl,
        EXISTS (SELECT 1 FROM c22_acl_entries WHERE privilege_type = 'EXECUTE' AND grantee_name = 'panin_boundary_admin') AS admin_in_acl
    FROM c22_proc p
),
c23 AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'mandal_versions' AND rowsecurity = true
    ) AS rls_enabled
)
SELECT 
    c.check_id,
    c.check_name,
    c.expected,
    CASE 
        WHEN c.check_id = 1 THEN 
            'count = ' || c1.regimes_count::text
        WHEN c.check_id = 2 THEN 
            'TS state_versions count = ' || c2.sv_count::text
        WHEN c.check_id = 3 THEN 
            'current district_versions count = ' || c3.dv_count::text
        WHEN c.check_id = 4 THEN 
            'current PC versions count = ' || c4.pcv_count::text
        WHEN c.check_id = 5 THEN 
            'current AC versions count = ' || c5.cv_count::text
        WHEN c.check_id = 6 THEN 
            'TS districts with NULL pointer = ' || c6.null_districts::text || ', TS constituencies with NULL pointer = ' || c6.null_constituencies::text
        WHEN c.check_id = 7 THEN 
            'AC 109 statutory intervals count = ' || c7.mulug_timeline_count::text
        WHEN c.check_id = 8 THEN 
            'total_splits=' || c8.total_splits::text || ', mulugu_split=' || c8.mulugu_split_verified::text || ', narayanpet_split=' || c8.narayanpet_split_verified::text
        WHEN c.check_id = 9 THEN 
            'scenario_delimitation_draft_prop_1 status = ' || COALESCE(c9.scenario_status, 'NOT_FOUND')
        WHEN c.check_id = 10 THEN 
            'RLS enabled on ' || c10.rls_enabled_tables::text || '/' || c10.total_expected_tables::text || ' tables (non-RLS: ' || c10.non_rls_tables || ')'
        WHEN c.check_id = 11 THEN 
            'mandal_versions table exists = ' || c11.table_exists::text
        WHEN c.check_id = 12 THEN 
            'mandals.current_version_id exists = ' || c12.column_exists::text
        WHEN c.check_id = 13 THEN 
            'fk_mandals_current_version_same_anchor exists = ' || c13.fk_exists::text
        WHEN c.check_id = 14 THEN 
            'uq_mandal_versions_no_overlap GiST exclusion exists = ' || c14.gist_exists::text
        WHEN c.check_id = 15 THEN 
            'uq_mandal_versions_single_current unique index exists = ' || c15.index_exists::text
        WHEN c.check_id = 16 THEN 
            'chk_mandal_versions_current_invariants constraint exists = ' || c16.chk_exists::text
        WHEN c.check_id = 17 THEN 
            'trg_guard_mandal_current_version = ' || c17.trg_mandal_exists::text || ', trg_guard_mandal_version_retirement = ' || c17.trg_version_exists::text
        WHEN c.check_id = 18 THEN 
            'fn exists = ' || (c18.oid IS NOT NULL)::text || ', prosecdef = ' || COALESCE(c18.prosecdef::text, 'NULL') || ', owner = ' || COALESCE(c18.function_owner, 'NULL') || ', proconfig = ' || COALESCE(array_to_string(c18.proconfig, ','), 'NULL')
        WHEN c.check_id = 19 THEN 
            'role_exists=' || c19.role_exists::text || ', login_ok=' || c19.canlogin_ok::text || ', super_ok=' || c19.super_ok::text || ', createdb_ok=' || c19.createdb_ok::text || ', createrole_ok=' || c19.createrole_ok::text || ', 0_inherited=' || c19.inherited_memberships_ok::text || ', usage_ok=' || c19.schema_usage_ok::text || ', no_create=' || c19.schema_no_create_ok::text || ', no_set_role=' || c19.current_user_no_set_role_ok::text || ', 0_members=' || c19.definer_has_no_members_ok::text
        WHEN c.check_id = 20 THEN 
            'select_ok=' || c20.select_all_ok::text || ', no_table_update=' || c20.no_table_level_update::text || ', prohibited_relacl_count=' || c20.prohibited_relacl_count::text || ', prohibited_info_schema_count=' || c20.prohibited_info_schema_count::text
        WHEN c.check_id = 21 THEN 
            'mandals_update_ok=' || c21.mandals_permitted_update_ok::text || ', mandals_unintended=' || c21.mandals_unintended_update_count::text || ', versions_update_ok=' || c21.versions_permitted_update_ok::text || ', versions_unintended=' || c21.versions_unintended_update_count::text
        WHEN c.check_id = 22 THEN 
            'proacl_is_null=' || c22.proacl_is_null::text || ', service_role=' || c22.service_role_execute::text || ', admin=' || c22.admin_execute::text || ', anon=' || c22.anon_execute::text || ', auth=' || c22.auth_execute::text || ', public_0=' || c22.public_grantee_0_has_execute::text || ', unauthorized_grantee=' || c22.unauthorized_grantee_exists::text || ', definer_in_acl=' || c22.definer_in_acl::text
        WHEN c.check_id = 23 THEN 
            'mandal_versions rowsecurity = ' || c23.rls_enabled::text
    END AS observed,
    CASE 
        WHEN c.check_id = 1 THEN 
            CASE WHEN c1.regimes_count >= 4 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 2 THEN 
            CASE WHEN c2.sv_count >= 1 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 3 THEN 
            CASE WHEN c3.dv_count = 33 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 4 THEN 
            CASE WHEN c4.pcv_count = 17 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 5 THEN 
            CASE WHEN c5.cv_count = 119 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 6 THEN 
            CASE WHEN c6.null_districts = 0 AND c6.null_constituencies = 0 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 7 THEN 
            CASE WHEN c7.mulug_timeline_count = 3 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 8 THEN 
            CASE WHEN c8.mulugu_split_verified AND c8.narayanpet_split_verified AND c8.total_splits >= 2 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 9 THEN 
            CASE WHEN c9.scenario_status IS NOT NULL AND c9.scenario_status <> 'CURRENT_LEGAL_REGIME' THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 10 THEN 
            CASE WHEN c10.total_expected_tables = 7 AND c10.rls_enabled_tables = 7 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 11 THEN 
            CASE WHEN c11.table_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 12 THEN 
            CASE WHEN c12.column_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 13 THEN 
            CASE WHEN c13.fk_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 14 THEN 
            CASE WHEN c14.gist_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 15 THEN 
            CASE WHEN c15.index_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 16 THEN 
            CASE WHEN c16.chk_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 17 THEN 
            CASE WHEN c17.trg_mandal_exists AND c17.trg_version_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 18 THEN 
            CASE WHEN c18.is_valid THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 19 THEN 
            CASE WHEN c19.role_exists AND c19.canlogin_ok AND c19.super_ok AND c19.createdb_ok AND c19.createrole_ok AND c19.inherited_memberships_ok AND c19.schema_usage_ok AND c19.schema_no_create_ok AND c19.current_user_no_set_role_ok AND c19.definer_has_no_members_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 20 THEN 
            CASE WHEN c20.select_all_ok AND c20.no_table_level_update AND c20.prohibited_relacl_count = 0 AND c20.prohibited_info_schema_count = 0 AND NOT c20.any_prohibited_has_table_privilege THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 21 THEN 
            CASE WHEN c21.mandals_permitted_update_ok AND c21.mandals_unintended_update_count = 0 AND c21.versions_permitted_update_ok AND c21.versions_unintended_update_count = 0 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 22 THEN 
            CASE WHEN c22.func_exists AND NOT c22.proacl_is_null AND c22.service_role_execute AND c22.admin_execute AND NOT c22.anon_execute AND NOT c22.auth_execute AND NOT c22.public_grantee_0_has_execute AND NOT c22.unauthorized_grantee_exists AND c22.definer_in_acl AND c22.service_role_in_acl AND c22.admin_in_acl THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 23 THEN 
            CASE WHEN c23.rls_enabled THEN 'PASS' ELSE 'FAIL' END
    END AS verdict
FROM checks c
CROSS JOIN c1
CROSS JOIN c2
CROSS JOIN c3
CROSS JOIN c4
CROSS JOIN c5
CROSS JOIN c6
CROSS JOIN c7
CROSS JOIN c8
CROSS JOIN c9
CROSS JOIN c10
CROSS JOIN c11
CROSS JOIN c12
CROSS JOIN c13
CROSS JOIN c14
CROSS JOIN c15
CROSS JOIN c16
CROSS JOIN c17
CROSS JOIN c18
CROSS JOIN c19
CROSS JOIN c20
CROSS JOIN c21
CROSS JOIN c22
CROSS JOIN c23
ORDER BY c.check_id;
