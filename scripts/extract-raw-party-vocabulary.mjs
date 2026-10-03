/**
 * scripts/extract-raw-party-vocabulary.mjs
 * 
 * Forensic Extraction of all raw political party / organization strings
 * across the entire Kshetra codebase (data/seed, packages/shared, apps/api, apps/mobile).
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const partyOccurrences = new Map();

function recordParty(rawString, sourceFile, contextType, extra = {}) {
  if (!rawString || typeof rawString !== 'string') return;
  const trimmed = rawString.trim();
  if (!trimmed) return;

  if (!partyOccurrences.has(trimmed)) {
    partyOccurrences.set(trimmed, {
      rawString: trimmed,
      occurrences: 0,
      sources: new Set(),
      contexts: new Set(),
      sampleRecords: []
    });
  }

  const entry = partyOccurrences.get(trimmed);
  entry.occurrences += 1;
  const relPath = path.relative(REPO_ROOT, sourceFile).replace(/\\/g, '/');
  entry.sources.add(relPath);
  entry.contexts.add(contextType);
  if (entry.sampleRecords.length < 5) {
    entry.sampleRecords.push({ source: relPath, context: contextType, ...extra });
  }
}

// 1. Scan data/seed files
const seedDir = path.join(REPO_ROOT, 'data', 'seed');
const seedFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('.ts') || f.endsWith('.json'));

for (const file of seedFiles) {
  const filePath = path.join(seedDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // MLA profiles: party: '...' or party: "..."
  if (file.endsWith('-mla-profiles.ts')) {
    const partyMatches = content.matchAll(/party:\s*['"]([^'"]+)['"]/g);
    for (const match of partyMatches) {
      recordParty(match[1], filePath, 'MLA_PROFILE_PARTY');
    }
    const prevMatches = content.matchAll(/previousParty:\s*['"]([^'"]+)['"]/g);
    for (const match of prevMatches) {
      recordParty(match[1], filePath, 'MLA_PROFILE_PREVIOUS_PARTY');
    }
  }

  // MP profiles
  if (file === 'mp-profiles.ts') {
    const partyMatches = content.matchAll(/party:\s*['"]([^'"]+)['"]/g);
    for (const match of partyMatches) {
      recordParty(match[1], filePath, 'MP_PROFILE_PARTY');
    }
  }

  // Constituencies: currentParty, winner2023, runnerUp2023, etc.
  if (file.endsWith('-constituencies.ts')) {
    const matches = content.matchAll(/(currentParty|winner2023|runnerUp2023|winner2018|runnerUp2018|winner2019|runnerUp2019|winner2024|runnerUp2024|winnerParty|runnerUpParty|party):\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      recordParty(match[2], filePath, `CONSTITUENCY_${match[1].toUpperCase()}`);
    }
  }

  // Historical results: party: '...'
  if (file.endsWith('-historical-results.ts')) {
    const matches = content.matchAll(/(party|winnerParty|runnerUpParty|leadingParty):\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      recordParty(match[2], filePath, `HISTORICAL_${match[1].toUpperCase()}`);
    }
  }

  // Election history: winningParty, runnerUpParty, rulingParty, etc.
  if (file.endsWith('-election-history.ts')) {
    const matches = content.matchAll(/(winningParty|runnerUpParty|rulingParty|majorityParty|coalitionParties|alliances|party):\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      recordParty(match[2], filePath, `ELECTION_HISTORY_${match[1].toUpperCase()}`);
    }
  }

  // Political timeline
  if (file.endsWith('-political-timeline.ts')) {
    const matches = content.matchAll(/(party|rulingParty):\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      recordParty(match[2], filePath, `POLITICAL_TIMELINE_${match[1].toUpperCase()}`);
    }
  }
}

// 2. Scan packages/shared/src/constants/parties.ts
const partiesConstPath = path.join(REPO_ROOT, 'packages', 'shared', 'src', 'constants', 'parties.ts');
if (fs.existsSync(partiesConstPath)) {
  const content = fs.readFileSync(partiesConstPath, 'utf8');
  // Match single or double quoted strings properly handling escaped quotes
  const codeMatches = content.matchAll(/code:\s*['"]([^'"]+)['"]/g);
  for (const m of codeMatches) {
    recordParty(m[1], partiesConstPath, 'PARTY_CONFIG_CODE');
  }
  const nameMatches = content.matchAll(/name:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/g);
  for (const m of nameMatches) {
    const str = (m[1] !== undefined ? m[1] : m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
    recordParty(str, partiesConstPath, 'PARTY_CONFIG_NAME');
  }
  const shortMatches = content.matchAll(/shortName:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/g);
  for (const m of shortMatches) {
    const str = (m[1] !== undefined ? m[1] : m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
    recordParty(str, partiesConstPath, 'PARTY_CONFIG_SHORTNAME');
  }
}

// Format summary and output JSON
const sorted = Array.from(partyOccurrences.values()).sort((a, b) => b.occurrences - a.occurrences);

const result = {
  extractedAt: new Date().toISOString(),
  totalUniqueRawStrings: sorted.length,
  totalOccurrences: sorted.reduce((sum, e) => sum + e.occurrences, 0),
  parties: sorted.map(e => ({
    rawString: e.rawString,
    occurrences: e.occurrences,
    sources: Array.from(e.sources).sort(),
    contexts: Array.from(e.contexts).sort(),
    sampleRecords: e.sampleRecords
  }))
};

const reportsDir = path.join(REPO_ROOT, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_raw_party_vocabulary.json'),
  JSON.stringify(result, null, 2)
);

console.log(`[PARTY-VOCABULARY] Extracted ${result.totalUniqueRawStrings} unique raw strings (${result.totalOccurrences} occurrences) across repository.`);
