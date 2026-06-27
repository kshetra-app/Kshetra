# KSHETRA — Troubleshooting & Ready Reckoner

> Quick-reference guide for diagnosing and fixing common issues. Organized by symptom.

---

## Table of Contents

1. [APK Crashes on Launch](#1-apk-crashes-on-launch)
2. [Gradle Build Failures](#2-gradle-build-failures)
3. [Metro Bundler Issues](#3-metro-bundler-issues)
4. [Native Module Errors](#4-native-module-errors)
5. [Path & Environment Issues (Windows)](#5-path--environment-issues-windows)
6. [Expo Prebuild Issues](#6-expo-prebuild-issues)
7. [Map & GeoJSON Issues](#7-map--geojson-issues)
8. [State Management & Storage](#8-state-management--storage)
9. [Dev Server & Hot Reload](#9-dev-server--hot-reload)
10. [APK Build — Step-by-Step Recipe](#10-apk-build--step-by-step-recipe)

---

## 1. APK Crashes on Launch

### Symptom: App instantly closes after splash screen

**Cause A — Raw JS bundle instead of Hermes bytecode**

The most common cause. If Gradle's bundler was skipped (via `debuggableVariants`), the pre-placed bundle at `android/app/src/main/assets/index.android.bundle` is raw JavaScript. Hermes in production mode expects **bytecode (.hbc)**.

**Fix:**
```powershell
# 1. Compile to Hermes bytecode
& "C:\K\node_modules\react-native\sdks\hermesc\win64-bin\hermesc.exe" `
  -emit-binary `
  -out "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle"

# 2. Replace the raw bundle with bytecode
Move-Item "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.raw" -Force
Move-Item "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle" -Force

# 3. Rebuild APK (fast — only repackages)
cmd /c "cd /d C:\K\apps\mobile\android && gradlew.bat assembleRelease --no-daemon"
```

**Verify bundle is Hermes bytecode:**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle") | Select-Object -First 4
[System.BitConverter]::ToString($bytes)
# Expected: C6-1F-BC-03 (Hermes magic bytes)
```

---

**Cause B — JS bundle missing from APK (Blank / Black Screen)**

The APK was built without any JS bundle inside. When this happens, the app successfully initializes the native container and then gets stuck displaying a blank or black screen on startup (since there is no JavaScript to execute) without crashing or showing an error message.

This often happens if the manual Metro bundling command failed, or if it was run with the wrong arguments (e.g. specifying an explicit entry file path on Windows that is incompatible with Expo's routing architecture).

*Expo Router Entry Warning:*
Do NOT specify `--entry-file index.js` in the `expo export:embed` command. Expo Router resolves its entry point dynamically (via `node_modules/expo-router/entry.js`). Specifying a manual entry file override will cause Metro module resolution errors, leading to an empty assets folder and a black screen.

**Verify:**
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk")
$entry = $zip.Entries | Where-Object { $_.Name -eq "index.android.bundle" }
if ($entry) { "Found: $($entry.FullName), size: $($entry.Length) bytes" } else { "BUNDLE NOT FOUND!" }
$zip.Dispose()
```

**Fix:** Re-run the full build recipe (see [Section 10](#10-apk-build--step-by-step-recipe)), ensuring you do not use `--entry-file`.

---

**Cause C — Eager import of heavy native modules at startup**

If a component imported in `_layout.tsx` pulls in native modules (e.g., `expo-location`, `expo-camera`) that fail at import time, the app crashes before rendering.

**Fix:** Use `React.lazy()` + `Suspense` for heavy components:
```tsx
// BAD — evaluated at startup
import KYCVerificationSheet from '../components/KYCVerificationSheet';

// GOOD — loaded only when needed
const KYCVerificationSheet = lazy(() => import('../components/KYCVerificationSheet'));

// In JSX — render conditionally
{showKYCSheet && (
  <Suspense fallback={null}>
    <KYCVerificationSheet />
  </Suspense>
)}
```

---

**Cause D — Missing native module not caught by try/catch**

Top-level `import * as X from 'some-native-module'` will crash if the module isn't linked. Dynamic `require()` inside try/catch is safe.

**Fix pattern for optional native modules:**
```ts
// SAFE — won't crash if module is missing
let Device: any = null;
try { Device = require('expo-device'); } catch {}

// UNSAFE — crashes if not linked
import * as Device from 'expo-device';
```

---

### Symptom: App crashes after a few seconds (not instant)

Likely a JS runtime error. Connect via USB and check:
```powershell
adb logcat *:E | Select-String -Pattern "FATAL|ReactNative|AndroidRuntime"
```

Common causes:
- **Zustand store rehydration** — corrupted AsyncStorage/MMKV data
- **Undefined property access** — missing null checks on store selectors
- **Circular imports** — module A imports B which imports A

---

## 2. Gradle Build Failures

### `Execution failed for task ':app:createBundleReleaseJsAndAssets'`

**Cause:** Gradle's React Native plugin tries to run Metro bundler but fails. On Windows, this happens because Expo CLI can't find `package.json` from the `android/` working directory.

**Error message:** `ConfigError: The expected package.json path: C:\K\apps\mobile\android\package.json`

**Fix:** Skip Gradle's bundler and pre-bundle manually:
```groovy
// android/app/build.gradle — inside react {} block
debuggableVariants = ["release", "debug"]
```

Then pre-bundle + compile to Hermes yourself (see [Section 10](#10-apk-build--step-by-step-recipe)).

> **Note:** `debuggableVariants` only controls whether the bundle TASK runs. It does NOT affect `BuildConfig.DEBUG` (which is determined by the Android buildType). The release APK still loads from assets, not from a dev server.

---

### `Filename longer than 260 characters` (CMake / ninja error)

**Cause:** Windows has a 260-character path limit. The full project path `C:\Users\Laven\OneDrive\Desktop\Kshetra\...` is too long for CMake-generated file paths.

**Fix:** Use a junction (symlink) to shorten the path:
```powershell
# Create junction (one-time setup)
cmd /c "mklink /J C:\K C:\Users\Laven\OneDrive\Desktop\Kshetra"

# Always build from C:\K
cmd /c "cd /d C:\K\apps\mobile\android && gradlew.bat assembleRelease --no-daemon"
```

> **Important:** Do NOT use `subst Z:` — it creates a virtual drive that confuses Codegen (different root paths).

---

### `configureCMakeRelWithDebInfo — Could not read 'configure_fingerprint.bin'`

**Cause:** Stale CMake cache from a previous build (different path or config).

**Fix:**
```powershell
cmd /c "rd /s /q C:\K\apps\mobile\android\app\.cxx"
# Then rebuild
```

> Use `cmd /c "rd /s /q ..."` instead of PowerShell's `Remove-Item` — PowerShell can't delete paths longer than 260 chars.

---

### `generateCodegenSchemaFromJavaScript FAILED — different roots`

**Cause:** Using `subst` (virtual drive) creates a path mismatch between the drive letter and the real path.

**Fix:**
```powershell
subst Z: /d   # Remove the virtual drive
# Use junction instead (see above)
```

---

### `Process 'command 'cmd'' finished with non-zero exit value 1` (generic)

This is a wrapper error. The real error is above it in the log. Run with `--info` to see details:
```powershell
cmd /c "cd /d C:\K\apps\mobile\android && gradlew.bat assembleRelease --no-daemon --info 2>&1" | Out-File build-log.txt
# Then search the log
Select-String "error|FAILED|ConfigError" build-log.txt
```

---

### `ninja: error: rebuilding 'build.ninja': subcommand failed` (Clean Phase Deadlock)

**Cause:** Running `gradlew clean` deletes codegen folders that CMake/Ninja needs to run C++ clean tasks. This causes a deadlock because C++ clean tasks fail on missing autolinked JNI targets or locked dependency files (`Permission denied` on deleting `.o.d` files).

**Fix:** Avoid running `gradlew clean` when the C++ build directories are out of sync. Instead, delete the `.cxx` folder manually and run the build directly:
```powershell
# 1. Manually clean native build folders via short path
cmd /c "rd /s /q C:\K\apps\mobile\android\app\.cxx"

# 2. Run assembleRelease directly (Gradle will auto-run React Native codegen first)
cmd /c "cd /d C:\K\apps\mobile\android && gradlew.bat assembleRelease --no-daemon"
```

---

## 3. Metro Bundler Issues

### `Unable to resolve module` during bundling

**Cause A — Monorepo package not found:**
```powershell
# Ensure metro.config.js has monorepo paths
# watchFolders = [monorepoRoot]
# resolver.nodeModulesPaths = [mobile/node_modules, root/node_modules]
```

**Cause B — Missing dependency:**
```powershell
cd C:\K
npm install --force   # Use --force, not --legacy-peer-deps
```

**Cause C — Stale cache:**
```powershell
cd C:\K\apps\mobile
npx expo start --clear
# or for export:
npx expo export:embed --reset-cache ...
```

---

### `EXPO_ROUTER_APP_ROOT` warnings

Metro needs to know where the `app/` directory is for file-based routing.

**Fix:** Set in `.env` or before the command:
```powershell
$env:EXPO_ROUTER_APP_ROOT = "C:\K\apps\mobile\app"
```

---

### Bundle succeeds but has 0 modules or wrong entry

Check that `package.json` has the correct entry point:
```json
{
  "main": "expo-router/entry"
}
```

And `app.json` has the router plugin:
```json
{
  "plugins": [["expo-router", { "root": "./app" }]]
}
```

---

## 4. Native Module Errors

### Module not found at runtime but builds fine

**Cause:** The module is imported in JS but wasn't auto-linked during `expo prebuild`.

**Check which modules are linked:**
```powershell
# Look at the expo-autolinking output during build:
Select-String "Using expo modules" "C:\K\apps\mobile\android\app\build\outputs\logs\*"
```

**Fix:**
```powershell
cd C:\K\apps\mobile
npx expo prebuild --clean   # Regenerates android/ with fresh autolinking
```

---

### `expo-device` / `expo-application` not in package.json

These are used in `deviceFingerprint.ts` but imported dynamically with try/catch, so they won't crash. If you need them to actually work:
```powershell
cd C:\K\apps\mobile
npx expo install expo-device expo-application
```

---

### `@react-native-community/netinfo` not installed

Used in `lib/networkStatus.ts` with a safe `try/catch require()`. Won't crash, but network status won't work. To fix:
```powershell
cd C:\K\apps\mobile
npx expo install @react-native-community/netinfo
```

---

## 5. Path & Environment Issues (Windows)

### Junction setup

```powershell
# Create (run as Administrator if needed)
cmd /c "mklink /J C:\K C:\Users\Laven\OneDrive\Desktop\Kshetra"

# Verify
dir C:\K\apps\mobile\package.json

# Remove (if needed)
cmd /c "rd C:\K"   # Removes junction only, NOT the target files
```

> **Rule:** Always build from `C:\K`, edit code from either path. Git works from either.

---

### Long path errors in PowerShell

PowerShell can't handle paths > 260 chars. Use `cmd /c` for delete operations:
```powershell
# Instead of: Remove-Item -Recurse -Force "long\path"
cmd /c "rd /s /q long\path"
```

---

### Java / Gradle not found

Ensure JDK 17+ is installed and `JAVA_HOME` is set:
```powershell
java -version          # Should be 17+
$env:JAVA_HOME         # Should point to JDK install
```

---

## 6. Expo Prebuild Issues

### When to run `expo prebuild --clean`

Run it when:
- Adding a new native module (e.g., `expo-camera`, `expo-location`)
- Changing `app.json` plugins array
- Upgrading Expo SDK version
- Native build is broken and you want a fresh start

```powershell
cd C:\K\apps\mobile
npx expo prebuild --clean
```

> **Warning:** This **deletes** `android/` and `ios/` and regenerates them. Any manual changes to `build.gradle`, `AndroidManifest.xml`, etc. will be lost. Re-apply custom configs after prebuild.

### Configs to re-apply after `expo prebuild --clean`

1. **`android/app/build.gradle`** — add inside `react {}` block:
   ```groovy
   debuggableVariants = ["release", "debug"]
   ```

2. **Pre-place the JS bundle** (see [Section 10](#10-apk-build--step-by-step-recipe))

---

## 7. Map & GeoJSON Issues

### Map not rendering (blank screen)

- **In Expo Go:** Maps require native modules. Use a development build or the `MapFallback` component.
- **In dev build:** Check that `@maplibre/maplibre-react-native` is in `app.json` plugins.
- **Tiles not loading:** Verify the tile URL. We use CARTO dark-matter (free, no API key needed).

### Map tap not selecting constituency

We use `MapView.onPress` + offline `findConstituencyAtPoint()` ray-casting (not `ShapeSource.onPress` which is broken in MapLibre RN).

If taps aren't working, check that:
1. GeoJSON is loaded for the active state
2. `findConstituencyAtPoint()` in `@kshetra/shared/geo` receives correct coordinates
3. The state's GeoJSON file exists in `data/geo/`

---

### MapLibre Layer Expression or Style Crashes (`['and', ...]` / `symbolZElevate` Errors)

- **Expression crashes:** MapLibre v11 uses `['all', ...]` instead of `['and', ...]` for logical AND operations. Using `['and']` will crash the native renderer.
  *Fix:* Use `['all']` in expressions:
  ```typescript
  filter: ['all', ['==', ['get', 'state'], 'TS'], ['has', 'winner']]
  ```
- **Unsupported prop crashes:** Trying to set invalid or unsupported props inside layer styles (like `symbolZElevate: true` on a `SymbolLayer` style object) results in native layout crashes on Android.
  *Fix:* Only use standard styling keys (e.g. `textSize`, `textColor`, `iconImage`, etc.) in style declarations.

---

## 8. State Management & Storage

### Zustand store not persisting

- **MMKV stores** (preferences, favorites, recents): Check that `react-native-mmkv` is linked.
- **AsyncStorage stores** (auth, contributor verification): Check that `@react-native-async-storage/async-storage` is linked.

### Store rehydration crash

If a store schema changed between versions, old persisted data may cause a crash.

**Fix:** Clear app data on device, or add a `version` + `migrate` to the persist config:
```ts
persist(storeCreator, {
  name: 'store-name',
  version: 2,  // Increment when schema changes
  migrate: (state, version) => { /* handle migration */ },
})
```

---

### "Compare on Map" UI Lock or Crash (BottomSheet closing)

**Cause:** Clicking "Compare on Map" closes the BottomSheet, which triggers `onClose` and sets `selected` to `null`. Since the comparison view requires `selected` to remain populated, this clears the state, causing the comparison panel to disappear or crash.

**Fix:** Use a React Ref (`mapCompareActiveRef`) to track whether comparison is active. Check this ref in the BottomSheet `onClose` handler:
```typescript
onClose={() => {
  if (!mapCompareActiveRef.current) {
    setSelected(null);
  }
}}
```

---

### Parameter Parsing / Route ID `NaN` Crash (composite IDs)

**Cause:** Deep links or navigation paths that pass composite string IDs (like `TS-AC-1` or `AP-AC-2`) crash the constituency detail or hierarchy screens when parsed with `parseInt(id, 10)` (which returns `NaN`).

**Fix:** Implement a helper function to extract both the state code and constituency number, and synchronize the active state store (`useActiveStateStore`) dynamically:
```typescript
const { parsedStateCode, parsedAcNo } = useMemo(() => {
  let sCode = stateCodeStore;
  let aNo = parseInt(id, 10);
  if (id && id.includes('-AC-')) {
    const parts = id.split('-AC-');
    sCode = parts[0].toUpperCase();
    aNo = parseInt(parts[1], 10);
  }
  return { parsedStateCode: sCode, parsedAcNo: aNo };
}, [id, stateCodeStore]);
```

---

## 9. Dev Server & Hot Reload

### `npm install` fails with peer dependency errors

```powershell
cd C:\K
npm install --force
```

> Always use `--force`, NOT `--legacy-peer-deps`. The latter can cause silent resolution bugs.

### Metro can't find expo-router

```powershell
# Ensure expo-router is accessible from root node_modules
# The metro.config.js should have:
# config.resolver.nodeModulesPaths = [
#   path.resolve(projectRoot, 'node_modules'),
#   path.resolve(monorepoRoot, 'node_modules'),
# ];
```

### Port already in use

```powershell
# Find process on port 8081 (Metro)
netstat -ano | findstr :8081
taskkill /PID <pid> /F

# Find process on port 3001 (API)
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

---

## 10. APK Build — Step-by-Step Recipe

The **complete, tested, working** build process for Windows:

### Prerequisites
- Junction `C:\K` → project root (see [Section 5](#5-path--environment-issues-windows))
- JDK 17+ installed
- Node.js 20+

### Step 1: Install dependencies
```powershell
cd C:\K
npm install --force
```

### Step 2: Generate native project (if needed)
```powershell
cd C:\K\apps\mobile
npx expo prebuild --clean
```

### Step 3: Patch build.gradle
Add inside the `react {}` block in `C:\K\apps\mobile\android\app\build.gradle`:
```groovy
debuggableVariants = ["release", "debug"]
```
This skips Gradle's broken JS bundler on Windows.

### Step 4: Bundle JavaScript with Metro
```powershell
cd C:\K\apps\mobile
npx expo export:embed `
  --platform android `
  --dev false `
  --bundle-output android/app/src/main/assets/index.android.bundle `
  --assets-dest android/app/src/main/res/ `
  --reset-cache
```
Wait for "Done writing bundle output" (~2000+ modules).

### Step 5: Compile to Hermes bytecode
```powershell
& "C:\K\node_modules\react-native\sdks\hermesc\win64-bin\hermesc.exe" `
  -emit-binary `
  -out "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle"

# Replace raw bundle with bytecode
Move-Item "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.raw" -Force
Move-Item "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc" `
  "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle" -Force
```

### Step 6: Build release APK
```powershell
cmd /c "cd /d C:\K\apps\mobile\android && gradlew.bat assembleRelease --no-daemon"
```
Takes ~25-55 minutes on first build, ~5 minutes on incremental.

### Step 7: Locate & copy APK
```powershell
Copy-Item "C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk" `
  "$env:USERPROFILE\OneDrive\Desktop\kshetra-release.apk" -Force
```

### Step 8: Verify
```powershell
# Check bundle is Hermes bytecode inside APK
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$env:USERPROFILE\OneDrive\Desktop\kshetra-release.apk")
$bundle = $zip.Entries | Where-Object { $_.Name -eq "index.android.bundle" }
"Bundle size: $([math]::Round($bundle.Length / 1MB, 1)) MB"
$zip.Dispose()
```

---

## Quick Diagnostic Checklist

When something goes wrong, check in this order:

| # | Check | Command |
|---|---|---|
| 1 | Junction exists | `dir C:\K\apps\mobile\package.json` |
| 2 | Node modules installed | `Test-Path C:\K\node_modules` |
| 3 | Android dir exists | `Test-Path C:\K\apps\mobile\android` |
| 4 | build.gradle patched | `Select-String "debuggableVariants" C:\K\apps\mobile\android\app\build.gradle` |
| 5 | JS bundle exists | `Test-Path C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle` |
| 6 | Bundle is HBC | Check magic bytes `C6-1F-BC-03` (see Section 1) |
| 7 | APK exists | `Test-Path C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk` |
| 8 | APK has bundle | Inspect ZIP (see Section 1) |
| 9 | No stale CMake cache | `Test-Path C:\K\apps\mobile\android\app\.cxx` — delete if switching paths |
| 10 | ADB connected | `adb devices` — for logcat debugging |

---

## Error → Fix Quick Reference

| Error Message | Section | Quick Fix |
|---|---|---|
| App crashes instantly on open | [1A](#cause-a--raw-js-bundle-instead-of-hermes-bytecode) | Compile bundle to Hermes bytecode |
| App opens with black screen | [1B](#cause-b--js-bundle-missing-from-apk-blank--black-screen) | Run Metro bundle without `--entry-file` override |
| `createBundleReleaseJsAndAssets` failed | [2](#execution-failed-for-task-appcreatebundlereleasejsandassets) | Add `debuggableVariants = ["release", "debug"]` |
| `Filename longer than 260 characters` | [2](#filename-longer-than-260-characters-cmake--ninja-error) | Build from `C:\K` junction |
| `configure_fingerprint.bin` not valid | [2](#configurecamakerelwithdeinfo--could-not-read-configure_fingerprintbin) | Delete `.cxx` directory |
| `different roots: Z:\ and C:\` | [2](#generatecodegenschemafromjavascript-failed--different-roots) | Remove `subst Z:`, use junction |
| `ConfigError: expected package.json` | [2](#execution-failed-for-task-appcreatebundlereleasejsandassets) | Skip Gradle bundler, pre-bundle manually |
| `build.ninja: subcommand failed` (clean) | [2](#ninja-error-rebuilding-buildninja-subcommand-failed-clean-phase-deadlock) | Delete `.cxx` manually, run `assembleRelease` directly |
| `Unable to resolve module` | [3](#unable-to-resolve-module-during-bundling) | `npm install --force` + `--reset-cache` |
| Metro can't find expo-router | [3](#metro-cant-find-expo-router) | Check `metro.config.js` nodeModulesPaths |
| Native module not found at runtime | [4](#module-not-found-at-runtime-but-builds-fine) | `npx expo prebuild --clean` |
| Map blank / not rendering | [7](#map-not-rendering-blank-screen) | Need dev build, not Expo Go |
| MapLibre expression or style crash | [7](#maplibre-layer-expression-or-style-crashes-and--symbolzelevate-errors) | Use `['all']` and valid keys in styles |
| Store data corrupted | [8](#store-rehydration-crash) | Clear app data, add store migration |
| Compare on Map crash / UI lock | [8](#compare-on-map-ui-lock-or-crash-bottomsheet-closing) | Add `mapCompareActiveRef` check in `onClose` |
| Route ID NaN / Constituency Not Found | [8](#parameter-parsing--route-id-nan-crash-composite-ids) | Parse composite IDs (e.g. `TS-AC-X`) |
| Peer dependency errors | [9](#npm-install-fails-with-peer-dependency-errors) | `npm install --force` |

---

*Last updated: 2026-06-27*
