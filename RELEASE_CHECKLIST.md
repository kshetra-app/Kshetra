# Kshetra — Release Checklist

## Pre-Release

### Code Quality
- [ ] All tests pass (`npm test` — 265+ tests)
- [ ] No TypeScript errors (`tsc --noEmit` in apps/api)
- [ ] Prettier check passes (`npx prettier --check`)
- [ ] No console.log/warn in production code (only __DEV__ guards)
- [ ] All TODO items addressed or ticketed

### Data Integrity
- [ ] 119/119 TS constituencies verified
- [ ] 175/175 AP constituencies verified
- [ ] 224/224 KA constituencies verified
- [ ] 288/288 MH constituencies verified
- [ ] GeoJSON files load correctly for all 22 states
- [ ] Historical results cross-validated with ECI data

### Security
- [ ] No API keys in source code (only .env)
- [ ] Supabase RLS policies active on all tables
- [ ] expo-secure-store used for auth tokens
- [ ] API webhook endpoints require authentication

### Performance
- [ ] Cold start < 3 seconds on mid-range Android
- [ ] Map renders smoothly at 60fps
- [ ] GeoJSON lazy-loading works per state
- [ ] MMKV cache operational (verified in dev)
- [ ] Image assets optimized (<100KB each)
- [ ] Bundle size audit (`npx expo export --dump-sourcemap`)

## Build

### EAS Build
- [ ] `eas.json` profiles configured (development/preview/production)
- [ ] Mapbox download token set as EAS secret
- [ ] Sentry DSN set as EAS secret (when ready)
- [ ] `expo-dev-client` present for dev builds
- [ ] `eas build --profile production --platform android`
- [ ] `eas build --profile production --platform ios` (when ready)

### App Configuration
- [ ] `app.json` version/buildNumber incremented
- [ ] Bundle identifier correct: `com.kshetra.app`
- [ ] Splash screen and icon assets present
- [ ] Notification channels configured (Android)

## Store Submission

### Google Play
- [ ] APK/AAB uploaded to Play Console
- [ ] Store listing filled (see STORE_LISTING.md)
- [ ] 8 screenshots uploaded (phone + tablet if applicable)
- [ ] Feature graphic (1024x500) uploaded
- [ ] Privacy policy URL live
- [ ] Content rating questionnaire completed
- [ ] Target audience declared (Everyone)
- [ ] Data safety form completed

### Apple App Store (Phase 2)
- [ ] IPA uploaded via Transporter/Xcode
- [ ] App Store Connect listing filled
- [ ] Screenshots for all required device sizes
- [ ] Review notes explaining political content

## Post-Release

- [ ] Monitor Sentry for crash reports (first 24h)
- [ ] Monitor Play Console vitals (ANR rate, crash rate)
- [ ] Verify push notifications working end-to-end
- [ ] Verify deep links resolve correctly
- [ ] Announce on social channels
- [ ] Tag release in git: `git tag v1.0.0`

## Monitoring Dashboard

| Metric | Target | Tool |
|---|---|---|
| Crash-free rate | >99.5% | Sentry |
| Cold start time | <3s | Performance monitor |
| API latency (p95) | <500ms | Sentry transactions |
| Bundle size | <25MB (JS) | EAS build logs |
| Test coverage | 265+ tests | Jest CI |
