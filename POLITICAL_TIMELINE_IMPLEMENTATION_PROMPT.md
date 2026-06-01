# TASK: Political Timeline & Defection Data — Full Implementation for 31 States

## OBJECTIVE
Implement a complete, production-ready political timeline system covering defections, by-elections, resignations, disqualifications, deaths, and party splits for ALL 31 states with data from the last 4 assembly terms. Then build an intuitive UI to display it in the constituency detail page and legislator profile page.

---

## PART 1: DATA GENERATION (27 states need population)

### Existing Infrastructure (DO NOT MODIFY)
- **Type definition**: `data/seed/telangana-political-timeline.ts` exports `PoliticalLedgerEntry` interface
- **Dispatcher**: `apps/mobile/lib/stateDataDispatcher.ts` has `getTimelineForState(stateCode, acNo)` already wired for all 31 states
- **Gold standard examples**: Telangana (1204 lines), Andhra Pradesh (455 lines), Karnataka (387 lines), Maharashtra (356 lines) — study these for format and quality

### Data Format (PoliticalLedgerEntry)
Each entry must have:
```typescript
{
  id: string;              // Format: "{STATE}-{assembly}-{year}-{type}-{seq}" e.g. "TN-16-2021-DEF-001"
  date: string;            // ISO: "YYYY-MM-DD"
  assembly: number;        // Assembly number (e.g. 16th Tamil Nadu Assembly)
  eventType: PoliticalEventType; // 'GENERAL_ELECTION' | 'DEFECTION' | 'BY_ELECTION' | 'DISQUALIFICATION' | 'DEATH' | 'RESIGNATION' | 'MERGER' | 'SPLIT' | 'EXPULSION'
  acNos: number[];         // Constituency numbers affected
  memberNames: string[];   // MLA names involved
  debitParty: string;      // Party losing strength
  creditParty: string;     // Party gaining strength
  seats: number;           // Number of seats in this transaction
  explanation: string;     // Plain-English user-facing explanation
  details: string;         // Background context (legal, political)
  legalStatus: AntiDefectionStatus; // 'UPHELD' | 'STRUCK_DOWN' | 'PENDING' | 'NOT_APPLICABLE' | 'UNKNOWN'
  sources: string[];       // Minimum 2 source URLs (ECI, Wikipedia, news)
  verified: boolean;       // true if cross-verified with 3+ sources
}
```

### States to Populate (27 states — currently empty stubs)

For each state, research and add REAL events from the last 4 assembly terms:

| State | Code | File | Last 4 Assemblies (approx) |
|-------|------|------|---------------------------|
| Tamil Nadu | TN | tamil-nadu-political-timeline.ts | 2006, 2011, 2016, 2021 |
| Kerala | KL | kerala-political-timeline.ts | 2006, 2011, 2016, 2021 |
| West Bengal | WB | west-bengal-political-timeline.ts | 2006, 2011, 2016, 2021 |
| Uttar Pradesh | UP | uttar-pradesh-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Bihar | BR | bihar-political-timeline.ts | 2005, 2010, 2015, 2020 |
| Rajasthan | RJ | rajasthan-political-timeline.ts | 2003, 2008, 2013, 2018, 2023 |
| Gujarat | GJ | gujarat-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Jharkhand | JH | jharkhand-political-timeline.ts | 2005, 2009, 2014, 2019 |
| Odisha | OD | odisha-political-timeline.ts | 2004, 2009, 2014, 2019 |
| Delhi | DL | delhi-political-timeline.ts | 2008, 2013, 2015, 2020 |
| Punjab | PB | punjab-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Haryana | HR | haryana-political-timeline.ts | 2005, 2009, 2014, 2019 |
| Chhattisgarh | CG | chhattisgarh-political-timeline.ts | 2003, 2008, 2013, 2018, 2023 |
| Madhya Pradesh | MP | madhya-pradesh-political-timeline.ts | 2003, 2008, 2013, 2018, 2023 |
| Assam | AS | assam-political-timeline.ts | 2006, 2011, 2016, 2021 |
| Goa | GA | goa-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Himachal Pradesh | HP | himachal-pradesh-political-timeline.ts | 2003, 2007, 2012, 2017, 2022 |
| Manipur | MN | manipur-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Meghalaya | ML | meghalaya-political-timeline.ts | 2008, 2013, 2018, 2023 |
| Mizoram | MZ | mizoram-political-timeline.ts | 2008, 2013, 2018, 2023 |
| Nagaland | NL | nagaland-political-timeline.ts | 2008, 2013, 2018, 2023 |
| Tripura | TR | tripura-political-timeline.ts | 2008, 2013, 2018, 2023 |
| Sikkim | SK | sikkim-political-timeline.ts | 2004, 2009, 2014, 2019 |
| Arunachal Pradesh | AR | arunachal-pradesh-political-timeline.ts | 2004, 2009, 2014, 2019 |
| Uttarakhand | UK | uttarakhand-political-timeline.ts | 2007, 2012, 2017, 2022 |
| Puducherry | PY | puducherry-political-timeline.ts | 2006, 2011, 2016, 2021 |
| Jammu & Kashmir | JK | jammu-kashmir-political-timeline.ts | 2002, 2008, 2014, 2024 |

