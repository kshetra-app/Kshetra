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

**Cause E — Zustand v5 Unstable Selector in Root / Tab Layout (Infinite Re-render Loop / Maximum update depth exceeded)**

**Symptom:** The app opens, and immediately shows the ErrorBoundary screen saying *"Something went wrong - Kshetra encountered an error, please restart the app"*, or logs the fatal error:
```text
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
```

**Root Cause:**
In Zustand v5, selecting an inline object literal `{ ... }` or array inside a selector function without memoization creates a brand-new object reference on every evaluation. When consumed in a top-level component (like `(tabs)/_layout.tsx` via `useFeatureFlags()`), Zustand detects `prevObject !== newObject` and triggers an immediate re-render on the first frame. This creates an infinite re-render loop that exceeds React's nested update limit before the first screen finishes mounting.

```ts
// ❌ CRASHES on startup — returns a new object reference on every selector run:
export function useFeatureFlags(): AppFeatureFlags {
  return useFeatureFlagsStore((state) => ({
    enableMap: state.enableMap,
    enableExploreSearch: state.enableExploreSearch,
    // ...
  }));
}
```

**Working Solution:**
Wrap multi-property selectors in `useShallow` from `zustand/react/shallow` so Zustand performs shallow equality checks on the returned properties rather than checking reference equality:

```ts
import { useShallow } from 'zustand/react/shallow';

// ✅ SAFE — returns stable reference when property values have not changed:
export function useFeatureFlags(): AppFeatureFlags {
  return useFeatureFlagsStore(
    useShallow((state) => ({
      enableMap: state.enableMap,
      enableExploreSearch: state.enableExploreSearch,
      // ...
    })),
  );
}
```
Also ensure theme / appearance hooks returning color objects are memoized with `useMemo`:
```ts
// ✅ lib/useTheme.ts
export function useTheme() {
  const themePreference = usePreferencesStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark = themePreference === 'system' ? systemScheme !== 'light' : themePreference === 'dark';

  return useMemo(
    () => ({
      colors: isDark ? DARK_THEME : LIGHT_THEME,
      mode: themePreference,
      isDark,
    }),
    [isDark, themePreference],
  );
}
```

---

**Cause F — NetInfo CommonJS Module Resolution Crash on First Frame**

**Symptom:** App crashes on the first tick of JavaScript execution with `TypeError: Cannot read property 'addEventListener' of undefined` inside `lib/networkStatus.ts`.

**Root Cause:**
In Metro production bundling for Android release builds, CommonJS packages like `@react-native-community/netinfo` export their API directly on the module object rather than under a `.default` property. Calling `NetInfo.default.addEventListener()` fails because `NetInfo.default` is `undefined`.

**Working Solution:**
Safely unwrap the module with a fallback and guard listener registration:
```ts
// ✅ lib/networkStatus.ts
const netinfoModule = NetInfo.default || NetInfo;
if (typeof netinfoModule?.addEventListener === 'function') {
  unsubscribe = netinfoModule.addEventListener((state: any) => {
    // ...
  });
}
```

---

**Cause G — Unhandled Rejections in SplashScreen & Root Auth Bootstrap**

**Symptom:** App crashes during splash screen transition or cold boot if the native Android Activity state changes while JS is executing.

**Root Cause:**
`SplashScreen.preventAutoHideAsync()`, `SplashScreen.hideAsync()`, and `initializeAuth()` were called without catching rejection promises. If the Activity is recreated or transitions state before the JS thread initializes, these threw unhandled promise rejections.

**Working Solution:**
Defensively catch all splash screen and lifecycle promises in `app/_layout.tsx`:
```ts
// ✅ app/_layout.tsx
useEffect(() => {
  try {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch {}
  try {
    initializeAuth().catch(() => {});
  } catch {}
  try {
    SplashScreen.hideAsync().catch(() => {});
  } catch {}
}, []);
```

---

**Cause H — MMKV & SecureStore Adapter Exceptions During Rehydration**

**Symptom:** Crash on launch when accessing Android KeyStore / MMKV native bindings before JNI initialization is complete.

**Working Solution:**
Wrap MMKV synchronous operations and Expo SecureStore asynchronous calls in defensive try/catch blocks with automatic in-memory fallbacks (`lib/storage.ts` & `lib/supabase.ts`).

---

**Cause I — In-App Crash Diagnostics & Logs Window in ErrorBoundary**

