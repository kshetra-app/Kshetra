# Phase 5: Release Hygiene — Implementation Guide

**Status**: Planning and documentation phase.

## Overview

Final optimization pass before production release:
1. **AAB (Android App Bundle)** — Smaller downloads for Play Store
2. **R8/ProGuard code shrinking** — Remove unused code
3. **Icon subset** — Drop unused vector icons
4. **Dev dependencies** — Remove dev-only packages

**Expected impact**: Additional 5-10% bundle reduction (~3-7 MB)

## 1. Android App Bundle (AAB)

### What is AAB?
- Google Play's recommended publishing format
- Dynamically delivers only code/resources for each device
- Reduces download size by 15-20% vs APK

### Implementation

#### Step 1: Update build.gradle
```gradle
// android/app/build.gradle
android {
  bundle {
    language.enableSplit = true
    density.enableSplit = true
    abi.enableSplit = true
  }
}
```

#### Step 2: Build AAB
```bash
cd android
./gradlew bundleRelease
```

**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

#### Step 3: Upload to Play Store
- Use Google Play Console
- AAB is automatically split per device
- Users get ~15-20% smaller downloads

### Size Comparison
| Format | Size |
|--------|------|
| APK (universal) | ~72 MB |
| AAB (per-device) | ~60 MB avg |
| Savings | ~12 MB (17%) |

## 2. R8/ProGuard Code Shrinking

### What is R8?
- Google's code shrinking tool for Android
- Removes unused code and resources
- Obfuscates remaining code (optional)

### Implementation

#### Step 1: Enable R8 in build.gradle
```gradle
// android/app/build.gradle
android {
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

#### Step 2: Create proguard-rules.pro
```proguard
# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Expo modules
-keep class expo.** { *; }

# Keep app classes
-keep class com.kshetra.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
```

#### Step 3: Build with R8
```bash
cd android
./gradlew bundleRelease
```

**Output**: Shrunk AAB with unused code removed

### Size Impact
| Stage | Size |
|-------|------|
| Before R8 | ~72 MB |
| After R8 | ~65 MB |
| Savings | ~7 MB (10%) |

## 3. Icon Subset

### Current Icon Usage
- `@expo/vector-icons` includes Ionicons, MaterialIcons, etc.
- Total: ~2-3 MB for all icon sets
- We use: ~200 icons from Ionicons only

### Implementation

#### Step 1: Identify used icons
```bash
grep -r "Ionicons name=" apps/mobile --include="*.tsx" --include="*.ts" | \
  sed 's/.*name="\([^"]*\).*/\1/' | sort -u > used-icons.txt
```

#### Step 2: Create custom icon subset
```typescript
// apps/mobile/lib/icons.ts
import { createIconSet } from '@expo/vector-icons';

// Only include Ionicons (drop MaterialIcons, etc.)
export const Ionicons = require('@expo/vector-icons/Ionicons').default;
```

#### Step 3: Remove unused icon sets from package.json
```bash
# Keep only Ionicons, remove MaterialIcons, FontAwesome, etc.
npm uninstall @expo/vector-icons
npm install @expo/vector-icons@15.0.2 --save
```

**Note**: This requires custom build configuration. For now, keep full icon set (low priority).

### Size Impact
| Scenario | Size |
|----------|------|
| All icons | ~2-3 MB |
| Ionicons only | ~0.8 MB |
| Savings | ~1.5-2 MB |

## 4. Drop Dev Dependencies

### Current Dev Dependencies
```json
{
  "expo-dev-client": "~6.0.21",
  "xlsx": "^0.18.5"
}
```

### Analysis

#### expo-dev-client
- Used for local development only
- Can be removed from production build
- **Action**: Keep (useful for debugging)

#### xlsx
- Used for spreadsheet parsing
- Not used in production code
- **Action**: Remove from dependencies

### Implementation

```bash
# Remove xlsx from production dependencies
npm uninstall xlsx

