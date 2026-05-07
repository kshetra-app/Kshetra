#!/usr/bin/env npx ts-node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Candidate Photo Scraper                                           ║
 * ║  Sources: MyNeta.info (ADR) + Official State Legislature Websites  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * USAGE:
 *   npx ts-node scripts/scrape-candidate-photos.ts
 *
 * OUTPUT:
 *   apps/mobile/data/candidate-photo-map.json
 *
 * This script:
 *  1. Loads all candidate names from seed data (all 8 states)
 *  2. Scrapes MyNeta.info election pages for candidate photo URLs
 *  3. Scrapes official state legislature sites for MLA photo URLs
 *  4. Validates each URL (HEAD request to confirm image exists)
 *  5. Writes a JSON map: { "Candidate Name": "photo_url", ... }
 *
 * RE-RUN periodically to pick up new photos or after election updates.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ── Configuration ─────────────────────────────────────────────────────

/** MyNeta election page slugs per state */
const MYNETA_ELECTIONS: Record<string, string[]> = {
  TS: ['Telangana2023', 'Telangana2018'],
  AP: ['AP2024', 'AP2019'],
  KA: ['Karnataka2023', 'Karnataka2018'],
  MH: ['Maharashtra2024', 'Maharashtra2019'],
  TN: ['TamilNadu2021', 'TamilNadu2016'],
  KL: ['Kerala2021', 'Kerala2016'],
  WB: ['WestBengal2021', 'WestBengal2016'],
  UP: ['UttarPradesh2022', 'UttarPradesh2017'],
};

/** Official state legislature websites with known MLA photo patterns */
const LEGISLATURE_SITES: Record<string, {
  baseUrl: string;
  membersPath: string;
  description: string;
}> = {
  TS: {
    baseUrl: 'https://telanganalegislature.org.in',
    membersPath: '/members',
    description: 'Telangana Legislature',
  },
  AP: {
    baseUrl: 'https://aplegislature.org',
    membersPath: '/web/appla/members',
    description: 'Andhra Pradesh Legislature',
  },
  KA: {
    baseUrl: 'https://kla.kar.nic.in',
    membersPath: '/assembly/members',
    description: 'Karnataka Legislative Assembly',
  },
  MH: {
    baseUrl: 'https://mls.org.in',
    membersPath: '/members',
    description: 'Maharashtra Legislature Secretariat',
  },
  TN: {
    baseUrl: 'https://assembly.tn.gov.in',
    membersPath: '/members',
    description: 'Tamil Nadu Legislative Assembly',
  },
  KL: {
    baseUrl: 'https://niyamasabha.nic.in',
    membersPath: '/members',
    description: 'Kerala Niyamasabha',
  },
  WB: {
    baseUrl: 'https://wbassembly.gov.in',
    membersPath: '/members',
    description: 'West Bengal Legislative Assembly',
  },
  UP: {
    baseUrl: 'https://uplegisassembly.gov.in',
    membersPath: '/members',
    description: 'Uttar Pradesh Legislative Assembly',
  },
};

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../apps/mobile/data/candidate-photo-map.json',
);

const photoMap: Record<string, string> = {};
let successCount = 0;
let failCount = 0;

// ── HTTP Utilities ────────────────────────────────────────────────────

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Kshetra-Photo-Scraper/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Kshetra-Photo-Scraper/1.0' } }, (res) => {
      const ct = res.headers['content-type'] || '';
      resolve(res.statusCode === 200 && ct.includes('image'));
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── MyNeta Scraper ────────────────────────────────────────────────────

/**
 * Scrape MyNeta election page to find candidate IDs and photo URLs.
 * MyNeta HTML structure: each candidate row has:
 *   <a href="candidate.php?candidate_id=XXXX">Candidate Name</a>
 *   Photo URL: https://myneta.info/candidate_pic/XXXX.jpg
 */
async function scrapeMyNeta(electionSlug: string): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const url = `https://myneta.info/${electionSlug}/index.php?action=summary&subAction=winners_list&sort=default`;

  console.log(`  [MyNeta] Fetching winners from ${electionSlug}...`);

  try {
    const html = await fetchPage(url);

    // Extract candidate_id and name from links
    // Pattern: <a href="candidate.php?candidate_id=XXXX">NAME</a>
    const regex = /candidate\.php\?candidate_id=(\d+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const candidateId = match[1];
      const name = match[2].trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'");
      if (name && candidateId) {
        const photoUrl = `https://myneta.info/candidate_pic/${candidateId}.jpg`;
        results[name] = photoUrl;
      }
    }

    console.log(`  [MyNeta] Found ${Object.keys(results).length} candidates in ${electionSlug}`);
  } catch (err: any) {
    console.warn(`  [MyNeta] Failed to scrape ${electionSlug}: ${err.message}`);
  }

  return results;
}

