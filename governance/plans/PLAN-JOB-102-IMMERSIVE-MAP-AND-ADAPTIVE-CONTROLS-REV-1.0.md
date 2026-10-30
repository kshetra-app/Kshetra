# Canonical Pre-Implementation Plan: JOB 102 — Interactive Immersive Map Landing Experience, Adaptive Floating Controls & Brand Logo Integration

**Plan Identifier:** `PLAN-JOB-102-IMMERSIVE-MAP-AND-ADAPTIVE-CONTROLS-REV-1.0`  
**Governing Authority:** Master Product Blueprint (New Job 102), Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** JOB 102 (Mobile Map Landing Canvas, Interactive Gesture Immersion, Adaptive Floating Controls & Poligram Brand Integration)  
**Creation Date:** 2026-10-30  
**Status:** `SUBMITTED_FOR_REVIEW` (Implementation Authorization: `NO`)  

---

## 1. Document Title & Metadata

- **Document Title:** Master Pre-Implementation Plan: JOB 102 — Interactive Immersive Map Landing Experience, Adaptive Floating Controls & Brand Logo Integration
- **Document Revision:** 1.0 (Initial Submission)
- **Target Repository:** `POLIGRAM` (formerly `PANIN` / `Kshetra`)
- **Governing Protocol:** Agent Execution Protocol Revision 1.6 & Amendment v1.5-A Section 26
- **Assigned Engineering Domain:** `MOBILE`, `UX`, `GEOSPATIAL`, `DESIGN_SYSTEM`
- **Execution Authority:** CTO / User Sole Ratification Boundary
- **Current Git HEAD:** `f10dfa4ac558e875c02089710d9b81a90506a5cc` (`origin/master`)

---

## 2. Problem Statement & User Directive Analysis

Under User Directive received 2026-10-30, JOB 102 is formally incorporated into the POLIGRAM Master Blueprint as a high-impact, user-centric UX transformation of the mobile map landing screen (`apps/mobile/app/(tabs)/index.tsx`).

The landing map screen is the visual, interactive gateway to 4,123 Assembly Constituencies and 543 Parliamentary Constituencies across India. However, the existing implementation exhibits 7 critical UX and functional bottlenecks:
1. **Brand Inconsistency (Req 1):** The header still displays legacy text branding (`t('common.appName')`) rather than the official `POLIGRAM` transparent lockup logo image from `Logo/`.
2. **Legend Truncation in National/State Views (Req 2):** `apps/mobile/components/MapLegend.tsx` restricts parties to `.slice(0, 8)` and renders within a fixed container. When viewing all of India (`stateCode === 'IN'`) or states with multi-party coalitions (e.g. Maharashtra, Tamil Nadu, Bihar), many active parties are omitted or overflow the viewport without smooth, scrollable navigation.
3. **Screen Clutter During Map Exploration (Req 3):** When a user lays their fingers on or drags the map (exploring terrain, constituency borders, or zooming), the screen is crowded with the top header, state switchers, floating trivia cards, candidate bottom sheets, and the main bottom navigation tab bar.
4. **Lack of Automated Inactivity Revival (Req 4):** When touch/gesture activity ceases, there is no automatic, smooth transition that restores normal UI controls without requiring confusing manual taps.
5. **Fixed Control Rigidity (Req 5):** The map action buttons (`search`, `compare`, `reset`, `3d view`, `district`, `density`, `locate`) are pinned rigidly to the top-right edge, obstructing underlying map geometry and preventing users from moving them to comfortable thumb zones.
6. **Lack of Spatial Orientation Adaptation (Req 6):** Controls remain vertically stacked regardless of where they are positioned on the screen. If dragged to the top or bottom of the screen, vertical stacking covers large vertical swaths of the map; controls must dynamically switch to a horizontal bar along top/bottom edges, a vertical column along side edges, and an ergonomic $2 \times N$ cluster in screen corners.
7. **Absence of Immersion Exit Cue (Req 7):** When all non-map UI items are 100% transparent, the user lacks an intuitive, visual anchor signaling how to restore normal UI visibility. The `reset` button must remain visible, pulsing with a slow glowing neon amber halo, signaling that tapping it immediately cancels immersion and resets the map.

