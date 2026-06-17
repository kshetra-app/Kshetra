// All-states GeoJSON "gold standard" audit.
// Checks per state: feature count vs official, acNo integrity, geometry
// validity, and centroid-scatter (detects AP-style label/geometry scrambles).
import { readFileSync, readdirSync, statSync } from 'node:fs';

const DIR = 'C:/K/apps/mobile/data/';
// filename prefix -> [stateName, officialAssemblySeats]
const STATES = {
  'ap-assembly.json': ['Andhra Pradesh', 175], 'ar-assembly.json': ['Arunachal Pradesh', 60],
  'as-assembly.json': ['Assam', 126], 'br-assembly.json': ['Bihar', 243],
  'cg-assembly.json': ['Chhattisgarh', 90], 'dl-assembly.json': ['Delhi', 70],
  'ga-assembly.json': ['Goa', 40], 'gj-assembly.json': ['Gujarat', 182],
  'hp-assembly.json': ['Himachal Pradesh', 68], 'hr-assembly.json': ['Haryana', 90],
  'jh-assembly.json': ['Jharkhand', 81], 'jk-assembly.json': ['Jammu & Kashmir', 90],
  'ka-assembly.json': ['Karnataka', 224], 'kl-assembly.json': ['Kerala', 140],
  'mh-assembly.json': ['Maharashtra', 288], 'ml-assembly.json': ['Meghalaya', 60],
  'mn-assembly.json': ['Manipur', 60], 'mp-assembly.json': ['Madhya Pradesh', 230],
  'mz-assembly.json': ['Mizoram', 40], 'nl-assembly.json': ['Nagaland', 60],
  'od-assembly.json': ['Odisha', 147], 'pb-assembly.json': ['Punjab', 117],
  'py-assembly.json': ['Puducherry', 30], 'rj-assembly.json': ['Rajasthan', 200],
  'sk-assembly.json': ['Sikkim', 32], 'telangana-assembly.json': ['Telangana', 119],
  'tn-assembly.json': ['Tamil Nadu', 234], 'tr-assembly.json': ['Tripura', 60],
  'uk-assembly.json': ['Uttarakhand', 70], 'up-assembly.json': ['Uttar Pradesh', 403],
  'wb-assembly.json': ['West Bengal', 294],
};

function centroid(f) {
  let sx = 0, sy = 0, n = 0; const g = f.geometry; if (!g) return null;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) { sx += x; sy += y; n++; }
  return n ? [sx / n, sy / n] : null;
}
function median(arr) { const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

const rows = [];
for (const [file, [name, official]] of Object.entries(STATES)) {
  const path = DIR + file;
  let size = 0;
  try { size = statSync(path).size; } catch { rows.push({ name, status: 'MISSING FILE' }); continue; }
  if (size < 1024) { rows.push({ name, official, features: 0, status: 'EMPTY/PLACEHOLDER' }); continue; }
  let g;
  try { g = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { rows.push({ name, status: 'PARSE ERROR' }); continue; }
  const feats = g.features || [];
  const acNos = feats.map((f) => f.properties?.AC_NO).filter((v) => v != null);
  const acSet = new Set(acNos);
  const dups = acNos.length - acSet.size;
  const outOfRange = acNos.filter((n) => n < 1 || n > official).length;
  const missing = [];
  for (let i = 1; i <= official; i++) if (!acSet.has(i)) missing.push(i);
  // geometry validity + centroid scatter
  let badRings = 0, nan = 0; const cx = [], cy = [];
  for (const f of feats) {
    const g2 = f.geometry; if (!g2) { badRings++; continue; }
    const polys = g2.type === 'Polygon' ? [g2.coordinates] : g2.type === 'MultiPolygon' ? g2.coordinates : [];
    for (const poly of polys) for (const r of poly) {
      if (!r || r.length < 4) badRings++;
      else { const a = r[0], z = r[r.length - 1]; if (a[0] !== z[0] || a[1] !== z[1]) badRings++; }
      for (const p of (r || [])) { if (!isFinite(p[0]) || !isFinite(p[1])) nan++; }
    }
    const c = centroid(f); if (c) { cx.push(c[0]); cy.push(c[1]); }
  }
  // scatter: features whose centroid is far from the state's median centroid
  let scramble = 0;
  if (cx.length) {
    const mx = median(cx), my = median(cy);
    // threshold scales with state spread (90th pct distance * 1.8, floor 1.2°)
    const dists = feats.map((f) => { const c = centroid(f); return c ? Math.hypot(c[0] - mx, c[1] - my) : 0; });
    const sorted = [...dists].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 1;
    const thr = Math.max(1.2, p90 * 1.8);
    scramble = dists.filter((d) => d > thr).length;
  }
  const flags = [];
  if (feats.length !== official) flags.push(`COUNT ${feats.length}/${official}`);
  if (dups) flags.push(`DUP acNo ${dups}`);
  if (outOfRange) flags.push(`OOR ${outOfRange}`);
  if (missing.length) flags.push(`MISSING acNo ${missing.length}`);
  if (badRings) flags.push(`BADRING ${badRings}`);
  if (nan) flags.push(`NaN ${nan}`);
  if (scramble) flags.push(`SCATTER ${scramble}`);
  rows.push({ name, official, features: feats.length, mb: (size / 1048576).toFixed(2), status: flags.length ? flags.join(', ') : 'OK' });
}

console.log('STATE'.padEnd(20), 'FEAT/OFF'.padEnd(10), 'MB'.padEnd(6), 'FINDINGS');
console.log('-'.repeat(90));
for (const r of rows) {
  const fo = r.features != null ? `${r.features}/${r.official}` : '-';
  console.log((r.name || '?').padEnd(20), fo.padEnd(10), String(r.mb || '-').padEnd(6), r.status);
}
const ok = rows.filter((r) => r.status === 'OK').length;
console.log('-'.repeat(90));
console.log(`SUMMARY: ${ok}/${rows.length} states clean`);
