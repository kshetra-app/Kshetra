/**
 * fix-missing-candidates.js
 * ══════════════════════════════════════════════════════════════
 * Deep scrapes and backfills detailed candidate information (age, education,
 * profession, assets, liabilities, criminal cases, photoUrl) for entries
 * in Kerala2026, TamilNadu2026, and WestBengal2026 that:
 *   - have an 'error' field (e.g. 'socket hang up')
 *   - are summary-only (missing key fields like 'age' or 'photoUrl')
 *
 * It uses exponential backoff retries to handle MyNeta network congestion.
 * Saves periodically so progress is never lost.
 *
 * Usage: node scrapers/fix-missing-candidates.js
 */

const fs = require('fs');
const path = require('path');
const { httpGet, sleep, parseINR, normalizeParty, mapEducation } = require('./utils');

const BASE_DIR = path.resolve(__dirname, 'output/myneta');

// ── Target configurations ─────────────────────────────────────────────
const TARGETS = {
  Kerala2026: { file: 'Kerala2026.json' },
  WestBengal2026: { file: 'WestBengal2026.json' },
  TamilNadu2026: { file: 'TamilNadu2026.json' },
};

// ── Copied Parser from myneta-scraper.js for self-containment ──────────
function parseCandidatePage(html) {
  const r = {};

  r.isWinner = /\(Winner\)/i.test(html);

  // Name
  const titleM = html.match(/<title>\s*([^(<\n]+?)\s*[\(<]/i);
  if (titleM && titleM[1].trim().length > 2 && !/myneta|election/i.test(titleM[1])) {
    r.name = titleM[1].trim();
  }
  if (!r.name) {
    const h3M = html.match(/<h[34][^>]*>\s*([^(<\n]+?)(?:\s*\((?:Winner|Party))/i);
    if (h3M) r.name = h3M[1].trim();
  }
  if (!r.name) {
    const bM = html.match(/candidate_id[\s\S]{0,500}<b>\s*([A-Z][a-zA-Z .]+)/i);
    if (bM) r.name = bM[1].trim();
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

  // Profession
  const selfProfM = html.match(/Self Profession:<\/b>\s*([^<\n]+)/i);
  if (selfProfM) r.selfProfession = selfProfM[1].trim();
  const spouseProfM = html.match(/Spouse Profession:<\/b>\s*([^<\n]+)/i);
  if (spouseProfM) r.spouseProfession = spouseProfM[1].trim();

  // Assets & Liabilities
  const assetM = html.match(/Assets:\s*<\/td><td>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (assetM) r.totalAssets = parseINR(assetM[1]);

  const liabM = html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (liabM) r.totalLiabilities = parseINR(liabM[1]);

  // Criminal cases
  const caseBlocks = html.match(/charges related to/gi);
  r.criminalCases = caseBlocks ? caseBlocks.length : 0;

  const seriousIPC = ['302', '307', '376', '395', '396', '420', '467', '468', '471', '120B', '121', '124A'];
  const ipcAll = [...html.matchAll(/IPC Section[- ]*(\d+[A-Za-z]*)/gi)].map(m => m[1]);
  r.ipcSections = [...new Set(ipcAll)];
  r.seriousCriminalCases = ipcAll.filter(s => seriousIPC.some(si => s.startsWith(si))).length;

  // Photo URL
  const photoM = html.match(/images_candidate\/[^"'\s>]+\.(?:jpg|jpeg|png)/i);
  if (photoM) r.photoUrl = `https://www.myneta.info/${photoM[0]}`;

  // Movable/Immovable
  const movTotalM = html.match(/id=movable_assets[\s\S]*?<b>\s*total<\/b>[\s\S]*?<td[^>]*>(?:Rs\s*)?([\d,]+)/i);
  if (movTotalM) r.selfMovableAssets = parseINR(movTotalM[1]);

  const immovTotalM = html.match(/id=immovable_assets[\s\S]*?<b>\s*total<\/b>[\s\S]*?<td[^>]*>(?:Rs\s*)?([\d,]+)/i);
  if (immovTotalM) r.selfImmovableAssets = parseINR(immovTotalM[1]);

  // Income
  const incomeM = html.match(/Total Income[^R]*Rs\s*([\d,]+)/i);
  if (incomeM) r.totalIncome = parseINR(incomeM[1]);

  return r;
}

// ── Scrape a single candidate page with retries & backoff ──────────────
async function scrapeCandidate(electionKey, candidateId, candidateName) {
  const url = `https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${candidateId}`;
  
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const html = await httpGet(url);
      if (html && html.includes('candidate_id')) {
        return parseCandidatePage(html);
      }
    } catch (err) {
      if (attempt === 4) throw err;
    }
    const wait = attempt * 2000;
    process.stdout.write(` [retry ${attempt}, wait ${wait/1000}s]`);
    await sleep(wait);
  }
  throw new Error('Empty response or invalid page content after 4 attempts');
}

async function processState(key, config) {
  const filePath = path.join(BASE_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  console.log(`\n📂 Loading ${config.file}...`);
  const candidates = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
  
  // Identify candidates that need scraping
  const toScrape = [];
  candidates.forEach((c, idx) => {
    // Needs scraping if:
    // 1. It has an error field
    // 2. Or it's missing 'age' (which means it's summary-only and needs detailed scrape)
    if (c.error || c.age === undefined || c.age === null) {
      toScrape.push({ idx, id: c.candidateId || c.id, name: c.name });
    }
  });

  console.log(`🔍 Found ${candidates.length} total winners`);
  console.log(`📥 Need deep scraping: ${toScrape.length} candidates`);

  if (toScrape.length === 0) {
    console.log(`✨ All candidates are already fully scraped!`);
    return;
  }

  const year = 2026;
  let count = 0;

  for (const item of toScrape) {
    count++;
    process.stdout.write(`   [${count}/${toScrape.length}] Deep scraping ${item.name} (ID: ${item.id})...`);
    
    try {
      const data = await scrapeCandidate(key, item.id, item.name);
      
      // Build full detailed record
      const record = {
        candidateId: parseInt(item.id),
        mynetaName: data.name || item.name,
        name: (data.name && !/^\d{4}$/.test(data.name) && !/election/i.test(data.name)) ? data.name : item.name,
        constituency: data.constituency || candidates[item.idx].constituency || '',
        district: data.district || candidates[item.idx].district || '',
        party: normalizeParty(data.partyFull || candidates[item.idx].partyFull || candidates[item.idx].party),
        partyFull: data.partyFull || candidates[item.idx].partyFull || candidates[item.idx].party || '',
        electionKey: key,
        electionYear: year,
        isWinner: true,
        age: data.age || null,
        educationLevel: mapEducation(data.educationCategory),
        educationCategory: data.educationCategory || '',
        educationDetail: data.educationDetail || '',
        selfProfession: data.selfProfession || '',
        spouseProfession: data.spouseProfession || '',
        totalAssets: data.totalAssets || candidates[item.idx].totalAssets || 0,
        totalLiabilities: data.totalLiabilities || candidates[item.idx].totalLiabilities || 0,
        selfMovableAssets: data.selfMovableAssets || 0,
        selfImmovableAssets: data.selfImmovableAssets || 0,
        totalIncome: data.totalIncome || 0,
        criminalCases: data.criminalCases || candidates[item.idx].criminalCases || 0,
        seriousCriminalCases: data.seriousCriminalCases || 0,
        ipcSections: data.ipcSections || [],
        photoUrl: data.photoUrl || null,
        sourceUrl: `https://www.myneta.info/${key}/candidate.php?candidate_id=${item.id}`,
      };

      // Replace in array
      candidates[item.idx] = record;
      console.log(` Done! [Age: ${record.age}, Party: ${record.party}, Photo: ${record.photoUrl ? 'YES' : 'NO'}]`);
    } catch (err) {
      console.log(` ❌ FAILED: ${err.message}`);
      candidates[item.idx].error = err.message;
    }

    // Save periodically every 5 candidates
    if (count % 5 === 0 || count === toScrape.length) {
      fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2));
      console.log(`      💾 Saved progress to ${config.file}`);
    }

    // Gentle delay to prevent socket blocks
    await sleep(700);
  }

  // Final consolidated save
  fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2));
  console.log(`🎉 Finished backfill for ${config.file}. All winners updated.`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Kshetra Candidate Detail Backfiller (Kerala, TN, WB 2026) ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  for (const [key, config] of Object.entries(TARGETS)) {
    await processState(key, config);
  }
  
  console.log('\n✨ Backfill operation completed!');
}

main().catch(err => {
  console.error('\n❌ Fatal error in backfiller:', err);
  process.exit(1);
});