// ── Legislature Site Scraper ──────────────────────────────────────────

/**
 * Attempt to scrape MLA photos from official state legislature websites.
 * Each site has a different structure, so this uses heuristic parsing.
 */
async function scrapeLegislatureSite(
  stateCode: string,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const site = LEGISLATURE_SITES[stateCode];
  if (!site) return results;

  const url = `${site.baseUrl}${site.membersPath}`;
  console.log(`  [Legislature] Fetching ${site.description}: ${url}`);

  try {
    const html = await fetchPage(url);

    // Heuristic: find <img> tags near member names
    // Common patterns:
    //   <img src="/uploads/members/XXXX.jpg" ... />
    //   <img src="/images/mla/XXXX.jpg" ... />
    const imgRegex = /<img[^>]*src=["']([^"']*(?:member|mla|photo|pic|image)[^"']*)["'][^>]*>/gi;
    const nameRegex = /<(?:h[1-6]|td|span|div|a)[^>]*class=["'][^"']*(?:name|member|title)[^"']*["'][^>]*>([^<]+)</gi;

    const images: string[] = [];
    let m;
    while ((m = imgRegex.exec(html)) !== null) {
      let imgUrl = m[1];
      if (!imgUrl.startsWith('http')) {
        imgUrl = `${site.baseUrl}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
      }
      images.push(imgUrl);
    }

    const names: string[] = [];
    while ((m = nameRegex.exec(html)) !== null) {
      names.push(m[1].trim());
    }

    // Match names to images (1:1 if counts match)
    if (names.length > 0 && names.length === images.length) {
      for (let i = 0; i < names.length; i++) {
        results[names[i]] = images[i];
      }
    }

    console.log(`  [Legislature] Found ${Object.keys(results).length} photos from ${site.description}`);
  } catch (err: any) {
    console.warn(`  [Legislature] Failed to scrape ${site.description}: ${err.message}`);
  }

  return results;
}

// ── Validation ────────────────────────────────────────────────────────

async function validatePhotos(
  candidates: Record<string, string>,
  batchSize = 10,
): Promise<Record<string, string>> {
  const validated: Record<string, string> = {};
  const entries = Object.entries(candidates);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const checks = await Promise.all(
      batch.map(async ([name, url]) => {
        const exists = await checkImageExists(url);
        return { name, url, exists };
      }),
    );

    for (const { name, url, exists } of checks) {
      if (exists) {
        validated[name] = url;
        successCount++;
      } else {
        failCount++;
      }
    }

    // Rate-limit: wait between batches
    if (i + batchSize < entries.length) {
      await sleep(500);
    }
  }

  return validated;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Kshetra Candidate Photo Scraper         ║');
  console.log('║  Sources: MyNeta + State Legislatures    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // Load existing map (to preserve manually added entries)
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    Object.assign(photoMap, existing);
    console.log(`Loaded ${Object.keys(photoMap).length} existing entries\n`);
  } catch {
    console.log('No existing photo map found, starting fresh\n');
  }

  // ── Phase 1: MyNeta scraping ──
  console.log('Phase 1: Scraping MyNeta.info (ADR election data)...');
  for (const [stateCode, slugs] of Object.entries(MYNETA_ELECTIONS)) {
    for (const slug of slugs) {
      const candidates = await scrapeMyNeta(slug);
      // Validate photos in batches
      const valid = await validatePhotos(candidates);
      Object.assign(photoMap, valid);
      await sleep(1000); // Be respectful to MyNeta servers
    }
  }

  console.log(`\nPhase 1 complete: ${successCount} valid photos, ${failCount} invalid\n`);
  const phase1Count = successCount;

  // ── Phase 2: Legislature site scraping ──
  console.log('Phase 2: Scraping official state legislature websites...');
  for (const stateCode of Object.keys(LEGISLATURE_SITES)) {
    const candidates = await scrapeLegislatureSite(stateCode);
    if (Object.keys(candidates).length > 0) {
      const valid = await validatePhotos(candidates);
      // Only add if not already in map (MyNeta takes priority)
      for (const [name, url] of Object.entries(valid)) {
        if (!photoMap[name]) {
          photoMap[name] = url;
        }
      }
    }
    await sleep(1000);
  }

  const phase2Count = successCount - phase1Count;
  console.log(`\nPhase 2 complete: ${phase2Count} additional photos from legislature sites\n`);

  // ── Write output ──
  // Sort keys alphabetically for readability
  const sorted = Object.fromEntries(
    Object.entries(photoMap).sort(([a], [b]) => a.localeCompare(b)),
  );

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), 'utf-8');

  console.log('═══════════════════════════════════════════');
  console.log(`Total photos in map: ${Object.keys(sorted).length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════');
  console.log('\nDone! The mobile app will use these photos on next build.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
