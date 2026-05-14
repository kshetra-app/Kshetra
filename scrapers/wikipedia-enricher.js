#!/usr/bin/env node
/**
 * Wikipedia Enricher — DOB, gender, religion, minister status, dynasty
 * ══════════════════════════════════════════════════════════════════════
 * Goes beyond basic DOB to extract every infobox field:
 *   - DOB (birth_date), gender, religion, spouse name
 *   - Current office / minister position
 *   - Political party history (with years)
 *   - Family members in politics (dynasty detection)
 *   - Residence, alma mater
 *
 * Usage:
 *   node scrapers/wikipedia-enricher.js --state=TS
 *   node scrapers/wikipedia-enricher.js --names=names.json  (custom name list)
 */

const { httpGet, sleep, ensureDir, writeJSON, readJSON, normalizeName, nameSimilarity } = require('./utils');
const { STATES } = require('./config');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const namesFile = args.find(a => a.startsWith('--names='))?.split('=')[1];

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'wiki-enriched');
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06', july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

// ── Parse full Wikipedia infobox ───────────────────────────────────────
function parseInfobox(wikitext) {
  const r = {};

  // DOB
  const m1 = wikitext.match(/birth[_ ]date(?:[_ ]and[_ ]age)?\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
  if (m1) r.dob = `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  if (!r.dob) {
    const m2 = wikitext.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (m2) r.dob = `${m2[3]}-${MONTHS[m2[2].toLowerCase()]}-${m2[1].padStart(2, '0')}`;
  }
  if (!r.dob) {
    const m3 = wikitext.match(/birth_year\s*=\s*(\d{4})/i);
    if (m3) r.dob = `${m3[1]}-01-01`;
  }

  // Gender
  const genderM = wikitext.match(/\|\s*gender\s*=\s*([^\n|]+)/i);
  if (genderM) r.gender = genderM[1].trim().toLowerCase();

  // Religion
  const relM = wikitext.match(/\|\s*religion\s*=\s*([^\n|{]+)/i);
  if (relM) r.religion = relM[1].replace(/\[|\]/g, '').trim();

  // Spouse
  const spouseM = wikitext.match(/\|\s*spouse\s*=\s*([^\n|{]+)/i);
  if (spouseM) {
    r.spouseName = spouseM[1].replace(/\[|\]|\{|\}/g, '').replace(/\(.*?\)/g, '').trim();
    if (r.spouseName.length > 1) r.maritalStatus = 'married';
  }

  // Children count
  const childM = wikitext.match(/\|\s*children\s*=\s*(\d+|[^\n|{]+)/i);
  if (childM) {
    const n = parseInt(childM[1]);
    r.children = isNaN(n) ? childM[1].trim() : n;
  }

  // Current office (minister, CM, etc.)
  const officeM = wikitext.match(/\|\s*office\s*=\s*([^\n|{]+)/i);
  if (officeM) {
    const office = officeM[1].replace(/\[|\]/g, '').trim();
    r.currentOffice = office;
    r.isCabinetMinister = /minister|cabinet|secretary/i.test(office);
    r.isChiefMinister = /chief minister/i.test(office);
    r.isGovernor = /governor/i.test(office);
    r.isSpeaker = /speaker/i.test(office);
  }

  // All offices (multiple)
  const offices = [...wikitext.matchAll(/\|\s*office\d*\s*=\s*([^\n|{]+)/gi)];
  r.allOffices = offices.map(m => m[1].replace(/\[|\]/g, '').trim()).filter(o => o.length > 2);

  // Party
  const partyM = wikitext.match(/\|\s*party\s*=\s*([^\n|{]+)/i);
  if (partyM) r.party = partyM[1].replace(/\[|\]/g, '').trim();

  // Previous parties (otherparty, otherparty1, etc.)
  const prevParties = [...wikitext.matchAll(/\|\s*(?:other[_ ]?party\d*|previous[_ ]?party)\s*=\s*([^\n|{]+)/gi)];
  r.previousParties = prevParties.map(m => m[1].replace(/\[|\]/g, '').trim()).filter(p => p.length > 1);

  // Alma mater
  const almaM = wikitext.match(/\|\s*alma[_ ]?mater\s*=\s*([^\n|{]+)/i);
  if (almaM) r.almaMater = almaM[1].replace(/\[|\]/g, '').trim();

  // Residence
  const resM = wikitext.match(/\|\s*residence\s*=\s*([^\n|{]+)/i);
  if (resM) r.residence = resM[1].replace(/\[|\]/g, '').trim();

  // Term start/end
  const termStartM = wikitext.match(/\|\s*term_start\s*=\s*([^\n|{]+)/i);
  if (termStartM) r.termStart = termStartM[1].trim();
  const termEndM = wikitext.match(/\|\s*term_end\s*=\s*([^\n|{]+)/i);
  if (termEndM) r.termEnd = termEndM[1].trim();

  // Death date (for deceased)
  const deathM = wikitext.match(/death[_ ]date/i);
  if (deathM) r.isDeceased = true;

  return r;
}

// ── Extract dynasty/family info from article text ──────────────────────
function extractDynastyInfo(wikitext) {
  const family = [];
  const politicalRelations = [
    { pattern: /(?:father|father-in-law)[^.]*?(?:was|is|served as)\s+(?:a\s+)?(?:member|minister|chief minister|MLA|MP|MLC|leader|politician)/gi, relation: 'father' },
    { pattern: /(?:mother)[^.]*?(?:was|is|served as)\s+(?:a\s+)?(?:member|minister|chief minister|MLA|MP|MLC|leader|politician)/gi, relation: 'mother' },
    { pattern: /(?:son|daughter)\s+of\s+(?:former\s+)?(?:chief minister|minister|MLA|MP|politician)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, relation: 'parent' },
    { pattern: /(?:brother|sister|sibling)[^.]*?(?:is|was)\s+(?:also\s+)?(?:a\s+)?(?:member|minister|MLA|MP|MLC|politician)/gi, relation: 'sibling' },
    { pattern: /(?:spouse|wife|husband)[^.]*?(?:is|was)\s+(?:also\s+)?(?:a\s+)?(?:member|minister|MLA|MP|MLC|politician)/gi, relation: 'spouse' },
  ];

  let isDynast = false;
  for (const { pattern, relation } of politicalRelations) {
    const matches = wikitext.match(pattern);
    if (matches) {
      isDynast = true;
      family.push({ relation, mention: matches[0].substring(0, 100) });
    }
  }

  return { isDynast, family };
}

// ── Search Wikipedia for a politician name ─────────────────────────────
async function searchWikipedia(name) {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=5&format=json`;
  const json = await httpGet(url);
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    const titles = data[1] || [];
    // Find the most likely politician article
    for (const t of titles) {
      if (/politician|minister|MLA|MP|member|legislative/i.test(t)) return t;
    }
    return titles[0] || null;
  } catch { return null; }
}

