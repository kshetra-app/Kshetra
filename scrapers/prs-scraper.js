#!/usr/bin/env node
/**
 * PRS India Scraper — MLA/MP Photos + Profile Data
 * ══════════════════════════════════════════════════════════════════════
 * Source: prsindia.org (PRS Legislative Research)
 * Data:   Photos (100% coverage), age, constituency, party, gender, education,
 *         questions asked, debates, attendance, bills
 *
 * Usage:
 *   node scrapers/prs-scraper.js                   # All states
 *   node scrapers/prs-scraper.js --state=TS         # Single state
 *   node scrapers/prs-scraper.js --mp               # Lok Sabha MPs
 */

const cheerio = require('cheerio');
const { STATES } = require('./config');
const { httpGet, httpHead, sleep, ensureDir, writeJSON, readJSON, normalizeParty, progressLog } = require('./utils');
const path = require('path');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const mpMode = args.includes('--mp');

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'prs');

// ── Get MLA list from PRS India ────────────────────────────────────────
async function getMLAList(prsStateName, assemblyTerm) {
  const url = `https://prsindia.org/mlatrack?state=${encodeURIComponent(prsStateName)}&assembly_term=${assemblyTerm}`;
  const html = await httpGet(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const mlas = [];

  // MLA links are in the main content area
  $('a[href*="/mlatrack/"]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim();
    if (!href || !name || name.length < 2) return;
    const slug = href.split('/mlatrack/')[1];
    if (!slug || slug.includes('?') || slug.includes('state=')) return;
    // Skip navigation/filter links
    if (['mlatrack', 'mptrack', ''].includes(slug)) return;
    mlas.push({ name, slug, profileUrl: `https://prsindia.org/mlatrack/${slug}` });
  });

  // Deduplicate by slug
  const seen = new Set();
  return mlas.filter(m => { if (seen.has(m.slug)) return false; seen.add(m.slug); return true; });
}

// ── Get MP list from PRS India ─────────────────────────────────────────
async function getMPList() {
  const url = 'https://prsindia.org/mptrack';
  const html = await httpGet(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const mps = [];

  $('a[href*="/mptrack/"]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim();
    if (!href || !name || name.length < 2) return;
    const slug = href.split('/mptrack/')[1];
    if (!slug || slug.includes('?')) return;
    mps.push({ name, slug, profileUrl: `https://prsindia.org/mptrack/${slug}` });
  });

  const seen = new Set();
  return mps.filter(m => { if (seen.has(m.slug)) return false; seen.add(m.slug); return true; });
}

// ── Parse individual MLA/MP profile page ───────────────────────────────
async function parseProfile(profileUrl, isMP = false) {
  const html = await httpGet(profileUrl);
  if (!html) return null;

  const $ = cheerio.load(html);
  const data = {};

  // Age
  const ageText = $('[class*="field-mla-age"] .field-item, [class*="field-mp-age"] .field-item').first().text().trim();
  if (ageText) data.age = parseInt(ageText);

  // Gender
  const genderLink = $('a[href*="gender="]').first().text().trim();
  if (genderLink) data.gender = genderLink;

  // Constituency
  const constText = $('[class*="field-mla-constituency"] .field-item, [class*="field-mp-constituency"] .field-item').first().text().trim();
  if (constText) data.constituency = constText;

  // Party
  const partyText = $('[class*="field-mla-party"] .field-item, [class*="field-mp-party"] .field-item').first().text().trim();
  if (partyText) data.party = partyText;

  // Education
  const eduText = $('[class*="field-mla-education"] .field-item, [class*="field-mp-education"] .field-item').first().text().trim();
  if (eduText) data.education = eduText;

  // Performance data
  const qText = $('[class*="field-mla-questions"] .field-item, [class*="field-mp-questions"] .field-item').first().text().trim();
  if (qText) data.questionsAsked = parseInt(qText) || 0;

  const dText = $('[class*="field-mla-debates"] .field-item, [class*="field-mp-debates"] .field-item').first().text().trim();
  if (dText) data.debates = parseInt(dText) || 0;

  const aText = $('[class*="field-mla-attendance"] .field-item, [class*="field-mp-attendance"] .field-item').first().text().trim();
  if (aText) data.attendance = parseInt(aText) || 0;

  const bText = $('[class*="field-mla-bills"] .field-item, [class*="field-mp-private-member"] .field-item').first().text().trim();
  if (bText) data.privateBills = parseInt(bText) || 0;

  // Photo URL — look for MLA/MP image
  const imgSrc = $('img[src*="mla_images"], img[src*="mp_images"], img[src*="mlatrack"], img[src*="mptrack"]').first().attr('src');
  if (imgSrc) {
    data.photoUrl = imgSrc.startsWith('http') ? imgSrc : `https://prsindia.org${imgSrc}`;
  }

  return data;
}

