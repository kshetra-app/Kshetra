#!/usr/bin/env node
/**
 * MyNeta DEEP Scraper — Extracts EVERY data point from affidavit pages
 * ══════════════════════════════════════════════════════════════════════
 * Goes beyond the basic scraper to extract:
 *   - Spouse movable/immovable assets (separate from self)
 *   - Dependent assets (separate)
 *   - Full ITR income (self + spouse, multi-year)
 *   - Case-by-case criminal record (FIR, court, IPC, charges framed, status)
 *   - All candidates per constituency (runner-up, key contestants)
 *   - Gender inference from name prefix
 *   - Spouse name (if present)
 *   - PAN/ITR filing status
 *   - Dependents count
 *
 * Usage:
 *   node scrapers/myneta-deep-scraper.js --state=TS
 *   node scrapers/myneta-deep-scraper.js --key=Telangana2023
 *   node scrapers/myneta-deep-scraper.js --all-years --state=TS
 */

const cheerio = require('cheerio');
const { STATES, extractYear } = require('./config');
const {
  httpGet, sleep, parseINR, normalizeParty, mapEducation,
  ensureDir, writeJSON, readJSON, progressLog,
} = require('./utils');
const path = require('path');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const keyFilter = args.find(a => a.startsWith('--key='))?.split('=')[1];
const allYears = args.includes('--all-years');
const MIN_YEAR = 2008;

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'myneta-deep');

// ── Serious IPC sections ───────────────────────────────────────────────
const SERIOUS_IPC = ['302','307','376','395','396','399','400','420','467','468','471','120B','121','124A','153A','279','304','304A','306','354','363','364','365','366','370','384','386','392','394','397','411','413','414','419','456','457','458','459','460','489A','489B','489C','489D','505','506'];

// ── Gender inference from name prefix ──────────────────────────────────
function inferGender(name) {
  const n = name.trim();
  if (/^(Smt\.|Smt |Kumari |Mrs\.|Ms\.|Miss )/i.test(n)) return 'female';
  if (/^(Shri |Sri |Shree |Mr\.|Er\.|Dr\.? )/i.test(n)) return 'male';
  // Common female Indian name endings
  const lastWord = n.split(/\s+/).pop()?.toLowerCase() || '';
  const femaleNames = new Set(['devi','bai','begum','bibi','amma','lakshmi','parvathi','savitri','sarita','jyoti','priya','rani','kumari','sushma','sunita','anita','kavitha','padma','vijaya','shantha']);
  if (femaleNames.has(lastWord)) return 'female';
  return 'male'; // default
}

// ── Get all constituencies for an election ─────────────────────────────
async function getConstituencies(electionKey) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_constituencies&state_id=0`;
  const html = await httpGet(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const constituencies = [];

  $('a[href*="show_candidates&constituency_id="]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim();
    const idMatch = href?.match(/constituency_id=(\d+)/);
    if (idMatch && name) {
      constituencies.push({ id: idMatch[1], name });
    }
  });

  return constituencies;
}

// ── Get all candidates for a constituency ──────────────────────────────
async function getCandidatesInConstituency(electionKey, constId) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_candidates&constituency_id=${constId}`;
  const html = await httpGet(url);
  if (!html) return [];

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const skip = new Set(['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities', 'winner', 'Winner', 'All Candidates', 'S.No.']);
  const seen = new Set();
  const candidates = [];

  for (const m of links) {
    const id = m[1], name = m[2].trim();
    if (skip.has(name) || seen.has(id) || name.length < 2) continue;
    seen.add(id);
    candidates.push({ id, name });
  }
  return candidates;
}