---

## 3. Authoritative Scope & File Target Manifest

### 3.1 New Files to Create
1. `apps/mobile/components/AdaptiveFloatingControls.tsx`:
   - Unified, draggable floating action control container.
   - Dynamic orientation state engine (`vertical` $\leftrightarrow$ `horizontal` $\leftrightarrow$ `corner-grid`).
   - Clamped safe-area screen physics with snap-to-edge support.
   - Integrated looping neon pulse animation for the Reset button during screen immersion.
2. `tests/job102-immersive-map-and-adaptive-controls.test.ts`:
   - Comprehensive automated unit and contract test suite verifying:
     - Logo asset existence, aspect ratio, and header integration.
     - MapLegend party collector logic without truncation and scrollable container contract.
     - Touch immersion opacity state machine and 7.5s inactivity timer.
     - Adaptive geometry layout calculator across all 8 screen zones (Top, Bottom, Left, Right, 4 Corners).
     - Glowing pulse Reset button indicator and instant visibility revival invariant.

### 3.2 Existing Files to Modify
1. `apps/mobile/app/(tabs)/index.tsx`:
   - Header: replace text app title with official `poligram_logo_lockup_transparent.png` image.
   - Gesture wrapper: wrap map surface with touch listener capturing start/move gestures to trigger immersion mode.
   - Inactivity timer: implement unref'd 7500ms inactivity timer restoring UI smoothly upon idle.
   - Replace rigid `styles.actionButtons` block with `<AdaptiveFloatingControls />`.
   - Wire Reset action to simultaneously cancel immersion and restore map camera/state.
2. `apps/mobile/components/MapLegend.tsx`:
   - Remove `.slice(0, 8)` hard ceiling from `buildPartyLegend`.
   - Implement national party collector aggregating ruling and major recognized parties across all States & UTs.
   - Upgrade internal `ScrollView` with `maxHeight: 280`, visible scroll indicators, and nested scroll containment.
3. `apps/mobile/stores/activeState.ts`:
   - Add `isScreenImmersive: boolean` and `setIsScreenImmersive: (val: boolean) => void` to zustand state.
4. `apps/mobile/app/(tabs)/_layout.tsx`:
   - Synchronize tab bar visibility: set `display: (mapOnlyMode || broadcastMode || isScreenImmersive) ? 'none' : 'flex'` or animate tab bar opacity to 0 during immersion.
5. Assets:
   - Copy `Logo/poligram_logo_lockup_transparent.png` to `apps/mobile/assets/poligram_logo_lockup_transparent.png`.
6. Governance:
   - Update `EXECUTION_STATE.md` (record JOB 102 planning and coordinates).
   - Update `ACCEPTANCE_REGISTER.md` (register JOB 102).
   - Update `DECISION_LOG.md` (record DEC-195).

---

## 4. State Machine & Interaction Design

```mermaid
stateDiagram-v2
    [*] --> NormalUI: App Boots on Map Screen
    
    state NormalUI {
        [*] --> VisibleState
        VisibleState: All UI Elements at Opacity 1.0
        VisibleState: Top Header Active
        VisibleState: Bottom Tab Bar Active
        VisibleState: Map Controls Standby
    }
    
    NormalUI --> ImmersiveUI: User Touches / Drags Map Screen
    
    state ImmersiveUI {
        [*] --> FadingOut: Animate Opacity 1.0 -> 0.0 (300ms)
        FadingOut --> TransparentState: Opacity = 0.0
        TransparentState: Non-Map UI PointerEvents = none
        TransparentState: Bottom Tab Bar Hidden
        TransparentState: Map Controls Floating
        TransparentState: Reset Button Glowing / Slow Blinking
        TransparentState: Inactivity Timer Armed (7500ms)
    }
    
    ImmersiveUI --> ImmersiveUI: Additional Touch / Movement (Reset Timer to 7500ms)
    ImmersiveUI --> NormalUI: Inactivity Timer Expires (7.5s Idle)
    ImmersiveUI --> NormalUI: User Taps Glowing Reset Button (Instant Revival + Map Reset)
```