**Feature & Solution:**
When a React runtime error occurs in a release APK, `components/ErrorBoundary.tsx` renders an interactive terminal-style error console directly on-device instead of masking the error behind a generic message.
- **Header**: Shows exact error name and message in bold red monospace text.
- **Terminal Console**: Scrollable view of the complete JS Stack Trace and React Component Hierarchy.
- **One-Tap "Copy / Share Log"**: Invokes the Android Share dialog or clipboard so error logs can be shared and diagnosed immediately without requiring a USB cable or ADB logcat.

---

### Symptom: App crashes after a few seconds (not instant)

Likely a JS runtime error. Check the in-app Diagnostics Window on the ErrorBoundary screen, or connect via USB and check:
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

### `expo export:embed` hangs forever at 99.9% ("Writing bundle output" never finishes)

**Symptom:** The Metro bundle reaches `99.9% (2477/2477)` and then sits there for
10+ minutes with **no further output** and no `index.android.bundle` ever written.

**How to confirm it's a deadlock (not just slow serialization):** Sample the `node`
processes twice a few seconds apart. In a real deadlock **every** worker is idle:
```powershell
# All node procs at ~9-15 MB RAM and 0 CPU delta = deadlocked, not working.
$a=@{}; Get-Process node | %{ $a[$_.Id]=$_.CPU }; Start-Sleep 8
Get-Process node | %{ "$($_.Id) dCPU=$([math]::Round($_.CPU-$a[$_.Id],1)) mem=$([int]($_.WS/1MB))MB" }
```
A genuine serialization pass keeps **one** process burning CPU with a large heap
(hundreds of MB). If nothing holds a big heap and CPU deltas are all `0`, it's hung —
the `jest-worker` transformers finished but the main serializer never resolves. This
project's bundle is large (~78 MB raw JS, mostly inlined GeoJSON), which makes the
window for this race wider.

