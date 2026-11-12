# W016: Geographic Lookup Contract Checks

- **Milestone:** W016
- **Title:** Development Lookup Behavior, PIN Reference Semantics, and Input Validation
- **Executed At:** 2026-11-11T20:56:06.889Z
- **Result:** **LIMITED — LOCAL CHECKS PASSED; PRODUCTION POSTGIS NOT VERIFIED BY THIS SCRIPT**
- **Scope:** This script uses local development lookup behavior and a PGlite PostgreSQL emulation. It does not call the production PostGIS RPC or HTTP endpoints.

---

## 1. Local Development Lookup and Input Validation
- **Local reference checks:** Development lookup resolves the checked-in Telangana examples for Kodangal AC 72, Mancherial AC 4, and Charminar AC 66.
- **Unmapped coordinate:** [0, 0] returns no constituency.
- **Adversarial inputs:** Out-of-range and non-numeric coordinates are rejected with `INVALID_COORDINATES`.
- **PGlite example:** A bounding-box query returns its expected row in PGlite. This is not a PostGIS test and does not verify polygon containment.

---

## 2. Postal Crosswalk (PIN -> AC)
- **Provisional PIN references:** PIN 500002 points to one reviewed candidate (Charminar AC 66), but remains provisional with no exact-match or probability claim.
- **Multi-AC ambiguity:** PIN 500001 returns the documented candidates (Goshamahal AC 65, Nampally AC 63, Malakpet AC 58) without invented overlap weights.
- **Fail-Closed Format:** Alphanumeric, 5-digit, and 7-digit inputs fail closed with `INVALID_PIN_CODE`. Unmapped PINs return zero candidate entities.

## Not Verified Here
- The production `locate_constituency_point_truthful` PostGIS RPC, its deployed migration, live database boundaries, and API endpoint behavior are outside this script's checks.