---

## 5. Asset & Visual Identity Architecture

- **Asset Source:** `Logo/poligram_logo_lockup_transparent.png` (Dimensions: 1197 $\times$ 400, native transparent PNG).
- **Target Location:** `apps/mobile/assets/poligram_logo_lockup_transparent.png`.
- **Display Specifications:**
  - Container: Top header left lockup container (`styles.headerTop`).
  - Render Component: React Native `<Image source={require('../../assets/poligram_logo_lockup_transparent.png')} resizeMode="contain" />`.
  - Dimensions: Height `26dp`, Width `78dp` (exact 3:1 aspect ratio matching master artwork).
  - Accessibility: `accessibilityLabel="POLIGRAM"`, `accessible={true}`.
  - Subtitle: Localized state name and constituency count rendered immediately below the logo lockup in crisp secondary typography (`#94A3B8`).

---

## 6. Map Legend Infinite Scroll & Dynamic Party Allocation

### 6.1 Elimination of Arbitrary Truncation
In `apps/mobile/components/MapLegend.tsx`, the legacy implementation truncated parties via `.slice(0, 8)`. This created critical information omission in multi-party states and national overview.
- **National View (`stateCode === 'IN'`):**
  - Collects all ruling parties across 31 States/UTs plus all national recognized parties from `PARTY_CONFIG`.
  - Sorts descending by state count / national influence.
  - Displays party color dot, party acronym, and full official name.
- **State View:**
  - Scans all assembly constituencies in the active state via `getUnifiedConstituenciesForState(stateCode)`.
  - Groups and tallies total seats won/held by each party.
  - Sorts descending by seat count, displaying all qualifying parties without truncation.

### 6.2 Scrollable Container Engineering
- Embeds party chips within a dedicated `ScrollView` with:
  - `maxHeight: 280dp` (adapting gracefully on smaller screens via `Dimensions.get('window').height * 0.35`).
  - `showsVerticalScrollIndicator: true` with subtle gold-accent scroll thumb.
  - `persistentScrollbar: true` for persistent visual affordance.
  - `nestedScrollEnabled: true` preventing conflict with the outer floating pan responder.
  - Always pins the Selected / Favorite marker reference legend at the bottom separated by an elegant hairline divider.

---

## 7. Screen Immersion Engine & Inactivity State Machine

### 7.1 Gesture Detection Without Map Interference
- To avoid intercepting Mapbox/MapLibre's internal gesture handlers (pinch, pan, rotate, tilt), touch detection operates via non-blocking touch responders on the map surface wrapper:
  - `onTouchStart` and `onTouchMove` listeners fire on initial touch and finger translation.
  - `onStartShouldSetResponderCapture: () => false` ensures child map touches are never cancelled or stolen.

### 7.2 Opacity Animation Pipeline
- Controlled by `immersiveAnim = useRef(new Animated.Value(1)).current`.
- When immersion is triggered:
  - `Animated.timing(immersiveAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start()`.
  - Header, state switcher, trivia cards, and non-map floating overlays fade to 0.0 opacity.
  - Sets `isScreenImmersive = true` in `useActiveStateStore`.
  - `apps/mobile/app/(tabs)/_layout.tsx` checks `isScreenImmersive` and automatically hides the bottom navigation bar (`display: 'none'`).
  - Non-map overlay containers apply `pointerEvents={isImmersive ? 'none' : 'box-none'}` so taps fall directly to the map canvas.

### 7.3 Inactivity Timer Architecture
- Timer duration: Exactly 7,500ms (7.5 seconds) within the user's requested 7–8 second window.
- Implemented via `inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)`.
- On every touch start or move event:
  - Existing timer is cleared via `clearTimeout(inactivityTimerRef.current)`.
  - New timer is armed:
    ```ts
    inactivityTimerRef.current = setTimeout(() => {
      Animated.timing(immersiveAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      setIsScreenImmersive(false);
    }, 7500);
    ```
