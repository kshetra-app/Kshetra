// Build an authoritative J&K assembly GeoJSON (post-2022 90-AC delimitation) from
// shijithpk/2024_maps_supplement's j_and_k_assembly_new_borders.geojson, re-keyed
// to the official seed acNo/name/district. The source feature `seat_id` already
// matches the ECI AC numbering (fixed against the CEO-J&K delimitation PDF), so we
// map purely by seat_id and stamp the seed's authoritative name/district/type.
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const geo = JSON.parse(readFileSync('C:/K/scripts/jk-source.geojson', 'utf8'));
const seedTxt = readFileSync('C:/K/data/seed/jammu-kashmir-constituencies.ts', 'utf8');
const seed = new Map(
  [...seedTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)'.*?district: '([^']*)'/g)]
    .map((m) => [+m[1], { acNo: +m[1], name: m[2], dist: m[3] }])
);

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
  const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1) : ring.slice();
  let r = dp(open, EPS).map((p) => [round(p[0]), round(p[1])]);
  if (r.length < 3) r = open.map((p) => [round(p[0]), round(p[1])]);
  r.push([r[0][0], r[0][1]]);
  return r;
}
function simplifyPolygon(poly) {
  return poly.filter((ring, i) => i === 0 || ringArea(ring) >= MIN_RING_AREA).map(simplifyRing);
}
function simplifyGeometry(geom) {
  if (geom.type === 'Polygon') return { type: 'Polygon', coordinates: simplifyPolygon(geom.coordinates) };
  let polys = geom.coordinates.filter((poly) => ringArea(poly[0]) >= MIN_RING_AREA);
  if (polys.length === 0) polys = [geom.coordinates.reduce((a, b) => (ringArea(a[0]) >= ringArea(b[0]) ? a : b))];
  return { type: 'MultiPolygon', coordinates: polys.map(simplifyPolygon) };
}

function countVerts(geom) { let n = 0; const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; for (const p of polys) for (const r of p) n += r.length; return n; }
function centroid(geom) {
  let sx = 0, sy = 0, n = 0;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of polys) for (const pt of p[0]) { sx += pt[0]; sy += pt[1]; n++; }
  return [sx / n, sy / n];
}

const covered = new Set();
const out = [];
const problems = [];
for (const f of geo.features) {
  const id = f.properties.seat_id;
  if (id === 9999 || id >= 9000) continue; // PoK / non-AC feature
  const c = seed.get(id);
  if (!c) { problems.push('NO SEED for seat_id ' + id + ' (' + f.properties.seat_name_en + ')'); continue; }
  if (covered.has(id)) { problems.push('DUP seat_id ' + id); continue; }
  // centroid sanity: J&K lon ~73–80, lat ~32–37
  const [cx, cy] = centroid(f.geometry);
  if (cx < 72 || cx > 81 || cy < 31 || cy > 38) problems.push('OFFGRID acNo ' + id + ' centroid ' + cx.toFixed(2) + ',' + cy.toFixed(2));
  covered.add(id);
  out.push({
    type: 'Feature',
    properties: { AC_NO: c.acNo, AC_NAME: c.name, DIST_NAME: c.dist, STATE: 'Jammu & Kashmir' },
    geometry: simplifyGeometry(f.geometry),
  });
}

const totalVerts = out.reduce((s, f) => s + countVerts(f.geometry), 0);
const missing = [...seed.keys()].filter((k) => !covered.has(k));
console.log('total vertices', totalVerts);
console.log('out features', out.length, '/ seed', seed.size);
console.log('problems', problems.length, problems);
console.log('uncovered seed acNos', missing);

if (out.length === 90 && problems.length === 0 && missing.length === 0) {
  const fc = { type: 'FeatureCollection', features: out.sort((a, b) => a.properties.AC_NO - b.properties.AC_NO) };
  writeFileSync('C:/K/apps/mobile/data/jk-assembly.json', JSON.stringify(fc), 'utf8');
  console.log('WROTE jk-assembly.json', (statSync('C:/K/apps/mobile/data/jk-assembly.json').size / 1048576).toFixed(2), 'MB');
} else {
  console.log('NOT WRITTEN — resolve issues first');
}
