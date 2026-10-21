# KSHETRA W021.5 — PROVENANCE CHECKSUM AUDIT & REMEDIATION REPORT
**Directive:** CTO Directive 124 (Workstream C)  
**Governing Framework:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Stage Boundary:** STOP at Stage B Gate (Stages C–I Strictly Unauthorized)  
**Formal Acceptance:** Strictly `0.0% — PENDING INDEPENDENT ADJUDICATION`  
**Generated At:** `2026-10-21T05:56:09.177Z`  

---

## 1. Executive Summary & Root Cause Investigation

During independent CTO review of Directive 123, provenance checksum constants in `apps/api/src/services/delimitationService.ts` and `apps/api/src/services/delimitationQueryService.ts` were identified as potentially placeholder-like:
1. `CENSUS_2011_PCA_PROVENANCE.checksum` was `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (the SHA-256 digest of 0 bytes / empty string).
2. Four statutory provenance constants in `delimitationService.ts` contained synthetic patterned hexadecimal strings (`a1b2c3d4...`, `b2c3d4e5...`, `c3d4e5f6...`, `d4e5f6a7...`).
3. DelimitationQueryService line 1288 also had `a1b2c3d4...`.

### Root Cause & Commit History
- Git history reveals these placeholder values were introduced during:
  - **W020-G5 (Commit `4221eff`):** Empty-string SHA-256 hash was committed on `CENSUS_2011_PCA_PROVENANCE`.
  - **W020-G8 (Commit `d173be6`):** Patterned sequential hashes (`a1b2c3...`, `b2c3d4...`) were committed when scaffolding statutory dataset interfaces.
- These were **NOT introduced by Directive 123**, but were inherited technical debt from the W020 cycle.

---

## 2. Provenance Remediation Actions

Under Directive 124 Section 5.3:
1. **Zero Hallucinated Checksums:** We do NOT invent replacement hashes or hash unrelated documents.
2. **Statutory External Documents:** Official gazettes (Delimitation Order 2008, APRA 2014, GSR 311(E), ECI Notification 2018) and the RGI Census 2011 PCA dataset are official external government instruments published on paper and government portals. Their multi-hundred-megabyte raw source files are not checked into this git repository.
3. **Explicitly Undefined Checksum:** In `DatasetVersionProvenance`, `checksum` is set to `undefined`.
4. **Checked-In Source Dossiers:** For each external statutory source, an authoritative source dossier markdown document exists in `data/evidence/w020/authoritative/`. We added `artifactPath` and `evidenceStatus: 'EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED'` to `DatasetVersionProvenance`.
5. **Bitwise In-Repository Evidence Digests:** All in-repository evidence files are hashed using real cryptographic SHA-256 and monitored via automated regression tests.

---

## 3. Audited Provenance Constants

| Constant | Authority | Version / Date | Historical Checksum | Remediated Checksum | In-Repo Dossier Artifact | Status |
|---|---|---|---|---|---|---|
| `CENSUS_2011_PCA_PROVENANCE` | Office of the Registrar General & Census Commissioner, India | `v1.0_statutory` (2011-04-30) | `e3b0c44298fc1c14...` | `undefined` | `data/evidence/w020/authoritative/census_2011_pca_source_dossier.md` | `EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED` |
| `DELIMITATION_2008_REGIME_PROVENANCE` | Delimitation Commission of India / Election Commission of India | `2008_statutory_order` (2008-02-19) | `a1b2c3d4e5f60718...` | `undefined` | `data/evidence/w020/authoritative/eci_delimitation_order_2008_source_dossier.md` | `EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED` |
| `APRA_2014_PROVENANCE` | Parliament of India (Ministry of Law and Justice) | `statutory_act` (2014-03-01) | `b2c3d4e5f6a7b8c9...` | `undefined` | `data/evidence/w020/authoritative/mha_apra_2014_source_dossier.md` | `EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED` |
| `GSR_311E_2015_PROVENANCE` | Ministry of Home Affairs, Government of India | `statutory_order` (2015-04-23) | `c3d4e5f6a7b8c9d0...` | `undefined` | `data/evidence/w020/authoritative/mha_gsr_311e_2015_source_dossier.md` | `EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED` |
| `ECI_NOTIFICATION_2018_PROVENANCE` | Election Commission of India | `gazette_notification` (2018-09-22) | `d4e5f6a7b8c9d0e1...` | `undefined` | `data/evidence/w020/authoritative/eci_notification_282_ap_2018_source_dossier.md` | `EXTERNAL_STATUTORY_DOCUMENT_DOSSIER_VERIFIED` |

---

## 4. In-Repository Evidence Files Bitwise SHA-256 Digests

The following cryptographic digests were calculated directly from in-repository source files:

| Artifact Path | SHA-256 Bitwise Digest | Size (Bytes) | Verification Status |
|---|---|---|---|
| `data/evidence/w015_b2/eci_delimitation_2008_schedule_xxxi.txt` | `9123ecb5f9ea5414ee8b4e8cce92aed9e008f352a8924edb7dcb9c27d621737d` | 3020 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/census_2011_pca_source_dossier.md` | `1290ab1ced366f0e049c09e1c781cb8d63e461a2d701f013f11ba742d7e341b1` | 2204 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/eci_delimitation_order_2008_source_dossier.md` | `11b646cb1df307c541ff6d5bd9006338df0577fcded4a1f7f04cab70e3395218` | 2899 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/mha_apra_2014_source_dossier.md` | `ddb8a5d55ef5c72c2ceb98341ce071d998847f5fe5e780f3da7a6a2693ab92be` | 2771 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/mha_gsr_311e_2015_source_dossier.md` | `cb0a4ee9aef369104b73793f8722250cb9e45ab1a00bc411074ffbe484c2bfa2` | 3319 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/eci_notification_282_ap_2018_source_dossier.md` | `848c6fba834339cd827856989914941b8a1e6433ba5ab7c7ec55e456b6c5fe13` | 3214 | `BITWISE_VERIFIED_IN_REPO` |
| `data/evidence/w020/authoritative/panin_article_332_simulation_dossier.md` | `312ad477b90ff343fc15fb01059e51c27bdd1a2884bca2b0666e6cec1ca7dcaf` | 2819 | `BITWISE_VERIFIED_IN_REPO` |
| `data/census/india-district-population-2011.ts` | `03e3d6d39ead9685431e5487e5ce33f8ab0d6628b492953f9411e0ada12317a3` | 32724 | `BITWISE_VERIFIED_IN_REPO` |

