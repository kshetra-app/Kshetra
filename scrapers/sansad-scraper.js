#!/usr/bin/env node
/**
 * Sansad.in Scraper — Lok Sabha & Rajya Sabha MP profiles
 * ══════════════════════════════════════════════════════════════════════
 * Source: sansad.in (Official Parliament of India portal)
 * Data:   MP name, constituency, state, party, photo, terms served
 *
 * Uses Puppeteer headless browser because sansad.in is a React SPA
 *
 * Usage:
 *   node scrapers/sansad-scraper.js          # All MPs
 *   node scrapers/sansad-scraper.js --ls     # Lok Sabha only
 *   node scrapers/sansad-scraper.js --rs     # Rajya Sabha only
 */

const puppeteer = require('puppeteer');
const path = require('path');
const { ensureDir, writeJSON, sleep } = require('./utils');

const args = process.argv.slice(2);
const lsOnly = args.includes('--ls');
const rsOnly = args.includes('--rs');

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'sansad');

// ── Scrape member list page ────────────────────────────────────────────
async function scrapeMembers(page, url, houseType) {
  console.log(`\n📋 Navigating to ${houseType}: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for member cards to load
  console.log('   Waiting for content to load...');
  await sleep(5000);

  // Try to find member cards
  // Sansad.in renders member cards with names, photos, constituencies
  const members = await page.evaluate(() => {
    const results = [];

    // Try various selectors that sansad.in might use
    const cards = document.querySelectorAll('[class*="member"], [class*="card"], [class*="MemberCard"], [class*="profile"]');

    cards.forEach(card => {
      const name = card.querySelector('[class*="name"], h3, h4, [class*="title"]')?.textContent?.trim();
      const constituency = card.querySelector('[class*="constituency"], [class*="place"]')?.textContent?.trim();
      const party = card.querySelector('[class*="party"]')?.textContent?.trim();
      const state = card.querySelector('[class*="state"]')?.textContent?.trim();
      const img = card.querySelector('img')?.src;

      if (name && name.length > 2) {
        results.push({ name, constituency, party, state, photoUrl: img });
      }
    });

    // If no cards found, try table rows
    if (results.length === 0) {
      const rows = document.querySelectorAll('table tr, tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const name = cells[0]?.textContent?.trim();
          const constituency = cells[1]?.textContent?.trim();
          const party = cells[2]?.textContent?.trim();
          const img = row.querySelector('img')?.src;
          if (name && name.length > 2 && !/^(Name|Sr|Sl)/i.test(name)) {
            results.push({ name, constituency, party, photoUrl: img });
          }
        }
      });
    }

    // If still nothing, try generic link approach
    if (results.length === 0) {
      const links = document.querySelectorAll('a[href*="member"]');
      links.forEach(link => {
        const name = link.textContent?.trim();
        if (name && name.length > 2 && !/Home|Members|Back|Search|Filter/i.test(name)) {
          results.push({ name, profileUrl: link.href });
        }
      });
    }

    return results;
  });

  console.log(`   Found ${members.length} members via page evaluation`);

  // Scroll to load all members (infinite scroll / pagination)
  if (members.length < 100) {
    console.log('   Attempting scroll to load more...');
    let prevCount = members.length;
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

      const newMembers = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="member"], [class*="card"], [class*="MemberCard"]');
        return cards.length;
      });

      if (newMembers > prevCount) {
        console.log(`   ... scrolled, now ${newMembers} cards`);
        prevCount = newMembers;
      } else {
        break;
      }
    }

    // Re-extract after scrolling
    const updatedMembers = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('[class*="member"], [class*="card"], [class*="MemberCard"], [class*="profile"]');
      cards.forEach(card => {
        const name = card.querySelector('[class*="name"], h3, h4, [class*="title"]')?.textContent?.trim();
        const constituency = card.querySelector('[class*="constituency"], [class*="place"]')?.textContent?.trim();
        const party = card.querySelector('[class*="party"]')?.textContent?.trim();
        const state = card.querySelector('[class*="state"]')?.textContent?.trim();
        const img = card.querySelector('img')?.src;
        if (name && name.length > 2) {
          results.push({ name, constituency, party, state, photoUrl: img });
        }
      });
      return results;
    });

    if (updatedMembers.length > members.length) {
      return updatedMembers;
    }
  }

  // Take screenshot for debugging if no results
  if (members.length === 0) {
    const screenshotPath = path.join(OUTPUT_BASE, `debug-${houseType}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   ⚠️ No members found. Screenshot saved: ${screenshotPath}`);

    // Dump page HTML for analysis
    const html = await page.content();
    const htmlPath = path.join(OUTPUT_BASE, `debug-${houseType}.html`);
    require('fs').writeFileSync(htmlPath, html);
    console.log(`   📄 Page HTML saved: ${htmlPath}`);
  }

  return members;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🏛️  Sansad.in Scraper (Headless Browser)');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 60000,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    if (!rsOnly) {
      // Lok Sabha
      const lsMembers = await scrapeMembers(page, 'https://sansad.in/ls/members', 'lok-sabha');
      writeJSON(path.join(OUTPUT_BASE, 'lok-sabha-members.json'), lsMembers);
      console.log(`   💾 Saved ${lsMembers.length} Lok Sabha members`);
    }

    if (!lsOnly) {
      // Rajya Sabha
      const rsMembers = await scrapeMembers(page, 'https://sansad.in/rs/members', 'rajya-sabha');
      writeJSON(path.join(OUTPUT_BASE, 'rajya-sabha-members.json'), rsMembers);
      console.log(`   💾 Saved ${rsMembers.length} Rajya Sabha members`);
    }

  } finally {
    await browser.close();
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ Sansad.in Scraping Complete');
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
