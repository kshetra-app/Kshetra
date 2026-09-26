-- ==============================================================================
-- W014-GOV-01: DETERMINISTIC 16-CHECK SELECT-ONLY POST-MIGRATION-044 STRUCTURAL VERIFIER
-- Repository Path: supabase/verification_w014_migration_044_select_only.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Mode: Strictly READ-ONLY (Single top-level SELECT statement)
-- Statement Purity: Zero DML, Zero DDL, Zero Transaction Control, Zero DO Blocks
-- Result Set: Exactly 16 rows (check_id, check_name, expected, observed, verdict)
-- Guaranteed Return: Static 16-row driver cross-joined with single-row assertion CTEs
-- ==============================================================================

WITH checks (check_id, check_name, expected) AS (
    VALUES
        (1, 'Unconditional GiST Exclusion Constraint Absence', 'Constraint uq_mandal_versions_no_overlap is ABSENT (count = 0)'),
        (2, 'Partial Historical GiST Exclusion Constraint Presence', 'Constraint uq_mandal_versions_historical_no_overlap exists with contype=x and am=gist'),
        (3, 'Partial-Index Predicate Exactness', 'Partial index predicate is exactly (valid_to IS NOT NULL)'),
        (4, 'Temporal Bounds Guard Function Existence', 'Function public.fn_guard_mandal_version_temporal_bounds() exists in pg_proc'),
        (5, 'Temporal Bounds Guard Function Owner', 'Function owner is panin_boundary_definer'),
        (6, 'Temporal Bounds Guard Function Security Definer', 'Function is SECURITY DEFINER (prosecdef = true)'),
        (7, 'Temporal Bounds Guard Function Search Path', 'Function search_path is exactly public, pg_temp'),
        (8, 'Temporal Bounds Guard Trigger Existence & Attributes', 'trg_guard_mandal_version_temporal_bounds exists, enabled=O, BEFORE ROW INSERT/UPDATE on (is_current, mandal_id, valid_from, valid_to)'),
        (9, 'Anchor Function Reciprocal Overlap Protection', 'fn_guard_mandal_current_version contains ERR-W014-006 / 23P01 reciprocal historical/current overlap protection'),
        (10, 'Transition Function Stability & Integrity', 'fn_transition_mandal_current_version unchanged: exists=true, prosecdef=true, owner=panin_boundary_definer, search_path=public, pg_temp'),
        (11, 'Protected Boundary Functions EXECUTE Revocation', 'PUBLIC, anon, and authenticated lack EXECUTE on protected boundary functions'),
        (12, 'Protected Boundary Functions Authorized Roles', 'service_role and panin_boundary_admin possess required EXECUTE privileges'),
        (13, 'Boundary Definer Role Boundary Invariants', 'panin_boundary_definer has rolcanlogin=false, rolsuper=false, rolcreatedb=false, rolcreaterole=false, 0 inherited roles'),
        (14, 'Zero Unexpected Table-Level Privileges', 'panin_boundary_definer has SELECT only on mandals and mandal_versions (zero table-level UPDATE/INSERT/DELETE/TRUNCATE)'),
        (15, 'Column-Level UPDATE Privilege Pinning', 'UPDATE permitted strictly on mandals(current_version_id, updated_at) and mandal_versions(is_current, valid_from, valid_to, updated_at)'),
        (16, 'Mandal Versions Table Row-Level Security', 'mandal_versions RLS remains enabled (rowsecurity = true) and forced (relforcerowsecurity = true)')
),
c1 AS (
    SELECT 
        (SELECT count(*)::int 
         FROM pg_constraint c 
         WHERE c.conrelid = to_regclass('public.mandal_versions') 
           AND c.conname = 'uq_mandal_versions_no_overlap') AS unconditional_gist_count
),
c2 AS (
    SELECT 
        c.oid IS NOT NULL AS constraint_exists,
        COALESCE(c.contype = 'x', false) AS is_exclusion,
        COALESCE(am.amname = 'gist', false) AS is_gist
    FROM (SELECT 1) dummy
    LEFT JOIN pg_constraint c 
      ON c.conrelid = to_regclass('public.mandal_versions')
     AND c.conname = 'uq_mandal_versions_historical_no_overlap'
    LEFT JOIN pg_class ic ON ic.oid = c.conindid
    LEFT JOIN pg_am am ON am.oid = ic.relam
),
c3 AS (
    SELECT 
        pg_get_expr(i.indpred, i.indrelid) AS predicate_expr,
        (pg_get_expr(i.indpred, i.indrelid) = '(valid_to IS NOT NULL)') AS is_match
    FROM (SELECT 1) dummy
    LEFT JOIN pg_constraint c 
      ON c.conrelid = to_regclass('public.mandal_versions')
     AND c.conname = 'uq_mandal_versions_historical_no_overlap'
    LEFT JOIN pg_index i 
      ON i.indexrelid = c.conindid 
     AND i.indrelid = c.conrelid
),
c4 AS (
    SELECT 
        to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()') IS NOT NULL AS func_exists
),
c5 AS (
    SELECT 
        pg_get_userbyid(p.proowner) AS owner_name,
        (pg_get_userbyid(p.proowner) = 'panin_boundary_definer') AS owner_ok
    FROM (SELECT to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c6 AS (
    SELECT 
        COALESCE(p.prosecdef, false) AS is_secdef
    FROM (SELECT to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c7 AS (
    SELECT 
        array_to_string(p.proconfig, ', ') AS config_str,
        (p.proconfig = ARRAY['search_path=public, pg_temp']) AS search_path_ok
    FROM (SELECT to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c8 AS (
    SELECT 
        t.tgname IS NOT NULL AS trigger_exists,
        COALESCE(t.tgenabled = 'O', false) AS is_enabled,
        COALESCE((t.tgtype & 2) = 2, false) AS is_before,
        COALESCE((t.tgtype & 1) = 1, false) AS is_row,
        COALESCE((t.tgtype & 4) = 4, false) AS has_insert,
        COALESCE((t.tgtype & 16) = 16, false) AS has_update,
        ARRAY(
            SELECT a.attname::text
            FROM pg_attribute a
            WHERE a.attrelid = t.tgrelid
              AND a.attnum = ANY(string_to_array(t.tgattr::text, ' ')::smallint[])
            ORDER BY a.attname
        ) = ARRAY['is_current', 'mandal_id', 'valid_from', 'valid_to'] AS columns_match
    FROM (SELECT 1) dummy
    LEFT JOIN pg_trigger t 
      ON t.tgrelid = to_regclass('public.mandal_versions')
     AND t.tgname = 'trg_guard_mandal_version_temporal_bounds'
),
c9 AS (
    SELECT 
        p.oid IS NOT NULL AS func_exists,
        COALESCE(p.prosrc ILIKE '%ERR-W014-006%' AND p.prosrc ILIKE '%23P01%' AND p.prosrc ILIKE '%overlaps a closed historical interval%', false) AS reciprocal_guard_present
    FROM (SELECT to_regprocedure('public.fn_guard_mandal_current_version()') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c10 AS (
    SELECT 
        p.oid IS NOT NULL AS func_exists,
        COALESCE(p.prosecdef, false) AS is_secdef,
        pg_get_userbyid(p.proowner) AS owner_name,
        COALESCE(p.proconfig = ARRAY['search_path=public, pg_temp'], false) AS search_path_ok
    FROM (SELECT to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
),
c11 AS (
    SELECT 
        -- bounds func
        NOT has_function_privilege('anon', to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()'), 'EXECUTE') AS bounds_anon_denied,
        NOT has_function_privilege('authenticated', to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()'), 'EXECUTE') AS bounds_auth_denied,
        NOT has_function_privilege('public', to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()'), 'EXECUTE') AS bounds_public_denied,
        -- transition func
        NOT has_function_privilege('anon', to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'), 'EXECUTE') AS trans_anon_denied,
        NOT has_function_privilege('authenticated', to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'), 'EXECUTE') AS trans_auth_denied,
        NOT has_function_privilege('public', to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'), 'EXECUTE') AS trans_public_denied
),
c12 AS (
    SELECT 
        has_function_privilege('service_role', to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()'), 'EXECUTE') AS bounds_service_role_ok,
        has_function_privilege('panin_boundary_admin', to_regprocedure('public.fn_guard_mandal_version_temporal_bounds()'), 'EXECUTE') AS bounds_admin_ok,
        has_function_privilege('service_role', to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'), 'EXECUTE') AS trans_service_role_ok,
        has_function_privilege('panin_boundary_admin', to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'), 'EXECUTE') AS trans_admin_ok
),
c13 AS (
    SELECT 
        r.rolname IS NOT NULL AS role_exists,
        COALESCE(r.rolcanlogin = false, false) AS canlogin_ok,
        COALESCE(r.rolsuper = false, false) AS super_ok,
        COALESCE(r.rolcreatedb = false, false) AS createdb_ok,
        COALESCE(r.rolcreaterole = false, false) AS createrole_ok,
        COALESCE((SELECT count(*)::int FROM pg_auth_members WHERE member = r.oid), 0) = 0 AS inherited_memberships_ok
    FROM (SELECT 1) dummy
    LEFT JOIN pg_roles r ON r.rolname = 'panin_boundary_definer'
),
c14 AS (
    SELECT 
        has_table_privilege('panin_boundary_definer', 'public.mandals', 'SELECT') AS mandals_select_ok,
        has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'SELECT') AS versions_select_ok,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandals', 'INSERT') AS mandals_no_insert,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandals', 'DELETE') AS mandals_no_delete,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandals', 'TRUNCATE') AS mandals_no_truncate,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'INSERT') AS versions_no_insert,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'DELETE') AS versions_no_delete,
        NOT has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'TRUNCATE') AS versions_no_truncate,
        NOT EXISTS (
            SELECT 1 
            FROM pg_class cl
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            CROSS JOIN LATERAL aclexplode(COALESCE(cl.relacl, acldefault('r', cl.relowner))) acl
            WHERE n.nspname = 'public'
              AND cl.relname IN ('mandals', 'mandal_versions')
              AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
              AND acl.privilege_type = 'UPDATE'
        ) AS no_table_level_update
),
c15 AS (
    SELECT 
        ARRAY(
            SELECT attname::text
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.mandals')
              AND a.attnum > 0
              AND has_column_privilege('panin_boundary_definer', 'public.mandals', a.attname, 'UPDATE')
            ORDER BY a.attname
        ) = ARRAY['current_version_id', 'updated_at'] AS mandals_update_cols_ok,
        ARRAY(
            SELECT attname::text
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.mandal_versions')
              AND a.attnum > 0
              AND has_column_privilege('panin_boundary_definer', 'public.mandal_versions', a.attname, 'UPDATE')
            ORDER BY a.attname
        ) = ARRAY['is_current', 'updated_at', 'valid_from', 'valid_to'] AS versions_update_cols_ok
),
c16 AS (
    SELECT 
        c.rowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    WHERE c.oid = to_regclass('public.mandal_versions')
)
SELECT 
    c.check_id,
    c.check_name,
    c.expected,
    CASE 
        WHEN c.check_id = 1 THEN 
            'unconditional_gist_count=' || c1.unconditional_gist_count::text
        WHEN c.check_id = 2 THEN 
            'exists=' || c2.constraint_exists::text || ', is_exclusion=' || c2.is_exclusion::text || ', is_gist=' || c2.is_gist::text
        WHEN c.check_id = 3 THEN 
            'predicate=' || COALESCE(c3.predicate_expr, 'NULL')
        WHEN c.check_id = 4 THEN 
            'func_exists=' || c4.func_exists::text
        WHEN c.check_id = 5 THEN 
            'owner=' || COALESCE(c5.owner_name, 'NULL')
        WHEN c.check_id = 6 THEN 
            'is_secdef=' || c6.is_secdef::text
        WHEN c.check_id = 7 THEN 
            'search_path=' || COALESCE(c7.config_str, 'NULL')
        WHEN c.check_id = 8 THEN 
            'exists=' || c8.trigger_exists::text || ', enabled=' || c8.is_enabled::text || ', before=' || c8.is_before::text || ', row=' || c8.is_row::text || ', insert=' || c8.has_insert::text || ', update=' || c8.has_update::text || ', cols=' || c8.columns_match::text
        WHEN c.check_id = 9 THEN 
            'func_exists=' || c9.func_exists::text || ', reciprocal_guard_present=' || c9.reciprocal_guard_present::text
        WHEN c.check_id = 10 THEN 
            'exists=' || c10.func_exists::text || ', prosecdef=' || c10.is_secdef::text || ', owner=' || COALESCE(c10.owner_name, 'NULL') || ', search_path_ok=' || c10.search_path_ok::text
        WHEN c.check_id = 11 THEN 
            'bounds_anon_denied=' || c11.bounds_anon_denied::text || ', bounds_auth_denied=' || c11.bounds_auth_denied::text || ', bounds_public_denied=' || c11.bounds_public_denied::text || ', trans_anon_denied=' || c11.trans_anon_denied::text || ', trans_auth_denied=' || c11.trans_auth_denied::text || ', trans_public_denied=' || c11.trans_public_denied::text
        WHEN c.check_id = 12 THEN 
            'bounds_sr=' || c12.bounds_service_role_ok::text || ', bounds_admin=' || c12.bounds_admin_ok::text || ', trans_sr=' || c12.trans_service_role_ok::text || ', trans_admin=' || c12.trans_admin_ok::text
        WHEN c.check_id = 13 THEN 
            'exists=' || c13.role_exists::text || ', nologin=' || c13.canlogin_ok::text || ', nosuper=' || c13.super_ok::text || ', nocreatedb=' || c13.createdb_ok::text || ', nocreaterole=' || c13.createrole_ok::text || ', 0_inherited=' || c13.inherited_memberships_ok::text
        WHEN c.check_id = 14 THEN 
            'mandals_sel=' || c14.mandals_select_ok::text || ', vers_sel=' || c14.versions_select_ok::text || ', no_table_update=' || c14.no_table_level_update::text || ', m_no_ins=' || c14.mandals_no_insert::text || ', v_no_ins=' || c14.versions_no_insert::text
        WHEN c.check_id = 15 THEN 
            'mandals_cols_ok=' || c15.mandals_update_cols_ok::text || ', versions_cols_ok=' || c15.versions_update_cols_ok::text
        WHEN c.check_id = 16 THEN 
            'rls_enabled=' || COALESCE(c16.rls_enabled, false)::text || ', rls_forced=' || COALESCE(c16.rls_forced, false)::text
    END AS observed,
    CASE 
        WHEN c.check_id = 1 THEN 
            CASE WHEN c1.unconditional_gist_count = 0 THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 2 THEN 
            CASE WHEN c2.constraint_exists AND c2.is_exclusion AND c2.is_gist THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 3 THEN 
            CASE WHEN c3.is_match THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 4 THEN 
            CASE WHEN c4.func_exists THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 5 THEN 
            CASE WHEN c5.owner_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 6 THEN 
            CASE WHEN c6.is_secdef THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 7 THEN 
            CASE WHEN c7.search_path_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 8 THEN 
            CASE WHEN c8.trigger_exists AND c8.is_enabled AND c8.is_before AND c8.is_row AND c8.has_insert AND c8.has_update AND c8.columns_match THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 9 THEN 
            CASE WHEN c9.func_exists AND c9.reciprocal_guard_present THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 10 THEN 
            CASE WHEN c10.func_exists AND c10.is_secdef AND c10.owner_name = 'panin_boundary_definer' AND c10.search_path_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 11 THEN 
            CASE WHEN c11.bounds_anon_denied AND c11.bounds_auth_denied AND c11.bounds_public_denied AND c11.trans_anon_denied AND c11.trans_auth_denied AND c11.trans_public_denied THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 12 THEN 
            CASE WHEN c12.bounds_service_role_ok AND c12.bounds_admin_ok AND c12.trans_service_role_ok AND c12.trans_admin_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 13 THEN 
            CASE WHEN c13.role_exists AND c13.canlogin_ok AND c13.super_ok AND c13.createdb_ok AND c13.createrole_ok AND c13.inherited_memberships_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 14 THEN 
            CASE WHEN c14.mandals_select_ok AND c14.versions_select_ok AND c14.mandals_no_insert AND c14.mandals_no_delete AND c14.mandals_no_truncate AND c14.versions_no_insert AND c14.versions_no_delete AND c14.versions_no_truncate AND c14.no_table_level_update THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 15 THEN 
            CASE WHEN c15.mandals_update_cols_ok AND c15.versions_update_cols_ok THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 16 THEN 
            CASE WHEN c16.rls_enabled AND c16.rls_forced THEN 'PASS' ELSE 'FAIL' END
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
ORDER BY c.check_id;
