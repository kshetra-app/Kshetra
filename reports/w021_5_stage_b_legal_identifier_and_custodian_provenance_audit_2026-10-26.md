# W021.5 Stage B — Legal Identifier and Custodian Provenance Conflict Audit (2026-10-26)

**Authority:** CTO Directive 154 — Stage B only  
**Status:** CONFLICTS REGISTERED; PRIMARY EVIDENCE ACQUISITION CONTINUES  
**Acceptance:** PARTIAL / NOT ACCEPTED  
**Safety:** No inferred legal identifiers, no invented custodian correspondence, no staging/production database access or mutation.

## 1. 2008 legal instrument identifier conflict found

Repository-wide review identified conflicting identifiers in internally maintained legal source records:

- `reports/w021_5_official_gazette_inventory.json` lists the Gazette notification numbers for the Delimitation Order, 2008 as **S.O. 383(E) and S.O. 453(E)**, dated 19 February 2008.
- `data/evidence/delimitation/authoritative/delcom_order_46_2007_and_presidential_order_2008.md` separately identifies **Delimitation Commission Order No. 46 / Notification No. 282/AP/2007-III** dated 31 May 2007, and identifies **Presidential Order S.O. 382(E)** as the 19 February 2008 commencement instrument. It also lists 2008 corrigenda O.N.149(E) and O.N.171(E).
- `reports/w021_5_source_acquisition_register.json` records an official Gazette-recital discovery from a 2023 Gazette that cites S.O.382(E) as the 2008 Order's publication reference.
- `data/evidence/w020/authoritative/eci_delimitation_order_2008_source_dossier.md` also conflates some of these references by labelling the 2008 order publication as Notification No. 282/AP/2008.

These internal references do not consistently identify the same legal act. **This audit does not choose which notification number is correct.** The Commission's original order, presidential commencement instrument, later consolidated ECI Order, and corrigenda must remain separate until the original Gazette issue(s) and ECI document are acquired and compared. The current ECI and IndiaCode raw PDF retrieval routes have not yet produced the missing 2008 Order PDF; no raw hash is claimed.

## 2. India Post custodian claim requires source-backed qualification

`reports/w021_5_india_post_geography_assessment.json` contains `custodianStatus.inquiryLogged: true` and attributes a conclusion to the Department of Posts that it does not maintain delivery beats as a standardized cadastral GIS layer. The repository evidence inventory inspected for this audit does not contain a custodian-issued reply, submission acknowledgement, correspondence reference, signed note, or raw response bytes. The extant custodian request pack remains drafted/not sent.

Accordingly, the quoted no-standardized-layer conclusion is **not treated as a verified direct Department of Posts response** in this audit. Existing official manual text describes local postal maps and delivery-beat-list books, but does not prove whether a national digital polygon dataset exists or is publicly available. Until actual correspondence is acquired, the claim remains an internal working hypothesis. The distinction among postman delivery beats, local postal beat lists, PIN-code service-area boundaries and electoral geography remains mandatory.

## 3. Repository source register update

The master source register has been updated in commit `46d9635b2aef174c2cb89056a76b2aa4fe8a3306`; it now contains 49 source records. New record:

- `SRC-W0215-LEGAL-PROVENANCE-CONFLICT-AUDIT-2026-10-26`

The new record has null external byte length, null external SHA-256 and no raw-artifact path because this is an internal audit record, not a newly downloaded external source. Both findings are explicitly labelled as unresolved rather than presented as externally verified facts.

## 4. Live official acquisition

The evidence-only acquisition workflow run `40320265206` for branch commit `797256a271df2f86b0c1abd9722d8bd6c6c83046` is still being checked. It targets the legacy official ECI archive, current ECI archive, official Department of Publication search queries for `O.N.55(E)`, `S.O.382(E)` and `282/AP/2018`, and the official Delhi polling-station listing/map. Its latest manifest/artifact has not yet been confirmed as complete; do not infer acquisition success from the existence of the run.

A bounded-timeout variant of the same acquisition script was committed next on the evidence-only branch as `6722b7fd231feef26a3d413278ffff2ff1c8ded9` to avoid spending the entire 12-minute job budget on sequential nonresponsive endpoints. It reduces each HTTP request timeout from 25 to 10 seconds and captures `href`, `src`, `data-href`, `data-url`, `data-file` and `action` attributes from observed official HTML. It does not bypass WAF/access controls.

## 5. Remaining evidence gates

1. Original ECI Delimitation Order PDF bytes with verifiable PDF structure, page count, source retrieval URL, timestamp, byte length, SHA-256, and legal text review.
2. Original Gazette of India issue(s) for the 2008 legal instrument chain, including exact number/part/section/page range and PDF bytes or certified issue; resolve the S.O.382(E)/S.O.383(E)/S.O.453(E) discrepancy against primary documents.
3. Gazette of India issue **O.N.55(E)** dated 22 September 2018, plus Andhra Pradesh State Gazette counterpart/certified copy. The ECI notification PDF is already retained in master and hash verified, but it is not the Gazette issue itself.
4. Complete jurisdiction-specific legal source chain and effective-date adjudication.
5. National official Assembly Constituency geometry with source-owner lineage, vintage, licence, and legal extent-to-polygon validation; resolve the Telangana geometry-family disagreement and invalid Dornakal polygon.
6. Authorized national polling-station-to-AC crosswalk based on official CEO/ECI source records, not synthetic pilot records.
7. Actual evidence of whether India Post maintains or publishes delivery-beat geometry/data, distinguishing it from PIN-code areas and local manual lists. Any external custodian claim requires a retained actual response and verifiable provenance.

## 6. Disposition

Stage B remains **PARTIAL / NOT ACCEPTED**. EB-01 through EB-05 and W021.5-B1-04 remain open; EB-06 remains pending independent adjudication. No national canonical AC geometry has been accepted. No staging/production database access or mutation occurred; Stage C remains unauthorized.

## 1A. Schedule numbering conflict found in the retained primary 2018 notification

The hash-verified ECI Notification No. 282/AP/2018(DEL) PDF retained in master expressly states that it amends **Schedule III, Table A** of the Delimitation of Parliamentary and Assembly Constituencies Order, 2008 for Andhra Pradesh. In contrast, internal sources such as `data/evidence/delimitation/authoritative/delcom_order_46_2007_and_presidential_order_2008.md` and the Schedule II / Schedule XXXI extracts describe other numbering. The 2018 instrument's wording is verified for the 2018 amendment; this does not by itself settle the numbering of every earlier consolidated/order version or the Telangana schedule following the 2014 reorganisation. Until the actual 2008 Order PDF and relevant original Gazette/reorganisation instruments are acquired, internal Schedule II / XXXI crosswalk extracts must not be taken as proven references to the same legal version. This finding was added to source record `SRC-W0215-LEGAL-PROVENANCE-CONFLICT-AUDIT-2026-10-26` in register commit `e87ca7e1e2407f51b71d2258f9c02979ec75c292`.
