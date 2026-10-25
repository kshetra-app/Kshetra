# W021.5 Stage B — Acquisition Route Exhaustion and Next-Method Decision

**As of:** 2026-10-25 UTC  
**Authority:** CTO Directive 154; Stage B only  
**Status:** Evidence acquisition in progress; Stage B remains PARTIAL / NOT ACCEPTED  
**Production/staging:** No database access or mutation.

## 1. Decision

Do not continue repeating the same ECI URL or promote a third-party national shapefile. The most defensible path is a **jurisdiction-by-jurisdiction, source-layered evidence pipeline**:

1. Treat the applicable ECI delimitation order, amendments/corrigenda, and Central/State Gazette effective dates as legal truth.
2. Acquire vector geometry from official ECI/CEO/state GIS endpoints when they expose polygons, preserving raw response bytes, HTTP metadata, SHA-256, retrieval timestamp, source CRS, layer metadata and licence/temporal-validity statements.
3. Use official results portals only as discovery/secondary corroboration until the exact geometry endpoint and source lineage are proven.
4. Reconcile every polygon to a canonical statutory AC roster, topology checks, state coverage and legal effective-date chain. A structurally valid polygon is not automatically the legally effective boundary.
5. Where a custodian does not publish usable bytes, issue a specific official data request (and RTI request where appropriate) for the GIS layer/source files, data dictionary, release date, coordinate reference system, legal order version, licence/reuse terms and correction history. Keep the gate open until the response is received and independently checked.
6. Do not build or ship national geometry from inferred administrative boundaries, community data, raster tracing or name matching. Such sources may locate gaps only.

## 2. Acquisition routes assessed

| Route | Use | Current evidence / decision |
|---|---|---|
| ECI delimitation index and legal orders | Legal descriptions, schedules, reservation and effective-date chain | Official index found: https://www.eci.gov.in/delimitation/ . ECI's 2008 order is discoverable, but the binary fetch returned HTTP 406 for three URL variants in run 40213895574. Web-rendered text is not a binary-hashable source artifact. Continue via alternate ECI publication/backend links and official Gazette custodians. |
| ECI May 2026 result portal geometry paths | Possible official polygon feed | Guessed direct paths for S03, U07, S11, S22 and S25 returned HTTP 404 in run 40212122850; do not keep retrying the same pattern without a newly observed link/script reference. Result pages prove election results exist, not that the guessed geometry API exists. |
| Official state CEO portals | State-level constituency rosters, maps, polling-station links and sometimes GIS | Search each CEO portal for downloadable constituency maps, GIS services, polling-station map services, data downloads and linked official repositories. Verify legal vintage and coverage individually; not yet closed nationally. |
| Official state GIS / ArcGIS REST services | Raw vector geometry and layer metadata | Telangana TGRAC yielded four service variants with 119 features, but one invalid Dornakal polygon is shared; the older Administrative Information System layer materially differs for seven ACs. No variant selected as canonical until legal provenance/version is resolved. Use as a source candidate, not accepted truth. |
| Survey of India / NSDI / Bhuvan | Administrative boundary framework, map index, possible service discovery | Survey of India village archives were acquired for 14/27 jurisdictions (71,484 features, 37 invalid geometries, one CRS metadata conflict); these are village administrative polygons, not AC polygons. Useful for containment/coverage checks only, not a substitute for constituency geometry. |
| Government Gazette repositories (Central and State e-Gazettes) | Primary legal instrument and effective date | Required next path for post-2014 amendments, corrections and publication/effective-date chain. Each downloaded original must be byte-hashed and linked to the exact jurisdiction and statutory schedule. |
| Official election result/download APIs and election management portals | Roster, AC IDs, results and crosswalk clues | Use only documented/live links discovered from current official pages or page scripts. Do not infer a geometry endpoint from URL naming conventions. |
| Government open-data catalogues / Census / LGD | Official identifiers, administrative hierarchy, population and codes | Useful for canonical IDs and administrative crosswalks, but not evidence of legal AC polygon boundaries unless the dataset explicitly publishes that subject. |
| RTI / formal custodian request | Obtain unpublished GIS data and provenance from ECI, state CEO, state GIS or Gazette custodian | Preferred escalation when public digital source is absent or blocked. Request shapefile/GeoPackage/GeoJSON or geodatabase, metadata, coordinate system, release/effective date, applicable order/corrigenda, licence and source lineage. Track request ID/date and response bytes. |
| Web archives / caches | Discover older page scripts, vanished endpoints and historical versions | Discovery only. An archived page or cached file does not establish current legal effectiveness; use to identify source-owner/version, then validate with official custodian. |
| Community GIS (DataMeet, GitHub mirrors, third-party GeoJSON) | Differential testing and candidate discovery | Not canonical. DataMeet national candidate was rejected: 4,182 features vs 4,123 expected, 30 vs 31 jurisdictions, 4,102 unique state/AC pairs, 80 duplicate rows, six invalid geometries and 34 null names. ECI-portal-derived mirror audit found 824 features and 23 invalid polygons. Do not vendor unlicensed mirror data. |
| Raster tracing / inferred polygons / administrative overlays | None for legal truth | Rejected as a way to fill missing AC geometry. Can create misleading false precision and cannot establish legal boundary/effective date. |
| Physical Gazette inspection / notarized transcription | Authenticity/transcription gates | Requires designated custodian or project-owner evidence. A web copy alone does not close the physical-authenticity gate. |
| India Post delivery-beat polygons / polling-station-to-PIN crosswalk | Separate external gates | Not acquired or established. Request from relevant custodians and retain independent verification; never infer delivery beats or complete crosswalks from centroids. |

## 3. Latest workflow diagnosis