- Cleanup: Inactivity timer is strictly cleared in `useEffect` unmount cleanup handler, preventing memory leaks.

---

## 8. Adaptive Floating Control Architecture & Geometry Math

### 8.1 Unified Control Unit
The 7 discrete map controls are unified into a single floating, draggable component `<AdaptiveFloatingControls />`:
1. `search`: Search constituency or district (`Ionicons "search"`)
2. `compare`: Two-constituency comparator sheet (`Ionicons "git-compare"`)
3. `reset`: Reset camera, filters, and immersion (`Ionicons "refresh"`)
4. `3d view`: 3D extrusion mode toggle (`Ionicons "cube"`)
5. `district`: Focus district boundary filter (`Ionicons "funnel"`)
6. `density`: Delimitation seat density overlay (`Ionicons "layers"`)
7. `locate`: GPS user location finder (`Ionicons "locate"`)

### 8.2 Spatial Geometry Classifier Math
Let $(x, y)$ be the current top-left coordinate of the floating control unit on a viewport of width $W$ and height $H$:
- **Horizontal Boundary Zones:**
  $$\text{isTop} = (y < 130), \quad \text{isBottom} = (y > H - 210)$$
- **Vertical Boundary Zones:**
  $$\text{isLeft} = (x < 80), \quad \text{isRight} = (x > W - 120)$$
- **Zone Decision Matrix:**
  $$\text{Orientation}(x, y) = \begin{cases}
  \text{'corner-grid'} & \text{if } (\text{isTop} \lor \text{isBottom}) \land (\text{isLeft} \lor \text{isRight}) \\
  \text{'horizontal'} & \text{if } (\text{isTop} \lor \text{isBottom}) \land \neg(\text{isLeft} \lor \text{isRight}) \\
  \text{'vertical'} & \text{otherwise (sides or middle)}
  \end{cases}$$

### 8.3 Layout Formats
1. **Vertical Column (`vertical`):**
   - Stacked vertically with 6dp spacing (`flexDirection: 'column'`).
   - Width: ~54dp, Height: ~360dp.
   - Ideal along left or right screen margins.
2. **Horizontal Bar (`horizontal`):**
   - Aligned horizontally in a single strip (`flexDirection: 'row'`).
   - Height: ~54dp, Width: ~360dp.
   - Ideal along top or bottom screen margins.
3. **Corner Matrix (`corner-grid`):**
   - Compact $2 \times N$ cluster (`flexDirection: 'row'`, `flexWrap: 'wrap'`, max width: ~115dp).
   - Ergonomically hugs any of the 4 screen corners (Top-Left, Top-Right, Bottom-Left, Bottom-Right) without protruding into the central map view.

### 8.4 Drag Physics & Edge Clamping
- Powered by `PanResponder` with `Animated.ValueXY`.
- Position coordinates clamped strictly within safe viewport bounds:
  $$x_{\text{clamped}} = \max(10, \min(x, W - W_{\text{unit}} - 10))$$
  $$y_{\text{clamped}} = \max(50, \min(y, H - H_{\text{unit}} - 70))$$
- Orientation transitions trigger light haptic feedback (`selectionChanged()`) and spring layout animation.

---

## 9. Glow & Pulse Indication Engine (Reset Invariant)

### 9.1 Immersion Visibility Exemption
While the rest of the UI (headers, cards, tab bar) fades to 0% opacity during immersion, the `AdaptiveFloatingControls` unit remains visible, and the `reset` button transitions into an illuminated, pulsing beacon.

### 9.2 Pulsing Animation Loop
Controlled by `pulseAnim = useRef(new Animated.Value(0.3)).current`:
```ts
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.0, duration: 1100, useNativeDriver: false }),
    Animated.timing(pulseAnim, { toValue: 0.3, duration: 1100, useNativeDriver: false }),
  ])
).start();
```

### 9.3 Visual Aesthetics
- **Neon Amber Border:** Border color pulses with golden amber `#FCD34D`.
- **Glowing Halo Shadow:**
  - `shadowColor: '#FCD34D'`
  - `shadowRadius: 16`
  - `shadowOpacity: pulseAnim`
  - `elevation: 12`
