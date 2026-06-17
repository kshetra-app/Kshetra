# Andhra Pradesh Data & Map Fix — Postmortem

**Date:** 2026-06-16
**Scope:** `apps/mobile/data/ap-assembly.json`, `data/seed/andhra-pradesh-*.ts`
**Status:** Resolved

This note documents the problems found in the Andhra Pradesh (AP) constituency
data and map, the investigation, the difficulties encountered, and the final
resolution. It is intended as a reference for fixing the same class of issues in
other states.

---

## 1. Symptoms reported

- The AP **Explore tab showed 180 constituencies** instead of the official 175.
- The AP **map polygons were scrambled** — several constituencies rendered in the
  wrong geographic location (most visibly in the Rayalaseema region).
- MLA profiles and demographics appeared **misaligned** with the constituency
  they were shown against.

---

## 2. Root causes

### 2.1 Constituency seed (`data/seed/andhra-pradesh-constituencies.ts`)
- Contained **180 entries** (AC No. 1–182 with gaps; 155 and 173 missing,
  176–182 appended as placeholders).
- The extra entries had **empty districts and zero vote counts** (placeholders).
- Several rows had **fabricated votes/margins** and district values set to
  literal `Sc` / `St` (a reservation tag had leaked into the district field).
- **AC numbering did not match the official ECI sequence**, so any `acNo`-based
  join (MLA profiles, demographics) was keyed against the wrong constituency.

### 2.2 Map GeoJSON (`apps/mobile/data/ap-assembly.json`)
- The file had the correct **overall AP outline** (state bounding box and the
  coastal belt matched reality), **but the constituency labels were assigned to
  the wrong polygons** in the interior/southern (Rayalaseema) region.
- Concretely, the polygon labeled **Kuppam** sat ~190 km north of the real Kuppam
  (which is at the extreme south-west tip bordering Tamil Nadu/Karnataka).
  Tirupati, Kadapa, and Hindupur were similarly displaced by 1.0°–1.7°.
- Because the polygon→name mapping itself was corrupt, **re-labeling the existing
  geometry was not reliable** — there was no trustworthy internal key to fix it
  against.

### 2.3 MLA profiles (`data/seed/andhra-pradesh-mla-profiles.ts`)
- Header claimed "All 180 MLAs"; the party distribution did not match the real
  175-seat result, confirming it was built on the corrupt 180-seat base.
- Profiles were keyed by `acNo`. The `getAPMLAProfile()` lookup is a direct
  `acNo` match, so misaligned `acNo` served **the right name with the wrong
  person's affidavit data** (assets, criminal cases).
- The MyNeta source (`scrapers/output/myneta/AndhraPradesh2024-winners.json`)
  assigns `acNo` **alphabetically by constituency name**, not by official ECI
  numbering — so it could not be used as a drop-in key.

