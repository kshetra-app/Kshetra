# W021.5 Stage B — Official Custodian Evidence Request Pack

**Prepared:** 2026-10-26  
**Authority:** CTO Directive 154 — Stage B only  
**Status:** DRAFTS PREPARED; NOT SENT; no agency response/request ID exists yet.  
**Scope:** Close external evidence gates without bypassing access controls, fabricating geometry, or promoting non-canonical source data.

## Route decision

The evidence sweep has found no complete, verified official national AC vector release. The ECI 2008 order PDF route returns HTTP 406/WAF HTML in the automated acquisition environment; guessed ECI 2026 result JavaScript geometry URLs repeatedly return HTTP 404. TGRAC exposes five geometry variants, but these collapse into two near-duplicate geometry families, retain the known seven-AC disagreement and all share an invalid Dornakal polygon. The next highest-value step is therefore official source-custodian confirmation and certified legal-source acquisition, not more guesses at the same URLs.

## Request 1 — Controller of Publications: certified Gazette evidence (EB-01)

**Official contact route:** Department of Publication, Ministry of Housing and Urban Affairs; [Contact Us](https://deptpub.gov.in/contact-us/), email acop-dep@nic.in, telephone 011-23817823 / 011-23819689, toll-free 1800-11-3765.

**Draft:**

> Subject: Request for certified/inspectable Gazette of India Extraordinary issue dated 19 February 2008 — Delimitation Order
>
> Please provide the exact Gazette of India Extraordinary, Part II, Section 3, Sub-section (iii), No. 71, dated 19 February 2008, containing the relevant notifications S.O. 383(E) and S.O. 453(E) associated with the Delimitation of Parliamentary and Assembly Constituencies Order, 2008. Please confirm the issue, part/section, notification numbers, publication date, page range and any corrigenda or amendments. If an authenticated digital copy is available, please provide the original downloadable bytes or a stable official URL; otherwise please advise the procedure for physical inspection and obtaining certified copies. Please state whether the supplied copy is complete and certified against the official publication record.
>
> This request is for source authenticity and evidence retention, not for an interpretive summary.

**Required closure evidence:** authenticated original/certified copy; byte-level SHA-256 if digital; physical inspection record if inspected in person; issue/page citations; any corrigenda chain. A search result, OCR, or unofficial mirror alone does not close EB-01.

## Request 2 — Election Commission of India and CEO Telangana: original 2018 notification and boundary lineage (EB-01 / W021.5-B1-04)

**Official contact routes:** [ECI delimitation page](https://www.eci.gov.in/delimitation/); CEO Telangana official site [ceotelangana.nic.in](https://ceotelangana.nic.in/), published contact address ceo-telangana@eci.gov.in.

**Draft:**

> Subject: Authenticated copy and data lineage request — Notification No. 282/AP/2018(DEL), dated 22 September 2018
>
> Please provide the complete, authenticated text and publication record for ECI Notification No. 282/AP/2018(DEL), dated 22 September 2018, including its Gazette of India Extraordinary and Andhra Pradesh State Gazette publication details, page numbers, annexures, amendments and corrigenda. Please confirm the legal effect and effective date of the notification and its relationship to Schedule XXVII of the Andhra Pradesh Reorganisation Act, 2014.
>
> Separately, please identify the authoritative digital geometry, if any, for the resulting 119 Telangana and 175 Andhra Pradesh Assembly Constituencies. For each available vector dataset, please provide the original file or stable official download/API endpoint, publication/version date, effective legal vintage, CRS, field dictionary, unique statutory constituency identifier, licence/reuse conditions, correction history and source-owner confirmation. Please clarify any known differences between published GIS variants, including the seven constituencies whose geometries differ and the invalid Dornakal (ST) polygon observed in publicly exposed TGRAC layers.
>
> If no official vector dataset is maintained or releasable, please confirm that in writing and identify the authoritative source from which geometry should be reconstructed and independently validated.

**Required closure evidence:** source bytes and hash for the notification/Gazette; source-owner response; authoritative layer/version lineage; documented disposition of all seven discrepancies and Dornakal invalidity; legal roster/extent crosswalk. The PIB press release is corroborative only, not a replacement for the notification or Gazette.

## Request 3 — TGRAC: master source metadata, legal vintage and geometry discrepancy (W021.5-B1-04)

**Official contact route:** [TGRAC contact page](https://tgrac.telangana.gov.in/trac/contact-us.php); dgtrac@gmail.com; +91-40-23324633.

**Draft:**

> Subject: Technical provenance request for TGRAC Assembly_Constituency_Boundary layers
>
> Please confirm the authoritative status, data lineage, publication date/version, effective boundary vintage, CRS, reuse licence and correction history of the following publicly exposed layers: Master_Administrative_Boundary layer 0; Administrative_Information_System layer 24; Administrative_Information_System_Query layer 1; Endowment_Lands_Admin_2026 layer 12; Endowment_Lands_Admin_New layer 12; Endowment_Lands_Old layer 13; RnB_Admin layer 8; and Musi_Basin_Web_Publication_vector layer 59.
>
> Our read-only acquisition recorded 119 polygons per candidate. The layers resolve into duplicate/near-duplicate response families; the Master layer aligns with the older AdministrativeInfoSystem family to sub-millimetre coordinate precision, while six matched constituencies have different ring structures against the newer family and Jangaon/Jangoan has a spelling mismatch. Every candidate audited has one invalid Dornakal (ST) self-intersection. Please identify the intended canonical layer and version, explain these differences, provide the corrected original source bytes (if a defect is acknowledged), and confirm whether the layer is legally intended to represent the current statutory Assembly Constituency extents.
>
> Please also state whether the data may be redistributed under an open licence and provide any associated official order, approval or publication reference.

**Required closure evidence:** written custodian confirmation, version/legal-vintage evidence, licence, correction source and validated raw bytes. A service called “Master” is not accepted as canonical solely by its name.

## Request 4 — Department of Posts / CEPT: delivery-beat geography (EB-03 / EB-04)

**Official contact route:** Department of Posts OGD Chief Data Officer / General Manager, CEPT; gmcept@indiapost.gov.in; Centre for Excellence in Postal Technology, Bengaluru – 560001. The official OGD catalog lists [All India Pincode Boundary Geo JSON](https://sikkim.data.gov.in/catalog/all-india-pincode-boundary-geo-json), but this is PIN-code service-area geometry, not a postman delivery-beat dataset.

**Draft:**

> Subject: Request for authoritative India Post delivery-beat geography and metadata
>
> Please confirm whether the Department of Posts maintains a national or state/circle-level geospatial dataset of individual postman delivery beats or delivery-office service territories, and whether it is approved for public or research reuse. If available, please provide the raw vector files or authorized API/export route, feature/office identifiers, CRS, effective date/version, data dictionary, licence, update cadence, source-owner metadata and change history.
>
> Please distinguish explicitly between (a) PIN-code polygons, (b) post-office point locations, (c) PIN directory records and (d) individual delivery-beat polygons. If a national beat-boundary dataset does not exist or is not shareable, please confirm this in writing and identify the nearest authoritative operational geography that may lawfully be used.
>
> We will not treat PIN-code polygons, post-office points or centroids as delivery-beat boundaries.

**Required closure evidence:** raw beat polygon bytes plus metadata and source hash, or an official written no-dataset/unavailable response and CTO adjudication of the residual blocker. Do not close EB-03 or EB-04 with PIN polygons alone.

## Request 5 — ECI / State CEOs / District Election Officers: authorized polling-station and roll crosswalk (EB-05)

**Official contact routes:** [ECI](https://www.eci.gov.in/); CEO Telangana ceo-telangana@eci.gov.in; the respective state/UT CEO and District Election Officer for each jurisdiction.

**Draft:**

> Subject: Request for authorized bulk polling-station / electoral-roll-part crosswalk
>
> Please provide or authorize access to the latest official, versioned polling-station register for each requested state/UT, including statutory state code, PC number/code, AC number/code and name, polling-station number/code and name, electoral-roll part number/name, address, available official coordinates, total electors where releasable, publication/effective date, source document reference and licence/reuse conditions. Please identify the custodian and update cadence and provide any official crosswalk between polling stations/roll parts and PIN codes or administrative units.
>
> If bulk programmatic access requires institutional authorization, please specify the application procedure, API, export format and rate limits. We will not bypass CAPTCHA, authentication, or rate limits and will not harvest voter-level personal data. Only minimum necessary polling-station metadata is requested.

**Required closure evidence:** official source bytes/export or authorized API access; complete jurisdiction coverage; stable identifiers and effective dates; validated one-AC nesting; source hashes and provenance. No CAPTCHA bypass or voter-level personal-data collection.

## Request 6 — Independent transcription and adjudication (EB-02 / EB-06)

After the certified Gazette material is obtained, appoint an independent reviewer who did not produce the original transcription. The reviewer must independently transcribe the relevant tables, record Gazette page/table/row citations, reconcile row counts and identifiers, compute a separate checksum, compare both transcriptions, document every disagreement and sign the result. CTO acceptance must remain separate from the agent that collected or transformed the data.

**Required closure evidence:** reviewer identity/role, independent transcription artifact, discrepancy log, page citations, checksums, resolution record, and explicit independent acceptance. Do not mark EB-02/EB-06 closed merely because a script or the implementing agent reports PASS.

## Execution controls

- These requests are drafted only; they have **not** been sent. Do not invent a submission ID or imply agency response.
- Record every eventual submission channel, timestamp, acknowledgement/reference number, response bytes, SHA-256, source owner, licence and follow-up deadline.
- Keep W021.5-B1-04 and EB-01..EB-05 open until their evidence criteria are actually met; EB-06 remains pending independent adjudication.
- No production/staging database access or mutation is authorized by this request pack.
