# W016: Real Geographic Mapping Verification Report

- **Milestone:** W016
- **Title:** Real Geographic Mapping — Coordinate Spatial & Postal Crosswalk Integration
- **Verification Authority:** Amendment v1.5-A & Rule IV-001 Non-Self-Acceptance
- **Executed At:** 2026-10-29T17:21:39.057Z
- **Baseline Git SHA:** `09ebac686462ce94a8c6b1d13d1a856c32fa05fb`
- **Result:** **100% PASS**

---

## 1. Spatial Resolution ([lat, lng] -> AC)
- **Centroid Resolution:** Verified against known assembly constituencies (Kodangal AC 72, Mancherial AC 4, Charminar AC 66).
- **Out of Boundary:** Coordinates outside Indian territorial boundaries ([0, 0]) fail closed cleanly with `constituency: null` and `confidence: 0`.
- **Adversarial Checks:** Inputs exceeding `[-90, 90]` or `[-180, 180]` and non-numeric values are rejected immediately with `INVALID_COORDINATES`.

---

## 2. Postal Crosswalk (PIN -> AC)
- **Single-AC Determinism:** Valid 6-digit postal codes mapping unambiguously to a single AC (e.g. 504208 -> Mancherial) return `singleMatch: true` and weight `1.0`.
- **Multi-AC Concordance:** Multi-constituency postal zones (e.g. 500001 Hyderabad GPO) return all candidate ACs (Goshamahal AC 65, Nampally AC 63, Malakpet AC 58) with overlap weights summing to 1.0 and locality descriptions, preventing heuristic misrepresentation.
- **Fail-Closed Format:** Alphanumeric, 5-digit, and 7-digit inputs fail closed with `INVALID_PIN_CODE`. Unmapped PINs return zero candidate entities.
