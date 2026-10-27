# W021.5 Stage B — Exhaustive Archived Gazette Candidate Sweep (2026-10-27)

**Disposition:** BOUNDED ARCHIVAL COHORT SWEEP COMPLETED; NO STRICT LEGAL ISSUE MATCH  
**Acceptance:** Original Gazette requirements remain OPEN. W021.5 Stage B remains PARTIAL / NOT ACCEPTED.  
**Execution boundary:** No staging/production database access or mutation; no legal metadata was inferred from filenames alone.

## 1. Executed sweep

- Workflow: https://github.com/kshetra-app/Kshetra/actions/runs/40441693194
- Evidence-only branch commit used by run: `bb063ebe2a60e881c6f32aefebc956a1bcdf0071`
- Workflow ZIP artifact: ID `12707415406`, 751,331 bytes, SHA-256 `1d18e9b47fa48c486be0bed0d4441e004a40d0e3c5fad37c870f5748f1b665e7`
- Durable full manifest: `data/evidence/w021_5/exact_gazette_candidates/manifest.json` in the evidence-only branch; 2,784,999 bytes, SHA-256 `9cb495455409989c709248cf39c4341e78a7a9aaab53bba47e9c84016c8725d5`.
- The manifest preserves every candidate URL and/or capture timestamp, HTTP status, content type, downloaded byte length and SHA-256, parsed PDF page count/text hashes, printed-page metadata checks, and disposition. Candidate bytes are retained only for relevant near-matches; irrelevant PDFs are classified without being promoted as evidence.

| Captured source index | Candidate PDF rows parsed |
|---|---:|
| Legacy eGazette NIC 2018 PDF captures | 378 |
| AP e-Gazette captured PDF cohort | 22 |
| Legacy eGazette NIC 2008 PDF captures | 51 |
| Current eGazette 2008 captured PDF cohort | 6 |
| **Total candidate attempts** | **478** |

Aggregate probe result: **453 valid PDF responses**, 3 retained candidate-PDF files (two distinct byte payloads), 24 direct/archive-fetch failures, **0** printed-metadata matches for original 2008 issue 71, **0** strict 2008 Gazette legal-content matches and **0** strict 2018 `O.N.55(E)` Gazette matches. The scope is the recorded captured cohorts; it is not a complete census of every Gazette document ever issued.

## 2. Raw near-matches were rejected

### Candidate A — Gazette of India No. 551, 30 May 2008

- Original URL: `https://egazette.gov.in/WriteReadData/2008/E_55_2008_002.pdf`
- Archived capture: `20231224171122`
- Raw PDF: 205,737 bytes
- SHA-256: `084ee63af78e5eb040cc57a8272bb491b14d20db7b4449a35e66b493596b04ec`
- Parsed printed metadata: Gazette of India Extraordinary No. 551, Friday 30 May 2008. Text pertains to Delimitation Commission Order No. 60 and O.N. 62(E), a Delhi-related order.
- Ruling: **REJECTED.** This is not the original Gazette issue dated 19 February 2008 and not the 2018 O.N.55(E) issue. The identical bytes were encountered twice through different directory/cohort paths and are counted as one distinct payload.

### Candidate B — Gazette of India No. 706, 23 May 2008

- Original URL: `http://egazette.nic.in/WriteReadData/2008/E_706_2008_001.pdf`
- Archived capture: `20200611023820`
- Raw PDF: 94,723 bytes
- SHA-256: `bc33aca9f7743bacc6ae360450e796ee41db24b962265809f8a17166db3c24cb`
- Parsed printed metadata: Gazette of India No. 706, Friday 23 May 2008. The text recites S.O. 382(E), dated 19 February 2008, but the issue itself is a subsequent Delhi delimitation-related instrument.
- Ruling: **REJECTED.** A later issue citing S.O.382(E) is not the original 19 February Gazette issue or the consolidated ECI Order PDF. It cannot resolve the conflict between internal references to S.O.382(E), S.O.383(E) and S.O.453(E).

No file was labelled as the target because its filename contained `55`, `71`, `382`, `383` or `453`; printed issue metadata and document content were required.

## 3. Follow-up archive queries that remain unresolved

The run added exact URL variants for `E_71_2008_001.pdf`, `E_71_2008_002.pdf`, `E_382_2008_001.pdf`, `E_383_2008_001.pdf` and `E_453_2008_001.pdf`, plus searches against the observed AP Gazette upload-ID directory. These Internet Archive CDX requests timed out or failed connection establishment. **No response record was obtained for those additional queries.** They are not counted as searched and do not establish that the target files do not exist.

The live Government eGazette search/root endpoints also failed in this runner (TLS verification/host resolution); the live AP e-Gazette root returned HTTP 403. TLS verification remained enabled. No access-control bypass was attempted.

## 4. Official OGD India PIN-boundary resource retry

A separate official Open Government Data India resource probe completed in workflow run https://github.com/kshetra-app/Kshetra/actions/runs/40441944926.

- Target catalogue: `https://data.gov.in/resource/all-india-pincode-boundary-geojson`
- Evidence manifest: `data/evidence/w021_5/india_post_pin_boundary_candidate/manifest.json` (committed on the evidence-only branch).
- Direct `data.gov.in` / `api.data.gov.in` connection attempts were refused; a `www.data.gov.in` API attempt returned HTTP 503 (280 response bytes, SHA-256 `fc8dcf6cd521e71802b97f387e7c3739f1f44d7f9ad5ca990cc9cd927d3cee17`).
- Three Internet Archive CDX queries for the exact catalogue URL variants returned HTTP 200 with an empty 3-byte response (SHA-256 `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`); no captured resource page was available from these exact queries.
- Result: **0 raw PIN boundary resources acquired** in this retry.

This result does not close or narrow the actual delivery-beat requirement. Even a PIN-boundary dataset would be an explicitly separate postal-area layer; PIN-code boundaries are not individual postman delivery-beat polygons. India Post operational manuals establish that local postal maps and delivery-beat lists are maintained as operational records, but there is still no authenticated custodian reply or nationwide digital-beat geometry acquired.

## 5. Current Stage B disposition

Still open:

1. Original Gazette of India issue of 19 February 2008 (including authentic Gazette number, Part/Section, page range and raw/certified issue bytes) and resolution of the S.O.382(E)/S.O.383(E)/S.O.453(E) conflict.
2. The actual Gazette of India O.N.55(E) issue dated 22 September 2018 and the Andhra Pradesh State Gazette counterpart/certified copy for ECI Notification 282/AP/2018(DEL).
3. Complete jurisdiction-by-jurisdiction legal instrument chain and effective-date reconciliation.
4. Accepted official national AC geometry and legal extent-to-polygon validation.
5. National polling-station-to-AC crosswalk beyond the completed Delhi slice.
6. Actual India Post delivery-beat geometry or an authenticated and retained custodian answer establishing coverage/access.

**Final ruling:** This sweep closes a documented tranche of archival search work and records two rejected near-matches; it does not close any original Gazette requirement. W021.5 Stage B remains PARTIAL / NOT ACCEPTED. EB-01 through EB-05 and W021.5-B1-04 remain open; EB-06 awaits independent adjudication. Stage C and database access remain unauthorized.