### What Events to Include (minimum per state)
1. **General Election results** — Party-wise seat breakdowns for each of the 4 terms
2. **All defections** — Every documented party switch (especially bulk defections like Arunachal Pradesh 2016, Goa 2019, Manipur 2020, MP 2020)
3. **By-elections** — Every by-election with winner/loser
4. **Deaths/Resignations** — That led to vacancies
5. **Disqualifications** — Under anti-defection law (10th Schedule)
6. **Party mergers/splits** — Like NCP split in MH, JD(U) splits in Bihar, Shiv Sena split

### Key Real-World Events to Research (DO NOT MISS these landmark events):
- **Madhya Pradesh 2020**: 22 INC MLAs (Jyotiraditya Scindia faction) defect to BJP, toppling Kamal Nath govt
- **Goa 2019**: 10 INC MLAs merge with BJP under anti-defection loophole (2/3 merger)
- **Arunachal Pradesh 2016**: Mass defection from INC to BJP (43 MLAs), PPA merger
- **Karnataka 2019**: 17 INC+JDS MLAs resign (Operation Lotus 2.0), bringing down Kumaraswamy govt
- **Manipur 2017+2020**: Multiple INC defections to BJP post-election
- **Meghalaya 2021**: 12 INC MLAs join TMC under Mukul Sangma
- **Bihar frequent splits**: JD(U)-RJD alliance formations and breakdowns
- **Rajasthan 2020**: Sachin Pilot faction revolt (19 INC MLAs)
- **Jharkhand 2005**: JMM-BJP defection politics
- **Delhi**: Minimal defections (AAP majority too large)
- **Uttarakhand 2016**: President's Rule after cross-voting

### Data Quality Requirements
- Every date must be real (verifiable via ECI/news)
- Every MLA name must be real
- Every acNo must correspond to the correct constituency in the state's seed file
- Sources must be real URLs (ECI results, Wikipedia assembly pages, Hindu/NDTV/IE articles)
- Minimum 15-30 ledger entries per state (more for politically volatile states like Goa, Arunachal, MP, Karnataka)
- DO NOT fabricate events. If unsure about specific dates or names, use broader entries (e.g., "2020-03-10" for Scindia defection batch)

### File Structure
Each file must export:
1. `XX_POLITICAL_LEDGER: PoliticalLedgerEntry[]` (or state-specific interface that adapts)
2. `computeXXPartyStrength()` — Starting from election results, applying all ledger entries chronologically
3. `getXXConstituencyTimeline(acNo: number)` — Filter ledger for specific constituency
4. `getXXDefectionSummary()` — All defection-type events

### Adaptation Note
The 4 gold-standard states (TS, AP, KA, MH) use the full `PoliticalLedgerEntry` interface from telangana-political-timeline.ts.
The 27 stub states currently use a simpler interface. You have TWO options:
- **Option A (Preferred)**: Upgrade all 27 states to use the full `PoliticalLedgerEntry` interface (import from telangana-political-timeline.ts)
- **Option B**: Keep the simpler interface but ensure `adaptTimelineEntries()` in stateDataDispatcher.ts correctly maps all fields

