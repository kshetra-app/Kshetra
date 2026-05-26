/**
 * Fix MLA profile acNo values across all states.
 * 
 * Problem: The MLA profiles were generated with sequential acNo (1, 2, 3...)
 * alphabetically, but the constituency files use official ECI AC numbers.
 * This script remaps each profile's acNo using constituencyName matching.
 * 
 * Pass --report to only list unfixed names without modifying files.
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'seed');
const reportOnly = process.argv.includes('--report');

const states = [
  {
    code: 'AP',
    profiles: 'andhra-pradesh-mla-profiles.ts',
    constituencies: 'andhra-pradesh-constituencies.ts',
  },
  {
    code: 'KA',
    profiles: 'karnataka-mla-profiles.ts',
    constituencies: 'karnataka-constituencies.ts',
  },
  {
    code: 'MH',
    profiles: 'maharashtra-mla-profiles.ts',
    constituencies: 'maharashtra-constituencies.ts',
  },
  {
    code: 'TN',
    profiles: 'tamil-nadu-mla-profiles.ts',
    constituencies: 'tamil-nadu-constituencies.ts',
  },
  {
    code: 'KL',
    profiles: 'kerala-mla-profiles.ts',
    constituencies: 'kerala-constituencies.ts',
  },
  {
    code: 'WB',
    profiles: 'west-bengal-mla-profiles.ts',
    constituencies: 'west-bengal-constituencies.ts',
  },
  {
    code: 'UP',
    profiles: 'uttar-pradesh-mla-profiles.ts',
    constituencies: 'uttar-pradesh-constituencies.ts',
  },
];

function normalize(name) {
  return name
    .toUpperCase()
    .replace(/\s*:\s*BYE ELECTION.*$/i, '') // Strip bye-election suffix
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common spelling aliases between profile scrape and constituency files
const ALIASES = {
  // AP
  'ACHANTA': 'Achchanta',
  'ANAKAPALLE': 'Anakapalli',
  'CHEEPURUPALLE': 'Cheepurupalli',
  'JAGGAMPETA': 'Jaggampeta',
  'JAGGAYYAPETA': 'Jaggayyapet',
  'KAIKALURU': 'Kaikalur',
  'NAARSARAOPET': 'Narasaraopet',
  'NARSARAOPETA': 'Narasaraopet',
  'PARVATHIPURAM': 'Parvathipuram',
  'RAJAMPET': 'Rajampeta',
  'SRUNGAVARAPUKOTA': 'Srungavarapukota',
  'TADEPALLEGUDEM': 'Tadepalligudem',
  'TADIKONDA': 'Tadikonda',
  'VIJAYANAGARAM': 'Vizianagaram',
  'VIZIANAGARAM': 'Vizianagaram',
  'YANAMALA': 'Yanam',
  // KA
  'ARAKALGUD': 'Arkalgud',
  'ARSIKERE': 'Arsikere',
  'BAILAHONGAL': 'Bailhongal',
  'BAINDUR': 'Baindoor',
  'BANTWAL': 'Bantval',
  'BELLARY': 'Bellary',
  'BIJAPUR': 'Vijayapura',
  'CHAMARAJANAGARA': 'Chamarajanagar',
  'CHANNAGIRI': 'Channagiri',
  'CHIKKABALLAPURA': 'Chikkaballapur',
  'CHIKKANAYAKANAHALLI': 'Chikkanayakanahalli',
  'CHITRADURGA': 'Chitradurga',
  'DAVANGERE': 'Davanagere',
  'DEVANAHALLI': 'Devanahalli',
  'GADAG': 'Gadag',
  'GANGAVATHI': 'Gangavati',
  'GUBBI': 'Gubbi',
  'GUNDLUPETE': 'Gundlupet',
  'HANGAL': 'Hangal',
  'HAVERI': 'Haveri',
  'HIREKERUR': 'Hirekerur',
  'HOSAKOTE': 'Hosakote',
  'HUNSUR': 'Hunsur',
  'JAMKHANDI': 'Jamkhandi',
  'KADUR': 'Kadur',
  'KALGHATGI': 'Kalghatgi',
  'KAMPLI': 'Kampli',
  'KARKALA': 'Karkala',
  'KITTUR': 'Kittur',
  'KUNDGOL': 'Kundgol',
  'MAHALAKSHMI LAYOUT': 'Mahalakshmi Layout',
  'MANGALORE': 'Mangaluru',
  'MANGALORE CITY NORTH': 'Mangaluru City North',
  'MANGALORE CITY SOUTH': 'Mangaluru City South',
  'MUDIGERE': 'Mudigere',
  'MYSORE': 'Mysuru',
  'NAGTHAN': 'Nagthan',
  'NANJANGUD': 'Nanjangud',
  'RANEBENNUR': 'Ranebennur',
  'SHIGGAON': 'Shiggaon',
  'SHIMOGA': 'Shimoga',
  'SHORAPUR': 'Shorapur',
  'SINDGI': 'Sindgi',
  'YESHVANTHAPURA': 'Yeshvanthpura',
  // MH
  'AKOLE': 'Akola',
  'AMBARNATH': 'Ambernath',
  'ARJUNI MORGAON': 'Arjuni-Morgaon',
  'BASMATH': 'Basmath',
  'DOMBIVALI': 'Dombivli',
  'KAMOTHE': 'Panvel',
  'NAGPUR SOUTH WEST': 'Nagpur South-West',
  'NANDED SOUTH': 'Nanded South',
  'PANVEL': 'Panvel',
  'SHEVGAON': 'Shevgaon',
  // TN
  'ARUPPUKOTTAI': 'Aruppukkottai',
  'BODINAYAKKANUR': 'Bodinayakanur',
  'GANDARVAKOTTAI': 'Gandharvakottai',
  'TIRUCHENDUR': 'Tiruchendur',
  'TIRUCHIRAPPALLI': 'Tiruchirappalli',
  // KL
  'AMBALAPUZHA': 'Ambalappuzha',
  'CHATHANNUR': 'Chathannoor',
  'DHARMADAM': 'Dharmadom',
  'ERANAKULAM': 'Ernakulam',
  'QUILANDY': 'Koyilandy',
  'TALIPARAMBA': 'Thalassery',
  // WB
  'BARRACKPUR': 'Barrackpore',
  'BHAGAWANGOLA': 'Bhagawangola',
  'COOCHBEHAR DAKSHIN': 'Cooch Behar Dakshin',
  'COOCHBEHAR UTTAR': 'Cooch Behar Uttar',
  // UP
  'AGRA CANTT.': 'Agra Cantt',
  'LUCKNOW CANTT.': 'Lucknow Cantt',
  'MADHAUGARH': 'Madhogarh',
  'MODI NAGAR': 'Modinagar',
  'MUZAFFAR NAGAR': 'Muzaffarnagar',
  'MUZAFFAR NAGAR CITY': 'Muzaffarnagar City',
  'MORADABAD NAGAR': 'Moradabad',
  'SHAHJAHANPUR CITY': 'Shahjahanpur',
};

function buildConstituencyMap(constFile) {
  const content = fs.readFileSync(constFile, 'utf8');
  const re = /acNo:\s*(\d+),\s*name:\s*'([^']+)'/g;
  const map = {};
  const normMap = {};
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[2].toUpperCase()] = parseInt(m[1]);
    normMap[normalize(m[2])] = parseInt(m[1]);
  }
  return { map, normMap };
}

function findCorrectAc(cName, map, normMap) {
  const upperName = cName.toUpperCase();
  const normName = normalize(cName);

  // Direct match
  if (map[upperName]) return map[upperName];
  if (normMap[normName]) return normMap[normName];

  // Alias lookup
  const alias = ALIASES[upperName];
  if (alias) {
    const aliasUpper = alias.toUpperCase();
    if (map[aliasUpper]) return map[aliasUpper];
    const aliasNorm = normalize(alias);
    if (normMap[aliasNorm]) return normMap[aliasNorm];
  }

  // Partial/contains match
  const keys = Object.keys(map);
  const found = keys.find(k => k.includes(upperName) || upperName.includes(k));
  if (found) return map[found];

  // Normalized partial match
  const normKeys = Object.keys(normMap);
  const normFound = normKeys.find(k => k.includes(normName) || normName.includes(k));
  if (normFound) return normMap[normFound];

  // Consonant skeleton match (strips vowels — great for Indian transliterations)
  const skeleton = (s) => s.replace(/[AEIOU\s]/g, '');
  const targetSkel = skeleton(normName);
  if (targetSkel.length >= 4) {
    const skelMatch = normKeys.find(k => skeleton(k) === targetSkel);
    if (skelMatch) return normMap[skelMatch];
  }

  // Levenshtein distance fuzzy match (threshold: max 2 edits for short, 3 for long names)
  const maxDist = normName.length > 10 ? 3 : 2;
  let bestMatch = null;
  let bestDist = maxDist + 1;
  for (const k of normKeys) {
    if (Math.abs(k.length - normName.length) > maxDist) continue;
    const d = levenshtein(normName, k);
    if (d < bestDist) {
      bestDist = d;
      bestMatch = k;
    }
  }
  if (bestMatch && bestDist <= maxDist) return normMap[bestMatch];

  return null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fixState(state) {
  const profilePath = path.join(dataDir, state.profiles);
  const constPath = path.join(dataDir, state.constituencies);

  if (!fs.existsSync(profilePath) || !fs.existsSync(constPath)) {
    console.log(`  SKIP: files not found`);
    return { fixed: 0, unfixed: [] };
  }

  const { map, normMap } = buildConstituencyMap(constPath);
  let content = fs.readFileSync(profilePath, 'utf8');

  // Find all profile blocks with constituencyName
  const blockRe = /(\{\s*\n\s*acNo:\s*)(\d+)(,\s*\n\s*name:\s*'[^']+',[\s\S]*?constituencyName:\s*')([^']+)(')/g;
  let fixed = 0;
  let unfixed = [];
  let alreadyCorrect = 0;

  content = content.replace(blockRe, (match, prefix, oldAc, middle, cName, suffix) => {
    const correctAc = findCorrectAc(cName, map, normMap);

    if (correctAc && correctAc !== parseInt(oldAc)) {
      fixed++;
      return prefix + correctAc + middle + cName + suffix;
    } else if (correctAc && correctAc === parseInt(oldAc)) {
      alreadyCorrect++;
    } else {
      unfixed.push(cName);
    }
    return match;
  });

  if (!reportOnly) {
    fs.writeFileSync(profilePath, content);
  }
  console.log(`  Fixed: ${fixed} | Already correct: ${alreadyCorrect} | Unfixed: ${unfixed.length}`);
  if (unfixed.length > 0) {
    unfixed.forEach(u => console.log(`    - ${u}`));
  }
  return { fixed, unfixed };
}

console.log(reportOnly ? 'REPORT MODE (no changes)\n' : 'Fixing MLA profile acNo values...\n');

let totalFixed = 0;
let totalUnfixed = 0;

states.forEach(state => {
  console.log(`[${state.code}] ${state.profiles}`);
  const { fixed, unfixed } = fixState(state);
  totalFixed += fixed;
  totalUnfixed += (unfixed || []).length;
  console.log('');
});

console.log(`\nTotal: ${totalFixed} fixed, ${totalUnfixed} unfixed`);
console.log('Done!');
