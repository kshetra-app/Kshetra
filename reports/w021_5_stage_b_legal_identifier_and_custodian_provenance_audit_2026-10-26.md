# W021.5 Stage B — Legal Source Recovery and Custodian Provenance Reconciliation

**Updated:** 2026-10-26  
**Authority:** CTO Directive 154 — Stage B only  
**Overall disposition:** PARTIAL / NOT ACCEPTED. Several source sub-gaps have been narrowed with durable, hash-verified captures. The separate original Gazette issue/certification, full jurisdictional legal chain, national canonical AC geometry, nationwide polling-station crosswalk and authenticated postal-beat evidence remain open. No Stage C, staging/production database access or database mutation occurred.

## 1. ECI Delimitation Order, 2008 — consolidated ECI PDF bytes acquired as an archival copy

The exact URL and content were recovered in workflow [40335906727](https://github.com/kshetra-app/Kshetra/actions/runs/40335906727), archived durably on the evidence-only branch cto/w0215-stage-b-evidence-20261025 at commit b0e825de6b1c5870f95c5a8ca46d2a3d4bd1dfa8.

| Attribute | Verified value |
|---|---|
| Exact ECI source URL | https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf |
| Internet Archive capture URL | https://web.archive.org/web/20260804161908id_/https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008(English).pdf |
| Capture time (UTC) | 2026-08-04T16:19:08Z |
| Raw PDF bytes | 1,340,728 |
| Raw PDF SHA-256 | 9e1ac49aa952febc8e4f57ed23abd28218a21887f355f8dad1502ab5c0d65e69 |
| PDF format / pages | PDF 1.5 / 572 pages |
| Captured artifact ZIP | 8,227,705 bytes, SHA-256 009c7f5270187c3cd8bfe3639c042979d35f8be3d390beea2bac289ed489a70f |
| Raw source path | stage_b_archival_recovery/raw/ECI_2008_ORDER_CURRENT_URL_wayback_20260804161908.pdf |

Three archive records for the current ECI URL spelling, filename variant and legacy ECI URL returned identical 1,340,728-byte payloads and identical SHA-256. The acquisition harness verified PDF magic, opened the file with PyMuPDF, parsed all 572 pages and reviewed the contents/schedule/table headers. The live current ECI endpoint still returned HTTP 406 with an HTML error response; no HTTP error response is treated as a legal document.

**Classification:** the bytes are an archival copy captured from the exact official ECI URL, not a direct 2026 ECI-host response and not a certified physical copy. This closes the raw-byte/hash acquisition sub-gap for the consolidated ECI Order. It does **not** close the independent original Gazette of India issue/certification requirement.

## 2. 2008 publication reference and schedule numbering — corrected, Gazette issue still open

The source record for the official 2023 Gazette recital was also acquired and hashed:

- Original official URL: https://egazette.gov.in/WriteReadData/2023/248113.pdf
- Wayback capture: https://web.archive.org/web/20231224180839id_/https://egazette.gov.in/WriteReadData/2023/248113.pdf
- Capture time: 2023-12-24T18:08:39Z
- Raw bytes: 1,204,886; SHA-256 43d99d7ba5d23cc033752637ac7f55ce11133fc27346f1cad9ac5223f77501c5
- PDF: 3 pages, PDF 1.6
- Gazette metadata read from the file: Gazette of India Extraordinary, Part II, Section 3, Sub-section (ii), No. 3502, dated 16 August 2023; notification S.O.3661(E).

Its text says the 2008 Delimitation Order was published via S.O.382(E), dated 19 February 2008. This supports **S.O.382(E)** as the publication reference for the Order. Earlier internal references that labelled S.O.383(E)/S.O.453(E) as the Order's publication number were unsupported by the evidence reviewed and were removed from the corrected Gazette inventory. We do not infer what those other notifications represent without acquiring their own source issues.

The recovered 2008 ECI PDF contents establish:
- Schedule I, pages 4–5: Lok Sabha seat-allocation summary.
- Schedule II, pages 6–7: Legislative Assembly seat-allocation summary.
- Schedule III, pages 8–32: composite Andhra Pradesh (pre-2014 successor-state split).
- Schedule III, Table A: Assembly constituencies and their territorial extents.
- Schedule III, Table B: Parliamentary constituencies and their territorial extents.
- Schedule XXXI, pages 543–556: Delhi.
- Schedule XXXII, pages 557–560: Puducherry.
- Jammu and Kashmir Assembly extents: Annexure, pages 561–571.

There is no separate Telangana schedule in the 2008 ECI Order. The 2014 Act and later instruments are required to establish the successor-state legal regime. The erroneous W021.5 Schedule II/Table B and Schedule XXXI/Telangana extracts are invalidated. The older W015 B2 extract data/evidence/w015_b2/eci_delimitation_2008_schedule_xxxi.txt was also replaced with an explicit invalidation warning in commit bcf3b3f3bdbaa3887663256825e9dcfc5bd748f1.

**Still open:** original Gazette of India issue for S.O.382(E), its exact issue number/Part/Section/page range, source bytes, and certified/physical authentication. The ECI consolidated PDF and the 2023 Gazette recital are not substitutes for that issue.

## 3. O.N.55(E), 22 September 2018 — identifier corroborated; Gazette bytes not acquired

The official live Lok Sabha proceedings PDF was acquired during the same recovery run:

- URL: https://sansad.in/getFile/debatestextmk/16/XVI/19.12.2018.pdf?source=loksabhadocs
- HTTP status: 200; bytes: 638,561; SHA-256 e4be3f9256b1b1db9fe74fdb6e3f19985b2bca355a1df686b822cb97cf89b1a1
- PDF: 1.7, 136 pages.
- Printed page 36 / PDF page index 35 states that Notification O.N.55(E), Hindi and English versions, was published in the Gazette of India dated 22 September 2018, about Andhra Pradesh delimitation and updating Schedule III of the 2008 Order.
- Library accession for the laid-paper copy: LT 10017/16/18.

This is direct official parliamentary corroboration of the Gazette identifier and date, **not the Gazette issue itself**. The exact eGazette issue/PDF, its complete issue metadata and the Andhra Pradesh State Gazette counterpart/certified copy remain open.

The repository also retains the primary ECI Notification No. 282/AP/2018(DEL) PDF at data/evidence/delimitation/authoritative/eci_notification_282_ap_2018_del.pdf; its dossier records 102,133 bytes and SHA-256 13201bb665a5d29853862d0bc0c07175c319a61d5b39b2c838fd0ec3882737da, retrieved 2026-10-25. An independent exact-URL Wayback search found no PDF capture for the ECI backend URL; the current direct endpoint returned HTTP 406 error HTML. The notification PDF is a distinct ECI instrument, not proof of the raw Gazette issue.

## 4. Gazette transcription fidelity report — prior 100% claim invalidated

The previous reports/w021_5_gazette_transcription_fidelity_report.json claimed 100% fidelity for 4,123 current records and labelled Schedule I as Andhra Pradesh/Telangana. That schedule/period premise conflicts with the recovered ECI order. Its acceptance score is therefore **withdrawn** pending a rebuild against the pinned 2008 source bytes and explicit successor-state effective-date/legal-instrument chain.

The fidelity JSON now labels the previous scores as superseded historical claims, clears the purported acceptance scores, and records the invalidation rationale in commit 34be6d1e1729dc7120dcee2a061c7b1ed82d9aad. No national current-seat fidelity score should be reported until each applicable legal period is reconstructed and audited separately. Digital comparison against a historical source cannot substitute for the original Gazette/certification requirement.

## 5. India Post delivery-beat evidence — no verified custodian answer or national geometry acquired

The exact-source archival recovery run acquired the official India Post homepage HTML (399,773 bytes, SHA-256 033278921d179aa58697172006bcfbe99e4ecbbfb7bd415eb0c9867542151505) as discovery material. It did not find an exact Wayback PDF capture for the previously identified postal operations manual candidate, and the direct document URL returned HTTP 400 (49-byte error payload). No national delivery-beat polygon dataset was acquired.

The internal report reports/w021_5_india_post_geography_assessment.json must not be read as evidence of a direct Department of Posts response unless the original reply, correspondence reference or submission acknowledgement is retained. The custodian request pack remains drafted and not sent; no agency response ID is claimed. The following are not equivalent data types:
- individual postman delivery-beat boundaries;
- local postal maps and operational beat-list books;
- post-office locations;
- PIN-code directories or PIN-code service-area polygons.

The official homepage is not proof that a nationwide delivery-beat GIS layer exists or does not exist. A verified Department of Posts/CEPT custodian response or an actual authorized data release is still required. No request was submitted in this run.

## 6. Remaining external evidence gates

| Requirement | Current disposition |
|---|---|
| ECI 2008 consolidated Order raw bytes/hash | **Acquired as exact-URL archival copy**; not a direct live-host response |
| Original 2008 Gazette issue / certified copy / issue metadata | **OPEN** |
| Gazette of India O.N.55(E), 22 September 2018, actual issue PDF | **OPEN** |
| Andhra Pradesh State Gazette counterpart or certified copy | **OPEN** |
| Jurisdiction-by-jurisdiction legal instrument chain/effective dates | **OPEN; must rebuild after schedule invalidation** |
| National official canonical AC geometry and legal extent-to-polygon validation | **OPEN**; third-party 4,129-file candidate rejected as non-official |
| Telangana seven-AC discrepancies and invalid Dornakal polygon | **OPEN**; no candidate accepted as canonical |
| Authorized national polling-station-to-AC crosswalk | Delhi 70/70 slice acquired; nationwide scope **OPEN** |
| India Post actual delivery-beat geometry or authenticated custodian evidence | **OPEN** |

## 7. Authoritative repository records updated

- Source register: reports/w021_5_source_acquisition_register.json, updated in commit ef69506e30c6a2834ee95fcdf91108a5a8034e55, now 54 source records and records the 2008 PDF, 2023 Gazette recital and Lok Sabha proceedings hashes.
- Official Gazette inventory: reports/w021_5_official_gazette_inventory.json, corrected schedule/table map and S.O.382(E) reference; its disposition still explicitly keeps the original 2008 and 2018 Gazette issues open.
- Transcription fidelity report: prior 100% acceptance claim withdrawn in commit 34be6d1e1729dc7120dcee2a061c7b1ed82d9aad.
- Legacy W015 schedule extract: invalidated in commit bcf3b3f3bdbaa3887663256825e9dcfc5bd748f1.

**Final status:** W021.5 Stage B remains **PARTIAL / NOT ACCEPTED**. EB-01 through EB-05 and W021.5-B1-04 remain open; EB-06 awaits independent adjudication. No national canonical AC geometry has been accepted. Stage C and all staging/production database access remain unauthorized.