- **Icon Accentuation:** Refresh icon renders in vibrant amber gold `#FCD34D` with subtle icon rotation/scale.

### 9.4 Dual-Action Reset Tap
When the user taps the glowing Reset button during immersion mode:
1. Immediately cancels immersion mode, halting the pulse loop.
2. Animates all screen UI elements back to 100% normal opacity ($1.0$).
3. Executes standard map reset: clears selected constituency, resets comparison sheet, restores state camera, and triggers `tapLight()` haptic feedback.

---

## 10. Architectural Decisions & Alternatives Considered

### Decision 1: Spatial Geometry & Orientation Switching Model
- **Option A (Recommended):** Three-Zone Dynamic Matrix (Horizontal Bar on top/bottom, Vertical Column on sides, Clustered $2 \times N$ Grid in corners) with haptic snap confirmation and clamped safe-area boundaries.
- **Option B:** Radial Floating Action Button (FAB) menu that unfolds into a circular dial when tapped and collapses into a single floating icon.
- *Recommendation:* **Option A**. It delivers the exact behavior requested by the user, provides immediate 1-tap access to all 7 tools without requiring an extra expand/collapse step, and adapts seamlessly to thumb ergonomics.

### Decision 2: Immersion Gesture Detection & Tab Bar Control
- **Option A (Recommended):** Non-blocking map surface touch listeners driving an `Animated.Value` (`immersiveOpacity`), synchronized with `useActiveStateStore.isScreenImmersive` to hide the Expo Router bottom tab bar cleanly, backed by an unref'd 7.5s inactivity timer.
- **Option B:** Full-screen touch overlay that intercepts gestures and manually forwards them to the underlying map.
- *Recommendation:* **Option A**. Native map touch performance is 100% preserved with zero touch lag or missed pinches, while the shared store cleanly hides the tab bar across Expo Router layouts.

### Decision 3: Glowing Reset Indicator Aesthetics
- **Option A (Recommended):** Animated Neon Amber Halo Ring with dynamic shadow radius and pulsing golden border (`Animated.loop(Animated.sequence([...]))`), where tapping Reset simultaneously cancels immersion and resets map state.
- **Option B:** Simple opacity fading between 0.4 and 1.0 without shadow glow or amber border accents.
- *Recommendation:* **Option A**. Provides unambiguous, high-contrast visual affordance on dark satellite and terrain maps, making it immediately obvious to the user that tapping restores the full UI.

### Decision 4: MapLegend Party Scaling & Scrolling Architecture
- **Option A (Recommended):** Dynamic Party Collector without arbitrary `.slice(0, 8)` cap, displaying all participating parties in state or national view, encased in a scrollable panel with `maxHeight: 280dp`, persistent scroll indicators, and nested scroll containment.
- **Option B:** Fixed 8-party view with pagination arrows ("Page 1 of 4").
- *Recommendation:* **Option A**. Smooth vertical scrolling matches modern mobile design standards, allows rapid thumb scanning through 50+ parties in national view, and preserves full data integrity.

---

## 11. Component Hierarchy & Interface Contracts

```mermaid
graph TD
    A["MapScreen (apps/mobile/app/(tabs)/index.tsx)"] --> B["TouchGestureSurface (Non-blocking touch wrapper)"]
    B --> C["Mapbox / MapLibre GL Canvas"]
    A --> D["ImmersiveAnimatedHeader (Animated.View - Opacity 1.0 -> 0.0)"]
    D --> D1["PoligramLogoImage (apps/mobile/assets/poligram_logo_lockup_transparent.png)"]
    D --> D2["State & National Subtitle"]
    D --> D3["StateSwitcher & LanguageSwitcher"]
    A --> E["MapLegend (Floating, Scrollable, Uncapped Party List)"]
    A --> F["AdaptiveFloatingControls (Draggable, Multi-Zone Orientation)"]
    F --> F1["SearchButton"]
    F --> F2["CompareButton"]
    F --> F3["ResetButton (Pulsing Amber Glow in Immersion)"]
    F --> F4["3DViewButton"]
    F --> F5["DistrictButton"]
    F --> F6["DensityButton"]
    F --> F7["LocateMeButton"]
    A --> G["BottomBar Layout (apps/mobile/app/(tabs)/_layout.tsx)"]
    G -.->|Controlled by isScreenImmersive| H["Bottom Tab Bar (Hidden when isScreenImmersive=true)"]
```

