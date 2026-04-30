/**
 * Further simplify downloaded assembly GeoJSON files by reducing
 * coordinate precision and removing redundant points.
 * Reduces total bundle from ~103MB to ~40-50MB.
 *
 * Run: node scripts/simplify-geojson.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'apps', 'mobile', 'data');
const PRECISION = 3; // ~111m accuracy, plenty for constituency boundaries

function roundCoord(coord) {
  return [
    parseFloat(coord[0].toFixed(PRECISION)),
    parseFloat(coord[1].toFixed(PRECISION)),
  ];
}

function simplifyRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return ring;
  if (typeof ring[0] === 'number') return roundCoord(ring);
  
  if (Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
    // This is a coordinate ring — round and dedup
    const result = [roundCoord(ring[0])];
    for (let i = 1; i < ring.length; i++) {
      const rounded = roundCoord(ring[i]);
      const prev = result[result.length - 1];
      if (rounded[0] !== prev[0] || rounded[1] !== prev[1]) {
        result.push(rounded);
      }
    }
    // Ensure ring is closed (first == last for polygons)
    if (result.length > 1) {
      const first = result[0];
      const last = result[result.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        result.push([...first]);
      }
    }
    return result;
  }
  
  return ring.map(simplifyRing);
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const geojson = JSON.parse(raw);
  
  const simplified = {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: simplifyRing(f.geometry.coordinates),
      },
      properties: f.properties,
    })),
  };
  
  const newStr = JSON.stringify(simplified);
  fs.writeFileSync(filePath, newStr);
  
  const oldSize = Buffer.byteLength(raw, 'utf-8');
  const newSize = Buffer.byteLength(newStr, 'utf-8');
  const name = path.basename(filePath);
  console.log(`  ${name}: ${(oldSize/1024/1024).toFixed(1)}MB → ${(newSize/1024/1024).toFixed(1)}MB (${Math.round((1 - newSize/oldSize) * 100)}% reduction)`);
  return { oldSize, newSize };
}

function main() {
  console.log(`Simplifying GeoJSON files (precision=${PRECISION})...\n`);
  
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('-assembly.json'))
    .sort();
  
  let totalOld = 0, totalNew = 0;
  
  for (const f of files) {
    // Skip telangana — it already has proper enrichment
    if (f === 'telangana-assembly.json') {
      console.log(`  ${f}: skipped (already optimized)`);
      continue;
    }
    const { oldSize, newSize } = processFile(path.join(DATA_DIR, f));
    totalOld += oldSize;
    totalNew += newSize;
  }
  
  console.log(`\n  Total: ${(totalOld/1024/1024).toFixed(1)}MB → ${(totalNew/1024/1024).toFixed(1)}MB`);
}

main();
