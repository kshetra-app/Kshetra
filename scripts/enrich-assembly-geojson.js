/**
 * Enrich downloaded assembly GeoJSON files with election data from seed files.
 * Matches by Name first (primary, with overrides/spelling corrections)
 * and falls back to AC_NO matching (only for non-corrupted states).
 *
 * Dynamically detects election year and field keys for each state.
 * Processes all states available in the seed data directory.
 *
 * Run: node scripts/enrich-assembly-geojson.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'apps', 'mobile', 'data');
const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

const STATE_CODE_MAP = {
  'andhra-pradesh': 'AP',
  'karnataka': 'KA',
  'maharashtra': 'MH',
  'tamil-nadu': 'TN',
  'kerala': 'KL',
  'west-bengal': 'WB',
  'uttar-pradesh': 'UP',
  'rajasthan': 'RJ',
  'gujarat': 'GJ',
  'delhi': 'DL',
  'odisha': 'OD',
  'jharkhand': 'JH',
  'bihar': 'BR',
  'punjab': 'PB',
  'haryana': 'HR',
  'uttarakhand': 'UK',
  'chhattisgarh': 'CG',
  'madhya-pradesh': 'MP',
  'assam': 'AS',
  'goa': 'GA',
  'himachal-pradesh': 'HP',
  'jammu-kashmir': 'JK',
  'telangana': 'TS',
  'arunachal-pradesh': 'AR',
  'meghalaya': 'ML',
  'manipur': 'MN',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'puducherry': 'PY',
  'sikkim': 'SK',
  'tripura': 'TR'
};

const AC_NO_OVERRIDES = {
  TN: { 70: 'GINGEE' },
  GJ: { 38: 'KALOLGANDHINAGAR', 127: 'KALOLPANCHMAHALS' },
  TS: { 17: 'NIZAMABADURBAN', 18: 'NIZAMABADRURAL' },
  OD: { 112: 'BHUBANESWARCENTRAL', 113: 'BHUBANESWARNORTH' }
};

const NAME_OVERRIDES = {
  TN: {
    'TIRUPPATTUR': 'TIRUPATTUR',
    'SHOLINGUR': 'SHOLINGHUR',
    'DRRADHAKRISHNANNAGA': 'DRRADHAKRISHNANNAGAR',
    'CHEPAUKTHIRUVALLIKEN': 'CHEPAUKTHIRUVALLIKENI',
    'PALACODU': 'PALACODE',
    'PAPPIREDDIPPATTI': 'PAPPIREDDIPATTI',
    'VILUPPURAM': 'VILLUPURAM',
    'GANDHARVAKOTTAI': 'GANDARVAKKOTTAI',
    'COLACHEL': 'COLACHAL',
  },
  KL: {
    'MANJESHWAR': 'MANJESHWARAM',
    'KASARAGOD': 'KASARGOD',
    'TRIKARIPUR': 'THRIKKARIPUR',
    'TALIPARAMBA': 'THALIPARAMBA',
    'DHARMADAM': 'DHARMADOM',
    'VADAKARA': 'VATAKARA',
    'KUTTIADI': 'KUTTIADY',
    'QUILANDY': 'KOYILANDY',
    'ERNAD': 'ERANAD',
    'KOZHIKODESOUTH': 'KOZHIKODEBSOUTH',
    'NEMMARA': 'NENMARA',
    'VYPEEN': 'VYPIN',
    'PEERUMADE': 'PEERUMEDE',
    'KARUNAGAPPALLY': 'KARUNAGAPALLY',
    'KATTAKKADA': 'KATTAKADA',
    'THIRUVANANTHAPURA': 'THIRUVANANTHAPURAM',
  },
  WB: {
    'HARISCHANDRAPUR': 'HARISHCHANDRAPUR',
    'BARRACKPUR': 'BARRACKPORE',
    'SATGACHHIA': 'SATGACHIA',
    'TOLLYGANJ': 'TOLLYGUNGE',
    'KASHIPURBELGACHHIA': 'KASHIPURBELGACHIA',
    'ARAMBAG': 'ARAMBAGH',
    'INDUS': 'INDAS',
    'MONTESWAR': 'MANTESWAR',
    'PANDABESWAR': 'PANDAVESWAR',
  },
  UP: {
    'DHOLANA': 'DHAULANA',
    'SAWAIJPUR': 'SAWAYAZPUR',
    'KISHANI': 'KISHNI',
    'AGRACANTT': 'AGRACANTONMENT',
    'PANIYRA': 'PANIYARA',
    'BANGERMAU': 'BANGARMAU',
    'LUCKNOWCANTT': 'LUCKNOWCANTONMENT',
    'KANPURCANTT': 'KANPURCANTONMENT',
    'MADHAUGARH': 'MADHOGARH',
    'BISHWAVNATHGANJ': 'VISHWANATHGANJ',
    'GHAZIPUR': 'GHAZIPURSADAR',
  },
  RJ: {
    'NEEMAKATHANA': 'NEEMKATHANA',
  },
  GJ: {
    'JAMNAGAR': 'JAMNAGARRURAL',
  },
  TS: {
    'BELLAMPALLE': 'BELLAMPALLI',
    'WARADHANAPET': 'WARDHANNAPET',
    'GHANPUR': 'GHANPURSTATION',
    'JANGOAN': 'JANGAON',
    'KUKATPALLE': 'KUKATPALLY',
    'SECUNDERABADCANTT': 'SECUNDERABADCANTONMENT',
    'LALBAHADURNAGAR': 'LBNAGAR',
    'MAHESWARAM': 'MAHESHWARAM',
    'SATHUPALLE': 'SATHUPALLI',
  },
  AR: {
    'TUTINGYINKGKIONG': 'TUTINGYINGKIONG',
    'HAUYULIANG': 'HAYULIANG',
    'DAMPORIJO': 'DUMPORIJO',
    'BORDUMSADIYUM': 'BORDUMSADIYUN',
    'PAKKEKASANG': 'PAKKEKESSANG',
    'BORDURIABAGAPANI': 'BORDURIABOGAPANI',
    'PONGCHOUWAKKA': 'PONGCHAUWAKKA',
  },
  ML: {
    'SOHING': 'SOHIONG',
    'AMPATHI': 'AMPATI',
  },
  MN: {
    'KHETRIGAO': 'KSHETRIGAO',
    'KEISAMTHONG': 'KEISHAMTHONG',
    'NAORIYAPAKHANGLAK': 'NAORIYAPAKHANGLAKPA',
    'KHANGABO': 'KHANGABOK',
    'BISHENPUR': 'BISHNUPUR',
    'SUGNOO': 'SUGNU',
  },
  MZ: {
    'AIZAWLEASTI': 'AIZAWLEAST',
    'AIZAWLNORTHI': 'AIZAWLNORTH',
    'AIZAWLNORTHII': 'AIZAWLNORTH',
  },
  NL: {
    'ALUNGTAKI': 'ALONGTAKI',
    'MONGUYA': 'MONGOYA',
    'SURUHUTO': 'SURUHOTO',
    'SHAMTORRCHESSORE': 'SHAMATORCHESSORE',
    'SIYUCHONGSITIMI': 'SEYOCHUNGSITIMI',
    'NORTHERNANGAMI': 'NORTHERNANGAMII',
  },
  PY: {
    'KAMRAJNAGAR': 'KAMARAJNAGAR',
    'NERAVYTRPATTIN': 'NERAVYTRPATTINAM',
  },
  SK: {
    'WESTPENDAM': 'WESTPENDA',
    'SALGHARIZOOM': 'SALGHARIZOO',
  },
  BR: {
    'BHOREY': 'BHORE',
    'BOCHAHA': 'BOCHAHAN',
    'DARAUNDHA': 'DARAUNDA',
    'DHAURAIYA': 'DHORAIYA',
  },
  PB: {
    'BHAGHAPURANA': 'BAGHAPURANA',
    'KHADOORSAHIB': 'KHADURSAHIB',
  },
  HR: {
    'GARHISAMPLAKILO': 'GARHISAMPLAKILOI',
  },
  UK: {
    'BHELRANIPU': 'BHELRANIPUR',
    'MANGLAUR': 'MANGLORE',
  },
  JH: {
    'BISHNUPUR': 'BISHUNPUR',
  }
};

// ─── TS file parser ─────────────────────────────────────────────────
function loadTsArray(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/export const \w+(?::\s*\w+\[\])?\s*=\s*(\[[\s\S]*\]);/);
  if (!match) throw new Error(`Could not parse ${filePath}`);
  return new Function(`return ${match[1]}`)();
}

function normalize(name) {
  if (!name) return '';
  let clean = name
    .toUpperCase()
    .replace(/\s*\(SC\)\s*/g, '')
    .replace(/\s*\(ST\)\s*/g, '')
    .replace(/\s*\(GEN\)\s*/g, '')
    .replace(/\(S$/g, ''); // Handles truncated "(S"
  // Strip bye-election details
  clean = clean.split(':')[0];
  return clean
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

function detectConfig(firstSeedEntry) {
  let latestYear = 0;
  for (const key of Object.keys(firstSeedEntry)) {
    const match = key.match(/^winner(\d{4})$/);
    if (match) {
      const yr = parseInt(match[1]);
      if (yr > latestYear) latestYear = yr;
    }
  }
  if (latestYear === 0) {
    if ('winner' in firstSeedEntry) {
      return {
        year: 2024,
        winnerField: 'winner',
        winnerNameField: 'winnerName',
        winnerVotesField: 'winnerVotes',
        runnerUpField: 'runnerUp',
        marginField: 'margin',
      };
    }
    throw new Error('Could not detect election year in seed entry');
  }
  return {
    year: latestYear,
    winnerField: `winner${latestYear}`,
    winnerNameField: `winnerName${latestYear}`,
    winnerVotesField: `winnerVotes${latestYear}`,
    runnerUpField: `runnerUp${latestYear}`,
    marginField: `margin${latestYear}`,
  };
}

function enrichState(stateCode, seedFile) {
  const fileBaseName = stateCode === 'TS' ? 'telangana' : stateCode.toLowerCase();
  const geoFile = path.join(DATA_DIR, `${fileBaseName}-assembly.json`);
  if (!fs.existsSync(geoFile)) {
    console.log(`  ⊘ ${stateCode}: No GeoJSON file found at ${geoFile}`);
    return;
  }

  const seedPath = path.join(SEED_DIR, seedFile);
  if (!fs.existsSync(seedPath)) {
    console.log(`  ⊘ ${stateCode}: Seed file not found at ${seedPath}`);
    return;
  }

  const seed = loadTsArray(seedPath);
  const geojson = JSON.parse(fs.readFileSync(geoFile, 'utf-8'));
  const config = detectConfig(seed[0]);

  // Build lookup maps
  const byName = new Map();
  const byAcNo = new Map();
  for (const c of seed) {
    const norm = normalize(c.name);
    byName.set(norm, c);
    byAcNo.set(c.acNo, c);
  }

  let matched = 0;
  let unmatched = 0;
  const stateAcOverrides = AC_NO_OVERRIDES[stateCode] || {};
  const stateNameOverrides = NAME_OVERRIDES[stateCode] || {};

  for (const feature of geojson.features) {
    const props = feature.properties;
    const acNo = props.AC_NO;
    const acName = props.AC_NAME || props.ac_name || props.assem_name || props.NAME || '';

    let seedEntry = null;

    // 1. Check AC_NO overrides first
    if (acNo != null && stateAcOverrides[acNo]) {
      const targetNorm = stateAcOverrides[acNo];
      seedEntry = byName.get(targetNorm);
    }

    // 2. Match by normalized name (with optional spelling overrides)
    if (!seedEntry) {
      let norm = normalize(acName);
      if (stateNameOverrides[norm]) {
        norm = stateNameOverrides[norm];
      }
      seedEntry = byName.get(norm);
    }

    // 3. Fallback to AC_NO matching (only for non-corrupted states)
    if (!seedEntry && acNo != null && stateCode !== 'GA' && stateCode !== 'HP' && stateCode !== 'AS') {
      seedEntry = byAcNo.get(acNo);
    }

    if (seedEntry) {
      props.WINNER_PARTY = seedEntry[config.winnerField] || '';
      props.WINNER_NAME = seedEntry[config.winnerNameField] || '';
      props.WINNER_VOTES = seedEntry[config.winnerVotesField] || 0;
      props.RUNNER_UP = seedEntry[config.runnerUpField] || '';
      props.MARGIN = seedEntry[config.marginField] || 0;
      props.RESERVATION = seedEntry.type || 'GEN';
      props.CURRENT_PARTY = seedEntry.currentParty || props.WINNER_PARTY;

      // Update AC_NAME and AC_NO / DIST_NAME to standard seed values
      if (seedEntry.name) props.AC_NAME = seedEntry.name;
      if (seedEntry.acNo) props.AC_NO = seedEntry.acNo;
      if (seedEntry.district) props.DIST_NAME = seedEntry.district;
      matched++;
    } else {
      // Assign default properties so Mapbox expressions do not crash
      props.WINNER_PARTY = 'IND';
      props.WINNER_NAME = '';
      props.WINNER_VOTES = 0;
      props.RUNNER_UP = '';
      props.MARGIN = 0;
      props.RESERVATION = 'GEN';
      props.CURRENT_PARTY = 'IND';
      unmatched++;
    }
  }

  fs.writeFileSync(geoFile, JSON.stringify(geojson));
  const pct = ((matched / geojson.features.length) * 100).toFixed(1);
  console.log(`  ✓ ${stateCode}: ${matched}/${geojson.features.length} matched (${pct}%) - ${unmatched} unmatched`);
}

function main() {
  console.log('Enriching assembly GeoJSON with election data...\n');

  const seedFiles = fs.readdirSync(SEED_DIR).filter(f => f.endsWith('-constituencies.ts'));

  for (const file of seedFiles) {
    const prefix = file.replace('-constituencies.ts', '');
    const code = STATE_CODE_MAP[prefix];
    if (!code) {
      console.log(`  ℹ Skipping seed file ${file} (no state code mapped)`);
      continue;
    }
    enrichState(code, file);
  }

  console.log('\nDone!');
}

main();