// ── Full enrich for a single name ──────────────────────────────────────
async function enrichProfile(name) {
  // Search for Wikipedia article
  const articleTitle = await searchWikipedia(name);
  if (!articleTitle) return { name, found: false };

  // Get wikitext
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(articleTitle)}&prop=wikitext&format=json`;
  const json = await httpGet(url);
  if (!json) return { name, found: false };

  let wikitext = '';
  try {
    const data = JSON.parse(json);
    wikitext = data?.parse?.wikitext?.['*'] || '';
  } catch { return { name, found: false }; }

  if (!wikitext) return { name, found: false };

  // Parse infobox
  const infobox = parseInfobox(wikitext);

  // Extract dynasty
  const dynasty = extractDynastyInfo(wikitext);

  // Get photo
  let photoUrl = null;
  try {
    const summaryJson = await httpGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`, {
      headers: { 'Api-User-Agent': 'KshetraApp/1.0' }
    });
    if (summaryJson) {
      const summary = JSON.parse(summaryJson);
      photoUrl = summary?.thumbnail?.source || null;
    }
  } catch {}

  return {
    name,
    found: true,
    articleTitle,
    articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`,
    dob: infobox.dob || null,
    gender: infobox.gender || null,
    religion: infobox.religion || null,
    spouseName: infobox.spouseName || null,
    maritalStatus: infobox.maritalStatus || null,
    children: infobox.children || null,
    currentOffice: infobox.currentOffice || null,
    allOffices: infobox.allOffices || [],
    isCabinetMinister: infobox.isCabinetMinister || false,
    isChiefMinister: infobox.isChiefMinister || false,
    party: infobox.party || null,
    previousParties: infobox.previousParties || [],
    almaMater: infobox.almaMater || null,
    residence: infobox.residence || null,
    termStart: infobox.termStart || null,
    termEnd: infobox.termEnd || null,
    isDeceased: infobox.isDeceased || false,
    isDynast: dynasty.isDynast,
    familyInPolitics: dynasty.family,
    photoUrl,
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('📖 Wikipedia Enricher — Full Infobox + Dynasty');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  // Collect names from MyNeta deep data
  let names = [];

  if (namesFile) {
    names = readJSON(namesFile) || [];
  } else {
    const deepDir = path.join(__dirname, 'output', 'myneta-deep');
    const basicDir = path.join(__dirname, 'output', 'myneta');
    const dir = fs.existsSync(deepDir) ? deepDir : basicDir;

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
      const filteredFiles = stateFilter
        ? files.filter(f => f.toLowerCase().includes(STATES.find(s => s.code === stateFilter.toUpperCase())?.mynetaKeys[0]?.toLowerCase() || '???'))
        : files;

      for (const file of filteredFiles) {
        const data = readJSON(path.join(dir, file)) || [];
        for (const r of data) {
          const name = r.mynetaName || r.name;
          if (name && name.length > 3) names.push(name);
        }
      }
    }
  }

  // Deduplicate
  names = [...new Set(names)];
  console.log(`\n📊 Names to enrich: ${names.length}`);

  const results = {};
  let found = 0, withDOB = 0, withGender = 0, dynastCount = 0;

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    process.stdout.write(`\r   [${i + 1}/${names.length}] ${name.substring(0, 40).padEnd(40)}`);

    try {
      const enriched = await enrichProfile(name);
      results[name] = enriched;
      if (enriched.found) {
        found++;
        if (enriched.dob) withDOB++;
        if (enriched.gender) withGender++;
        if (enriched.isDynast) dynastCount++;
      }
    } catch {}

    await sleep(150);
  }

  // Save results
  const stateCode = stateFilter?.toUpperCase() || 'ALL';
  writeJSON(path.join(OUTPUT_BASE, `${stateCode}-enriched.json`), results);

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log('📊 ENRICHMENT SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Names searched:     ${names.length}`);
  console.log(`   Wikipedia found:    ${found}`);
  console.log(`   With DOB:           ${withDOB}`);
  console.log(`   With gender:        ${withGender}`);
  console.log(`   Dynasty detected:   ${dynastCount}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