Choose Option A for data consistency.

---

## PART 2: UI IMPLEMENTATION — Strategic Placement

### WHERE to display (3 locations):

#### Location 1: Constituency Detail Page → History Tab (ENHANCE existing)
**File**: `apps/mobile/app/constituency/[id].tsx`
**Current state**: Shows election winners per year + state assembly overview
**ADD**: A "Political Events" section BELOW the election history showing:
- Defections FROM this constituency
- By-elections in this constituency
- Party changes affecting this seat
- Timeline visualization with dots and connecting lines

#### Location 2: Legislator Profile Page (NEW section)
**File**: `apps/mobile/app/legislator/[id].tsx`
**Current state**: Has ProfileHeroCard, FinancialBreakdownCard, CriminalRecordCard, PerformanceCard, RedFlagsBanner
**ADD**: A "Political Journey" section showing:
- Party loyalty timeline (visual)
- If this MLA defected: prominently show when, from/to, legal status
- Anti-defection proceedings (if any)
- This should appear BETWEEN ProfileHeroCard and FinancialBreakdownCard

#### Location 3: Intelligence Tab → State Summary (ENHANCE existing)
**File**: `apps/mobile/app/(tabs)/intelligence.tsx`
**ADD below Election Timeline**: A "Defection Tracker" summary card showing:
- Total defections in current assembly
- Net party strength changes (current vs election-day)
- Most volatile constituencies

### UI DESIGN REQUIREMENTS

#### Design Philosophy
- **Chronological storytelling** — Events flow top-to-bottom like a news feed
- **Color-coded by event type** — Defection (amber/warning), Election (blue), Death (gray), By-election (green)
- **Party colors** — Use existing `getPartyColor()` for all party references
- **Progressive disclosure** — Show summary first, tap to expand full details
- **Mobile-first** — Swipeable timeline cards, not overwhelming tables

#### Component 1: `PoliticalTimelineCard` (new component)
**Path**: `apps/mobile/components/PoliticalTimelineCard.tsx`
```
┌─────────────────────────────────────────┐
│ ○ 2020-03-10                    DEFECTION│
│ │                                        │
│ │  Jyotiraditya Scindia + 21 MLAs       │
│ │  ┌─────┐  ──→  ┌─────┐               │
│ │  │ INC │       │ BJP │                │
│ │  └─────┘       └─────┘               │
│ │  "22 Congress MLAs resigned following │
│ │   Scindia's exit, toppling Kamal Nath │
│ │   government"                          │
│ │                                        │
│ │  ⚖️ Anti-Defection: Resigned before   │
│ │     disqualification                   │
│ │  📎 2 sources                          │
│ ○                                        │
└─────────────────────────────────────────┘
```

#### Component 2: `DefectionJourneyCard` (for legislator profile)
**Path**: `apps/mobile/components/legislator/DefectionJourneyCard.tsx`
```
┌─────────────────────────────────────────┐
│  ⚠️ Party Switch History                 │
│                                          │
│  INC ──────●──────── BJP                │
│         2020-03-10                       │
│                                          │
│  Elected on: INC ticket (2018)          │
│  Current party: BJP                      │
│  Legal status: Resigned before 10th Sch │
│                                          │
│  "Joined BJP along with 21 MLAs..."     │
└─────────────────────────────────────────┘
```

#### Component 3: `PartyStrengthChart` (for intelligence tab)
**Path**: `apps/mobile/components/PartyStrengthChart.tsx`
```
┌─────────────────────────────────────────┐
│  📊 Current vs Election Day             │
│                                          │
│  BJP   ████████████████████  120 (+22)  │
│  INC   ████████              88  (-22)  │
│  BSP   ██                    8   (0)    │
│                                          │
│  ⚡ 22 defections this term             │
│  🏛️ 2 by-elections held                │
└─────────────────────────────────────────┘
```

#### Interaction Patterns
1. **Tap a timeline event** → Expand to show full details, sources, legal status
2. **Filter by event type** — Horizontal chips: All | Defections | By-elections | Deaths
3. **"See all events" link** → Full scrollable timeline (if >5 events for a constituency)
4. **Defection badge on MLA cards** — Already exists (`DefectionBadge.tsx`), keep using it
5. **Haptic feedback** on timeline dot tap (use existing `lib/haptics.ts`)

