-- ============================================================================
-- W014 PATH A: AUTHORITATIVE READ-ONLY FUNCTION ACL & CATALOG VERIFICATION
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Function: public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)
-- Mode: Strictly READ-ONLY (Zero DDL / DML / Privilege modifications)
--
-- Guaranteed Row Return Contract:
-- 1. Result Set 1: Exactly 9 verification checks driven by static check set.
--    Even if target function does not exist, returns 9 FAIL rows (never 0 rows).
-- 2. Result Set 2: Exactly 1 catalog inspection row driven by dummy singleton.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RESULT SET 1: 9-CRITERIA EFFECTIVE & CATALOG VERIFICATION BATTERY
-- ----------------------------------------------------------------------------
WITH checks (check_id, check_name, expected) AS (
    VALUES
        (1, 'PUBLIC Execution Privilege', 'proacl IS NOT NULL; grantee=0 has NO EXECUTE in effective ACL; unprivileged roles inherit no EXECUTE'),
        (2, 'anon Execution Privilege', 'has_function_privilege = false'),
        (3, 'authenticated Execution Privilege', 'has_function_privilege = false'),
        (4, 'service_role Execution Privilege', 'has_function_privilege = true'),
        (5, 'panin_boundary_admin Execution Privilege', 'has_function_privilege = true'),
        (6, 'Function Owner Identity & NOLOGIN', 'owner = panin_boundary_definer AND rolcanlogin = false'),
        (7, 'SECURITY DEFINER Flag', 'prosecdef = true'),
        (8, 'Secure search_path Pinning', 'search_path=public, pg_temp'),
        (9, 'No Unintended Effective EXECUTE Grants', 'Zero unintended non-admin roles have effective EXECUTE; only authorized explicit grantees in proacl')
),
fn AS (
    SELECT 
        p.oid,
        p.proname,
        p.proowner,
        pg_get_userbyid(p.proowner) AS owner_name,
        r.rolcanlogin AS owner_can_login,
        p.prosecdef,
        p.proconfig,
        p.proacl,
        (p.proacl IS NULL) AS proacl_is_null,
        COALESCE(p.proacl, acldefault('f', p.proowner)) AS effective_acl
    FROM pg_proc p
    LEFT JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'fn_transition_mandal_current_version'
      AND p.pronamespace = 'public'::regnamespace
    LIMIT 1
),
effective_acl_entries AS (
    SELECT 
        acl.grantee,
        CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee_name,
        acl.privilege_type
    FROM fn,
    LATERAL aclexplode(fn.effective_acl) acl
),
unintended_roles AS (
    SELECT string_agg(r.rolname, ', ') AS unintended_list
    FROM pg_roles r, fn
    WHERE r.rolsuper = false
      AND r.rolname NOT IN ('service_role', 'panin_boundary_admin', 'panin_boundary_definer', 'postgres', 'supabase_admin')
      AND has_function_privilege(r.rolname, fn.oid, 'EXECUTE')
)
SELECT 
    c.check_id,
    c.check_name,
    c.expected,
    CASE 
        WHEN fn.oid IS NULL THEN 'FAIL: Target function public.fn_transition_mandal_current_version does not exist in catalog'
        WHEN c.check_id = 1 THEN 
            CASE 
                WHEN fn.proacl_is_null THEN 'FAIL: proacl IS NULL (default privileges active; PUBLIC possesses implicit EXECUTE)'
                WHEN EXISTS (SELECT 1 FROM effective_acl_entries WHERE grantee = 0 AND privilege_type = 'EXECUTE')
                    THEN 'FAIL: PUBLIC (grantee=0) possesses explicit EXECUTE in proacl'
                WHEN has_function_privilege('anon', fn.oid, 'EXECUTE') OR has_function_privilege('authenticated', fn.oid, 'EXECUTE')
                    THEN 'FAIL: unprivileged roles inherit effective EXECUTE from PUBLIC'
                ELSE 'PASS: proacl IS NOT NULL; grantee 0 has 0 EXECUTE entries; anon/authenticated inherit no EXECUTE'
            END
        WHEN c.check_id = 2 THEN 
            'has_function_privilege = ' || has_function_privilege('anon', fn.oid, 'EXECUTE')::text
        WHEN c.check_id = 3 THEN 
            'has_function_privilege = ' || has_function_privilege('authenticated', fn.oid, 'EXECUTE')::text
        WHEN c.check_id = 4 THEN 
            'has_function_privilege = ' || has_function_privilege('service_role', fn.oid, 'EXECUTE')::text
        WHEN c.check_id = 5 THEN 
            'has_function_privilege = ' || has_function_privilege('panin_boundary_admin', fn.oid, 'EXECUTE')::text
        WHEN c.check_id = 6 THEN 
            'owner = ' || fn.owner_name || ', rolcanlogin = ' || fn.owner_can_login::text
        WHEN c.check_id = 7 THEN 
            'prosecdef = ' || fn.prosecdef::text
        WHEN c.check_id = 8 THEN 
            COALESCE(array_to_string(fn.proconfig, ', '), '<NULL>')
        WHEN c.check_id = 9 THEN 
            CASE 
                WHEN (SELECT unintended_list FROM unintended_roles) IS NOT NULL 
                    THEN 'FAIL: Unintended roles have effective EXECUTE: ' || (SELECT unintended_list FROM unintended_roles)
                WHEN EXISTS (
                    SELECT 1 FROM effective_acl_entries 
                    WHERE privilege_type = 'EXECUTE' 
                      AND grantee_name NOT IN ('service_role', 'panin_boundary_admin', 'panin_boundary_definer')
                ) THEN 'FAIL: Unexpected explicit grantee in proacl'
                ELSE 'PASS: Zero unintended roles have effective EXECUTE; proacl contains only authorized operational roles'
            END
    END AS observed,
    CASE 
        WHEN fn.oid IS NULL THEN 'FAIL'
        WHEN c.check_id = 1 THEN 
            CASE 
                WHEN NOT fn.proacl_is_null 
                 AND NOT EXISTS (SELECT 1 FROM effective_acl_entries WHERE grantee = 0 AND privilege_type = 'EXECUTE')
                 AND NOT has_function_privilege('anon', fn.oid, 'EXECUTE')
                 AND NOT has_function_privilege('authenticated', fn.oid, 'EXECUTE')
                THEN 'PASS' ELSE 'FAIL'
            END
        WHEN c.check_id = 2 THEN 
            CASE WHEN NOT has_function_privilege('anon', fn.oid, 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 3 THEN 
            CASE WHEN NOT has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 4 THEN 
            CASE WHEN has_function_privilege('service_role', fn.oid, 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 5 THEN 
            CASE WHEN has_function_privilege('panin_boundary_admin', fn.oid, 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 6 THEN 
            CASE WHEN fn.owner_name = 'panin_boundary_definer' AND fn.owner_can_login = false THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 7 THEN 
            CASE WHEN fn.prosecdef = true THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 8 THEN 
            CASE WHEN array_to_string(fn.proconfig, ', ') ILIKE '%search_path=public, pg_temp%' THEN 'PASS' ELSE 'FAIL' END
        WHEN c.check_id = 9 THEN 
            CASE 
                WHEN (SELECT unintended_list FROM unintended_roles) IS NULL
                 AND NOT EXISTS (
                    SELECT 1 FROM effective_acl_entries 
                    WHERE privilege_type = 'EXECUTE' 
                      AND grantee_name NOT IN ('service_role', 'panin_boundary_admin', 'panin_boundary_definer')
                 )
                THEN 'PASS' ELSE 'FAIL'
            END
    END AS verdict
FROM checks c
LEFT JOIN fn ON true
ORDER BY c.check_id;

-- ----------------------------------------------------------------------------
-- RESULT SET 2: RAW CATALOG INSPECTION (GUARANTEED SINGLETON ROW)
-- ----------------------------------------------------------------------------
SELECT 
    COALESCE(p.oid::regprocedure::text, 'FUNCTION_NOT_FOUND') AS function_identity,
    COALESCE(pg_get_userbyid(p.proowner), 'N/A') AS function_owner,
    CASE 
        WHEN p.oid IS NULL THEN NULL 
        ELSE (p.proacl IS NULL) 
    END AS proacl_is_null,
    COALESCE(p.proacl::text, CASE WHEN p.oid IS NULL THEN 'N/A' ELSE '<NULL: default privileges apply>' END) AS raw_proacl_catalog_string,
    COALESCE(
        (
            SELECT string_agg(
                format('%s=%s/%s', 
                    CASE WHEN acl.grantee = 0 THEN 'PUBLIC (OID 0)' ELSE pg_get_userbyid(acl.grantee) END,
                    acl.privilege_type,
                    pg_get_userbyid(acl.grantor)
                ), 
                ', '
            )
            FROM aclexplode(p.proacl) acl
        ),
        CASE WHEN p.oid IS NULL THEN 'N/A' ELSE '<No explicit ACL entries>' END
    ) AS explicit_acl_entries
FROM (SELECT 1) dummy
LEFT JOIN pg_proc p 
  ON p.proname = 'fn_transition_mandal_current_version' 
 AND p.pronamespace = 'public'::regnamespace;