**Fix:** Kill the whole build and re-run **without** `--reset-cache` (the cache is
already warm from the first attempt, so the retry is fast and skips the racey rebuild):
```powershell
# 1. Kill the hung build (all node procs are the export + its jest-workers)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'export:embed|jest-worker' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2. Retry WITHOUT --reset-cache
npx expo export:embed --platform android --dev false `
  --bundle-output android/app/src/main/assets/index.android.bundle `
  --assets-dest android/app/src/main/res/
```
Success looks like: `Writing bundle output to: ...`, `Copying N asset files`,
`Done writing bundle output`. Then continue with the Hermes step in
[Section 10](#10-apk-build--step-by-step-recipe).

> Real occurrence: Sprint 56 (LMX capture/playback). The first `export:embed --reset-cache`
> deadlocked at 99.9%; all 8 node procs sat at 0 CPU / ~13 MB. Killing and re-running
> without `--reset-cache` bundled cleanly in ~45 s.

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

### Change the app icon WITHOUT a full prebuild

`expo prebuild` is the "official" way to regenerate launcher icons from
`app.json` → `icon` / `android.adaptiveIcon`, but it **wipes** the customized
`android/` folder (see warning above). Since our APK recipe reuses the committed
native project, regenerate the mipmaps in place instead. The build step
`expo export:embed --assets-dest res/` only copies **JS-referenced** assets into
`res/drawable-*` / `res/raw` — it does **not** touch `res/mipmap-*`, so launcher
icons must be written directly:

```powershell
Add-Type -AssemblyName System.Drawing
$src = "C:\K\Logo\kshetra_appicon_transparent_512.png"   # your source (square PNG)
$res = "C:\K\apps\mobile\android\app\src\main\res"
$orig = [System.Drawing.Image]::FromFile($src)
function Canvas([int]$s){ $b=New-Object System.Drawing.Bitmap($s,$s,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($b); $g.InterpolationMode='HighQualityBicubic'
  $g.Clear([System.Drawing.Color]::Transparent); return ,@($b,$g) }
# Legacy icons (full-bleed): 48/72/96/144/192
@{ "mipmap-mdpi"=48;"mipmap-hdpi"=72;"mipmap-xhdpi"=96;"mipmap-xxhdpi"=144;"mipmap-xxxhdpi"=192 }.GetEnumerator()|%{
  $p=Canvas $_.Value; $p[1].DrawImage($orig,0,0,$_.Value,$_.Value)
  $p[0].Save("$res\$($_.Key)\ic_launcher.png",'Png'); $p[0].Save("$res\$($_.Key)\ic_launcher_round.png",'Png') }
# Adaptive foreground (logo ~66% within the 108dp safe zone): 108/162/216/324/432
@{ "mipmap-mdpi"=108;"mipmap-hdpi"=162;"mipmap-xhdpi"=216;"mipmap-xxhdpi"=324;"mipmap-xxxhdpi"=432 }.GetEnumerator()|%{
  $p=Canvas $_.Value; $l=[int]($_.Value*0.66); $o=[int](($_.Value-$l)/2)
  $p[1].DrawImage($orig,$o,$o,$l,$l); $p[0].Save("$res\$($_.Key)\ic_launcher_foreground.png",'Png') }
$orig.Dispose()
```

Also update the source assets so a **future** prebuild stays consistent:
```powershell
Copy-Item $src "C:\K\apps\mobile\assets\icon.png" -Force
Copy-Item $src "C:\K\apps\mobile\assets\adaptive-icon.png" -Force
```

Notes:
- The adaptive **background** is a solid color (`@color/iconBackground` in
  `mipmap-anydpi-v26/ic_launcher.xml`), so a *transparent* source shows on that
  color tile — Android adaptive icons can't have a truly transparent background.
- Verify: the xxxhdpi legacy icon should be `192x192` with a transparent corner
  (`(Get-Item ...).LastWriteTime` newer than the last build; corner pixel alpha `0`).
- Release APKs rename resources (AAPT2), so you **cannot** find `ic_launcher.png`
  by name inside the `.apk` — verify on the source PNGs before building instead.

> Real occurrence: Sprint 56 swapped in `kshetra_appicon_transparent_512.png` this
> way (no prebuild), preserving the `build.gradle` bundler patch and manifest edits.

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

### A specific screen/tab crashes instantly on open — Zustand v5 selector returns a new array (infinite loop)

**Symptom:** Every other tab/screen works, but opening one specific screen instantly
closes the app (no error dialog). In a **release APK** this is a hard crash; in a dev
build you'd see the red-box `Warning: The result of getSnapshot should be cached to
avoid an infinite loop` followed by `Maximum update depth exceeded`.

**Cause:** This project uses **Zustand v5** (`"zustand": "^5.0.0"`). Unlike v4, v5 uses
plain React `useSyncExternalStore` with `Object.is` equality and **no built-in selector
memoization**. If a selector *computes and returns a brand-new object/array reference on
every call* — e.g. a store "getter" that does `.filter()` / `.sort()` / `.map()` — React
sees the snapshot "change" on every render and re-renders forever → crash.

```ts
// ❌ CRASHES in Zustand v5 — getLiveTabFeed() returns a NEW array every call
const events = useLiveExchangeStore((s) => s.getLiveTabFeed());

// ❌ Also crashes — any inline .filter()/.map()/.sort() in the selector
const alerts = useMyStore((s) => s.alerts.filter((a) => a.open));
```

**Fix:** Wrap the selector in `useShallow`, which caches the previous result and returns
the **same reference** when the contents are shallow-equal, breaking the loop:

```ts
import { useShallow } from 'zustand/react/shallow';

// ✅ SAFE — useShallow returns the prior reference when contents are unchanged
const events = useLiveExchangeStore(useShallow((s) => s.getLiveTabFeed()));
const alerts = useMyStore(useShallow((s) => s.alerts.filter((a) => a.open)));
```

**What is and isn't affected:**
- ❌ **Affected** (needs `useShallow`): selectors returning a *new* array/object —
  `.filter()`, `.map()`, `.sort()`, `.slice()`, `{ ...spread }`, `Object.values()`.
- ✅ **Safe** (leave as-is): selecting a stable slice (`(s) => s.events`), a primitive
  (`(s) => s.count`), a bound action (`(s) => s.doThing`), or `.find()` (returns an
  existing element reference, which is stable across renders).

**How it slips past checks:** `tsc --noEmit` passes (it's valid TypeScript) and it often
"works" in a fast dev reload, so it only manifests when the screen is actually mounted —
frequently discovered only after installing the release APK. **Always smoke-test every
new screen on-device, not just via `tsc`.**

> Real occurrence: Sprint 55 (LMX). The **Kshetra Live** tab crashed on open because
> `live.tsx`, `distribution.tsx`, `moderation-queue.tsx`, `go-live.tsx` and `live/[id].tsx`
> all read derived arrays via `getLiveTabFeed()` / `getModerationQueue()` /
> `getAlertsForEvent()` / `getActiveAffiliations()`. Wrapping each in `useShallow` fixed it.

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

## 11. Live Broadcasting (WebRTC-WHIP)

The go-live camera publisher (`components/LiveBroadcaster.tsx`) uses
**`react-native-webrtc`**, a native module. It is imported through a **guarded
`require`**, so:

- **Expo Go / a build without the module** → `isBroadcastSupported()` returns
  `false`; go-live skips the broadcaster and navigates straight to the viewer page
  (which plays the stream via HLS). The bundle still builds; nothing crashes.
- **A native build that includes it** → real camera capture + WHIP publish to the
  media plane (`buildWhipPublishUrl(streamId)` → MediaMTX `:8889`).

### Enabling real publishing (native build)

```powershell
cd C:\K\apps\mobile
# 1. Install the module + its Expo config plugin at SDK-aligned versions:
npx expo install react-native-webrtc @config-plugins/react-native-webrtc
# 2. The plugin is already in app.json. Regenerate native config:
#    (adds camera/mic + WebRTC build settings). This WIPES android/ — see §6,
#    re-apply the build.gradle bundler patch + icons afterwards.
npx expo prebuild --clean
# 3. Rebuild the APK via the §10 recipe.
```

> Version alignment matters: use `npx expo install` (not `npm install`) so
> `react-native-webrtc` and `@config-plugins/react-native-webrtc` match the Expo
> SDK. Pinned versions in `package.json` are a starting point only.

### "NOT PUBLISHING" badge on the broadcaster

The overlay shows this when `negotiateWhip` failed. Checks:
- **Reachability**: the phone must reach the gateway's WHIP port — set
  `EXPO_PUBLIC_MEDIA_INGEST_HOST` to a LAN/public IP the device can hit (**not**
  `127.0.0.1`), and `EXPO_PUBLIC_MEDIA_MODE=self_hosted`.
- **HTTPS**: WebRTC needs a secure context in production; use TLS on the WHIP
  endpoint (or test over LAN HTTP with a dev build).
- **ICE**: set the server's public candidate (OME `IceCandidate`, MediaMTX
  `webrtcAdditionalHosts`) or peers can't connect through NAT.
- **CORS**: the WHIP `POST` needs permissive CORS (handled by the edge Nginx).

### `getUserMedia` throws / black preview

Camera + mic permissions must be granted. They're declared in `app.json`
(`android.permission.CAMERA` / `RECORD_AUDIO`) and the manifest; on Android 13+
the OS prompts at first `getUserMedia`. A black preview with `status='live'`
usually means the track published but `RTCView` didn't attach — confirm
`react-native-webrtc` is the native build (not a JS-only shim).

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
| `Maximum update depth exceeded` / Infinite loop on open | [1E](#cause-e--zustand-v5-unstable-selector-in-root--tab-layout-infinite-re-render-loop--maximum-update-depth-exceeded) | Wrap multi-property Zustand selectors in `useShallow` & memoize `useTheme` |
| `Cannot read property 'addEventListener' of undefined` (NetInfo) | [1F](#cause-f--netinfo-commonjs-module-resolution-crash-on-first-frame) | Unwrap `NetInfo.default || NetInfo` with fallback |
| Unhandled splash screen / auth bootstrap promise crash | [1G](#cause-g--unhandled-rejections-in-splashscreen--root-auth-bootstrap) | Add `.catch(() => {})` & `try/catch` around root promises |
| KeyStore / MMKV crash on cold boot | [1H](#cause-h--mmkv--securestore-adapter-exceptions-during-rehydration) | Wrap synchronous MMKV/SecureStore calls in in-memory fallback |
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
| One screen crashes instantly on open | [8](#a-specific-screentab-crashes-instantly-on-open--zustand-v5-selector-returns-a-new-array-infinite-loop) | Wrap new-array Zustand v5 selectors in `useShallow` |
| Compare on Map crash / UI lock | [8](#compare-on-map-ui-lock-or-crash-bottomsheet-closing) | Add `mapCompareActiveRef` check in `onClose` |
| Route ID NaN / Constituency Not Found | [8](#parameter-parsing--route-id-nan-crash-composite-ids) | Parse composite IDs (e.g. `TS-AC-X`) |
| Peer dependency errors | [9](#npm-install-fails-with-peer-dependency-errors) | `npm install --force` |

---

*Last updated: 2026-08-27*
