import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'apps', 'mobile', 'i18n', 'locales');
const languages = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'];

console.log('=== 13-LANGUAGE SEMANTIC & BIDIRECTIONAL TOKEN INTEGRITY VALIDATOR (DEF-012) ===\n');

function loadLocale(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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

  const missingKeys = enKeys.filter(k => !(k in flat));
  const extraKeys = keys.filter(k => !(k in enFlat));
  const tokenMismatches = [];

  for (const k of enKeys) {
    const expectedVal = enFlat[k];
    const actualVal = flat[k];
    if (typeof actualVal !== 'string') {
      if (typeof expectedVal === 'string') {
        tokenMismatches.push({ key: k, reason: 'NOT_A_STRING', expectedTokens: extractTokens(expectedVal) });
      }
      continue;
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

  const isPass = missingKeys.length === 0 && extraKeys.length === 0 && tokenMismatches.length === 0 && keys.length === enKeys.length;
  if (!isPass) allPass = false;

  results.push({
    lang,
    totalKeys: keys.length,
    canonicalKeys: enKeys.length,
    missingCount: missingKeys.length,
    extraCount: extraKeys.length,
    tokenMismatchCount: tokenMismatches.length,
    status: isPass ? 'PASS' : 'FAIL',
    missingKeys: missingKeys.slice(0, 5),
    extraKeys: extraKeys.slice(0, 5),
    tokenMismatches: tokenMismatches.slice(0, 5)
  });

  console.log(
    `[i18n] ${lang.padEnd(5)}: ${String(keys.length).padStart(4)}/${enKeys.length} keys | Missing: ${String(missingKeys.length).padStart(3)} | Extra: ${String(extraKeys.length).padStart(3)} | Bidirectional Token Mismatches: ${String(tokenMismatches.length).padStart(3)} | Status: ${isPass ? 'PASS' : 'FAIL'}`
  );
});

const report = {
  evidenceMetadata: {
    mandate: 'DEF-012 Locale Closure: 100% semantic parity & bidirectional token integrity across all 13 official languages',
    verifiedBy: 'SEMANTIC_TOKEN_INTEGRITY_VALIDATOR',
    timestamp: new Date().toISOString()
  },
  canonicalKeyCount: enKeys.length,
  keysWithTokensCount: Object.keys(tokensByKey).length,
  allPassed100Percent: allPass,
  results
};

const reportPath = path.join(process.cwd(), 'reports', 'w010_def012_locale_closure.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nEvidence written to: ${reportPath}`);
console.log(`DEF-012 Final Gate Verdict: ${allPass ? 'PASSED (100% dual parity & bidirectional token integrity across 13/13 locales)' : 'FAILED'}`);

if (!allPass) {
  process.exit(1);
}
