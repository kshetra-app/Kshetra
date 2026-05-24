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

**Cause B — JS bundle missing from APK**

The APK was built without any JS bundle inside.

**Verify:**
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk")
$entry = $zip.Entries | Where-Object { $_.Name -eq "index.android.bundle" }
if ($entry) { "Found: $($entry.FullName), size: $($entry.Length) bytes" } else { "BUNDLE NOT FOUND!" }
$zip.Dispose()
```

**Fix:** Re-run the full build recipe (see [Section 10](#10-apk-build--step-by-step-recipe)).

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
| App crashes instantly on open | [1A](#1-apk-crashes-on-launch) | Compile bundle to Hermes bytecode |
| `createBundleReleaseJsAndAssets` failed | [2](#gradle-build-failures) | Add `debuggableVariants = ["release", "debug"]` |
| `Filename longer than 260 characters` | [2](#gradle-build-failures) | Build from `C:\K` junction |
| `configure_fingerprint.bin` not valid | [2](#gradle-build-failures) | Delete `.cxx` directory |
| `different roots: Z:\ and C:\` | [2](#gradle-build-failures) | Remove `subst Z:`, use junction |
| `ConfigError: expected package.json` | [2](#gradle-build-failures) | Skip Gradle bundler, pre-bundle manually |
| `Unable to resolve module` | [3](#metro-bundler-issues) | `npm install --force` + `--reset-cache` |
| Metro can't find expo-router | [3](#metro-bundler-issues) | Check `metro.config.js` nodeModulesPaths |
| Native module not found at runtime | [4](#native-module-errors) | `npx expo prebuild --clean` |
| Map blank / not rendering | [7](#map--geojson-issues) | Need dev build, not Expo Go |
| Store data corrupted | [8](#state-management--storage) | Clear app data, add store migration |
| Peer dependency errors | [9](#dev-server--hot-reload) | `npm install --force` |

---

*Last updated: 2026-05-24*
