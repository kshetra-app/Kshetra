# TASK: Full i18n Localization for 31 States

## Project Context

**Project**: Kshetra — an Indian political constituency data app (React Native / Expo)
**Monorepo root**: The folder this file is in
**Mobile app**: `apps/mobile/`
**Seed data**: `data/seed/`

---

## OBJECTIVE

Add full local-language support for all 31 Indian states/UTs in the app. This involves:

1. **Create 8 new locale files** (translations of all UI strings)
2. **Wire new locales** into `i18n/index.ts`
3. **Expand `STATE_LANGUAGE_MAP`** to cover all 31 states
4. **Add `localName` field** to all constituency seed files (constituency name in local script)

---

## IMPORTANT RULES

- **DO NOT hallucinate translations.** Use accurate, natural-sounding translations that a native speaker would use. Political terminology should follow local media conventions.
- **DO NOT change the structure of `en.ts`.** All locale files MUST mirror `en.ts` structure exactly.
- **Each locale file imports the type** `import type { PartialTranslationKeys } from './en';` and uses it.
- **i18next falls back to English** for any missing key, so non-English files use `PartialTranslationKeys` (deep-partial).
- **DO NOT modify any existing locale files** (`en.ts`, `te.ts`, `hi.ts`, `kn.ts`, `mr.ts`) except to add new language entries in the `language` section of `en.ts`.
- **TypeScript must compile cleanly** (`npx tsc --noEmit` from `apps/mobile/`).
- **Use UTF-8 encoding** for all files.

---

## PART 1: Create 8 New Locale Files

### Location: `apps/mobile/i18n/locales/`

Create these 8 files by translating ALL keys from `en.ts` (735 lines, ~32KB):

| # | File | Language | Script | For States |
|---|------|----------|--------|------------|
| 1 | `ta.ts` | Tamil | தமிழ் | TN, PY |
| 2 | `ml.ts` | Malayalam | മലയാളം | KL |
| 3 | `bn.ts` | Bengali | বাংলা | WB, TR |
| 4 | `gu.ts` | Gujarati | ગુજરાતી | GJ |
| 5 | `pa.ts` | Punjabi | ਪੰਜਾਬੀ | PB |
| 6 | `or.ts` | Odia | ଓଡ଼ିଆ | OD |
| 7 | `as.ts` | Assamese | অসমীয়া | AS |
| 8 | `ne.ts` | Nepali | नेपाली | SK |

### Template Structure (each file must follow this EXACT pattern):

```typescript
/**
 * [Language] ([code]) — [NativeLabel]
 *
 * Native-quality [Language] translations for Kshetra.
 * Every string must feel natural to a [Language] speaker — not machine-translated.
 * Political terminology uses standard [Language] media conventions.
 */
import type { PartialTranslationKeys } from './en';

const [code]: PartialTranslationKeys = {
  // ── Common ──────────────────────────────────────────────────
  common: {
    appName: 'క్షేత్ర', // Transliterate "Kshetra" into local script
    loading: '...', // Translate
    // ... ALL keys from en.ts common section
  },

  // ── Tab Bar ─────────────────────────────────────────────────
  tabs: { /* ... */ },

  // ── Map Screen ──────────────────────────────────────────────
  map: { /* ... */ },

  // ... ALL other sections from en.ts
};

export default [code];
```

### Reference: Full key list from `en.ts`

The source of truth is `apps/mobile/i18n/locales/en.ts`. It has these top-level sections:
- `common` (24 keys)
- `tabs` (5 keys)
- `map` (title, searchPlaceholder, tapToExplore, locateMe, colorModes{6}, markerInfo, searchEmpty, stateSelector, filters, tooltip, etc.)
- `explore` (title, searchPlaceholder, sections, filters, sort, stats, etc.)
- `feed` (title, tabs, empty, article fields, etc.)
- `constituency` (title, overview, demographics, timeline, mla, compare, etc.)
- `mla` (card fields, stats, filters, etc.)
- `intelligence` (AI panel, questions, etc.)
- `dashboard` (title, widgets, etc.)
- `profile` (settings, about, etc.)
- `affidavit` (card fields, etc.)
- `parliament` (tabs, filters, stats, etc.)
- `delimitation` (projections, status values, etc.)
- `language` (title, subtitle, language names, changeConfirm)

### Translation Guidelines per Language:

| Language | "Constituency" | "Assembly" | "Election" | "Party" | "Vote" |
|----------|---------------|-----------|-----------|---------|--------|
| Tamil | நியோஜகவர்க்கம் | சட்டமன்றம் | தேர்தல் | கட்சி | வாக்கு |
| Malayalam | നിയോജകമണ്ഡലം | നിയമസഭ | തിരഞ്ഞെടുപ്പ് | പാർട്ടി | വോട്ട് |
| Bengali | নির্বাচনী এলাকা | বিধানসভা | নির্বাচন | দল | ভোট |
| Gujarati | મતવિસ્તાર | વિધાનસભા | ચૂંટણી | પક્ષ | મત |
| Punjabi | ਹਲਕਾ | ਵਿਧਾਨ ਸਭਾ | ਚੋਣ | ਪਾਰਟੀ | ਵੋਟ |
| Odia | ନିର୍ବାଚନ ମଣ୍ଡଳୀ | ବିଧାନସଭା | ନିର୍ବାଚନ | ଦଳ | ଭୋଟ |
| Assamese | সমষ্টি | বিধানসভা | নিৰ্বাচন | দল | ভোট |
| Nepali | निर्वाचन क्षेत्र | विधानसभा | चुनाव | पार्टी | मत |

---

## PART 2: Wire New Locales into `i18n/index.ts`

### File: `apps/mobile/i18n/index.ts`

Make these changes:

#### 2a. Add imports (after existing imports at line 18):
```typescript
import ta from './locales/ta';
import ml from './locales/ml';
import bn from './locales/bn';
import gu from './locales/gu';
import pa from './locales/pa';
import or_ from './locales/or';  // 'or' is a JS reserved word, use or_
import as_ from './locales/as';  // 'as' is a JS reserved word, use as_
import ne from './locales/ne';
```

**IMPORTANT**: `or` and `as` are reserved words in JavaScript. The locale files should `export default` the object, but the import variable names must be `or_` and `as_` (or `odia` and `assamese`).

#### 2b. Expand LANGUAGES array:
```typescript
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', script: 'Malayalam' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', script: 'Odia' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', script: 'Assamese' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली', script: 'Devanagari' },
] as const;
```

#### 2c. Add to resources in `i18n.init()`:
```typescript
resources: {
  en: { translation: en },
  te: { translation: te },
  hi: { translation: hi },
  kn: { translation: kn },
  mr: { translation: mr },
  ta: { translation: ta },
  ml: { translation: ml },
  bn: { translation: bn },
  gu: { translation: gu },
  pa: { translation: pa },
  or: { translation: or_ },
  as: { translation: as_ },
  ne: { translation: ne },
},
```

#### 2d. Expand `STATE_LANGUAGE_MAP`:
```typescript
export const STATE_LANGUAGE_MAP: Record<string, LanguageCode> = {
  // South India
  TS: 'te',
  AP: 'te',
  KA: 'kn',
  TN: 'ta',
  KL: 'ml',
  // West India
  MH: 'mr',
  GJ: 'gu',
  GA: 'mr',
  // North India (Hindi belt)
  UP: 'hi',
  BR: 'hi',
  HR: 'hi',
  RJ: 'hi',
  MP: 'hi',
  CG: 'hi',
  JH: 'hi',
  UK: 'hi',
  DL: 'hi',
  HP: 'hi',
  JK: 'hi',
  // East India
  WB: 'bn',
  OD: 'or',
  // Punjab
  PB: 'pa',
  // Northeast
  AS: 'as',
  SK: 'ne',
  TR: 'bn',
  MN: 'en',  // Manipuri (Meitei script) not supported yet
  ML: 'en',  // Khasi — no locale yet
  MZ: 'en',  // Mizo — no locale yet
  NL: 'en',  // Nagamese/English
  AR: 'en',  // English widely used
  // UT
  PY: 'ta',
};
```

#### 2e. Update `language` section in `en.ts` (add new language labels):
```typescript
language: {
  title: 'Language',
  subtitle: 'Choose your preferred language',
  en: 'English',
  te: 'తెలుగు',
  hi: 'हिन्दी',
  kn: 'ಕನ್ನಡ',
  mr: 'मराठी',
  ta: 'தமிழ்',
  ml: 'മലയാളം',
  bn: 'বাংলা',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  or: 'ଓଡ଼ିଆ',
  as: 'অসমীয়া',
  ne: 'नेपाली',
  systemDefault: 'System Default',
  changeConfirm: 'Change language to {{language}}?',
},
```

---

## PART 3: Add `localName` to Constituency Seed Files

### What to Do

Add a `localName` field (constituency name in local script) to each constituency entry in all 31 state seed files.

### Interface Changes

For each state's `*ConstituencySeed` interface, add:
```typescript
/** Constituency name in local script */
localName?: string;
```

Make it optional (`?`) so existing code won't break.

### States and Their Scripts