- Run 40213959324 (https://github.com/kshetra-app/Kshetra/actions/runs/40213959324) failed for two distinct reasons: the direct ECI geometry URL returned HTTP 404, then the error-handling path raised `NameError: name 'warnings' is not defined`. This is a **probe-harness defect** that obscured clean reporting of optional-source failures; it is not evidence that every source request failed.
- Fix committed on the resumption branch: commit `2f2cda87b39d72f8bf4c711e4a3e58064edd7fee`, initializing `warnings = []` alongside `failures = []`. The branch push should retrigger the official-geometry workflow; inspect the next run's complete manifest and logs before accepting any source.
- The 40213959324 artifact was only 688 bytes (ZIP digest `12943d0b2320aa1e67f0b49b7b5ecdc2353034795e7da2693de628dc104ccdbc`) and contained only a minimal geometry audit; it does not contain the full raw response set because the script aborted before writing the final manifest.
- Run 40213895574 completed its workflow, but its acquisition result says no URL variant returned a PDF: all three attempts returned HTTP 406, 1,035 bytes each, and `pdfMagic=false`. No binary PDF SHA-256 can be claimed. Do not mistake workflow success (artifact uploaded) for source acquisition success.
- Run 40211792541 completed successfully and produced artifact `12606480050` (113,470,251 bytes; artifact digest `05531bc8037dca81eb4af0ba93cf7e397594a02643b1bb311cb463abd78cfdfa`). Its SOI audit confirms incomplete coverage and non-AC subject matter; the run does not establish canonical national AC geometry.

## 4. Required next actions (Stage B only)

1. Review the next run triggered by commit `2f2cda87b39d72f8bf4c711e4a3e58064edd7fee`; preserve the complete manifest, response hashes, source status and artifact digest.
2. Correct the probe so a required-source failure and optional-source warning are both recorded, and the final manifest is written even when any request or parser fails. Add a regression test for optional HTTP 404 and required-source HTTP failure; workflow must fail only after the evidence manifest is safely written.
3. Replace guessed ECI endpoint retries with link discovery from the live ECI result page, referenced scripts, and official publication API/link targets. Record the discovered source URL before requesting it. Do not bypass access controls or represent web-rendered text as downloaded binary bytes.
4. Build a jurisdiction-by-jurisdiction inventory of official CEO/GIS endpoints. Each source row must have owner, subject, source URL, legal vintage, retrieval timestamp, exact byte SHA-256, CRS, licence, coverage count, topology result and statutory crosswalk status.
5. Complete the all-119 Telangana statutory AC-number/extent crosswalk and post-2014 legal-effective-date chain. Resolve the seven material layer differences and shared Dornakal invalidity against the relevant legal schedules or custodian confirmation.
6. Send formal, scoped requests for official national/state GIS layers and the outstanding EB-01..EB-05 evidence. A request being sent is not a gate closure.
7. Stop at Stage B boundary and submit the full evidence dossier for independent adjudication. Do not begin Stage C, run staging SQL, or touch production under this directive.

## 5. Acceptance criteria

Stage B is not accepted until all required source/evidence gates have explicit dispositions, the national AC roster and geometry coverage reconcile, raw official-source bytes and hashes are reproducible, topology and legal effective dates are validated, unresolved discrepancies are documented, and independent adjudication is recorded. Until then, `W021.5-B1-04` and `EB-01..EB-05` remain OPEN; no completion percentage or formal acceptance may be increased on the basis of source discovery alone.


## 6. Additional primary legal sources discovered after the first probe

These sources materially improve the Telangana/AP statutory crosswalk route and are being acquired as exact bytes where possible:

- **India Code — Andhra Pradesh Reorganisation Act, 2014 (official government PDF):** https://www.indiacode.nic.in/bitstream/123456789/2123/1/A2014-6E.pdf . Section 15 and the Second Schedule are directly relevant to the 2014 state split and constituency extent amendments. Treat the official PDF as primary legal text; retain the byte SHA-256 and page-indexed extracted text once the acquisition run returns.
- **ECI — General Elections 2024 Press Note No. 23 (official ECI PDF):** https://elections24.eci.gov.in/docs/press-note-no-23.pdf . The ECI reiterates the applicable basis for 2024 elections and records AP/Telangana totals as 175 and 119 Assembly constituencies, respectively. This is corroborative and does not replace the underlying order, Act or notification.
- **ECI Notification No. 282/AP/2018(DEL), dated 22 September 2018:** the ECI's indexed official text states that the 2014 Reorganisation Act and the 2015 Removal of Difficulties Order were part of the sequence and identifies the 2018 notification. The surfaced ECI backend URL is https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D . The same ECI backend host returned HTTP 406 in the current probe environment; no raw binary hash is claimed. Source text discovery is useful, but the exact signed notification and Gazette publication still require byte acquisition or custodian confirmation.
- **India Code — Andhra Pradesh Reorganisation (Removal of Difficulties) First, Second and Third Orders PDF:** https://upload.indiacode.nic.in/showfile?actid=AC_CEN_5_5_00058_201406_1517807327989&filename=Andhra+Pradesh+Reorganisation+%28Removal+of+Difficulties%29+First%2C+Second+and+Third+Order.pdf&type=order . This is a separate official legal-source candidate for the 2015 chain; its applicability to AC extent must be established from the extracted text, not inferred from its title.

A new read-only acquisition workflow, `.github/workflows/w0215-legal-crosswalk-source-probe.yml`, and script, `scripts/acquire_w0215_legal_crosswalk_sources.py`, fetch and hash the India Code Act and ECI 2024 press note, preserve raw bytes, extract PDF page text and report page-indexed term hits. The Removal of Difficulties orders are an optional candidate. These are evidence-acquisition steps only: they do not close the 119-AC crosswalk or establish canonical geometry.
