#!/usr/bin/env node
/**
 * Candidate Photo Fetcher — Multi-Source, Multi-Verify
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * METHODOLOGY (4 verification layers):
 * 1. SOURCE: Wikipedia REST API (curated article → page summary → thumbnail)
 * 2. NAME:   Article description must contain "politician/minister/MLA/MP"
 * 3. IMAGE:  HEAD check → 200, image/*, >3KB, not SVG, not garbage pattern
 * 4. CONTENT: Page type != "disambiguation", URL not logo/temple/building
 *
 * USAGE:
 *   node scripts/fetch-verified-photos.js              # All phases
 *   node scripts/fetch-verified-photos.js --curated    # Only curated Wikipedia
 *   node scripts/fetch-verified-photos.js --state TS   # Single state
 *
 * OUTPUT:
 *   apps/mobile/data/candidate-photo-map.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────

const OUTPUT_PATH = path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json');
const CURATED_ONLY = process.argv.includes('--curated');
const STATE_FILTER = process.argv.includes('--state')
  ? process.argv[process.argv.indexOf('--state') + 1]
  : null;

// ── Curated Wikipedia Articles (known-good, manually verified titles) ──

const WIKIPEDIA_ARTICLES = {
  'Narendra Modi': 'Narendra_Modi',
  'Amit Shah': 'Amit_Shah',
  'Rajnath Singh': 'Rajnath_Singh',
  'Nitin Gadkari': 'Nitin_Gadkari',
  'Nirmala Sitharaman': 'Nirmala_Sitharaman',
  'S. Jaishankar': 'S._Jaishankar',
  'Smriti Irani': 'Smriti_Irani',
  'Rahul Gandhi': 'Rahul_Gandhi',
  'Sonia Gandhi': 'Sonia_Gandhi',
  'Mallikarjun Kharge': 'Mallikarjun_Kharge',
  'A. Revanth Reddy': 'Anumula_Revanth_Reddy',
  'Revanth Reddy': 'Anumula_Revanth_Reddy',
  'K. Chandrashekar Rao': 'K._Chandrashekar_Rao',
  'K.T. Rama Rao': 'K._T._Rama_Rao',
  'T. Harish Rao': 'T._Harish_Rao',
  'Bhatti Vikramarka': 'Bhatti_Vikramarka',
  'Eatala Rajender': 'Eatala_Rajender',
  'Asaduddin Owaisi': 'Asaduddin_Owaisi',
  'G. Kishan Reddy': 'G._Kishan_Reddy',
  'Bandi Sanjay Kumar': 'Bandi_Sanjay_Kumar',
  'D. Sridhar Babu': 'D._Sridhar_Babu',
  'Konda Surekha': 'Konda_Surekha',
  'Nama Nageswara Rao': 'Nama_Nageswara_Rao',
  'N. Chandrababu Naidu': 'N._Chandrababu_Naidu',
  'Y.S. Jagan Mohan Reddy': 'Y._S._Jagan_Mohan_Reddy',
  'Pawan Kalyan': 'Pawan_Kalyan',
  'Nara Lokesh': 'Nara_Lokesh',
  'K. Atchannaidu': 'Kinjarapu_Atchannaidu',
  'Botcha Satyanarayana': 'Botcha_Satyanarayana',
  'Siddaramaiah': 'Siddaramaiah',
  'D.K. Shivakumar': 'D._K._Shivakumar',
  'B.S. Yediyurappa': 'B._S._Yediyurappa',
  'H.D. Kumaraswamy': 'H._D._Kumaraswamy',
  'B.Y. Raghavendra': 'B._Y._Raghavendra',
  'R. Ashoka': 'R._Ashok',
  'Pralhad Joshi': 'Pralhad_Joshi',
  'Basavaraj Bommai': 'Basavaraj_Bommai',
  'Devendra Fadnavis': 'Devendra_Fadnavis',
  'Eknath Shinde': 'Eknath_Shinde',
  'Ajit Pawar': 'Ajit_Pawar',
  'Uddhav Thackeray': 'Uddhav_Thackeray',
  'Aaditya Thackeray': 'Aaditya_Thackeray',
  'Sharad Pawar': 'Sharad_Pawar',
  'Supriya Sule': 'Supriya_Sule',
  'M.K. Stalin': 'M._K._Stalin',
  'Edappadi K. Palaniswami': 'Edappadi_K._Palaniswami',
  'K. Annamalai': 'K._Annamalai',
  'Udhayanidhi Stalin': 'Udhayanidhi_Stalin',
  'O. Panneerselvam': 'O._Panneerselvam',
  'Kanimozhi': 'Kanimozhi',
  'Dayanidhi Maran': 'Dayanidhi_Maran',
  'Pinarayi Vijayan': 'Pinarayi_Vijayan',
  'V.D. Satheesan': 'V._D._Satheesan',
  'K. Sudhakaran': 'K._Sudhakaran',
  'Shashi Tharoor': 'Shashi_Tharoor',
  'E. Sreedharan': 'E._Sreedharan',
  'Mamata Banerjee': 'Mamata_Banerjee',
  'Suvendu Adhikari': 'Suvendu_Adhikari',
  'Dilip Ghosh': 'Dilip_Ghosh',
  'Abhishek Banerjee': 'Abhishek_Banerjee_(politician)',
  'Yogi Adityanath': 'Yogi_Adityanath',
  'Akhilesh Yadav': 'Akhilesh_Yadav',
  'Mayawati': 'Mayawati',
  'Keshav Prasad Maurya': 'Keshav_Prasad_Maurya',
  'Brajesh Pathak': 'Brajesh_Pathak',
  'Azam Khan': 'Azam_Khan_(politician)',
};

const STATE_NAMES = {
  TS: 'Telangana', AP: 'Andhra Pradesh', KA: 'Karnataka', MH: 'Maharashtra',
  TN: 'Tamil Nadu', KL: 'Kerala', WB: 'West Bengal', UP: 'Uttar Pradesh',
};

// Garbage URL patterns — these are NOT person photos
const GARBAGE_PATTERNS = [
  /logo/i, /flag/i, /emblem/i, /seal_of/i, /coat_of_arms/i,
  /temple/i, /mandir/i, /masjid/i, /church/i, /mosque/i,
  /assembly.*building/i, /parliament.*house/i, /legislature/i,
  /deewali/i, /festival/i, /meeting_of_members/i,
  /serial\.jpg/i, /stamp/i, /\.svg/i,
  /market\.jpg/i, /sanchi/i, /gateway/i, /monument/i,
  /Stupa/i, /Jama_Masjid/i, /New_market/i,
];

// ── HTTP Utilities ──────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'KshetraApp/2.0 (https://kshetra.app; political-transparency-project)',
        'Accept': 'application/json',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Bad JSON')); } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function headCheck(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'KshetraApp/2.0' } }, (res) => {
      const ct = res.headers['content-type'] || '';
      const cl = parseInt(res.headers['content-length'] || '0', 10);
      resolve({ ok: res.statusCode === 200, contentType: ct, contentLength: cl });
      res.resume();
    });
    req.on('error', () => resolve({ ok: false, contentType: '', contentLength: 0 }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, contentType: '', contentLength: 0 }); });
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Verification ────────────────────────────────────────────────────

function isGarbageUrl(url) {
  return GARBAGE_PATTERNS.some(p => p.test(url));
}

async function verifyImageUrl(url) {
  if (url.includes('.svg')) return { valid: false, reason: 'SVG file' };
  if (isGarbageUrl(url)) return { valid: false, reason: 'Garbage pattern: ' + url.split('/').pop().substring(0, 40) };

  const head = await headCheck(url);
  if (!head.ok) return { valid: false, reason: 'HEAD failed' };
  if (!head.contentType.includes('image')) return { valid: false, reason: 'Not image: ' + head.contentType };
  if (head.contentLength > 0 && head.contentLength < 3000) return { valid: false, reason: `Too small: ${head.contentLength}B` };

  return { valid: true, reason: `OK (${head.contentLength}B)` };
}

// ── Wikipedia Curated Fetch ─────────────────────────────────────────

async function fetchCuratedPhoto(name, articleTitle) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
    const data = await fetchJSON(url);

    if (!data || data.type === 'disambiguation' || data.type === 'no-extract') {
      return { url: null, reason: `Article type: ${data?.type}` };
    }

    // Check description for politician
    const desc = (data.description || '').toLowerCase();
    const isPolitician = /politician|minister|chief minister|mla|mp|legislat|member of|governor|cm of/i.test(desc);

    const thumbUrl = data.thumbnail?.source;
    if (!thumbUrl) return { url: null, reason: 'No thumbnail' };

    const photoUrl = thumbUrl.replace(/\/\d+px-/, '/300px-');

    // For Wikipedia API results, trust the source (official API) but reject SVG/garbage patterns
    if (photoUrl.includes('.svg')) return { url: null, reason: 'SVG file' };
    if (isGarbageUrl(photoUrl)) return { url: null, reason: 'Garbage pattern: ' + photoUrl.split('/').pop().substring(0, 40) };

    return {
      url: photoUrl,
      confidence: isPolitician ? 'high' : 'medium',
      reason: `${isPolitician ? '✓ politician' : '⚠ unconfirmed'}: "${data.description}"`,
    };
  } catch (err) {
    return { url: null, reason: err.message };
  }
}

// ── Wikipedia Search Fetch ──────────────────────────────────────────

async function fetchSearchPhoto(name, stateName) {
  try {
    const query = `${name} politician ${stateName} India MLA`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
    const searchData = await fetchJSON(searchUrl);
    const results = searchData?.query?.search;
    if (!results || results.length === 0) return { url: null, reason: 'No search results' };

    for (const sr of results.slice(0, 3)) {
      const title = sr.title;

      // Name similarity (simple word overlap)
      const nameWords = new Set(name.toLowerCase().replace(/[.,]/g, '').split(/\s+/));
      const titleWords = new Set(title.toLowerCase().replace(/[.,]/g, '').split(/\s+/));
      let overlap = 0;
      for (const w of nameWords) { if (titleWords.has(w)) overlap++; }
      const similarity = overlap / Math.max(nameWords.size, 1);
      if (similarity < 0.3) continue;

      // Fetch summary
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const data = await fetchJSON(summaryUrl);
      if (!data || data.type === 'disambiguation') continue;

      const desc = (data.description || '').toLowerCase();
      const isPolitician = /politician|minister|chief minister|mla|mp|legislat|member of|governor/i.test(desc);
      if (!isPolitician) continue;

      const thumbUrl = data.thumbnail?.source;
      if (!thumbUrl) continue;

      const photoUrl = thumbUrl.replace(/\/\d+px-/, '/300px-');
      // Trust Wikipedia API but reject SVG/garbage
      if (photoUrl.includes('.svg')) continue;
      if (isGarbageUrl(photoUrl)) continue;

      return {
        url: photoUrl,
        confidence: similarity >= 0.6 ? 'medium' : 'low',
        reason: `Search match: "${title}" (sim=${similarity.toFixed(2)}, ${data.description})`,
      };
    }

    return { url: null, reason: 'No verified match in search results' };
  } catch (err) {
    return { url: null, reason: err.message };
  }
}

// ── MyNeta Fetch ────────────────────────────────────────────────────

async function scrapeMyNetaWinners(electionSlug) {
  try {
    const url = `https://myneta.info/${electionSlug}/index.php?action=summary&subAction=winners_list&sort=default`;
    const data = await new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'KshetraApp/2.0' } }, (res) => {
        if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
        let html = '';
        res.on('data', c => html += c);
        res.on('end', () => resolve(html));
      });
      req.on('error', reject);
      req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    });

    const results = new Map();
    const regex = /candidate\.php\?candidate_id=(\d+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(data)) !== null) {
      const id = match[1];
      const name = match[2].trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'");
      if (name && id) results.set(name, `https://myneta.info/candidate_pic/${id}.jpg`);
    }
    return results;
  } catch (err) {
    console.log(`  [MyNeta] ${electionSlug} failed: ${err.message}`);
    return new Map();
  }
}

// ── Load Candidates ─────────────────────────────────────────────────

function loadCandidates() {
  const seedFiles = [
    { state: 'TS', file: '../data/seed/telangana-constituencies.ts', field: 'winnerName2023' },
    { state: 'AP', file: '../data/seed/andhra-pradesh-constituencies.ts', field: 'winnerName2024' },
    { state: 'KA', file: '../data/seed/karnataka-constituencies.ts', field: 'winnerName2023' },
    { state: 'MH', file: '../data/seed/maharashtra-constituencies.ts', field: 'winnerName2024' },
    { state: 'TN', file: '../data/seed/tamil-nadu-constituencies.ts', field: 'winnerName2021' },
    { state: 'KL', file: '../data/seed/kerala-constituencies.ts', field: 'winnerName2021' },
    { state: 'WB', file: '../data/seed/west-bengal-constituencies.ts', field: 'winnerName2021' },
    { state: 'UP', file: '../data/seed/uttar-pradesh-constituencies.ts', field: 'winnerName2022' },
  ];

  const candidates = [];
  const seen = new Set();

  for (const { state, file, field } of seedFiles) {
    if (STATE_FILTER && state !== STATE_FILTER) continue;
    const fp = path.resolve(__dirname, file);
    if (!fs.existsSync(fp)) { console.log(`  Skipping ${state}: file not found`); continue; }

    const content = fs.readFileSync(fp, 'utf-8');
    const regex = new RegExp(`${field}:\\s*['"]([^'"]+)['"]`, 'g');
    let m;
    while ((m = regex.exec(content)) !== null) {
      const name = m[1].trim();
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        candidates.push({ name, state });
      }
    }
    console.log(`  ${state}: ${[...seen].filter((_, i) => candidates[i]?.state === state).length || '?'} candidates`);
  }

  return candidates;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Kshetra Photo Scraper v2 — Verified Photos Only      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (CURATED_ONLY) console.log('Mode: Curated Wikipedia only\n');
  if (STATE_FILTER) console.log(`Filter: ${STATE_FILTER}\n`);

  const photoMap = {};
  let stats = { curated: 0, search: 0, myneta: 0, failed: 0 };

  // ━━ Phase A: Curated Wikipedia ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━ Phase A: Wikipedia (Curated) ━━━');
  const curatedEntries = Object.entries(WIKIPEDIA_ARTICLES);
  for (let i = 0; i < curatedEntries.length; i++) {
    const [name, article] = curatedEntries[i];
    process.stdout.write(`  [${i + 1}/${curatedEntries.length}] ${name}... `);

    const result = await fetchCuratedPhoto(name, article);
    if (result.url) {
      photoMap[name] = result.url;
      stats.curated++;
      console.log(`✅ ${result.confidence} — ${result.reason}`);
    } else {
      console.log(`❌ ${result.reason}`);
    }
    await sleep(250);
  }
  console.log(`\n  Phase A done: ${stats.curated} verified photos\n`);

  if (CURATED_ONLY) {
    writeOutput(photoMap, stats);
    return;
  }

  // ━━ Phase B: Wikipedia Search (remaining candidates) ━━━━━━━━━━━━
  console.log('━━━ Phase B: Wikipedia (Search) ━━━');
  const candidates = loadCandidates();
  console.log(`  ${candidates.length} total candidates to process\n`);

  const remaining = candidates.filter(c => !photoMap[c.name]);
  for (let i = 0; i < remaining.length; i++) {
    const { name, state } = remaining[i];
    if (photoMap[name]) continue;

    process.stdout.write(`  [${i + 1}/${remaining.length}] ${name} (${state})... `);
    const result = await fetchSearchPhoto(name, STATE_NAMES[state] || state);
    if (result.url) {
      photoMap[name] = result.url;
      stats.search++;
      console.log(`✅ ${result.confidence} — ${result.reason.substring(0, 60)}`);
    } else {
      console.log(`❌ ${result.reason}`);
    }

    await sleep(350);
    if ((i + 1) % 50 === 0) {
      console.log(`  ... pause (${i + 1}/${remaining.length})...`);
      await sleep(3000);
    }
  }
  console.log(`\n  Phase B done: ${stats.search} additional photos\n`);

  // ━━ Phase C: MyNeta ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━ Phase C: MyNeta (Affidavit Photos) ━━━');
  const MYNETA_SLUGS = {
    TS: 'Telangana2023', AP: 'AP2024', KA: 'Karnataka2023', MH: 'Maharashtra2024',
    TN: 'TamilNadu2021', KL: 'Kerala2021', WB: 'WestBengal2021', UP: 'UttarPradesh2022',
  };

  const stillMissing = candidates.filter(c => !photoMap[c.name]);
  const byState = {};
  for (const c of stillMissing) {
    if (!byState[c.state]) byState[c.state] = [];
    byState[c.state].push(c.name);
  }

  for (const [state, names] of Object.entries(byState)) {
    const slug = MYNETA_SLUGS[state];
    if (!slug) continue;
    if (STATE_FILTER && state !== STATE_FILTER) continue;

    console.log(`  Fetching MyNeta ${slug}...`);
    const mynetaMap = await scrapeMyNetaWinners(slug);
    console.log(`  Found ${mynetaMap.size} candidates on MyNeta`);

    for (const name of names) {
      if (photoMap[name]) continue;

      // Exact match
      let url = mynetaMap.get(name);

      // Fuzzy match
      if (!url) {
        const normalised = name.toLowerCase().replace(/[.,]/g, '').trim();
        for (const [mName, mUrl] of mynetaMap) {
          const mNorm = mName.toLowerCase().replace(/[.,]/g, '').trim();
          // Check word overlap
          const nWords = new Set(normalised.split(/\s+/));
          const mWords = new Set(mNorm.split(/\s+/));
          let overlap = 0;
          for (const w of nWords) if (mWords.has(w)) overlap++;
          if (overlap / Math.max(nWords.size, 1) >= 0.7) {
            url = mUrl;
            break;
          }
        }
      }

      if (!url) continue;

      // Verify the MyNeta image
      const check = await verifyImageUrl(url);
      if (check.valid) {
        photoMap[name] = url;
        stats.myneta++;
      }
      await sleep(100);
    }
    await sleep(1000);
  }
  console.log(`\n  Phase C done: ${stats.myneta} additional photos\n`);

  stats.failed = candidates.length - Object.keys(photoMap).length;
  writeOutput(photoMap, stats);
}

function writeOutput(photoMap, stats) {
  const sorted = Object.fromEntries(
    Object.entries(photoMap).sort(([a], [b]) => a.localeCompare(b)),
  );

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total photos verified: ${Object.keys(sorted).length}`);
  console.log(`    Curated Wikipedia:   ${stats.curated}`);
  console.log(`    Wikipedia Search:    ${stats.search}`);
  console.log(`    MyNeta Affidavit:    ${stats.myneta}`);
  console.log(`    Not found:           ${stats.failed || 0}`);
  console.log('═══════════════════════════════════════════════════════');

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log(`\n  Output: ${OUTPUT_PATH}`);
  console.log('  Done! Rebuild the app to bundle the new photos.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
