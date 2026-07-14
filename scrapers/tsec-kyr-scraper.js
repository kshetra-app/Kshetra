#!/usr/bin/env node
/**
 * TSEC "Know Your Representative" (Rural) Scraper — HARDENED, PURE HTTP
 * ══════════════════════════════════════════════════════════════════════════
 * Source (reverse-engineered live): https://tsec.gov.in/knowPRRural.do
 *
 *   Struts app. One session (JSESSIONID cookie) + one CSRF TOKEN captured from
 *   the initial page are reused for the whole crawl (the real UI runs many
 *   reports without reloading, so the token is NOT single-use).
 *
 *   Office selector `knowYour`: Z=ZPTC, M=MPTC, S=Sarpanch, GW=GP Ward.
 *
 *   Cascade (POST knowPRRural.do):
 *     mode=getElectionFornew&year_id=<Y>&knowYour=<O>   → <option> election ids
 *     mode=getMandal&district_id=<D>                    → <option> mandals
 *     mode=getMPTC&district_id=<D>&mandal_id=<M>        → <option> MPTC seats
 *     mode=getGramPanchayat&district_id=<D>&mandal_id=<M> → <option> GPs
 *
 *   Report (POST knowPRRural.se) with mode:
 *     S→getSarpanchDetailsnew  GW→getGPWardDetailsnew
 *     M→getMptcDetailsnew       Z→getZptcDetailsnew
 *   plus property(...) fields + TOKEN + per-office property(typeOfReport)
 *   (see OFFICE_META.report): Sarpanch/MPTC use 'A' (All Contested — winner is
 *   flagged via Result Status="Elected"); GP Ward uses 'E' (Only Elected) — 'A'
 *   just re-renders the search form for the ward grid.
 *
 * ZERO-FABRICATION: every emitted record is parsed verbatim from the official
 * report HTML and tagged with source_url. Nothing is synthesized.
 *
 * Output: scrapers/output/local-body/TS-<year>-<office>-kyr.json
 *   → consumed by scripts/import-local-body-reps.mjs --source=kyr --office=<O>
 *
 * DATA AVAILABILITY (verified live, Jul 2026): only the 2025 GRAM-PANCHAYAT-tier
 * ordinary elections have published RESULTS on the portal:
 *   • --office=S  --year=2025  (Sarpanch, electionFor=189) — district-level, 1 req/district → 12,701 winners
 *   • --office=GW --year=2025  (GP Ward, electionFor=189)  — 1 req/GP (heavy: ~13k reqs) → ~59k winners
 *   • --office=M  --year=2025  (MPTC, electionFor=188)     — the MPTC divisions are
 *     LISTED but every one shows "Total Valid Votes: 0" with ZERO candidate rows
 *     under both typeOfReport A and E → results NOT published (polls pending). Empty.
 *   • --office=Z  → the portal exposes NO electionFor for ZPTC → "No Data Found". Empty.
 * (MPTC/ZPTC 2025 polls were postponed; only the GP tier was held & published.)
 *
 * Usage:
 *   node scrapers/tsec-kyr-scraper.js --year=2025 --office=S               # all districts
 *   node scrapers/tsec-kyr-scraper.js --year=2025 --office=S --district=01 # one district
 *   node scrapers/tsec-kyr-scraper.js --year=2025 --office=M --limit=1     # smoke test
 */

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const { LOCAL_BODY_OUTPUT_DIR } = require('./config');
const { ensureDir, writeJSON, sleep } = require('./utils');

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;

const YEAR = arg('year');
const OFFICE = (arg('office', 'S') || 'S').toUpperCase(); // S | GW | M | Z
const DISTRICT_FILTER = arg('district'); // 2-digit code, optional
const LIMIT = arg('limit') ? parseInt(arg('limit'), 10) : Infinity; // cap districts (testing)
const MAX_MANDALS = arg('maxmandals') ? parseInt(arg('maxmandals'), 10) : Infinity; // cap mandals/district (testing)
const MAX_GPS = arg('maxgps') ? parseInt(arg('maxgps'), 10) : Infinity; // cap GPs/mandal (testing)
const DELAY = arg('delay') ? parseInt(arg('delay'), 10) : 250; // ms between requests

const BASE = 'https://tsec.gov.in';
const CASCADE_URL = `${BASE}/knowPRRural.do`;
const REPORT_URL = `${BASE}/knowPRRural.se`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';

