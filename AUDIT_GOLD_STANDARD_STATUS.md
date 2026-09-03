# Gold-Standard Audit — Project Status

**Date:** 2026-06-16 · **Last updated: 2026-06-25 (Sprint 53)**
**Method:** automated audit scripts (`scripts/audit-all-geojson.mjs`, seed entry counts).
**Purpose:** persistent scorecard of data/map "gold standard" so progress isn't
lost between sessions. Update this file as states are fixed.

> **⭐ SINGLE SOURCE OF TRUTH (2026-06-25):** This file + `building.md` Sprint 53 are the
> canonical, verified status. Earlier optimistic/contradictory claims in
> `KSHETRA_360_Analysis.md` and the pre-2026-06-22 `FEATURE_PARITY_TRACKER.md` are
> superseded where they disagree.
>
> **Sprint 53 changes (100% official seats across ALL 31 states — zero fabrication):**
> - **Delhi (70/70):** Rebuilt from ECI February 2025 results (`2025Assembly-DL.json`), replacing MCD 2022 municipal wards with official Assembly Constituencies 1–70.
> - **Haryana (90/90):** Rebuilt from ECI October 2024 results (`2024Assembly-HR.json`) with all 90 constituencies, real EVM/postal votes, margins, and runner-ups.
> - **Jharkhand (81/81):** Rebuilt from ECI November 2024 results (`2024Assembly-JH.json`) with all 81 constituencies, real votes, margins, and runner-ups.
> - **Himachal Pradesh (68/68):** Reconciled to 68 official ACs (AC 1 Churah to AC 68 Kinnaur) from ECI 2022 results, removing appended bye-election duplicates.
> - **Rajasthan (200/200):** Expanded from 187 to all 200 seats using 2023 election results + TCPD baseline, fixing district name corruptions (`'Sc'`/`'St'`).
> - **Madhya Pradesh (230/230):** Expanded from 208 to all 230 seats from 2023 election results + TCPD baseline.
> - **Chhattisgarh (90/90):** Expanded from 81 to all 90 seats from 2023 election results + TCPD baseline.
> - **Odisha (147/147):** Expanded from 132 to all 147 seats from 2024 election results + TCPD baseline.
> - **Assam (126/126):** Expanded from 112 to all 126 seats from 2021 election results + TCPD baseline.
> - **Seed Coverage:** **31 out of 31 states (100%) now match their official Assembly strength.**

> Definitions
> - **GOLD** = GeoJSON feature count == official seats, no acNo dup/gap/out-of-range,
>   valid geometry, no centroid scatter **AND** constituency seed count == official.
> - "official seats" = current Assembly strength.

---

## 1. Summary scorecard

| Status | Count | States |
|---|---|---|
| **GOLD (both map + seed clean)** | 10 | Andhra Pradesh, Delhi, Jammu & Kashmir, Meghalaya, Mizoram, Nagaland, Tripura, Uttarakhand, Uttar Pradesh, West Bengal |
| **Near-gold (seed 100% official, map minor)** | 12 | Arunachal Pradesh, Bihar, Chhattisgarh, Goa, Haryana, Himachal Pradesh, Karnataka, Kerala, Odisha, Punjab, Telangana, Tamil Nadu |
| **Seed 100% official, map coverage in progress** | 9 | Assam, Gujarat, Jharkhand, Madhya Pradesh, Maharashtra, Manipur, Puducherry, Rajasthan, Sikkim |
| **Short seeds (< official seat count)** | **0** | **None (all 31 states are 100% official strength)** |
| **Empty maps (0 features)** | **0** | **None (all 31 states have populated GeoJSON maps)** |

\* Delhi seed count is anomalous (regex counted 221 acNo refs vs 70 seats — likely
nested/extra `acNo` fields; needs manual inspection). Himachal seed = 70 vs 68 (+2).

---

## 2. GeoJSON map audit (apps/mobile/data/*-assembly.json)

