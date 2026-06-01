/**
 * scrape-tn2026-winners.js
 * ════════════════════════════════════════════════════════════════
 * Scrapes Tamil Nadu 2026 winner data directly from the MyNeta
 * winners summary page (index.php?action=summary&subAction=winner_analyzed)
 * which lists all 233 winners with their party and constituency.
 *
 * Then enriches each winner with full candidate data from individual pages.
 *
 * Usage: node scrapers/scrape-tn2026-winners.js
 */

const { httpGet, sleep, writeJSON } = require('./utils');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.myneta.info/TamilNadu2026';
const OUT_FILE = path.resolve(__dirname, 'output/myneta/TamilNadu2026.json');
const DELAY = 400; // ms between requests

async function scrapeConstituencyWinners() {
  console.log('🔍 Fetching Tamil Nadu 2026 winners list...');
  
  // The winners summary page shows all winners
  const url = `${BASE_URL}/index.php?action=summary&subAction=winner_analyzed&sort=candidate`;
  const html = await httpGet(url);
  
  if (!html) {
    console.log('❌ Failed to fetch winners summary page');
    return [];
  }
  
  // Parse winner rows from the summary table
  // Format: <tr><td>...rank...</td><td>name</td><td>party</td><td>constituency</td>...</tr>
  const winners = [];
  
  // Extract candidate links from the winners table
  const rowPattern = /href='candidate\.php\?candidate_id=(\d+)'[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/g;
  
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const [, candidateId, name, party, constituency, votes] = match;
    winners.push({
      candidateId: parseInt(candidateId),
      name: name.trim(),
      party: party.trim(),
      constituency: constituency.trim(),
      votesStr: votes.trim(),
      isWinner: true,
    });
  }
  
  if (winners.length === 0) {
    // Alternative: parse the winners list differently
    // Try finding winner rows with specific class
    const altPattern = /candidate_id=(\d+)[^>]*>.*?<\/td>\s*<\/tr>/gs;
    console.log('  Trying alternative parse...');
    
    // Extract links from winners page 
    const linkPattern = /candidate\.php\?candidate_id=(\d+)/g;
    const ids = new Set();
    let lm;
    while ((lm = linkPattern.exec(html)) !== null) {
      ids.add(parseInt(lm[1]));
    }
    console.log(`  Found ${ids.size} candidate IDs on winners page`);
    
    return [...ids].map(id => ({ candidateId: id, isWinner: true }));
  }
  
  console.log(`  ✅ Parsed ${winners.length} winners from summary page`);
  return winners;
}

async function scrapeConstituencyIndex() {
  console.log('🔍 Fetching constituency index...');
  const html = await httpGet(`${BASE_URL}/`);
  if (!html) return [];
  
  // Extract all constituency IDs from the index page
  const constPattern = /show_candidates&constituency_id=(\d+)[^>]*>([^<]+)</g;
  const constituencies = [];
  let m;
  while ((m = constPattern.exec(html)) !== null) {
    constituencies.push({ id: parseInt(m[1]), name: m[2].trim() });
  }
  console.log(`  Found ${constituencies.length} constituencies`);
  return constituencies;
}