// `needs` = cascade levels that must be selected before the report returns data.
// Verified against the live portal (Jul 2026):
//   • Sarpanch report at DISTRICT level (mandal=0,gp=0) returns EVERY GP sarpanch
//     candidate for the district in ONE response → needs: [] (no per-GP crawl).
//   • MPTC report needs a mandal; returns all MPTC-constituency candidates in it.
//   • GP Ward report needs a mandal AND a gram panchayat selected — a mandal-only
//     POST just re-returns the search form (verified Jul 2026). It returns every
//     ward candidate in that GP.
//   • ZPTC has no electionFor options on the portal → no data published.
// `report` = property(typeOfReport). Verified quirk (Jul 2026): Sarpanch/MPTC
// return the results grid ONLY for 'A' (All Contested); GP Ward returns the grid
// ONLY for 'E' (Only Elected) — 'A' just re-renders the search form.
const OFFICE_META = {
  S: { office_type: 'sarpanch', jurisdiction: 'gram_panchayat', mode: 'getSarpanchDetailsnew', needs: [], report: 'A' },
  GW: { office_type: 'gp_ward_member', jurisdiction: 'gp_ward', mode: 'getGPWardDetailsnew', needs: ['mandal', 'gp'], report: 'E' },
  M: { office_type: 'mptc_member', jurisdiction: 'mptc_division', mode: 'getMptcDetailsnew', needs: ['mandal'], report: 'A' },
  Z: { office_type: 'zptc_member', jurisdiction: 'zptc_division', mode: 'getZptcDetailsnew', needs: [], report: 'A' },
};

if (!YEAR || !OFFICE_META[OFFICE]) {
  console.log('Usage: node scrapers/tsec-kyr-scraper.js --year=2019 --office=S|GW|M|Z [--district=01] [--limit=N]');
  process.exit(0);
}

// ── Session (cookie jar + CSRF token) ────────────────────────────────────────
const jar = {}; // name -> value
function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}
function absorbCookies(res) {
  const set = res.headers?.['set-cookie'] || [];
  for (const c of set) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
}

const REQ_TIMEOUT = 30000; // per-attempt hard ceiling
const MAX_RETRIES = 4;

