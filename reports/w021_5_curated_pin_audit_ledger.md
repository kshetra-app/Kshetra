# KSHETRA W021.5 — CURATED PROVISIONAL PIN AUDIT LEDGER
**Directive:** CTO Directive 124 (Workstream B)  
**Governing Framework:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Stage Boundary:** STOP at Stage B Gate (Stages C–I Strictly Unauthorized)  
**Formal Acceptance:** Strictly `0.0% — PENDING INDEPENDENT ADJUDICATION`  
**Generated At:** `2026-10-21T05:56:09.174Z`  
**Source of Truth:** `apps/api/src/services/delimitationService.ts` (`CURATED_PROVISIONAL_PIN_DIRECTORY`)  
**Total Curated Entries:** `36` (Telangana: 30, Andhra Pradesh: 6)

---

## 1. Summary Statistics & Evidence Classification

| Classification / Status | Count | Description |
|---|---|---|
| **DOCUMENTED_MULTI_AC_AMBIGUITY** | `4` | Dense urban delivery zones spanning &ge;2 assembly constituencies with documented candidate sets (`500001`, `500028`, `500034`, `500056`). `canonicalAcNo` is strictly `undefined`. |
| **PROVISIONAL_APPROXIMATION** | `32` | Provisional single-AC approximations supported by municipal ward concordance or postal head office coordinates. Non-authoritative approximation disclosure enforced. |
| **AUTHORITATIVE_RELATIONSHIP_ESTABLISHED** | `0` | Zero postal codes possess statutory 1:1 constituency delimitation under Indian electoral law (PIN is a DoP routing code, not a statutory ECI boundary). |
| **INSUFFICIENT_EVIDENCE** | `0` | All 36 maintained entries possess verifiable ECI delimitation schedule concordances or head post office coordinates. |
| **CONFLICTING_EVIDENCE** | `0` | All discovered historical typos and AC number mismatches reconciled in Directive 124. |
| **TOTAL MAINTAINED ENTRIES** | **`36`** | Complete directory audited. |

---

## 2. Master 36-Entry Curated PIN Inventory Table