| State | Feat/Official | MB | Findings |
|---|---|---|---|
| Andhra Pradesh | 175/175 | 0.79 | **OK** (fixed this session) |
| Bihar | 243/243 | 4.27 | OK |
| Chhattisgarh | 90/90 | 1.75 | OK |
| Delhi | 70/70 | 0.09 | OK |
| Goa | 40/40 | 0.10 | OK |
| Himachal Pradesh | 68/68 | 1.25 | OK |
| Haryana | 90/90 | 0.87 | OK |
| Maharashtra | 288/288 | 3.66 | OK |
| Odisha | 147/147 | 3.49 | OK |
| Punjab | 117/117 | 1.74 | OK |
| Uttar Pradesh | 403/403 | 6.60 | OK |
| West Bengal | 294/294 | 3.23 | OK |
| Assam | 133/126 | 1.06 | COUNT +7, DUP acNo 7 |
| Gujarat | 165/182 | 4.33 | COUNT -17, MISSING 20, DUP 2, OOR 3 |
| Jharkhand | 95/81 | 1.12 | COUNT +14, DUP acNo 14 |
| Jammu & Kashmir | 107/90 | 1.19 | COUNT +17, DUP 19, OOR 2, MISSING 3, **SCATTER 2** |
| Karnataka | 225/224 | 4.06 | COUNT +1, OOR 1 |
| Kerala | 141/140 | 1.41 | COUNT +1, DUP acNo 1 |
| Madhya Pradesh | 226/230 | 4.75 | COUNT -4, MISSING acNo 4 |
| Rajasthan | 201/200 | 3.34 | COUNT +1, DUP acNo 1 |
| Telangana | 120/119 | 3.49 | COUNT +1, DUP acNo 1 |
| Tamil Nadu | 233/234 | 3.10 | **CLEANED (Sprint 52)** — bad rings 12→0, dup 2→0; only AC 185 polygon missing |
| Arunachal Pradesh | 0/60 | - | **EMPTY/PLACEHOLDER** |
| Meghalaya | 0/60 | - | EMPTY/PLACEHOLDER |
| Manipur | 0/60 | - | EMPTY/PLACEHOLDER |
| Mizoram | 0/40 | - | EMPTY/PLACEHOLDER |
| Nagaland | 0/60 | - | EMPTY/PLACEHOLDER |
| Puducherry | 0/30 | - | EMPTY/PLACEHOLDER |
| Sikkim | 0/32 | - | EMPTY/PLACEHOLDER |
| Tripura | 0/60 | - | EMPTY/PLACEHOLDER |
| Uttarakhand | 0/70 | - | EMPTY/PLACEHOLDER |

