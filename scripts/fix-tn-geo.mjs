/**
 * Source-clean the Tamil Nadu assembly GeoJSON:
 *  - drop degenerate rings (<4 positions)
 *  - close unclosed rings (first != last)  [the audit's other "BADRING" cause]
 *  - remove duplicate AC_NO features (keep the one with the most coordinates)
 * Mirrors apps/mobile/lib/geoLoader.ts sanitizeGeoJSON, plus ring-closing + dedup.
 *
 * Usage: node scripts/fix-tn-geo.mjs            (inspect)
 *        node scripts/fix-tn-geo.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
const PATH = 'apps/mobile/data/tn-assembly.json';
const WRITE = process.argv.includes('--write');
const g = JSON.parse(readFileSync(PATH, 'utf8'));

const closeRing = (r) => {
  if (!Array.isArray(r) || r.length < 4) return null;
  const a = r[0], z = r[r.length - 1];
  if (a[0] !== z[0] || a[1] !== z[1]) return [...r, [a[0], a[1]]];
  return r;
};
const fixPoly = (poly) => poly.map(closeRing).filter(Boolean);

let degenerateDropped = 0, ringsClosed = 0;
const countCoords = (geom) => {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let n = 0; for (const p of polys) for (const r of p) n += (r?.length || 0); return n;
};

for (const f of g.features) {
  const gm = f.geometry; if (!gm) continue;
  const before = JSON.stringify(gm.coordinates);
  if (gm.type === 'Polygon') {
    const rings = gm.coordinates.map((r) => {
      if (!Array.isArray(r) || r.length < 4) { degenerateDropped++; return null; }
      const c = closeRing(r); if (c && c.length !== r.length) ringsClosed++; return c;
    }).filter(Boolean);
    gm.coordinates = rings;
  } else if (gm.type === 'MultiPolygon') {
    gm.coordinates = gm.coordinates.map((poly) => {
      const rings = poly.map((r) => {
        if (!Array.isArray(r) || r.length < 4) { degenerateDropped++; return null; }
        const c = closeRing(r); if (c && c.length !== r.length) ringsClosed++; return c;
      }).filter(Boolean);
      return rings;
    }).filter((poly) => poly.length > 0);
  }
}

// dedup AC_NO — keep feature with most coordinates
const byAc = new Map();
for (const f of g.features) {
  const ac = f.properties?.AC_NO;
  if (ac == null) continue;
  const prev = byAc.get(ac);
  if (!prev) byAc.set(ac, f);
  else {
    const keep = countCoords(f.geometry) >= countCoords(prev.geometry) ? f : prev;
    byAc.set(ac, keep);
  }
}
const dupRemoved = g.features.length - byAc.size;
const cleaned = [...byAc.values()].sort((a, b) => (a.properties.AC_NO) - (b.properties.AC_NO));

// validate
let badRings = 0;
for (const f of cleaned) {
  const gm = f.geometry; if (!gm) { badRings++; continue; }
  const polys = gm.type === 'Polygon' ? [gm.coordinates] : gm.type === 'MultiPolygon' ? gm.coordinates : [];
  for (const poly of polys) for (const r of poly) {
    if (!r || r.length < 4) badRings++;
    else { const a = r[0], z = r[r.length - 1]; if (a[0] !== z[0] || a[1] !== z[1]) badRings++; }
  }
}
const acNos = cleaned.map((f) => f.properties.AC_NO);
const dups = acNos.length - new Set(acNos).size;

console.log('TN geo repair:');
console.log('  features', g.features.length, '->', cleaned.length, '| dupRemoved', dupRemoved);
console.log('  degenerateRingsDropped', degenerateDropped, '| ringsClosed', ringsClosed);
console.log('  remaining badRings', badRings, '| remaining dup acNo', dups);
console.log('  acNo range', Math.min(...acNos), '..', Math.max(...acNos));

if (WRITE) {
  g.features = cleaned;
  writeFileSync(PATH, JSON.stringify(g), 'utf8');
  console.log('WROTE', PATH);
}