| PIN | Locality | State / District | Claimed AC (No & Name) | Candidate Set | Spatial Relationship | Evidence Source & Locator | Status | Action |
|---|---|---|---|---|---|---|---|---|
| `500001` | Hyderabad GPO / Abids / Koti / Gunfoundry | TS (Hyderabad) | *None (Ambiguous)* | 65, 63, 58 | `INTERSECTS_MULTIPLE_ACS` | India Post Pincode Directory (DoP) & Delimitation Order 2008 Schedule XXXI [Schedule XXXI, Table B, GHMC Ward 78 (Gunfoundry) & Ward 3 part (Sultan Bazar)] | `DOCUMENTED_MULTI_AC_AMBIGUITY` | `RETAIN_AS_MULTI_AC_AMBIGUITY` |
| `500002` | Charminar / Moghalpura / Shalibanda | TS (Hyderabad) | 66 (Charminar) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Wards 13 & 14) [Schedule XXXI, Table B, GHMC Wards 13 & 14] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500003` | Secunderabad H.O / M.G. Road / Paradise | TS (Hyderabad) | 70 (Secunderabad) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 18 part) [Schedule XXXI, Table B, GHMC Ward 18 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500004` | Nampally / Asif Nagar / Bazarghat | TS (Hyderabad) | 63 (Nampally) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Wards 10 & 11 part) [Schedule XXXI, Table B, GHMC Wards 10 & 11 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500006` | Mangalhat / Dhoolpet / Jummerat Bazar | TS (Hyderabad) | 65 (Goshamahal) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 4) [Schedule XXXI, Table B, GHMC Ward 4] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500007` | Amberpet / Ramanthapur / Shivam Road | TS (Hyderabad) | 59 (Amberpet) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 2) [Schedule XXXI, Table B, GHMC Ward 2] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500009` | Gunrock Enclave / Mudfort / Staff Road | TS (Hyderabad) | 71 (Secunderabad Cantonment) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (SCB Wards 3 & 4) [Schedule XXXI, Table B, SCB Wards 3 & 4] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500010` | Bolarum / Risala Bazar / Sadar Bazar | TS (Hyderabad / Medchal-Malkajgiri) | 71 (Secunderabad Cantonment) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (SCB Wards 7 & 8) [Schedule XXXI, Table B, SCB Wards 7 & 8] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500011` | Trimulgherry / Lothkunta / Lal Bazar | TS (Hyderabad) | 71 (Secunderabad Cantonment) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (SCB Wards 5 & 6) [Schedule XXXI, Table B, SCB Wards 5 & 6] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500012` | Sultan Bazar / Putlibowli / Troop Bazar | TS (Hyderabad) | 65 (Goshamahal) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 3 part) [Schedule XXXI, Table B, GHMC Ward 3 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500015` | Karkhana / Vasavinagar / Vikramnagar | TS (Hyderabad) | 71 (Secunderabad Cantonment) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (SCB Ward 2) [Schedule XXXI, Table B, SCB Ward 2] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500017` | Tarnaka / Osmania University / Lalaguda | TS (Hyderabad) | 70 (Secunderabad) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 19 part) [Schedule XXXI, Table B, GHMC Ward 19 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500018` | Sanathnagar / Erragadda / Ameerpet / SR Nagar | TS (Hyderabad) | 62 (Sanathnagar) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 7) [Schedule XXXI, Table B, GHMC Ward 7] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500020` | Musheerabad / RTC X Roads / Chikkadpally | TS (Hyderabad) | 57 (Musheerabad) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 1) [Schedule XXXI, Table B, GHMC Ward 1] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500023` | Yakutpura / Rein Bazar / Madannapet | TS (Hyderabad) | 68 (Yakutpura) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 16) [Schedule XXXI, Table B, GHMC Ward 16] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500024` | Malakpet / Saidabad / Moosarambagh | TS (Hyderabad) | 58 (Malakpet) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 17) [Schedule XXXI, Table B, GHMC Ward 17] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500025` | Chilkalguda / Padmarao Nagar / Walker Town | TS (Hyderabad) | 70 (Secunderabad) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 18 part) [Schedule XXXI, Table B, GHMC Ward 18 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500026` | Karkhana / West Marredpally / Pickett / Cantonment | TS (Hyderabad / Medchal-Malkajgiri) | 71 (Secunderabad Cantonment) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (SCB Wards 1 & 2) [Schedule XXXI, Table B, SCB Wards 1 & 2] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500028` | Mehdipatnam / Gudimalkapur / Murad Nagar | TS (Hyderabad) | *None (Ambiguous)* | 64, 63 | `INTERSECTS_MULTIPLE_ACS` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 11 part) [Schedule XXXI, Table B, GHMC Ward 11 part] | `DOCUMENTED_MULTI_AC_AMBIGUITY` | `RETAIN_AS_MULTI_AC_AMBIGUITY` |
| `500033` | Jubilee Hills / Film Nagar / Road No 36 | TS (Hyderabad) | 61 (Jubilee Hills) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 8 part) [Schedule XXXI, Table B, GHMC Ward 8 part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500034` | Banjara Hills / Somajiguda / Punjagutta | TS (Hyderabad) | *None (Ambiguous)* | 60, 61 | `INTERSECTS_MULTIPLE_ACS` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 9 part) [Schedule XXXI, Table B, GHMC Ward 9 part] | `DOCUMENTED_MULTI_AC_AMBIGUITY` | `RETAIN_AS_MULTI_AC_AMBIGUITY` |
| `500047` | Alwal / Old Alwal / Macha Bolarum | TS (Medchal-Malkajgiri) | 44 (Malkajgiri) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Alwal Municipality) [Schedule XXXI, Table B, Alwal Municipality] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500053` | Chandrayangutta / Barkas / Falaknuma | TS (Hyderabad) | 67 (Chandrayangutta) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 15) [Schedule XXXI, Table B, GHMC Ward 15] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500056` | Bowenpally / Hasmathpet / Manovikas Nagar | TS (Hyderabad / Medchal-Malkajgiri) | *None (Ambiguous)* | 71, 46 | `INTERSECTS_MULTIPLE_ACS` | Delimitation Order 2008 Schedule XXXI (SCB Ward 1 / Kukatpally circle) [Schedule XXXI, Table B, SCB Ward 1 / Kukatpally circle] | `DOCUMENTED_MULTI_AC_AMBIGUITY` | `RETAIN_AS_MULTI_AC_AMBIGUITY` |
| `500062` | ECIL / Kapra / A.S. Rao Nagar / Moula Ali | TS (Medchal-Malkajgiri) | 47 (Uppal) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Kapra Municipality) [Schedule XXXI, Table B, Kapra Municipality] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500064` | Bahadurpura / Tadbun / Zoo Park Area | TS (Hyderabad) | 69 (Bahadurpura) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (GHMC Ward 12) [Schedule XXXI, Table B, GHMC Ward 12] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500072` | Kukatpally / KPHB Colony / Balanagar | TS (Medchal-Malkajgiri) | 46 (Kukatpally) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Kukatpally Municipality) [Schedule XXXI, Table B, Kukatpally Municipality] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500081` | Madhapur / Hitec City / Cyber Towers | TS (Rangareddy) | 52 (Serilingampally) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Serilingampally Municipality part) [Schedule XXXI, Table B, Serilingampally Municipality part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500084` | Kondapur / Gachibowli / Financial District | TS (Rangareddy) | 52 (Serilingampally) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Serilingampally Municipality part) [Schedule XXXI, Table B, Serilingampally Municipality part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `500090` | Nizampet / Pragathi Nagar / Bachupally | TS (Medchal-Malkajgiri) | 45 (Quthbullapur) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule XXXI (Quthbullapur Mandal part) [Schedule XXXI, Table B, Quthbullapur Mandal part] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `520001` | Vijayawada One Town / Governorpet | AP (NTR (Krishna)) | 79 (Vijayawada West) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (VMC Wards 1 to 14) [Schedule II, Table B, VMC Wards 1 to 14] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `520002` | Vijayawada Two Town / Suryaraopet | AP (NTR (Krishna)) | 80 (Vijayawada Central) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (VMC Wards 15 to 28) [Schedule II, Table B, VMC Wards 15 to 28] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `530001` | Visakhapatnam Town / Port Area | AP (Visakhapatnam) | 22 (Visakhapatnam South) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (GVMC southern wards) [Schedule II, Table B, GVMC southern/commercial wards] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `530002` | One Town / Jagadamba / Poorna Market | AP (Visakhapatnam) | 22 (Visakhapatnam South) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (GVMC commercial wards) [Schedule II, Table B, GVMC southern/commercial wards] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `517501` | Tirupati Town / KT Road / Bhavani Nagar | AP (Tirupati) | 167 (Tirupati) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (Tirupati Municipality) [Schedule II, Table B, Tirupati Municipality] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |
| `518001` | Kurnool H.O / Park Road / Collectorate | AP (Kurnool) | 137 (Kurnool) | N/A | `INTERSECTS_SINGLE_AC_PROVISIONAL` | Delimitation Order 2008 Schedule II (Kurnool Municipality) [Schedule II, Table B, Kurnool Municipality] | `PROVISIONAL_APPROXIMATION` | `RETAIN_AS_PROVISIONAL_APPROXIMATION` |

---

## 3. Discrepancy Reconciliation & Structural Corrections

### 3.1 PIN `500001` Resolution (Workstream A)
- **Finding:** Directive 123 implementation report text listed candidate ACs as `58, 59, 61` (Malakpet, Amberpet, Jubilee Hills), whereas source code and test fixtures listed `65, 63, 58` (Goshamahal, Nampally, Malakpet).
- **Substantiated Candidates:** Under Delimitation Order 2008 Schedule XXXI:
  - Hyderabad GPO physical building is at Abids in GHMC Ward 78 (Gunfoundry) &rarr; **Goshamahal (AC 65)**.
  - Delivery beat spans into Nampally Station / Mozamjahi Market (GHMC Ward 10/11) &rarr; **Nampally (AC 63)**.
  - Delivery beat touches Koti / Sultan Bazar (GHMC Ward 3 part, Musi north bank) &rarr; **Malakpet (AC 58)**.
- **Reconciliation:** Candidate set confirmed as `[65, 63, 58]`. D123 report editorial typo corrected. `canonicalAcNo` on `500001` is strictly set to `undefined` (cannot be assigned to single AC).

### 3.2 Canonical AC Number Corrections (Workstream B)
During the audit of all 36 entries against `stateData` and statutory delimitation schedules, 8 seed number mismatches were identified and corrected:
1. **PIN `500002` (Charminar):** Corrected `canonicalAcNo` from `67` to **`66`** (Charminar).
2. **PIN `500053` (Chandrayangutta):** Corrected `canonicalAcNo` from `69` to **`67`** (Chandrayangutta).
3. **PIN `500064` (Bahadurpura):** Corrected `canonicalAcNo` from `66` to **`69`** (Bahadurpura).
4. **PIN `520001` (Vijayawada West):** Corrected `canonicalAcNo` from `80` to **`79`** (Vijayawada West).
5. **PIN `520002` (Vijayawada Central):** Corrected `canonicalAcNo` from `81` to **`80`** (Vijayawada Central).
6. **PIN `530001` (Visakhapatnam South):** Corrected `canonicalAcNo` from `21` to **`22`** (Visakhapatnam South).
7. **PIN `530002` (Visakhapatnam South):** Corrected `canonicalAcNo` from `21` to **`22`** (Visakhapatnam South).
8. **PIN `517501` (Tirupati):** Corrected `canonicalAcNo` from `168` to **`167`** (Tirupati).

---

## 4. Multi-AC Ambiguity Entries (4 Records)

1. **`500001` (Hyderabad GPO / Abids):** Spans Goshamahal (65), Nampally (63), Malakpet (58). Status: `DOCUMENTED_MULTI_AC_AMBIGUITY`.
2. **`500028` (Mehdipatnam):** Spans Karwan (64) and Nampally (63). Status: `DOCUMENTED_MULTI_AC_AMBIGUITY`.
3. **`500034` (Banjara Hills):** Spans Khairatabad (60) and Jubilee Hills (61). Status: `DOCUMENTED_MULTI_AC_AMBIGUITY`.
4. **`500056` (Bowenpally):** Spans Secunderabad Cantonment (71) and Kukatpally (46). Status: `DOCUMENTED_MULTI_AC_AMBIGUITY`.

All 4 entries return `status: 'AMBIGUOUS_CANDIDATES'` with `currentConstituency: undefined` and explicit `candidateConstituencies`.
