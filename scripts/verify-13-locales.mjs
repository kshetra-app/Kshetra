import fs from 'fs';
import path from 'path';

const localesDir = 'apps/mobile/i18n/locales';
const languages = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'];

console.log('=== 13-LANGUAGE i18n AUDIT & KEY PARITY VERIFICATION ===\n');

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
const enContent = fs.readFileSync(enFile, 'utf8');
const enKeys = extractKeysFromSource(enContent);

console.log(`Canonical English Keys extracted: ${enKeys.size}\n`);

const results = [];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.ts`);
  if (!fs.existsSync(filePath)) {
    results.push({ lang, exists: false, totalKeys: 0, coveragePct: 0, missingKeys: [] });
    return;
  }

  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const langKeys = extractKeysFromSource(content);

  let matched = 0;
  let missing = [];

  enKeys.forEach(k => {
    if (langKeys.has(k)) {
      matched++;
    } else {
      missing.push(k);
    }
  });

  const coveragePct = Math.round((matched / enKeys.size) * 100);
  results.push({
    lang,
    exists: true,
    fileSizeKB: Math.round(stat.size / 1024),
    totalKeys: langKeys.size,
    matchedKeys: matched,
    coveragePct,
    missingCount: missing.length
  });

  console.log(
    `[i18n] ${lang.padEnd(5)}: ${String(matched).padStart(4)}/${enKeys.size} keys (${String(coveragePct).padStart(3)}% parity) | File: ${String(Math.round(stat.size / 1024)).padStart(3)} KB | Status: ${coveragePct >= 95 ? 'PASS' : 'WARN'}`
  );
});

console.log('\n--- Checking i18n index wiring ---');
const indexFile = 'apps/mobile/i18n/index.ts';
const indexContent = fs.readFileSync(indexFile, 'utf8');
const missingInIndex = languages.filter(l => !indexContent.includes(`locales/${l}`) && !indexContent.includes(` ${l}:`));

console.log(`Index file references all 13 languages: ${missingInIndex.length === 0 ? 'YES (100% wired)' : 'NO: missing ' + missingInIndex.join(', ')}`);

const report = {
  timestamp: new Date().toISOString(),
  canonicalKeyCount: enKeys.size,
  results,
  allPassed: results.every(r => r.coveragePct >= 90)
};

fs.writeFileSync('C:/Users/Laven/.gemini/antigravity/brain/c4e5c1f0-d7c0-4b78-b106-d1887d5fb8df/scratch/i18n_verification_report.json', JSON.stringify(report, null, 2));
console.log('\ni18n verification report written to scratch/i18n_verification_report.json');
