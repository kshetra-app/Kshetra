# W010 BATCH L1 REMEDIATION REPORT — DEF-001 & DEF-007

```
BATCH:              L1 — Route & Identifier Hygiene
DEFECTS:            DEF-001 (Duplicate Routes) & DEF-007 (Shorts Identifier Semantics)
STATUS:             IMPLEMENTED, TESTED, AND VERIFIED (SUBMITTED FOR CTO ACCEPTANCE)
DATE:               2026-09-21
TARGET REPOSITORY:  kshetra-app/Kshetra
BRANCH:             master
```

---

## 1. Executive Summary

Batch L1 resolves two longstanding hygiene and integrity defects authorized in the W010 legacy remediation program:
1. **DEF-001 (Mobile Route De-duplication)**: Completely eliminated all 3 duplicate route file pairs, consolidated onto canonical routes, registered missing routes in `_layout.tsx`, and updated all navigation callsites.
2. **DEF-007 (Shorts Identifier Semantics)**: Removed deceptive synthetic local identifier generation (`local-short-...`, `local-cmt-...`) and fake `return true` success flags across all shorts persistence and mutation operations in `supabaseDataService.ts`. Enforced strict UUID validation and fail-closed error propagation.

---

## 2. Changed File Inventory

| File Path | Action | Description |
| :--- | :--- | :--- |
| `apps/mobile/app/user/[id].tsx` | **DELETED** | Removed duplicate profile route in favor of canonical `user/[userId].tsx` |
| `apps/mobile/app/auth/edit-profile.tsx` | **DELETED** | Removed incomplete duplicate route in favor of canonical `edit-profile.tsx` |
| `apps/mobile/app/auth/onboarding.tsx` | **DELETED** | Removed unlocalized duplicate in favor of fully-i18n canonical `onboarding.tsx` |
| `apps/mobile/app/(tabs)/profile.tsx` | **MODIFIED** | Updated profile edit button navigation from `/auth/edit-profile` to `/edit-profile` |
| `apps/mobile/app/_layout.tsx` | **MODIFIED** | Added canonical `onboarding` Stack.Screen registration; verified 0 route collisions |
| `apps/mobile/lib/supabaseDataService.ts` | **MODIFIED** | Added `isValidUuid` helper; hardened `uploadShort`, `approveShort`, `flagShort`, `incrementShortView`, and `addShortComment` |
| `apps/mobile/components/UploadShortModal.tsx` | **MODIFIED** | Enforced check for `res.success && res.id`; propagates genuine DB UUID to cache |
| `apps/mobile/stores/politicalShorts.ts` | **MODIFIED** | Updated `addShort` signature and logic to accept and retain authoritative DB UUIDs |
| `apps/mobile/__tests__/w010-batch-l1.test.ts` | **CREATED** | 10 unit tests verifying route de-duplication, canonical preservation, and UUID enforcement |

---

## 3. Before & After Defect State

### DEF-001: Mobile Route De-duplication
- **Before**: 3 duplicate pairs resided on disk (`user/[id].tsx` vs `user/[userId].tsx`, `edit-profile.tsx` vs `auth/edit-profile.tsx`, `onboarding.tsx` vs `auth/onboarding.tsx`). Expo Router issued collision warnings; profile screen routed to `/auth/edit-profile` while layout registered `edit-profile`.
- **After**: All 3 duplicates permanently deleted (`git rm`). Zero filesystem collisions remain. Canonical screens (`user/[userId].tsx`, `edit-profile.tsx`, `onboarding.tsx`) are registered and cleanly mapped.

### DEF-007: Shorts Identifier Semantics
- **Before**: When offline or unconfigured, `uploadShort` returned `{ id: local-short-..., success: true }`, and `addShortComment` returned `{ id: local-cmt-..., success: true }`. Invalid non-UUID IDs silently passed with `if (!isUuid) return true;`.
- **After**: `isValidUuid` strictly enforces canonical RFC-4122 UUID format. Non-UUID IDs and offline states fail closed immediately with `{ id: null, success: false }` or `false`. No synthetic persistence ID is generated.

---

## 4. Verification Evidence

### Automated Unit Tests
- **Command**: `node ../../node_modules/jest/bin/jest.js __tests__/w010-batch-l1.test.ts --forceExit`
- **Result**: `10 passed, 10 total` (Time: 5.208 s)
  - `DEF-001`: Duplicate routes confirmed absent from disk.
  - `DEF-001`: Canonical routes confirmed present on disk.
  - `DEF-001`: `profile.tsx` confirmed routing to `/edit-profile`.
  - `DEF-001`: `_layout.tsx` confirmed registering canonical routes without duplicates.
  - `DEF-007`: `isValidUuid` confirmed rejecting synthetic/malformed IDs.
  - `DEF-007`: `uploadShort` confirmed failing closed on invalid `uploadedBy`.
  - `DEF-007`: `approveShort` confirmed rejecting non-UUID shortId/userId.
  - `DEF-007`: `flagShort` confirmed rejecting non-UUID shortId/userId.
  - `DEF-007`: `incrementShortView` confirmed rejecting non-UUID shortId.
  - `DEF-007`: `addShortComment` confirmed failing closed on non-UUID shortId/userId.

### Typecheck Verification
- **Command**: `npm run typecheck` (`tsc --noEmit`)
- **Result**: `Exit code 0` (0 errors across mobile project).
