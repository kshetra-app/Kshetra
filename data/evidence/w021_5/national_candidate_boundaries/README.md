# National Assembly Constituency geometry candidate audit — NOT OFFICIAL

Pinned source repository: https://github.com/Marma-Fintech-Organization/india-electoral-boundaries.git
Commit: 3e4e9f347b260040278c36f563fb2efa28e2a476
Git tree SHA: 50d978efe1ff2d4cf450147967f2168994d5b84f

Disposition: CANDIDATE ONLY. This is not official national statutory boundary evidence and is not accepted as canonical geometry.

Acquired 4129 individual AC GeoJSON files across 36 state/UT codes. Source snapshot: india_electoral_boundaries_source_snapshot.tar.gz (18551699 bytes; SHA-256 ba58ce09b5722daf464b4f827cff06423da39b2d421e326b02e5cb40b4043035). Per-file raw SHA-256 and Git blob SHA are in source_file_inventory.json.gz. Full geometry/provenance audit is in candidate_geometry_audit.json.

The upstream documentation says the data is not official and not 100% accurate. GitHub reports licence metadata as Other/NOASSERTION; the upstream claims CC BY-SA 4.0 for data/docs and MIT for code, but some feature source identifiers are TBD. Preserve the upstream attribution and licence/source documents included in the snapshot. Source-level attribution and reuse rights remain unresolved.

A current TGRAC Telangana GIS response was separately fetched and hashed if the service was available. This is also a candidate source, with no verified legal effective date/version/licence and a known invalid Dornakal polygon. Geometric comparisons are screening only; make_valid is used only in memory to compare geometries, never to rewrite raw source files.
