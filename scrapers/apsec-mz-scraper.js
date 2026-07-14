#!/usr/bin/env node
/**
 * APSEC 2021 MPTC + ZPTC results scraper (PDF → JSON), HARDENED.
 * ══════════════════════════════════════════════════════════════════════════
 * Companion to apsec-gp-scraper.js. Unlike the non-party GP polls, the
 * Mandal/Zilla Parishad Territorial Constituency (MPTC/ZPTC) polls are
 * PARTY-BASED, and the SEC publishes each tier as a single state-wide PDF:
 *   https://sec.ap.gov.in/Doc21/MPTC.pdf   (580 pp)
 *   https://sec.ap.gov.in/Doc21/ZPTC.pdf   (44 pp)
 * Both share one 9-column table (verified via positional extraction):
 *   Sl.No | District | Mandal | <MPTC|ZPTC> | Reservation | Candidate Name
 *   | Party Affiliation | Gender | Community
 *
 * ZERO-FABRICATION: every row is the OFFICIAL elected winner parsed verbatim,
 * each stamped with the tier PDF as source_url. Party IS official here
 * (party_official=true downstream). Gender + community come straight from the
 * PDF (no inference). Votes are not published → null.
 *
 * Output: scrapers/output/local-body/AP-2021-MZ-kyr.json
 *   → consumed by scripts/generate-local-body-seed.mjs / import-local-body-reps.mjs
 *     via the shared kyr-transform (office_type switch handles mptc/zptc).
 *
 * Usage:
 *   node scrapers/apsec-mz-scraper.js                 # both tiers (resume)
 *   node scrapers/apsec-mz-scraper.js --tier=ZPTC --pages=3   # smoke test
 *   node scrapers/apsec-mz-scraper.js --fresh
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { LOCAL_BODY_OUTPUT_DIR } = require('./config');
const { ensureDir, writeJSON, sleep } = require('./utils');

const args = process.argv.slice(2);
const arg = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const TIER_FILTER = arg('tier')?.toUpperCase();
const MAX_PAGES = arg('pages') ? parseInt(arg('pages'), 10) : Infinity;
const FRESH = args.includes('--fresh');

const BASE = 'https://sec.ap.gov.in';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';
const PDF_DIR = path.join(LOCAL_BODY_OUTPUT_DIR, 'ap-2021');
const OUT_FILE = path.join(LOCAL_BODY_OUTPUT_DIR, 'AP-2021-MZ-kyr.json');

const TIERS = [
  { tier: 'MPTC', url: `${BASE}/Doc21/MPTC.pdf`, office: 'mptc_member', jt: 'mptc_division' },
  { tier: 'ZPTC', url: `${BASE}/Doc21/ZPTC.pdf`, office: 'zptc_member', jt: 'zptc_division' },
];

// 9-column schema shared by both tiers; boundaries derived from data clusters.
const COL_KEYS = ['slno', 'district', 'mandal', 'division', 'reservation', 'name', 'party', 'gender', 'community'];

const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/**
 * Normalize the free-text Party Affiliation cell to a canonical code. The SEC
 * PDF has heavy spelling/case/annotation variance (Ysrcp, Y.S.R.C.P., YCP,
 * "(Mpp)YSRCP", REDDYYSRCP; Independent/Indipendent/INDIPENDENT; JANASENAPARTY…)
 * and occasionally a stray name word bleeds in from an over-wide name cell.
 * Substring matching maps every variant — and bleed cases — to the real party.
 * Unknown values are preserved verbatim (rare) so nothing is silently dropped.
 */
function normalizeParty(raw) {
  const s = cleanName(raw);
  if (!s) return null;
  const u = s.toUpperCase().replace(/[^A-Z()]/g, ''); // drop spaces/dots/digits, keep parens for CPI(M)
  if (/YSRCP|YSRC|YSRP|YCP/.test(u)) return 'YSRCP';
  if (/TDP|TELUGUDESAM/.test(u)) return 'TDP';
  if (/JANASENA|JSP/.test(u)) return 'JSP';
  if (/BJP|BHARATIYAJANATA/.test(u)) return 'BJP';
  if (/CPIML/.test(u)) return 'CPIML';
  if (/CPI\(M\)|CPIM|CPM/.test(u)) return 'CPM';
  if (/CPI/.test(u)) return 'CPI';
  if (/INDEP|INDIP/.test(u) || u === 'IND') return 'IND';
  if (/CONGRESS|^INC$/.test(u)) return 'INC';
  if (/BSP|BAHUJAN/.test(u)) return 'BSP';
  if (/COMMUNIST/.test(u)) return 'CPI';
  return s; // unknown → keep verbatim
}

