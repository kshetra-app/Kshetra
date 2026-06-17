# ADR-005: Internationalization with i18next

**Status**: Accepted (retroactively documented)
**Date**: 2026-05-xx

## Context

KSHETRA targets a multilingual Indian audience. Per the Gold Standard
(externalize strings from day one), all user-visible text must be translatable,
and the app should default to a language appropriate for the selected state.

## Decision

Use **i18next** + **react-i18next** with **expo-localization** for device-locale
detection and **AsyncStorage** for persistence.

- Locale resources live in `apps/mobile/i18n/locales/` (currently 14 languages,
  e.g. en, hi, te, kn, mr, ta, ml, bn, gu, or, pa, as, ne).
- `STATE_LANGUAGE_MAP` maps a selected state to its primary language
  (e.g. TS/AP → te, KA → kn, MH → hi).
- Missing keys fall back to English; `useSuspense: false` avoids render gaps.

## Rationale

- i18next is the de-facto standard with mature React Native support.
- Retrofitting i18n later costs 5–10× more than building it in.
- State-aware defaults improve first-run UX for regional users.

## Consequences

- Each new user-facing feature must add keys to every locale (enforced via the
  Definition of Done).
- Locale files are large; they are exempt from the per-file size budget.
- RTL is not yet required (no current RTL target language) but the framework
  supports it when needed.
