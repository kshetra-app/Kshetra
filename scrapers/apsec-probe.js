#!/usr/bin/env node
/**
 * APSEC / AP local-body RECONNAISSANCE probe (read-only).
 * ══════════════════════════════════════════════════════════════════════════
 * Goal: discover HOW Andhra Pradesh publishes 2021 Gram-Panchayat winners
 * (sarpanch + ward member) at the INDIVIDUAL level, so we can build a
 * zero-fabrication scraper analogous to scrapers/tsec-kyr-scraper.js.
 *
 * Candidate sources (probed for reachability + shape, nothing scraped yet):
 *   • AP SEC          https://sec.ap.gov.in  (+ TSEC-style knowPRRural.do)
 *   • MoPR eGramSwaraj https://egramswaraj.gov.in/knowYourPanchayat.do
 *   • LGD             https://lgdirectory.gov.in
 *   • AP Panchayat Raj https://gsws-nbm.ap.gov.in / panchayatraj portals
 *
 * Prints: status, final URL, <title>, #forms, #selects (+ their names/ids),
 * and any links whose text/href hints at results / know-your / sarpanch.
 * NO writes, NO crawl — just one GET per URL.
 *
 * Usage: node scrapers/apsec-probe.js
 */
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';
const TIMEOUT = 25000;

const TARGETS = [
  'https://sec.ap.gov.in',
  'https://sec.ap.gov.in/',
  'https://apsec.gov.in',
  'https://sec.ap.gov.in/knowPRRural.do',
  'https://sec.ap.gov.in/knowYourPRRural.do',
  'https://egramswaraj.gov.in/knowYourPanchayat.do',
  'https://panchayat.gov.in/sarpanch-address',
];

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await axios({
      method: 'get', url, signal: controller.signal, timeout: TIMEOUT,
      validateStatus: () => true, maxRedirects: 5,
      headers: { 'User-Agent': UA, Connection: 'close' },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    return { error: err.code || err.message };
  }
}

function summarize(url, res) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('URL:', url);
  if (res.error) { console.log('  ❌ ERROR:', res.error); return; }
  console.log('  status:', res.status, '| final:', res.request?.res?.responseUrl || '(n/a)');
  const ct = res.headers['content-type'] || '';
  console.log('  content-type:', ct, '| bytes:', (res.data?.length ?? 0));
  if (!/html|xml|text/.test(ct) || typeof res.data !== 'string') return;
  const $ = cheerio.load(res.data);
  console.log('  <title>:', $('title').first().text().trim().slice(0, 120));
  console.log('  forms:', $('form').length, '| selects:', $('select').length, '| tables:', $('table').length);
  $('select').each((i, el) => {
    const name = $(el).attr('name') || $(el).attr('id') || '(anon)';
    console.log(`    select[${i}] name/id=${name} options=${$('option', el).length}`);
  });
  $('form').each((i, el) => {
    console.log(`    form[${i}] action=${$(el).attr('action')} method=${$(el).attr('method') || 'get'}`);
  });
  const hints = [];
  $('a').each((_, el) => {
    const t = ($(el).text() || '').replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href') || '';
    if (/result|know.?your|sarpanch|ward|panchayat|elected|winner|2021|gram/i.test(t + ' ' + href)) {
      hints.push(`${t.slice(0, 50)} → ${href.slice(0, 90)}`);
    }
  });
  console.log('  relevant links:', hints.length);
  hints.slice(0, 25).forEach((h) => console.log('    •', h));
}

(async () => {
  for (const url of TARGETS) {
    const res = await get(url);
    summarize(url, res);
  }
  console.log('\n✅ Probe complete.');
})();
