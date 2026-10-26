# W021.5 Stage B — Pinned National AC Geometry Candidate Acquisition and Forensic Audit (2026-10-26)

**Disposition:** THIRD-PARTY SOURCE SNAPSHOT ACQUIRED, HASHED AND AUDITED; REJECTED FOR CANONICAL USE  
**Acceptance:** W021.5 Stage B remains PARTIAL / NOT ACCEPTED  
**Safety:** No product code, migrations, staging/production database access, or geometry repair/import performed. Stage C remains unauthorized.

## 1. Source identity and retained provenance

- Repository: https://github.com/Marma-Fintech-Organization/india-electoral-boundaries.git
- Pinned upstream commit: 3e4e9f347b260040278c36f563fb2efa28e2a476
- Pinned upstream Git tree: 50d978efe1ff2d4cf450147967f2168994d5b84f
- Acquisition/audit workflow: https://github.com/kshetra-app/Kshetra/actions/runs/40329997952
- Evidence-only branch: cto/w0215-stage-b-evidence-20261025
- Durable evidence commit: 32dc58769af29b2e8233db87873824b548836cf6

| Artifact | Path | Byte length | SHA-256 |
|---|---|---:|---|
| Pinned upstream repository snapshot | data/evidence/w021_5/national_candidate_boundaries/india_electoral_boundaries_source_snapshot.tar.gz | 18551699 | ba58ce09b5722daf464b4f827cff06423da39b2d421e326b02e5cb40b4043035 |
| Forensic audit report | data/evidence/w021_5/national_candidate_boundaries/candidate_geometry_audit.json | 206073 | db681fcc0a0ff7d06882ad6e9165aae60d8e4b9463111f4fc47bf97f67589da1 |
| Compressed per-file source inventory | data/evidence/w021_5/national_candidate_boundaries/source_file_inventory.json.gz | 510309 | 9ed6003316ebd47a713a5e9d3bb9dfc5e6bc4917458b62783dc628899c46df36 |
| Raw TGRAC state-GIS comparator response | data/evidence/w021_5/national_candidate_boundaries/tgrac_master_ac_response.json | 12469989 | c5d0cbf55f5079cd91b0ce3a8733ce11701a70f0ea474cdd96025ec8c651e444 |

The snapshot contains the exact source-repository files at the pinned commit, including the upstream attribution/licence documents. The compressed inventory records each of the 4129 AC GeoJSON files' raw byte length, SHA-256 and Git blob SHA. The workflow re-opened its generated JSON and gzip inventory and checked their hashes before committing.

## 2. Independent audit result

- AC GeoJSON files: **4129**
- State/UT codes represented: **36**
- Invalid geometries: **65**
- Feature files with unresolved/TBD source provenance: **4129** (100%)
- Positive-area overlap pairs among valid polygons, intersection area greater than 1 m²: **154**
- GitHub feature identity and filename mismatches: **0**
- Coordinates outside WGS84 longitude/latitude bounds: **0**
- Geometry/parse/seat-type error records: **70**
- Geometry types: {"Polygon":3949,"MultiPolygon":180}
- Quality labels: {"unverified":4129}

State-level feature counts, validity reasons, duplicate-name flags, pairwise overlap counts, every invalid file and per-file provenance are retained in the machine-readable audit and source inventory. The audit does not silently repair any original geometry.

## 3. Telangana comparison against a separately captured TGRAC service response

The workflow separately captured the public TGRAC Master Administrative Boundary query response (12469989 bytes, SHA-256 c5d0cbf55f5079cd91b0ce3a8733ce11701a70f0ea474cdd96025ec8c651e444; 119 features) and retained its raw bytes. Name-normalized comparison matched 108 candidate features to 119 TGRAC features. Threshold counts are {"symdiffOver1m2":108,"symdiffOver10kM2":91,"symdiffOver100kM2":31,"hausdorffOver100m":21}. The per-AC symmetric-difference areas, Hausdorff distances, name matches, unmatched features and source hash references are preserved in the audit report.

This is geometric screening, not a legal acceptance test. The TGRAC layer is itself a candidate with no independently verified legal effective date/version or reuse licence and contains an invalid Dornakal polygon. Any in-memory repair used for comparison did not overwrite source bytes.

## 4. Provenance and licence ruling

The upstream README explicitly says this dataset is not official and is not 100% accurate. GitHub API licence metadata reports **Other / SPDX NOASSERTION**. The upstream README/SOURCES claim CC BY-SA 4.0 for data/documentation and MIT for code, but the source notes include unresolved/TBD provenance for individual features.

Accordingly, this source is retained as a reproducible third-party comparison candidate only. It must not be used as official ECI/state-CEO geometry, imported into production, or used to claim statutory extent-to-polygon compliance. Source-level attribution and redistribution rights remain subject to independent per-feature review.

## 5. Remaining Stage B evidence

This audit does **not** close:
- The original ECI Delimitation Order, 2008 PDF bytes and original Gazette issue(s), including resolution of the S.O.382(E)/S.O.383(E)/S.O.453(E) reference conflict.
- The actual Gazette of India O.N.55(E) issue and Andhra Pradesh State Gazette counterpart/certified copy for the 2018 notification.
- A complete jurisdiction-by-jurisdiction legal instrument/effective-date chain.
- Authoritative national canonical AC geometry, source-owner lineage/licence, and legal extent-to-polygon adjudication.
- National official polling-station-to-AC crosswalks beyond the validated Delhi slice.
- Actual India Post delivery-beat geometry/data or an authenticated Department of Posts response. PIN-code boundaries and manually described beat lists are not equivalent to verified national delivery-beat polygons.

**Final disposition:** This closes the acquisition and forensic screening of one third-party national candidate, not the national geometry acceptance gate. W021.5 Stage B remains PARTIAL / NOT ACCEPTED; EB-01–EB-05 and W021.5-B1-04 remain open, EB-06 awaits independent adjudication, and Stage C/database access remain unauthorized.