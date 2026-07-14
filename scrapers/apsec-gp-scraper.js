#!/usr/bin/env node
/**
 * APSEC 2021 Gram-Panchayat results scraper (PDF → JSON), HARDENED.
 * ══════════════════════════════════════════════════════════════════════════
 * Source (reverse-engineered live from https://sec.ap.gov.in → "Election
 * Results → Rural Local Bodies"): the AP State Election Commission publishes
 * the RESULTS OF ORDINARY ELECTIONS TO GRAM PANCHAYATS - 2021 as one
 * text-based PDF per (old) district:
 *   https://sec.ap.gov.in/Doc21/Ele_Relts21/<DISTRICT>.pdf
 * Each PDF is a 9-column table (verified via positional text extraction):
 *   Revenue Division | Mandal | Gram Panchayat | Ward Code | Post | Reservation
 *   | Elected Candidate | Community | Educational Qualification
 * Post codes: S=Sarpanch (Ward Code 0), WM=Ward Member, US=Upa-Sarpanch
 *   (a ward member additionally elected upa-sarpanch — modelled as a ward member).
 *
 * ZERO-FABRICATION: every row is the OFFICIAL elected winner parsed verbatim
 * from the SEC PDF; each record carries its district PDF as source_url. AP GP
 * polls are non-party (no symbols) → party stays null. Votes are NOT published
 * in these PDFs → votes stay null. Gender is inferred ONLY for (W)-reserved
 * seats (legally women-only → 'F'); otherwise left null (never guessed).
 *
 * Output: scrapers/output/local-body/AP-2021-GP-kyr.json
 *   → consumed by scripts/generate-local-body-seed.mjs via the shared
 *     kyr-transform (office_type switch handles sarpanch + gp_ward_member).
 *
 * Usage:
 *   node scrapers/apsec-gp-scraper.js                 # all 13 districts (resume)
 *   node scrapers/apsec-gp-scraper.js --district=VIZIANAGARAM
 *   node scrapers/apsec-gp-scraper.js --district=VIZIANAGARAM --pages=5   # smoke test
 *   node scrapers/apsec-gp-scraper.js --fresh         # ignore prior output + re-download
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { LOCAL_BODY_OUTPUT_DIR } = require('./config');
const { ensureDir, writeJSON, sleep } = require('./utils');

const args = process.argv.slice(2);
const arg = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const DISTRICT_FILTER = arg('district');
const MAX_PAGES = arg('pages') ? parseInt(arg('pages'), 10) : Infinity;
const FRESH = args.includes('--fresh');

// The 2021 GP elections used AP's pre-2022 13-district layout. File names as
// published on the portal (SPSR_NELLORE = Sri Potti Sriramulu Nellore, etc.).
const DISTRICTS = [
  'SRIKAKULAM', 'VIZIANAGARAM', 'VISAKHAPATNAM', 'EAST_GODAVARI', 'WEST_GODAVARI',
  'KRISHNA', 'GUNTUR', 'PRAKASAM', 'SPSR_NELLORE', 'ANANTAPURAMU', 'CHITTOOR',
  'YSR_KADAPA', 'KURNOOL',
];

const BASE = 'https://sec.ap.gov.in';
const pdfUrl = (d) => `${BASE}/Doc21/Ele_Relts21/${d}.pdf`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';
const PDF_DIR = path.join(LOCAL_BODY_OUTPUT_DIR, 'ap-2021');
const OUT_FILE = path.join(LOCAL_BODY_OUTPUT_DIR, 'AP-2021-GP-kyr.json');

// Column detection is ADAPTIVE per-PDF. The per-district PDFs share the same
// 9-column schema but NOT the same X positions (margins/scale differ), AND the
// "Elected Candidate" header is CENTERED while its data is left-aligned — so
// header-based boundaries misclassify names into the reservation column. We
// therefore derive boundaries from the DATA's own left-edge clusters: data is
// left-aligned per column, giving 9 tight X clusters separated by wide gaps.
const COL_KEYS = ['division', 'mandal', 'gp', 'ward', 'post', 'reservation', 'name', 'community', 'education'];

/**
 * @param {Array<Array<{x:number,y:number,s:string}>>} pages parsed text items
 * @returns {{headerY:number, colOf:(x:number)=>string|undefined}|null}
 */