### 2.4 Demographics (`data/seed/andhra-pradesh-demographics.ts`)
- Keyed by `acNo`, values were **synthetic estimates** ("2011 Census
  projections … approximated from district-level proportions"), not authoritative
  per-constituency statistics. The grouping comments followed the old, wrong
  numbering.

---

## 3. How the issues were resolved

### 3.1 Rebuilt the constituency seed (authoritative)
- Wrote a generator that pulled the **2024 AP Assembly election results from
  Wikipedia raw wikitext** ("Results by constituency").
- Parsed winner/runner-up, party, votes, and margin per seat; derived the
  reservation type (GEN/SC/ST) from the **authoritative name suffix** rather than
  the error-prone old seed.
- Produced exactly **175 entries with the official AC numbering** and real
  votes/margins. Telugu names / reservation tags were merged in where available.

### 3.2 Replaced the map GeoJSON with authoritative boundaries
This was the hardest part (see Difficulties below). Final approach:

1. **Sourced** an authoritative 175-feature AP assembly boundaries file from the
   public repo `njaideep2003/Andhra-Pradesh-Elections-2024-Results`
   (`ANDHRA PRADESH_ASSEMBLY.geojson`, ~18 MB raw). Its properties include
   `assem_name`, `district`, `type` (GEN/SC/ST), and clean geometry.
2. **Validated quality** by computing polygon centroids and comparing against
   known landmark coordinates — Kuppam, Tirupati, Kadapa, Hindupur all landed in
   the correct place (the only apparent "miss" was my own reference coordinate for
   Ichchapuram being slightly off).
3. **Re-keyed every polygon to the official seed** (`acNo` / canonical name /
   district) so that:
   - 18 spelling variants were aliased (e.g. `VISHAKAPATNAM` → `Visakhapatnam`,
     `KAKINADA URBAN` → `Kakinada City`, `YSR KADAPA` → `Kadapa`,
     `THAMALLAPALLE` → `Thamballapalle`).
   - The two **duplicate-base-name pairs** were disambiguated **by district**, not
     by name: `Gannavaram` (Krishna → #71, Konaseema → #46) and `Prathipadu`
     (Guntur → #93, East Godavari/Kakinada → #36).
   - The output writes the **canonical seed name into `AC_NAME`**, so the app's
     `enrichGeoJSONForState()` matches by exact name with no alias dependence.
4. **Simplified the geometry** (Douglas–Peucker, ε ≈ 0.0008° ≈ 88 m, plus culling
   of sliver sub-polygons and 4-decimal coordinate rounding):
   **462,036 → 45,188 vertices**, **8.74 MB → 0.79 MB** — in line with peer state
   files (UP/403 seats is 6.6 MB).

### 3.3 Re-keyed MLA profiles
- Re-mapped each profile to the official `acNo` using a **dual join key**:
  constituency name (alias-normalized) **and** MLA name vs. the seed's winner.
- **Dropped bogus/surplus profiles** (those that mapped to the placeholder
  900+ range); 172/175 cleanly aligned.
- Updated the header to state the correct count, party split, the re-keying
  method, and that `electionHistory` vote/margin figures are not authoritative.

### 3.4 Documented the demographics honestly
- Updated the header to state the data are **indicative estimates**, not
  authoritative per-constituency statistics, and flagged the need for real data.

---

## 4. Difficulties encountered

- **The geometry was corrupt, not just the labels.** The overall AP shape looked
  right, which masked the problem; only per-polygon centroid checks against real
  landmark coordinates revealed that interior labels were shuffled. Lesson:
  verify maps by **centroid-vs-landmark distance**, not by eyeballing the outline.
- **No usable internal key to relabel against.** Because both the polygon→name
  mapping and the seed `acNo` ordering were wrong, in-place relabeling would have
  been circular. A clean external boundary source was required.
- **The obvious open-data source (datameet/maps) was unsuitable.** Its assembly
  data is from 2014, only ships shapefiles (not GeoJSON), is explicitly flagged
  for "some shift in the data", and **Telangana ACs are still tagged as Andhra
  Pradesh** — i.e. likely the very origin of the scramble. Initial fetch attempts
  also 404'd; the GitHub tree API confirmed only `.shp/.dbf/.shx`, not GeoJSON.
- **Duplicate constituency names.** AP has two `Gannavaram` and two `Prathipadu`
  seats. Name-only matching collapsed each pair onto one `acNo`, leaving the other
  uncovered. Fixed by disambiguating on the `district` property.
- **Spelling drift between sources.** The boundary file used uppercase, variant
  spellings (`VIZIANAGARM`, `S.MYDUKUR`, `SULLURUPETA`). These had to be aliased
  to the seed's canonical names; the reconciliation was done iteratively until
  all 175 matched 1:1.
- **File size.** The authoritative geometry was over-detailed (18 MB / 462k
  vertices). A first DP pass barely shrank it because of a subtle bug.

### 4.1 Key bug during simplification (worth remembering)
The Douglas–Peucker pass initially produced **no reduction**. Cause: GeoJSON
polygon rings are **closed** (first vertex == last vertex). Running DP with the
first and last point identical makes the anchor segment **degenerate**, so the
perpendicular distance computes as 0 for every point, DP collapses the ring to 2
points, and a safety fallback then restored the full unsimplified ring.
**Fix:** run DP on the **open path** (drop the duplicate closing vertex), then
re-close the ring afterwards. After this, 462k → 45k vertices.

---

## 5. Final verification

Automated checks on the rebuilt `apps/mobile/data/ap-assembly.json`:

- **175 features**, 0 degenerate rings, 0 NaN/Infinity coordinates.
- **175/175 names match the seed**, 0 `acNo` mismatches, `acNo` values 1–175 all
  unique.
- **Landmark centroid sanity** all within tolerance — e.g. Kuppam `err=0.09°`
  (was `1.73°`), Tirupati `0.05°`, Kadapa `0.02°`, Hindupur `0.14°`.
- **Typecheck** clean except pre-existing, unrelated errors in
  `apps/mobile/lib/supabaseDataService.ts`.

---

## 6. How the app consumes this data (why the fix works end-to-end)

- `lib/enrichGeoJSON.ts` → `enrichGeoJSONForState()` matches each polygon to the
  seed (exact normalized name → space-stripped → alias → `acNo` fallback) and
  **overrides** `AC_NO`, `AC_NAME`, winner/party/margin, reservation, and
  demographics from the seed. Because the new file's `AC_NAME` equals the seed's
  canonical name, every feature matches on the first strategy.
- `lib/geoLoader.ts` → `sanitizeGeoJSON()` filters degenerate rings before
  MapLibre rendering (the new file already passes cleanly).
- `lib/stateDataDispatcher.ts` → MLA profiles and demographics are fetched by
  `acNo`; correct numbering now serves the correct person/figures.

---

## 7. Reusable playbook for other states

1. **Count check** — confirm seed entry count == official seat count; list
   duplicate, missing, and out-of-range `acNo`s.
2. **Centroid sanity** — compute each polygon's centroid and compare to a handful
   of known landmark coordinates; flag any > ~0.4° off. Do **not** trust the
   outline alone.
3. **Decide repair vs. replace** — if the polygon→name mapping is corrupt and
   there's no trustworthy internal key, **replace** with an authoritative boundary
   file rather than relabeling in place.
4. **Vet the source** — check vintage, post-2014 bifurcation correctness, and
   whether neighboring-state seats are mis-tagged (the datameet Telangana/AP issue).
5. **Re-key to the authoritative seed** by name, disambiguating duplicate names by
   **district**; write canonical names into `AC_NAME` so app-side enrichment
   matches on the first pass.
6. **Simplify geometry** with Douglas–Peucker on the **open** ring (re-close
   after) + coordinate rounding + sliver culling; target parity with peer state
   file sizes.
7. **Verify** feature count, ring validity, name/`acNo` 1:1 match, and landmark
   centroids before committing.

---

## 8. Generator scripts retained (provenance)

- `scripts/build-ap-seed.mjs` — builds the 175-seat seed from Wikipedia wikitext.
- `scripts/build-ap-geo.mjs` — re-keys + simplifies the authoritative boundaries
  into `apps/mobile/data/ap-assembly.json`.
- `scripts/rekey-ap-mla.mjs` — re-keys MLA profiles to official `acNo`.

One-off analysis/diagnostic scripts and large temp downloads were removed after
the fix.

---

## 9. Known follow-ups / caveats

- AP **demographics remain indicative estimates** — replace with real
  per-constituency Census/turnout data when available.
- MLA `electionHistory` vote/margin figures are **not authoritative**; the
  authoritative votes live in the constituency seed.
- 3 of 175 MLA profiles could not be cleanly matched and were dropped — backfill
  if/when verified affidavit data is sourced.
