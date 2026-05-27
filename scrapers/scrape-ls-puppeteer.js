#!/usr/bin/env node
/**
 * Puppeteer-based full LS 2024 scraper 
 * Gets all 543 MPs including the 60 hidden via JS
 * 
 * Usage: node scrapers/scrape-ls-puppeteer.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'myneta');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'LokSabha2024-puppeteer.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SLEEP = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('🏛️  Lok Sabha 2024 Puppeteer Scraper');
  console.log('═'.repeat(60));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    timeout: 90000,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36');

    const URL = 'https://myneta.info/LokSabha2024/index.php?action=show_winners&sort=default';
    console.log(`\n📋 Navigating to: ${URL}`);
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await SLEEP(5000);

    // Extract all table rows via page.evaluate (JS runs after obfuscated scripts execute)
    const winners = await page.evaluate(() => {
      const results = [];
      // Get the main data table
      const tables = document.querySelectorAll('table.w3-table.w3-bordered');
      if (!tables.length) return results;
      
      const table = tables[0];
      const rows = table.querySelectorAll('tr');
      
      rows.forEach((row, idx) => {
        if (idx === 0) return; // Skip header
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;
        
        const snoText = cells[0].textContent.trim();
        const sno = parseInt(snoText, 10);
        if (!sno || isNaN(sno)) return;
        
        // Name from anchor
        const nameEl = cells[1].querySelector('a:last-of-type') || cells[1].querySelector('a');
        const name = nameEl ? nameEl.textContent.trim() : cells[1].textContent.trim();
        if (!name || name.length < 2) return;
        
        const constituency = cells[2].textContent.trim();
        const party = cells[3].textContent.trim();
        
        // Criminal cases (cell 4)
        const crimText = cells[4].textContent.trim();
        const criminalCases = parseInt(crimText, 10) || 0;
        
        // Education (cell 5)  
        const education = cells[5].textContent.trim();
        
        // Assets (cell 6)
        const assetsText = cells[6].textContent.replace(/\s+/g, ' ').trim();
        const assetMatch = assetsText.match(/Rs\s*([\d,]+)/);
        const totalAssets = assetMatch ? parseInt(assetMatch[1].replace(/,/g, ''), 10) : 0;
        
        // Liabilities (cell 7)
        let totalLiabilities = 0;
        if (cells[7]) {
          const liabText = cells[7].textContent.trim();
          const liabMatch = liabText.match(/Rs\s*([\d,]+)/);
          totalLiabilities = liabMatch ? parseInt(liabMatch[1].replace(/,/g, ''), 10) : 0;
        }
        
        // Profile URL
        const links = cells[1].querySelectorAll('a');
        let sourceUrl = '';
        links.forEach(a => {
          if (a.href.includes('LokSabha2024')) sourceUrl = a.href;
        });
        
        // Candidate ID and photo
        const idMatch = sourceUrl.match(/candidate_id=(\d+)/);
        const candidateId = idMatch ? idMatch[1] : '';
        const photoUrl = candidateId ? 
          `https://myneta.info/LokSabha2024/photos/${candidateId}.jpg` : '';
        
        results.push({
          sno,
          name,
          constituency,
          party,
          criminalCases,
          education,
          totalAssets,
          totalLiabilities,
          sourceUrl,
          photoUrl,
          candidateId,
        });
      });
      
      return results;
    });

    console.log(`\n✅ Extracted ${winners.length} Lok Sabha MPs from rendered page`);

    // Verify
    const snos = winners.map(w => w.sno).sort((a,b) => a-b);
    const missingSnos = [];
    for (let i = 1; i <= 543; i++) {
      if (!snos.includes(i)) missingSnos.push(i);
    }
    console.log(`   Serial numbers: ${snos[0]} to ${snos[snos.length-1]}`);
    console.log(`   Missing SNOs: ${missingSnos.length} [${missingSnos.slice(0,10).join(', ')}...]`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(winners, null, 2));
    console.log(`💾 Saved → ${OUTPUT_FILE}`);

  } finally {
    await browser.close();
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✨ Done');
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
