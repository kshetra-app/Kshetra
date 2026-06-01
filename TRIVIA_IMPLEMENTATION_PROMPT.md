# TASK: "Did You Know?" Trivia Engine — Full 31-State Implementation + Fresh Content on Revisit

## OBJECTIVE

Two deliverables:
1. **Populate trivia data** for all 27 stub states (the 4 gold-standard states — TS, AP, KA, MH — already have real data; DO NOT modify them)
2. **Implement a "seen trivia" tracking system** so that users always see fresh, unseen content when they revisit any screen that shows trivia

---

## PART 1: UNDERSTAND THE EXISTING SETUP (READ THESE FILES FIRST)

Before writing a single line of code, read and internalize these files completely:

### Gold-Standard Reference Files (DO NOT MODIFY)
| File | Purpose | Key Details |
|------|---------|-------------|
| `data/seed/telangana-trivia.ts` | **THE gold standard** — 22 curated + 4 derived items | Uses `TriviaItem` interface, `TriviaCategory`, `TriviaContext` types. Has `deriveTriviaFromLedger()`. Exports: `getAllTrivia`, `getTriviaForConstituency`, `getTriviaForParty`, `getTriviaForMLA`, `getTriviaForElection`, `getRandomTrivia`, `getRandomTriviaSet`, `getTriviaByCategory` |
| `data/seed/andhra-pradesh-trivia.ts` | AP — 15 curated + 1 derived | Imports `TriviaItem`, `TriviaCategory`, `TriviaContext` FROM `./telangana-trivia`. Exports: `getAPAllTrivia`, `getAPTriviaForConstituency`, `getAPTriviaForParty`, `getAPTriviaForMLA`, `getAPTriviaForElection`, `getAPRandomTrivia`, `getAPRandomTriviaSet`, `getAPTriviaByCategory` |
| `data/seed/karnataka-trivia.ts` | KA — 12 curated + 1 derived | Same pattern as AP |
| `data/seed/maharashtra-trivia.ts` | MH — 12 curated + 1 derived | Same pattern as AP |

### Routing/Adapter Layer
| File | Purpose |
|------|---------|
| `apps/mobile/lib/stateTriviaAdapter.ts` | Routes trivia calls by state code. Currently handles TS/AP/KA/MH; others return `[]` or fallback to TS |
| `apps/mobile/lib/data.ts` | Re-exports all trivia functions from seed files. Already has exports for all 31 states (but 27 are empty stubs) |

### UI Components
| File | Purpose |
|------|---------|
| `apps/mobile/components/TriviaCard.tsx` | Renders trivia — full mode + compact mode, auto-rotate, shuffle button, i18n support |
| `apps/mobile/app/(tabs)/index.tsx` | Map screen — shows `TriviaCard` in idle state (lines ~877-882) and in constituency bottom sheet (lines ~1017-1023) |
| `apps/mobile/app/constituency/[id].tsx` | Constituency detail — shows "Did You Know?" section (lines ~348-359) |

### Stub Files (27 states — these need to be populated)
| File | Current State |
|------|---------------|
| `data/seed/bihar-trivia.ts` | Empty array, uses WRONG interface (`BRTriviaItem` instead of `TriviaItem`), no derived trivia, 24 lines |
| All other 26 stub files | Same pattern — empty arrays, wrong local interface, no derived trivia |

### Test File
| File | Purpose |
|------|---------|
| `data/seed/__tests__/telangana-trivia.test.ts` | 18 tests covering integrity, context queries, derived trivia, random functions |

---

## PART 2: DATA GENERATION (27 States)

### 2A. Interface Upgrade

Every stub file currently defines its OWN local interface (e.g., `BRTriviaItem`). This is WRONG.

**For every stub file, you MUST:**
1. DELETE the local interface definition (e.g., `export interface BRTriviaItem { ... }`)
2. IMPORT the shared types from telangana-trivia:
   ```typescript
   import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
   ```
