-- ==============================================================================
-- W014 CHECK 19 READ-ONLY DIAGNOSTIC SCRIPT
-- Repository Path: supabase/diagnostic_w014_check19.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Single top-level SELECT statement)
-- Semantics: ZERO MUTATIONS / ZERO DDL / ZERO DML / ZERO ROLE CHANGES
-- Objective: Diagnose Check 19 failure (role attributes, membership graph,
--            SET ROLE semantics, executor identity, and SECURITY DEFINER state)
-- ==============================================================================

WITH 
-- 1. Exact boundary-role attributes
role_attrs AS (
    SELECT 
        rolname,
        rolcanlogin,
        rolsuper,
        rolcreatedb,
        rolcreaterole,
        rolinherit,
        rolreplication,
        rolbypassrls,
        rolconnlimit,
        rolpassword IS NOT NULL AS has_password,
        has_schema_privilege('panin_boundary_definer', 'public', 'USAGE') AS schema_usage,
        has_schema_privilege('panin_boundary_definer', 'public', 'CREATE') AS schema_create
    FROM pg_roles
    WHERE rolname = 'panin_boundary_definer'
),

-- 2. Exact membership graph: roles inherited by panin_boundary_definer (member = definer)
inherited_by_definer AS (
    SELECT 
        COALESCE(json_agg(json_build_object(
            'inherited_role', r.rolname,
            'grantor', gr.rolname,
            'admin_option', am.admin_option
        )), '[]'::json) AS inherited_roles_list,
        count(*)::int AS inherited_roles_count
    FROM pg_auth_members am
    JOIN pg_roles r ON r.oid = am.roleid
    JOIN pg_roles gr ON gr.oid = am.grantor
    WHERE am.member = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
),

-- 3. Exact membership graph: roles that are members of / hold grants on panin_boundary_definer (roleid = definer)
grantees_of_definer AS (
    SELECT 
        COALESCE(json_agg(json_build_object(
            'member_role', r.rolname,
            'grantor', gr.rolname,
            'admin_option', am.admin_option,
            'raw_auth_member_row', to_jsonb(am)
        )), '[]'::json) AS grantees_list,
        count(*)::int AS grantees_count
    FROM pg_auth_members am
    JOIN pg_roles r ON r.oid = am.member
    JOIN pg_roles gr ON gr.oid = am.grantor
    WHERE am.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
),

-- 4. Application roles membership check
app_roles_check AS (
    SELECT json_build_object(
        'anon_has_role_member', pg_has_role('anon', 'panin_boundary_definer', 'MEMBER'),
        'authenticated_has_role_member', pg_has_role('authenticated', 'panin_boundary_definer', 'MEMBER'),
        'service_role_has_role_member', pg_has_role('service_role', 'panin_boundary_definer', 'MEMBER'),
        'panin_boundary_admin_has_role_member', pg_has_role('panin_boundary_admin', 'panin_boundary_definer', 'MEMBER'),
        'public_has_role_member', pg_has_role('public', 'panin_boundary_definer', 'MEMBER')
    ) AS app_roles_set_role_authority
),

-- 5. Executor identity and privilege context
executor_ctx AS (
    SELECT 
        current_user AS exec_current_user,
        session_user AS exec_session_user,
        current_database() AS exec_current_database,
        version() AS exec_pg_version,
        r.rolsuper AS exec_is_superuser,
        r.rolcanlogin AS exec_can_login,
        r.rolcreaterole AS exec_can_create_role,
        r.rolcreatedb AS exec_can_create_db,
        r.rolinherit AS exec_inherits,
        r.rolreplication AS exec_replication,
        r.rolbypassrls AS exec_bypass_rls,
        pg_has_role(CURRENT_USER, 'panin_boundary_definer', 'MEMBER') AS exec_has_definer_member,
        pg_has_role(CURRENT_USER, 'panin_boundary_definer', 'USAGE') AS exec_has_definer_usage,
        EXISTS (
            SELECT 1 FROM pg_auth_members am
            WHERE am.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'panin_boundary_definer')
              AND am.member = (SELECT oid FROM pg_roles WHERE rolname = CURRENT_USER)
        ) AS exec_in_auth_members_directly
    FROM (SELECT 1) dummy
    LEFT JOIN pg_roles r ON r.rolname = CURRENT_USER
),

-- 6. Transition function SECURITY DEFINER implications
func_state AS (
    SELECT 
        p.oid IS NOT NULL AS function_exists,
        p.proname,
        pg_get_userbyid(p.proowner) AS function_owner,
        p.prosecdef AS is_security_definer,
        p.proconfig AS runtime_proconfig,
        p.proacl::text AS raw_proacl,
        COALESCE(json_agg(json_build_object(
            'grantee', COALESCE(acl.grantee_name, 'PUBLIC'),
            'privilege', acl.privilege_type,
            'is_grantable', acl.is_grantable
        )), '[]'::json) AS explicit_acl_entries
    FROM (SELECT to_regprocedure('public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)') AS proc_oid) po
    LEFT JOIN pg_proc p ON p.oid = po.proc_oid
    LEFT JOIN LATERAL (
        SELECT 
            CASE WHEN e.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(e.grantee) END AS grantee_name,
            e.privilege_type,
            e.is_grantable
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) e
    ) acl ON true
    GROUP BY p.oid, p.proname, p.proowner, p.prosecdef, p.proconfig, p.proacl
)

-- Consolidated Diagnostic JSON + Tabular Output
SELECT jsonb_pretty(jsonb_build_object(
    'diagnostic_metadata', json_build_object(
        'timestamp', NOW(),
        'diagnostic_target', 'panin_boundary_definer / Check 19',
        'script_path', 'supabase/diagnostic_w014_check19.sql'
    ),
    'section_1_boundary_role_attributes', to_jsonb(ra),
    'section_2_membership_graph', json_build_object(
        'inherited_by_definer', to_jsonb(ibd),
        'grantees_of_definer', to_jsonb(god),
        'app_roles_set_role_authority', arc.app_roles_set_role_authority
    ),
    'section_3_set_role_and_executor_context', to_jsonb(ec),
    'section_4_transition_function_security_definer', to_jsonb(fs),
    'section_5_check19_evaluation_breakdown', json_build_object(
        'role_exists', ra.rolname IS NOT NULL,
        'login_ok', ra.rolcanlogin = false,
        'super_ok', ra.rolsuper = false,
        'createdb_ok', ra.rolcreatedb = false,
        'createrole_ok', ra.rolcreaterole = false,
        'inherited_memberships_ok_0_inherited', ibd.inherited_roles_count = 0,
        'schema_usage_ok', ra.schema_usage,
        'schema_no_create_ok', NOT ra.schema_create,
        'current_user_no_set_role_tested_against_superuser', NOT ec.exec_has_definer_member,
        'definer_has_no_members_tested_against_catalog', god.grantees_count = 0,
        'root_cause_explanation', CASE 
            WHEN ec.exec_is_superuser AND ec.exec_has_definer_member THEN 
                'CURRENT_USER is superuser (' || ec.exec_current_user || '). Under PostgreSQL kernel rules, superusers implicitly satisfy pg_has_role(..., MEMBER) for all roles. Testing NOT pg_has_role(CURRENT_USER) in superuser SQL Editor context creates a false negative.'
            ELSE 'See detailed membership graph'
        END
    )
)) AS diagnostic_report
FROM role_attrs ra
CROSS JOIN inherited_by_definer ibd
CROSS JOIN grantees_of_definer god
CROSS JOIN app_roles_check arc
CROSS JOIN executor_ctx ec
CROSS JOIN func_state fs;
