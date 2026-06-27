#!/usr/bin/env node
/**
 * Rajya Sabha Members Scraper
 * ═══════════════════════════════════════════════════════
 * Source: sansad.in/rs/members (Official Parliament of India)
 * Uses Puppeteer headless browser (React SPA)
 * 
 * Output: scrapers/output/sansad/rajya-sabha-members.json
 * Usage:  node scrapers/scrape-rajya-sabha.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'sansad');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'rajya-sabha-members.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SLEEP = (ms) => new Promise(r => setTimeout(r, ms));

async function extractMembers(page) {
  return page.evaluate(() => {
    const members = [];
    const seen = new Set();

    // Strategy 1: member cards
    const cards = document.querySelectorAll(
      '.member-card, .MemberCard, [class*="memberCard"], [class*="member-card"], ' +
      '.card, [class*="Card"], [class*="profile-card"], [class*="bio-card"]'
    );
    cards.forEach(card => {
      const nameEl = card.querySelector('h3, h4, h5, [class*="name"], [class*="Name"], strong');
      const name = nameEl?.textContent?.trim();
      if (!name || name.length < 3 || seen.has(name)) return;
      seen.add(name);
      const partyEl = card.querySelector('[class*="party"], [class*="Party"]');
      const stateEl = card.querySelector('[class*="state"], [class*="State"]');
      const imgEl = card.querySelector('img');
      members.push({
        name,
        party: partyEl?.textContent?.trim() || '',
        state: stateEl?.textContent?.trim() || '',
        photoUrl: imgEl?.src || '',
        source: 'card',
      });
    });

    if (members.length > 10) return members;

    // Strategy 2: table rows
    const rows = document.querySelectorAll('table tbody tr, .table tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const name = cells[0]?.textContent?.trim() || cells[1]?.textContent?.trim();
      if (!name || name.length < 3 || seen.has(name)) return;
      seen.add(name);
      const img = row.querySelector('img');
      members.push({
        name,
        party: cells[2]?.textContent?.trim() || cells[3]?.textContent?.trim() || '',
        state: cells[1]?.textContent?.trim() || '',
        stateName: cells[3]?.textContent?.trim() || '',
        photoUrl: img?.src || '',
        source: 'table',
      });
    });

    if (members.length > 10) return members;

    // Strategy 3: list items / generic
    document.querySelectorAll('li, .list-item, [class*="list-item"]').forEach(li => {
      const name = li.querySelector('a, strong, b, h4, h5')?.textContent?.trim();
      if (!name || name.length < 3 || seen.has(name)) return;
      if (/home|about|contact|search|menu|login/i.test(name)) return;
      seen.add(name);
      members.push({ name, party: '', state: '', photoUrl: '', source: 'list' });
    });

    return members;
  });
}

async function scrapeWithPagination(page, baseUrl) {
  console.log(`\n📋 Navigating to: ${baseUrl}`);
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await SLEEP(5000);

  // Take a debug screenshot
  const debugPath = path.join(OUTPUT_DIR, 'debug-rs-initial.png');
  await page.screenshot({ path: debugPath, fullPage: false });
  console.log(`   📸 Screenshot: ${debugPath}`);

  // Check page title and URL
  const title = await page.title();
  const url = page.url();
  console.log(`   Title: ${title}`);
  console.log(`   URL: ${url}`);

  let allMembers = [];
  let page_num = 1;
  const MAX_PAGES = 15;

  while (page_num <= MAX_PAGES) {
    console.log(`\n   📄 Extracting page ${page_num}...`);
    
    // Scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise(r => setTimeout(r, 800));
      }
      window.scrollTo(0, 0);
    });
    await SLEEP(2000);

    const members = await extractMembers(page);
    console.log(`   Found ${members.length} members on page ${page_num}`);

    if (members.length > 0) {
      allMembers = [...allMembers, ...members];
    }

    // Try to find and click "next" pagination button
    const hasNext = await page.evaluate(() => {
      const nextBtns = Array.from(document.querySelectorAll(
        'button, a, [role="button"]'
      )).filter(el => {
        const text = el.textContent?.trim().toLowerCase();
        const label = el.getAttribute('aria-label')?.toLowerCase() || '';
        return text === 'next' || text === '>' || text === '»' || 
               label.includes('next') || el.classList.toString().includes('next');
      });
      if (nextBtns.length > 0 && !nextBtns[0].disabled) {
        nextBtns[0].click();
        return true;
      }
      return false;
    });

    if (!hasNext) {
      console.log(`   No more pages found after page ${page_num}`);
      break;
    }

    await SLEEP(3000);
    page_num++;
  }

  // Deduplicate by name
  const seen = new Set();
  const unique = allMembers.filter(m => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });

  return unique;
}

async function main() {
  console.log('🏛️  Rajya Sabha Scraper (sansad.in)');
  console.log('═'.repeat(60));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    timeout: 90000,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );

    // Try multiple URLs
    const URLS = [
      'https://sansad.in/rs/members',
      'https://sansad.in/rs/members/list-of-members',
      'https://rajyasabha.nic.in/rsnew/current_members/current_member_alphabetical.asp',
    ];

    let members = [];
    for (const url of URLS) {
      try {
        members = await scrapeWithPagination(page, url);
        if (members.length >= 50) {
          console.log(`\n✅ Got ${members.length} members from ${url}`);
          break;
        } else {
          console.log(`⚠️  Only ${members.length} from ${url}, trying next URL...`);
        }
      } catch (err) {
        console.log(`⚠️  Failed: ${url} — ${err.message}`);
      }
    }

    // Save HTML dump for debugging if low count
    if (members.length < 50) {
      const html = await page.content();
      const htmlPath = path.join(OUTPUT_DIR, 'debug-rs-page.html');
      fs.writeFileSync(htmlPath, html);
      console.log(`\n⚠️  Only ${members.length} members. HTML saved: ${htmlPath}`);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(members, null, 2));
    console.log(`\n💾 Saved ${members.length} Rajya Sabha members → ${OUTPUT_FILE}`);

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
