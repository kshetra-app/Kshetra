/**
 * Pre-fetch candidate photos from Wikipedia and save to static JSON.
 * Uses Wikipedia Search API + Page Summary API for reliable matching.
 * Run: node scripts/fetch-candidate-photos.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'apps', 'mobile', 'data', 'candidate-photo-map.json');

// Rate limiting
const DELAY_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract all unique winner names from seed data files using regex
 * (avoids needing ts-node / tsx for TypeScript files).
 */
function extractCandidateNames() {
  const seedDir = join(__dirname, '..', 'data', 'seed');
  const files = [
    'telangana-constituencies.ts',
    'andhra-pradesh-constituencies.ts',
    'karnataka-constituencies.ts',
    'maharashtra-constituencies.ts',
    'tamil-nadu-constituencies.ts',
    'kerala-constituencies.ts',
    'west-bengal-constituencies.ts',
    'uttar-pradesh-constituencies.ts',
  ];

  const names = new Set();
  // Match patterns like: winnerName2023: 'Some Name' or winnerName2024: "Some Name"
  const pattern = /winnerName\d{4}:\s*['"]([^'"]+)['"]/g;

  for (const file of files) {
    try {
      const content = readFileSync(join(seedDir, file), 'utf-8');
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name && name !== 'TBD' && name !== 'Unknown' && name.length > 2) {
          names.add(name);
        }
      }
    } catch (e) {
      console.warn(`⚠ Could not read ${file}: ${e.message}`);
    }
  }

  return [...names];
}

/**
 * Search Wikipedia for a candidate and get their thumbnail photo.
 * Strategy:
 *  1. Search Wikipedia for "{name} politician India"
 *  2. Check top 3 results for a thumbnail
 *  3. Return the best match
 */
async function fetchPhotoForCandidate(name) {
  try {
    // Step 1: Search Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' politician India')}&srlimit=3&format=json&origin=*`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'User-Agent': 'KshetraApp/1.0 (https://github.com/kshetra; contact@kshetra.app)' },
    });
    if (!searchResp.ok) return null;
    const searchData = await searchResp.json();

    const results = searchData?.query?.search;
    if (!results?.length) return null;

    // Step 2: Try each result for a photo
    for (const result of results) {
      const title = result.title;
      // Skip disambiguation pages
      if (title.includes('disambiguation') || title.includes('election')) continue;

      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryResp = await fetch(summaryUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KshetraApp/1.0 (https://github.com/kshetra; contact@kshetra.app)',
        },
      });
      if (!summaryResp.ok) continue;
      const summary = await summaryResp.json();

      // Must be a standard article (not disambiguation)
      if (summary.type === 'disambiguation' || summary.type === 'no-extract') continue;

      // Must have a thumbnail
      const thumbUrl = summary?.thumbnail?.source;
      if (!thumbUrl) continue;

      // Verify it's about an Indian politician by checking extract
      const extract = (summary.extract || '').toLowerCase();
      const isIndianPolitician =
        extract.includes('india') ||
        extract.includes('politician') ||
        extract.includes('minister') ||
        extract.includes('mla') ||
        extract.includes('member of') ||
        extract.includes('assembly') ||
        extract.includes('parliament') ||
        extract.includes('lok sabha') ||
        extract.includes('chief minister') ||
        extract.includes('telangana') ||
        extract.includes('andhra') ||
        extract.includes('karnataka') ||
        extract.includes('maharashtra') ||
        extract.includes('tamil nadu') ||
        extract.includes('kerala') ||
        extract.includes('bengal') ||
        extract.includes('uttar pradesh') ||
        extract.includes('bjp') ||
        extract.includes('congress') ||
        extract.includes('party');

      if (!isIndianPolitician) continue;

      // Upscale to 300px
      const hiRes = thumbUrl.replace(/\/\d+px-/, '/300px-');
      return hiRes;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('🔍 Extracting candidate names from seed data...');
  const names = extractCandidateNames();
  console.log(`📋 Found ${names.length} unique candidate names\n`);

  // Load existing map if any
  let photoMap = {};
  try {
    photoMap = JSON.parse(readFileSync(OUTPUT, 'utf-8'));
    console.log(`📂 Loaded existing map with ${Object.keys(photoMap).length} entries\n`);
  } catch {
    // Fresh start
  }

  let found = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < names.length; i++) {
    const name = names[i];

    // Skip if already in map
    if (photoMap[name]) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${names.length}] ${name}... `);

    const photoUrl = await fetchPhotoForCandidate(name);
    if (photoUrl) {
      photoMap[name] = photoUrl;
      found++;
      console.log('✅');
    } else {
      failed++;
      console.log('❌');
    }

    // Save periodically (every 20 candidates)
    if ((i + 1) % 20 === 0) {
      writeFileSync(OUTPUT, JSON.stringify(photoMap, null, 2));
      console.log(`  💾 Saved (${Object.keys(photoMap).length} total photos)\n`);
    }

    await sleep(DELAY_MS);
  }

  // Final save
  writeFileSync(OUTPUT, JSON.stringify(photoMap, null, 2));

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Found: ${found}`);
  console.log(`⏭  Skipped (already had): ${skipped}`);
  console.log(`❌ Not found: ${failed}`);
  console.log(`📊 Total in map: ${Object.keys(photoMap).length}`);
  console.log(`📁 Saved to: ${OUTPUT}`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
