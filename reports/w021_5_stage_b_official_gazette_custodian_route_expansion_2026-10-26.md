# W021.5 Stage B — Official Gazette Custodian Route Expansion (2026-10-26)

**Authority:** CTO Directive 154 — Stage B only  
**Status:** DISCOVERY ROUTES REGISTERED; ORIGINAL INSTRUMENT STILL NOT ACQUIRED  
**Acceptance:** PARTIAL / NOT ACCEPTED  
**Safety:** Read-only source research. No WAF bypass, no inferred geometry, no staging/production database access, no Stage C.

## Additional official custodian routes

1. **Gazette of India eGazette portal** — https://egazette.gov.in/  
   Official Government of India publication portal surfaced by web search. Its landing page identifies Gazette Directory and other search/navigation routes. The portal page is not the target Gazette issue. The exact issue carrying ECI Notification No. 282/AP/2018(DEL), dated 22 September 2018, has not yet been identified or acquired.

2. **Department of Publication Gazette catalogue** — https://deptpub.gov.in/document-category/gazett/  
   Official Government of India Department of Publication catalogue. It is a custodian/index lead, not the original notification. No target issue bytes, issue number, part/section, or page range have been established from this route.

3. **Official ECI source** — https://www.eci.gov.in/eci-publication/ and exact indexed PDF URL  
   The ECI publications search result identifies the 2008 Delimitation Order and indexed content. Direct retrieval in the previous attempt returned HTTP 406. Search-indexed text is not raw PDF bytes and no PDF hash is claimed.

4. **Official PIB corroboration** — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2015227&lang=2&reg=48  
   The PIB release states that the 2018 ECI notification amended the Andhra Pradesh/Telangana legal chain and reports 175 Andhra Pradesh and 119 Telangana Assembly Constituencies. It is corroborative administrative evidence, not the underlying legal instrument.

## Acquisition automation change

On the authorized evidence-only branch `cto/w0215-stage-b-evidence-20261025`, commit `c0bf9a40adfe08610cb968ff6da6d3ce952845ef` added the official eGazette portal and Department of Publication catalogue as allowlisted HTML discovery sources in `scripts/acquire_w0215_legal_crosswalk_sources.py`. The script was fetched again from the branch and its blob SHA `348c9a94ec9df14c9cdb77302a793380d8480ac8` verified.

**Execution status is not verified.** The available connector's commit-run lookup returned no runs for the commit and the combined status endpoint returned no status checks. Therefore no successful workflow execution or newly acquired raw source bytes are claimed. The updated script must be executed by GitHub Actions or another controlled runner and its artifact manifest independently inspected.

## Evidence register

The master source register was updated in commit `01dff1baee7faa5fd25ce4807cab0d681937d517`, adding:
- `SRC-GOI-EGAZETTE-PORTAL-2026-10-26`
- `SRC-GOI-DEPT-PUBLICATION-GAZETTE-CATALOGUE-2026-10-26`

Both records intentionally have null byte length, null SHA-256, and null raw-artifact path. They are discovery records, not acquired-source records.

## Remaining required evidence

- Original ECI Delimitation Order, 2008 PDF bytes with verified PDF magic, page count, retrieval URL, timestamp, byte length, SHA-256, and independent source/content review.
- Original ECI Notification 282/AP/2018(DEL) PDF and the exact Gazette of India / Andhra Pradesh Gazette issue, with page and issue metadata.
- Complete jurisdiction-specific legal instrument chain, including applicable orders/corrigenda and effective dates.
- Authoritative current Assembly Constituency geometry, source-owner lineage, licensing, vintage, legal extent-to-polygon comparison, topology remediation, and independent acceptance.
- Authorized polling-station-to-AC crosswalk and India Post delivery-beat data or explicit custodian response establishing availability/limitations. PIN-code boundaries must not be treated as delivery-beat boundaries.
- Certified-source/custodian requests remain unsent unless a submission receipt is recorded; the existing request pack is not evidence of a request being sent.

## Disposition

W021.5 Stage B remains **PARTIAL / NOT ACCEPTED**. EB-01–EB-05 and W021.5-B1-04 remain open; EB-06 remains pending independent adjudication. No national canonical AC geometry is accepted. No Stage C or database access is authorized.