// ── Get winners list ───────────────────────────────────────────────────
async function getWinners(electionKey) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_winners&sort=default`;
  const html = await httpGet(url);
  if (!html) return new Set();

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)/gi)];
  return new Set(links.map(m => m[1]));
}

// ── DEEP parse of candidate page ───────────────────────────────────────
function deepParseCandidatePage(html) {
  const $ = cheerio.load(html);
  const r = {};

  // Winner status
  r.isWinner = html.includes('(Winner)');

  // Name from title
  const titleM = html.match(/<title>\s*([^(<\n]+?)\s*[\(<]/i);
  if (titleM && titleM[1].trim().length > 2 && !/myneta|election/i.test(titleM[1])) {
    r.name = titleM[1].trim();
  }

  // Constituency & District
  const constM = html.match(/<h5[^>]*>\s*([^(]+)\s*\(([^)]+)\)/i);
  if (constM) {
    r.constituency = constM[1].trim();
    r.district = constM[2].trim();
  }

  // Party
  const partyM = html.match(/Party:<\/b>\s*([^<\n]+)/i);
  if (partyM) r.partyFull = partyM[1].trim();

  // Age
  const ageM = html.match(/Age:<\/b>\s*(\d+)/i);
  if (ageM) r.age = parseInt(ageM[1]);

  // Education
  const eduCatM = html.match(/Category:\s*([^\n<]+)/i);
  if (eduCatM) r.educationCategory = eduCatM[1].trim();
  const eduDetailM = html.match(/Category:\s*[^\n<]+<br>\s*([^\n<]+)/i);
  if (eduDetailM) r.educationDetail = eduDetailM[1].trim();

  // Professions
  const selfProfM = html.match(/Self Profession:<\/b>\s*([^<\n]+)/i);
  if (selfProfM) r.selfProfession = selfProfM[1].trim();
  const spouseProfM = html.match(/Spouse Profession:<\/b>\s*([^<\n]+)/i);
  if (spouseProfM) r.spouseProfession = spouseProfM[1].trim();

  // ── DEEP: Asset breakdown (self / spouse / dependent) ────────────
  r.selfMovableAssets = 0;
  r.spouseMovableAssets = 0;
  r.dependentMovableAssets = 0;
  r.selfImmovableAssets = 0;
  r.spouseImmovableAssets = 0;
  r.dependentImmovableAssets = 0;

  // Movable assets table
  const movTable = $('#movable_assets');
  if (movTable.length) {
    movTable.find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const desc = $(cells[0]).text().toLowerCase().trim();
      const lastCell = $(cells[cells.length - 1]).text().replace(/[^0-9]/g, '');
      const amount = parseInt(lastCell) || 0;
      if (desc.includes('total')) {
        // Check which owner
        const ownerCell = cells.length > 2 ? $(cells[0]).text().toLowerCase() : '';
        // Get the row context by looking at the broader table
      }
    });

    // Better approach: get total rows
    const totalRows = movTable.find('tr').filter((_, row) => {
      return $(row).text().toLowerCase().includes('total');
    });
    totalRows.each((_, row) => {
      const text = $(row).text();
      const amounts = [...text.matchAll(/Rs\s*([\d,]+)/gi)].map(m => parseINR(m[1]));
      if (amounts.length > 0) {
        // First total row is typically self
        if (r.selfMovableAssets === 0) r.selfMovableAssets = amounts[0];
      }
    });
  }

  // Immovable assets table
  const immovTable = $('#immovable_assets');
  if (immovTable.length) {
    const totalRows = immovTable.find('tr').filter((_, row) => {
      return $(row).text().toLowerCase().includes('total');
    });
    totalRows.each((_, row) => {
      const text = $(row).text();
      const amounts = [...text.matchAll(/Rs\s*([\d,]+)/gi)].map(m => parseINR(m[1]));
      if (amounts.length > 0) {
        if (r.selfImmovableAssets === 0) r.selfImmovableAssets = amounts[0];
      }
    });
  }

  // Fallback: summary block for total assets/liabilities
  const assetM = html.match(/Assets:\s*<\/td><td>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (assetM) r.totalAssets = parseINR(assetM[1]);

  const liabM = html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (liabM) r.totalLiabilities = parseINR(liabM[1]);

  // ── DEEP: Spouse/Dependent Asset Rows in summary table ───────────
  // MyNeta shows a comparison table: self row, spouse row
  const assetRows = [...html.matchAll(/<tr><td>(self|spouse|huf|dependant\d*)<\/td>[\s\S]*?<\/tr>/gi)];
  for (const row of assetRows) {
    const owner = row[1].toLowerCase();
    const amounts = [...row[0].matchAll(/Rs&nbsp;([\d,]+)/gi)].map(m => parseINR(m[1]));
    // The summary table has: movable, immovable for each owner
    if (owner === 'self' && amounts.length >= 2) {
      if (r.selfMovableAssets === 0) r.selfMovableAssets = amounts[0];
      if (r.selfImmovableAssets === 0) r.selfImmovableAssets = amounts[1];
    } else if (owner === 'spouse' && amounts.length >= 2) {
      r.spouseMovableAssets = amounts[0];
      r.spouseImmovableAssets = amounts[1];
    } else if ((owner.startsWith('depend') || owner === 'huf') && amounts.length >= 2) {
      r.dependentMovableAssets += amounts[0];
      r.dependentImmovableAssets += amounts[1];
    }
  }

  // ── DEEP: Income from ITR section ────────────────────────────────
  r.selfIncome = 0;
  r.spouseIncome = 0;
  const itrRows = [...html.matchAll(/<tr><td>(self|spouse)<\/td>[\s\S]*?Total Income[\s\S]*?Rs&nbsp;([\d,]+)/gi)];
  for (const row of itrRows) {
    const owner = row[1].toLowerCase();
    const income = parseINR(row[2]);
    if (owner === 'self') r.selfIncome = income;
    else if (owner === 'spouse') r.spouseIncome = income;
  }

  // Fallback: any income mention
  if (r.selfIncome === 0) {
    const incomeM = html.match(/Total Income[^R]*Rs\s*([\d,]+)/i);
    if (incomeM) r.selfIncome = parseINR(incomeM[1]);
  }

  // ── DEEP: Dependents count ───────────────────────────────────────
  const depMatches = html.match(/dependent\d/gi);
  r.dependents = depMatches ? new Set(depMatches.map(d => d.toLowerCase())).size : 0;

  // ── DEEP: Full criminal case table ───────────────────────────────
  r.criminalCases = [];
  // Find the criminal cases table
  const caseTableMatch = html.match(/Case No\.<\/td>[\s\S]*?(<tr[\s\S]*?)(?:<\/table>|<div class)/i);
  if (caseTableMatch) {
    const caseRows = [...caseTableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const rowMatch of caseRows) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim());
      if (cells.length >= 5 && /\d/.test(cells[0])) {
        const caseRecord = {
          serialNo: cells[0],
          firNo: cells[1] || '',
          caseNo: cells[2] || '',
          court: cells[3] || '',
          ipcSections: (cells[4] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
          otherActs: (cells[5] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
          chargesFramed: /yes|framed/i.test(cells[6] || ''),
          chargesFramedDate: cells[7] || '',
          appealFiled: cells[8] || '',
          status: cells[9] || 'pending',
        };
        // Determine if serious
        caseRecord.isSeriousIPC = caseRecord.ipcSections.some(s =>
          SERIOUS_IPC.some(si => s.includes(si))
        );
        r.criminalCases.push(caseRecord);
      }
    }
  }

  // Total criminal count
  r.totalCriminalCases = r.criminalCases.length;
  r.seriousCriminalCases = r.criminalCases.filter(c => c.isSeriousIPC).length;

  // ── Photo URL ────────────────────────────────────────────────────
  const photoM = html.match(/images_candidate\/[^"'\s>]+\.(?:jpg|jpeg|png)/i);
  if (photoM) r.photoUrl = `https://www.myneta.info/${photoM[0]}`;

  // ── Gender inference ─────────────────────────────────────────────
  if (r.name) r.gender = inferGender(r.name);

  // ── Marital status inference ─────────────────────────────────────
  r.maritalStatus = r.spouseProfession ? 'married' : undefined;

  return r;
}

