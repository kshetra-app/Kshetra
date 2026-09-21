# DEF-003 AUDIT REPORT — WebRTC CONSUMER BUNDLE DECOUPLING

```
DEFECT:             DEF-003 (react-native-webrtc in Consumer Mobile App)
STATUS:             BOUNDED AUDIT & ISOLATION COMPLETE (SCHEDULED DESTINATION: W052)
DATE:               2026-09-21
TARGET REPOSITORY:  kshetra-app/Kshetra
BRANCH:             master
DESTINATION JOB:    Job W052 (Standalone Creator Studio & Web WHIP Client)
```

---

## 1. Defect Analysis & Current State

### Defect Statement
`react-native-webrtc` (v124.0.5) is declared in `apps/mobile/package.json` line 61, bundling heavy native broadcaster binaries into the primary consumer application.

### Current Codebase Isolation Audit
1. **Static Import Audit**: Confirmed zero top-level static imports of `react-native-webrtc` in the entire TypeScript/JavaScript codebase.
2. **Dynamic Require Boundary**: The native module is loaded strictly via guarded dynamic execution inside `apps/mobile/components/LiveBroadcaster.tsx`:
   ```ts
   let RNWebRTC: any = null;
   try {
     RNWebRTC = require('react-native-webrtc');
   } catch {
     RNWebRTC = null;
   }
   ```
3. **Consumer Viewer Isolation**: Consumer streaming users view live events via HTTP Live Streaming (HLS) handled by standard video players (`HlsPlayer.tsx`, `LivePlayer.tsx`), requiring zero WebRTC native bindings.
4. **Creator Scope**: The broadcaster path is triggered solely when an authorized creator enters `app/live/go-live.tsx`. If native WebRTC is absent, `isBroadcastSupported()` gracefully alerts the user with localized fallback copy without crashing the application.

---

## 2. Binary Impact Assessment

| Platform / Metric | Current Overhead | Post-W052 Decoupled State |
| :--- | :--- | :--- |
| **Android APK (libwebrtc.so)** | ~18–22 MB per ABI architecture | 0 MB (100% eliminated from consumer APK) |
| **iOS IPA (WebRTC.xcframework)**| ~25–30 MB uncompressed | 0 MB (100% eliminated from consumer IPA) |
| **JavaScript Bundle Size** | <15 KB wrapper | 0 KB |
| **Native Build Complexity** | Requires WebRTC CocoaPods/Gradle plugins | Standard Expo EAS bare/prebuild |

---

## 3. Bounded Isolation Verification & W052 Migration Path

1. **Immediate Quarantine (W010 Baseline)**:
   - Preserved dynamic `try { require('react-native-webrtc') }` boundary in `LiveBroadcaster.tsx`.
   - Ensured zero consumer routes reference broadcaster components.
   - Guaranteed fail-safe execution on standard Expo Go / simulator builds.
2. **Master Roadmap Execution (Job W052)**:
   - Extract `LiveBroadcaster.tsx` and WHIP ingest pipeline to a dedicated web portal (`apps/web-creator`) or standalone companion app (`apps/creator-studio`).
   - Remove `react-native-webrtc` and `@config-plugins/react-native-webrtc` from `apps/mobile/package.json`.
   - Achieve ~20 MB consumer binary reduction.
