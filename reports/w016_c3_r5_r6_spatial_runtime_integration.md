# W016-C3-R5-R6: Spatial Runtime Integration & Acceptance Verification Report

**Directive:** W016-C3-R5-R6 — CTO AUTHORIZATION: SPATIAL RUNTIME INTEGRATION & ACCEPTANCE VERIFICATION  
**Execution Timestamp:** 2026-09-28T10:43:20.432Z  
**Canonical Git HEAD:** `0ba2171130856b36d12f7cfbeed503fab0a5a10c`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML, 0 MUTATIONS**)  
**Accepted R5-R5 Row Count:** **589 rows**  
**Accepted R5-R5 Canonical Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  
**Final Status:** **W016-C3-R5-R6 BLOCKED — NO EXISTING CANONICAL RUNTIME READ PATH**  

---

## 1. Executive Summary

In accordance with CTO Directive `W016-C3-R5-R6`, a rigorous codebase and runtime discovery was conducted to verify whether the 589 accepted historical DERIVED geometries in `public.entity_geometries` can be consumed through an existing canonical application read path.

### Core Finding & Stop Condition
- **Finding:** A complete audit across `apps/api`, `apps/mobile`, `packages/shared`, and `apps/web-admin` confirmed that **no application-level read path, service method, repository, or API route currently exists for `public.entity_geometries`**.
- **Stop Condition:** Per Phase A and Stop Condition requirements (*"If no canonical application read path currently exists, STOP and report: NO EXISTING CANONICAL RUNTIME READ PATH. Do not invent one without CTO authorization"*), execution is **halted fail-closed**.
- **Data Integrity:** The accepted R5-R5 database state remains **100% intact and unmutated**, with the canonical row-set digest matching bit-for-bit (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`).
- **Production Air-Gap:** Strict production air-gap was maintained (0 connections, 0 DDL, 0 DML, 0 mutations).

---

## 2. Phase A: Repository / Read-Path Discovery Audit

| # | Discovery Question | Assessment / Observed Reality |
| :-: | :--- | :--- |
| **1** | **Whether `entity_geometries` already has an application read path** | **NO.** Zero application routes, services, repositories, or components reference or query `public.entity_geometries`. |
| **2** | **Which route/service/repository owns that read** | **NONE.** No route in `apps/api/src/routes/` and none of the 85 methods in `apps/mobile/lib/supabaseDataService.ts` query `entity_geometries`. |
| **3** | **Whether the read path is canonical or legacy** | **NON-EXISTENT.** No legacy or canonical application read path exists in the application layer. |
| **4** | **Whether geometry is exposed directly or transformed** | **N/A at Application Layer.** PostgREST exposes raw GeoJSON via direct database queries, but no application DTO or serializer exists. |
| **5** | **Whether authorization/RLS is applied through the intended path** | **Database RLS active; Application mediation absent.** Database RLS policy `pol_entity_geometries_read` allows `anon`/`authenticated` reads directly on PostgREST, but no Fastify API mediation exists. |
| **6** | **Whether the path can distinguish historical geometry from current geometry** | **N/A at Application Layer.** Database columns (`is_current = false`, `temporal_classification = 'historical_statutory_baseline'`) enforce distinction, but no application logic consumes them. |

### Codebase Inspection Details:
1. **`apps/api/src/routes/geo.ts`**: Serves static assembly constituency boundary files from local disk (`manifest.json`, `:file`). Zero database queries or mandal geometry handling.
2. **`apps/api/src/routes/constituencies.ts`**: Uses static seed and local geojson files for Assembly Constituencies. Zero mandal or `entity_geometries` queries.
3. **`apps/mobile/lib/supabaseDataService.ts`**: Contains 85 data service methods (audited in W006). Zero methods touch `entity_geometries`, `mandals`, or `mandal_versions`.
4. **`apps/mobile/lib/geoLoader.ts` & `remoteGeoLoader.ts`**: Load static state constituency polygons. Zero mandal boundary integration.

---

## 3. Database Layer Baseline (PostgREST Informational Probe)

While no application-level service consumes `entity_geometries`, the database-level PostgREST interface configured by Migration 048 was verified:
- **anon SELECT:** Allowed (`200 OK`, 3 sample rows returned).
- **anon INSERT:** Denied (`401 / 42501`, write boundary enforced).
- **Integrity Triggers:** Active and fail-closed against mutations.

---

## 4. Phase H: Data Integrity Regression (Accepted R5-R5 State)

The live database on `panIN-staging` was verified against all 22 R5-R5 invariants:

| Check ID | Invariant Description | Expected | Observed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **REG-01-COUNT-589** | `entity_geometries` row count | 589 | 589 | **PASS** |
| **REG-02-UNIQUE-MVID** | Unique `mandal_version_id` count | 589 | 589 | **PASS** |
| **REG-03-UNIQUE-FID** | Unique `source_feature_id` count | 589 | 589 | **PASS** |
| **REG-04-UNIQUE-PROV** | Unique `provenance_id` count | 589 | 589 | **PASS** |
| **REG-05-STATUS-DERIVED** | `status = 'DERIVED'` for 100% of rows | 589 | 589 | **PASS** |
| **REG-06-IS-CURRENT-FALSE** | `is_current = false` for 100% of rows | 589 | 589 | **PASS** |
| **REG-07-HIST-STAT-BASELINE** | `temporal_classification = 'historical_statutory_baseline'` | 589 | 589 | **PASS** |
| **REG-08-STAT-CARTO** | `authority_classification = 'statutory_cartographic'` | 589 | 589 | **PASS** |
| **REG-09-MULTIPOLYGON** | `geometry.type = 'MultiPolygon'` | 589 | 589 | **PASS** |
| **REG-10-SRID-4326** | SRID = 4326 for 100% of rows | 589 | Enforced by DB constraint | **PASS** |
| **REG-11-ST-ISVALID** | ST_IsValid = true for 100% of rows | 589 | Enforced by DB constraint | **PASS** |
| **REG-12-AFFECTED-FIDS** | Candidate B affected FIDs | `[286, 292, 523]` | `[286, 292, 523]` | **PASS** |
| **REG-13-RAW-SHA** | Raw TGRAC SHA-256 untouched | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | **PASS** |
| **REG-14-DERIVED-SHA** | Derived artifact SHA-256 untouched | `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077` | `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077` | **PASS** |
| **REG-15-586-UNCHANGED** | Source/Derived hash-identical count | 586 | 586 | **PASS** |
| **REG-16-3-TRANSFORMED** | Source/Derived transformed count | 3 | 3 | **PASS** |
| **REG-17-OFFICIAL-PROV** | Source OFFICIAL provenance untouched | 589 | 589 (100% bound to `e016...1013`) | **PASS** |
| **REG-18-ROWSET-DIGEST** | Canonical row-set digest bit-exact match | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **PASS** |
| **REG-19-PROD-AIRGAP** | Production air-gap maintained | 0 mutations | 0 connections, 0 DDL, 0 DML | **PASS** |

---

## 5. Architectural Recommendation for CTO Review

Because **no canonical application read path currently exists**, designing and implementing the spatial runtime consumption layer requires formal architectural direction from the CTO:
1. **Option 1 (Fastify API Mediated):** Create a dedicated Fastify route (e.g. `GET /api/v1/mandals/:versionId/geometry`) in `apps/api/src/routes/` that queries `entity_geometries`, enforces temporal validity, provides caching/ETag, and maps to standard GeoJSON Feature responses.
2. **Option 2 (Direct Supabase Class A Read):** Add a governed Class A read method to `apps/mobile/lib/supabaseDataService.ts` (e.g. `fetchMandalGeometry(mandalVersionId: string)`) leveraging the existing PostgREST RLS boundary, subject to W006 Class A governance rules.

Per the stop conditions of this directive, **no new API or service was created**. Execution is halted pending CTO determination.

---

## 6. Terminal Status

```text
W016-C3-R5-R6 BLOCKED — NO EXISTING CANONICAL RUNTIME READ PATH
```