async function scrapeConstituency(constId, constName) {
  const url = `${BASE_URL}/index.php?action=show_candidates&constituency_id=${constId}`;
  const html = await httpGet(url);
  if (!html) return null;
  
  // Find the winner (rank 1) from the constituency page
  // Winner is typically marked with a bold/highlighted row or is rank 1
  
  // Extract candidate table rows
  // Pattern: rank, candidate name (link), age, party, votes, % 
  const tablePattern = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*><a href='candidate\.php\?candidate_id=(\d+)'[^>]*>([^<]+)<\/a>\s*(?:<[^>]+>)?([^<]*)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g;
  
  const candidates = [];
  let m;
  while ((m = tablePattern.exec(html)) !== null) {
    const [, rank, candId, name, party, age, votesStr] = m;
    candidates.push({
      rank: parseInt(rank),
      candidateId: parseInt(candId),
      name: name.trim(),
      party: party.trim(),
      age: parseInt(age) || null,
      votes: parseInt(votesStr.replace(/,/g,'')) || 0,
      constituency: constName,
    });
  }
  
  // Sort by rank (winner is rank 1)
  candidates.sort((a,b) => a.rank - b.rank);
  const winner = candidates.find(c => c.rank === 1);
  
  if (!winner) {
    // Fallback: try to find winner with different HTML pattern
    const altPattern = /<tr[^>]*class=['"]?[^'"]*winner[^'"]*['"]?[^>]*>.*?candidate_id=(\d+)['"]+>([^<]+)/s;
    const alt = altPattern.exec(html);
    if (alt) {
      return { candidateId: parseInt(alt[1]), name: alt[2].trim(), constituency: constName, rank: 1, isWinner: true };
    }
    return null;
  }
  
  return { ...winner, isWinner: true, runnerUp: candidates[1] };
}

async function scrapeCandidateDetails(candidateId, winner) {
  const url = `${BASE_URL}/candidate.php?candidate_id=${candidateId}`;
  const html = await httpGet(url);
  if (!html) return { ...winner, candidateId, sourceUrl: url, error: 'fetch_failed' };
  
  const extract = (pattern, fallback = '') => {
    const m = html.match(pattern);
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : fallback;
  };
  
  const extractNum = (pattern, fallback = 0) => {
    const s = extract(pattern, '0');
    return parseInt(s.replace(/,/g, ''), 10) || fallback;
  };
  
  // Extract education
  const edu = extract(/Education\s*<\/td>\s*<td[^>]*>([^<]+)/i);
  const profession = extract(/Profession\s*<\/td>\s*<td[^>]*>([^<]+)/i);
  const age = extractNum(/Age\s*<\/td>\s*<td[^>]*>(\d+)/i) || winner.age;
  const gender = html.match(/Sex\s*<\/td>\s*<td[^>]*>Female/i) ? 'F' : 'M';
  
  // Party full name from page
  const partyFull = extract(/Party\s*<\/td>\s*<td[^>]*>([^<]+)/i) || winner.party;
  
  // Assets/liabilities
  const totalAssets = extractNum(/Total Assets.*?Rs\.?\s*([\d,]+)/is);
  const totalLiabilities = extractNum(/Total Liabilities.*?Rs\.?\s*([\d,]+)/is);
  const selfIncome = extractNum(/Total Annual Income.*?Rs\.?\s*([\d,]+)/is);
  
  // Criminal cases  
  const criminalMatch = html.match(/(\d+)\s+criminal\s+case/i);
  const criminalCases = criminalMatch ? parseInt(criminalMatch[1]) : 0;
  
  // Photo
  const photoMatch = html.match(/images_candidate\/TamilNadu2026\/([a-f0-9]+\.(jpg|jpeg|png))/i);
  const photoUrl = photoMatch 
    ? `https://www.myneta.info/images_candidate/TamilNadu2026/${photoMatch[1]}`
    : null;
  
  // District
  const district = extract(/Constituency\s*<\/td>\s*<td[^>]*>([^<]+)/i).split('(')[1]?.replace(')','').trim() || '';
  
  return {
    candidateId,
    mynetaName: winner.name,
    name: winner.name,
    constituency: winner.constituency,
    district,
    party: winner.party,
    partyFull,
    electionKey: 'TamilNadu2026',
    electionYear: 2026,
    isWinner: true,
    rank: 1,
    votesReceived: winner.votes || 0,
    age,
    gender,
    educationCategory: edu,
    selfProfession: profession,
    totalAssets,
    totalLiabilities,
    selfIncome,
    criminalCases,
    photoUrl,
    sourceUrl: url,
    runnerUp: winner.runnerUp?.name || '',
    runnerUpVotes: winner.runnerUp?.votes || 0,
    margin: winner.votes && winner.runnerUp?.votes ? winner.votes - winner.runnerUp.votes : 0,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Tamil Nadu 2026 Winner Scraper (Constituency-First)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Get constituency list
  const constituencies = await scrapeConstituencyIndex();
  if (constituencies.length === 0) {
    console.log('❌ Failed to get constituencies');
    return;
  }
  await sleep(500);
  
  // Step 2: For each constituency, find the winner
  console.log(`\n📋 Scraping ${constituencies.length} constituencies for winners...`);
  const winners = [];
  
  for (let i = 0; i < constituencies.length; i++) {
    const c = constituencies[i];
    process.stdout.write(`\r   [${i+1}/${constituencies.length}] ${c.name.padEnd(40)}`);
    
    const winner = await scrapeConstituency(c.id, c.name);
    if (winner) {
      winners.push(winner);
    }
    await sleep(DELAY);
  }
  
  console.log(`\n  ✅ Found ${winners.length} winners from constituency pages`);
  
  if (winners.length === 0) {
    console.log('❌ No winners found from constituency pages. Exiting.');
    return;
  }
  
  // Step 3: Enrich each winner with full candidate details
  console.log(`\n📊 Enriching ${winners.length} winners with full details...`);
  const enriched = [];
  
  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    if (!w.candidateId) {
      enriched.push(w);
      continue;
    }
    process.stdout.write(`\r   [${i+1}/${winners.length}] ${w.name.substring(0,30).padEnd(30)}`);
    
    const details = await scrapeCandidateDetails(w.candidateId, w);
    enriched.push(details);
    await sleep(DELAY);
  }
  
  console.log(`\n  ✅ Enriched ${enriched.length} winner records`);
  
  // Step 4: Save
  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(enriched, null, 2));
  
  const partyCounts = {};
  enriched.forEach(w => {
    const p = w.party || 'IND';
    partyCounts[p] = (partyCounts[p] || 0) + 1;
  });
  const topParties = Object.entries(partyCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  
  console.log(`\n✅ Saved to ${OUT_FILE}`);
  console.log(`📊 Party distribution: ${topParties.map(([p,c]) => `${p}:${c}`).join(', ')}`);
  console.log(`🏆 Total winners: ${enriched.length}`);
}

main().catch(console.error);
