# PRODUCTION SYNCHRONIZATION GUIDE: KSHETRA / PANIN
## Step-by-Step Air-Gap Resolution & Production Database Parity Procedure

**Target Environment:** Production Supabase (`ehfafcnimmjusyvplbah` / `https://ehfafcnimmjusyvplbah.supabase.co`)  
**Staging Reference:** panIN-staging (`fkpigozcqnmcvofuksar`) — 100% Verified (10/10 PASS: `POST_STAGING_DEPLOY_PASS`)  
**Authority:** Master Execution Framework Amendment v1.6 / DEC-164 & DEC-165  
**Governing Standard:** Zero Hallucination, 100% Empirical Verification, Bitwise Idempotency  

---

## 1. Forensic Root Cause Analysis

### A. SQL Editor Payload Ceiling
The monolithic package `supabase/w021_5_staging_master_migration_package_050_066.sql` is **1.86 MB (1,861,557 bytes)**, which exceeded the Supabase Dashboard web editor payload ceiling (~1 MB limit).

### B. Prerequisite Schema Baseline (`relation "public.state_versions" does not exist`)
When executing Step 2A (`02a_prod_phase1_jurisdictions_and_pcs_059.sql`), the editor reported:
```text
ERROR: 42P01: relation "public.state_versions" does not exist
QUERY: SELECT EXISTS ( SELECT 1 FROM public.state_versions WHERE version_code = 'TS-STATE-2014' AND state_code = 'TS' )
```
- **Reason:** The production database (`ehfafcnimmjusyvplbah`) was maintained strictly air-gapped from Job W002 onward (holding baseline schema migrations 001–034).
- Migrations 035 through 042 (Data Governance Foundation, Canonical Geography Model, State Versions, and Parliamentary Constituencies) were previously deployed to Staging during Jobs W010–W015.
- Therefore, before Step 2A can populate the 36 national jurisdictions and 543 Parliamentary Constituencies, the three foundational schema packages (`00a`, `00b`, `00c`) must be applied to establish `public.state_versions`, `public.parliamentary_constituencies`, and `public.dataset_versions`.

---

## 2. Updated Phase 1 Execution Sequence

All packages are located in [`supabase/production_packages/`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/) and are strictly **under 750 KB** (most are under 100 KB).

Execute these in the **Production Supabase SQL Editor (`ehfafcnimmjusyvplbah`)**:

### Step 0A: Prerequisites - Governance & Security Foundation (Migrations 035-039)
- **File:** [`supabase/production_packages/00a_prod_prereq_governance_and_security_035_039.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/00a_prod_prereq_governance_and_security_035_039.sql)
- **Size:** 56,287 bytes (~56 KB)
- **Scope:** Creates `campaign_recharge_orders`, `page_pro_orders`, hardens RLS on 21 tables, establishes `source_authority_enum`, `data_sources`, `datasets`, `dataset_versions`, `provenance_records`, and `evidence_records`.
- **Expected Result:** `Success. No rows returned.`

### Step 0B: Prerequisites - Canonical Geography Model (Migration 040)
- **File:** [`supabase/production_packages/00b_prod_prereq_canonical_geography_040.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/00b_prod_prereq_canonical_geography_040.sql)
- **Size:** 69,431 bytes (~69 KB)
- **Scope:** Adds `internal_id UUID UNIQUE` to `states` and `constituencies`, creates `districts` and `parliamentary_constituencies`, and registers W012 data sources.
- **Expected Result:** `Success. No rows returned.`

### Step 0C: Prerequisites - Geography Versioning & Relationships (Migrations 041-042)
- **File:** [`supabase/production_packages/00c_prod_prereq_geography_versioning_041_042.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/00c_prod_prereq_geography_versioning_041_042.sql)
- **Size:** 87,199 bytes (~87 KB)
- **Scope:** Enables `btree_gist`, creates `delimitation_regimes`, `state_versions` (seeding `TS-STATE-2014`), `district_versions`, `parliamentary_constituency_versions`, `constituency_versions`, `geography_entity_lineage`, and `geography_relationships`.
- **Expected Result:** `Success. No rows returned.`

---

### Step 1: Core Political Entity Model (Migration 050)
- **Status:** **ALREADY COMPLETED SUCCESSFULLY BY USER** (`step 1 success`).
- *(No need to re-run; `01_prod_phase1_core_entity_model_050.sql` is already in place).*

---

### Step 2A: National Jurisdictions & Parliamentary Constituencies (Migration 059 Part A)
- **File:** [`supabase/production_packages/02a_prod_phase1_jurisdictions_and_pcs_059.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/02a_prod_phase1_jurisdictions_and_pcs_059.sql)
- **Size:** 103,312 bytes (~103 KB)
- **Scope:** Canonicalizes all 36 States & UTs (`public.states`), 36 state versions (`public.state_versions`), and 543 Parliamentary Constituencies with versions.
- **Expected Result:** `Success. No rows returned.`