3. IMPORT the state's political ledger to enable derived trivia:
   ```typescript
   import { XX_POLITICAL_LEDGER } from './xx-political-timeline';
   ```
4. Change the array type to `TriviaItem[]`:
   ```typescript
   export const XX_CURATED_TRIVIA: TriviaItem[] = [ ... ];
   ```

### 2B. Curated Trivia Content

For each of the 27 states, write **minimum 10 curated trivia items** (more for politically active states). Each item MUST conform to the `TriviaItem` interface:

```typescript
{
  id: string;           // Format: 'XX-TRV-001' (state prefix + sequential)
  emoji: string;        // Single emoji that represents the fact
  headline: string;     // Catchy, short headline (5-10 words)
  body: string;         // 1-3 sentences, factual, engaging
  category: TriviaCategory;  // One of: DEFECTION, RECORD, COINCIDENCE, HISTORICAL, DYNASTY, GEOGRAPHY, LEGAL, ELECTION
  contexts: TriviaContext[]; // At least 1 context. Use CONSTITUENCY (acNo), PARTY, MLA (name), ELECTION (year), or GLOBAL
  source: string;       // Citation — newspaper name, Wikipedia article, ECI
  derived: false;       // All curated items have derived: false
}
```

### Content Guidelines

**Category Mix** — Each state should have at least:
- 2-3 RECORD items (superlatives: youngest MLA, biggest margin, longest serving, etc.)
- 2-3 ELECTION items (election statistics, swing, turnout records)
- 1-2 DEFECTION items (party-switching stories — use data from the political timeline files)
- 1-2 DYNASTY items (political families: Yadavs in UP/Bihar, Badals in Punjab, etc.)
- 1-2 HISTORICAL items (state formation, landmark events)
- 1-2 GEOGRAPHY items (constituency-level interesting facts)

**CRITICAL — DO NOT fabricate facts.** Use real, verifiable information:
- Real MLA names from existing `data/seed/xx-mla-profiles.ts` files where available
- Real constituency numbers from `data/seed/xx-constituencies.ts` files
- Real election results (margins, vote shares) from `data/seed/xx-constituencies.ts`
- Real political events from `data/seed/xx-political-timeline.ts`

**Example landmark trivia per state (DO NOT MISS these):**

| State | Must-Have Trivia |
|-------|-----------------|
| Bihar (BR) | Lalu-Rabri dynasty, Nitish Kumar's alliance flip-flops, Tejashwi Yadav youngest Deputy CM |
| UP (UP) | Yogi Adityanath monk-to-CM, Akhilesh Yadav youngest CM, BSP's Dalit mobilization, Dimple Yadav |
| Tamil Nadu (TN) | DMK-AIADMK alternation streak (no ruling party re-elected since 1984), Jayalalithaa's acquittal, Karunanidhi dynasty |
| Kerala (KL) | CPM-UDF alternation (100% since 1982), Sabarimala political impact, K. Karunakaran dynasty |
| West Bengal (WB) | Mamata defeating 34-year CPM rule, Nandigram seat drama 2021, TMC's rural dominance |
| Delhi (DL) | AAP sweeping 67/70 in 2015, Kejriwal's 49-day first stint, Sheila Dikshit's 15-year rule |
| Punjab (PB) | AAP's 2022 sweep, Bhagwant Mann CM, Badal dynasty, Captain Amarinder's defection |
| Gujarat (GJ) | BJP unbroken since 1995, Modi's 4-term CM stint, Congress's 2017 near-upset |
| Rajasthan (RJ) | Alternation pattern (no govt re-elected since 1993), Sachin Pilot revolt, Raje dynasty |
| Madhya Pradesh (MP) | Scindia defection toppling Kamal Nath, Shivraj's 4 terms, Operation Lotus |
| Jharkhand (JH) | Hemant Soren's arrest as sitting CM, JMM tribal politics, frequent political instability |
| Goa (GA) | Congress MLAs merger into BJP using 2/3 loophole (twice!), Parrikar's legacy |
| Haryana (HR) | Nayab Saini emergency CM swap, Hooda vs Khattar, wrestler protest politics |
| Himachal Pradesh (HP) | Congress MLAs cross-voting in Rajya Sabha, governor vs CM standoff |
| Odisha (OD) | Naveen Patnaik's 24-year rule ending in 2024, BJD's total dominance |
| Manipur (MN) | 10 INC MLAs defecting to BJP in 2017, ethnic conflict politics |
| Meghalaya (ML) | 12 INC MLAs joining TMC in 2021, Conrad Sangma's NPP |
| Arunachal Pradesh (AR) | Pema Khandu's mass defection — 43 of 44 PPA MLAs to BJP |
| Tripura (TR) | CPM's 25-year rule ending in 2018, BJP's first-ever NE state |
| J&K (JK) | First election after Article 370 abrogation, JKNC-INC alliance 2024 |
| Chhattisgarh (CG) | Bhupesh Baghel's populist schemes, BJP's 2023 comeback |
| Uttarakhand (UK) | 10 CMs in 22 years, revolving door politics, Dhami surviving anti-incumbency |
| Sikkim (SK) | SKM's 2019 overthrow of 25-year SDF rule, Prem Singh Tamang (Golay) |
| Mizoram (MZ) | ZPM's 2023 landslide defeating MNF, unique tribal politics |
| Nagaland (NL) | NDPP-BJP alliance, no opposition in assembly, Naga peace talks |
| Puducherry (PY) | Floor test drama, LG vs CM power struggle, Kiran Bedi controversy |
| Assam (AS) | Himanta Biswa Sarma's defection from INC to BJP, NRC politics |

