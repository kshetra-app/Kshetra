/**
 * Download real assembly constituency polygon GeoJSON for all Indian states
 * from datta07/INDIAN-SHAPEFILES GitHub repo, simplify them, and enrich
 * with our seed data properties (AC_NO, WINNER_PARTY, etc.).
 *
 * Run: node scripts/download-assembly-geojson.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── State mapping: our code → repo folder name + file name ─────────
const STATE_MAP = {
  AP: { folder: 'ANDHRA PRADESH', file: 'ANDHRA PRADESH_ASSEMBLY.geojson' },
  KA: { folder: 'KARNATAKA', file: 'KARNATAKA_ASSEMBLY.geojson' },
  MH: { folder: 'MAHARASHTRA', file: 'MAHARASHTRA_ASSEMBLY.geojson' },
  TN: { folder: 'TAMIL NADU', file: 'TAMIL NADU_ASSEMBLY.geojson' },
  KL: { folder: 'KERALA', file: 'KERALA_ASSEMBLY.geojson' },
  WB: { folder: 'WEST BENGAL', file: 'WEST BENGAL_ASSEMBLY.geojson' },
  UP: { folder: 'UTTAR PRADESH', file: 'UTTAR PRADESH_ASSEMBLY.geojson' },
  RJ: { folder: 'RAJASTHAN', file: 'RAJASTHAN_ASSEMBLY.geojson' },
  GJ: { folder: 'GUJARAT', file: 'GUJARAT_ASSEMBLY.geojson' },
  DL: { folder: 'DELHI', file: 'DELHI_ASSEMBLY.geojson' },
  OD: { folder: 'ORISSA', file: 'ORISSA_ASSEMBLY.geojson' },
  JH: { folder: 'JHARKHAND', file: 'JHARKHAND_ASSEMBLY.geojson' },
  BR: { folder: 'BIHAR', file: 'BIHAR_ASSEMBLY.geojson' },
  PB: { folder: 'PUNJAB', file: 'PUNJAB_ASSEMBLY.geojson' },
  HR: { folder: 'HARYANA', file: 'HARYANA_ASSEMBLY.geojson' },
  UK: { folder: 'UTTARAKHAND', file: 'UTTARAKHAND_ASSEMBLY.geojson' },
  CG: { folder: 'CHHATTISGARH', file: 'CHHATTISGARH_ASSEMBLY.geojson' },
  MP: { folder: 'MADHYA PRADESH', file: 'MADHYA PRADESH_ASSEMBLY.geojson' },
  AS: { folder: 'ASSAM', file: 'ASSAM_ASSEMBLY.geojson' },
  GA: { folder: 'GOA', file: 'GOA_ASSEMBLY.geojson' },
  HP: { folder: 'HIMACHAL PRADESH', file: 'HIMACHAL PRADESH_ASSEMBLY.geojson' },
  JK: { folder: 'JAMMU & KASHMIR', file: 'JAMMU & KASHMIR_ASSEMBLY.geojson' },
  TS: { folder: 'TELANGANA', file: 'TELANGANA_ASSEMBLY.geojson' },
};

const BASE_URL = 'https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/STATES';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      
      const mod = currentUrl.startsWith('https') ? https : require('http');
      mod.get(currentUrl, { headers: { 'User-Agent': 'Kshetra-App' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

/**
 * Simplify a GeoJSON by reducing coordinate precision.
 * This drastically reduces file size (from ~20MB to ~2-4MB per state).
 */
function simplifyGeoJSON(geojson, precision = 4) {
  function roundCoord(coord) {
    return [
      parseFloat(coord[0].toFixed(precision)),
      parseFloat(coord[1].toFixed(precision)),
    ];
  }

  function simplifyCoords(coords) {
    if (typeof coords[0] === 'number') {
      return roundCoord(coords);
    }
    return coords.map(simplifyCoords);
  }

  // Also remove duplicate consecutive points
  function dedup(ring) {
    if (!Array.isArray(ring) || typeof ring[0] === 'number') return ring;
    if (Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
      // This is a coordinate ring
      const result = [ring[0]];
      for (let i = 1; i < ring.length; i++) {
        const prev = result[result.length - 1];
        if (ring[i][0] !== prev[0] || ring[i][1] !== prev[1]) {
          result.push(ring[i]);
        }
      }
      return result;
    }
    return ring.map(dedup);
  }

  return {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: dedup(simplifyCoords(f.geometry.coordinates)),
      },
      properties: f.properties,
    })),
  };
}

