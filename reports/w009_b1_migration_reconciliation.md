# W009-B1 MIGRATION RECONCILIATION & SAFETY VERIFICATION REPORT

## 1. Executive Summary
- **Batch ID:** W009-B1
- **Title:** Migration Normalization, Safety & Foundation Repair
- **Execution Authority:** Approved Plan `PLAN-W009-MASTER-REV-2` / CTO Directive W009-B1
- **Base Commit:** `e39767183c38917e706395ead09c8ab45aa41f1c`
- **Base Tree:** `47d46dd94690e66dae0b1859e3186556e1100b5a`
- **Implementation Commit:** `bf12b68ccd1b2df8dace2a0fcdb8f866f655befb`
- **Tree SHA:** `67f336d42a8cc726c8faf3947ee9e3df5b1647b8`
- **Status:** IMPLEMENTED, TESTED & RUNTIME VERIFIED / READY FOR INDEPENDENT CTO ACCEPTANCE

---

## 2. Migration Immutability & Safety Architecture
Under CTO explicit instruction, historical migrations are strictly immutable:
1. **Zero Renaming / Rewriting:** Neither `023_data_api_grants.sql` nor `023_local_body_representatives.sql` has been renamed, modified, or deleted. Historical Supabase migration tracking records keyed to these filenames remain completely intact.
2. **Deterministic Sequence via Bundler:** In `scripts/bundle_migrations.mjs`, `023_local_body_representatives.sql` is sequenced before `023_data_api_grants.sql`. This guarantees that in fresh environments or bootstraps, schema tables and objects created by migration 023 (and all prior migrations 001..022) receive full Data API role grants.
3. **Tail Migration Sequencing:**
   - `035_campaign_recharge_orders.sql` (durable recharge persistence and atomic verification) is sequenced at index 36.
   - `036_foundation_and_grants_repair.sql` (DEF-013 RPC syntax repair and grants) is sequenced at index 37.
   - Total migration file count in bundle: 38 files.

---

## 3. DEF-013 Remediation & PostgreSQL Runtime Verification
- **Defect:** PostgreSQL syntax error `0A000: invalid UNION/INTERSECT/EXCEPT ORDER BY clause` when invoking `global_search` RPC.
- **Root Cause:** In migration 020 (`supabase/migrations/020_foundation_hardening.sql`), 4 `UNION ALL` subqueries terminate directly with `ORDER BY relevance DESC LIMIT p_limit;` without an enclosing `SELECT` wrapper. In PostgreSQL SQL specification, a terminal `ORDER BY` after `UNION ALL` is ambiguous/invalid without wrapping parentheses or an outer query.
- **Isolated PostgreSQL Reproduction:**
  - Database: `postgis/postgis:16-3.4-alpine` (PostgreSQL 16.15 on x86_64-pc-linux-musl, container `w009-b1-postgres`)
  - Command: `SELECT * FROM global_search('Telangana', NULL, 10);` against defective 020 definition
  - PostgreSQL Result:
    ```text
    ERROR:  invalid UNION/INTERSECT/EXCEPT ORDER BY clause
    LINE 38:   ORDER BY relevance DESC
                        ^
    DETAIL:  Only result column names can be used, not expressions or functions.
    HINT:  Add the expression/function to every SELECT, or move the UNION into a FROM clause.
    NOTICE:  SQLSTATE: 0A000
    ```