// ── Construct photo URL directly (faster than parsing profile) ─────────
function buildPhotoUrl(name, prsStateName, term, isMP = false) {
  const stateSlug = prsStateName.toLowerCase().replace(/\s+/g, '-');
  if (isMP) {
    return `https://prsindia.org/files/mptrack/mp_images/${encodeURIComponent(name)}.jpg`;
  }
  return `https://prsindia.org/files/mlatrack/${stateSlug}/${term}/mla_images/${encodeURIComponent(name)}.jpg`;
}

// ── Scrape a state ─────────────────────────────────────────────────────
async function scrapeState(state) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${state.name} (${state.code}) — PRS India`);
  console.log(`${'─'.repeat(60)}`);

  const mlas = await getMLAList(state.prsName, state.prsTerm);
  console.log(`   Found ${mlas.length} MLAs`);

  if (mlas.length === 0) return [];

  const results = [];

  for (let i = 0; i < mlas.length; i++) {
    const mla = mlas[i];
    progressLog(i + 1, mlas.length, mla.name);

    const record = {
      name: mla.name,
      slug: mla.slug,
      stateCode: state.code,
      stateName: state.name,
      profileUrl: mla.profileUrl,
    };

    // Try direct photo URL first (much faster)
    const photoUrl = buildPhotoUrl(mla.name, state.prsName, state.prsTerm);
    const photoStatus = await httpHead(photoUrl);
    if (photoStatus === 200) {
      record.photoUrl = photoUrl;
    }

    // Parse profile for age and other data
    try {
      const profile = await parseProfile(mla.profileUrl);
      if (profile) {
        Object.assign(record, profile);
        // Override photo if profile has one and direct URL failed
        if (!record.photoUrl && profile.photoUrl) record.photoUrl = profile.photoUrl;
      }
    } catch (err) {
      record.error = err.message;
    }

    results.push(record);
    await sleep(200); // Be polite to PRS
  }

  console.log(`\n   ✅ ${results.length} MLAs, ${results.filter(r => r.photoUrl).length} photos`);
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔬 PRS India Scraper — MLA/MP Photos & Profiles');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  if (mpMode) {
    // Scrape Lok Sabha MPs
    console.log('\n📋 Scraping Lok Sabha MPs...');
    const mps = await getMPList();
    console.log(`   Found ${mps.length} MPs`);

    const results = [];
    for (let i = 0; i < mps.length; i++) {
      const mp = mps[i];
      progressLog(i + 1, mps.length, mp.name);

      const record = { name: mp.name, slug: mp.slug, profileUrl: mp.profileUrl };

      // Direct photo URL
      const photoUrl = `https://prsindia.org/files/mptrack/mp_images/${encodeURIComponent(mp.name)}.jpg`;
      const photoStatus = await httpHead(photoUrl);
      if (photoStatus === 200) record.photoUrl = photoUrl;

      try {
        const profile = await parseProfile(mp.profileUrl, true);
        if (profile) Object.assign(record, profile);
      } catch {}

      results.push(record);
      await sleep(200);
    }

    writeJSON(path.join(OUTPUT_BASE, 'lok-sabha-mps.json'), results);
    console.log(`\n   ✅ ${results.length} MPs, ${results.filter(r => r.photoUrl).length} photos`);
  } else {
    // Scrape MLAs
    const filteredStates = stateFilter
      ? STATES.filter(s => s.code === stateFilter.toUpperCase())
      : STATES;

    const photoMap = {};

    for (const state of filteredStates) {
      const results = await scrapeState(state);
      writeJSON(path.join(OUTPUT_BASE, `${state.code}-mlas.json`), results);

      // Add to photo map
      for (const r of results) {
        if (r.photoUrl) photoMap[r.name] = r.photoUrl;
      }
    }

    // Merge with existing photo map
    const existingPhotos = readJSON(path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json')) || {};
    // PRS photos are fallback — don't overwrite MyNeta photos
    const merged = { ...photoMap, ...existingPhotos };
    writeJSON(path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json'), merged);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✨ PRS Scraping Complete — Photo map: ${Object.keys(merged).length} entries`);
  }
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
