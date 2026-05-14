#!/usr/bin/env node
/**
 * scrape-myneta-photos.js
 *
 * Scrapes official affidavit photos from MyNeta.info for all winning candidates.
 * These are the most reliable, per-candidate photo source available.
 *
 * Usage:  node scripts/scrape-myneta-photos.js
 *
 * Output: apps/mobile/data/candidate-photo-map.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────
const ELECTIONS = [
  { key: 'Telangana2023', label: 'Telangana 2023' },
  // Add more states as needed:
  // { key: 'AndhraPradesh2024', label: 'AP 2024' },
  // { key: 'Karnataka2023', label: 'Karnataka 2023' },
  // { key: 'Maharashtra2024', label: 'Maharashtra 2024' },
];

const DELAY_MS = 200; // delay between requests to avoid rate limiting
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const OUTPUT_PATH = path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json');

// Our seed data names (for matching)
const SEED_DATA_PATH = path.resolve(__dirname, '../data/seed/telangana-constituencies.ts');

// ── Helpers ────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.myneta.info',
      path: urlPath,
      headers: { 'User-Agent': UA },
      timeout: 15000,
    };
    https.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          const u = new URL(loc, 'https://www.myneta.info');
          return fetchPage(u.pathname + u.search).then(resolve, reject);
        }
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function checkImageExists(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'HEAD',
      headers: { 'User-Agent': UA },
      timeout: 10000,
    };
    const req = https.request(opts, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// ── Step 1: Parse winners page ─────────────────────────────────────────
async function getWinners(electionKey) {
  console.log(`\n📋 Fetching winners for ${electionKey}...`);
  const html = await fetchPage(`/${electionKey}/index.php?action=show_winners&sort=default`);

  // Extract candidate links: candidate.php?candidate_id=NNN
  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)</gi)];

  // Deduplicate by candidate_id
  const seen = new Set();
  const winners = [];
  for (const m of links) {
    const id = m[1];
    const name = m[2].trim();
    // Skip header/sort links
    if (['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities'].includes(name)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    winners.push({ id, name });
  }
  console.log(`   Found ${winners.length} winners`);
  return winners;
}

// ── Step 2: Extract photo URL from candidate page ──────────────────────
async function getCandidatePhoto(electionKey, candidateId) {
  const html = await fetchPage(`/${electionKey}/candidate.php?candidate_id=${candidateId}`);
  // Look for images_candidate/ElectionKey/hash.jpg
  const match = html.match(/images_candidate\/[^"'\s>]+\.jpg/i);
  if (match) {
    return `https://www.myneta.info/${match[0]}`;
  }
  return null;
}

// ── Step 3: Fuzzy name matching ────────────────────────────────────────
function normalizeForMatch(name) {
  return name
    .toLowerCase()
    .replace(/dr\.|mr\.|mrs\.|smt\.|sri\.|shri\./gi, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .sort()
    .join(' ');
}

function nameSimilarity(a, b) {
  const wordsA = normalizeForMatch(a).split(' ');
  const wordsB = normalizeForMatch(b).split(' ');
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Step 4: Load seed names ────────────────────────────────────────────
function loadSeedNames() {
  // Read all constituency TS files and extract winnerName2023 fields
  const seedDir = path.resolve(__dirname, '../data/seed');
  const files = fs.readdirSync(seedDir).filter((f) => f.endsWith('-constituencies.ts'));
  const names = new Set();
  for (const file of files) {
    const content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
    const matches = [...content.matchAll(/winnerName2023:\s*'([^']+)'/g)];
    for (const m of matches) {
      names.add(m[1]);
    }
  }
  console.log(`📦 Loaded ${names.size} seed candidate names`);
  return [...names];
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 MyNeta Photo Scraper');
  console.log('========================\n');

  const seedNames = loadSeedNames();
  const photoMap = {};
  let total = 0;
  let matched = 0;
  let failed = 0;

  for (const election of ELECTIONS) {
    const winners = await getWinners(election.key);
    total += winners.length;

    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      process.stdout.write(`   [${i + 1}/${winners.length}] ${w.name}...`);

      try {
        const photoUrl = await getCandidatePhoto(election.key, w.id);
        if (photoUrl) {
          // Verify image exists
          const exists = await checkImageExists(photoUrl);
          if (exists) {
            // Find matching seed name
            let bestMatch = null;
            let bestScore = 0;
            for (const seedName of seedNames) {
              const score = nameSimilarity(w.name, seedName);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = seedName;
              }
            }

            // Also try exact match by MyNeta name
            const key = bestScore >= 0.5 ? bestMatch : w.name;
            photoMap[key] = photoUrl;

            if (bestScore >= 0.5) {
              console.log(` ✅ → ${key} (${Math.round(bestScore * 100)}%)`);
              matched++;
            } else {
              // Use MyNeta's own name as key
              photoMap[w.name] = photoUrl;
              console.log(` ⚠️  no seed match (best: ${bestMatch} ${Math.round(bestScore * 100)}%)`);
              matched++;
            }
          } else {
            console.log(' ❌ image 404');
            failed++;
          }
        } else {
          console.log(' ❌ no photo found');
          failed++;
        }
      } catch (err) {
        console.log(` ❌ ${err.message}`);
        failed++;
      }

      await sleep(DELAY_MS);
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photoMap, null, 2));
  console.log(`\n✨ Done!`);
  console.log(`   Total: ${total} | Matched: ${matched} | Failed: ${failed}`);
  console.log(`   Output: ${OUTPUT_PATH}`);
  console.log(`   Entries: ${Object.keys(photoMap).length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
