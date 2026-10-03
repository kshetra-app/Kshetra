# B2.2-C PRE-FLIGHT MIGRATION DESIGN REPORT
## Canonical Political Organization Registry Population Architecture

**Repository:** `kshetra-app/Kshetra`  
**Milestone:** `W021.5-B2.2-C Pre-Flight`  
**Authority:** Master W021.5 Execution Framework  
**Pre-Flight Status:** **READ-ONLY DESIGN FREEZE — IMPLEMENTATION STRICTLY BLOCKED**  

---

### 1. Existing Registry Inventory & Collision Mitigation

The existing `public.political_organizations` table contains 15 rows seeded during Migration 053 for benchmark assembly constituencies (Kodangal AC-65 and Gajwel AC-40):
* **National Parties (4):** INC, BJP, BSP, (CPI in tests)
* **State Parties (1):** BRS
* **Unrecognized Local Parties (10):** YTP, DHSP, BMP, TERS, AABAAD, PPP, IPBP, SPI, MTRSP, SAPS

**Mitigation Rule for B2.2-C:**
Phase C1 must NOT perform a blind `INSERT INTO public.political_organizations`. All operations must use deterministic natural keys:
```sql
INSERT INTO public.political_organizations (
  id, org_type, name, short_name, recognition_level, headquarters_state, provenance_id, data_status
) VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  recognition_level = EXCLUDED.recognition_level,
  data_status = EXCLUDED.data_status;
```

---

### 2. Eight-Phase Structured Population Architecture

1. **Phase C1: Canonical Organization Master Registry (`public.political_organizations`)**
   * Scope: 92 canonical national, state, and recognized regional political parties.
   * Key Invariant: Natural ID format `ORG-PARTY-<UPPERCASE_CODE>`. Zero synthetic IDs.
2. **Phase C2: Deterministic Organization Aliases (`public.organization_aliases`)**
   * Scope: 285 standard abbreviations, typo variants, and regional designations.
   * Key Invariant: Unique per `(raw_lookup_key, COALESCE(valid_from, '1947-08-15'))`.
3. **Phase C3: Historical Predecessor Organizations (`public.political_organizations`)**
   * Scope: 12 historical predecessor organizations (e.g., `ORG-PARTY-TRS`, `ORG-PARTY-BJS`).
   * Key Invariant: Marked `data_status: 'OFFICIAL'`, historical valid dates.
4. **Phase C4: Multilingual & Multi-Script Names (`public.organization_multilingual_names`)**
   * Scope: 140+ native-script party identities across 13 Indian languages (Devanagari, Telugu, Tamil, Bengali, Kannada, Malayalam, Gurmukhi, Odia, Gujarati, Urdu, Perso-Arabic, Latin).
   * Key Invariant: Unique per `(organization_id, language_code, script_code, representation_type, name_value)`.
5. **Phase C5: Temporal Election Symbols (`public.organization_symbols`)**
   * Scope: 45 statutory symbol allocations tracking dispute orders and splits.
   * Key Invariant: `uq_org_symbols_timeline (organization_id, symbol_name, valid_from)`.
6. **Phase C6: Organization Relationships & Alliances (`public.organization_relationships`)**
   * Scope: 22 statutory relationships (splits, mergers, renames, coalitions).
   * Key Invariant: `source_org_id <> target_org_id`.
7. **Phase C7: Reconciliation Ledger Linkage Validation**
   * Scope: Automated foreign key assertion testing that all 1,096 raw party entries in Ledger V2 point to valid canonical entities or null.
8. **Phase C8: Provenance Sealing**
   * Scope: Dedicated provenance record `0215b22c-0000-0000-0000-000000000001` anchoring the entire canonical organization layer.

---

### 3. Zero-Silent-Correction Governance

Every party string mapped during B2.2-C migration must adhere to the 7-stage lineage pipeline:
$$\text{Raw Source File} \longrightarrow \text{Raw String} \longrightarrow \text{Normalized Key} \longrightarrow \text{Resolution Rule} \longrightarrow \text{Canonical Org ID} \longrightarrow \text{Evidence Ref} \longrightarrow \text{Confidence Tier}$$

No heuristic guessing or unverified mapping is permitted.

---

### 4. Rollback Plan

Should any validation check fail during migration:
```sql
DELETE FROM public.organization_relationships WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001';
DELETE FROM public.organization_symbols WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001';
DELETE FROM public.organization_aliases WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001';
DELETE FROM public.organization_multilingual_names WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001';
DELETE FROM public.political_organizations WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001';
DELETE FROM public.provenance_records WHERE id = '0215b22c-0000-0000-0000-000000000001';
```

---

### 5. Final Pre-Flight Gate Recommendation

The architecture is complete, verified, and sealed. Migration execution remains strictly blocked pending explicit CTO authorization.
