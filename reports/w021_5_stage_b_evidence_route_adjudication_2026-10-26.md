# W021.5 Stage B — Evidence Acquisition Route Adjudication (2026-10-26)

**Authority:** CTO Directive 154; Stage B only  
**Decision status:** METHOD SELECTED; Stage B remains PARTIAL / NOT ACCEPTED  
**Database / deployment:** No Supabase or Railway access; no staging or production mutations; production remains air-gapped.

## 1. Executive decision

The most apt path is a **custodian-led, jurisdiction-by-jurisdiction official-source pipeline**, with automated read-only acquisition and reproducible GIS checks as supporting tools. Do not keep retrying the same blocked ECI URLs, do not infer an endpoint from a URL pattern, and do not select a national community shapefile as legal truth.

There is currently no acquired and verified official national Assembly Constituency (AC) vector package in the evidence register. National completeness must be built from legally applicable jurisdictional sources and then independently reconciled. This is slower than adopting a convenient shapefile, but it avoids silently shipping incorrect legal boundaries.

## 2. Routes considered and adjudication

| Route | Value | Decision |
|---|---|---|
| Official ECI/CEO/state-GIS vector endpoints | Raw polygons plus source metadata, potentially the strongest digital geometry route | **Primary acquisition route**, only where exact endpoint, owner, raw bytes, CRS, licence/version and legal vintage can be recorded. Probe is read-only and must preserve full manifests even on partial failures. |
| ECI result-portal JavaScript geometry | Potential official election-era geometry for a subset of jurisdictions | **Continue only via discovered live links/script references.** The guessed S03/U07/S11/S22/S25 paths returned 404 in recorded probes; no repeated guesses. Even an acquired result layer needs legal-vintage and topology checks. |
| Applicable delimitation order, amendments, corrigenda and Gazette | Defines statutory legal extent/effective-date chain | **Primary legal truth.** Obtain authenticated source bytes or certified inspection evidence; independently transcribe schedules and reconcile each AC extent. ECI PDF fetches returned HTTP 406 AppTrana WAF HTML, not PDF bytes. Do not bypass the WAF and do not hash error HTML as a legal document. |
| Official state GIS services (TGRAC/Bihar BEGIS and further state/UT custodians) | Jurisdiction-level candidates with reproducible feature counts and geometry | **High-value staged route.** Telangana's TGRAC layers are candidate-only: 119 records, a shared invalid Dornakal polygon, and a material seven-AC discrepancy across two geometry families. Bihar's official BEGIS layer has 243 AC records but 3 invalid polygons and 76 overlap pairs above 1 m². Neither is accepted. |
| India Geodata / DataMeet / GitHub mirrors / OpenCity / third-party shapefiles | Fast candidate discovery and differential checks | **Secondary diagnostic only.** Verify exact source commit, jurisdiction vintage, licence and every feature. Prior audits found stale or mislabeled boundaries, duplicates, missing names and invalid geometry. Do not vendor a mirror without rights and official-source reconciliation. |
| Survey of India / NIC State GIS Portal / Bhuvan administrative layers | State/district/village framework and spatial containment diagnostics | **Context only**, not an AC substitute unless a particular product explicitly declares AC subject matter and source lineage. Village/admin polygons cannot establish statutory AC borders. |
| Department of Posts PIN-code polygons | Official postal geofencing and address/service-area reference | **Not delivery beats.** OGD's “All India Pincode Boundary Geo JSON” is explicitly PIN-code boundary data. It may support PIN-code diagnostics after raw bytes, metadata and licence are captured; it cannot close delivery-beat gates. |
| Formal custodian requests / RTI / certified Gazette inspection | Resolve unpublished data, legal source authenticity, source-owner lineage and known discrepancies | **Immediate escalation route** for unavailable official bytes and version lineage. The request pack is drafted but not sent; do not imply submission or invent an acknowledgement. |
| Raster tracing, centroid assignment, administrative overlays, inferred polygons | Can make a visually complete-looking map | **Rejected for legal geometry.** These methods manufacture apparent precision and cannot establish legal extent or effective date. |
| Independent transcription and geometry adjudication | Separates collection/implementation from acceptance | **Mandatory final gate**, not a substitute for source acquisition. Reviewer must be independent, cite Gazette page/table/row, record discrepancies and sign off. |

## 3. New source leads from the current sweep

