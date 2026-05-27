#!/usr/bin/env node
/**
 * download-geojson-v2.js
 * Downloads assembly constituency GeoJSON for missing states using correct URLs
 * from shijithpk/2024_maps_supplement and india-geodata repositories.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const GEO_DIR = path.resolve(__dirname, '../apps/mobile/data');
const MANIFEST_PATH = path.join(GEO_DIR, 'geo-manifest.json');

const MISSING_STATES = [
  { code: 'MN', name: 'Manipur', seats: 60, file: 'mn-assembly.json' },
  { code: 'ML', name: 'Meghalaya', seats: 60, file: 'ml-assembly.json' },
  { code: 'MZ', name: 'Mizoram', seats: 40, file: 'mz-assembly.json' },
  { code: 'NL', name: 'Nagaland', seats: 60, file: 'nl-assembly.json' },
  { code: 'TR', name: 'Tripura', seats: 60, file: 'tr-assembly.json' },
  { code: 'UK', name: 'Uttarakhand', seats: 70, file: 'uk-assembly.json' },
  { code: 'AR', name: 'Arunachal Pradesh', seats: 60, file: 'ar-assembly.json' },
  { code: 'SK', name: 'Sikkim', seats: 32, file: 'sk-assembly.json' },
  { code: 'PY', name: 'Puducherry', seats: 30, file: 'py-assembly.json' },
];

// Try multiple URL patterns per state
const URL_STRATEGIES = {
  MN: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/manipur/manipur_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/manipur.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Manipur.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/Manipur.geojson',
  ],
  ML: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/meghalaya/meghalaya_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/meghalaya.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Meghalaya.geojson',
  ],
  MZ: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/mizoram/mizoram_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/mizoram.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Mizoram.geojson',
  ],
  NL: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/nagaland/nagaland_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/nagaland.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Nagaland.geojson',
  ],
  TR: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/tripura/tripura_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/tripura.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Tripura.geojson',
  ],
  UK: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/uttarakhand/uttarakhand_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/uttarakhand.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Uttarakhand.geojson',
  ],
  AR: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/arunachal_pradesh/arunachalpradesh_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/arunachalpradesh.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Arunachal%20Pradesh.geojson',
  ],
  SK: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/sikkim/sikkim_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/sikkim.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Sikkim.geojson',
  ],
  PY: [
    'https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/puducherry/puducherry_assembly.geojson',
    'https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/assembly/puducherry.geojson',
    'https://raw.githubusercontent.com/datameet/maps/master/State/Puducherry.geojson',
  ],
};

function httpsGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Kshetra-DataPipeline/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(httpsGet(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(30000, () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateStateOutlineGeoJSON(state) {
  // Generate a simplified state-boundary GeoJSON as placeholder when constituency-level not found
  // This gives the map a visible polygon to render, which is better than nothing
  const stateCoords = {
    MN: [[93.9, 24.2], [94.8, 24.0], [95.4, 24.6], [95.0, 25.5], [93.8, 25.3], [93.3, 25.0], [93.5, 24.4], [93.9, 24.2]],
    ML: [[89.8, 25.0], [91.7, 25.0], [92.8, 25.3], [92.8, 26.1], [91.5, 26.1], [90.0, 26.1], [89.8, 25.5], [89.8, 25.0]],
    MZ: [[92.2, 21.9], [93.4, 21.9], [93.4, 24.2], [92.6, 24.2], [92.2, 23.5], [92.0, 22.5], [92.2, 21.9]],
    NL: [[93.3, 25.2], [94.9, 25.2], [95.2, 26.0], [95.4, 27.0], [94.6, 27.4], [93.8, 27.4], [93.3, 26.8], [93.1, 26.0], [93.3, 25.2]],
    TR: [[91.1, 22.9], [92.4, 22.9], [92.7, 24.0], [92.2, 24.5], [91.4, 24.2], [91.0, 23.6], [91.1, 22.9]],
    UK: [[77.5, 28.7], [78.4, 28.7], [79.5, 29.5], [81.1, 30.4], [81.1, 31.2], [80.0, 31.4], [78.7, 31.4], [78.4, 30.2], [77.5, 29.5], [77.5, 28.7]],
    AR: [[91.6, 26.7], [92.2, 27.0], [96.5, 27.0], [97.4, 27.7], [97.5, 28.2], [96.5, 29.5], [94.0, 29.1], [92.0, 27.8], [91.6, 27.2], [91.6, 26.7]],
    SK: [[87.9, 27.1], [88.9, 27.1], [89.0, 28.2], [88.4, 28.1], [88.0, 27.9], [87.9, 27.4], [87.9, 27.1]],
    PY: [[79.7, 11.8], [80.0, 11.8], [80.3, 12.1], [80.2, 12.4], [79.9, 12.1], [79.7, 11.9], [79.7, 11.8]],
  };

  const coords = stateCoords[state.code];
  if (!coords) return null;

  // Create a single-feature GeoJSON with state outline
  const geoJson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        ST_CODE: state.code,
        ST_NM: state.name,
        note: 'State boundary outline — constituency-level GeoJSON not yet available',
        seats: state.seats,
        source: 'Kshetra generated outline',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    }],
    metadata: {
      state: state.code,
      stateName: state.name,
      type: 'state_outline_placeholder',
      seats: state.seats,
      generated: new Date().toISOString(),
    },
  };

  return geoJson;
}

async function downloadState(state) {
  console.log(`\n[${state.code}] ${state.name} (${state.seats} seats)`);
  const outputFile = path.join(GEO_DIR, state.file);

  if (fs.existsSync(outputFile)) {
    const size = fs.statSync(outputFile).size;
    console.log(`  ✅ Already exists (${Math.round(size/1024)}KB)`);
    return { code: state.code, file: state.file, count: state.seats, status: 'existing' };
  }

  const urls = URL_STRATEGIES[state.code] || [];
  for (const url of urls) {
    console.log(`  → Trying: ${url.substring(0, 80)}...`);
    const data = await httpsGet(url);
    if (data && data.length > 500) {
      try {
        const geoJson = JSON.parse(data);
        if (geoJson.features || geoJson.geometries || geoJson.type) {
          const count = geoJson.features?.length || state.seats;
          fs.writeFileSync(outputFile, JSON.stringify(geoJson), 'utf8');
          console.log(`  ✅ Downloaded! ${Math.round(data.length/1024)}KB, ${count} features`);
          return { code: state.code, file: state.file, count, hasPolygons: count > 1, status: 'downloaded' };
        }
      } catch(e) {
        console.log(`  ⚠️  Parse error: ${e.message}`);
      }
    }
    await sleep(300);
  }

  // Fallback: generate state outline as placeholder
  console.log(`  → Generating state outline placeholder...`);
  const outline = await generateStateOutlineGeoJSON(state);
  if (outline) {
    fs.writeFileSync(outputFile, JSON.stringify(outline), 'utf8');
    console.log(`  ⚠️  Generated state outline placeholder (1 feature)`);
    return { code: state.code, file: state.file, count: state.seats, hasPolygons: false, status: 'placeholder' };
  }

  return { code: state.code, status: 'failed' };
}

async function main() {
  console.log('🗺️  GeoJSON Downloader v2 — Missing States/UTs');
  console.log('='.repeat(60));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const results = [];

  for (const state of MISSING_STATES) {
    const result = await downloadState(state);
    results.push(result);
    await sleep(400);
  }

  // Update manifest
  let added = 0;
  for (const r of results) {
    if (r.status !== 'failed' && !manifest[r.code]) {
      manifest[r.code] = {
        file: r.file,
        count: r.count,
        hasPolygons: r.hasPolygons !== false,
        status: r.status,
      };
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\n📝 Updated geo-manifest.json (+${added} states)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log(`Total states in manifest: ${Object.keys(manifest).length}`);
  for (const r of results) {
    console.log(`  ${r.code}: ${r.status || 'failed'}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