### TypeScript Contracts (`AdaptiveFloatingControls.tsx`)
```typescript
export type ControlOrientation = 'vertical' | 'horizontal' | 'corner-grid';

export interface AdaptiveFloatingControlsProps {
  initialX?: number;
  initialY?: number;
  stateCode: string;
  selectedConstituency: any | null;
  mapCompareActive: boolean;
  focusedDistrict: string;
  is3DMode: boolean;
  showDelimitation: boolean;
  locating: boolean;
  isImmersive: boolean;
  onOpenSearch: () => void;
  onOpenCompare: () => void;
  onReset: () => void;
  onToggle3D: () => void;
  onToggleDistrict: () => void;
  onToggleDelimitation: () => void;
  onLocateMe: () => void;
}
```

---

## 12. Haptics, Accessibility & Performance Budget

1. **60 FPS Animation Guarantee:**
   - Opacity transitions leverage `useNativeDriver: true`.
   - Layout transitions use lightweight flex adjustments.
   - Pulse animation is isolated to the Reset button container.
2. **Haptic Confirmation:**
   - Orientation zone switches emit `selectionChanged()` haptic pulses.
   - Button presses emit `tapLight()`.
3. **Accessibility (WCAG 2.1 AA):**
   - High contrast golden ratio (#FCD34D against #0F172A).
   - Clear accessibility labels for screen readers across all 7 action buttons and the Poligram logo lockup.

---

## 13. Negative & Adversarial Edge Cases

1. **Rapid Multi-Touch / Flailing:** If user frantically taps or scrolls the map, timer reset logic debounce-guards against repeated `Animated.timing` restarts.
2. **Screen Rotation / Dimension Change:** Draggable coordinates clamped dynamically against updated `Dimensions.get('window')` to ensure controls never escape outside visible viewports.
3. **Unmount with Active Inactivity Timer:** Inactivity timer stored in a ref and strictly cleared on component unmount to prevent React memory leak warnings.
4. **Nested Scroll Trapping in Legend:** Legend `ScrollView` enables `nestedScrollEnabled={true}` and isolates touch events so scrolling parties does not accidentally drag the floating legend container.

---

## 14. Mobile Build & TypeScript Parity Strategy

- Target: Zero TypeScript errors (`tsc --noEmit` clean across `apps/mobile`).
- Expo Asset Resolution: Logo asset imported via standard React Native `require('../../assets/poligram_logo_lockup_transparent.png')`.
- Backward Compatibility: Gracefully handles environments where Mapbox native binaries fall back to web/mock renderers without throwing runtime exceptions.

---

## 15. Automated Verification Plan & Acceptance Criteria

### Test Suite: `tests/job102-immersive-map-and-adaptive-controls.test.ts`
- **Test 1 (Brand Asset Verification):** Validates that `apps/mobile/assets/poligram_logo_lockup_transparent.png` exists, is a valid PNG with 3:1 aspect ratio, and is imported in `index.tsx`.
- **Test 2 (MapLegend Uncapped Dynamic Parties):** Proves `buildPartyLegend` renders all parties without `.slice(0, 8)` truncate and includes national party aggregation.
- **Test 3 (MapLegend Scroll Container Contract):** Verifies `ScrollView` has vertical scrolling enabled, persistent scrollbar, and dynamic max-height bounds.
- **Test 4 (Screen Immersion State Transitions):** Proves touch event transitions opacity to 0.0, sets `isScreenImmersive = true`, and sets `pointerEvents = 'none'`.
- **Test 5 (Inactivity Timer State Transition):** Proves 7.5s inactivity timer triggers smooth revival (opacity 1.0, `isScreenImmersive = false`).
- **Test 6 (Adaptive Geometry Classifier - All 8 Zones):**
  - Top-Left Corner $\to$ `corner-grid`
  - Top Edge $\to$ `horizontal`
  - Top-Right Corner $\to$ `corner-grid`
  - Left Edge $\to$ `vertical`
  - Right Edge $\to$ `vertical`
  - Bottom-Left Corner $\to$ `corner-grid`
  - Bottom Edge $\to$ `horizontal`
  - Bottom-Right Corner $\to$ `corner-grid`
- **Test 7 (Glowing Reset Beacon Contract):** Proves Reset button pulses amber/gold during immersion and tapping Reset cancels immersion while executing map reset.

---

## 16. Regression & Cross-Domain Compatibility

- Monorepo compilation verified via `tsc --noEmit` across `packages/shared`, `apps/api`, and `apps/mobile`.
- Full governance test suite: `node tests/governance-consistency.test.mjs` $\to$ 100% PASS.
- No impact on backend APIs, database migrations, or developer SDKs.

---

## 17. Execution Steps & Sequencing

```mermaid
graph TD
    S1["Step 1: Ratification & Control M Authorization"] --> S2["Step 2: Copy Logo Asset to apps/mobile/assets/"]
    S2 --> S3["Step 3: Update MapLegend.tsx with Scroll & Dynamic Collector"]
    S3 --> S4["Step 4: Update activeState.ts with isScreenImmersive"]
    S4 --> S5["Step 5: Author AdaptiveFloatingControls.tsx with Orientation Math & Pulse"]
    S5 --> S6["Step 6: Update index.tsx and _layout.tsx for Immersion & Logo"]
    S6 --> S7["Step 7: Author & Execute Automated Test Battery (7/7 PASS)"]
    S7 --> S8["Step 8: Monorepo Typecheck (tsc --noEmit)"]
    S8 --> S9["Step 9: Governance Reconciliation & Master Push"]
```

---

## 18. Rollback & Disaster Recovery Strategy

If an unexpected regression occurs:
1. Revert to base commit `f10dfa4ac558e875c02089710d9b81a90506a5cc`.
2. All changes are strictly additive and scoped to UI layout components; zero database migrations or persistent storage structures are mutated.

---

## 19. Human Authority & Non-Self-Acceptance Gate (Rule IV-001)

Under Rule IV-001 and Amendment v1.5-A / v1.6:
- The AI Agent is strictly prohibited from authorizing its own plan or writing implementation code prior to explicit user ratification.
- Implementation authorization remains fail-closed (`IMPLEMENTATION_AUTHORIZATION: NO`).
- Execution will commence only after the user reviews the 4 architectural decisions and grants explicit authorization under Control M.

---

## 20. Control M Machine Verification Alignment

```text
CURRENT_JOB:                           JOB 102: INTERACTIVE IMMERSIVE MAP LANDING EXPERIENCE & ADAPTIVE FLOATING CONTROLS
PLAN_STATUS:                           SUBMITTED_FOR_REVIEW
IMPLEMENTATION_AUTHORIZATION:          NO
AUTHORIZED_JOB:                        NONE
AUTHORIZED_SCOPE_HASH:                 NONE
IMPLEMENTATION_AUTHORIZATION_COMMIT:   NONE
NEXT_PERMITTED_JOB:                    JOB 102
```

---

## 21. Pre-Implementation Claims & Assertions

1. **No Stubs / No Mocks:** All touch handlers, animations, and geometry math will be fully functional, production-ready React Native code.
2. **Brand Purity:** The landing map screen will proudly showcase the authentic Poligram brand logo lockup.
3. **Flawless Ergonomics:** Citizens will experience a distraction-free, immersive map canvas that breathes with their touch, backed by adaptive controls that conform to their screen gestures.

---

## 22. Sign-off & Submission Block

- **Submitted By:** Antigravity AI Engineering Subsystem
- **Submission Date:** 2026-10-30
- **Governing Commit:** `f10dfa4ac558e875c02089710d9b81a90506a5cc`
- **Awaiting:** User Ratification & Explicit Implementation Authorization under Control M