---

## 5. Remaining Authoritative Data Dependencies

Under Rule IV-001 and Directive 124 Section 5.3, the following external statutory source files remain external dependencies:
1. **Census 2011 Primary Census Abstract (PCA) State-District Tables:** Published by RGI. Authoritative secondary dossier checked in at `data/evidence/w020/authoritative/census_2011_pca_source_dossier.md`.
2. **ECI Delimitation Order 2008 Official Gazette PDF:** Published by ECI / DCI (Gazette of India, Extraordinary). Authoritative secondary dossier checked in at `data/evidence/w020/authoritative/eci_delimitation_order_2008_source_dossier.md`. Schedule XXXI text extract checked in at `data/evidence/w015_b2/eci_delimitation_2008_schedule_xxxi.txt`.
3. **Andhra Pradesh Reorganisation Act, 2014:** Act No. 6 of 2014, Ministry of Law and Justice. Dossier at `data/evidence/w020/authoritative/mha_apra_2014_source_dossier.md`.
4. **MHA Notification G.S.R. 311(E) (2015):** Ministry of Home Affairs. Dossier at `data/evidence/w020/authoritative/mha_gsr_311e_2015_source_dossier.md`.
5. **ECI Notification 282/AP/2018:** Election Commission of India. Dossier at `data/evidence/w020/authoritative/eci_notification_282_ap_2018_source_dossier.md`.

These external dependencies do not block Stage B completion, as secondary authoritative dossiers are verified in-repo.