function buildLayout(pages) {
  let headerY = null;
  for (const items of pages) {
    const h = items.find((it) => /^elected\s+candidate/i.test(it.s));
    if (h) { headerY = h.y; break; }
  }
  if (headerY == null) return null;

  // Sample data-item left edges from up to 20 populated pages.
  const xs = [];
  let sampled = 0;
  for (const items of pages) {
    let has = false;
    for (const it of items) if (it.y < headerY - 4 && it.y > 40) { xs.push(it.x); has = true; }
    if (has && ++sampled >= 20) break;
  }
  if (xs.length < 50) return null;

  // Split the sorted x-edges at the 8 largest gaps → 9 column clusters.
  const sorted = xs.sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push([sorted[i] - sorted[i - 1], i]);
  gaps.sort((a, b) => b[0] - a[0]);
  const cuts = gaps.slice(0, 8).map((g) => g[1]).sort((a, b) => a - b);
  const clusters = [];
  let start = 0;
  for (const c of cuts) { clusters.push([sorted[start], sorted[c - 1]]); start = c; }
  clusters.push([sorted[start], sorted[sorted.length - 1]]);
  if (clusters.length !== 9) return null; // unexpected layout → caller warns

  const bounds = clusters.map((cl, k) => ({
    key: COL_KEYS[k],
    left: k === 0 ? -Infinity : (clusters[k - 1][1] + cl[0]) / 2,
    right: k === 8 ? Infinity : (cl[1] + clusters[k + 1][0]) / 2,
  }));
  return { headerY, colOf: (x) => (bounds.find((b) => x >= b.left && x < b.right) || {}).key };
}

const titleCase = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ── HTTP (hardened: AbortController hard timeout + retry) ────────────────────
async function download(url, dest) {
  const MAX = 4;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await axios({ method: 'get', url, responseType: 'arraybuffer', signal: controller.signal,
        timeout: 120000, validateStatus: () => true, maxRedirects: 5,
        headers: { 'User-Agent': UA, Connection: 'close' } });
      clearTimeout(timer);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(res.data);
      if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('not a PDF');
      fs.writeFileSync(dest, buf);
      return buf;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX) { console.warn(`   ⚠️  download attempt ${attempt}/${MAX} (${err.message}); retry in ${attempt}s`); await sleep(1000 * attempt); }
      else throw err;
    }
  }
}

// ── PDF → rows (positional column/row reconstruction) ────────────────────────
async function parsePdf(buf, districtName, sourceUrl, pdfjs) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const nPages = Math.min(MAX_PAGES, doc.numPages);
  const records = [];
  const stats = { pages: 0, rows: 0, missingName: 0, multiName: 0, skipped: 0, noHeader: 0 };

  // Pass 1: buffer every page's text items ({x,y,s}) in one text-extraction pass.
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
    if (p % 50 === 0 || p === nPages) process.stdout.write(`\r   ${districtName}: reading page ${p}/${nPages}`);
  }
  process.stdout.write('\n');

  // Derive the column layout from the DATA's own left-edge clusters.
  const layout = buildLayout(pages);
  if (!layout) { await doc.destroy(); throw new Error(`could not derive column layout for ${districtName}`); }
  const { headerY, colOf } = layout;

  // Pass 2: reconstruct rows page-by-page.
  for (let p = 0; p < pages.length; p++) {
    const items = pages[p];
    const skeleton = []; // {y, col, x, s}
    const names = [];     // {y, x, s}
    for (const it of items) {
      if (it.y >= headerY - 4) continue; // title + column header + anything above data
      if (it.y < 40) continue;           // footer / page number
      const col = colOf(it.x);
      if (col === 'name') names.push(it);
      else if (col) skeleton.push({ ...it, col });
    }
    if (!skeleton.length) { stats.noHeader++; continue; }

    // Cluster skeleton into rows by Y (row pitch ≈12.7 → tolerance 4).
    skeleton.sort((a, b) => b.y - a.y);
    const rows = [];
    for (const it of skeleton) {
      let row = rows.find((r) => Math.abs(r.y - it.y) <= 4);
      if (!row) { row = { y: it.y, cells: {} }; rows.push(row); }
      row.cells[it.col] = row.cells[it.col] ? `${row.cells[it.col]} ${it.s}` : it.s;
      row.y = (row.y + it.y) / 2; // refine
    }
    // Assign each name item to the nearest row by Y (handles half-row float +
    // wrapped 2-line names → concatenated top→bottom).
    names.sort((a, b) => b.y - a.y);
    for (const nm of names) {
      let best = null, bestD = Infinity;
      for (const r of rows) { const d = Math.abs(r.y - nm.y); if (d < bestD) { bestD = d; best = r; } }
      if (best) best.name = best.name ? `${best.name} ${nm.s}` : nm.s;
    }

    for (const r of rows) {
      const ward = (r.cells.ward || '').trim();
      const post = (r.cells.post || '').trim().toUpperCase();
      // Valid data row: numeric ward code + known post.
      if (!/^\d+$/.test(ward) || !['S', 'US', 'WM'].includes(post)) { stats.skipped++; continue; }
      stats.rows++;
      const name = cleanName(r.name);
      if (!name) { stats.missingName++; }
      const reservation = (r.cells.reservation || '').trim();
      records.push({
        office_type: post === 'S' ? 'sarpanch' : 'gp_ward_member',
        jurisdiction_type: post === 'S' ? 'gram_panchayat' : 'gp_ward',
        post, // S | US | WM (US preserved: ward member also elected upa-sarpanch)
        state_code: 'AP',
        year: 2021,
        district: titleCase(districtName.replace(/_/g, ' ')),
        revenue_division: cleanName(r.cells.division),
        mandal: cleanName(r.cells.mandal),
        gram_panchayat: cleanName(r.cells.gp),
        ward_no: post === 'S' ? null : ward,
        name,
        party: null, // AP GP polls are non-party (no symbols)
        votes: null, // not published in these PDFs
        result_status: 'Elected',
        elected: true,
        // (W)-reserved seats are legally women-only → factual, not a guess.
        gender: /\(W\)/i.test(reservation) ? 'F' : null,
        reservation,
        community: cleanName(r.cells.community) || null,
        education: cleanName(r.cells.education) || null,
        source_url: sourceUrl,
      });
    }
    stats.pages++;
  }
  await doc.destroy();
  return { records, stats };
}