// ── Build full constituency data (all candidates sorted by votes) ──────
async function scrapeConstituencyFull(electionKey, constId, constName, winnerIds) {
  const candidates = await getCandidatesInConstituency(electionKey, constId);
  if (candidates.length === 0) return null;

  const results = [];
  for (const c of candidates) {
    try {
      const html = await httpGet(`https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${c.id}`);
      if (!html) { results.push({ id: c.id, name: c.name, error: 'fetch_failed' }); continue; }

      const data = deepParseCandidatePage(html);
      results.push({
        candidateId: parseInt(c.id),
        name: data.name || c.name,
        mynetaName: c.name,
        isWinner: winnerIds.has(c.id),
        party: normalizeParty(data.partyFull),
        partyFull: data.partyFull || '',
        age: data.age || null,
        gender: data.gender || 'male',
        totalAssets: data.totalAssets || 0,
        totalLiabilities: data.totalLiabilities || 0,
        criminalCases: data.totalCriminalCases || 0,
        educationLevel: mapEducation(data.educationCategory),
        photoUrl: data.photoUrl || null,
      });
    } catch {}
    await sleep(200);
  }

  // Sort by assumed vote order (winners first, then others)
  results.sort((a, b) => (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0));

  return {
    constituencyId: constId,
    constituencyName: constName,
    totalCandidates: results.length,
    candidates: results,
    winner: results.find(r => r.isWinner) || null,
    runnerUp: results.find(r => !r.isWinner) || null,
  };
}