| State | File | Script for `localName` |
|-------|------|----------------------|
| TS | `telangana-constituencies.ts` | Telugu (తెలుగు) |
| AP | `andhra-pradesh-constituencies.ts` | Telugu (తెలుగు) |
| KA | `karnataka-constituencies.ts` | Kannada (ಕನ್ನಡ) |
| MH | `maharashtra-constituencies.ts` | Marathi/Devanagari (मराठी) |
| TN | `tamil-nadu-constituencies.ts` | Tamil (தமிழ்) |
| KL | `kerala-constituencies.ts` | Malayalam (മലയാളം) |
| WB | `west-bengal-constituencies.ts` | Bengali (বাংলা) |
| UP | `uttar-pradesh-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| BR | `bihar-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| JK | `jammu-kashmir-constituencies.ts` | Urdu/Hindi (हिन्दी/اردو) — use Devanagari |
| RJ | `rajasthan-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| GJ | `gujarat-constituencies.ts` | Gujarati (ગુજરાતી) |
| JH | `jharkhand-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| OD | `odisha-constituencies.ts` | Odia (ଓଡ଼ିଆ) |
| DL | `delhi-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| PB | `punjab-constituencies.ts` | Punjabi/Gurmukhi (ਪੰਜਾਬੀ) |
| HR | `haryana-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| CG | `chhattisgarh-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| MP | `madhya-pradesh-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| AS | `assam-constituencies.ts` | Assamese (অসমীয়া) |
| GA | `goa-constituencies.ts` | Marathi/Devanagari (मराठी) — or Konkani in Devanagari |
| HP | `himachal-pradesh-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| MN | `manipur-constituencies.ts` | Meitei/Bengali script (মণিপুরী) |
| ML | `meghalaya-constituencies.ts` | English (Latin) — Khasi uses Latin |
| MZ | `mizoram-constituencies.ts` | Mizo (Latin) — uses Latin script |
| NL | `nagaland-constituencies.ts` | English (Latin) |
| TR | `tripura-constituencies.ts` | Bengali (বাংলা) |
| SK | `sikkim-constituencies.ts` | Nepali/Devanagari (नेपाली) |
| AR | `arunachal-pradesh-constituencies.ts` | English (Latin) |
| UK | `uttarakhand-constituencies.ts` | Hindi/Devanagari (हिन्दी) |
| PY | `puducherry-constituencies.ts` | Tamil (தமிழ்) |

### Example — Before:
```typescript
{ acNo: 1, name: 'Gummidipoondi', district: 'Thiruvallur', type: 'GEN', ... }
```

### Example — After:
```typescript
{ acNo: 1, name: 'Gummidipoondi', localName: 'கும்மிடிப்பூண்டி', district: 'Thiruvallur', type: 'GEN', ... }
```

### CRITICAL: Transliteration Accuracy

- For Hindi-belt states: Use official ECI/State Election Commission Hindi names (e.g., "Lucknow" → "लखनऊ")
- For Tamil Nadu: Use Tamil Nadu State Election Commission Tamil names
- For Karnataka: Use official Kannada names from KSEC
- For Kerala: Use official Malayalam names from KSEC
- For West Bengal: Use official Bengali names from WBSEC
- **If unsure about a transliteration, use the standard phonetic transliteration**

### States where `localName` = same as `name` (Latin script states):
- Meghalaya (ML) — Khasi uses Latin → `localName` = `name`
- Mizoram (MZ) — Mizo uses Latin → `localName` = `name`
- Nagaland (NL) — English/Latin → `localName` = `name`
- Arunachal Pradesh (AR) — English/Latin → `localName` = `name`

For these 4 states, still add the field but set `localName` = `name`.

---

## PART 4: Update `en.ts` Language Section

In `apps/mobile/i18n/locales/en.ts`, update the `language` section to include all 13 languages (currently has 5).

---

## VERIFICATION CHECKLIST

After completing all parts, verify:

1. **TypeScript compiles**: `npx tsc --noEmit` from `apps/mobile/` → 0 errors
2. **All 8 locale files exist** in `apps/mobile/i18n/locales/`
3. **All locale files have same top-level sections** as `en.ts`
4. **`LANGUAGES` array has 13 entries** in `i18n/index.ts`
5. **`STATE_LANGUAGE_MAP` has 31 entries** (one per state)
6. **`resources` object in `i18n.init()` has 13 entries**
7. **Every constituency file has `localName?: string`** in its interface
8. **Every constituency entry has a `localName` field populated**
9. **No duplicate locale codes** in LANGUAGES
10. **`language` section in `en.ts` lists all 13 languages**

---

## PROGRESS TRACKING

Use this checklist to track progress. Mark items as done when completed:

### Part 1: Locale Files
- [ ] `ta.ts` (Tamil) — 735+ lines
- [ ] `ml.ts` (Malayalam) — 735+ lines
- [ ] `bn.ts` (Bengali) — 735+ lines
- [ ] `gu.ts` (Gujarati) — 735+ lines
- [ ] `pa.ts` (Punjabi) — 735+ lines
- [ ] `or.ts` (Odia) — 735+ lines
- [ ] `as.ts` (Assamese) — 735+ lines
- [ ] `ne.ts` (Nepali) — 735+ lines

### Part 2: Wiring
- [ ] Imports added to `i18n/index.ts`
- [ ] LANGUAGES array expanded (13 entries)
- [ ] resources in i18n.init() expanded (13 entries)
- [ ] STATE_LANGUAGE_MAP expanded (31 states)
- [ ] `en.ts` language section updated (13 languages)

### Part 3: localName in Constituencies
- [ ] TS (119 constituencies) — Telugu
- [ ] AP (175 constituencies) — Telugu
- [ ] KA (224 constituencies) — Kannada
- [ ] MH (288 constituencies) — Devanagari
- [ ] TN (234 constituencies) — Tamil
- [ ] KL (140 constituencies) — Malayalam
- [ ] WB (293 constituencies) — Bengali
- [ ] UP (401 constituencies) — Devanagari
- [ ] BR (227 constituencies) — Devanagari  
- [ ] JK (82 constituencies) — Devanagari
- [ ] RJ (200 constituencies) — Devanagari
- [ ] GJ (182 constituencies) — Gujarati
- [ ] JH (81 constituencies) — Devanagari
- [ ] OD (147 constituencies) — Odia
- [ ] DL (70 constituencies) — Devanagari
- [ ] PB (117 constituencies) — Gurmukhi
- [ ] HR (90 constituencies) — Devanagari
- [ ] CG (90 constituencies) — Devanagari
- [ ] MP (230 constituencies) — Devanagari
- [ ] AS (126 constituencies) — Assamese
- [ ] GA (40 constituencies) — Devanagari
- [ ] HP (68 constituencies) — Devanagari
- [ ] MN (60 constituencies) — Bengali/Meitei
- [ ] ML (60 constituencies) — Latin (same as name)
- [ ] MZ (40 constituencies) — Latin (same as name)
- [ ] NL (60 constituencies) — Latin (same as name)
- [ ] TR (60 constituencies) — Bengali
- [ ] SK (32 constituencies) — Devanagari
- [ ] AR (60 constituencies) — Latin (same as name)
- [ ] UK (70 constituencies) — Devanagari
- [ ] PY (30 constituencies) — Tamil

### Part 4: Verification
- [ ] `npx tsc --noEmit` passes (0 errors)
- [ ] All 13 languages appear in LANGUAGES array
- [ ] All 31 states in STATE_LANGUAGE_MAP
- [ ] Commit message ready

---

## RESUMPTION NOTES

If work is stopped midway:
1. **Check the progress checklist above** — whatever is marked `[x]` is done
2. **TypeScript must compile** at every stopping point
3. **Each locale file is independent** — you can do them one at a time
4. **Each state's localName is independent** — you can do them one at a time
5. **Part 2 (wiring) should only be done AFTER at least one locale file exists** for that language
6. **Git commit after each logical chunk** (e.g., after each locale file, or after each batch of states)

### Recommended commit sequence:
```
feat(i18n): add Tamil (ta) locale file
feat(i18n): add Malayalam (ml) locale file
feat(i18n): add Bengali (bn) locale file
feat(i18n): add Gujarati (gu) locale file
feat(i18n): add Punjabi (pa) locale file
feat(i18n): add Odia (or) locale file
feat(i18n): add Assamese (as) locale file
feat(i18n): add Nepali (ne) locale file
feat(i18n): wire all 13 languages into i18n/index.ts + STATE_LANGUAGE_MAP
feat(i18n): add localName to TS, AP, KA, MH constituencies
feat(i18n): add localName to TN, KL, WB constituencies
feat(i18n): add localName to UP, BR, RJ, MP, DL, HR, CG, JH, UK, HP, JK constituencies
feat(i18n): add localName to GJ, PB, OD, AS constituencies
feat(i18n): add localName to NE states + GA + SK + PY constituencies
```

---

## FILE SIZE REFERENCE

- `en.ts` — 735 lines (~32 KB)
- `te.ts` — 707 lines (~50 KB, larger due to Unicode)
- `hi.ts` — 707 lines (~40 KB)
- Each new locale file will be ~700-750 lines, ~35-50 KB depending on script

---

## COMPATIBILITY NOTES

- **Node.js**: Any version ≥ 18
- **TypeScript**: Project uses `tsconfig.json` in `apps/mobile/`
- **i18next**: Already installed, no new packages needed
- **React Native**: No platform-specific concerns for i18n strings
- **Fonts**: The app uses system fonts. Android/iOS have native support for all these scripts. No custom fonts needed.
- **RTL**: None of the new languages are RTL (Urdu for JK would be, but we're using Devanagari Hindi for JK)
