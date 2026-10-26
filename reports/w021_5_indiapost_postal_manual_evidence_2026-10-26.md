# W021.5 Stage B — Official India Post Postal Manual Acquisition and Delivery-Beat Evidence Audit (2026-10-26)

**Disposition:** OFFICIAL OPERATIONAL MANUAL BYTES ACQUIRED, HASHED AND PARSED; NATIONAL DELIVERY-BEAT GIS GATE OPEN  
**Gate:** EB-03 / India Post beat-polygon authority  
**Scope:** Read-only source acquisition only. No database, product code, or staging/production mutation.

## 1. Acquisition and provenance

Workflow: https://github.com/kshetra-app/Kshetra/actions/runs/40350138447  
Workflow artifact: `w0215-indiapost-postal-manuals-40350138447`, 15,153,862 bytes, SHA-256 `80ffc5c7a35ee4c4d5f5d4664f402ccca30e3f0dcd66e7dd114f14ba4822f01f`.

The source catalogue pages were already committed in the evidence-only branch. This run independently revalidated the exact stored bytes and hashes for **8/8** official India Post catalogue HTML pages, extracted document IDs/titles/download URLs from those actual page payloads, and downloaded the exact observed PDF URLs from the official India Post host. It did not construct or guess any document token. TLS certificate verification remained enabled.

All eight PDF responses returned HTTP 200, had PDF magic, were parsed successfully, and had byte length and SHA-256 calculated from their raw response bytes. All eight were durably committed to the evidence-only branch at commit `abe518b925ef7193b543d6a1c012dada51cbbb3f` under `data/evidence/w021_5/indiapost_postal_manuals/`.

## 2. Acquired official PDF files

| Official catalogue title | Catalogue-displayed date | PDF pages | Bytes | SHA-256 |
|---|---|---:|---:|---|
| Postal Manual Vol. II | 16-08-2025 | 287 | 870,818 | `622422edb352966113c4a9e7958329b80b1e93761c3494363562f14b032e836f` |
| Postal Manual Vol. III | 01-07-1986 | 194 | 1,082,974 | `126c4ad1f911070b721417195ca94e5ea72b68fa1dcba7ddbe1ea6bed1d4b031` |
| Postal Manual Vol. IV Part-I | 22-07-2019 | 57 | 9,837,458 | `50418ef924b16302248254ae56ad41786c624caa7025819520e17d3c449ceb6a` |
| Postal Manual Vol. IV Part-II (Appendices) | 15-03-2004 | 39 | 440,686 | `0632de111363f4820f6ca74c38eaf6f3bdad3e66343c5399aeb774bb9cea151d` |
| Postal Manual Vol. V | 27-09-2025 | 187 | 442,093 | `3e6faf1f45c524416a8dee71ba4d60152c27b2e4dffa3f587a2a1c05f9cd9f62` |
| Postal Manual Vol. VI Part-III | 18-05-2021 | 67 | 1,274,245 | `5871d20f7a44eade6f97a7d4ad37a7b7069a98895ccea7fcdb9d16de982d7b79` |
| Postal Manual Vol. VII | 27-09-2025 | 189 | 381,845 | `6e6ad2c6ae079f783845f555aa4258d2d00263330a2b2bafb9afef908e2101d7` |
| Postal Manual Vol. VIII | 01-04-1979 | 317 | 833,948 | `c373de5e152d9dd0599358594f5ea9eb488dbd4b630dea3023879e27a043ff6e` |

**Important metadata distinction:** The dates above are the values displayed in the official catalogue. They are not independently adjudicated effective dates for every rule or edition.

## 3. Specific rule evidence found

Postal Manual Vol. VIII is the strongest directly relevant source in this acquisition:

- **Rule 309 — Postal map of town:** says the Town Inspector should maintain a postal map of the town jurisdiction.
- **Rule 310 — Delivery beat lists:** says the postmaster prepares a book for the Town Inspector with (a) the complete list of town delivery beats and the main quarters, streets and chief places of business/trade in each beat, ordered by delivery sequence, and (b) an alphabetical list of streets/quarters/places with the beat numbers in which they are located. The rule says these lists are added to or corrected as changes are ordered by the postmaster.
- **Rules 274–275 — Fixed/unfixed village beats:** describe two village-postman beat systems; the fixed-beat rule refers to route lists and an accompanying beat map.

These are precise operational-record requirements and an actionable basis for a custodian request. They do **not** establish whether the Department currently maintains digital/vector GIS polygons, whether those records are centrally held, or whether a nationally complete geospatial delivery-beat dataset exists.

Three of the eight manuals had a matched delivery-beat/beat-list/postal-map term. The machine-readable manifest records per-manual match counts and textual snippets; it preserves the original raw bytes and extracted text separately.

## 4. Durable evidence files

- [Evidence package README](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/indiapost_postal_manuals/README.md)
- [Full provenance and text-scan manifest](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/indiapost_postal_manuals/manifest.json)
- [Raw Postal Manual Vol. VIII PDF](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/indiapost_postal_manuals/raw/Postal_Manual_Vol._VIII.pdf)
- [Extracted Vol. VIII text](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/indiapost_postal_manuals/text/Postal_Manual_Vol._VIII.txt)

All eight other raw PDFs and text extracts are retained beside Vol. VIII. Their exact official URLs, catalogue document IDs, catalogue-displayed dates, page counts, byte lengths and hashes are recorded in the manifest and master source register.

## 5. Correction to unsupported custodian provenance

An earlier version of `reports/w021_5_india_post_geography_assessment.json` claimed `custodianStatus.inquiryLogged: true` and asserted that the Department had directly confirmed that no standardized cadastral delivery-beat GIS layer is maintained. The retained evidence set contains no authenticated response, submission receipt, correspondence reference, or signed Department record supporting that as a direct custodian finding. The assessment has now been corrected in master commit `0d196b073764e90ce21dd5102a3bdcc803c12031`: `inquiryLogged` is false, the direct finding is null/unknown, and the unsupported earlier assertion is documented as withdrawn. The custodian-request pack remains **DRAFTED; NOT SENT**.

## 6. Final ruling for EB-03

- **Accepted:** Official postal-manual bytes and the operational existence of local postal maps/beat-list books are now documented with exact-source provenance.
- **Not accepted:** No national delivery-beat GIS polygon dataset has been acquired or verified. No authenticated India Post custodian reply has been acquired. No claim is made that no dataset exists.
- **Not interchangeable:** PIN-code service-area polygons, local operational beat lists, postal maps, and national delivery-beat geometry represent different evidence levels.

EB-03 remains **OPEN / BLOCKED PENDING AUTHORIZED SOURCE EVIDENCE OR AUTHENTICATED CUSTODIAN RESPONSE**. The broader Stage B gate remains PARTIAL / NOT ACCEPTED; Stage C and database access remain unauthorized.