**Map summary: 12/31 clean.** Notably, the centroid-**SCATTER** check (which
exposed AP's scramble) only flags J&K now — so no other state has an AP-style
gross geometry scramble; the rest are count/duplicate/coverage issues.

> **STALE-ROW CORRECTION (2026-06-22):** The `0/60 EMPTY/PLACEHOLDER` rows for
> Arunachal, Meghalaya, Manipur, Mizoram, Nagaland, Puducherry, Sikkim, Tripura and
> Uttarakhand pre-date the "NE States Data Expansion" — those maps are now **populated
> with real geometry** (most clean; AR/MN/SK/PY have only minor count/scatter issues).
> Tamil Nadu was source-cleaned in Sprint 52. Always trust a fresh
> `node scripts/audit-all-geojson.mjs` run (currently **10/31 fully clean**) over these
> historical rows. Remaining real map gaps: AS/GJ/JH/MP missing-acNo polygons + TN AC 185.

Notes:
- TN `BADRING 12` is masked at runtime by `sanitizeGeoJSON()` in `geoLoader.ts`,
  but the source file should still be cleaned.
- J&K official strength is 90 post-2022 delimitation; current data (107, with
  dups/scatter) predates/mismatches it and needs a full rebuild like AP.

---

## 3. Constituency seed audit (data/seed/*-constituencies.ts)

Seeds matching official seat count (drive the correct Explore-tab number):

| Correct seed count (== official) — **31/31 (100%)** | Short / wrong seed count |
|---|---|
| AP 175, AR 60, AS 126, BR 243, CG 90, DL 70, GA 40, GJ 182, HR 90, HP 68, JK 90, JH 81, KA 224, KL 140, MP 230, MH 288, MN 60, ML 60, MZ 40, NL 60, OD 147, PB 117, PY 30, RJ 200, SK 32, TN 234, TS 119, TR 60, UP 403, UK 70, WB 294 | **None (0 remaining)** |

**Sprint 53 (2026-06-25):** All 9 remaining anomalous/short states (DL 70, HR 90, JH 81, HP 68, RJ 200, MP 230, CG 90, OD 147, AS 126) were rebuilt to 100% official strength using authoritative ECI/TCPD election results with real votes, margins, runner-ups, and genuine district assignments. Zero synthetic/fabricated data. All 31 state seeds now strictly match their official legislative assembly strength.

---

## 4. LOC status (source code only)

Only 5 hand-maintained source files exceed 800 lines:

- `apps/mobile/app/constituency/[id].tsx` (1287)
- `apps/mobile/lib/supabaseDataService.ts` (1082)
- `apps/mobile/stores/civic.ts` (982)
- `apps/mobile/stores/affidavits.ts` (914)
- `apps/mobile/components/ShortsPlayerModal.tsx` (858)

All other >800-line files are generated **data seeds** (e.g. WB MLA profiles 29.7k
lines), to which an <800 source-code rule does not apply.

---

## 5. Recommended priority order

1. **Constituency seeds** — rebuild short seeds to full official strength
   (authoritative votes where available), using the AP method
   (`scripts/build-ap-seed.mjs` pattern). Biggest user-visible win.
2. **Empty maps (9 states)** — source authoritative boundaries (the
   `scripts/build-ap-geo.mjs` reconciliation pattern works once a source is found).
3. **J&K** — ✅ DONE (seed + MLA + demographics + map all gold).
4. **Count/dup map cleanups** — Assam, Jharkhand, Gujarat, MP, plus the +1/dup
   states (KA, KL, RJ, TG, TN).
5. **TN source GeoJSON** — fix the 12 bad rings at source (currently runtime-sanitized).
6. **LOC** — optionally split the 5 large source files.

---

## 5a. Execution log (in progress)

**Order requested by user:** option 3 (J&K) → 4 (empty maps) → 1 (2026 states) → 2 (stable states), with latest data + timeline changes, strict MLA/MP template, zero fabrication.

| Item | Status | Notes |
|---|---|---|
| Karnataka CM change | **DONE** | `chiefMinisters.ts` → D. K. Shivakumar (INC), sworn 3 Jun 2026; timeline note added. Verified via The Hindu / NIE. 224-seat composition unchanged (mid-term transition, no election). |
| J&K constituency seed | **DONE (gold)** | `jammu-kashmir-constituencies.ts` rebuilt from Wikipedia 2024 "Results by constituency". 90 seats, official AC 1-90, real votes/margins/districts, 7 SC + 9 ST. Tally JKNC42 BJP29 IND7 INC6 JKPDP3 JKPC1 CPI(M)1 AAP1 = 90. Script: `scripts/build-jk-seed.mjs`. |
| J&K MLA profiles re-key | **DONE (gold)** | `jammu-kashmir-mla-profiles.ts` re-keyed to official acNo 1-90, unique/contiguous, districts fixed, by-election overrides handled. 10 seats absent from MyNeta got identity-verified profiles (name/party/constituency/district/reservation only — unsourced affidavit fields omitted, not fabricated). Scripts: `rekey-jk-mla.mjs`, `jk-missing-profiles.mjs`. |
| J&K demographics re-key | **DONE (gold)** | `jammu-kashmir-demographics.ts` regenerated to 90 entries, acNo 1-90, no gaps/dups, correct districts. Honest INDICATIVE-ESTIMATES disclaimer added (district-level Census 2011 model, matching AP). Generator gained safe single-state CLI arg: `node scripts/generate-demographics.js JK`. |
| J&K map (current 90-AC) | **DONE (gold)** | `apps/mobile/data/jk-assembly.json` rebuilt: 90 features, AC 1-90 unique/contiguous, 0 bad rings, 0 NaN, 0 off-grid centroids, 0.30 MB (was obsolete 107-feature/87-AC+Ladakh junk). Source: `shijithpk/2024_maps_supplement` `j_and_k_assembly_new_borders.geojson` (CEO-J&K delimitation PDF + NIC map server, seat_id fixed to ECI numbering). PoK feature 9999 dropped. Matched by seat_id→acNo, seed names stamped. Script: `scripts/build-jk-geo.mjs`. Audit: J&K 90/90 OK. |
| GJ/PB/UP/BR/GA constituency seeds (Sprint 52) | **DONE (gold)** | Rebuilt to full official strength from TCPD `<State>_AE.csv.gz` with real winner/runner-up (party+name), votes, margins, turnout, electors, correct districts. Tallies match official (GJ BJP156/INC17; PB AAP92; UP BJP255/SP111; BR RJD75/BJP74/JDU43; GA BJP20). Script: `scripts/rebuild-short-seed.mjs`. |
| KL/WB/UP/TN historical results (Sprint 52) | **DONE (gold)** | Per-AC prior-election results backfilled from TCPD: KL 2016=140, WB 2016=294, UP 2017=403, TN 2016=232 (2 postponed seats omitted, not fabricated). Script: `scripts/build-historical-results.mjs`. |
| Tamil Nadu map clean (Sprint 52) | **DONE (source-clean)** | `tn-assembly.json`: 12 bad rings → 0, 2 duplicate acNos → 0 (Tirupattur AC50, Nannilam AC169). Now 233/234; AC 185 polygon genuinely absent → queued for authoritative boundary. Script: `scripts/fix-tn-geo.mjs`. |
| Administrative Hierarchy UI (Sprint 52) | **DONE** | `app/hierarchy/[id].tsx` + `lib/hierarchyData.ts` — Booth→Panchayat→Mandal→Constituency drill-down, linked from constituency screen (TS AC1–5, AP AC1–3). |
| Delhi constituency seed (Sprint 53) | **DONE (gold)** | `delhi-constituencies.ts` rebuilt to 70 official Assembly seats from ECI Feb 2025 results (`2025Assembly-DL.json`). Tally: BJP 48, AAP 22 = 70. Script: `scripts/build-dl-seed.mjs`. |
| Haryana constituency seed (Sprint 53) | **DONE (gold)** | `haryana-constituencies.ts` rebuilt to 90 official seats from ECI Oct 2024 results (`2024Assembly-HR.json`). Tally: BJP 48, INC 37, IND 3, INLD 2 = 90. Script: `scripts/build-hr-seed.mjs`. |
| Jharkhand constituency seed (Sprint 53) | **DONE (gold)** | `jharkhand-constituencies.ts` rebuilt to 81 official seats from ECI Nov 2024 results (`2024Assembly-JH.json`). Tally: JMM 34, BJP 21, INC 16, RJD 4, CPIML 2, AJSU 1, LJPRV 1, JLKM 1, JDU 1 = 81. Script: `scripts/build-jh-seed.mjs`. |
| Himachal Pradesh seed reconcile (Sprint 53) | **DONE (gold)** | `himachal-pradesh-constituencies.ts` reconciled to 68 official ACs from ECI 2022 results, removing appended bye-election duplicates. Tally: INC 40, BJP 25, IND 3 = 68. Script: `scripts/build-hp-seed.mjs`. |
| RJ, MP, CG, OD, AS seeds rebuild (Sprint 53) | **DONE (gold)** | Rebuilt from ECI/TCPD election results to 100% official counts: RJ 200/200, MP 230/230, CG 90/90, OD 147/147, AS 126/126. District names cleaned from `'Sc'`/`'St'` corruptions. Script: `scripts/rebuild-5-states.mjs`. All 31 state seeds now 100% official strength. |

### Two-layer map architecture (resolves the "boundary" question)
- **Layer A — CURRENT (real geometry):** authoritative open boundary GeoJSON reconciled + re-keyed to the seed (AP pipeline). Zero fabrication. This is what every "present" map uses; the pending nationwide delimitation does NOT affect current boundaries.
- **Layer B — PROJECTED (simulated):** the `DELIMITATION_MASTERPLAN.md` population-balanced simulator (Phase D2) over Census + district polygons, rendered as the dashed "proposed" overlay and explicitly labeled "projection, not prediction."

This lets options 3/4/1/2 complete with no fabrication: real where real, simulated only where explicitly badged as a projection.

## 6. Audit how-to (re-run anytime)

```
node scripts/audit-all-geojson.mjs     # map scorecard
# seed counts:
Get-ChildItem data/seed/*constituencies*.ts | % { @{Entries=(Select-String $_ -Pattern 'acNo:\s*\d+' -AllMatches).Matches.Count; File=$_.Name} }
```

Update the tables above whenever a state is fixed.
