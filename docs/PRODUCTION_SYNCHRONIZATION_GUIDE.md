# PRODUCTION SYNCHRONIZATION GUIDE: KSHETRA / PANIN
## Step-by-Step Air-Gap Resolution & Production Database Parity Procedure

**Target Environment:** Production Supabase (`ehfafcnimmjusyvplbah` / `https://ehfafcnimmjusyvplbah.supabase.co`)  
**Staging Reference:** panIN-staging (`fkpigozcqnmcvofuksar`) — 100% Verified (10/10 PASS: `POST_STAGING_DEPLOY_PASS`)  
**Authority:** Master Execution Framework Amendment v1.6 / DEC-164 & DEC-165  
**Governing Standard:** Zero Hallucination, 100% Empirical Verification, Bitwise Idempotency  

---

## 1. Executive Summary & Root Cause of SQL Editor Payload Limit

During the authorized production synchronization attempt, executing the monolithic package `supabase/w021_5_staging_master_migration_package_050_066.sql` produced the following error in the Supabase Web Dashboard:

```text
Error: Query is too large to be run via the SQL Editor
Run this query by connecting to your database directly.
```

### Forensic Root Cause
1. **Payload Size Ceiling:** The Supabase Dashboard web client imposes a client-side API gateway payload threshold of approximately **1 MB (1,048,576 bytes)** for HTTP-based query execution.
2. **Monolithic Bundle Metrics:** `w021_5_staging_master_migration_package_050_066.sql` combines 9 migrations into a single file of **1,861,557 bytes (1.86 MB)** and 13,580 lines—nearly double the web editor ceiling.
3. **Chunking Resolution:** To enable execution entirely within the Supabase Web SQL Editor without requiring direct CLI connection strings or passwords, Phase 1 has been decomposed into **discrete, sequential packages strictly under 700 KB each** (`supabase/production_packages/`).

---

## 2. Production Synchronization 4-Phase Roadmap

```
Phase 1: Base Schemas & National Geography / Party Registries
  ├── 01: Core Entity Model (Migration 050) [30 KB]
  ├── 02a: National Jurisdictions & PCs (Migration 059-R1 Part A) [103 KB]
  ├── 02b: National Assembly Constituencies (Migration 059-R1 Part B) [735 KB]
  ├── 03: Electoral Geography Remediation (Migration 060) [21 KB]
  ├── 04: Canonical AC <-> PC Mappings (Migration 061) [697 KB]
  ├── 05: Delimitation, Identity & Org Governance (Migrations 062-064) [57 KB]
  ├── 06: Canonical Organizations & Civic Schema (Migrations 065-066) [278 KB]
  └── 07: Phase 1 Verification Gate [8 KB] (Must return PROD_PHASE1_PASS)
         │
         ▼
Phase 2: Stage D Canonical Data Population (Persons, Candidacies, Tenures)
  ├── Chunks 01 to 10 in supabase/staging_packages/065_b2_2d_chunked/ (< 600 KB each)
  ├── Post-population enrichment patch
  └── Chunk 11 Verification Gate (Must return 48,284 rows)
         │
         ▼
Phase 3: Stage E Civic Data Population (Disclosures, Demographics, Lineage)
  ├── Chunks 01 to 08 in supabase/staging_packages/066_b2_2e_chunked/ (< 420 KB each)
  └── Post-066 Consolidated Gate (Must return 11/11 PASS)
         │
         ▼
Phase 4: SaaS Foundation & Outbound Webhooks / Delimitation Watch Engine
  ├── Consolidated Package: supabase/staging_packages/w022_job023_consolidated_staging_deployment.sql [61 KB]
  └── Post-Staging Gate 068-071 (Must return 10/10 PASS)
```

---

## 3. Phase 1 Execution Sequence (Production Supabase SQL Editor)

Execute the following 7 scripts sequentially in the **Supabase SQL Editor** on **Production** (`ehfafcnimmjusyvplbah`):

### Step 1: Core Political Entity Model (Migration 050)
- **File:** [`supabase/production_packages/01_prod_phase1_core_entity_model_050.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/01_prod_phase1_core_entity_model_050.sql)
- **Size:** 29,933 bytes (~30 KB)
- **Scope:** Creates `data_status_enum`, `canonical_persons`, `candidacies`, `elected_tenures`, `person_party_affiliations`, `tenure_party_switches`, `organization_relationships`, `pages`, `person_roles`, and audit triggers.
- **Expected Result:** `Success. No rows returned.`

### Step 2A: National Jurisdictions & Parliamentary Constituencies (Migration 059 Part A)
- **File:** [`supabase/production_packages/02a_prod_phase1_jurisdictions_and_pcs_059.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/02a_prod_phase1_jurisdictions_and_pcs_059.sql)
- **Size:** 103,312 bytes (~103 KB)
- **Scope:** Establishes national dataset versions, `migration_conflicts` table, 36 States & UTs in `public.states`, 36 State versions in `public.state_versions`, 543 Parliamentary Constituencies in `public.parliamentary_constituencies`, and 543 PC versions in `public.parliamentary_constituency_versions`.
- **Expected Result:** `Success. No rows returned.`

### Step 2B: National Assembly Constituencies (Migration 059 Part B)
- **File:** [`supabase/production_packages/02b_prod_phase1_assembly_constituencies_059.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/02b_prod_phase1_assembly_constituencies_059.sql)
- **Size:** 735,089 bytes (~735 KB)
- **Scope:** Canonicalizes 4,123 Assembly Constituencies in `public.constituencies`, 4,123 AC versions in `public.constituency_versions`, statutory provenance linkages, and conflict audit records.
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
- **Scope:** Authoritative population of 107 recognized political organizations, 1,043 aliases, 27 multilingual names, 19 symbols, 10 relationships, and batch provenance anchor `0215b22c-0000-0000-0000-000000000001` (1,207 total rows). Establishes downstream civic extensions datasets and versions, enhances `candidate_affidavits` with relational foreign keys, and deploys `constituency_demographics` with Row Level Security.
- **Expected Result:** `Success. No rows returned.`

### Step 7: Phase 1 Verification Gate
- **File:** [`supabase/production_packages/07_prod_phase1_verification_gate.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/production_packages/07_prod_phase1_verification_gate.sql)
- **Size:** 8,065 bytes (~8 KB)
- **Mode:** Strictly READ-ONLY (0 mutations, 0 DDL)
- **Expected Result:** 9 rows returned, all with `status = 'PASS'`, culminating in:
  ```text
  check_09 | Phase 1 Consolidated Schema Gate Aggregate Verdict | verdict: PROD_PHASE1_PASS | PASS
  ```