- **Remediation Applied (Migration 036):**
```sql
CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  title TEXT,
  subtitle TEXT,
  relevance REAL
) AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    search_results.entity_type,
    search_results.entity_id,
    search_results.title,
    search_results.subtitle,
    search_results.relevance
  FROM (
    -- Constituencies
    SELECT
      'constituency'::TEXT AS entity_type,
      c.id AS entity_id,
      c.name AS title,
      (c.district || ' · AC#' || c.ac_no) AS subtitle,
      ts_rank(c.fts, tsq) AS relevance
    FROM constituencies c
    WHERE c.fts @@ tsq AND (p_state_code IS NULL OR c.state_code = p_state_code)

    UNION ALL

    -- Civic issues
    SELECT
      'issue'::TEXT AS entity_type,
      ci.id::TEXT AS entity_id,
      ci.title AS title,
      (ci.category || ' · ' || ci.status) AS subtitle,
      ts_rank(ci.fts, tsq) AS relevance
    FROM civic_issues ci
    WHERE ci.fts @@ tsq AND (p_state_code IS NULL OR ci.state_code = p_state_code)

    UNION ALL

    -- Headlines
    SELECT
      'headline'::TEXT AS entity_type,
      h.id::TEXT AS entity_id,
      h.title AS title,
      h.source_name AS subtitle,
      ts_rank(h.fts, tsq) AS relevance
    FROM headlines h
    WHERE h.fts @@ tsq AND (p_state_code IS NULL OR h.state_code = p_state_code)

    UNION ALL

    -- Legislator profiles
    SELECT
      'legislator'::TEXT AS entity_type,
      lp.id AS entity_id,
      lp.display_name AS title,
      (lp.current_party || ' · ' || lp.constituency_name) AS subtitle,
      CASE
        WHEN lp.display_name ILIKE '%' || p_query || '%' THEN 1.0
        WHEN lp.full_name ILIKE '%' || p_query || '%' THEN 0.9
        WHEN lp.constituency_name ILIKE '%' || p_query || '%' THEN 0.7
        ELSE 0.3
      END::REAL AS relevance
    FROM legislator_profiles lp
    WHERE (
      lp.display_name ILIKE '%' || p_query || '%'
      OR lp.full_name ILIKE '%' || p_query || '%'
      OR lp.constituency_name ILIKE '%' || p_query || '%'
      OR lp.current_party ILIKE '%' || p_query || '%'
    )
    AND (p_state_code IS NULL OR lp.state_code = p_state_code)
  ) search_results
  ORDER BY search_results.relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Explicitly enforce least-privilege execution boundary for SECURITY DEFINER RPC
REVOKE EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
```

---

## 4. PostgreSQL Catalog & Grant Verification
- **Function Catalog (`pg_proc`):**
  - Owner: `postgres`
  - Language: `plpgsql`
  - Volatility: `STABLE (s)`
  - Security Mode: `SECURITY DEFINER (t)`
  - Arguments: `p_query text, p_state_code text, p_limit integer`
  - Return Type: `TABLE(entity_type text, entity_id text, title text, subtitle text, relevance real)`
- **Routine Privileges (`routine_privileges`):**
  - `PUBLIC`: `EXECUTE = FALSE` (Explicitly Revoked & Verified)
  - `anon`: `EXECUTE = TRUE` (Verified)
  - `authenticated`: `EXECUTE = TRUE` (Verified)
  - `service_role`: `EXECUTE = TRUE` (Verified)
  - `postgres`: `EXECUTE = TRUE` (Verified)

---

## 5. Semantic Runtime Test Results
Executed against disposable container `w009-b1-postgres` populated with representative schema and entities:

1. **Test A — General Search (`'Telangana'`):**
   - Output: 6 rows returned (headlines matching full-text query)
   - Status: **PASS**
2. **Test B & C — Constituencies & Civic Issues (`'Sirpur'`):**
   - Output: 2 rows (`constituency` Sirpur and `issue` Road repairs needed in Sirpur)
   - Status: **PASS**
3. **Test D — Urban Constituency & Issue (`'Jubilee'`):**
   - Output: 2 rows (`constituency` Jubilee Hills and `issue` Water pipeline leakage in Jubilee Hills)
   - Status: **PASS**
4. **Test E — Legislator Profile Search (`'Reddy'`):**
   - Output: 1 row (`legislator` Revanth Reddy, relevance `1.0`)
   - Status: **PASS**
5. **Test F — Relevance Ordering:**
   - Output: Verified descending sort order by `relevance` column
   - Status: **PASS**
6. **Test G — Limit Enforcement (`p_limit = 2`):**
   - Output: Exactly 2 rows returned when limit is set to 2
   - Status: **PASS**
7. **Test H — State Filter Enforcement:**
   - `SELECT * FROM global_search('Sirpur', 'TS', 10);` -> 2 rows returned
   - `SELECT * FROM global_search('Sirpur', 'KA', 10);` -> 0 rows returned
   - Status: **PASS**
8. **Test I — No-Result Query (`'xyzunmatchednonexistentterm'`):**
   - Output: 0 rows returned cleanly without errors
   - Status: **PASS**

---

## 6. Migration 036 Idempotency Verification
- **First Application:** Applied clean with exit code 0 (`CREATE FUNCTION`, `GRANT`).
- **Second Application:** Applied clean with exit code 0 (`CREATE FUNCTION`, `GRANT`).
- **Catalog State Post-Second Apply:** Function owner, language, volatility, and privileges for `anon`, `authenticated`, and `service_role` remained 100% identical and intact.
- Status: **PASS**

---

## 7. Container Disposal & Safety Confirmation
- Container `w009-b1-postgres` was stopped and completely removed.
- **Staging Connections:** 0
- **Staging Mutations:** 0
- **Production Connections:** 0
- **Production Mutations:** 0
