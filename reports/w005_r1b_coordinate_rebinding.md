# W005-R1B — Dynamic Evidence Coordinate Binding & Lineage Report

**Job ID:** W005-R1B  
**Title:** Dynamic Evidence Coordinate Binding & Lineage Report  
**Authority:** AI Agent Master Execution Job Book, Amendment v1.4, Rule IV-001  
**Timestamp:** 2026-09-11T07:58:00.000Z  
**Repository:** `https://github.com/kshetra-app/Kshetra.git`  
**Branch:** `master`  

---

## 1. Executive Summary

During previous W005-R1A execution, the executable recovery drill runner (`scripts/run-w005-r1a-drills.mjs`) had hard-coded commit coordinates (`verifiedRemoteHead = '943a803'`), which became stale upon subsequent verification and documentation commits.

Under **Job W005-R1B**, all hardcoded coordinates were eradicated from the drill generator and replaced by runtime Git introspection via `git rev-parse HEAD` and `git rev-parse origin/master`. In addition, a dedicated regression validator (`tests/drill-coordinate-dynamism.test.mjs`) was established to permanently guard against hardcoded SHA coordinates in executable evidence scripts.

All 9 disaster recovery evidence artifacts were regenerated and stamped with the live remote HEAD (`aed3d99`).

---

## 2. Four-Coordinate Lineage Model

| Coordinate Field | Value | Semantic Definition |
| :--- | :--- | :--- |
| `VERIFIED_REMOTE_HEAD` | `aed3d99` | Exact remote `origin/master` HEAD against which drills and evidence were executed |
| `AUDITED_CODE_COMMIT` | `943b026` | Exact implementation commit audited for backup and recovery architecture |
| `EVIDENCE_COMMIT` | Pending | Commit containing regenerated evidence artifacts |
| `ACCEPTANCE_COMMIT` | Pending | Commit containing final acceptance governance records |

---

## 3. Dynamism Architecture & Regression Prevention

1. **Runtime Derivation:**
   - Evaluates `git branch --show-current` and asserts canonical `master`.
   - Obtains `localHead` via `git rev-parse HEAD`.
   - Obtains `verifiedRemoteHead` via `git rev-parse origin/master`.
   - Extracts `AUDITED_CODE_COMMIT` from `EXECUTION_STATE.md`.
2. **Automated Regression Test (`tests/drill-coordinate-dynamism.test.mjs`):**
   - Scans `scripts/run-w005-r1a-drills.mjs` for any forbidden stale SHAs (`943a803`, `4bb8631`, `490ceb3`, `1260f98`, `ef4622a`, `19a5932`, `811b5dd`, `da82fbb`, `542013d`).
   - Verifies dynamic Git command resolution at test execution time.
   - Audits all emitted reports in `reports/w005_r1a_*.json` to guarantee coordinate structure and absence of stale SHA constants.

---

## 4. Preservation of Empirical Recovery Findings

The substantive recovery drill architecture and empirical proof from W005-R1A are 100% preserved:
- **DR-001 (Schema Recovery & API Bootstrap):** RECOVERY TESTED (7.29s, target ≤ 900s). Reconstructed 148 tables, 174 catalog definitions, TS state seed verified, DB-backed API retrieval verified.
- **DR-002 (Logical Data Recovery & Backup Restore):** RECOVERY PROVEN (5.13s, restore 0.32s). Real disk backup artifact saved, deletion simulated on live Staging Supabase, restored from disk artifact with 100% SHA-256 match.
- **DR-003 (Process Standby Recovery):** RECOVERY TESTED (4.57s). Multi-cloud standby honestly reported as `NOT IMPLEMENTED / HUMAN INFRASTRUCTURE REQUIRED`.
- **DR-004 (Supabase Storage Object Recovery):** RECOVERY PROVEN (7.79s, restore 0.39s). Uploaded to Staging Supabase Storage bucket (`staging-dr-test`), backed up to disk artifact, deleted, restored from disk artifact with 100% SHA-256 match.
- **DR-005 (Client Offline Resilience):** 0s synchronous MMKV adapter execution, 0 duplicate writes, idempotent reconnect sync.
- **RPO:** Honestly classified as `NOT EMPIRICALLY VERIFIED (Target ≤ 5 min)` to avoid destructive point-in-time database rewinds.
