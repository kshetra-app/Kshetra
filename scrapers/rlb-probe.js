#!/usr/bin/env node
/** Probe APSEC Rural Local Bodies election-results portal (read-only). */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';

const jar = {};
const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
function absorb(res) {
  for (const c of res.headers?.['set-cookie'] || []) {
    const [p] = c.split(';'); const i = p.indexOf('=');
    if (i > 0) jar[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
}
async function get(url) {
  const res = await axios({ method: 'get', url, timeout: 30000, validateStatus: () => true,
    maxRedirects: 5, headers: { 'User-Agent': UA, Connection: 'close', Cookie: cookieHeader() } });
  absorb(res); return res;
}

(async () => {
  const url = 'https://sec.ap.gov.in/rlbselecresults.sec';
  const res = await get(url);
  const html = typeof res.data === 'string' ? res.data : '';
  fs.writeFileSync(path.resolve(__dirname, 'tmp-rlb.html'), html);
  console.log('status', res.status, 'bytes', html.length, '| cookies:', Object.keys(jar).join(','));
  const $ = cheerio.load(html);
  console.log('<title>', $('title').text().trim());
  console.log('forms', $('form').length, 'selects', $('select').length, 'tables', $('table').length, 'iframes', $('iframe').length);

  $('form').each((i, el) => console.log(`  form[${i}] action=${$(el).attr('action')} method=${$(el).attr('method')} id=${$(el).attr('id')}`));
  $('iframe').each((i, el) => console.log(`  iframe[${i}] src=${$(el).attr('src')}`));
  $('select').each((i, el) => {
    console.log(`  select[${i}] name=${$(el).attr('name')} id=${$(el).attr('id')} onchange=${($(el).attr('onchange')||'').slice(0,80)} options=${$('option', el).length}`);
    $('option', el).slice(0, 6).each((_, o) => console.log(`       ${$(o).attr('value')}  ${$(o).text().trim().slice(0,40)}`));
  });
  console.log('\n── hidden inputs ──');
  $('input[type=hidden]').each((_, el) => console.log(`  ${$(el).attr('name')} = ${($(el).attr('value')||'').slice(0,50)}`));
  console.log('\n── script src ──');
  $('script[src]').each((_, el) => console.log('  ', $(el).attr('src')));
  console.log('\n── ".sec"/".do"/ajax refs in inline JS ──');
  const refs = new Set();
  $('script:not([src])').each((_, el) => {
    const js = $(el).html() || '';
    for (const m of js.matchAll(/["'`]([^"'`]*\.(?:sec|do)[^"'`]*)["'`]/g)) refs.add(m[1]);
    for (const m of js.matchAll(/(getElementById\(['"][^'"]+['"]\)|\.load\([^)]*\)|url\s*:\s*['"][^'"]+['"])/g)) refs.add(m[1]);
  });
  [...refs].slice(0, 50).forEach((r) => console.log('  ', r));
  console.log('\n── onchange handlers ──');
  $('[onchange]').each((_, el) => console.log(`  ${$(el).attr('name')||$(el).attr('id')}: ${$(el).attr('onchange')}`));
  console.log('\n✅ saved → scrapers/tmp-rlb.html');
})().catch((e) => console.error('ERR', e.message));
