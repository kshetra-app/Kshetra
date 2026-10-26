# W021.5 Stage B — Repository Artifact Verification Correction (2026-10-26)

**Disposition:** PARTIAL EVIDENCE GAP CLOSED FOR ECI NOTIFICATION PDF BYTES; GAZETTE ISSUE AND 2008 ORDER REMAIN OPEN  
**Authority:** CTO Directive 154 — Stage B only  
**Acceptance:** Stage B remains PARTIAL / NOT ACCEPTED.

## Correction discovered during deeper repository inspection

The prior supplemental report and state note incorrectly treated ECI Notification No. 282/AP/2018(DEL) as not acquired. A repository artifact check found the PDF already retained on master:

- **Artifact:** data/evidence/delimitation/authoritative/eci_notification_282_ap_2018_del.pdf
- **Repository URL:** https://github.com/kshetra-app/Kshetra/blob/master/data/evidence/delimitation/authoritative/eci_notification_282_ap_2018_del.pdf
- **Bytes:** 102,133
- **SHA-256 independently recomputed from decoded repository bytes:** 13201bb665a5d29853862d0bc0c07175c319a61d5b39b2c838fd0ec3882737da
- **Git blob SHA:** 9e89a57a136249cbc523f5d3125bdb4741a62859
- **Validation:** %PDF- magic present; %%EOF marker present; three /Type /Page objects counted; computed SHA-256 matches the digest in the existing provenance dossier.
- **Existing dossier:** data/evidence/delimitation/authoritative/eci_notification_282_ap_2018_polavaram_dossier.md (blob SHA 74f522d30e99b238439f823b7acb936990861294) records the exact official ECI backend URL and retrieval timestamp 2026-10-25T17:42:55.000Z.

The verification performed here independently recomputed the hash and structural signatures from the repository-retained bytes. It did not repeat the original HTTP retrieval, so the ECI host/timestamp attribution is based on the existing committed provenance dossier and matching digest, not a newly observed network transfer. The PDF is now correctly represented as bytes-present/hash-verified, not as an unacquired indexed-text lead.

## Repository updates

- Source register updated in commit 9d168b4b938bf58986e0abbbae40ebe933f1b64a; the canonical notification record now includes artifact path, 102,133-byte size, SHA-256, Git blob SHA, three-page structural check, and prior HTTP 406 history. The indexed-text record is marked as superseded for byte availability.
- The official Gazette custodian-route expansion is recorded in reports/w021_5_stage_b_official_gazette_custodian_route_expansion_2026-10-26.md.
- No evidence was fabricated: the digest is computed from actual repository bytes and matches the committed dossier.

## What this closes — and what it does not

**Closed for this specific artifact:** presence and byte-integrity verification of the ECI notification PDF retained in the repository.

**Still open:**
1. The exact Gazette of India, Extraordinary, Part II, Section 3, Sub-section (iii) issue and Andhra Pradesh State Gazette counterpart, including issue identifiers/page range and raw Gazette bytes or certified copies.
2. The original ECI Delimitation of Parliamentary and Assembly Constituencies Order, 2008 PDF bytes and integrity/provenance validation.
3. Full jurisdiction-by-jurisdiction legal instrument chain and effective-date reconciliation.
4. Current national canonical AC geometry and legal extent-to-polygon validation; the Telangana candidate-family disagreement and invalid Dornakal polygon remain unresolved.
5. Authorized polling-station-to-AC crosswalk and India Post delivery-beat evidence/custodian confirmation. PIN-code boundaries are not delivery-beat evidence.

## Acceptance and safety

W021.5 Stage B remains **PARTIAL / NOT ACCEPTED**. EB-01–EB-05 and W021.5-B1-04 remain open; EB-06 remains pending independent adjudication. No national canonical AC geometry is accepted. No staging/production database access or mutation occurred; Stage C remains unauthorized.