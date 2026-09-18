# W009-B1 MIGRATION RECONCILIATION & SAFETY VERIFICATION REPORT

## 1. Executive Summary
- **Batch ID:** W009-B1
- **Title:** Migration Normalization, Safety & Foundation Repair
- **Execution Authority:** Approved Plan `PLAN-W009-MASTER-REV-2` / CTO Directive W009-B1
- **Base Commit:** `e39767183c38917e706395ead09c8ab45aa41f1c`
- **Base Tree:** `47d46dd94690e66dae0b1859e3186556e1100b5a`
- **Status:** IMPLEMENTED & VERIFIED / CTO ACCEPTANCE PENDING

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

## 3. DEF-013 Remediation Analysis
- **Defect:** PostgreSQL syntax error `0A000: invalid UNION/INTERSECT/EXCEPT ORDER BY clause` when invoking `global_search` RPC.
- **Root Cause:** In migration 020 (`supabase/migrations/020_foundation_hardening.sql`), 4 `UNION ALL` subqueries terminate directly with `ORDER BY relevance DESC LIMIT p_limit;` without an enclosing `SELECT` wrapper. In PostgreSQL SQL specification, a terminal `ORDER BY` after `UNION ALL` is ambiguous/invalid without wrapping parentheses or an outer query.
- **Remediation in Migration 036:**
```sql
CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (...) AS $$
BEGIN
  ...
  RETURN QUERY
  SELECT search_results.*
  FROM (
    -- Constituencies
    ...
    UNION ALL
    -- Civic issues
    ...
    UNION ALL
    -- Headlines
    ...
    UNION ALL
    -- Legislator profiles
    ...
  ) search_results
  ORDER BY search_results.relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
```
- **Grants Enforced:** Explicitly grants `EXECUTE` on `global_search` to `anon`, `authenticated`, and `service_role`.

---

## 4. Hash & Evidence Coordinates
| File | Bytes | SHA256 Hash |
| :--- | :--- | :--- |
| `supabase/migrations/023_data_api_grants.sql` | 2,038 | `d9bd73ac7ddd88ea03d2de0f0e6096e936b99b8801dd07fce6feebe7699b2120` |
| `supabase/migrations/023_local_body_representatives.sql` | 30,977 | `c870c08ba3951eb9b8258c8df3fd3da18a78155f62f0028b51076524f48eab77` |
| `supabase/migrations/035_campaign_recharge_orders.sql` | 5,388 | `2bec35dc014c45733a84ebe14a4a9dc09b9ac4bce3be8502fe808cc656227953` |
| `supabase/migrations/036_foundation_and_grants_repair.sql` | 3,034 | `af6b56414eeec3c9ec96f5317e2038e256b293b226fe3a71667c5656c2b34a06` |
| `scripts/bundle_migrations.mjs` | 2,963 | `7e4ed4f973e230fc73f936fdd4514eca41b3f0cdbb0bea64c337879b59df1395` |
| `supabase/all_migrations_combined.sql` | 378,516 | `d28731b4246283b6a4226f4d0a32343d7480a02f697d4d7ef58fa0ea69fbd43d` |

---

## 5. Verification Results
1. **Migration Bundler Execution:** `node scripts/bundle_migrations.mjs` executed cleanly; generated combined migration script containing 38 files.
2. **Determinism Verification:** Re-running bundler confirms exact SHA256 match.
3. **Historical Evidence Integrity:** `reports/w003_migration_snapshot_report.json` remained completely untouched.
4. **API Compilation:** `npm run build --prefix apps/api` (`tsc --noEmit`) executed with 0 errors.
5. **Contract Test Suite:** `npm test --prefix apps/api -- contracts.test.ts` passed 34/34 tests (100%).
6. **Live Staging/Prod Database Safety:** Zero mutations executed against live remote databases during this job.
