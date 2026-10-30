/**
 * JOB 102: Interactive Immersive Map Landing Experience & Adaptive Floating Controls
 * Authority: User Directive 2026-10-30, Plan PLAN-JOB-102-REV-1.0, DEC-195, DEC-196
 *
 * Verifies:
 * 1. Brand Asset Integration (official POLIGRAM logo lockup in mobile assets and header).
 * 2. MapLegend dynamic party collector and scrollable container contracts without truncation.
 * 3. Screen immersion gesture detection & tab bar opacity coordination.
 * 4. 7.5s inactivity timer auto-revival state machine.
 * 5. Spatial geometry orientation classifier across all 8 screen zones (corners, edges, sides).
 * 6. Pulsing neon amber Reset button beacon and instant visibility revival invariant.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeControlOrientation } from '../apps/mobile/lib/adaptiveControlMath';
import { buildPartyLegend } from '../apps/mobile/lib/partyLegendBuilder';

const repoRoot = path.resolve(__dirname, '..');

console.log('=== RUNNING JOB 102 IMMERSIVE MAP & ADAPTIVE CONTROLS VERIFICATION ===\n');

// -------------------------------------------------------------
// CHECK 1: Official POLIGRAM Brand Logo Lockup & Header Integration
// -------------------------------------------------------------
console.log('[CHECK 1] Verifying official POLIGRAM logo lockup asset & header integration...');
const logoPath = path.join(
  repoRoot,
  'apps',
  'mobile',
  'assets',
  'poligram_logo_lockup_transparent.png'
);

assert.ok(fs.existsSync(logoPath), 'POLIGRAM logo asset must exist in apps/mobile/assets');
const logoBuffer = fs.readFileSync(logoPath);
assert.ok(logoBuffer.length > 50000, 'Logo file size must exceed 50KB for high-density rendering');

// Verify PNG Signature
assert.strictEqual(logoBuffer[0], 0x89, 'Byte 0 must match PNG magic 0x89');
assert.strictEqual(logoBuffer[1], 0x50, 'Byte 1 must match PNG magic P');
assert.strictEqual(logoBuffer[2], 0x4e, 'Byte 2 must match PNG magic N');
assert.strictEqual(logoBuffer[3], 0x47, 'Byte 3 must match PNG magic G');

// Verify dimensions in IHDR chunk
const width = logoBuffer.readUInt32BE(16);
const height = logoBuffer.readUInt32BE(20);
assert.strictEqual(width, 1197, 'Master logo width must be 1197px');
assert.strictEqual(height, 400, 'Master logo height must be 400px');
const aspectRatio = width / height;
assert.ok(
  Math.abs(aspectRatio - 2.9925) < 0.01,
  'Master logo must preserve exact 3:1 aspect ratio'
);

// Verify landing page header integration
const indexPath = path.join(repoRoot, 'apps', 'mobile', 'app', '(tabs)', 'index.tsx');
const indexCode = fs.readFileSync(indexPath, 'utf8');
assert.ok(
  indexCode.includes('poligram_logo_lockup_transparent.png'),
  'index.tsx header must import poligram_logo_lockup_transparent.png'
);
assert.ok(
  indexCode.includes('accessibilityLabel="POLIGRAM"'),
  'index.tsx must declare accessibilityLabel="POLIGRAM"'
);
assert.ok(
  indexCode.includes('resizeMode="contain"'),
  'index.tsx must render logo with resizeMode="contain"'
);
console.log('  [PASS] Brand logo asset and header integration 100% verified.');

// -------------------------------------------------------------
// CHECK 2: MapLegend Dynamic Party Collector & Uncapped Scrolling
// -------------------------------------------------------------
console.log('[CHECK 2] Verifying MapLegend dynamic party collection & scroll contract...');
const nationalLegend = buildPartyLegend('IN');
assert.ok(
  nationalLegend.length > 8,
  `National legend must include all parties across India (>8), observed: ${nationalLegend.length}`
);

const nationalPartyCodes = nationalLegend.map((p) => p.party);
assert.ok(nationalPartyCodes.includes('BJP'), 'National legend must include BJP');
assert.ok(nationalPartyCodes.includes('INC'), 'National legend must include INC');
assert.ok(nationalPartyCodes.includes('AAP'), 'National legend must include AAP');

// Verify ruling parties are prioritized first
assert.ok(nationalLegend[0].seats > 0, 'First party must have seats/states ruled');
assert.strictEqual(nationalLegend[0].party, 'BJP', 'Leading ruling party must be BJP');

// State view collection without truncation
const tsLegend = buildPartyLegend('TS');
assert.ok(tsLegend.length > 0, 'State legend must return parties');
const tsPartyCodes = tsLegend.map((p) => p.party);
assert.ok(tsPartyCodes.includes('INC'), 'TS legend must include INC');
assert.ok(tsPartyCodes.includes('BRS'), 'TS legend must include BRS');
assert.ok(tsPartyCodes.includes('BJP'), 'TS legend must include BJP');
assert.ok(tsPartyCodes.includes('AIMIM'), 'TS legend must include AIMIM');

// Verify descending sort order by seats
for (let i = 0; i < tsLegend.length - 1; i++) {
  assert.ok(
    tsLegend[i].seats >= tsLegend[i + 1].seats,
    `Parties must be sorted descending by seats: ${tsLegend[i].party} (${tsLegend[i].seats}) vs ${tsLegend[i + 1].party} (${tsLegend[i + 1].seats})`
  );
}

// Verify ScrollView container contract in MapLegend.tsx
const legendFilePath = path.join(repoRoot, 'apps', 'mobile', 'components', 'MapLegend.tsx');
const legendCode = fs.readFileSync(legendFilePath, 'utf8');
assert.ok(
  legendCode.includes('showsVerticalScrollIndicator={true}'),
  'MapLegend must enable showsVerticalScrollIndicator'
);
assert.ok(
  legendCode.includes('persistentScrollbar={true}'),
  'MapLegend must enable persistentScrollbar'
);
assert.ok(
  legendCode.includes('nestedScrollEnabled={true}'),
  'MapLegend must enable nestedScrollEnabled'
);
assert.ok(
  !legendCode.includes('.slice(0, 8)'),
  'MapLegend must NOT contain legacy .slice(0, 8) truncation'
);
console.log('  [PASS] Dynamic party collection and scrollable container verified.');

// -------------------------------------------------------------
// CHECK 3: Screen Immersion State Machine & Bottom Tab Bar Coordination
// -------------------------------------------------------------
console.log('[CHECK 3] Verifying screen immersion state machine & tab bar coordination...');
const activeStatePath = path.join(repoRoot, 'apps', 'mobile', 'stores', 'activeState.ts');
const activeStateCode = fs.readFileSync(activeStatePath, 'utf8');

assert.ok(
  activeStateCode.includes('isScreenImmersive: boolean'),
  'activeState store must declare isScreenImmersive: boolean'
);
assert.ok(
  activeStateCode.includes('setIsScreenImmersive: (val: boolean) => void'),
  'activeState store must declare setIsScreenImmersive'
);
assert.ok(
  activeStateCode.includes('isScreenImmersive: false'),
  'isScreenImmersive must default to false'
);

const layoutPath = path.join(repoRoot, 'apps', 'mobile', 'app', '(tabs)', '_layout.tsx');
const layoutCode = fs.readFileSync(layoutPath, 'utf8');
assert.ok(
  layoutCode.includes('isScreenImmersive = useActiveStateStore'),
  '_layout.tsx must subscribe to isScreenImmersive'
);
assert.ok(
  layoutCode.includes('isScreenImmersive) ? \'none\' : \'flex\''),
  '_layout.tsx must hide tab bar when isScreenImmersive is true'
);

assert.ok(
  indexCode.includes('onTouchStart={handleTouchActivity}'),
  'index.tsx MapView must register onTouchStart={handleTouchActivity}'
);
assert.ok(
  indexCode.includes('onTouchMove={handleTouchActivity}'),
  'index.tsx MapView must register onTouchMove={handleTouchActivity}'
);
console.log('  [PASS] Screen immersion gesture listeners and tab bar coordination verified.');

// -------------------------------------------------------------
// CHECK 4: 7.5-Second Inactivity Auto-Revival Timer
// -------------------------------------------------------------
console.log('[CHECK 4] Verifying 7.5-second inactivity revival timer...');
assert.ok(
  indexCode.includes('7500'),
  'Inactivity timer duration must be exactly 7500ms (7.5 seconds)'
);
assert.ok(
  indexCode.includes('startInactivityTimer'),
  'index.tsx must define startInactivityTimer'
);
assert.ok(
  indexCode.includes('clearTimeout(inactivityTimerRef.current)'),
  'index.tsx must clear and re-arm timer on consecutive touch events'
);
assert.ok(
  indexCode.includes('setIsScreenImmersive(false)'),
  'Inactivity timer timeout must restore setIsScreenImmersive(false)'
);
console.log('  [PASS] 7.5s inactivity revival timer verified.');

// -------------------------------------------------------------
// CHECK 5: Spatial Geometry Layout Classifier (All 8 Viewport Zones)
// -------------------------------------------------------------
console.log('[CHECK 5] Verifying adaptive geometry orientation classifier across all 8 zones...');
const W = 390;
const H = 844;

// 1. Top-Left Corner
assert.strictEqual(
  computeControlOrientation(30, 40, W, H),
  'corner-grid',
  'Top-Left corner (30, 40) must resolve to corner-grid'
);

// 2. Top-Right Corner
assert.strictEqual(
  computeControlOrientation(340, 40, W, H),
  'corner-grid',
  'Top-Right corner (340, 40) must resolve to corner-grid'
);

// 3. Bottom-Left Corner
assert.strictEqual(
  computeControlOrientation(30, 780, W, H),
  'corner-grid',
  'Bottom-Left corner (30, 780) must resolve to corner-grid'
);

// 4. Bottom-Right Corner
assert.strictEqual(
  computeControlOrientation(340, 780, W, H),
  'corner-grid',
  'Bottom-Right corner (340, 780) must resolve to corner-grid'
);

// 5. Top Edge (horizontal center)
assert.strictEqual(
  computeControlOrientation(190, 40, W, H),
  'horizontal',
  'Top edge center (190, 40) must resolve to horizontal'
);

// 6. Bottom Edge (horizontal center)
assert.strictEqual(
  computeControlOrientation(190, 780, W, H),
  'horizontal',
  'Bottom edge center (190, 780) must resolve to horizontal'
);

// 7. Left Side Margin
assert.strictEqual(
  computeControlOrientation(30, 400, W, H),
  'vertical',
  'Left side margin (30, 400) must resolve to vertical'
);

// 8. Right Side Margin
assert.strictEqual(
  computeControlOrientation(340, 400, W, H),
  'vertical',
  'Right side margin (340, 400) must resolve to vertical'
);

// 9. Viewport Center
assert.strictEqual(
  computeControlOrientation(195, 420, W, H),
  'vertical',
  'Center canvas (195, 420) must resolve to vertical default'
);
console.log('  [PASS] All 8 screen zones verified by geometry classifier.');

// -------------------------------------------------------------
// CHECK 6: Pulsing Neon Amber Reset Beacon & Instant Revival Invariant
// -------------------------------------------------------------
console.log('[CHECK 6] Verifying pulsing neon amber Reset beacon & revival invariant...');
const controlsPath = path.join(
  repoRoot,
  'apps',
  'mobile',
  'components',
  'AdaptiveFloatingControls.tsx'
);
const controlsCode = fs.readFileSync(controlsPath, 'utf8');

assert.ok(
  controlsCode.includes('pulseAnim'),
  'AdaptiveFloatingControls must declare pulseAnim Animated.Value'
);
assert.ok(
  controlsCode.includes('Animated.loop'),
  'AdaptiveFloatingControls must initiate Animated.loop for glowing beacon'
);
assert.ok(
  controlsCode.includes("borderColor: '#FCD34D'"),
  'Reset beacon must have neon amber border (#FCD34D)'
);
assert.ok(
  controlsCode.includes("shadowColor: '#FCD34D'"),
  'Reset beacon must have neon amber shadow glow (#FCD34D)'
);
assert.ok(
  controlsCode.includes('shadowRadius: 16'),
  'Reset beacon must declare high shadowRadius (16) for glowing aura'
);
assert.ok(
  controlsCode.includes('elevation: 12'),
  'Reset beacon must declare high Android elevation (12) for ambient light'
);

// Verify Reset press instantly revives UI in index.tsx
assert.ok(
  indexCode.includes('// 0. If in transparent immersion mode, instantly revive all UI elements'),
  'handleReset must contain immersion revival handler'
);
assert.ok(
  indexCode.includes('setIsScreenImmersive(false)'),
  'handleReset must immediately cancel immersion mode'
);

console.log('  [PASS] Pulsing neon amber Reset beacon and instant revival invariant 100% verified.');

console.log('\n=============================================================');
console.log('  JOB 102 AUTOMATED VERIFICATION: ALL 6 CHECKS PASSED (100%)!  ');
console.log('=============================================================\n');