1. **TGRAC Master Administrative Boundary service** — official service metadata exposes an Assembly Constituency Boundary layer in EPSG:4326. It has already been acquired and compared against the other TGRAC variants. Its “Master” label is not proof of legal currency; it remains candidate-only due to the shared Dornakal self-intersection, missing legal vintage/licence and seven-AC geometry-family discrepancy. Service reference: https://tgrac.telangana.gov.in/arcgis/rest/services/Master_Administrative_Folder/Master_Administrative_Boundary/MapServer
2. **TGRAC older Administrative Information System query service** — exposes an AC polygon layer in EPSG:32644. It belongs to the older geometry family and is not independent corroboration of the Master service. Reference: https://tgrac.telangana.gov.in/arcgis/rest/services/AdministrativeInfoSystem_Folder/Administrative_Information_System_Query/MapServer/1
3. **NIC State GIS Portal for Telangana** — an official discovery route for government administrative GIS layers, but no national AC dataset or legal AC geometry was established from the portal during this review. Reference: https://stategisportal.nic.in/stategisportal/Home/State/36
4. **Department of Posts / OGD PIN boundary catalog** — confirms official PIN-code boundary publication, not delivery-beat polygons. References: https://sikkim.data.gov.in/catalog/all-india-pincode-boundary-geo-json and https://www.pib.gov.in/PressReleasePage.aspx?PRID=2131707&lang=2&noshow=1&reg=48
5. **India Geodata electoral-boundary repository** — advertises downloadable AC data and licence labels, but repository-level marketing is not sufficient evidence that each jurisdictional file has current legal vintage or consistent lineage. Keep it as a candidate comparison source until each file's provenance, date and legal reconciliation is established. Reference: https://yashveeeeeer.github.io/india-geodata/

## 4. Reproducible evidence already recorded

- TGRAC variant comparison run **40261390903** succeeded and produced artifact w0215-official-geometry-probe-40261390903 (38,242,577 bytes; artifact SHA-256 a2752bb4906e33d826fe4e5ce4292c1d46ea5a0f32172937d34c91893ecea3ee). Its generated report compares eight candidate layers across 28 pairs and identifies three duplicate raw-response groups. This is a reproducible source-family screen, not full polygon overlay or legal extent acceptance.
- Legal crosswalk source run **40260777545** succeeded and produced artifact w0215-legal-crosswalk-sources-40260777545 (11,488,316 bytes). The AP Reorganisation Act copy acquired from a state-government host is 231,596 bytes with SHA-256 84cd566b917f9a3f600c47f6540520c950166b424a964ad37d64dc3c968114aa; the statutory roster parser passed 119/119 serials. The ECI 2018 notification/Gazette authenticity/effective-date chain is still open.
- Bihar BEGIS run **40218393964** succeeded; its 243-feature layer remains rejected as canonical pending 3 invalid geometries and 76 positive-area overlap pairs above 1 m².
- Current repository records include reports/w021_5_source_acquisition_register.json, reports/w021_5_stage_b_acquisition_route_decision_2026-10-25.md, reports/w021_5_stage_b_custodian_request_pack_2026-10-26.md, and the evidence JSON files under reports/evidence/.
- Workflow success means the evidence-producing job completed, not that the source passed acceptance. Artifact hashes identify ZIP artifacts; raw-source hashes identify source bytes only where explicitly recorded as such.

## 5. Next actions, in order

1. **Preserve and independently review evidence artifacts** for runs 40260777545 and 40261390903, including source manifests, response status/content type, raw-source SHA-256, and artifact integrity. Reject HTML/WAF responses as source documents.
2. **Send the already-drafted custodian requests** through the official published channels: Controller of Publications for certified Gazette evidence; ECI/CEO Telangana for the original 2018 notification and official geometry lineage; TGRAC for canonical layer/version/licence and corrected Dornakal plus the seven-AC discrepancy; Department of Posts/CEPT for delivery-beat dataset existence and terms; ECI/State CEOs/DEOs for an authorized polling-station crosswalk. Record submission channel, timestamp, reference number and exact response bytes. Until sent, these are drafts only.
3. **Continue official jurisdiction-by-jurisdiction acquisition**, starting with exact links discovered from live official pages and GIS service metadata, not guessed URLs. For each jurisdiction require a source owner, raw bytes and hash, CRS, licence, version/legal vintage, statutory ID crosswalk, feature count, topology, state coverage and gap/overlap report.
4. **Resolve Telangana source lineage** with TGRAC and legal custodians. Do not repair the source polygon in-place as a way of concealing the invalid Dornakal geometry; preserve raw data and separately record any diagnostic make-valid output. Resolve the seven-AC discrepancy against the legal schedules and custodian response.
5. **Independently transcribe the relevant legal schedules** and compare the independent transcription against the machine-parsed roster. Record page/table/row references, checksum, discrepancies and independent reviewer decision.
6. **Keep EB-01..EB-05 and W021.5-B1-04 OPEN** until their own evidence criteria are met; EB-06 remains pending independent adjudication. Do not start Stage C, staging SQL, or production work under this directive.

## 6. Acceptance boundary

No single national candidate is currently defensible as canonical. The chosen method is a reproducible, custodian-led official-source pipeline with legal-vintage and geometry reconciliation, not “find the biggest shapefile.” Stage B remains **PARTIAL / NOT ACCEPTED**. No polygons are inferred or fabricated; no database was queried or mutated; production remains air-gapped.