### 2C. Derived Trivia Generator

Each file MUST have a `deriveTriviaFromLedger()` function that auto-generates trivia from the political timeline data. Follow the pattern in `telangana-trivia.ts` (lines 426-508):

```typescript
function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];
  
  // 1. Count defections
  const defections = XX_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'XX-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In [State Name], ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = XX_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'XX-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `[State Name] has seen ${byElections.length} by-elections in recent terms.`,
      category: 'ELECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  return derived;
}
```

**IMPORTANT:** The stub files use a simpler ledger format (`{ event: string, fromParty, toParty, ... }`) — NOT the full `PoliticalLedgerEntry`. The derived function must parse the `.event` string field, NOT `.eventType`.

### 2D. Export Functions

Each file MUST export these functions (following AP/KA/MH pattern):

```typescript
// Combined trivia (curated + derived, cached)
let _cachedTrivia: TriviaItem[] | null = null;
export function getXXAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...XX_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

export function getXXTriviaForConstituency(acNo: number): TriviaItem[] { ... }
export function getXXTriviaForParty(party: string): TriviaItem[] { ... }
export function getXXTriviaForMLA(name: string): TriviaItem[] { ... }
export function getXXTriviaForElection(year: number): TriviaItem[] { ... }
export function getXXRandomTrivia(): TriviaItem { ... }
export function getXXRandomTriviaSet(count: number): TriviaItem[] { ... }
export function getXXTriviaByCategory(category: TriviaCategory): TriviaItem[] { ... }
```

Where `XX` is the state prefix (BR, UP, TN, KL, WB, etc.).

---

## PART 3: WIRE ALL 27 STATES INTO THE ADAPTER

### 3A. Update `apps/mobile/lib/stateTriviaAdapter.ts`

Currently, `stateTriviaAdapter.ts` only handles TS/AP/KA/MH. You MUST add all 27 remaining states to the three switch statements:

1. `getRandomTriviaSetForState(stateCode, count)` — add cases for all 27 states
2. `getTriviaForConstituencyInState(stateCode, acNo)` — add cases for all 27 states
3. `getAllTriviaForState(stateCode)` — add cases for all 27 states

The imports at the top must include all 27 new state trivia modules.

**DO NOT change the fallback behavior** — if a state is not found, return `[]` (not fallback to TS).

### 3B. Verify `apps/mobile/lib/data.ts` Exports

