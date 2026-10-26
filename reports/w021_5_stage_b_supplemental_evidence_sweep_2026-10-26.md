# W021.5 Stage B — Supplemental Evidence Acquisition Sweep (2026-10-26)

**Authority:** CTO Directive 154 — Stage B repository/evidence acquisition only  
**Disposition:** New source leads recorded; no new raw source bytes acquired by this supplemental sweep  
**Stage B status:** PARTIAL / NOT ACCEPTED  
**Safety:** No WAF bypass, no guessed endpoint retries, no staging/production database access, no inferred polygons.

## Objective

Retry the evidence acquisition strategy using independent source-discovery routes, distinguish *discoverable text/page content* from *acquired source bytes*, and select the next highest-value lawful retrieval method. This is a bounded, evidence-led sweep—not a claim to have exhaustively queried every possible source.

## Supplemental routes reviewed

| Route | Finding | Evidence value | Disposition |
|---|---|---|---|
| Official ECI delimitation index | The live ECI index exposes delimitation materials, including the 2008 order, Assam 2023 final publication/corrigendum and J&K 2020/2022 materials. | Strong discovery index for applicable legal instruments; does not prove each state's current legal chain or provide a national vector layer. | Primary legal-source index; extract exact instrument links and effective-date/corrigendum chain per jurisdiction. |
| IndiaCode-hosted 2008 order | Search indexing exposes the PDF title and text at https://upload.indiacode.nic.in/showfile?actid=AC_CEN_3_20_00030_200233_1517807324510&filename=Delimitation+Order%2C2008.pdf&type=order. A direct container download attempt in this session failed; the indexed page/text is not treated as acquired binary bytes. | A distinct lawful host worth a controlled raw-byte retry; may avoid dependence on the ECI host that returned HTTP 406. | NEXT RETRIEVAL EXPERIMENT: exact IndiaCode URL through a clean, read-only acquisition workflow, preserving HTTP status, headers, final URL, content type, byte count and SHA-256. If blocked, stop and use custodian/certified-copy route; no access-control bypass. |
| ECI official publications page | https://www.eci.gov.in/eci-publication/ lists multiple PDF links for the 2008 order and other legal instruments. | Provides alternate first-party links and possible split/alternate PDF representations; publication listing alone is not raw-byte evidence. | Enumerate actual links from the live page and retry only exact discovered URLs, not URL-pattern guesses. Record each URL/response independently. |
| ECI delimitation landing page | https://www.eci.gov.in/delimitation/ confirms the legal-source catalogue for Assam 2023 and J&K 2020/2022, and explains the legal force of delimitation orders. | Strong for establishing jurisdiction-specific instrument discovery; not geometry acceptance. | Use to build the jurisdiction-to-instrument matrix; retrieve applicable final publications, Gazette issue, corrigenda and effective dates. |
| India Geodata electoral-boundary repository | https://yashveeeeeer.github.io/india-geodata/ advertises state-wise AC files and CC0/CC-BY labels; prior repository evidence notes that some statewise files are explicitly pre-2014. | Useful broad candidate index and discrepancy detector, but top-level licence labels and “latest delimitation” marketing do not prove per-file vintage, lineage, or legal correctness. | Secondary comparison only; capture exact commit, file-level metadata/licence and raw file hashes before any use. Never canonical by itself. |
| NIC State GIS / admin2024 service | Search result exposes state-boundary administrative polygons, not AC-specific legal polygons. | Context/coverage diagnostics only. | Reject as AC geometry source unless a specific layer is proven to represent ACs and its source lineage is documented. |
| TGRAC official ArcGIS services | Existing acquisition already has five variants, 8-layer family comparison, duplicate response families, a shared invalid Dornakal polygon and material seven-AC geometry discrepancy. | Valuable official state-GIS candidates, but no legal-vintage/licence/extent acceptance and no independent geometry family sufficient to settle the discrepancy. | Do not keep multiplying near-duplicate endpoints; request custodian lineage, version, correction history and canonical layer declaration. |
| Bihar BEGIS official GIS | Existing probe acquired 243 polygons but found 3 invalid geometries and 76 positive-area inter-AC overlap pairs above 1 m². | Official state candidate with measurable structural/topology defects. | Preserve as candidate; ask source owner for current export/version and corrections; rerun audit on any new source snapshot. |
| India Post PIN-code boundaries | Official catalog describes PIN-code service-area polygons, not postman delivery beats. | Cannot establish delivery-beat containment. | Keep EB-03/EB-04 open; send specific request to CEPT/Department of Posts for beat geometry or written non-availability confirmation. |
| Certified Gazette/custodian request | Existing request pack contains drafts for Gazette custodian, ECI/CEO/state GIS, India Post/CEPT, and authorized polling-station crosswalk. Status remains DRAFTED_NOT_SENT. | Best escalation for unavailable authenticated legal bytes, legal vintage, data lineage and delivery-beat availability. | Send only through an authorized project owner; record the exact channel, timestamp, reference number, request body and raw response. Do not imply a request was sent. |

