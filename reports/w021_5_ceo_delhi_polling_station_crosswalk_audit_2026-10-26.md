# W021.5 Stage B — Official CEO Delhi Polling-Station Crosswalk Acquisition and Independent Validation (2026-10-26)

**Disposition:** DELHI JURISDICTIONAL SLICE ACQUIRED, HASHED, INDEPENDENTLY VALIDATED AND DURABLY ARCHIVED  
**Authority:** CTO Directive 154 — Stage B only  
**National acceptance:** NOT CLOSED. This result does not establish nationwide polling-station coverage, canonical AC geometry, legal extent-to-polygon alignment, or India Post delivery-beat geometry.

## 1. Authoritative source and retrieval path

- Publisher: Chief Electoral Officer, Government of NCT of Delhi.
- Official AC/polling-station index: https://ceodelhinet.nic.in/ceodelhiweb/ListofPollingStation.aspx
- Observed same-host polling-station listing/form: https://ceodelhinet.nic.in/ceodelhiweb/PSL.aspx
- Retrieval workflow run: https://github.com/kshetra-app/Kshetra/actions/runs/40327184603
- Run artifact: ID 12652195546, 7,352,603 bytes, SHA-256 28bf18b0f0c8b2a637ac9db065b90740f51559956950f7f11465cabf4f887ca0.
- The acquisition derived 70 distinct AC-specific links directly from the downloaded index HTML. It then submitted the publisher's own ASP.NET dropdown using the page's live view-state and event-validation values. This is normal form interaction, not an access-control or WAF bypass.

## 2. Independent validation results

- AC coverage: 70 of 70, AC numbers 1–70.
- Source detail pages: 70 acquired, 70 independently validated, 0 retrieval failures in the accepted result.
- Polling-station rows: 14,947.
- Unique AC/polling-station pairs: 14,947; duplicate pair count 0.
- Every page passed checks for the expected eight-column grid, row width, exact AC number and name matching, integer station numbers, unique station numbers and contiguous station numbering within the observed range.
- Every crosswalk row links to the SHA-256 and byte length of the raw official source page used for that row.
- Independent reinspection of the workflow artifact confirmed the crosswalk JSON parses, all 70 raw page byte lengths and SHA-256 values match the manifest, all ACs are represented, no source-page hash links mismatch, and the crosswalk contains the recorded 14,947 unique pairs.

## 3. Exact retained evidence and hashes

The latest source snapshot is committed to the evidence-only branch at commit 0ac13e0312035c8b5374750dc5cefdab91427a81. The source manifest includes the full per-AC table of 70 URLs, retrieval status/timestamp, byte length, SHA-256, per-page station count, validation checks and raw-archive member names.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Official index HTML, uncompressed response | 84,517 | 765f6a915862415634ec2ed31fcc5d0518bd73d418d8771dc9c52bf2745ae4cb |
| Official PSL form HTML, uncompressed response | 58,023 | c334114462061dfa9933d98b71b264464e3b1f6378706871e686c32ae8683f3d |
| Normalized crosswalk JSON, uncompressed | 13,760,029 | d4d882a8abae8136b8f25f4e2a0a2ae08eb3e48a12d0d81b7c731c5b2a5602fa |
| Normalized crosswalk JSON, gzip | 494,591 | f4ab4319b5809e8946a53219980623f544983c80bd80733288a7321766af5368 |
| Lossless archive of original HTML response bodies, tar.gz | 2,831,391 | b24fe2ff24981289f2588a7c3188e5557ecd32348b861119c74728a3e68735f5 |
| Provenance manifest, including per-AC page hashes | 90,669 | 52420b9ad52ada68c65611b0689dd2b599e2a1fc75ed2f135470ea061e5e557e |

The raw HTML tar.gz contains 72 original response bodies: one official index, one official form page and 70 AC detail postbacks. The archive-preparation step re-opened the gzip crosswalk, parsed the JSON, reopened the tar archive, and compared each archived raw HTML body byte-for-byte with the acquired response before committing the package.

## 4. Durable repository artifacts

- [Crosswalk README and validation summary](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/delhi_2024/README.md)
- [Per-AC provenance and validation manifest](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/delhi_2024/source_manifest.json)
- [Compressed normalized polling-station crosswalk](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/delhi_2024/polling_station_crosswalk_2024.json.gz)
- [Lossless raw official HTML archive](https://github.com/kshetra-app/Kshetra/blob/cto/w0215-stage-b-evidence-20261025/data/evidence/w021_5/delhi_2024/ceo_delhi_polling_source_html_2024.tar.gz)

The source manifest is a regular UTF-8 JSON file and was re-fetched from GitHub after the evidence-branch commit; its Git blob SHA is 3218492f50fa6816a3a3eb9684604b5155b6d314. The README Git blob SHA is f34ee0c3b8b5f8bba38dfbc567536ad7e5e0a54d. The latest evidence-branch head is 0ac13e0312035c8b5374750dc5cefdab91427a81.

## 5. Scope and non-claims

This closes only the official 2024 Delhi polling-station index and AC-to-polling-station table slice. The source has not been used to infer any AC polygon. The table is a dated public snapshot, and the hashes identify the captured HTTP response bodies; they are not asserted to be server-side checksums published by the CEO. The data is not a national crosswalk and must not be generalized to other states or UTs.

The remaining national requirements are open: authorized polling-station-to-AC crosswalks for all other jurisdictions; authoritative current AC polygons and legal extent-to-polygon adjudication; exact Gazette issue bytes for the 2008 and 2018 legal chain; and actual India Post delivery-beat evidence or an authenticated custodian response. Stage B remains PARTIAL / NOT ACCEPTED; Stage C and any staging/production database access remain unauthorized.