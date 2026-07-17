#!/usr/bin/env node
/**
 * Build historical polling-booth GPS locations (Telangana + Andhra Pradesh).
 * ═══════════════════════════════════════════════════════════════════════════
 * Source : 2017 ECI "psleci" polling-station snapshot (905k stations w/ lat-long)
 *          preserved at github.com/aaronrudkin/IndianPollingStations (out.csv).
 *          The original psleci.nic.in portal is offline; the modern ECI portal
 *          (electoralsearch.eci.gov.in) exposes booth NAMES but NOT coordinates,
 *          so this 2017 snapshot is the only bulk source of booth GPS.
 *
 * Output : data/seed/booth-locations-2017.json
 *          { "TS": { "<acNo>": [{ n, name, lat, lng }] }, "AP": { ... } }
 *
 * Coordinates are REAL (2017). Booth numbers / voter counts are historical and
 * intentionally omitted — the app labels these as "2017 ECI (historical)".
 *
 * Usage: node scripts/build-booth-locations-2017.mjs [--csv=<path>]
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const csvArg = process.argv.find((a) => a.startsWith('--csv='))?.split('=')[1];
const csvPath = csvArg
  ? path.resolve(csvArg)
  : path.resolve(repoRoot, 'scrapers/output/eci/psleci-2017.csv');
const outPath = path.resolve(repoRoot, 'data/seed/booth-locations-2017.json');

// ECI state code (from WebURL S= param) → app state code.
const STATE_CD_MAP = { S29: 'TS', S01: 'AP' };

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const validCoord = (la, lo) =>
  Number.isFinite(la) && Number.isFinite(lo) && la > 6 && la < 37 && lo > 68 && lo < 98;

async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ Source CSV not found: ${csvPath}`);
    console.error('   Download github.com/aaronrudkin/IndianPollingStations/raw/master/out.zip,');
    console.error('   extract out.csv, and place it at scrapers/output/eci/psleci-2017.csv');
    process.exit(1);
  }

  console.log('🗳️  Building 2017 booth locations (TS + AP)...');
  console.log(`   Source: ${csvPath}`);

  const result = { TS: {}, AP: {} };
  const seen = new Set(); // `${state}:${acNo}:${psNum}` dedupe
  let lineNo = 0;
  let kept = 0;
  let skippedBad = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1 || !line.trim()) continue;
    const f = parseCSVLine(line);
    // State, District, AC, Latitude, Longitude, PSNumber, PSName, WebURL
    const [, , , lat, lng, psNum, psName, webUrl] = f;
    const m = /S=(S\d+|U\d+)&A=(\d+)&P=(\d+)/.exec(webUrl || '');
    if (!m) continue;
    const stateCode = STATE_CD_MAP[m[1]];
    if (!stateCode) continue; // TS + AP only
    const acNo = String(parseInt(m[2], 10));
    const n = parseInt(psNum, 10);
    const la = Math.round(parseFloat(lat) * 1e6) / 1e6;
    const lo = Math.round(parseFloat(lng) * 1e6) / 1e6;
    if (!validCoord(la, lo)) { skippedBad++; continue; }

    const key = `${stateCode}:${acNo}:${psNum}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = (psName || '').trim().replace(/\s+/g, ' ') || `Booth ${n}`;
    (result[stateCode][acNo] ??= []).push({ n: Number.isFinite(n) ? n : 0, name, lat: la, lng: lo });
    kept++;
  }

  // Sort booths within each AC by booth number for stable output.
  for (const st of Object.keys(result)) {
    for (const ac of Object.keys(result[st])) {
      result[st][ac].sort((a, b) => a.n - b.n);
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result));

  const summary = (st) => {
    const acs = Object.keys(result[st]);
    const booths = acs.reduce((s, ac) => s + result[st][ac].length, 0);
    return { acs: acs.length, booths };
  };
  const ts = summary('TS');
  const ap = summary('AP');
  console.log(`\n✅ Wrote ${outPath}`);
  console.log(`   TS: ${ts.booths} booths across ${ts.acs} ACs`);
  console.log(`   AP: ${ap.booths} booths across ${ap.acs} ACs`);
  console.log(`   Total kept: ${kept} | skipped(bad coord): ${skippedBad}`);
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`   JSON size: ${sizeMB} MB`);
}

main().catch((err) => { console.error('❌ Build failed:', err); process.exit(1); });
