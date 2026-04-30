/**
 * Generate Point GeoJSON for AP, KA, MH constituencies.
 * Each constituency is a Point feature with properties matching
 * the Telangana polygon GeoJSON schema.
 *
 * Run: node scripts/generate-state-geojson.js
 */

const fs = require('fs');
const path = require('path');

// ─── District centroids (approximate) ───────────────────────────────

const AP_DISTRICT_CENTROIDS = {
  'Srikakulam': [84.0, 18.3], 'Vizianagaram': [83.4, 18.1], 'Visakhapatnam': [83.3, 17.7],
  'Anakapalli': [83.0, 17.7], 'Kakinada': [82.2, 17.0], 'East Godavari': [82.0, 17.0],
  'Dr. B.R. Ambedkar Konaseema': [81.8, 16.6], 'West Godavari': [81.1, 16.9],
  'Eluru': [81.1, 16.7], 'Krishna': [80.6, 16.5], 'NTR': [80.6, 16.5],
  'Guntur': [80.4, 16.3], 'Palnadu': [79.9, 16.5], 'Bapatla': [80.5, 15.9],
  'Prakasam': [79.6, 15.5], 'Nandyal': [78.5, 15.5], 'Kurnool': [78.0, 15.8],
  'Anantapur': [77.6, 14.7], 'Sri Sathya Sai': [77.4, 14.3],
  'YSR Kadapa': [78.8, 14.5], 'Kadapa': [78.8, 14.5],
  'Annamayya': [79.0, 14.3], 'Nellore': [79.9, 14.4], 'Tirupati': [79.4, 13.6],
  'Chittoor': [79.1, 13.2], 'Rajampet': [79.2, 14.2], 'Parvathipuram Manyam': [83.4, 18.4],
  'Alluri Sitharama Raju': [82.0, 17.8],
};

const KA_DISTRICT_CENTROIDS = {
  'Belgaum': [74.5, 15.85], 'Belagavi': [74.5, 15.85], 'Bagalkot': [75.7, 16.18],
  'Bijapur': [75.7, 16.8], 'Vijayapura': [75.7, 16.8], 'Gulbarga': [76.8, 17.33],
  'Kalaburagi': [76.8, 17.33], 'Raichur': [77.4, 16.2], 'Bidar': [77.5, 17.9],
  'Yadgir': [77.1, 16.77], 'Koppal': [76.2, 15.95], 'Bellary': [76.9, 15.14],
  'Ballari': [76.9, 15.14], 'Gadag': [75.6, 15.4], 'Haveri': [75.4, 14.8],
  'Dharwad': [75.0, 15.45], 'Uttara Kannada': [74.7, 14.7], 'Dakshina Kannada': [75.0, 12.87],
  'Udupi': [74.75, 13.34], 'Shimoga': [75.6, 13.93], 'Shivamogga': [75.6, 13.93],
  'Chickmagalur': [75.8, 13.31], 'Chikkamagaluru': [75.8, 13.31],
  'Hassan': [76.1, 13.0], 'Kodagu': [75.7, 12.42], 'Mysore': [76.65, 12.3],
  'Mysuru': [76.65, 12.3], 'Mandya': [76.9, 12.52], 'Chamarajanagar': [76.94, 11.92],
  'Tumkur': [77.1, 13.34], 'Tumakuru': [77.1, 13.34],
  'Chitradurga': [76.4, 14.23], 'Davanagere': [75.92, 14.47],
  'Kolar': [78.13, 13.14], 'Chikkaballapura': [77.73, 13.44],
  'Bangalore Rural': [77.5, 13.2], 'Bangalore Urban': [77.59, 12.97],
  'Bengaluru Rural': [77.5, 13.2], 'Bengaluru Urban': [77.59, 12.97],
  'Ramanagara': [77.28, 12.72], 'Chamarajpet': [77.57, 12.96],
};

const MH_DISTRICT_CENTROIDS = {
  'Mumbai City': [72.88, 18.97], 'Mumbai Suburban': [72.85, 19.1],
  'Thane': [73.0, 19.2], 'Palghar': [72.75, 19.7], 'Raigad': [73.1, 18.5],
  'Ratnagiri': [73.3, 17.0], 'Sindhudurg': [73.6, 16.0],
  'Pune': [73.86, 18.52], 'Solapur': [75.9, 17.67], 'Satara': [74.0, 17.7],
  'Sangli': [74.6, 16.85], 'Kolhapur': [74.23, 16.7],
  'Nashik': [73.78, 20.0], 'Ahmednagar': [74.75, 19.1], 'Dhule': [74.77, 20.9],
  'Nandurbar': [74.24, 21.37], 'Jalgaon': [75.56, 21.01],
  'Aurangabad': [75.34, 19.88], 'Chhatrapati Sambhajinagar': [75.34, 19.88],
  'Jalna': [75.88, 19.84], 'Beed': [75.76, 18.99], 'Osmanabad': [76.04, 18.19],
  'Dharashiv': [76.04, 18.19], 'Latur': [76.56, 18.4], 'Nanded': [77.32, 19.16],
  'Parbhani': [76.77, 19.27], 'Hingoli': [77.15, 19.72],
  'Nagpur': [79.09, 21.15], 'Wardha': [78.6, 20.74], 'Chandrapur': [79.3, 19.95],
  'Gadchiroli': [80.0, 20.1], 'Bhandara': [79.65, 21.17], 'Gondia': [80.2, 21.46],
  'Amravati': [77.77, 20.93], 'Akola': [77.0, 20.71], 'Washim': [77.15, 20.11],
  'Buldhana': [76.18, 20.53], 'Yavatmal': [78.12, 20.39],
};