/** Derive column boundaries from data left-edge clusters (see apsec-gp-scraper). */
function buildLayout(pages) {
  let headerY = null;
  for (const items of pages) {
    const h = items.find((it) => /^candidate/i.test(it.s));
    if (h) { headerY = h.y; break; }
  }
  if (headerY == null) return null;
  const dataTop = headerY - 30; // excludes header row + the numeric column-index row

  // Tally data-item left edges (rounded) from up to 25 populated pages.
  const tally = new Map();
  let sampled = 0;
  for (const items of pages) {
    let has = false;
    for (const it of items) if (it.y < dataTop && it.y > 40) { const k = Math.round(it.x); tally.set(k, (tally.get(k) || 0) + 1); has = true; }
    if (has && ++sampled >= 25) break;
  }
  if (tally.size < 9) return null;

  // Collapse each column's small left-edge spread (≤6px) into one weighted peak.
  const keys = [...tally.keys()].sort((a, b) => a - b);
  const peaks = [];
  for (const k of keys) {
    const f = tally.get(k);
    const last = peaks[peaks.length - 1];
    if (last && k - last.x <= 6) { const tot = last.freq + f; last.x = (last.x * last.freq + k * f) / tot; last.freq = tot; }
    else peaks.push({ x: k, freq: f });
  }
  // Pick the N densest peaks (the real columns), keeping them ≥14px apart so
  // low-frequency noise (index-row digits, wrapped fragments) is ignored. This
  // is robust to BOTH close columns (Sl.No↔District) and centered headers.
  const chosen = [];
  for (const p of [...peaks].sort((a, b) => b.freq - a.freq)) {
    if (chosen.every((c) => Math.abs(c.x - p.x) >= 14)) chosen.push(p);
    if (chosen.length === COL_KEYS.length) break;
  }
  if (chosen.length !== COL_KEYS.length) return null;
  chosen.sort((a, b) => a.x - b.x);

  const bounds = chosen.map((c, k) => ({
    key: COL_KEYS[k],
    left: k === 0 ? -Infinity : (chosen[k - 1].x + c.x) / 2,
    right: k === chosen.length - 1 ? Infinity : (c.x + chosen[k + 1].x) / 2,
  }));
  if (process.env.DEBUG_LAYOUT) console.error('\n[layout]', chosen.map((c, k) => `${COL_KEYS[k]}@${c.x.toFixed(0)}`).join(' '));
  return { dataTop, colOf: (x) => (bounds.find((b) => x >= b.left && x < b.right) || {}).key };
}

async function download(url, dest) {
  const MAX = 4;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await axios({ method: 'get', url, responseType: 'arraybuffer', signal: controller.signal,
        timeout: 120000, validateStatus: () => true, maxRedirects: 5, headers: { 'User-Agent': UA, Connection: 'close' } });
      clearTimeout(timer);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(res.data);
      if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('not a PDF');
      fs.writeFileSync(dest, buf);
      return buf;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX) { console.warn(`   ⚠️  download attempt ${attempt}/${MAX} (${err.message}); retry`); await sleep(1000 * attempt); }
      else throw err;
    }
  }
}

