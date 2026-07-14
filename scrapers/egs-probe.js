#!/usr/bin/env node
/**
 * eGramSwaraj "Know Your Panchayat" RECONNAISSANCE (read-only).
 * ══════════════════════════════════════════════════════════════════════════
 * Reverse-engineers https://egramswaraj.gov.in/knowYourPanchayat.do so we can
 * build a zero-fabrication AP local-body scraper. Captures:
 *   • session cookie(s) + any CSRF/struts token on the initial page
 *   • the stateId <option> list (to find Andhra Pradesh's code)
 *   • the cascade selects + the JS AJAX endpoints that populate them
 *   • all ".do" references found in inline/external scripts
 * Saves the raw HTML to scrapers/tmp-egs.html for manual inspection.
 *
 * Usage: node scrapers/egs-probe.js
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE = 'https://egramswaraj.gov.in';
const URL = `${BASE}/knowYourPanchayat.do`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';

const jar = {};
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }
function absorb(res) {
  for (const c of res.headers?.['set-cookie'] || []) {
    const [pair] = c.split(';'); const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}
async function get(url) {
  const res = await axios({ method: 'get', url, timeout: 30000, validateStatus: () => true,
    maxRedirects: 5, headers: { 'User-Agent': UA, Connection: 'close', Cookie: cookieHeader() } });
  absorb(res);
  return res;
}

(async () => {
  const res = await get(URL);
  console.log('status:', res.status, '| bytes:', res.data?.length);
  console.log('cookies:', Object.keys(jar).join(', ') || '(none)');
  const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  fs.writeFileSync(path.resolve(__dirname, 'tmp-egs.html'), html);
  const $ = cheerio.load(html);

  // CSRF / struts tokens
  console.log('\n── hidden inputs ──');
  $('input[type=hidden]').each((_, el) => {
    console.log(`  ${$(el).attr('name')} = ${($(el).attr('value') || '').slice(0, 40)}`);
  });

  // stateId options
  console.log('\n── stateId options (name, value) ──');
  $('#stateId option, select[name=stateId] option').each((_, el) => {
    const v = ($(el).attr('value') || '').trim();
    const t = $(el).text().trim();
    if (t && /andhra|value/i.test(t) || v) console.log(`  ${v}  ${t}`);
  });

  // all selects
  console.log('\n── selects ──');
  $('select').each((i, el) => {
    console.log(`  select[${i}] name=${$(el).attr('name')} id=${$(el).attr('id')} onchange=${$(el).attr('onchange') || ''}`);
  });

  // external scripts
  console.log('\n── script src ──');
  $('script[src]').each((_, el) => console.log('  ', $(el).attr('src')));

  // ".do" references in inline scripts + onchange handlers
  console.log('\n── ".do" / ajax refs in inline JS ──');
  const doRefs = new Set();
  $('script:not([src])').each((_, el) => {
    const js = $(el).html() || '';
    for (const m of js.matchAll(/["'`]([^"'`]*\.do[^"'`]*)["'`]/g)) doRefs.add(m[1]);
    for (const m of js.matchAll(/(function\s+\w+\s*\([^)]*\))/g)) { /* noop */ }
  });
  [...doRefs].slice(0, 40).forEach((r) => console.log('  ', r));

  // function names referenced in onchange
  console.log('\n── onchange handlers ──');
  $('[onchange]').each((_, el) => console.log(`  ${$(el).attr('name') || $(el).attr('id')}: ${$(el).attr('onchange')}`));

  console.log('\n✅ saved raw HTML → scrapers/tmp-egs.html');
})().catch((e) => console.error('ERR', e.message));
