# W010: HISTORICAL DEFECT & CARRY-FORWARD RECONCILIATION REPORT (W000–W009)

**Status:** `RECONCILED / SUBMITTED FOR CTO REVIEW`  
**Authority:** CTO DIRECTIVE — W010-P0 LEGACY DEFECT CARRY-FORWARD RECONCILIATION  
**Standard:** AI Agent Master Execution Job Book & Amendment v1.5-A / Rule IV-001  
**Repository:** `https://github.com/kshetra-app/Kshetra.git`  
**Branch:** `master`  
**Audited Commit:** `385e5f8a5ad0402d668e2e5cf3614e7a2aaf45c3` (`385e5f8`)  
**Timestamp:** 2026-09-21  

---

## 1. Authoritative Defect Reconciliation Matrix (DEF-001 through DEF-013)

| Defect ID | Historical Title | Severity | Domain | Current Source & Runtime Evidence | Reconciled Status | Destination Job |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| **DEF-001** | Duplicate route files in `apps/mobile/app/` | P1 | Mobile | 3 pairs of duplicate files exist: `user/[id].tsx` vs `user/[userId].tsx`, `edit-profile.tsx` vs `auth/edit-profile.tsx`, `onboarding.tsx` vs `auth/onboarding.tsx`. Router collision warning active. | **OPEN — VALID** | Bounded Remediation (Batch 1) |
| **DEF-002** | Deceptive local success / offline fallbacks | P1 | Mobile | 42 operations in `supabaseDataService.ts` execute `if (!guard()) return true;` or return synthetic IDs (`local-...`). | **OPEN — VALID** | Master Job W011 (Deceptive Fallbacks) |
| **DEF-003** | WebRTC bundled in consumer mobile app | P1 | Mobile | `react-native-webrtc` in `package.json:61`; required in `LiveBroadcaster.tsx`. Adds ~15-25MB to native binary. | **OPEN — VALID** | Master Job W052 / Bounded Decoupling |
| **DEF-004** | Silent moderation check bypass on network failure | P1 | Backend | Backend fail-closed enforced (`apps/api/src/services/contentModeration.ts`); 20/20 unit tests pass. | **RESOLVED — VERIFIED** | CLOSED (W009-B3, `2ff4f40`) |
| **DEF-005** | Ambiguous dual-backend calling convention | P2 | Architecture | W006 classified 85 methods; W007 built canonical client; W008-E & W009-B4 strangler-migrated priority mutations. | **SUPERSEDED — VERIFIED** | SUPERSEDED (W006/W007/W009-B4) |
| **DEF-006** | Missing versioned geography tables | P2 | Database | Phase 1 flat geography (`002_core_geography.sql`) active; versioned graph modeling is explicitly scheduled for W013–W017. | **DEFERRED — EXPLICIT FUTURE JOB / ACCEPTED DEPENDENCY** | Master Jobs W013–W017 |
| **DEF-007** | Synthetic UUID check causing diverging identifier semantics | P2 | Mobile | `supabaseDataService.ts:1503` and `:1533` check `!isUuid` and return silent success for non-UUIDs. | **OPEN — VALID** | Bounded Remediation (Batch 1) |
| **DEF-008** | Residual hardcoded strings across screens | P2 | Mobile | Static scan identified 236 hardcoded user-facing strings in raw JSX `<Text>` elements without `t(...)` calls. | **OPEN — VALID** | Bounded Remediation (Batch 2) |
| **DEF-009** | Rejection of modern `sb_secret_...` Supabase service-role format | P1 | Security | `isValidSupabaseKey` in `apps/api/src/lib/supabase.ts:10-17` handles `sb_secret_` and JWTs; 7/7 unit tests pass. | **RESOLVED — VERIFIED** | CLOSED (W001-R1, `77fb553`) |
| **DEF-010** | Missing `CORS_ORIGINS` on Railway production deployment | P2 | DevOps | Production Railway container (`https://kshetra-api-production-9f06.up.railway.app`) verified returning CORS allowlist. | **RESOLVED — VERIFIED** | CLOSED (W001-R3, `77fb553`) |
| **DEF-011** | Missing `public.issue_categories` table | P2 | Database | Schema intentionally models categories via inline CHECK constraint in `004_civic_dashboard.sql:15`. | **INVALID — VERIFIED** | CLOSED (INVALID) |
| **DEF-012** | 13-language translation key parity gap | P2 | Mobile | Canonical validator `node scripts/verify-13-locales.mjs --strict` fails with exit code 1; ~904 missing keys across 8 languages. | **OPEN — VALID** | Bounded Remediation (Batch 2) |
| **DEF-013** | Invalid UNION ORDER BY in `global_search` RPC (0A000) | P2 | Database | Wrapped in migration 036; live staging RPC probe returns HTTP 200 with error: null on 2026-09-21. | **RESOLVED — VERIFIED** | CLOSED (Migration 036 / W009-B1) |

---

## 2. Technical Findings per Defect Area

