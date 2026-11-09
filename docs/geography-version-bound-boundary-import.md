# Version-bound geography boundary import

The PostGIS loader in migration `086_version_bound_national_geometries.sql` imports one complete current entity class per call. Import state polygons first, followed by AC, PC, and district boundaries. Each supplied feature must map by an exact canonical code; fuzzy name matching and partial loads are rejected.

Before import, register the original boundary artifact in `data_sources`, `datasets`, `dataset_versions`, and `evidence_records`. The source must have `constitutional` or `statutory` authority, the dataset version must be `OFFICIAL` or `VERIFIED`, and the evidence record must refer to the same version and SHA-256. The importer independently hashes the source file and compares it to that registered checksum. The SQL loader rechecks the registration and evidence and records the source dataset/version, source feature ID, source checksum, and normalized geometry checksum on each current canonical version.

Create a crosswalk JSON object from stable source feature IDs to canonical codes, for example:

```json
{
  "SOI-feature-0001": "IN-STATE-01",
  "SOI-feature-0002": "IN-STATE-02"
}
```

Run one import per entity class:

```powershell
$env:DATABASE_URL = "<direct Postgres connection string>"
npx tsx scripts/import_geography_version_boundaries.ts `
  --type STATE `
  --dataset-version-id soi-state-2025-v1 `
  --geojson data/official/state-boundaries.geojson `
  --crosswalk data/official/state-boundaries.crosswalk.json
```

Repeat with `--type PC`, `--type DISTRICT`, and `--type AC` and the matching complete source artifacts. The loader verifies exact coverage of all current versions, geometry validity/type/SRID/area, containment in current state polygons, positive-area overlaps, and per-state partition coverage. Its write and load-ledger record are atomic. Failed or incomplete loads leave no partial boundary writes.

Then run `npx tsx scripts/audit_version_bound_geography.ts` with the same `DATABASE_URL`. The RPC writes its audit report and ledger row atomically; the CLI checks that persisted row and exits with status 2 when the audited data is not certified. `checksComplete` and `certified` are true only when every current AC, PC, district, and state version has a verified, valid boundary; every child is contained in its current state; entity classes have no positive-area overlaps or coverage gaps; and the audit has no source-provenance failures.

The repository's checked-in Telangana boundary fixture is attributed community data. It is useful for geometry regression tests, not for production certification. Do not register it as constitutional/statutory evidence or use it to claim nationwide coverage. The import currently requires a complete, officially sourced artifact and a canonical-code crosswalk; no such nationwide PC dataset is checked into this repository.
