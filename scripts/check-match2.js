const fs = require('fs');
const path = require('path');

function norm(raw) {
  return raw
    .replace(/\s*\((?:SC|ST|GEN)\)?\s*/gi, '')
    .replace(/\(/g, ' ').replace(/\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function strip(s) { return s.replace(/\s/g, ''); }

const ALIAS = {
  'kala kote': 'kalakote sunderbani',
  'chabua': 'chabualahowal',
  'lahowal': 'chabualahowal',
};

const stateMap = {
  'telangana': { c: 'TS', s: 'telangana-constituencies.ts' },
  'ap': { c: 'AP', s: 'andhra-pradesh-constituencies.ts' },
  'ka': { c: 'KA', s: 'karnataka-constituencies.ts' },
  'mh': { c: 'MH', s: 'maharashtra-constituencies.ts' },
  'tn': { c: 'TN', s: 'tamil-nadu-constituencies.ts' },
  'kl': { c: 'KL', s: 'kerala-constituencies.ts' },
  'wb': { c: 'WB', s: 'west-bengal-constituencies.ts' },
  'up': { c: 'UP', s: 'uttar-pradesh-constituencies.ts' },
  'rj': { c: 'RJ', s: 'rajasthan-constituencies.ts' },
  'gj': { c: 'GJ', s: 'gujarat-constituencies.ts' },
  'dl': { c: 'DL', s: 'delhi-constituencies.ts' },
  'od': { c: 'OD', s: 'odisha-constituencies.ts' },
  'jh': { c: 'JH', s: 'jharkhand-constituencies.ts' },
  'br': { c: 'BR', s: 'bihar-constituencies.ts' },
  'pb': { c: 'PB', s: 'punjab-constituencies.ts' },
  'hr': { c: 'HR', s: 'haryana-constituencies.ts' },
  'cg': { c: 'CG', s: 'chhattisgarh-constituencies.ts' },
  'mp': { c: 'MP', s: 'madhya-pradesh-constituencies.ts' },
  'as': { c: 'AS', s: 'assam-constituencies.ts' },
  'ga': { c: 'GA', s: 'goa-constituencies.ts' },
  'hp': { c: 'HP', s: 'himachal-pradesh-constituencies.ts' },
  'jk': { c: 'JK', s: 'jammu-kashmir-constituencies.ts' },
};

let totalGeo = 0, totalMatched = 0;

for (const [prefix, info] of Object.entries(stateMap)) {
  const geoFile = path.join('C:/K/apps/mobile/data', prefix + '-assembly.json');
  const seedFile = path.join('C:/K/data/seed', info.s);
  if (!fs.existsSync(geoFile) || !fs.existsSync(seedFile)) continue;

  const geo = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
  if (geo.features.length <= 1) { console.log(info.c + ': outline only'); continue; }

  const seedContent = fs.readFileSync(seedFile, 'utf8');
  const nameRegex = /name:\s*'([^']+)'/g;
  const seedNames = new Set();
  const seedStripped = new Set();
  let m;
  while ((m = nameRegex.exec(seedContent)) !== null) {
    seedNames.add(norm(m[1]));
    seedStripped.add(strip(norm(m[1])));
  }

  let matched = 0, unmatched = 0;
  for (const f of geo.features) {
    const rawName = f.properties?.AC_NAME ?? '';
    const gn = norm(rawName);
    const gs = strip(gn);
    const alias = ALIAS[gn];

    if (seedNames.has(gn) || seedStripped.has(gs) ||
        (alias && (seedNames.has(alias) || seedStripped.has(strip(alias))))) {
      matched++;
    } else {
      unmatched++;
    }
  }

  totalGeo += geo.features.length;
  totalMatched += matched;
  const pct = Math.round(matched / geo.features.length * 100);
  const marker = pct === 100 ? ' OK' : pct >= 95 ? ' ~' : ' !!';
  console.log(`${info.c.padEnd(3)} ${String(matched).padStart(3)}/${String(geo.features.length).padStart(3)} (${String(pct).padStart(3)}%)${marker}  seed=${seedNames.size}${unmatched > 0 ? '  gaps=' + unmatched : ''}`);
}

const pctTotal = Math.round(totalMatched / totalGeo * 100);
console.log(`\nTOTAL: ${totalMatched}/${totalGeo} (${pctTotal}%) — ${totalGeo - totalMatched} GeoJSON features missing from seed`);
