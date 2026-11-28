import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const localesDir = path.join(process.cwd(), 'apps', 'mobile', 'i18n', 'locales');
const fallbackPolicyPath = path.join(process.cwd(), 'apps', 'mobile', 'i18n', 'approvedEnglishFallbacks.json');
const languages = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'];
const localeScripts = {
  te: 'Telugu',
  hi: 'Devanagari',
  ta: 'Tamil',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Devanagari',
  bn: 'Bengali',
  gu: 'Gujarati',
  or: 'Oriya',
  pa: 'Gurmukhi',
  as: 'Bengali',
  ne: 'Devanagari',
};
// These user-facing sections have been checked for accidental script substitution.
const scriptCheckedSections = ['partyRegistry.', 'common.timeAgo.', 'shortsPlayer.'];
const fallbackPolicy = JSON.parse(fs.readFileSync(fallbackPolicyPath, 'utf8'));
if (fallbackPolicy.fallbackLanguage !== 'en' || !Array.isArray(fallbackPolicy.keys)) {
  throw new Error('Approved English fallback policy is missing or invalid.');
}
const approvedEnglishFallbacks = new Set(fallbackPolicy.keys);
// Official codes, format names, brands and development examples may be invariant.
const invariantLocaleKeys = new Set([
  'campaignManager.constituencyLabel', 'campaignManager.ctr', 'campaignManager.serviceWhatsApp',
  'civicMetrics.tabs.rti', 'compare.scPct', 'compare.stPct', 'constituency.scPct',
  'constituency.stPct', 'constituencyExtended.scLabel', 'constituencyExtended.stLabel',
  'delimitation.sc', 'delimitation.st', 'explore.sc', 'explore.sort.acNo', 'explore.st',
  'exportSheet.csv', 'exportSheet.json', 'exportSheet.pdf', 'govReportCard.pdi', 'language.en',
  'outreach.channels.sms', 'outreach.channels.whatsapp', 'parliament.ndaAlliance',
  'parties.AIMIM', 'parties.BRS', 'parties.JDS', 'parties.JSP', 'parties.TDP', 'parties.YSRCP',
  'screenLabels.CompareSheet.mla', 'screenLabels.ComposeSheet.mp4',
  'screenLabels.ConstituencySelectorSheet.acValue1', 'screenLabels.CriminalRecordCard.ipc',
  'screenLabels.MapFallback.genValue1ScValue2StValue3', 'screenLabels.PerformanceCard.mplads',
  'screenLabels.SimplifiedOutreach.revanthReddyInc', 'screenLabels.localBodies.ap',
  'screenLabels.localBodies.ts', 'uploadShort.urlPlaceholder',
]);

console.log('=== 13-LANGUAGE SEMANTIC & BIDIRECTIONAL TOKEN INTEGRITY VALIDATOR (DEF-012) ===\n');

function loadLocale(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest);
  function inspect(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set();
      for (const property of node.properties) {
        const key = property.name?.text;
        if (key === undefined) continue;
        if (keys.has(key)) {
          const { line } = source.getLineAndCharacterOfPosition(property.getStart(source));
          throw new Error(`${filePath}:${line + 1} has duplicate translation key ${key}`);
        }
        keys.add(key);
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  const clean = content
    .replace(/^import\s+.*;/gm, '')
    .replace(/^export\s+type\s+.*;/gm, '')
    .replace(/^type\s+.*;/gm, '')
    .replace(/^export\s+default\s+[a-zA-Z0-9_]+;/gm, '')
    .replace(/^const\s+[a-zA-Z0-9_]+(\s*:\s*[a-zA-Z0-9_<>\s]+)?\s*=\s*/m, 'return ');
  const fn = new Function(clean);
  return fn();
}

function flatten(obj, prefix = '') {
  let res = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(res, flatten(v, full));
    } else {
      res[full] = v;
    }
  }
  return res;
}

function extractTokens(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{\{[^}]+\}\}/g);
  return matches || [];
}

const enFile = path.join(localesDir, 'en.ts');
const enObj = loadLocale(enFile);
const enFlat = flatten(enObj);
const enKeys = Object.keys(enFlat);
const mobileDir = path.dirname(path.dirname(localesDir));
const screenRootDirs = ['app', 'components'].map((folder) => path.join(mobileDir, folder));
for (const directory of screenRootDirs) {
  for (const relativeFile of fs.readdirSync(directory, { recursive: true })) {
    if (!relativeFile.endsWith('.tsx') || /\.(test|spec)\.tsx$/.test(relativeFile)) continue;
    const file = path.join(directory, relativeFile);
    const screen = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function inspectScreen(node) {
      if (ts.isPropertyAssignment(node) && node.name.text === 'i18nKey' &&
          ts.isStringLiteralLike(node.initializer)) {
        const key = node.initializer.text;
        if (!(key in enFlat)) {
          const { line } = screen.getLineAndCharacterOfPosition(node.getStart(screen));
          throw new Error(`${path.relative(process.cwd(), file)}:${line + 1} uses an undefined locale key ${key}`);
        }
      }
      ts.forEachChild(node, inspectScreen);
    }
    inspectScreen(screen);
  }
}
const unknownFallbackKeys = Array.from(approvedEnglishFallbacks).filter(k => !(k in enFlat));
if (unknownFallbackKeys.length > 0 || approvedEnglishFallbacks.size !== fallbackPolicy.keys.length) {
  throw new Error(`Approved English fallback policy contains invalid or duplicate keys: ${unknownFallbackKeys.join(', ')}`);
}

console.log(`Canonical English Leaf Keys: ${enKeys.length}`);

