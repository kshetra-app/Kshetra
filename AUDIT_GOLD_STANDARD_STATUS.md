# Gold-Standard Audit — Project Status

**Date:** 2026-06-16 · **Last updated: 2026-06-22 (Sprint 52)**
**Method:** automated audit scripts (`scripts/audit-all-geojson.mjs`, seed entry counts).
**Purpose:** persistent scorecard of data/map "gold standard" so progress isn't
lost between sessions. Update this file as states are fixed.

> **⭐ SINGLE SOURCE OF TRUTH (2026-06-22):** This file + `building.md` Sprint 52 are the
> canonical, verified status. Earlier optimistic/contradictory claims in
> `KSHETRA_360_Analysis.md` and the pre-2026-06-22 `FEATURE_PARITY_TRACKER.md` are
> superseded where they disagree. Verified this session via `tsc` (EXIT 0 mobile/api/shared)
> + 278/278 seed tests + `audit-all-geojson.mjs`.
>
> **Sprint 52 changes (all from authoritative TCPD/ECI data, zero fabrication):**
> - Constituency seeds rebuilt to full official strength with REAL votes/margins/runner-ups/
>   districts/turnout/electors: **Gujarat 182, Punjab 117, Uttar Pradesh 403, Bihar 243, Goa 40**.
> - Historical per-AC results backfilled: **Kerala 2016=140, West Bengal 2016=294,
>   Uttar Pradesh 2017=403, Tamil Nadu 2016=232** (2 postponed seats omitted, not fabricated).
> - **Tamil Nadu map** source-cleaned: bad rings 12→0, duplicate acNo 2→0 (now 233/234, only
>   AC 185 polygon missing).
> - **Administrative Hierarchy drill-down UI** shipped (`app/hierarchy/[id].tsx`).
> - Clarified: AS/TN/WB/KL/PY `2026` are **actual** results (June-2026 timeline), not projections.

> Definitions
> - **GOLD** = GeoJSON feature count == official seats, no acNo dup/gap/out-of-range,
>   valid geometry, no centroid scatter **AND** constituency seed count == official.
> - "official seats" = current Assembly strength.

---

## 1. Summary scorecard

| Status | Count | States |
|---|---|---|
| **GOLD (both map + seed clean)** | 3 | Andhra Pradesh, Maharashtra, West Bengal |
| **Near-gold (seed correct, map minor)** | 5 | Karnataka, Kerala, Telangana, Tamil Nadu, Uttar Pradesh |
| **Map OK, seed short** | 6 | Bihar, Chhattisgarh, Goa, Haryana, Odisha, Punjab |
| **Map + seed both off** | 8 | Assam, Gujarat, Jharkhand, J&K, Madhya Pradesh, Rajasthan, Himachal*, Delhi* |
| **No map (empty GeoJSON)** | 9 | Arunachal, Meghalaya, Manipur, Mizoram, Nagaland, Puducherry, Sikkim, Tripura, Uttarakhand |

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

| Correct seed count (== official) | Short / wrong seed count |
|---|---|
| AP 175, KA 224, KL 140, MH 288, TN 234, TG 119, WB 294, HP 70, JK 90, **BR 243**, **GA 40**, **GJ 182**, **PB 117**, **UP 403**, AR 60, MN 60, ML 60, MZ 40, NL 60, PY 30, SK 32, TR 60, UK 70 | AS 112/126, CG 81/90, HR 80/90, JH 73/81, MP 208/230, OD 132/147, RJ 187/200, DL 221(anomaly) |

**Sprint 52 (2026-06-22):** BR/GA/GJ/PB/UP rebuilt from authoritative TCPD data to full
official strength **with real votes/margins/runner-ups/turnout/electors** (the old seeds
had `winnerVotes: 0` and corrupted districts). The remaining short seeds (AS, CG, HR, JH,
MP, OD, RJ, DL) have a CURRENT election that post-dates the TCPD public dump (2023–2026),
so completing them needs an ECI/Wikipedia current-year source — tracked in the deferred
queue. The earlier NE/UT entries (AR/MN/ML/MZ/NL/PY/SK/TR/UK) are in fact already at full
seed count; the old "53/60" etc. figures were stale.

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