### DEF-001: Mobile Route Duplication
- **Authoritative Files:**
  - `user`: Canonical is `apps/mobile/app/user/[userId].tsx` (declared in `_layout.tsx:343`). Duplicate `apps/mobile/app/user/[id].tsx` contains redundant profile logic and triggers Expo Router ambiguous route warnings.
  - `edit-profile`: `apps/mobile/app/edit-profile.tsx` is declared in `_layout.tsx:228`. Duplicate `apps/mobile/app/auth/edit-profile.tsx` was created during auth separation.
  - `onboarding`: `apps/mobile/app/onboarding.tsx` has comprehensive 13-language i18n support. Duplicate `apps/mobile/app/auth/onboarding.tsx` has hardcoded English strings.
- **Remediation Plan:** Delete duplicate files `app/user/[id].tsx`, `app/auth/edit-profile.tsx`, and `app/auth/onboarding.tsx`. Update `app/(tabs)/profile.tsx:194` to point to `/edit-profile`.

### DEF-002: Deceptive Success Fallbacks
- **Authoritative Inventory:** 42 occurrences documented in `reports/w010_legacy_defect_inventory.json`.
- **Finding:** Priority civic mutations were migrated to Fastify in W008-E and W009-B4. The remaining 42 operations cover comments, posts, challenges, shorts, KYC, and settings.
- **Remediation Plan:** Bound to Master Job **W011 (Deceptive Fallback Remediation)**, where explicit offline queueing (`offline_queued`) and honest error propagation will be implemented monorepo-wide.

### DEF-003: WebRTC in Consumer Bundle
- **Authoritative Finding:** `react-native-webrtc` is in `apps/mobile/package.json:61`, but is omitted from `app.json` plugins. It is only dynamically required in `components/LiveBroadcaster.tsx` for creator live streams.
- **Remediation Plan:** Scheduled for Master Job **W052 (Professional Broadcast Architecture)**. For immediate consumer optimization, decouple `LiveBroadcaster` into a standalone studio package or WHIP web module, removing native WebRTC binaries from consumer builds.

### DEF-007: Shorts Synthetic Identifier Semantics
- **Authoritative Finding:** Lines 1503 and 1533 in `apps/mobile/lib/supabaseDataService.ts` explicitly test `if (!isUuid) return true;` and `if (!isUuid) return { id: ... }`. When combined with line 594 returning `local-short-${Date.now()}`, this creates a closed loop of synthetic operations that never hit persistent storage.
- **Remediation Plan:** Enforce standard UUID generation (`crypto.randomUUID()`) at short creation time and fail closed with a descriptive validation error if an invalid identifier is passed to view/comment handlers.

### DEF-008 & DEF-012: i18n Hardcoded Strings & Key Parity
- **DEF-012 Empirical State:** Canonical English keys = 2,041. Parity: `en` 100%, `te` 90%, `hi` 86%, `kn`/`mr` 82%, `ta`/`ml`/`bn`/`gu`/`or`/`pa`/`as`/`ne` 56% (904 missing keys each).
- **DEF-008 Empirical State:** 236 hardcoded user-facing strings identified across `<Text>` elements in `app/` and `components/`.
- **Remediation Plan:** 
  1. Wrap all 236 UI strings in `t(...)` calls and add keys to `en.ts`.
  2. Backfill all missing keys across the 12 Indic locale dictionaries to achieve 100% key parity (2,041/2,041 keys).

---

## 3. Proposed Remediation Batches (Pending CTO Authorization)

If approved by the CTO, historical defect remediation should proceed in bounded, testable batches:

### Proposed Batch 1: Route & Identifier Hygiene (DEF-001, DEF-007)
- **Scope:** 
  - Delete 3 duplicate route files (`app/user/[id].tsx`, `app/auth/edit-profile.tsx`, `app/auth/onboarding.tsx`).
  - Align all route references in `profile.tsx` and `pages/index.tsx`.
  - Remove `!isUuid` bypass in `supabaseDataService.ts:1503, 1533` and enforce canonical UUID generation.
- **Estimated Risk:** LOW (Non-breaking, eliminates router warnings).

### Proposed Batch 2: i18n Localization & 100% Key Parity (DEF-008, DEF-012)
- **Scope:**
  - Wrap 236 hardcoded UI strings in `apps/mobile`.
  - Backfill ~904 missing keys across all 12 Indic dictionaries in `apps/mobile/i18n/locales/*.ts`.
  - Verify `node scripts/verify-13-locales.mjs --strict` exits with code 0 (100% PASS).
- **Estimated Risk:** LOW (Pure localization; zero backend/database schema impact).

### Deferred Architecture Jobs:
- **W011:** DEF-002 (Deceptive Fallback Remediation).
- **W013–W017:** DEF-006 (Geographic Foundation & Delimitation Graph).
- **W052:** DEF-003 (WebRTC / Professional Broadcast Architecture).

---

## 4. Statutory Governance Summary

- **Production Touched:** STRICTLY ZERO.
- **Staging Touched:** STRICTLY ZERO (No mutations executed during reconciliation).
- **Real Financial Transactions:** ₹0 real money.
- **Real Telecom Calls:** 0 calls.
- **Working Tree State:** Clean, fully synchronized with GitHub `master`.

**STOPPED: Awaiting CTO Review of Legacy Defect Reconciliation and Authorization of Remediation Batches.**