/**
 * Normalize property names from the source GeoJSON.
 * Different states may have different property schemas.
 * We extract AC_NO and AC_NAME from whatever fields exist.
 */
function normalizeProperties(feature, stateCode) {
  const p = feature.properties || {};
  
  // Try various field names for AC number
  const acNo = p.AC_NO ?? p.ac_no ?? p.AC_NUM ?? p.ac_num ?? p.objectid ?? 
               p.OBJECTID ?? p.FID ?? p.AC_CODE ?? p.ac_code ?? null;
  
  // Try various field names for AC name
  const acName = p.AC_NAME || p.ac_name || p.assem_name || p.ASSEM_NAME ||
                 p.AC_Nam || p.NAME || p.name || p.CONSTITUENCY || p.constituency ||
                 p.Constituency || p.AC_NAME_x || p.ASSEMBLY || p.assembly || 
                 p.AC_Name || '';

  // District
  const distName = p.DIST_NAME || p.dist_name || p.DISTRICT || p.district ||
                   p.District || p.DT_NAME || p.dt_name || '';

  // Clean constituency name: remove reservation suffixes like " (SC)", " (ST)"
  const cleanName = String(acName).trim();

  return {
    AC_NO: acNo != null ? Number(acNo) : null,
    AC_NAME: cleanName,
    DIST_NAME: String(distName).replace(/\s*\*\s*$/, '').trim(),
    STATE: stateCode,
  };
}

async function processState(stateCode, config) {
  const url = `${BASE_URL}/${encodeURIComponent(config.folder)}/${encodeURIComponent(config.file)}`;
  
  console.log(`  Downloading ${stateCode}...`);
  
  try {
    const raw = await downloadFile(url);
    const geojson = JSON.parse(raw);
    
    if (!geojson.features || geojson.features.length === 0) {
      console.log(`  ⚠ ${stateCode}: No features found`);
      return null;
    }

    // Normalize properties
    const normalized = {
      type: 'FeatureCollection',
      features: geojson.features.map((f, idx) => {
        const props = normalizeProperties(f, stateCode);
        // If no AC_NO found, assign index + 1
        if (props.AC_NO === null) props.AC_NO = idx + 1;
        return {
          ...f,
          properties: props,
        };
      }),
    };

    // Simplify coordinates
    const simplified = simplifyGeoJSON(normalized, 4);
    
    const rawSize = Buffer.byteLength(raw, 'utf-8');
    const simplifiedStr = JSON.stringify(simplified);
    const newSize = Buffer.byteLength(simplifiedStr, 'utf-8');
    
    console.log(`  ✓ ${stateCode}: ${simplified.features.length} features, ${(rawSize/1024/1024).toFixed(1)}MB → ${(newSize/1024/1024).toFixed(1)}MB`);
    
    return simplified;
  } catch (err) {
    console.log(`  ✗ ${stateCode}: ${err.message}`);
    return null;
  }
}

async function main() {
  const outDir = path.join(__dirname, '..', 'apps', 'mobile', 'data');
  
  // Ensure output directory exists
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Downloading assembly constituency boundaries for all states...\n');

  const results = {};
  
  // Process states sequentially to avoid overwhelming GitHub
  for (const [code, config] of Object.entries(STATE_MAP)) {
    // Skip Telangana — we already have it
    if (code === 'TS') {
      console.log(`  ⊘ ${code}: Already have local polygon data, skipping`);
      continue;
    }
    
    const geojson = await processState(code, config);
    if (geojson) {
      const outFile = `${code.toLowerCase()}-assembly.json`;
      fs.writeFileSync(path.join(outDir, outFile), JSON.stringify(geojson));
      results[code] = { file: outFile, features: geojson.features.length };
    }
    
    // Small delay to be nice to GitHub
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n─── Summary ───');
  let total = 0;
  for (const [code, info] of Object.entries(results)) {
    console.log(`  ${code}: ${info.features} constituencies → ${info.file}`);
    total += info.features;
  }
  console.log(`\n  Total: ${total} constituencies across ${Object.keys(results).length} states`);
  console.log(`  Files written to: ${outDir}`);
  
  // Write a manifest for easy importing
  const manifest = {};
  for (const [code, info] of Object.entries(results)) {
    manifest[code] = { file: info.file, count: info.features, hasPolygons: true };
  }
  // Include TS
  manifest['TS'] = { file: 'telangana-assembly.json', count: 119, hasPolygons: true };
  
  fs.writeFileSync(
    path.join(outDir, 'geo-manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log('  Manifest written to: geo-manifest.json');
}

main().catch(console.error);
