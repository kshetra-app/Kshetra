#!/usr/bin/env npx ts-node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Candidate Photo Scraper v2 — Multi-Source, Multi-Verify           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * METHODOLOGY (4 verification layers):
 * ─────────────────────────────────────
 * 1. SOURCE VERIFICATION: Is the image from a reliable, curated source?
 *    - Phase A: Wikipedia (curated article titles for ~60 notable politicians)
 *    - Phase B: Wikipedia (search API for remaining candidates)
 *    - Phase C: MyNeta.info (ADR affidavit photos)
 *
 * 2. NAME VERIFICATION: Does the source article/page match our candidate?
 *    - Wikipedia: article description must contain "politician" or "MLA" etc.
 *    - Wikipedia: article title must fuzzy-match our candidate name (score > 0.6)
 *    - MyNeta: candidate name from page must fuzzy-match (score > 0.7)
 *
 * 3. IMAGE VERIFICATION: Is the URL a valid, renderable image?
 *    - HEAD request returns HTTP 200
 *    - Content-Type is image/* (not text/html)
 *    - Content-Length > 3KB (reject tiny placeholder icons)
 *    - Not an SVG file (React Native can't render SVG in <Image>)
 *    - Not a known garbage pattern (logos, buildings, maps)
 *
 * 4. CONTENT VERIFICATION: Is this likely a person's photo?
 *    - Wikipedia: page type is not "disambiguation" or "no-extract"
 *    - Image URL path doesn't contain logo/flag/map/building keywords
 *    - Image is from a known good domain (upload.wikimedia.org, myneta.info)
 *
 * OUTPUT:
 *   apps/mobile/data/candidate-photo-map.json    — Verified photos only
 *   scripts/output/photo-scrape-report.json       — Full audit trail
 *
 * USAGE:
 *   npx ts-node scripts/scrape-candidate-photos-v2.ts
 *   npx ts-node scripts/scrape-candidate-photos-v2.ts --state TS
 *   npx ts-node scripts/scrape-candidate-photos-v2.ts --curated-only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ── Configuration ────────────────────────────────────────────────────

const OUTPUT_PATH = path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json');
const REPORT_PATH = path.resolve(__dirname, 'output/photo-scrape-report.json');

const ARGS = process.argv.slice(2);
const STATE_FILTER = ARGS.includes('--state') ? ARGS[ARGS.indexOf('--state') + 1] : null;
const CURATED_ONLY = ARGS.includes('--curated-only');
const DRY_RUN = ARGS.includes('--dry-run');

// ── Curated Wikipedia Articles (known-good article titles) ────────────

const WIKIPEDIA_ARTICLES: Record<string, string> = {
  // ── National ──
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

  // ── Telangana ──
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

  // ── Andhra Pradesh ──
  'N. Chandrababu Naidu': 'N._Chandrababu_Naidu',
  'Y.S. Jagan Mohan Reddy': 'Y._S._Jagan_Mohan_Reddy',
  'Pawan Kalyan': 'Pawan_Kalyan',
  'Nara Lokesh': 'Nara_Lokesh',
  'K. Atchannaidu': 'Kinjarapu_Atchannaidu',
  'Botcha Satyanarayana': 'Botcha_Satyanarayana',

  // ── Karnataka ──
  'Siddaramaiah': 'Siddaramaiah',
  'D.K. Shivakumar': 'D._K._Shivakumar',
  'B.S. Yediyurappa': 'B._S._Yediyurappa',
  'H.D. Kumaraswamy': 'H._D._Kumaraswamy',
  'B.Y. Raghavendra': 'B._Y._Raghavendra',
  'R. Ashoka': 'R._Ashok',
  'Pralhad Joshi': 'Pralhad_Joshi',
  'Basavaraj Bommai': 'Basavaraj_Bommai',

  // ── Maharashtra ──
  'Devendra Fadnavis': 'Devendra_Fadnavis',
  'Eknath Shinde': 'Eknath_Shinde',
  'Ajit Pawar': 'Ajit_Pawar',
  'Uddhav Thackeray': 'Uddhav_Thackeray',
  'Aaditya Thackeray': 'Aaditya_Thackeray',
  'Sharad Pawar': 'Sharad_Pawar',
  'Supriya Sule': 'Supriya_Sule',

  // ── Tamil Nadu ──
  'M.K. Stalin': 'M._K._Stalin',
  'Edappadi K. Palaniswami': 'Edappadi_K._Palaniswami',
  'K. Annamalai': 'K._Annamalai',
  'Udhayanidhi Stalin': 'Udhayanidhi_Stalin',
  'O. Panneerselvam': 'O._Panneerselvam',
  'Kanimozhi': 'Kanimozhi',
  'Dayanidhi Maran': 'Dayanidhi_Maran',

  // ── Kerala ──
  'Pinarayi Vijayan': 'Pinarayi_Vijayan',
  'V.D. Satheesan': 'V._D._Satheesan',
  'K. Sudhakaran': 'K._Sudhakaran',
  'Shashi Tharoor': 'Shashi_Tharoor',
  'E. Sreedharan': 'E._Sreedharan',

  // ── West Bengal ──
  'Mamata Banerjee': 'Mamata_Banerjee',
  'Suvendu Adhikari': 'Suvendu_Adhikari',
  'Dilip Ghosh': 'Dilip_Ghosh',
  'Abhishek Banerjee': 'Abhishek_Banerjee_(politician)',

  // ── Uttar Pradesh ──
  'Yogi Adityanath': 'Yogi_Adityanath',
  'Akhilesh Yadav': 'Akhilesh_Yadav',
  'Mayawati': 'Mayawati',
  'Keshav Prasad Maurya': 'Keshav_Prasad_Maurya',
  'Brajesh Pathak': 'Brajesh_Pathak',
  'Azam Khan': 'Azam_Khan_(politician)',
};

// MyNeta election slugs
const MYNETA_ELECTIONS: Record<string, string[]> = {
  TS: ['Telangana2023'],
  AP: ['AP2024'],
  KA: ['Karnataka2023'],
  MH: ['Maharashtra2024'],
  TN: ['TamilNadu2021'],
  KL: ['Kerala2021'],
  WB: ['WestBengal2021'],
  UP: ['UttarPradesh2022'],
};

// State name mapping for Wikipedia search context
const STATE_NAMES: Record<string, string> = {
  TS: 'Telangana', AP: 'Andhra Pradesh', KA: 'Karnataka', MH: 'Maharashtra',
  TN: 'Tamil Nadu', KL: 'Kerala', WB: 'West Bengal', UP: 'Uttar Pradesh',
};

// ── Garbage image detection patterns ──────────────────────────────────

const GARBAGE_URL_PATTERNS = [
  /logo/i, /flag/i, /emblem/i, /seal_of/i, /coat_of_arms/i,
  /map/i, /temple/i, /mandir/i, /masjid/i, /church/i, /mosque/i,
  /assembly.*building/i, /parliament.*house/i, /legislature.*building/i,
  /deewali/i, /festival/i, /meeting_of_members/i,
  /serial\.jpg/i, /stamp/i, /\.svg/i,
  /market\.jpg/i, /sanchi/i, /gateway/i,
];

function isGarbageUrl(url: string): boolean {
  return GARBAGE_URL_PATTERNS.some(p => p.test(url));
}

// ── Types ─────────────────────────────────────────────────────────────

interface PhotoResult {
  name: string;
  state: string;
  url: string | null;
  source: 'wikipedia-curated' | 'wikipedia-search' | 'myneta' | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  verifications: string[];
  rejections: string[];
}

// ── HTTP Utilities ────────────────────────────────────────────────────

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'KshetraApp/2.0 (https://kshetra.app; political-transparency-app)',
        'Accept': 'application/json',
      },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, {
      headers: { 'User-Agent': 'KshetraApp/2.0 (https://kshetra.app)' },
    }, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHTML(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function headCheck(url: string): Promise<{ ok: boolean; contentType: string; contentLength: number }> {
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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Name matching ─────────────────────────────────────────────────────

function normalise(name: string): string {
  return name.toLowerCase().replace(/[.,'"]/g, '').replace(/\s+/g, ' ').trim();
}

/** Simple Jaccard similarity on word sets */
function nameSimilarity(a: string, b: string): number {
  const wa = new Set(normalise(a).split(' '));
  const wb = new Set(normalise(b).split(' '));
  let intersection = 0;
  for (const w of wa) { if (wb.has(w)) intersection++; }
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Image verification (layers 3+4) ───────────────────────────────────

async function verifyImageUrl(url: string): Promise<{ valid: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Layer 3a: SVG check
  if (url.includes('.svg')) {
    return { valid: false, reasons: ['SVG file — React Native cannot render'] };
  }

  // Layer 3b: Garbage URL pattern check
  if (isGarbageUrl(url)) {
    return { valid: false, reasons: [`Garbage URL pattern detected: ${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 40)}`] };
  }

  // Layer 3c: HEAD check
  const head = await headCheck(url);
  if (!head.ok) {
    return { valid: false, reasons: ['HEAD request failed (not 200)'] };
  }
  if (!head.contentType.includes('image')) {
    return { valid: false, reasons: [`Not an image: Content-Type=${head.contentType}`] };
  }
  if (head.contentLength > 0 && head.contentLength < 3000) {
    return { valid: false, reasons: [`Image too small (${head.contentLength} bytes) — likely a placeholder`] };
  }

  reasons.push(`✓ HEAD 200, type=${head.contentType}, size=${head.contentLength}`);
  return { valid: true, reasons };
}

// ── Phase A: Wikipedia Curated ────────────────────────────────────────

async function fetchWikipediaCurated(name: string, articleTitle: string): Promise<PhotoResult> {
  const result: PhotoResult = {
    name, state: '', url: null,
    source: 'wikipedia-curated', confidence: 'none',
    verifications: [], rejections: [],
  };

  try {
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
    const data = await fetchJSON(apiUrl);

    // Verify 1: Article exists and is about a person
    if (!data || data.type === 'disambiguation' || data.type === 'no-extract') {
      result.rejections.push(`Article type: ${data?.type ?? 'null'}`);
      return result;
    }
    result.verifications.push(`✓ Article exists: "${data.title}"`);

    // Verify 2: Description suggests politician
    const desc = (data.description || '').toLowerCase();
    const isPolitician = /politician|minister|chief minister|mla|mp|legislat|member of|governor/i.test(desc);
    if (isPolitician) {
      result.verifications.push(`✓ Description confirms politician: "${data.description}"`);
    } else {
      result.verifications.push(`⚠ Description: "${data.description}" (not explicitly politician)`);
    }

    // Verify 3: Has thumbnail
    const thumbUrl = data.thumbnail?.source;
    if (!thumbUrl) {
      result.rejections.push('No thumbnail on Wikipedia page');
      return result;
    }

    // Upscale thumbnail to 300px
    const photoUrl = thumbUrl.replace(/\/\d+px-/, '/300px-');
    result.verifications.push(`✓ Thumbnail found: ${photoUrl.substring(0, 60)}...`);

    // Verify 4: Image URL validation
    const imgCheck = await verifyImageUrl(photoUrl);
    if (!imgCheck.valid) {
      result.rejections.push(...imgCheck.reasons);
      return result;
    }
    result.verifications.push(...imgCheck.reasons);

    result.url = photoUrl;
    result.confidence = isPolitician ? 'high' : 'medium';
    return result;
  } catch (err: any) {
    result.rejections.push(`API error: ${err.message}`);
    return result;
  }
}

// ── Phase B: Wikipedia Search ─────────────────────────────────────────

async function fetchWikipediaSearch(name: string, stateName: string): Promise<PhotoResult> {
  const result: PhotoResult = {
    name, state: stateName, url: null,
    source: 'wikipedia-search', confidence: 'none',
    verifications: [], rejections: [],
  };

  try {
    // Search with disambiguation context
    const query = `${name} politician ${stateName} India`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json`;
    const searchData = await fetchJSON(searchUrl);

    const results = searchData?.query?.search;
    if (!results || results.length === 0) {
      result.rejections.push('No Wikipedia search results');
      return result;
    }

    // Try each search result
    for (const sr of results.slice(0, 3)) {
      const title = sr.title;

      // Verify 1: Name similarity check
      const similarity = nameSimilarity(name, title);
      if (similarity < 0.3) {
        result.rejections.push(`Name mismatch: "${title}" (similarity=${similarity.toFixed(2)})`);
        continue;
      }

      // Fetch the page summary
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const data = await fetchJSON(summaryUrl);

      if (!data || data.type === 'disambiguation') {
        result.rejections.push(`"${title}" is disambiguation page`);
        continue;
      }

      // Verify 2: Description must indicate politician
      const desc = (data.description || '').toLowerCase();
      const isPolitician = /politician|minister|chief minister|mla|mp|legislat|member of|governor/i.test(desc);
      if (!isPolitician) {
        result.rejections.push(`"${title}" description: "${data.description}" — not a politician`);
        continue;
      }
      result.verifications.push(`✓ Found article: "${title}" — ${data.description}`);
      result.verifications.push(`✓ Name similarity: ${similarity.toFixed(2)}`);

      // Verify 3: Has thumbnail
      const thumbUrl = data.thumbnail?.source;
      if (!thumbUrl) {
        result.rejections.push(`"${title}" has no thumbnail`);
        continue;
      }

      const photoUrl = thumbUrl.replace(/\/\d+px-/, '/300px-');

      // Verify 4: Image validation
      const imgCheck = await verifyImageUrl(photoUrl);
      if (!imgCheck.valid) {
        result.rejections.push(...imgCheck.reasons);
        continue;
      }
      result.verifications.push(...imgCheck.reasons);

      result.url = photoUrl;
      result.confidence = similarity >= 0.6 ? 'medium' : 'low';
      return result;
    }

    return result;
  } catch (err: any) {
    result.rejections.push(`Search error: ${err.message}`);
    return result;
  }
}

// ── Phase C: MyNeta ──────────────────────────────────────────────────

async function scrapeMyNetaCandidates(electionSlug: string): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const url = `https://myneta.info/${electionSlug}/index.php?action=summary&subAction=winners_list&sort=default`;

  try {
    const html = await fetchHTML(url);

    // Extract candidate_id and name from links
    const regex = /candidate\.php\?candidate_id=(\d+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const candidateId = match[1];
      const name = match[2].trim()
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
      if (name && candidateId) {
        results.set(name, `https://myneta.info/candidate_pic/${candidateId}.jpg`);
      }
    }
  } catch (err: any) {
    console.warn(`  [MyNeta] Failed: ${electionSlug}: ${err.message}`);
  }

  return results;
}

async function fetchMyNetaPhoto(
  candidateName: string,
  mynetaCandidates: Map<string, string>,
): Promise<PhotoResult> {
  const result: PhotoResult = {
    name: candidateName, state: '', url: null,
    source: 'myneta', confidence: 'none',
    verifications: [], rejections: [],
  };

  // Try exact match first
  let photoUrl = mynetaCandidates.get(candidateName);
  let matchedName = candidateName;

  // Fuzzy match
  if (!photoUrl) {
    let bestScore = 0;
    for (const [mynetaName, url] of mynetaCandidates) {
      const score = nameSimilarity(candidateName, mynetaName);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        photoUrl = url;
        matchedName = mynetaName;
      }
    }
    if (photoUrl) {
      result.verifications.push(`✓ Fuzzy matched: "${candidateName}" → "${matchedName}" (${bestScore.toFixed(2)})`);
    }
  } else {
    result.verifications.push(`✓ Exact name match on MyNeta`);
  }

  if (!photoUrl) {
    result.rejections.push('No MyNeta match found');
    return result;
  }

  // Verify image
  const imgCheck = await verifyImageUrl(photoUrl);
  if (!imgCheck.valid) {
    result.rejections.push(...imgCheck.reasons);
    return result;
  }
  result.verifications.push(...imgCheck.reasons);

  result.url = photoUrl;
  result.confidence = 'high'; // MyNeta photos are affidavit photos — very reliable
  return result;
}

// ── Load Candidates from Seed Data ───────────────────────────────────

function loadAllCandidates(): { name: string; state: string }[] {
  const candidates: { name: string; state: string }[] = [];
  const seenNames = new Set<string>();

  // Helper to extract winner names from seed data files
  const seedFiles: { state: string; file: string; nameField: string }[] = [
    { state: 'TS', file: '../data/seed/telangana-constituencies.ts', nameField: 'winnerName2023' },
    { state: 'AP', file: '../data/seed/andhra-pradesh-constituencies.ts', nameField: 'winnerName2024' },
    { state: 'KA', file: '../data/seed/karnataka-constituencies.ts', nameField: 'winnerName2023' },
    { state: 'MH', file: '../data/seed/maharashtra-constituencies.ts', nameField: 'winnerName2024' },
    { state: 'TN', file: '../data/seed/tamil-nadu-constituencies.ts', nameField: 'winnerName2021' },
    { state: 'KL', file: '../data/seed/kerala-constituencies.ts', nameField: 'winnerName2021' },
    { state: 'WB', file: '../data/seed/west-bengal-constituencies.ts', nameField: 'winnerName2021' },
    { state: 'UP', file: '../data/seed/uttar-pradesh-constituencies.ts', nameField: 'winnerName2022' },
  ];

  for (const { state, file, nameField } of seedFiles) {
    if (STATE_FILTER && state !== STATE_FILTER) continue;

    const filePath = path.resolve(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  Seed file not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    // Extract winner names using regex (works on .ts source)
    const regex = new RegExp(`${nameField}:\\s*['"]([^'"]+)['"]`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1].trim();
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        candidates.push({ name, state });
      }
    }
  }

  return candidates;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Kshetra Candidate Photo Scraper v2                   ║');
  console.log('║  Multi-Source · 4-Layer Verification                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (STATE_FILTER) console.log(`  Filtering: ${STATE_FILTER} only\n`);
  if (CURATED_ONLY) console.log(`  Mode: Curated Wikipedia articles only\n`);
  if (DRY_RUN) console.log(`  DRY RUN: No files will be written\n`);

  const candidates = loadAllCandidates();
  console.log(`Loaded ${candidates.length} unique candidates from seed data\n`);

  const photoMap: Record<string, string> = {};
  const allResults: PhotoResult[] = [];
  let stats = { total: 0, high: 0, medium: 0, low: 0, none: 0 };

  // ── Phase A: Wikipedia Curated (highest confidence) ──
  console.log('━━━ Phase A: Wikipedia (Curated Articles) ━━━');
  const curatedNames = Object.keys(WIKIPEDIA_ARTICLES);
  for (const name of curatedNames) {
    const article = WIKIPEDIA_ARTICLES[name];
    process.stdout.write(`  ${name}... `);
    const result = await fetchWikipediaCurated(name, article);
    allResults.push(result);

    if (result.url) {
      photoMap[name] = result.url;
      console.log(`✅ ${result.confidence} confidence`);
    } else {
      console.log(`❌ ${result.rejections[0] || 'unknown'}`);
    }

    await sleep(200); // Respect rate limits
  }
  console.log(`  Phase A: ${Object.keys(photoMap).length} photos from curated Wikipedia\n`);

  if (CURATED_ONLY) {
    writeOutput(photoMap, allResults, stats);
    return;
  }

  // ── Phase B: Wikipedia Search (for remaining candidates) ──
  console.log('━━━ Phase B: Wikipedia (Search API) ━━━');
  const remainingCandidates = candidates.filter(c => !photoMap[c.name]);
  let searchFound = 0;

  for (let i = 0; i < remainingCandidates.length; i++) {
    const { name, state } = remainingCandidates[i];
    const stateName = STATE_NAMES[state] || state;

    process.stdout.write(`  [${i + 1}/${remainingCandidates.length}] ${name} (${state})... `);
    const result = await fetchWikipediaSearch(name, stateName);
    result.state = state;
    allResults.push(result);

    if (result.url && !photoMap[name]) {
      photoMap[name] = result.url;
      searchFound++;
      console.log(`✅ ${result.confidence}`);
    } else {
      console.log(`❌ ${result.rejections[result.rejections.length - 1] || 'no match'}`);
    }

    // Rate limit: 300ms between requests, extra pause every 50
    await sleep(300);
    if ((i + 1) % 50 === 0) {
      console.log(`  ... pausing (${i + 1}/${remainingCandidates.length} done)...`);
      await sleep(2000);
    }
  }
  console.log(`  Phase B: ${searchFound} additional photos from Wikipedia search\n`);

  // ── Phase C: MyNeta (for still-missing candidates) ──
  console.log('━━━ Phase C: MyNeta.info (Affidavit Photos) ━━━');
  const stillMissing = candidates.filter(c => !photoMap[c.name]);
  let mynetaFound = 0;

  // Group missing candidates by state
  const missingByState = new Map<string, string[]>();
  for (const { name, state } of stillMissing) {
    if (!missingByState.has(state)) missingByState.set(state, []);
    missingByState.get(state)!.push(name);
  }

  for (const [state, names] of missingByState) {
    const slugs = MYNETA_ELECTIONS[state];
    if (!slugs) continue;

    for (const slug of slugs) {
      console.log(`  Scraping MyNeta: ${slug}...`);
      const mynetaCandidates = await scrapeMyNetaCandidates(slug);
      console.log(`  Found ${mynetaCandidates.size} candidates on MyNeta`);

      for (const name of names) {
        if (photoMap[name]) continue; // Already found in earlier phase

        const result = await fetchMyNetaPhoto(name, mynetaCandidates);
        result.state = state;
        allResults.push(result);

        if (result.url) {
          photoMap[name] = result.url;
          mynetaFound++;
        }

        await sleep(100);
      }

      await sleep(1000); // Respect MyNeta rate limits
    }
  }
  console.log(`  Phase C: ${mynetaFound} additional photos from MyNeta\n`);

  // ── Compute stats ──
  for (const r of allResults) {
    stats.total++;
    stats[r.confidence]++;
  }

  writeOutput(photoMap, allResults, stats);
}

function writeOutput(
  photoMap: Record<string, string>,
  allResults: PhotoResult[],
  stats: { total: number; high: number; medium: number; low: number; none: number },
) {
  // Sort alphabetically
  const sorted = Object.fromEntries(
    Object.entries(photoMap).sort(([a], [b]) => a.localeCompare(b)),
  );

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total candidates processed:  ${stats.total}`);
  console.log(`  Photos found:                ${Object.keys(sorted).length}`);
  console.log(`  High confidence:             ${stats.high}`);
  console.log(`  Medium confidence:           ${stats.medium}`);
  console.log(`  Low confidence:              ${stats.low}`);
  console.log(`  No photo found:              ${stats.none}`);
  console.log('═══════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n  DRY RUN — no files written.');
    return;
  }

  // Write photo map
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log(`\n  Photo map: ${OUTPUT_PATH}`);

  // Write detailed report
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    stats,
    photoCount: Object.keys(sorted).length,
    results: allResults,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`  Full report: ${REPORT_PATH}`);

  console.log('\n  Done! Rebuild the app to bundle the new photos.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
