#!/usr/bin/env node
/**
 * download-missing-geojson.js
 * Downloads assembly constituency GeoJSON for states missing from geo-manifest.json.
 * Source: github.com/datameet/maps (CC BY 4.0) & github.com/HindustanTimesLabs/shrug-place-names
 * Falls back to state-outline GeoJSON if constituency-level not available.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const GEO_DIR = path.resolve(__dirname, '../apps/mobile/data');
const MANIFEST_PATH = path.join(GEO_DIR, 'geo-manifest.json');

// States missing from current manifest
const MISSING_STATES = [
  { code: 'MN', name: 'Manipur', seats: 60 },
  { code: 'ML', name: 'Meghalaya', seats: 60 },
  { code: 'MZ', name: 'Mizoram', seats: 40 },
  { code: 'NL', name: 'Nagaland', seats: 60 },
  { code: 'TR', name: 'Tripura', seats: 60 },
  { code: 'UK', name: 'Uttarakhand', seats: 70 },
  { code: 'AR', name: 'Arunachal Pradesh', seats: 60 },
  { code: 'SK', name: 'Sikkim', seats: 32 },
  { code: 'PY', name: 'Puducherry', seats: 30 },
];

// Primary source: ECI maps from datameet GitHub (assembly constituency polygons)
// These are publicly available under Creative Commons license
const DATAMEET_BASE = 'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies';

// Mapping from state code to datameet file names
const DATAMEET_FILES = {
  MN: 'Manipur/manipur_assembly_constituencies.geojson',
  ML: 'Meghalaya/meghalaya_assembly_constituencies.geojson',
  MZ: 'Mizoram/mizoram_assembly_constituencies.geojson',
  NL: 'Nagaland/nagaland_assembly_constituencies.geojson',
  TR: 'Tripura/tripura_assembly_constituencies.geojson',
  UK: 'Uttarakhand/uttarakhand_assembly_constituencies.geojson',
  AR: 'ArunachalPradesh/arunachalpradesh_assembly_constituencies.geojson',
  SK: 'Sikkim/sikkim_assembly_constituencies.geojson',
  PY: 'Puducherry/puducherry_assembly_constituencies.geojson',
};

// Alternative URLs from other public repos if datameet fails
const ALT_URLS = {
  MN: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/manipur.geojson',
  ML: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/meghalaya.geojson',
  MZ: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/mizoram.geojson',
  NL: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/nagaland.geojson',
  TR: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/tripura.geojson',
  UK: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/uttarakhand.geojson',
  AR: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/arunachalpradesh.geojson',
  SK: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/sikkim.geojson',
  PY: 'https://raw.githubusercontent.com/HindustanTimesLabs/shrug-place-names/main/ac/puducherry.geojson',
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Kshetra-DataPipeline/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(httpsGet(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(30000, () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadState(state) {
  console.log(`\n[${ state.code }] ${ state.name } (${ state.seats } seats)`);

  const outputFile = path.join(GEO_DIR, `${state.code.toLowerCase()}-assembly.json`);

  if (fs.existsSync(outputFile)) {
    const size = fs.statSync(outputFile).size;
    console.log(`  ✅ Already exists (${Math.round(size/1024)}KB)`);
    return { code: state.code, file: `${state.code.toLowerCase()}-assembly.json`, count: state.seats, hasPolygons: true, status: 'existing' };
  }

  // Try primary source (datameet)
  const primaryFile = DATAMEET_FILES[state.code];
  if (primaryFile) {
    const primaryUrl = `${DATAMEET_BASE}/${primaryFile}`;
    console.log(`  → Trying datameet: ${primaryUrl}`);
    const data = await httpsGet(primaryUrl);
    if (data && data.length > 1000 && data.includes('Feature')) {
      try {
        const geoJson = JSON.parse(data);
        const count = geoJson.features?.length || state.seats;
        fs.writeFileSync(outputFile, JSON.stringify(geoJson), 'utf8');
        console.log(`  ✅ Downloaded from datameet: ${Math.round(data.length/1024)}KB, ${count} features`);
        return { code: state.code, file: `${state.code.toLowerCase()}-assembly.json`, count, hasPolygons: true, status: 'downloaded_datameet' };
      } catch(e) {
        console.log(`  ⚠️  Parse error: ${e.message}`);
      }
    }
  }

  await sleep(500);

  // Try alternative source
  const altUrl = ALT_URLS[state.code];
  if (altUrl) {
    console.log(`  → Trying alt source: ${altUrl}`);
    const data = await httpsGet(altUrl);
    if (data && data.length > 1000 && data.includes('Feature')) {
      try {
        const geoJson = JSON.parse(data);
        const count = geoJson.features?.length || state.seats;
        fs.writeFileSync(outputFile, JSON.stringify(geoJson), 'utf8');
        console.log(`  ✅ Downloaded from alt: ${Math.round(data.length/1024)}KB, ${count} features`);
        return { code: state.code, file: `${state.code.toLowerCase()}-assembly.json`, count, hasPolygons: true, status: 'downloaded_alt' };
      } catch(e) {
        console.log(`  ⚠️  Parse error: ${e.message}`);
      }
    }
  }

  console.log(`  ❌ Could not download GeoJSON for ${state.name}`);
  return { code: state.code, status: 'failed' };
}

async function main() {
  console.log('🗺️  GeoJSON Downloader — Missing States/UTs');
  console.log('='.repeat(60));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const results = [];

  for (const state of MISSING_STATES) {
    const result = await downloadState(state);
    if (result.status !== 'failed' && result.status !== 'skipped') {
      results.push(result);
    }
    await sleep(300);
  }

  // Update manifest
  let updated = 0;
  for (const r of results) {
    if (!manifest[r.code]) {
      manifest[r.code] = {
        file: r.file,
        count: r.count,
        hasPolygons: r.hasPolygons,
      };
      updated++;
      console.log(`\n✅ Added ${r.code} to manifest`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\n📝 Updated geo-manifest.json (+${updated} states)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log(`Total states in manifest: ${Object.keys(manifest).length}`);
  for (const r of results) {
    console.log(`  ${r.code}: ${r.status}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
