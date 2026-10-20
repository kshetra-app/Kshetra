# KSHETRA W021.5 — CTO DIRECTIVE 117
## Independent Assam 2023 Temporal Delimitation & Lineage Audit

**Target Migration:** `supabase/migrations/062_canonical_assam_2023_delimitation.sql`  
**Directive:** CTO Directive 117 (Workstream D3)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Date:** 2026-10-20  

---

## 1. Executive Summary

In adherence to Directive 117 Section 5 (D3), Migration 062 was independently inspected and validated against official statutory sources:

- **Effective Cutoff Date:** `2023-08-16` (verified against Gazette of India Extraordinary No. 434).
- **Statutory Seats:** 126 Assembly Constituencies, 14 Parliamentary Constituencies.
- **Reservation Breakdown:** 98 General, 9 SC, 19 ST (Sum = 126).
- **Temporal Demarcation:** Pre-2023 versions archived (`valid_to = '2023-08-16'`, `is_current = false`); 2023 versions activated (`valid_from = '2023-08-16'`, `is_current = true`).
- **Cross-Regime Lineage Graph:** Retained as **`ASSAM_HISTORICAL_LINEAGE_PENDING`**.

---

## 2. Statutory Authority & Citations

1. **ECI Delimitation Final Order:** Order No. `282/AS/2023(DEL)/Vol.V` dated 11 August 2023.
2. **Statutory Basis:** Section 8A of the Representation of the People Act, 1950, and Delimitation Act, 2002.
3. **Evidence Record:** Registered in migration with immutable UUID `a55a0023-0000-4000-8000-000000000001`.
4. **Primary Dataset Version:** Registered as `eci_national_ac_2023_as_v1`.

---

## 3. Temporal Cutoff & Versioning Mechanism

Migration 062 implements a strict temporal cutoff to preserve historical election integrity:

```sql
-- Archive pre-2023 AC versions
UPDATE public.assembly_constituency_versions
SET
  valid_to = '2023-08-16'::date,
  is_current = false,
  updated_at = now()
WHERE ac_id IN (SELECT id FROM public.constituencies WHERE state_code = 'AS')
  AND is_current = true;

-- Insert 126 new 2023 AC versions
INSERT INTO public.assembly_constituency_versions (
  ac_id, delimitation_regime_id, version_code, ac_number, name, district, reservation_status,
  valid_from, valid_to, is_current, primary_dataset_version_id
) ...
```

This ensures that elections conducted prior to August 2023 (such as the 2021 Assam Legislative Assembly election) query the archived 2008 boundaries and names, while modern post-August 2023 queries resolve the reshaped 2023 boundaries.

---

## 4. Preservation of `ASSAM_HISTORICAL_LINEAGE_PENDING`

The 2023 Delimitation fundamentally altered Assam's electoral landscape. Several constituencies were newly created or split (e.g. `Baokhungri`, `Birsing Jarua`, `Pakabetbari`), while others were abolished or repartitioned.

Attempting to draw automated 1:1 lineage edges based on name similarity is mathematically and legally unsound. In strict compliance with Directive 117, cross-regime territorial lineage edges remain **`ASSAM_HISTORICAL_LINEAGE_PENDING`** until official ECI/CEO territorial concordance tables can be independently reviewed.
