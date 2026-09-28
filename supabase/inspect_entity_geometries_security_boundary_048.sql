-- ==============================================================================
-- W016-C3-R5-R3-R3A: Target Live Security Boundary & Catalog Audit
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Mode: Strictly READ-ONLY (Single Top-Level Inspection Queries)
-- ==============================================================================

-- 1. Function Catalog Inspection (Security Mode, Owner, proconfig, ACL)
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    pg_get_userbyid(p.proowner) AS owner_name,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
    p.proconfig AS search_path_config,
    p.proacl AS function_acl,
    t.typname AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_type t ON t.oid = p.prorettype
WHERE n.nspname = 'public'
  AND p.proname IN ('fn_validate_entity_geometry_lineage', 'fn_prevent_entity_geometry_mutation')
ORDER BY p.proname;

-- 2. Trigger Catalog Inspection (Attachment, Timing, Events, Function)
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    CASE 
        WHEN (t.tgtype & 2) = 2 THEN 'BEFORE'
        WHEN (t.tgtype & 64) = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    CASE 
        WHEN (t.tgtype & 4) = 4 AND (t.tgtype & 16) = 16 THEN 'INSERT OR UPDATE'
        WHEN (t.tgtype & 4) = 4 THEN 'INSERT'
        WHEN (t.tgtype & 16) = 16 THEN 'UPDATE'
        WHEN (t.tgtype & 8) = 8 THEN 'DELETE'
        ELSE 'OTHER'
    END AS events,
    CASE WHEN (t.tgtype & 1) = 1 THEN 'ROW' ELSE 'STATEMENT' END AS level,
    p.proname AS function_name,
    t.tgenabled AS enabled_state
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND c.relname = 'entity_geometries'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 3. RLS Table Flags (relrowsecurity, relforcerowsecurity)
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS force_rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname = 'entity_geometries';

-- 4. RLS Policy Inventory
SELECT 
    polname AS policy_name,
    polcmd AS command,
    CASE 
        WHEN polroles = '{0}' THEN 'PUBLIC'
        ELSE array_to_string(ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(polroles)), ', ')
    END AS permitted_roles,
    pg_get_expr(polqual, polrelid) AS using_expression,
    pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'public.entity_geometries'::regclass
ORDER BY polname;

-- 5. Table Privilege Grants
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'entity_geometries'
ORDER BY grantee, privilege_type;

-- 6. Table Constraints Summary
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.entity_geometries'::regclass
ORDER BY conname;

-- 7. Zero-Row Audit Confirmation
SELECT count(*) AS entity_geometries_row_count
FROM public.entity_geometries;
