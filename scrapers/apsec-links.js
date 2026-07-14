#!/usr/bin/env node
/** Dump sec.ap.gov.in homepage + all links (read-only) to find its results/KYR portal. */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';

async function get(url) {
  return axios({ method: 'get', url, timeout: 30000, validateStatus: () => true, maxRedirects: 5,
    headers: { 'User-Agent': UA, Connection: 'close' } });
}
(async () => {
  const res = await get('https://sec.ap.gov.in/');
  const html = typeof res.data === 'string' ? res.data : '';
  fs.writeFileSync(path.resolve(__dirname, 'tmp-apsec.html'), html);
  console.log('status', res.status, 'bytes', html.length);
  const $ = cheerio.load(html);
  console.log('<title>', $('title').text().trim());
  const links = [];
  $('a').each((_, el) => {
    const t = ($(el).text() || '').replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href') || '';
    if (href && href !== '#') links.push({ t, href });
  });
  console.log('total links:', links.length);
  console.log('\n── links mentioning results/panchayat/sarpanch/ward/2021/know/elect ──');
  for (const l of links) {
    if (/result|panchayat|sarpanch|ward|2021|2020|know|elect|winner|gram|report|search/i.test(l.t + ' ' + l.href)) {
      console.log(`  ${l.t.slice(0, 55).padEnd(55)} → ${l.href}`);
    }
  }
  console.log('\n── ALL unique hrefs ──');
  [...new Set(links.map((l) => l.href))].forEach((h) => console.log('  ', h));
})().catch((e) => console.error('ERR', e.message));