### Step 2B: National Assembly Constituencies (Migration 059 Part B)
- **File:** [`supabase/production_packages/02b_prod_phase1_assembly_constituencies_059.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/02b_prod_phase1_assembly_constituencies_059.sql)
- **Size:** 735,089 bytes (~735 KB)
- **Scope:** Canonicalizes all 4,123 Assembly Constituencies (`public.constituencies`) and 4,123 AC versions (`public.constituency_versions`) with statutory provenance linkages.
- **Expected Result:** `Success. No rows returned.`

### Step 3: Electoral Geography Remediation (Migration 060)
- **File:** [`supabase/production_packages/03_prod_phase1_electoral_geography_remediation_060.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/03_prod_phase1_electoral_geography_remediation_060.sql)
- **Size:** 21,045 bytes (~21 KB)
- **Scope:** Registers first-class statutory delimitation regimes (`delimitation_regimes`), `constituency_lineage`, and `constituency_parliamentary_mappings`.
- **Expected Result:** `Success. No rows returned.`

### Step 4: Canonical National AC <-> PC Mappings (Migration 061)
- **File:** [`supabase/production_packages/04_prod_phase1_canonical_ac_pc_mappings_061.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/04_prod_phase1_canonical_ac_pc_mappings_061.sql)
- **Size:** 697,065 bytes (~697 KB)
- **Scope:** Enforces temporal exclusion constraints and maps all 4,123 Assembly Constituencies to their statutory Parliamentary Constituencies across all 31 legislative jurisdictions.
- **Expected Result:** `Success. No rows returned.`

### Step 5: Delimitation, Political Identity & Org Governance (Migrations 062-064 + DEC-162)
- **File:** [`supabase/production_packages/05_prod_phase1_delimitation_identity_governance_062_064.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/05_prod_phase1_delimitation_identity_governance_062_064.sql)
- **Size:** 56,519 bytes (~57 KB)
- **Scope:** Applies Assam 2023 delimitation transitions (126 ACs, 14 PCs), creates `person_multilingual_identities`, composite keys on `elected_tenures`, `tenure_vacancies`, `organization_multilingual_names`, `organization_symbols`, `organization_aliases`, and enforces `uq_org_rel_natural_key`.
- **Expected Result:** `Success. No rows returned.`

### Step 6: Canonical Political Organizations Registry & Civic Extensions Schema (Migrations 065-066)
- **File:** [`supabase/production_packages/06_prod_phase1_political_organizations_and_civic_schema_065_066.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/06_prod_phase1_political_organizations_and_civic_schema_065_066.sql)
- **Size:** 278,306 bytes (~278 KB)
- **Scope:** Authoritative population of 107 recognized political organizations, 1,043 aliases, multilingual names, symbols, and batch provenance anchor `0215b22c-0000-0000-0000-000000000001` (1,207 rows). Deploys downstream civic extensions schema (`constituency_demographics` and enhanced `candidate_affidavits`).
- **Expected Result:** `Success. No rows returned.`

### Step 7: Phase 1 Verification Gate
- **File:** [`supabase/production_packages/07_prod_phase1_verification_gate.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/07_prod_phase1_verification_gate.sql)
- **Size:** 8,065 bytes (~8 KB)
- **Mode:** Strictly READ-ONLY (0 mutations, 0 DDL)
- **Expected Result:** 9 rows returned, all with `status = 'PASS'`, culminating in:
  ```text
  check_09 | Phase 1 Consolidated Schema Gate Aggregate Verdict | verdict: PROD_PHASE1_PASS | PASS
  ```
