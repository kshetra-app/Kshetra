# GEO-01 — National geometry release gate

## Decision
**P0 remains OPEN / release BLOCKED.** This change makes the issue explicit and enforceable; it does not fabricate official boundaries.

The current statutory register, `reports/w021_5b1_r5_current_regime_matrix.json`, specifies 31 assembly jurisdictions, 4,123 ACs and 543 PCs. The legacy mobile manifest differs in Assam (+7), Gujarat (-17), Jharkhand (+14), Karnataka (+1), Kerala (+1), Madhya Pradesh (-4), Rajasthan (+1), Tamil Nadu (+1) and Jammu & Kashmir (+17). Nine jurisdictions are marked placeholders. File existence or polygon presence is not proof of official provenance or topology validity.

## Implemented guardrails
- `apps/mobile/data/geo-manifest.json` adds a versioned `_geographyReleaseContract` for each of the 31 jurisdictions. Every jurisdiction has `releaseApproved: false` until independent verification, and known mismatches/placeholders are distinctly classified.
- `scripts/validate-national-geography.mjs` compares the manifest and actual GeoJSON feature counts against the statutory matrix; checks FeatureCollection shape, IDs, Polygon/MultiPolygon types, closed rings, finite WGS84 bounds and jurisdiction codes; writes a detailed report and exits nonzero while blockers remain.
- `reports/geo-01-reconciliation-baseline.json` captures the pre-remediation per-jurisdiction differences.
- `tests/geo-01-national-geometry.test.mjs` locks the baseline, explicit deltas and fail-closed policy.

## Mandatory release criteria
1. Replace placeholder/quarantined geometry with official ECI/Delimitation Commission or other competent authority sources. Capture URL/document ID/title, dataset version/hash, publication date and jurisdiction effective date alongside the exact bytes.
2. Preserve official IDs and reconcile every polygon to its canonical constituency and current statutory regime. Name-only or ordinal-only matches do not qualify.
3. Independently validate polygon validity/self-intersection, coverage, gaps, overlaps and jurisdiction bounds against authoritative source geometry using a spatial engine such as PostGIS/GEOS. The lightweight Node validator does not claim these proofs.
4. The generated reconciliation must show zero unexplained count/ID differences. Only an independent verifier may promote `releaseApproved` after checking exact source bytes and evidence.
5. Keep failed jurisdictions' geometry-dependent map features unavailable in production.

## Reproduction
```sh
node scripts/validate-national-geography.mjs
node --test tests/geo-01-national-geometry.test.mjs
```

The validator should fail until the source data and independent topology verification are complete; that is intentional. No staging or production database is touched by this change.