// Extract all keys with interpolation tokens
const tokensByKey = {};
let totalTokensInCanonical = 0;
for (const [k, val] of Object.entries(enFlat)) {
  const tokens = extractTokens(val);
  if (tokens.length > 0) {
    tokensByKey[k] = tokens;
    totalTokensInCanonical += tokens.length;
  }
}

console.log(`Canonical Keys with Interpolation Tokens: ${Object.keys(tokensByKey).length} (${totalTokensInCanonical} total tokens)\n`);

const results = [];
let allPass = true;

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.ts`);
  const obj = loadLocale(filePath);
  const flat = flatten(obj);
  const keys = Object.keys(flat);

  const approvedFallbackKeys = enKeys.filter(k => !(k in flat) && approvedEnglishFallbacks.has(k));
  const missingKeys = enKeys.filter(k => !(k in flat) && !approvedEnglishFallbacks.has(k));
  const extraKeys = keys.filter(k => !(k in enFlat));
  const tokenMismatches = [];
  const copiedEnglishKeys = [];
  const mixedScriptKeys = [];
  const localeScript = localeScripts[lang] && new RegExp(`\\p{Script=${localeScripts[lang]}}`, 'u');

  for (const k of enKeys) {
    const expectedVal = enFlat[k];
    const actualVal = flat[k];
    if (actualVal === undefined && approvedEnglishFallbacks.has(k)) continue;
    if (typeof actualVal !== 'string') {
      if (typeof expectedVal === 'string') {
        tokenMismatches.push({ key: k, reason: 'NOT_A_STRING', expectedTokens: extractTokens(expectedVal) });
      }
      continue;
    }
    if (lang !== 'en' && actualVal === expectedVal && !invariantLocaleKeys.has(k) &&
        /[a-z]{2}/i.test(actualVal.replace(/\{\{[^}]+\}\}/g, ''))) {
      copiedEnglishKeys.push(k);
    }
    if (localeScript && scriptCheckedSections.some((section) => k.startsWith(section))) {
      const words = actualVal.replace(/\{\{[^}]+\}\}/g, '');
      if ([...words].some((char) => /\p{L}|\p{M}/u.test(char) && !localeScript.test(char) &&
          !/\p{Script=Latin}|\p{Script=Common}|\p{Script=Inherited}/u.test(char))) {
        mixedScriptKeys.push(k);
      }
    }
    const expectedTokens = extractTokens(expectedVal).sort();
    const actualTokens = extractTokens(actualVal).sort();

    const isMatch =
      expectedTokens.length === actualTokens.length &&
      expectedTokens.every((t, i) => t === actualTokens[i]);

    if (!isMatch) {
      tokenMismatches.push({
        key: k,
        reason: 'TOKEN_SET_MISMATCH',
        expectedTokens,
        actualTokens,
        actualValue: actualVal
      });
    }
  }

  const effectiveKeyCount = keys.length + approvedFallbackKeys.length;
  const isPass = missingKeys.length === 0 && extraKeys.length === 0 && tokenMismatches.length === 0 &&
    copiedEnglishKeys.length === 0 && mixedScriptKeys.length === 0 && effectiveKeyCount === enKeys.length;
  if (copiedEnglishKeys.length) {
    console.error(`[i18n] ${lang} contains copied English values: ${copiedEnglishKeys.join(', ')}`);
  }
  if (mixedScriptKeys.length) {
    console.error(`[i18n] ${lang} contains unexpected scripts: ${mixedScriptKeys.join(', ')}`);
  }
  if (!isPass) allPass = false;

  results.push({
    lang,
    totalKeys: keys.length,
    effectiveKeyCount,
    canonicalKeys: enKeys.length,
    missingCount: missingKeys.length,
    approvedFallbackCount: approvedFallbackKeys.length,
    extraCount: extraKeys.length,
    tokenMismatchCount: tokenMismatches.length,
    copiedEnglishCount: copiedEnglishKeys.length,
    status: isPass ? 'PASS' : 'FAIL',
    missingKeys: missingKeys.slice(0, 5),
    extraKeys: extraKeys.slice(0, 5),
    copiedEnglishKeys: copiedEnglishKeys.slice(0, 5),
    tokenMismatches: tokenMismatches.slice(0, 5)
  });

  console.log(
    `[i18n] ${lang.padEnd(5)}: ${String(effectiveKeyCount).padStart(4)}/${enKeys.length} effective keys | Approved English fallbacks: ${String(approvedFallbackKeys.length).padStart(2)} | Unresolved missing: ${String(missingKeys.length).padStart(2)} | Extra: ${String(extraKeys.length).padStart(2)} | Token mismatches: ${String(tokenMismatches.length).padStart(2)} | Status: ${isPass ? 'PASS' : 'FAIL'}`
  );
});

const report = {
  evidenceMetadata: {
    mandate: 'Locale key completeness with explicit English fallback exceptions and bidirectional token integrity across all 13 official languages',
    verifiedBy: 'SEMANTIC_TOKEN_INTEGRITY_VALIDATOR',
    timestamp: new Date().toISOString()
  },
  canonicalKeyCount: enKeys.length,
  approvedEnglishFallbacks: Array.from(approvedEnglishFallbacks),
  keysWithTokensCount: Object.keys(tokensByKey).length,
  allPassed100Percent: allPass,
  results
};

const reportPath = path.join(process.cwd(), 'reports', 'w010_def012_locale_closure.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nEvidence written to: ${reportPath}`);
console.log(`DEF-012 Final Gate Verdict: ${allPass ? 'PASSED (complete key coverage with explicitly approved English fallbacks and token integrity across all 13 locales)' : 'FAILED'}`);

if (!allPass) {
  process.exit(1);
}