// axios's `timeout` only fires between chunks; a half-open keep-alive socket can
// stall for hours without ever timing out (this exactly hung a 34-district crawl
// at ~district 9 for 15h). We therefore drive an AbortController from setTimeout
// as a HARD ceiling, send Connection: close to avoid reusing dead sockets, and
// retry transient failures with linear backoff.
async function request(config, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    try {
      const res = await axios({
        ...config,
        signal: controller.signal,
        timeout: REQ_TIMEOUT,
        validateStatus: () => true,
        maxRedirects: 5,
        headers: { Connection: 'close', ...config.headers },
      });
      clearTimeout(timer);
      absorbCookies(res);
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`   ⚠️  ${label} attempt ${attempt}/${MAX_RETRIES} failed (${err.code || err.message}); retrying in ${attempt}s…`);
        await sleep(1000 * attempt);
      }
    }
  }
  throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${lastErr?.message || lastErr}`);
}

async function httpGet(url) {
  return request({ method: 'get', url, headers: { 'User-Agent': UA, Cookie: cookieHeader() } }, `GET ${url}`);
}

async function httpPost(url, form, { ajax = true } = {}) {
  const headers = {
    'User-Agent': UA,
    Cookie: cookieHeader(),
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: CASCADE_URL,
  };
  // Cascade lookups are XHR; the report is a normal form submit (no XHR header,
  // otherwise the portal returns a fragment without the results grid).
  if (ajax) headers['X-Requested-With'] = 'XMLHttpRequest';
  return request({ method: 'post', url, data: new URLSearchParams(form).toString(), headers }, `POST ${url}`);
}

// ── Parsing helpers ──────────────────────────────────────────────────────────
/** Parse an `<option>` fragment (AJAX response) → [{value,text}] minus placeholders. */
function parseOptions(html) {
  const $ = cheerio.load(`<select>${html}</select>`);
  const out = [];
  $('option').each((_, el) => {
    const value = ($(el).attr('value') || '').trim();
    const text = $(el).text().trim();
    if (value && value !== '0' && !/^-+\s*select\s*-+$/i.test(text)) out.push({ value, text });
  });
  return out;
}

/** Extract the token + side_serviceid + district options from the initial page. */
function parsePageState(html) {
  const $ = cheerio.load(html);
  const token = $('input[name="org.apache.struts.taglib.html.TOKEN"]').first().attr('value') || '';
  const sideServiceId = $('input[name="property(side_serviceid)"]').first().attr('value') || '';
  const districts = [];
  $('#district_id option').each((_, el) => {
    const value = ($(el).attr('value') || '').trim();
    const text = $(el).text().trim();
    if (value && value !== '0' && !/^-+\s*select\s*-+$/i.test(text)) districts.push({ value, text });
  });
  return { token, sideServiceId, districts };
}

/**
 * Scrape the RESULTS table from a report page. Returns header-keyed row objects.
 *
 * Two layouts are handled:
 *   • Sarpanch (flat): [Sl No | Name | Votes Secured | Result Status] — no party.
 *   • MPTC / GP Ward / ZPTC: a 5-col grid
 *     [Sl No | Member Name | Party affiliation | Votes Secured | Result Status]
 *     INTERLEAVED with single-cell "section" rows that name the constituency and
 *     its reservation, e.g. "MPTC Name : Ankoli , Reserved for : BC , ...".
 *     Those rows are parsed to attach `_section`/`_reserved` to the candidate
 *     rows that follow (so every candidate carries its constituency context).
 */
function cellText($, tr) {
  const cells = [];
  $('td,th', tr).each((_, c) => cells.push($(c).text().replace(/\s+/g, ' ').trim()));
  return cells;
}

function parseReportRows(html) {
  const $ = cheerio.load(html);
  let target = null;
  $('table').each((_, t) => {
    if (target) return;
    if ($('table', t).length > 0) return; // leaf tables only
    const txt = $(t).text().toLowerCase();
    if (/party\s*affiliation|member\s*name|sarpanch\s*name|votes\s*secured|result\s*status/.test(txt)) target = t;
  });
  if (!target) return [];

  const trs = $('tr', target).toArray();
  // Header row = the one containing "Result Status" (and usually "Sl No").
  let hIdx = trs.findIndex((tr) => /result\s*status/i.test($(tr).text()));
  if (hIdx < 0) hIdx = trs.findIndex((tr) => /sl\.?\s*no/i.test($(tr).text()));
  if (hIdx < 0) hIdx = 0;
  const headers = cellText($, trs[hIdx]).map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));

  const out = [];
  let section = null; // { name, reserved }
  for (let i = hIdx + 1; i < trs.length; i++) {
    const cells = cellText($, trs[i]);
    const nonEmpty = cells.filter((x) => x);
    if (!nonEmpty.length) continue;

    // Section context row: a single merged cell naming the constituency and its
    // reservation. Two verified label variants:
    //   "Gram Panchayat : Jalkori , Reserved for : ST(W) , Total Vaild Votes ..."
    //   "MPTC Name : Ankoli , Reserved for : -- , Total Vaild Votes ..."
    if (nonEmpty.length === 1 && /reserved\s*for\s*:/i.test(nonEmpty[0])) {
      const s = nonEmpty[0];
      // Name = value after the first ":" up to " , Reserved for".
      const name = (s.match(/:\s*([^,]+?)\s*,\s*reserved\s*for/i) || [])[1] || null;
      const reserved = (s.match(/reserved\s*for\s*:\s*([^,]+?)\s*(?:,|$)/i) || [])[1] || null;
      section = { name: name && name.trim(), reserved: reserved && reserved.trim() };
      continue;
    }

    // Data row: first cell is a serial number.
    if (!/^\d+$/.test(cells[0])) continue;
    const rec = {};
    cells.forEach((c, idx) => { rec[headers[idx] || `col_${idx}`] = c; });
    if (section) { rec._section = section.name; rec._reserved = section.reserved; }
    out.push(rec);
  }
  return out;
}

// ── Field mapping (header-agnostic) ─────────────────────────────────────────────
// Priority is WANT order (not rec-key order): the first `keys` entry that matches
// any header wins. This lets us disambiguate the GP-Ward grid, which carries BOTH
// `ward_name` and `name_of_the_elected_candidate` — a bare 'name' want would wrongly
// grab the ward. So callers list specific wants (e.g. 'elected_candidate') first.
function pick(rec, keys) {
  for (const want of keys) {
    const k = Object.keys(rec).find((key) => key.includes(want));
    if (k) return rec[k];
  }
  return null;
}

function toRepRecord(rec, ctx) {
  // Candidate name column varies by office: Sarpanch "Name", MPTC "MPTC Member Name",
  // GP Ward "Name of the Elected Candidate". Match specific wants before bare 'name'
  // so we never grab GP-Ward's "Ward Name" column.
  const name = pick(rec, ['elected_candidate', 'member_name', 'sarpanch', 'representative', 'name']);
  if (!name || /^s\.?\s*no$|^total$/i.test(name)) return null;
  const result = pick(rec, ['result_status', 'result', 'status']);
  // typeOfReport=A returns ALL contested candidates; the winner's Result Status
  // is "Elected"/"Won"/"Unopposed", losers are "--".
  const elected = result ? /won|elect|unopp|unanim/i.test(result) : false;
  const votesRaw = pick(rec, ['votes_secured', 'votes']);
  // The interleaved section row names the constituency (MPTC/GP-Ward/ZPTC) and
  // its reservation; carry it through for those offices.
  const section = rec._section || null;
  const meta = OFFICE_META[OFFICE];
  return {
    office_type: meta.office_type,
    jurisdiction_type: meta.jurisdiction,
    state_code: 'TS',
    year: Number(YEAR),
    district: ctx.districtName,
    district_code: ctx.districtCode,
    mandal: ctx.mandalName ?? pick(rec, ['mandal']),
    // For Sarpanch the section IS the gram panchayat; for MPTC/ZPTC it's the
    // territorial constituency; for GP Ward it's the ward's GP.
    constituency: section,
    gram_panchayat: OFFICE === 'S' ? section : (ctx.gpName ?? pick(rec, ['panchayat', 'gp_name'])),
    // GP Ward grid has a "Ward Name" column like "Ward 1" → keep the bare number.
    ward_no: (() => { const w = pick(rec, ['ward']); return w ? (w.match(/\d+/)?.[0] ?? w) : null; })(),
    name,
    party: pick(rec, ['party']),
    votes: votesRaw ? parseInt(votesRaw.replace(/[^0-9]/g, ''), 10) || null : null,
    result_status: result || null,
    elected,
    gender: pick(rec, ['gender', 'sex']),
    // GP Ward grid uses a "Reserved for" column (no interleaved section row).
    reservation: rec._reserved || pick(rec, ['reservation', 'category', 'reserved']),
    source_url: CASCADE_URL,
  };
}

// ── Report request ──────────────────────────────────────────────────────────
function buildReportForm(state, ctx) {
  return {
    'org.apache.struts.taglib.html.TOKEN': state.token,
    mode: OFFICE_META[OFFICE].mode,
    'property(side_serviceid)': state.sideServiceId,
    'property(knowYour)': OFFICE,
    'property(year)': YEAR,
    'property(electionFor)': state.electionFor || YEAR,
    'property(district_id)': ctx.districtCode || '0',
    'property(mandal_id)': ctx.mandalCode || '0',
    'property(mptc)': ctx.mptcCode || '0',
    'property(gpcode)': ctx.gpCode || '0',
    // Per-office (see OFFICE_META.report): Sarpanch/MPTC need 'A' (All Contested)
    // to return the grid; GP Ward needs 'E' (Only Elected) — 'A' returns the form.
    'property(typeOfReport)': OFFICE_META[OFFICE].report,
    action: 'add',
  };
}

async function runReport(state, ctx) {
  await sleep(DELAY);
  const html = await httpPost(REPORT_URL, buildReportForm(state, ctx), { ajax: false });
  if (process.env.DBG) {
    const $ = cheerio.load(html);
    const leafMatch = [];
    $('table').each((i, t) => { if ($('table', t).length === 0 && /party\s*affiliation|member\s*name/i.test($(t).text())) leafMatch.push(i); });
    console.error(`[DBG] len=${html.length} tables=${$('table').length} leafMatch=${JSON.stringify(leafMatch)} party=${/party affiliation/i.test(html)} noRec=${/no record/i.test(html)}`);
    require('fs').writeFileSync('dbg-report.html', html);
  }
  return parseReportRows(html);
}

// ── Main crawl ────────────────────────────────────────────────────────────────
async function main() {
  ensureDir(LOCAL_BODY_OUTPUT_DIR);
  const meta = OFFICE_META[OFFICE];
  console.log(`🏛️  TSEC KYR Rural — ${meta.office_type} — year ${YEAR}`);

  // 1. Initial page → session cookie + token + district list.
  const pageHtml = await httpGet(CASCADE_URL);
  const state = parsePageState(pageHtml);
  if (!state.token) console.warn('   ⚠️ No CSRF token found — report POSTs may be rejected.');
  console.log(`   Session ${jar.JSESSIONID ? 'ok' : 'MISSING'}, token ${state.token ? 'ok' : 'MISSING'}, districts ${state.districts.length}`);

  // 2. Resolve electionFor (election id for this year+office).
  const efHtml = await httpPost(`${CASCADE_URL}?mode=getElectionFornew&year_id=${YEAR}&knowYour=${OFFICE}`, {});
  const efOpts = parseOptions(efHtml);
  state.electionFor = efOpts[0]?.value || YEAR;
  console.log(`   electionFor=${state.electionFor} (${efOpts.length} option(s))`);

  let districts = state.districts;
  if (DISTRICT_FILTER) districts = districts.filter((d) => d.value === DISTRICT_FILTER);
  districts = districts.slice(0, LIMIT);
  console.log(`   Districts to crawl: ${districts.length}`);

  const outFile = path.join(LOCAL_BODY_OUTPUT_DIR, `TS-${YEAR}-${OFFICE}-kyr.json`);
  // Resume-by-default: reload a matching prior run and skip districts already
  // flushed (flush is per-district, so any district present is COMPLETE). This
  // makes a killed/hung crawl cheap to continue instead of restarting. Pass
  // --fresh to ignore existing output.
  let records = [];
  const doneDistricts = new Set();
  const fs = require('fs');
  if (!args.includes('--fresh') && fs.existsSync(outFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      if (Array.isArray(prev.records) && prev.office === meta.office_type && prev.year === Number(YEAR)) {
        records = prev.records;
        for (const r of records) if (r.district) doneDistricts.add(r.district);
        console.log(`   ↻ Resume: ${records.length} records from ${doneDistricts.size} completed district(s)`);
      }
    } catch { /* corrupt/partial file → start fresh */ }
  }
  // Flush after every district so a late failure never discards the whole crawl
  // (re-downloading the portal is the expensive part — records are cheap to write).
  const flush = () => writeJSON(outFile, {
    source: 'TSEC Know Your Representative (Rural)',
    sourceUrl: CASCADE_URL,
    stateCode: 'TS',
    year: Number(YEAR),
    office: meta.office_type,
    scrapedAt: new Date().toISOString(),
    count: records.length,
    records,
  });

  for (const district of districts) {
    if (doneDistricts.has(district.text)) {
      console.log(`   ⏭  ${district.text}: already complete, skipping`);
      continue;
    }
    const ctx = { districtCode: district.value, districtName: district.text };

    if (meta.needs.length === 0) {
      // ZPTC — district-level report.
      for (const r of await runReport(state, ctx)) { const rec = toRepRecord(r, ctx); if (rec) records.push(rec); }
      flush();
      console.log(`   ${district.text}: ${records.length} total`);
      continue;
    }

    // Fetch mandals.
    await sleep(DELAY);
    const mandalHtml = await httpPost(`${CASCADE_URL}?mode=getMandal&district_id=${district.value}`, {});
    const mandals = parseOptions(mandalHtml).slice(0, MAX_MANDALS);

    for (const mandal of mandals) {
      ctx.mandalCode = mandal.value;
      ctx.mandalName = mandal.text;
      ctx.gpCode = undefined; ctx.gpName = undefined;

      if (!meta.needs.includes('gp')) {
        // MPTC — mandal-level report.
        for (const r of await runReport(state, ctx)) { const rec = toRepRecord(r, { ...ctx }); if (rec) records.push(rec); }
        continue;
      }

      // Fetch gram panchayats.
      await sleep(DELAY);
      const gpHtml = await httpPost(`${CASCADE_URL}?mode=getGramPanchayat&district_id=${district.value}&mandal_id=${mandal.value}`, {});
      const gps = parseOptions(gpHtml).slice(0, MAX_GPS);

      for (const gp of gps) {
        ctx.gpCode = gp.value;
        ctx.gpName = gp.text;
        for (const r of await runReport(state, ctx)) { const rec = toRepRecord(r, { ...ctx }); if (rec) records.push(rec); }
      }
    }
    flush();
    console.log(`   ${district.text}: ${records.length} total so far`);
  }

  flush();
  console.log(`\n✨ Done — ${records.length} records → ${outFile}`);
}

main().catch((err) => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