async function parsePdf(buf, tierDef, pdfjs) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const nPages = Math.min(MAX_PAGES, doc.numPages);
  const records = [];
  const stats = { rows: 0, missingName: 0, skipped: 0 };

  const pages = [];
  for (let p = 1; p <= nPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = [];
    for (const it of content.items) {
      const s = it.str.replace(/\s+/g, ' ').trim();
      if (s) items.push({ x: it.transform[4], y: it.transform[5], s });
    }
    page.cleanup?.();
    pages.push(items);
    if (p % 100 === 0 || p === nPages) process.stdout.write(`\r   ${tierDef.tier}: reading page ${p}/${nPages}`);
  }
  process.stdout.write('\n');

  const layout = buildLayout(pages);
  if (!layout) { await doc.destroy(); throw new Error(`could not derive column layout for ${tierDef.tier}`); }
  const { dataTop, colOf } = layout;

  for (const items of pages) {
    const skeleton = [];
    const names = [];
    for (const it of items) {
      if (it.y >= dataTop) continue; // header + index row
      if (it.y < 40) continue;       // footer
      const col = colOf(it.x);
      if (col === 'name') names.push(it);
      else if (col) skeleton.push({ ...it, col });
    }
    if (!skeleton.length) continue;

    skeleton.sort((a, b) => b.y - a.y);
    const rows = [];
    for (const it of skeleton) {
      let row = rows.find((r) => Math.abs(r.y - it.y) <= 10); // row pitch ≈28
      if (!row) { row = { y: it.y, cells: {} }; rows.push(row); }
      row.cells[it.col] = row.cells[it.col] ? `${row.cells[it.col]} ${it.s}` : it.s;
      row.y = (row.y + it.y) / 2;
    }
    names.sort((a, b) => b.y - a.y);
    for (const nm of names) {
      let best = null, bestD = Infinity;
      for (const r of rows) { const d = Math.abs(r.y - nm.y); if (d < bestD) { bestD = d; best = r; } }
      if (best) best.name = best.name ? `${best.name} ${nm.s}` : nm.s;
    }

    for (const r of rows) {
      const district = cleanName(r.cells.district);
      const name = cleanName(r.name);
      // Valid row: real (alphabetic) district + a candidate name. Excludes the
      // numeric index row (district would be a bare digit) and stray fragments.
      if (!/[A-Za-z]/.test(district) || !name) { stats.skipped++; continue; }
      stats.rows++;
      const g = cleanName(r.cells.gender);
      records.push({
        office_type: tierDef.office,
        jurisdiction_type: tierDef.jt,
        state_code: 'AP',
        year: 2021,
        district,
        mandal: cleanName(r.cells.mandal),
        constituency: cleanName(r.cells.division), // MPTC/ZPTC division name
        ward_no: null,
        gram_panchayat: null,
        name,
        party: normalizeParty(r.cells.party), // canonical code (see normalizeParty)
        votes: null,
        result_status: 'Elected',
        elected: true,
        gender: /^f/i.test(g) ? 'F' : /^m/i.test(g) ? 'M' : null,
        reservation: cleanName(r.cells.reservation) || null,
        community: cleanName(r.cells.community) || null,
        source_url: tierDef.url,
      });
    }
  }
  await doc.destroy();
  return { records, stats };
}

async function main() {
  ensureDir(PDF_DIR);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const tiers = TIER_FILTER ? TIERS.filter((t) => t.tier === TIER_FILTER) : TIERS;

  let records = [];
  const done = new Set();
  if (!FRESH && fs.existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (Array.isArray(prev.records)) { records = prev.records; for (const r of records) if (r._tier) done.add(r._tier); }
    } catch { /* start fresh */ }
  }

  const flush = () => writeJSON(OUT_FILE, {
    source: 'APSEC — Results of Ordinary Elections to MPTCs & ZPTCs, 2021',
    sourceUrl: `${BASE}/rlbselecresults.sec`,
    stateCode: 'AP',
    year: 2021,
    office: 'mptc_zptc',
    note: 'Party-based rural territorial-constituency polls. MPTC (mandal) + ZPTC (zilla) members. Votes not published.',
    scrapedAt: new Date().toISOString(),
    count: records.length,
    records: records.map(({ _tier, ...r }) => ({ ...r, _tier })),
  });

  console.log(`🏛️  APSEC MPTC/ZPTC 2021 — ${tiers.map((t) => t.tier).join(', ')}`);
  for (const t of tiers) {
    if (done.has(t.tier) && MAX_PAGES === Infinity) { console.log(`   ⏭  ${t.tier}: already parsed`); continue; }
    const dest = path.join(PDF_DIR, `${t.tier}.pdf`);
    let buf;
    if (!FRESH && fs.existsSync(dest)) buf = fs.readFileSync(dest);
    else { console.log(`   ⬇  ${t.tier}: downloading ${t.url}`); buf = await download(t.url, dest); }
    console.log(`   📄 ${t.tier}: ${(buf.length / 1048576).toFixed(1)} MB, parsing…`);
    const { records: recs, stats } = await parsePdf(buf, t, pdfjs);
    for (const r of recs) r._tier = t.tier;
    records = records.filter((r) => r._tier !== t.tier).concat(recs);
    console.log(`   ✓ ${t.tier}: ${stats.rows} winners (missingName=${stats.missingName}, skipped=${stats.skipped})`);
    if (MAX_PAGES === Infinity) flush();
  }
  flush();
  const mptc = records.filter((r) => r.office_type === 'mptc_member').length;
  console.log(`\n✨ Done — ${records.length} records (${mptc} MPTC, ${records.length - mptc} ZPTC) → ${OUT_FILE}`);
}

main().catch((err) => { console.error('\n❌ Fatal:', err.stack || err.message); process.exit(1); });