# Keep only in devDependencies if needed for build scripts
npm install --save-dev xlsx
```

**Size Impact**: ~0.5 MB saved

## 5. Build Script Updates

### Update package.json scripts
```json
{
  "scripts": {
    "build:aab": "cd android && ./gradlew bundleRelease",
    "build:apk": "cd android && ./gradlew assembleRelease",
    "build:shrink": "npm run build:aab",
    "release": "npm run typecheck && npm run build:aab"
  }
}
```

### Create release checklist
```bash
#!/bin/bash
# scripts/release.sh

set -e

echo "🔍 Type checking..."
npm --prefix apps/mobile run typecheck

echo "📦 Building AAB with R8..."
npm --prefix apps/mobile run build:aab

echo "📊 Checking bundle size..."
ls -lh android/app/build/outputs/bundle/release/app-release.aab

echo "✅ Release ready!"
```

## 6. Verification Steps

### Before Release
- [ ] Run `npm run typecheck`
- [ ] Build AAB: `npm run build:aab`
- [ ] Verify size: `ls -lh android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Test on device: `npm run android`
- [ ] Check for crashes in logcat
- [ ] Verify all features work

### Size Verification
```bash
# Compare sizes
du -sh apps/mobile/node_modules
du -sh android/app/build/outputs/bundle/release/app-release.aab

# Expected: ~60-65 MB AAB
```

### Performance Verification
- [ ] Cold start time < 3 seconds
- [ ] State switching instant (with prefetch)
- [ ] Map rendering smooth
- [ ] No memory leaks

## 7. Implementation Order

1. **AAB** (highest impact, lowest effort)
   - Update build.gradle
   - Build and test
   - Verify size reduction

2. **R8/ProGuard** (medium impact, medium effort)
   - Create proguard-rules.pro
   - Enable minifyEnabled
   - Test thoroughly

3. **Icon subset** (low impact, high effort)
   - Identify used icons
   - Create custom icon set
   - Test all screens

4. **Drop dev dependencies** (low impact, low effort)
   - Remove xlsx from dependencies
   - Verify build still works

## 8. Expected Final Sizes

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| JS bundle | 67.5 MB | 60 MB | 7.5 MB |
| AAB | 72 MB | 60 MB | 12 MB |
| With R8 | 72 MB | 55 MB | 17 MB |
| With icons | 72 MB | 53 MB | 19 MB |

**Total reduction from baseline**: ~83 MB (61% smaller)

## 9. Rollout Plan

### Phase 5a: AAB + R8
- [ ] Update build.gradle
- [ ] Create proguard-rules.pro
- [ ] Build and test AAB
- [ ] Upload to Play Store internal testing

### Phase 5b: Icon subset
- [ ] Analyze icon usage
- [ ] Create custom icon set
- [ ] Test all screens
- [ ] Verify no missing icons

### Phase 5c: Final verification
- [ ] Performance testing
- [ ] Crash testing
- [ ] User acceptance testing
- [ ] Release to production

## 10. Monitoring

### Post-Release Metrics
- Download size (via Play Store analytics)
- Install success rate
- Crash rate
- Performance metrics (cold start, memory)

### Rollback Plan
If issues arise:
1. Disable R8 (keep AAB)
2. Revert to previous build
3. Investigate and fix
4. Re-release

## Summary

Phase 5 completes the performance optimization journey:

| Phase | Focus | Impact |
|-------|-------|--------|
| 1 | Baseline | Measured 136.4 MB |
| 3 | GeoJSON off-device | -62 MB |
| 2 | Seed data → SQLite | -7.5 MB |
| 4 | UX polish | 30-50% faster |
| **5** | **Release hygiene** | **-10-15 MB** |
| **Total** | **All optimizations** | **~83 MB (61% reduction)** |

**Final app size**: ~53-60 MB (vs 136.4 MB baseline)
**Cold start**: ~2-3 seconds (vs 7-12 seconds baseline)
**Perceived performance**: 3-4x faster