## Chosen acquisition method

Use a **two-track, custodian-led official-source pipeline**:

1. **Immediate bounded digital retry:** use the exact IndiaCode-hosted 2008-order URL and exact first-party links discovered on the ECI publications page. Fetch only through a reproducible read-only job; preserve the original response bytes and transport metadata. Accept an artifact as acquired only if it is a valid PDF, not an HTML error page, and its exact byte SHA-256 is recorded.
2. **Parallel jurisdictional legal chain:** enumerate the applicable final order, Gazette publication, amendments/corrigenda and effective date for each jurisdiction. Treat the 2008 order as historical/legal input only where it remains applicable; account for later Assam/J&K/other jurisdiction-specific instruments.
3. **Parallel digital geometry:** continue official jurisdiction-by-jurisdiction GIS acquisition, but only for exact discovered service/layer IDs. Capture raw bytes, metadata, CRS, licence, source owner, legal vintage, feature count, statutory-ID crosswalk, topology and coverage results.
4. **Custodian escalation:** if the alternate official host does not yield raw bytes or metadata, use the existing request pack for certified Gazette evidence and source-owner lineage/correction records. Requests remain unsent until actually submitted and documented.
5. **Independent adjudication:** independently transcribe legal schedules and reconcile polygon extents, aliases and topology. Collection and acceptance must remain separate.

## Why this is the most apt route

- It increases the chance of acquiring original legal bytes without repeating known blocked ECI URLs or guessing new URLs.
- It distinguishes legal authority from digital geometry and prevents a visually complete but legally unsupported national shapefile from being promoted.
- It treats duplicate GIS endpoints as one evidence family rather than false independent corroboration.
- It produces auditable outcomes even when acquisition fails: exact URL, response class, hashes only for actual bytes, and a specific next action.
- It is consistent with Directive 154: Stage B only; no product code, migrations, database access, staging, production or Stage C.

## Required next evidence and stop conditions

- Retry the exact IndiaCode PDF URL and enumerate exact ECI publication-page links in the read-only acquisition workflow.
- Update the source register with raw SHA-256 and byte size only after a valid original file is acquired. For failures, record status/content type and hash the error body only as a transport diagnostic, never as legal-source bytes.
- Obtain the certified Gazette chain and TGRAC source-owner response; obtain an explicit Department of Posts answer about delivery-beat data; obtain an authorized polling-station crosswalk.
- Keep EB-01..EB-05 and W021.5-B1-04 OPEN; EB-06 remains pending independent adjudication. No canonical national AC geometry is accepted. Stage C and all database operations remain unauthorized.

## Discovery references

- ECI publications: https://www.eci.gov.in/eci-publication/
- ECI delimitation index: https://www.eci.gov.in/delimitation/
- IndiaCode-hosted 2008 order: https://upload.indiacode.nic.in/showfile?actid=AC_CEN_3_20_00030_200233_1517807324510&filename=Delimitation+Order%2C2008.pdf&type=order
- ECI-hosted 2008 order: https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf
- India Geodata candidate index: https://yashveeeeeer.github.io/india-geodata/
- NIC admin2024 layers (state/district context, not AC truth): https://webgis1.nic.in/nicstreet/rest/services/admin2024/MapServer/layers
- Existing Stage B route adjudication: reports/w021_5_stage_b_evidence_route_adjudication_2026-10-26.md
- Existing custodian request pack: reports/w021_5_stage_b_custodian_request_pack_2026-10-26.md