async function main() {
  ensureDir(PDF_DIR);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  let districts = DISTRICT_FILTER ? [DISTRICT_FILTER.toUpperCase()] : DISTRICTS;

  // Resume-by-default: keep records from districts already parsed.
  let records = [];
  const doneDistricts = new Set();
  if (!FRESH && fs.existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (Array.isArray(prev.records)) {
        records = prev.records;
        for (const r of records) if (r._file) doneDistricts.add(r._file);
        console.log(`   ↻ Resume: ${records.length} records from ${doneDistricts.size} district(s)`);
      }
    } catch { /* start fresh */ }
  }

  const flush = () => writeJSON(OUT_FILE, {
    source: 'APSEC — Results of Ordinary Elections to Gram Panchayats, 2021',
    sourceUrl: `${BASE}/rlbselecresults.sec`,
    stateCode: 'AP',
    year: 2021,
    office: 'gram_panchayat',
    note: 'Non-party GP-tier polls. Sarpanch (S), Ward Member (WM), Upa-Sarpanch (US, modelled as ward member). Votes not published.',
    scrapedAt: new Date().toISOString(),
    count: records.length,
    records: records.map(({ _file, ...r }) => ({ ...r, _file })),
  });

  console.log(`🏛️  APSEC GP 2021 — ${districts.length} district(s)`);
  for (const d of districts) {
    if (doneDistricts.has(d) && MAX_PAGES === Infinity) { console.log(`   ⏭  ${d}: already parsed, skipping`); continue; }
    const dest = path.join(PDF_DIR, `${d}.pdf`);
    let buf;
    if (!FRESH && fs.existsSync(dest)) { buf = fs.readFileSync(dest); }
    else { console.log(`   ⬇  ${d}: downloading ${pdfUrl(d)}`); buf = await download(pdfUrl(d), dest); }
    console.log(`   📄 ${d}: ${(buf.length / 1024 / 1024).toFixed(1)} MB, parsing…`);
    const { records: recs, stats } = await parsePdf(buf, d, pdfUrl(d), pdfjs);
    for (const r of recs) r._file = d;
    // Replace any prior partial records for this district (e.g. --pages reruns).
    records = records.filter((r) => r._file !== d).concat(recs);
    console.log(`   ✓ ${d}: ${stats.rows} winners (missingName=${stats.missingName}, skipped=${stats.skipped})`);
    if (MAX_PAGES === Infinity) flush();
  }
  flush();
  const sarpanch = records.filter((r) => r.office_type === 'sarpanch').length;
  console.log(`\n✨ Done — ${records.length} records (${sarpanch} sarpanch, ${records.length - sarpanch} ward) → ${OUT_FILE}`);
}

main().catch((err) => { console.error('\n❌ Fatal:', err.stack || err.message); process.exit(1); });
