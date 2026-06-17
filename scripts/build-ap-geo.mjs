// Build an authoritative AP assembly GeoJSON from njaideep2003's 175-feature
// boundaries file, re-keyed to the official seed acNo/name/district.
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const geo = JSON.parse(readFileSync('C:/K/scripts/ap-njaideep.json', 'utf8'));
const seedTxt = readFileSync('C:/K/data/seed/andhra-pradesh-constituencies.ts', 'utf8');
const seed = [...seedTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)'.*?district: '([^']*)'/g)]
  .map((m) => ({ acNo: +m[1], name: m[2], dist: m[3] }));

const normalizeName = (raw) => raw
  .replace(/\s*\((?:SC|ST|GEN)\)?\s*/gi, '').replace(/[()]/g, ' ')
  .toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const strip = (n) => normalizeName(n).replace(/\s/g, '');

// Spelling variants in the geo file -> canonical seed (normalized) names.
const ALIASES = {
  cheepurupalle: 'cheepurupalli', vizianagarm: 'vizianagaram',
  'vishakapatnam east': 'visakhapatnam east', 'vishakapatnam south': 'visakhapatnam south',
  'vishakapatnam north': 'visakhapatnam north', 'vishakapatnam west': 'visakhapatnam west',
  chodavarm: 'chodavaram', 'kakinada urban': 'kakinada city', 'rajahmundry urban': 'rajahmundry city',
  ungutur: 'unguturu', santanuthalapadu: 'santhanuthalapadu', kovuru: 'kovur',
  'nellore urban': 'nellore city', sullurupeta: 'sullurpeta', 'ysr kadapa': 'kadapa',
  smydukur: 'mydukur', kodumuru: 'kodumur', thamallapalle: 'thamballapalle',
  yelamanchili: 'elamanchili', palacole: 'palakollu', narsapuram: 'narasapuram',
  ponnur: 'ponnuru', gurazala: 'gurajala', satyavedu: 'sathyavedu',
};
const byName = new Map(seed.map((c) => [normalizeName(c.name), c]));
const byStrip = new Map(seed.map((c) => [strip(c.name), c]));
const byAcNo = new Map(seed.map((c) => [c.acNo, c]));

function resolve(name, district) {
  const n = normalizeName(name);
  const d = (district || '').toUpperCase();
  // District-disambiguated pairs (two distinct seats share a base name).
  if (n === 'gannavaram' || n === 'gangavaram') return byAcNo.get(d.includes('KRISHNA') ? 71 : 46);
  if (n === 'prathipadu') return byAcNo.get(d.includes('GUNTUR') ? 93 : 36);
  const target = ALIASES[n] ?? n;
  return byName.get(target) ?? byStrip.get(strip(target));
}

const round = (v) => Math.round(v * 1e4) / 1e4; // ~11m precision

// Douglas-Peucker line simplification (epsilon in degrees, ~0.0008 ≈ 88m).
const EPS = 0.0008;
const MIN_RING_AREA = 1e-6; // drop sliver polygons smaller than ~0.012 km²
function ringArea(r) { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a) / 2; }
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const den = Math.hypot(dx, dy) || 1e-12;
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / den;
}
function dp(points, eps) {
  if (points.length < 3) return points;
  let maxD = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const left = dp(points.slice(0, idx + 1), eps);
    const right = dp(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}
function simplifyRing(ring) {
  // Run DP on the OPEN path (drop the duplicate closing vertex) so the anchor
  // segment isn't degenerate, then re-close the ring.
  const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1) : ring.slice();
  let r = dp(open, EPS).map((p) => [round(p[0]), round(p[1])]);
  if (r.length < 3) r = open.map((p) => [round(p[0]), round(p[1])]);
  // close the ring
  r.push([r[0][0], r[0][1]]);
  return r;
}
function simplifyPolygon(poly) {
  // poly = [outerRing, ...holes]; drop holes below area threshold.
  const rings = poly.filter((ring, i) => i === 0 || ringArea(ring) >= MIN_RING_AREA).map(simplifyRing);
  return rings;
}
function simplifyGeometry(geom) {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: simplifyPolygon(geom.coordinates) };
  }
  // MultiPolygon: drop sub-polygons whose outer ring is a tiny sliver.
  let polys = geom.coordinates.filter((poly) => ringArea(poly[0]) >= MIN_RING_AREA);
  if (polys.length === 0) {
    // keep the largest sub-polygon so the feature never disappears
    polys = [geom.coordinates.reduce((a, b) => (ringArea(a[0]) >= ringArea(b[0]) ? a : b))];
  }
  return { type: 'MultiPolygon', coordinates: polys.map(simplifyPolygon) };
}

const covered = new Set();
const out = [];
const problems = [];
for (const f of geo.features) {
  const c = resolve(f.properties.assem_name, f.properties.district);
  if (!c) { problems.push('UNMATCHED ' + f.properties.assem_name); continue; }
  if (covered.has(c.acNo)) { problems.push('DUP acNo ' + c.acNo + ' <- ' + f.properties.assem_name); continue; }
  covered.add(c.acNo);
  out.push({
    type: 'Feature',
    properties: { AC_NO: c.acNo, AC_NAME: c.name, DIST_NAME: c.dist, STATE: 'Andhra Pradesh' },
    geometry: simplifyGeometry(f.geometry),
  });
}

function countVerts(geom) { let n = 0; const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; for (const p of polys) for (const r of p) n += r.length; return n; }
const totalVerts = out.reduce((s, f) => s + countVerts(f.geometry), 0);
const missing = seed.filter((s) => !covered.has(s.acNo)).map((s) => s.acNo);
console.log('total vertices', totalVerts);
console.log('out features', out.length, '/ seed', seed.length);
console.log('problems', problems.length, problems);
console.log('uncovered seed acNos', missing);

if (out.length === 175 && problems.length === 0 && missing.length === 0) {
  const fc = { type: 'FeatureCollection', features: out.sort((a, b) => a.properties.AC_NO - b.properties.AC_NO) };
  writeFileSync('C:/K/apps/mobile/data/ap-assembly.json', JSON.stringify(fc), 'utf8');
  console.log('WROTE ap-assembly.json', (statSync('C:/K/apps/mobile/data/ap-assembly.json').size / 1048576).toFixed(2), 'MB');
} else {
  console.log('NOT WRITTEN — resolve issues first');
}
