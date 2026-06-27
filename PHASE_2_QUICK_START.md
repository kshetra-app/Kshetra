# Phase 2: Quick Start Guide

## What's Being Done
Converting 7.45 MB of bundled seed data (.ts files) into a prebuilt SQLite database with lazy per-state loading.

## Files to Review
1. `PHASE_2_SCHEMA.md` — SQLite schema design
2. `PHASE_2_IMPLEMENTATION.md` — Full implementation guide
3. `scripts/build-seed-db.mjs` — Build script (converts seed .ts → SQLite)
4. `apps/mobile/lib/seedDataLoader.ts` — Lazy loader + in-memory cache
5. `apps/mobile/lib/stateDataDispatcher.refactored.ts` — Refactored dispatcher (queries SQLite)

## Key Points

### No UI Changes Required
All existing APIs remain synchronous:
```typescript
// Still works exactly the same
const profile = getMLAProfileForState('TS', 1);
const demo = getDemographicsForState('TS', 1);
```

### Lazy Loading (Transparent)
```typescript
// Add to components that use seed data
import { useSeedDataLoader } from '@/lib/seedDataLoader';

export default function MyComponent() {
  useSeedDataLoader('TS'); // Auto-loads on mount
  // ... rest of component
}
```

### Build Process
```bash
# 1. Build SQLite database
node scripts/build-seed-db.mjs
# Output: apps/mobile/data/seed-data.db (5.8 MB)

# 2. Replace dispatcher
mv apps/mobile/lib/stateDataDispatcher.ts apps/mobile/lib/stateDataDispatcher.old.ts
mv apps/mobile/lib/stateDataDispatcher.refactored.ts apps/mobile/lib/stateDataDispatcher.ts

# 3. Verify
npm --prefix apps/mobile run typecheck
```

## Expected Results
- Bundle size reduction: **~7.5 MB**
- Total Phase 1+3 reduction: **~69.5 MB** (51% of original)
- All APIs remain synchronous
- No UI code changes

## Next: Phase 2e
Run build script and verify bundle size reduction.
