#!/usr/bin/env node
/**
 * Lok Sabha 2024 Complete Scraper (via MyNeta LokSabha2024)
 * ═══════════════════════════════════════════════════════════
 * Scrapes ALL 543 winners from myneta.info/LokSabha2024/
 * This is a plain HTTP scraper — no puppeteer needed.
 *
 * Output: scrapers/output/myneta/LokSabha2024-all.json
 * Usage:  node scrapers/scrape-loksabha-complete.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'myneta');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'LokSabha2024-all.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SLEEP = (ms) => new Promise(r => setTimeout(r, ms));

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };
    https.get(url, opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Extract candidates from the winners table
function parseWinnersPage(html) {
  const candidates = [];
  
  // Match table rows for winners — the pattern in myneta winner pages
  // Each row has: Sr, Name, Constituency, Party, Criminal, Assets, Liabilities
  const tableMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi);
  if (!tableMatch) {
    console.log('   ⚠️  No tbody found in page');
    return [];
  }

  for (const tbody of tableMatch) {
    const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rows) {
      // Extract cells
      const cells = [];
      const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      for (const cell of cellMatches) {
        const text = cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        cells.push(text);
      }
      
      if (cells.length < 4) continue;

      // Try to extract photo URL
      const photoMatch = row.match(/src=["']([^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/i);
      const photoUrl = photoMatch ? 
        (photoMatch[1].startsWith('http') ? photoMatch[1] : `https://myneta.info${photoMatch[1]}`) : '';

      // Extract profile link
      const linkMatch = row.match(/href=["']([^"']*candidate_id[^"']*)["']/i);
      const profileUrl = linkMatch ?
        (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://myneta.info${linkMatch[1]}`) : '';

      // cells[0] = Sr No, [1] = Name (with photo), [2] = Constituency, [3] = Party, [4+] = financial data
      const name = cells[1]?.replace(/^\d+\s*/, '').trim();
      const constituency = cells[2]?.trim();
      const party = cells[3]?.trim();
      
      if (!name || name.length < 2 || !constituency || !party) continue;
      if (/^(Name|Candidate|Sr|Sl\.|Winner)/i.test(name)) continue;

      // Extract criminal cases and assets from later cells
      let criminalCases = 0;
      let totalAssets = 0;
      let totalLiabilities = 0;

      for (let i = 4; i < cells.length; i++) {
        const cell = cells[i];
        if (/^\d+$/.test(cell.trim())) {
          if (criminalCases === 0) criminalCases = parseInt(cell.trim(), 10);
        }
        if (/Rs\.|Crore|Lakh/i.test(cell)) {
          // Parse asset figure
          const assetMatch = cell.match(/([\d,.]+)\s*Crore/i);
          const lakhMatch = cell.match(/([\d,.]+)\s*Lakh/i);
          if (assetMatch) totalAssets = parseFloat(assetMatch[1].replace(/,/g, '')) * 10000000;
          else if (lakhMatch) totalAssets = parseFloat(lakhMatch[1].replace(/,/g, '')) * 100000;
        }
      }

      candidates.push({
        name,
        constituency,
        party,
        criminalCases,
        totalAssets,
        totalLiabilities,
        photoUrl,
        sourceUrl: profileUrl,
      });
    }
  }

  return candidates;
}

// State-wise constituency mapping for LS 2024
const STATE_CONSTITUENCY_MAP = {
  // We'll build this from the state-wise winner pages
};

async function scrapeStatePage(stateId, stateName) {
  const url = `https://myneta.info/LokSabha2024/index.php?action=show_winners&state_id=${stateId}&sort=default`;
  try {
    const html = await fetchUrl(url);
    if (html.includes('Page Not Found') || html.length < 1000) return [];
    const candidates = parseWinnersPage(html);
    candidates.forEach(c => c.stateId = stateId);
    return candidates;
  } catch (err) {
    console.log(`   ⚠️  Failed state ${stateName}: ${err.message}`);
    return [];
  }
}

async function scrapeAllWinners() {
  // First try the full winners page (all states at once)
  console.log('\n📥 Fetching full LS 2024 winners page...');
  const fullUrl = 'https://myneta.info/LokSabha2024/index.php?action=show_winners&sort=default';
  
  try {
    const html = await fetchUrl(fullUrl);
    console.log(`   Page size: ${Math.round(html.length/1024)}KB`);
    
    if (!html.includes('Page Not Found')) {
      const candidates = parseWinnersPage(html);
      console.log(`   Found ${candidates.length} winners from full page`);
      if (candidates.length >= 400) return candidates;
    }
  } catch (err) {
    console.log(`   ⚠️  Full page failed: ${err.message}`);
  }

  // Fallback: state-by-state (state_id 1..35 covers all states)
  console.log('\n📥 Falling back to state-by-state scrape...');
  const allCandidates = [];
  
  for (let stateId = 1; stateId <= 40; stateId++) {
    const url = `https://myneta.info/LokSabha2024/index.php?action=show_winners&state_id=${stateId}&sort=default`;
    try {
      const html = await fetchUrl(url);
      if (html.includes('Page Not Found') || html.length < 2000) {
        process.stdout.write('.');
        continue;
      }
      
      // Extract state name from page
      const stateMatch = html.match(/State\s*:?\s*<[^>]+>([^<]+)</i) || 
                         html.match(/<h[23][^>]*>([^<]+State[^<]*)</i);
      const stateName = stateMatch ? stateMatch[1].trim() : `State${stateId}`;
      
      const candidates = parseWinnersPage(html);
      if (candidates.length > 0) {
        candidates.forEach(c => { c.stateId = stateId; c.stateName = stateName; });
        allCandidates.push(...candidates);
        console.log(`\n   [${stateId}] ${stateName}: ${candidates.length} winners`);
      } else {
        process.stdout.write('.');
      }
      
      await SLEEP(300);
    } catch (err) {
      process.stdout.write('x');
    }
  }
  
  return allCandidates;
}

async function main() {
  console.log('🏛️  Lok Sabha 2024 Complete Scraper (MyNeta)');
  console.log('═'.repeat(60));

  const winners = await scrapeAllWinners();
  
  // Deduplicate by name+constituency
  const seen = new Set();
  const unique = winners.filter(w => {
    const key = `${w.name}|${w.constituency}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n\n✅ Total unique Lok Sabha winners: ${unique.length}/543`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unique, null, 2));
  console.log(`💾 Saved → ${OUTPUT_FILE}`);
  console.log('\n' + '═'.repeat(60));
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