The `data.ts` file already has export lines for all 27 stub states (e.g., `export { getAllBRTrivia, ... } from '...bihar-trivia'`). After you populate the files, verify these exports still compile. If a function name changed (because you're now using the TriviaItem interface pattern), UPDATE the export lines in data.ts to match.

**IMPORTANT:** The current stubs export functions like `getAllBRTrivia()` which returns `BRTriviaItem[]`. After your upgrade, these should return `TriviaItem[]`. The function names in data.ts MUST match exactly what the new files export.

---

## PART 4: FRESH CONTENT ON REVISIT (Seen-Trivia Tracking)

This is the second major deliverable. Currently, trivia uses `Math.random()` with no memory — users may see the same facts repeatedly.

### 4A. Create `apps/mobile/stores/triviaHistory.ts`

Create a new Zustand store (persisted via MMKV) that tracks which trivia IDs the user has already seen:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface TriviaHistoryState {
  /** Map of trivia ID → timestamp when it was last shown */
  seenIds: Record<string, number>;
  /** Record that a trivia item was shown to the user */
  markSeen: (id: string) => void;
  /** Mark multiple items as seen */
  markBatchSeen: (ids: string[]) => void;
  /** Get IDs that have been seen */
  getSeenIds: () => Set<string>;
  /** Clear all history (for testing or user preference) */
  clearHistory: () => void;
  /** Get count of total unique trivia items seen */
  totalSeen: () => number;
}

export const useTriviaHistoryStore = create<TriviaHistoryState>()(
  persist(
    (set, get) => ({
      seenIds: {},
      markSeen: (id) =>
        set((state) => ({
          seenIds: { ...state.seenIds, [id]: Date.now() },
        })),
      markBatchSeen: (ids) =>
        set((state) => {
          const now = Date.now();
          const updated = { ...state.seenIds };
          ids.forEach((id) => { updated[id] = now; });
          return { seenIds: updated };
        }),
      getSeenIds: () => new Set(Object.keys(get().seenIds)),
      clearHistory: () => set({ seenIds: {} }),
      totalSeen: () => Object.keys(get().seenIds).length,
    }),
    {
      name: 'kshetra-trivia-history',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
```

### 4B. Create `apps/mobile/lib/triviaSelector.ts`

A smart selector that prioritizes unseen trivia:

```typescript
import type { TriviaItem } from '../../../data/seed/telangana-trivia';
import { useTriviaHistoryStore } from '../stores/triviaHistory';

/**
 * Get a fresh set of trivia items, prioritizing unseen ones.
 * 
 * Algorithm:
 * 1. Separate items into "unseen" and "seen" pools
 * 2. If enough unseen items exist, pick randomly from unseen pool
 * 3. If unseen pool is exhausted, pick from the OLDEST-seen items (LRU)
 * 4. Mark selected items as seen
 * 
 * This ensures:
 * - First-time users see all unique trivia before any repeats
 * - Returning users see fresh content first
 * - When all trivia is exhausted, the oldest-seen items resurface (feels fresh)
 */
export function selectFreshTrivia(
  allItems: TriviaItem[],
  count: number,
): TriviaItem[] {
  const store = useTriviaHistoryStore.getState();
  const seenIds = store.getSeenIds();
  
  const unseen = allItems.filter((t) => !seenIds.has(t.id));
  const seen = allItems.filter((t) => seenIds.has(t.id));
  
  // Sort seen items by oldest-shown-first (LRU)
  seen.sort((a, b) => (store.seenIds[a.id] || 0) - (store.seenIds[b.id] || 0));
  
  // Build candidate pool: unseen first, then oldest-seen
  const pool = [...unseen, ...seen];
  
  // Shuffle the unseen portion only (to keep variety)
  const unseenCount = Math.min(unseen.length, pool.length);
  for (let i = unseenCount - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Pick `count` items
  const selected = pool.slice(0, Math.min(count, pool.length));
  
  // Mark as seen
  if (selected.length > 0) {
    store.markBatchSeen(selected.map((t) => t.id));
  }
  
  return selected;
}

/**
 * Get fresh trivia for a specific context (constituency, party, etc.)
 * Same algorithm as selectFreshTrivia but operates on filtered items.
 */
export function selectFreshTriviaForContext(
  allItems: TriviaItem[],
  count: number,
  filter: (item: TriviaItem) => boolean,
): TriviaItem[] {
  const filtered = allItems.filter(filter);
  return selectFreshTrivia(filtered, count);
}
```

### 4C. Update Trivia Consumers (3 locations)

#### Location 1: Map idle trivia — `apps/mobile/app/(tabs)/index.tsx`

Find the existing code (around line 437-441):
```typescript
const stateIdleTrivia = useMemo(
  () => getRandomTriviaSetForState(stateCode, 8),
  [stateCode],
);
```

Replace with:
```typescript
const stateIdleTrivia = useMemo(() => {
  const all = getAllTriviaForState(stateCode);
  return selectFreshTrivia(all, 8);
}, [stateCode]);
```

Add import: `import { selectFreshTrivia } from '@/lib/triviaSelector';`
Add import: `import { getAllTriviaForState } from '@/lib/stateTriviaAdapter';`

#### Location 2: Map bottom sheet constituency trivia — `apps/mobile/app/(tabs)/index.tsx`

Find (around line 1017-1023) where constituency-specific trivia is shown in the bottom sheet:
```typescript
const items = getTriviaForConstituencyInState(stateCode, selected.acNo);
```

Replace with:
```typescript
const allConstituencyTrivia = getTriviaForConstituencyInState(stateCode, selected.acNo);
const items = selectFreshTrivia(allConstituencyTrivia, 5);
```

#### Location 3: Constituency detail — `apps/mobile/app/constituency/[id].tsx`

Find (around line 350-357):
```typescript
const triviaItems = getTriviaForConstituencyInState(stateCode, acNo).filter(
  (ti) => !ti.contexts.every((c) => c.type === 'GLOBAL'),
);
```

Replace with:
```typescript
const allTrivia = getTriviaForConstituencyInState(stateCode, acNo).filter(
  (ti) => !ti.contexts.every((c) => c.type === 'GLOBAL'),
);
const triviaItems = selectFreshTrivia(allTrivia, 5);
```

### 4D. TriviaCard Marking Behavior

The `TriviaCard` component auto-rotates through items. When a user **taps shuffle** or the **auto-rotate fires**, mark the NEXT item as seen. Update `apps/mobile/components/TriviaCard.tsx`:

Add import:
```typescript
import { useTriviaHistoryStore } from '../stores/triviaHistory';
```

Inside the component, after the existing `next` callback:
```typescript
const markSeen = useTriviaHistoryStore((s) => s.markSeen);

// In the next() callback, mark the newly visible item:
const next = useCallback(() => {
  setIndex((i) => {
    const nextIdx = (i + 1) % items.length;
    markSeen(items[nextIdx]?.id);
    return nextIdx;
  });
}, [items, markSeen]);

// Also mark the FIRST item as seen on mount:
useEffect(() => {
  if (items[0]) markSeen(items[0].id);
}, [items[0]?.id, markSeen]);
```

---

## PART 5: VERIFICATION CHECKLIST

Run these checks after implementation:

### Compilation & Tests
1. `npx tsc --noEmit` from `apps/mobile` — **ZERO errors**
2. `npx jest --config data/seed/jest.config.js` — **ALL tests pass** (268+ existing)

### Data Quality
3. Every state trivia file has **≥ 10 curated items** with `derived: false`
4. Every file has **≥ 1 derived item** from `deriveTriviaFromLedger()`
5. No duplicate IDs across ALL 31 files (globally unique)
6. Every item has: non-empty `headline`, non-empty `body`, non-empty `source`, at least 1 `context`, valid `category`
7. Category distribution: each state has items from at least 3 different categories
8. Constituency `acNo` references match actual constituency numbers in the state's `xx-constituencies.ts`
9. MLA names match actual names in `xx-mla-profiles.ts` where available
10. No fabricated facts — everything should be verifiable via Google/Wikipedia/ECI

### Adapter Wiring
11. `getAllTriviaForState('BR')` returns ≥ 10 items
12. `getAllTriviaForState('TN')` returns ≥ 10 items
13. `getAllTriviaForState('DL')` returns ≥ 10 items
14. `getTriviaForConstituencyInState('UP', 1)` returns items (check any valid acNo)
15. All 31 state codes are handled in `stateTriviaAdapter.ts` switch statements

### Fresh Content System
16. `triviaHistory` store persists across app restarts (MMKV)
17. Opening the map shows trivia → closing and reopening shows DIFFERENT trivia
18. After seeing all trivia for a state, oldest-seen items resurface (no crash, no empty)
19. Switching states resets the trivia shown (each state has independent content)
20. TriviaCard marks items as seen on mount and on shuffle

### UI Rendering
21. Map idle state shows trivia for EVERY state (not just TS/AP/KA/MH)
22. Constituency detail shows "Did You Know?" for states that have constituency-specific trivia
23. Bottom sheet shows constituency trivia when tapping a constituency on the map

---

## FORBIDDEN ACTIONS

- **DO NOT modify** `telangana-trivia.ts`, `andhra-pradesh-trivia.ts`, `karnataka-trivia.ts`, or `maharashtra-trivia.ts`
- **DO NOT modify** `TriviaCard.tsx` beyond adding the `markSeen` integration (no style changes, no layout changes)
- **DO NOT fabricate** facts — every trivia item must be based on real, verifiable information
- **DO NOT use future dates** — no events after today's date
- **DO NOT change** the `TriviaItem` interface in `telangana-trivia.ts`
- **DO NOT break** existing tests

---

## FILE CREATION/MODIFICATION SUMMARY

### Files to CREATE (new)
| File | Purpose |
|------|---------|
| `apps/mobile/stores/triviaHistory.ts` | Zustand + MMKV store for seen trivia tracking |
| `apps/mobile/lib/triviaSelector.ts` | Smart fresh-content selector (unseen-first, LRU fallback) |

### Files to HEAVILY MODIFY (27 trivia data files)
All `data/seed/XX-trivia.ts` files for: `arunachal-pradesh`, `assam`, `bihar`, `chhattisgarh`, `delhi`, `goa`, `gujarat`, `haryana`, `himachal-pradesh`, `jammu-kashmir`, `jharkhand`, `kerala`, `madhya-pradesh`, `manipur`, `meghalaya`, `mizoram`, `nagaland`, `odisha`, `puducherry`, `punjab`, `rajasthan`, `sikkim`, `tamil-nadu`, `tripura`, `uttar-pradesh`, `uttarakhand`, `west-bengal`

### Files to MODIFY (adapter/wiring)
| File | Changes |
|------|---------|
| `apps/mobile/lib/stateTriviaAdapter.ts` | Add all 27 states to switch statements + imports |
| `apps/mobile/lib/data.ts` | Verify/update export lines for renamed functions |
| `apps/mobile/app/(tabs)/index.tsx` | Use `selectFreshTrivia` instead of `getRandomTriviaSetForState` |
| `apps/mobile/app/constituency/[id].tsx` | Use `selectFreshTrivia` for constituency trivia |
| `apps/mobile/components/TriviaCard.tsx` | Add `markSeen` on mount + shuffle |

### Files NOT to touch
| File | Reason |
|------|--------|
| `data/seed/telangana-trivia.ts` | Gold standard — untouched |
| `data/seed/andhra-pradesh-trivia.ts` | Gold standard — untouched |
| `data/seed/karnataka-trivia.ts` | Gold standard — untouched |
| `data/seed/maharashtra-trivia.ts` | Gold standard — untouched |
| `data/seed/__tests__/telangana-trivia.test.ts` | Existing tests — must still pass |