// ─── Load seed data ─────────────────────────────────────────────────

function loadConstituencies(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Extract the array from the TS file
  const match = content.match(/export const \w+:\s*\w+\[\]\s*=\s*(\[[\s\S]*\]);/);
  if (!match) throw new Error(`Could not parse ${filePath}`);
  let cleaned = match[1]
    .replace(/\/\/[^\n]*/g, '')           // remove single-line comments
    .replace(/,\s*([\]}])/g, '$1');       // remove trailing commas
  // Quote bare property names: word followed by colon
  cleaned = cleaned.replace(/(\b\w+)\s*:/g, '"$1":');
  // Single to double quotes for string values
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  return JSON.parse(cleaned);
}

function getDistrictCoord(centroids, district) {
  if (centroids[district]) return centroids[district];
  // Fuzzy match
  for (const [key, val] of Object.entries(centroids)) {
    if (key.toLowerCase().includes(district.toLowerCase()) ||
        district.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return null;
}

function generateGeoJSON(constituencies, stateCode, centroids, yearKey) {
  const districtGroups = {};
  for (const c of constituencies) {
    if (!districtGroups[c.district]) districtGroups[c.district] = [];
    districtGroups[c.district].push(c);
  }

  const features = [];
  for (const [district, members] of Object.entries(districtGroups)) {
    const baseCoord = getDistrictCoord(centroids, district);
    if (!baseCoord) {
      console.warn(`  ⚠ No centroid for district: ${district} (${stateCode})`);
      continue;
    }
    // Distribute constituencies in a grid within the district
    const count = members.length;
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 0.08; // ~8km spacing

    members.forEach((c, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const lng = baseCoord[0] + (col - (cols - 1) / 2) * spacing;
      const lat = baseCoord[1] + (row - (Math.ceil(count / cols) - 1) / 2) * spacing;

      const winnerKey = `winner${yearKey}`;
      const winnerNameKey = `winnerName${yearKey}`;
      const winnerVotesKey = `winnerVotes${yearKey}`;
      const runnerUpKey = `runnerUp${yearKey}`;
      const marginKey = `margin${yearKey}`;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng.toFixed(4)), parseFloat(lat.toFixed(4))],
        },
        properties: {
          AC_NO: c.acNo,
          AC_NAME: c.name,
          DIST_NAME: c.district,
          STATE: stateCode,
          WINNER_PARTY: c[winnerKey],
          WINNER_NAME: c[winnerNameKey],
          WINNER_VOTES: c[winnerVotesKey],
          RUNNER_UP: c[runnerUpKey],
          MARGIN: c[marginKey],
          RESERVATION: c.type,
          CURRENT_PARTY: c.currentParty || c[winnerKey],
        },
      });
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

// ─── Main ────────────────────────────────────────────────────────────

const seedDir = path.join(__dirname, '..', 'data', 'seed');
const outDir = path.join(__dirname, '..', 'apps', 'mobile', 'data');

// AP
console.log('Generating AP GeoJSON...');
const apData = loadConstituencies(path.join(seedDir, 'andhra-pradesh-constituencies.ts'));
const apGeo = generateGeoJSON(apData, 'AP', AP_DISTRICT_CENTROIDS, '2024');
fs.writeFileSync(path.join(outDir, 'ap-assembly.json'), JSON.stringify(apGeo));
console.log(`  ✓ ${apGeo.features.length}/${apData.length} features`);

// KA
console.log('Generating KA GeoJSON...');
const kaData = loadConstituencies(path.join(seedDir, 'karnataka-constituencies.ts'));
const kaGeo = generateGeoJSON(kaData, 'KA', KA_DISTRICT_CENTROIDS, '2023');
fs.writeFileSync(path.join(outDir, 'ka-assembly.json'), JSON.stringify(kaGeo));
console.log(`  ✓ ${kaGeo.features.length}/${kaData.length} features`);

// MH
console.log('Generating MH GeoJSON...');
const mhData = loadConstituencies(path.join(seedDir, 'maharashtra-constituencies.ts'));
const mhGeo = generateGeoJSON(mhData, 'MH', MH_DISTRICT_CENTROIDS, '2024');
fs.writeFileSync(path.join(outDir, 'mh-assembly.json'), JSON.stringify(mhGeo));
console.log(`  ✓ ${mhGeo.features.length}/${mhData.length} features`);

console.log('\nDone!');
