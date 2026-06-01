/**
 * extract-tn2026-winners-from-summary.js
 * ══════════════════════════════════════════════════════════════
 * Extracts all TN 2026 winners from the MyNeta summary page
 * (12 pages, ~20 per page, 233 total winners).
 * Then merges with the already scraped detailed candidate data.
 *
 * Usage: node scrapers/extract-tn2026-winners-from-summary.js
 */

const { httpGet, sleep, writeJSON } = require('./utils');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.myneta.info/TamilNadu2026';
const OUT_FILE = path.resolve(__dirname, 'output/myneta/TamilNadu2026.json');
const DELAY = 600; // ms between requests

async function scrapeWinnersPage(pageNum) {
  const url = `${BASE_URL}/index.php?action=summary&subAction=winner_analyzed&sort=candidate&page=${pageNum}`;
  
  // Retry up to 3 times on socket errors
  let html = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      html = await httpGet(url);
      if (html) break;
    } catch (err) {
      if (attempt < 4) {
        const wait = attempt * 2000;
        process.stdout.write(` [retry ${attempt}, wait ${wait/1000}s]`);
        await sleep(wait);
      }
    }
    if (!html && attempt < 4) {
      await sleep(attempt * 1500);
    }
  }
  if (!html) return [];

  
  const winners = [];
  
  // Parse winner rows: <tr><td>N</td><td><a href=candidate.php?candidate_id=ID>NAME</a>...</td><td>CONSTITUENCY</td><td>PARTY</td>...
  // Pattern from the HTML we saw:
  // <tr><td>1</td><td><a href=candidate.php?candidate_id=256>A.Kallanai</a><b></td><td>MADURAI NORTH</td>
  // <td>Tamilaga Vettri Kazhagam</td><td ...> N </td><td>Education</td>
  // <td align=right>Rs&nbsp;X,XX,XX,XXX</td><td align=right>Rs&nbsp;X,XX,XX,XXX</td>
  
  const rowPattern = /candidate\.php\?candidate_id=(\d+)>([^<]+)<\/a>.*?<\/td><td>([^<]+)<\/td>\s*<td>([^<]*)<\/td>/g;
  
  let m;
  while ((m = rowPattern.exec(html)) !== null) {
    const [, candidateId, name, constituency, party] = m;
    winners.push({
      candidateId: parseInt(candidateId),
      name: name.trim(),
      constituency: constituency.trim(),
      partyFull: party.trim(),
      isWinner: true,
    });
  }
  
  // Also extract assets/liabilities from summary page
  // Rs&nbsp;X,XX,XX,XXX pattern
  const assetPattern = /<td align=right>Rs&nbsp;([\d,]+)<br>/g;
  const assetMatches = [];
  let am;
  while ((am = assetPattern.exec(html)) !== null) {
    assetMatches.push(parseInt(am[1].replace(/,/g, '')));
  }
  
  // Pair assets/liabilities with winners (2 per winner: assets, then liabilities)
  for (let i = 0; i < winners.length && i * 2 + 1 < assetMatches.length; i++) {
    winners[i].totalAssets = assetMatches[i * 2];
    winners[i].totalLiabilities = assetMatches[i * 2 + 1] || 0;
  }
  
  // Extract education
  const eduPattern = /<td\s*>([^<]*(?:Graduate|Post Graduate|10th|12th|8th|5th|Doctorate|Others|Literate|Illiterate|Professional)[^<]*)<\/td>/gi;
  const edus = [];
  let em;
  while ((em = eduPattern.exec(html)) !== null) edus.push(em[1].trim());
  for (let i = 0; i < winners.length && i < edus.length; i++) {
    winners[i].educationCategory = edus[i];
  }
  
  // Extract criminal case counts  
  const crimPattern = /<span class='w3-badge[^']*'><b>\s*(\d+)\s*<\/b><\/span>|>(\s*0\s*)</g;
  const crims = [];
  let cm;
  while ((cm = crimPattern.exec(html)) !== null) crims.push(parseInt(cm[1] || cm[2] || '0'));
  for (let i = 0; i < winners.length && i < crims.length; i++) {
    winners[i].criminalCases = crims[i];
  }
  
  return winners;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Tamil Nadu 2026 Winners — Summary Page Extractor           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Total pages is 12
  const TOTAL_PAGES = 12;
  const allWinners = [];
  const winnerIds = new Set();
  
  console.log(`📋 Scraping ${TOTAL_PAGES} pages of winners...`);
  
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    process.stdout.write(`\r   Page ${page}/${TOTAL_PAGES}...`);
    const pageWinners = await scrapeWinnersPage(page);
    
    for (const w of pageWinners) {
      if (!winnerIds.has(w.candidateId)) {
        winnerIds.add(w.candidateId);
        allWinners.push(w);
      }
    }
    
    await sleep(DELAY);
  }
  
  console.log(`\n\n  ✅ Extracted ${allWinners.length} unique winners from summary pages`);
  
  // Load existing scraped data (has detailed affidavit info)
  const existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8') || '[]');
  const existingMap = {};
  for (const e of existing) {
    if (e.candidateId && !e.error) existingMap[e.candidateId] = e;
  }
  console.log(`  📦 Loaded ${Object.keys(existingMap).length} detailed candidate records from existing data`);
  
  // Merge: winner list + detailed records
  const merged = allWinners.map(w => {
    const detail = existingMap[w.candidateId];
    if (detail) {
      // Use detailed data, override isWinner flag
      return {
        ...detail,
        isWinner: true,
        constituency: w.constituency || detail.constituency,
        partyFull: w.partyFull || detail.partyFull || detail.party,
      };
    }
    // Winner from summary without detailed data
    return {
      candidateId: w.candidateId,
      name: w.name,
      constituency: w.constituency,
      party: w.partyFull, // will normalize later
      partyFull: w.partyFull,
      electionKey: 'TamilNadu2026',
      electionYear: 2026,
      isWinner: true,
      totalAssets: w.totalAssets || 0,
      totalLiabilities: w.totalLiabilities || 0,
      educationCategory: w.educationCategory || '',
      criminalCases: w.criminalCases || 0,
      sourceUrl: `${BASE_URL}/candidate.php?candidate_id=${w.candidateId}`,
    };
  });
  
  console.log(`  🔗 Merged ${merged.length} winner records`);
  console.log(`  📊 With detailed data: ${merged.filter(w => existingMap[w.candidateId]).length}`);
  console.log(`  📊 Summary-only: ${merged.filter(w => !existingMap[w.candidateId]).length}`);
  
  // Party summary
  const partyCounts = {};
  merged.forEach(w => {
    const p = (w.partyFull || w.party || 'IND').substring(0, 25);
    partyCounts[p] = (partyCounts[p] || 0) + 1;
  });
  const top8 = Object.entries(partyCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  console.log(`\n  🗳️  Party distribution:`);
  top8.forEach(([p,c]) => console.log(`     ${p.padEnd(30)} ${c}`));
  
  // Save
  fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));
  console.log(`\n  ✅ Saved ${merged.length} winners to ${OUT_FILE}`);
}

main().catch(console.error);