#### Colors & Icons (use existing theme)
- Defection: `#F59E0B` (amber) + `swap-horizontal` icon
- General Election: `#4F8EF7` (blue) + `checkbox` icon
- By-election: `#10B981` (green) + `add-circle` icon
- Death/Vacancy: `#6B7280` (gray) + `remove-circle` icon
- Disqualification: `#EF4444` (red) + `close-circle` icon
- Merger/Split: `#8B5CF6` (purple) + `git-merge` icon

---

## PART 3: INTEGRATION & WIRING

### Step 1: Update `stateDataDispatcher.ts`
- If you upgrade to Option A (full PoliticalLedgerEntry for all states), remove `adaptTimelineEntries()` wrapper calls
- Ensure `getTimelineForState()` returns correctly typed data

### Step 2: Add to Constituency Detail Page
In `apps/mobile/app/constituency/[id].tsx`:
- Import `getTimelineForState` from stateDataDispatcher
- In the `history` tab section (line ~570), AFTER the existing election history, add:
```tsx
{/* Political Events Timeline */}
{(() => {
  const events = getTimelineForState(stateCode, acNo);
  if (events.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Political Events</Text>
      {events.map(event => (
        <PoliticalTimelineCard key={event.id} event={event} />
      ))}
    </View>
  );
})()}
```

### Step 3: Add to Legislator Profile Page
In `apps/mobile/app/legislator/[id].tsx`:
- Import timeline data
- Check if MLA has defection events
- Render `DefectionJourneyCard` between hero and financial sections

### Step 4: Add to Intelligence Tab
In `apps/mobile/app/(tabs)/intelligence.tsx`:
- After "Election Timeline" section, add "Defection Tracker" card
- Show `PartyStrengthChart` with election-day vs current comparison

---

## PART 4: VERIFICATION CHECKLIST

After implementation, verify:
1. [ ] `npx tsc --noEmit` from `apps/mobile` — ZERO errors
2. [ ] `npx jest --config data/seed/jest.config.js` — ALL tests pass
3. [ ] Every state file has ≥15 ledger entries with real dates
4. [ ] No fabricated MLA names (cross-check with mla-profiles seed data)
5. [ ] `getTimelineForState('MP', 120)` returns events for Scindia-era defections
6. [ ] `getTimelineForState('GA', 15)` returns Goa merger events
7. [ ] All source URLs are plausible (ECI/Wikipedia/news domains)
8. [ ] UI renders correctly — timeline cards show in constituency history tab
9. [ ] Legislator profile shows defection journey for known defectors
10. [ ] Intelligence tab shows party strength delta
11. [ ] No negative seat counts in any `computeXXPartyStrength()` output
12. [ ] Haptic feedback on timeline card tap
13. [ ] i18n keys added for all new UI strings

---

## EXECUTION ORDER
1. First: Populate all 27 stub files with real data (this is the bulk of the work)
2. Second: Create `PoliticalTimelineCard.tsx` component
3. Third: Create `DefectionJourneyCard.tsx` component
4. Fourth: Create `PartyStrengthChart.tsx` component
5. Fifth: Wire into constituency detail page
6. Sixth: Wire into legislator profile page
7. Seventh: Wire into intelligence tab
8. Eighth: Add i18n keys
9. Ninth: Run full verification suite

## CRITICAL REMINDERS
- This is a React Native / Expo app using TypeScript
- Styling is inline StyleSheet (dark theme, bg: #0A0A1A, cards: #111827)
- Use existing `getPartyColor()` from `@/lib/constants`
- Use existing `Ionicons` for icons
- Use existing haptics from `lib/haptics.ts`
- Follow the existing pattern in the 4 gold-standard timeline files for data format
- DO NOT modify telangana-political-timeline.ts, andhra-pradesh-political-timeline.ts, karnataka-political-timeline.ts, or maharashtra-political-timeline.ts
- All data must be historically accurate — this is a political transparency app