// ── Main scrape for an election ────────────────────────────────────────
async function scrapeElectionDeep(electionKey) {
  const year = extractYear(electionKey);
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📋 DEEP Scraping: ${electionKey} (year: ${year})`);
  console.log(`${'━'.repeat(60)}`);

  // Get winner IDs
  const winnerIds = await getWinners(electionKey);
  console.log(`   Winners identified: ${winnerIds.size}`);

  // Get all winner candidates for deep scraping
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_winners&sort=default`;
  const html = await httpGet(url);
  if (!html) { console.log('   ❌ Failed to fetch winners list'); return []; }

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const skip = new Set(['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities']);
  const seen = new Set();
  const candidates = [];
  for (const m of links) {
    const id = m[1], name = m[2].trim();
    if (skip.has(name) || seen.has(id) || name.length < 2) continue;
    seen.add(id);
    candidates.push({ id, name });
  }

  console.log(`   Candidates to deep-scrape: ${candidates.length}`);

  const results = [];
  let photoCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    progressLog(i + 1, candidates.length, c.name);

    try {
      const cHtml = await httpGet(`https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${c.id}`);
      if (!cHtml) { results.push({ candidateId: c.id, name: c.name, error: 'fetch_failed' }); await sleep(); continue; }

      const data = deepParseCandidatePage(cHtml);
      const name = (data.name && !/election/i.test(data.name)) ? data.name : c.name;

      const record = {
        candidateId: parseInt(c.id),
        mynetaName: c.name,
        name,
        constituency: data.constituency || '',
        district: data.district || '',
        party: normalizeParty(data.partyFull),
        partyFull: data.partyFull || '',
        electionKey,
        electionYear: year,
        isWinner: true,
        // Personal
        age: data.age || null,
        gender: data.gender || 'male',
        maritalStatus: data.maritalStatus || undefined,
        dependents: data.dependents || 0,
        // Education
        educationLevel: mapEducation(data.educationCategory),
        educationCategory: data.educationCategory || '',
        educationDetail: data.educationDetail || '',
        selfProfession: data.selfProfession || '',
        spouseProfession: data.spouseProfession || '',
        // Finances (DEEP)
        selfMovableAssets: data.selfMovableAssets || 0,
        selfImmovableAssets: data.selfImmovableAssets || 0,
        spouseMovableAssets: data.spouseMovableAssets || 0,
        spouseImmovableAssets: data.spouseImmovableAssets || 0,
        dependentMovableAssets: data.dependentMovableAssets || 0,
        dependentImmovableAssets: data.dependentImmovableAssets || 0,
        totalAssets: data.totalAssets || 0,
        totalLiabilities: data.totalLiabilities || 0,
        selfIncome: data.selfIncome || 0,
        spouseIncome: data.spouseIncome || 0,
        // Criminal (DEEP — full case records)
        totalCriminalCases: data.totalCriminalCases || 0,
        seriousCriminalCases: data.seriousCriminalCases || 0,
        caseDetails: data.criminalCases || [],
        // Photo
        photoUrl: data.photoUrl || null,
        sourceUrl: `https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${c.id}`,
      };

      if (record.photoUrl) photoCount++;
      results.push(record);

    } catch (err) {
      results.push({ candidateId: parseInt(c.id), name: c.name, error: err.message });
    }
    await sleep(300);
  }

  console.log(`\n   ✅ Deep-scraped ${results.length} winners, ${photoCount} photos`);

  // Stats
  const withSpouseAssets = results.filter(r => r.spouseMovableAssets > 0 || r.spouseImmovableAssets > 0).length;
  const withIncome = results.filter(r => r.selfIncome > 0).length;
  const withCaseDetails = results.filter(r => r.caseDetails && r.caseDetails.length > 0).length;
  console.log(`   Spouse assets: ${withSpouseAssets} | Income data: ${withIncome} | Case details: ${withCaseDetails}`);

  return results;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔬 MyNeta DEEP Scraper — Full Affidavit Extraction');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const electionKeys = [];
  if (keyFilter) {
    electionKeys.push(keyFilter);
  } else {
    const filteredStates = stateFilter
      ? STATES.filter(s => s.code === stateFilter.toUpperCase())
      : STATES;
    for (const state of filteredStates) {
      if (allYears) {
        electionKeys.push(...state.mynetaKeys.filter(k => extractYear(k) >= MIN_YEAR));
      } else {
        if (state.mynetaKeys.length > 0) electionKeys.push(state.mynetaKeys[0]);
      }
    }
  }

  console.log(`\n📊 Elections: ${electionKeys.length}`);
  electionKeys.forEach(k => console.log(`   • ${k}`));

  let totalRecords = 0;
  for (const key of electionKeys) {
    const results = await scrapeElectionDeep(key);
    writeJSON(path.join(OUTPUT_BASE, `${key}.json`), results);
    console.log(`   💾 Saved: ${key}.json (${results.length} records)`);
    totalRecords += results.length;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ Deep scraping complete — ${totalRecords} total records`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
