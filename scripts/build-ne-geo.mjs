/**
 * Build a simplified, normalized <code>-assembly.json from a locally-downloaded
 * datta07/INDIAN-SHAPEFILES state assembly GeoJSON, and cross-check feature
 * AC_NAMEs against the rebuilt constituency seed (by normalized name).
 *
 *   node scripts/build-ne-geo.mjs TR Tripura tripura --write
 *   args: <CODE> <SourceBasename> <seedFileBase> [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CODE = process.argv[2];
const SRC = process.argv[3];          // e.g. TRIPURA_ASSEMBLY (or the downloaded basename)
const SEEDBASE = process.argv[4];     // e.g. tripura
const WRITE = process.argv.includes('--write');
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

const srcPath = `C:/K/scripts/${SRC}.geojson`;
const fc = JSON.parse(readFileSync(srcPath, 'utf8'));

const pick = (p, keys) => { for (const k of keys) if (p[k] != null && String(p[k]).trim() !== '') return p[k]; return null; };
const features = fc.features.filter((f) => {
  // Drop non-constituency noise features (e.g. district-boundary polygons with AC_NO 0 / empty name).
  const p = f.properties || {};
  const acNo = pick(p, ['AC_NO', 'ac_no', 'AC_NUM', 'ac_num', 'AC_CODE']);
  const acName = pick(p, ['AC_NAME', 'ac_name', 'assem_name', 'NAME', 'Name', 'CONSTITUENCY']);
  return acName != null && acNo != null && Number(acNo) >= 1;
}).map((f, idx) => {
  const p = f.properties || {};
  const acNo = pick(p, ['AC_NO', 'ac_no', 'AC_NUM', 'ac_num', 'AC_CODE']);
  const acName = pick(p, ['AC_NAME', 'ac_name', 'assem_name', 'NAME', 'Name', 'CONSTITUENCY']) || '';
  const dist = pick(p, ['DIST_NAME', 'dist_name', 'DISTRICT', 'dtname11']) || '';
  return {
    type: 'Feature',
    geometry: simplify(f.geometry, 4),
    properties: {
      AC_NO: acNo != null ? Number(acNo) : idx + 1,
      AC_NAME: titleCase(String(acName).replace(/\s*\([^)]*\)\s*$/, '').trim()),
      DIST_NAME: titleCase(String(dist).trim()),
      STATE: CODE,
    },
  };
});

function titleCase(s) {
  return s.toLowerCase().replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch));
}
function simplify(geom, prec) {
  const r = (c) => (typeof c[0] === 'number' ? [+c[0].toFixed(prec), +c[1].toFixed(prec)] : c.map(r));
  const dedup = (ring) => {
    if (!Array.isArray(ring) || typeof ring[0] === 'number') return ring;
    if (Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
      const out = [ring[0]];
      for (let i = 1; i < ring.length; i++) { const pr = out[out.length - 1]; if (ring[i][0] !== pr[0] || ring[i][1] !== pr[1]) out.push(ring[i]); }
      return out;
    }
    return ring.map(dedup);
  };
  return { type: geom.type, coordinates: dedup(r(geom.coordinates)) };
}

// cross-check against seed
const seedTxt = readFileSync(`C:/K/data/seed/${SEEDBASE}-constituencies.ts`, 'utf8');
const seed = [...seedTxt.matchAll(/acNo: (\d+), name: '([^']+)'/g)].map(([, ac, name]) => ({ acNo: +ac, name }));
const seedByName = new Map(seed.map((s) => [norm(s.name), s.acNo]));
const seedByAc = new Map(seed.map((s) => [s.acNo, s.name]));

let nameMatch = 0, acMatch = 0; const unmatched = [];
for (const f of features) {
  const n = norm(f.properties.AC_NAME);
  if (seedByName.has(n)) { nameMatch++; if (seedByName.get(n) === f.properties.AC_NO) acMatch++; }
  else unmatched.push(`${f.properties.AC_NO}:${f.properties.AC_NAME}`);
}
const geoAcNos = features.map((f) => f.properties.AC_NO);
const geoAcSet = new Set(geoAcNos);
const dupAc = [...new Set(geoAcNos.filter((a, i) => geoAcNos.indexOf(a) !== i))];
const seedMissingInGeo = seed.map((s) => s.acNo).filter((a) => !geoAcSet.has(a));
const geoOutsideSeed = [...geoAcSet].filter((a) => !seedByAc.has(a));
console.log(`${CODE}: features ${features.length} | seed ${seed.length} | unique AC_NO ${geoAcSet.size}`);
console.log(`name-matched ${nameMatch}/${features.length} | AC_NO agrees with seed ${acMatch}`);
console.log('UNMATCHED (geo name not in seed):', unmatched.join(', ') || 'none');
console.log('AC_NO dup in geo:', dupAc.join(',') || 'none');
console.log('seed acNos NOT covered by any geo feature:', seedMissingInGeo.join(',') || 'none');
console.log('geo AC_NO outside seed range:', geoOutsideSeed.join(',') || 'none');

const out = { type: 'FeatureCollection', features };
if (WRITE) {
  const path = `C:/K/apps/mobile/data/${CODE.toLowerCase()}-assembly.json`;
  writeFileSync(path, JSON.stringify(out), 'utf8');
  console.log('WROTE', path, `(${(JSON.stringify(out).length / 1024 / 1024).toFixed(2)} MB)`);
}
