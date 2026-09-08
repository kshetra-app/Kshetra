import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'apps', 'mobile', 'i18n', 'locales');
const languages = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'];

console.log('=== 13-LANGUAGE i18n AUDIT & KEY PARITY CANONICAL VALIDATOR ===\n');

function extractKeysFromSource(content) {
  const keys = new Set();
  const lines = content.split('\n');
  const sectionStack = [];

  lines.forEach(line => {
    // Check for closing brace
    if (/^\s*\}/.test(line)) {
      sectionStack.pop();
    }
    // Check for object section start: `"section": {` or `section: {`
    const sectionMatch = line.match(/^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*\{/);
    if (sectionMatch) {
      sectionStack.push(sectionMatch[1]);
    }
    // Check for leaf key: `"key": "..."` or `key: '...'`
    const keyMatch = line.match(/^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*['"`]/);
    if (keyMatch && !line.includes('{')) {
      const prefix = sectionStack.length > 0 ? sectionStack.join('.') + '.' : '';
      keys.add(`${prefix}${keyMatch[1]}`);
    }
  });
  return keys;
}

const enFile = path.join(localesDir, 'en.ts');
if (!fs.existsSync(enFile)) {
  console.error(`ERROR: Canonical English locale file not found at ${enFile}`);
  process.exit(1);
}

const enContent = fs.readFileSync(enFile, 'utf8');
const enKeys = extractKeysFromSource(enContent);

console.log(`Canonical English Keys extracted: ${enKeys.size}\n`);

const results = [];
let totalMissingAcrossAll = 0;

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.ts`);
  if (!fs.existsSync(filePath)) {
    results.push({
      lang,
      exists: false,
      fileSizeKB: 0,
      totalKeys: 0,
      matchedKeys: 0,
      coveragePct: 0,
      missingCount: enKeys.size,
      missingKeys: Array.from(enKeys),
      status: 'MISSING_FILE'
    });
    totalMissingAcrossAll += enKeys.size;
    return;
  }

  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const langKeys = extractKeysFromSource(content);

  let matched = 0;
  const missing = [];

  enKeys.forEach(k => {
    if (langKeys.has(k)) {
      matched++;
    } else {
      missing.push(k);
    }
  });

  totalMissingAcrossAll += missing.length;
  const coveragePct = Math.round((matched / enKeys.size) * 100);
  const is100Pct = matched === enKeys.size && missing.length === 0;

  results.push({
    lang,
    exists: true,
    fileSizeKB: Math.round(stat.size / 1024),
    totalKeys: langKeys.size,
    matchedKeys: matched,
    coveragePct,
    missingCount: missing.length,
    missingKeys: missing,
    status: is100Pct ? 'PASS' : 'FAIL_MISSING_KEYS'
  });

  console.log(
    `[i18n] ${lang.padEnd(5)}: ${String(matched).padStart(4)}/${enKeys.size} keys (${String(coveragePct).padStart(3)}% parity, ${String(missing.length).padStart(4)} missing) | File: ${String(Math.round(stat.size / 1024)).padStart(3)} KB | Status: ${is100Pct ? 'PASS' : 'FAIL'}`
  );
});

console.log('\n--- Checking i18n index wiring ---');
const indexFile = path.join(process.cwd(), 'apps', 'mobile', 'i18n', 'index.ts');
const indexContent = fs.readFileSync(indexFile, 'utf8');
const missingInIndex = languages.filter(l => !indexContent.includes(`locales/${l}`) && !indexContent.includes(` ${l}:`));

console.log(`Index file references all 13 languages: ${missingInIndex.length === 0 ? 'YES (100% wired)' : 'NO: missing ' + missingInIndex.join(', ')}`);

const all100Passed = results.every(r => r.coveragePct === 100 && r.missingCount === 0);

const report = {
  evidenceMetadata: {
    repository: 'https://github.com/kshetra-app/Kshetra.git',
    branch: 'master',
    targetMandate: '100% key parity across all 13 official languages',
    verifiedBy: 'CANONICAL_VALIDATOR',
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString(),
  canonicalKeyCount: enKeys.size,
  totalMissingKeysAcrossLanguages: totalMissingAcrossAll,
  allPassed100Percent: all100Passed,
  indexWiringComplete: missingInIndex.length === 0,
  results: results.map(r => ({
    lang: r.lang,
    exists: r.exists,
    fileSizeKB: r.fileSizeKB,
    totalKeys: r.totalKeys,
    matchedKeys: r.matchedKeys,
    coveragePct: r.coveragePct,
    missingCount: r.missingCount,
    status: r.status,
    missingKeysSample: r.missingKeys.slice(0, 10),
    missingKeysTotal: r.missingKeys.length
  }))
};

const reportPath = path.join(process.cwd(), 'reports', 'w001_i18n_verification_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nRepository-relative i18n verification report written to: reports/w001_i18n_verification_report.json`);
console.log(`Canonical 100% Parity Gate Verdict: ${all100Passed ? 'PASSED (100% parity across all 13 languages)' : 'FAILED (Key parity gaps exist - DEF-012 OPEN)'}`);

if (process.argv.includes('--strict') && !all100Passed) {
  console.error(`\n[STRICT EXIT] Canonical validator failed 100% key parity requirement.`);
  process.exit(1);
}
