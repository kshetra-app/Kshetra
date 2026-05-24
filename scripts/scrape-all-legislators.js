#!/usr/bin/env node
/**
 * scrape-all-legislators.js — Comprehensive MyNeta + Sansad Scraper
 *
 * Scrapes REAL data for ALL legislators across India:
 *   - MLAs (State Assemblies) for 8 fully-supported states
 *   - Lok Sabha MPs (18th Lok Sabha, 2024)
 *   - Rajya Sabha MPs (current members)
 *
 * Data extracted per legislator:
 *   - Full name, age, DOB (where available)
 *   - Party, education, profession
 *   - Total assets, liabilities (from affidavit)
 *   - Criminal cases count + IPC sections
 *   - Photo URL (MyNeta CDN)
 *   - Constituency, district, state
 *
 * Usage:
 *   node scripts/scrape-all-legislators.js                    # All
 *   node scripts/scrape-all-legislators.js --mla              # MLAs only
 *   node scripts/scrape-all-legislators.js --mp               # MPs only
 *   node scripts/scrape-all-legislators.js --state TS,AP      # Specific states
 *   node scripts/scrape-all-legislators.js --resume           # Resume from checkpoint
 *
 * Output:
 *   scripts/output/mla-data.json          — All MLA affidavit data
 *   scripts/output/ls-mp-data.json        — Lok Sabha MP data
 *   scripts/output/rs-mp-data.json        — Rajya Sabha MP data
 *   scripts/output/photo-map-all.json     — Combined photo map
 *   scripts/output/scrape-checkpoint.json — Resume checkpoint
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const OUTPUT_DIR = path.resolve(__dirname, 'output');
const CHECKPOINT_FILE = path.join(OUTPUT_DIR, 'scrape-checkpoint.json');

const DELAY_MS = 300;       // Between requests (be polite)
const RETRY_COUNT = 2;      // Retries per failed request
const RETRY_DELAY = 2000;   // Wait before retry
const TIMEOUT_MS = 20000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// ── MyNeta Election Keys ─────────────────────────────────────────────
// These are the URL slugs on myneta.info for each election's results page.
// Format: https://www.myneta.info/{KEY}/index.php?action=show_winners

const MLA_ELECTIONS = [
  { key: 'Telangana2023',        stateCode: 'TS', stateName: 'Telangana',        year: 2023, totalSeats: 119 },
  { key: 'AndhraPradesh2024',    stateCode: 'AP', stateName: 'Andhra Pradesh',   year: 2024, totalSeats: 175 },
  { key: 'Karnataka2023',        stateCode: 'KA', stateName: 'Karnataka',        year: 2023, totalSeats: 224 },
  { key: 'Maharashtra2024',      stateCode: 'MH', stateName: 'Maharashtra',      year: 2024, totalSeats: 288 },
  { key: 'TamilNadu2021',        stateCode: 'TN', stateName: 'Tamil Nadu',       year: 2021, totalSeats: 234 },
  { key: 'Kerala2021',           stateCode: 'KL', stateName: 'Kerala',           year: 2021, totalSeats: 140 },
  { key: 'WestBengal2021',       stateCode: 'WB', stateName: 'West Bengal',      year: 2021, totalSeats: 294 },
  { key: 'UttarPradesh2022',     stateCode: 'UP', stateName: 'Uttar Pradesh',    year: 2022, totalSeats: 403 },
];

// Alternate keys to try if primary fails
const MLA_ALIASES = {
  'TamilNadu2021':     ['tamilnadu2021'],
  'Kerala2021':        ['kerala2021'],
  'WestBengal2021':    ['westbengal2021', 'West_Bengal_2021'],
  'UttarPradesh2022':  ['uttarpradesh2022', 'Uttar_Pradesh_2022'],
  'Telangana2023':     ['telangana2023'],
  'AndhraPradesh2024': ['andhrapradesh2024', 'Andhra_Pradesh_2024'],
  'Karnataka2023':     ['karnataka2023'],
  'Maharashtra2024':   ['maharashtra2024'],
};

const LS_ELECTION = {
  key: 'loksabha2024',
  aliases: ['LokSabha2024', 'lok_sabha_2024', 'ls2024'],
  year: 2024,
  totalSeats: 543,
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchPage(urlPath, hostname = 'www.myneta.info') {
  return new Promise((resolve, reject) => {
    const isHttps = hostname !== 'localhost';
    const mod = isHttps ? https : http;
    const options = {
      hostname,
      path: urlPath,
      headers: { 'User-Agent': UA },
      timeout: TIMEOUT_MS,
    };
    mod.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          try {
            const u = new URL(loc, `https://${hostname}`);
            return fetchPage(u.pathname + u.search, u.hostname).then(resolve, reject);
          } catch { /* fall through */ }
        }
      }
      if (res.statusCode !== 200) {
        resolve(null);
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('timeout'));
      });
  });
}

async function fetchWithRetry(urlPath, hostname = 'www.myneta.info') {
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const result = await fetchPage(urlPath, hostname);
      return result;
    } catch (err) {
      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_DELAY);
      } else {
        throw err;
      }
    }
  }
}

function parseIndianAmount(str) {
  if (!str) return 0;
  return parseInt(str.replace(/,/g, '').replace(/~/g, ''), 10) || 0;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSING — MyNeta Candidate Page
// ═══════════════════════════════════════════════════════════════════════

function parseCandidatePage(html) {
  const r = {};

  // Name (from h2)
  const nameM = html.match(/<h2[^>]*>\s*([^<(]+?)\s*\((?:Winner|Lost|Elected)/i);
  if (nameM) r.name = nameM[1].trim();

  // Winner status
  r.isWinner = /\(Winner\)/i.test(html) || /\(Elected\)/i.test(html);

  // Constituency + district (from h5)
  const constM = html.match(/<h5[^>]*>\s*([^(]+?)\s*\(([^)]+)\)/i);
  if (constM) {
    r.constituency = constM[1].trim();
    r.district = constM[2].trim();
  }

  // Party
  const partyM = html.match(/Party:\s*<\/b>\s*([^<\n]+)/i)
    || html.match(/Party:<\/b>\s*([^<\n]+)/i);
  if (partyM) r.party = partyM[1].trim();

  // Age
  const ageM = html.match(/Age:\s*<\/b>\s*(\d+)/i)
    || html.match(/Age:<\/b>\s*(\d+)/i);
  if (ageM) r.age = parseInt(ageM[1]);

  // DOB — MyNeta sometimes shows it
  const dobM = html.match(/Date of Birth[^:]*:\s*<\/b>\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i)
    || html.match(/DOB[^:]*:\s*<\/b>\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
  if (dobM) {
    const parts = dobM[1].split(/[-\/]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      r.dob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Gender (from salutation or explicit field)
  const genderM = html.match(/Gender[^:]*:\s*<\/b>\s*(Male|Female)/i);
  if (genderM) {
    r.gender = genderM[1].toLowerCase() === 'female' ? 'F' : 'M';
  } else {
    // Infer from name prefix
    if (r.name && /^(Smt\.|Mrs\.|Ms\.)/i.test(r.name)) r.gender = 'F';
    else r.gender = 'M'; // Default assumption — will be overridden by ECI data
  }

  // Education
  const eduM = html.match(/Category:\s*([^\n<]+)/i)
    || html.match(/Education[^:]*:\s*<\/b>\s*([^<\n]+)/i);
  if (eduM) r.education = eduM[1].trim();

  // Self Profession
  const selfProfM = html.match(/Self Profession:\s*<\/b>\s*([^<\n]+)/i)
    || html.match(/Self Profession:<\/b>\s*([^<\n]+)/i);
  if (selfProfM) r.selfProfession = selfProfM[1].trim();

  // Spouse Profession
  const spProfM = html.match(/Spouse Profession:\s*<\/b>\s*([^<\n]+)/i)
    || html.match(/Spouse Profession:<\/b>\s*([^<\n]+)/i);
  if (spProfM) r.spouseProfession = spProfM[1].trim();

  // ── Financial Data ────────────────────────────────────────────────

  // Total assets (summary row)
  const assetM = html.match(/Total Assets[^R]*Rs[\s&;nbsp]*([\d,~]+)/i)
    || html.match(/Assets:\s*<\/td><td>\s*<b>Rs&nbsp;([\d,~]+)<\/b>/i);
  if (assetM) r.totalAssets = parseIndianAmount(assetM[1]);

  // Total liabilities
  const liabM = html.match(/Total Liabilit[^R]*Rs[\s&;nbsp]*([\d,~]+)/i)
    || html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,~]+)<\/b>/i);
  if (liabM) r.totalLiabilities = parseIndianAmount(liabM[1]);

  // Movable assets — self
  const movSelfM = html.match(/Movable Assets[^:]*:\s*Self\s*[^R]*Rs[\s&;nbsp]*([\d,~]+)/i);
  if (movSelfM) r.selfMovableAssets = parseIndianAmount(movSelfM[1]);

  // Immovable assets — self
  const immSelfM = html.match(/Immovable Assets[^:]*:\s*Self\s*[^R]*Rs[\s&;nbsp]*([\d,~]+)/i);
  if (immSelfM) r.selfImmovableAssets = parseIndianAmount(immSelfM[1]);

  // Movable assets — spouse
  const movSpM = html.match(/Movable Assets[^:]*:\s*Spouse\s*[^R]*Rs[\s&;nbsp]*([\d,~]+)/i);
  if (movSpM) r.spouseMovableAssets = parseIndianAmount(movSpM[1]);

  // Immovable assets — spouse
  const immSpM = html.match(/Immovable Assets[^:]*:\s*Spouse\s*[^R]*Rs[\s&;nbsp]*([\d,~]+)/i);
  if (immSpM) r.spouseImmovableAssets = parseIndianAmount(immSpM[1]);

  // ── Criminal Cases ────────────────────────────────────────────────

  // Count from "charges related to" blocks
  const caseBlocks = html.match(/charges related to/gi);
  r.criminalCases = caseBlocks ? caseBlocks.length : 0;

  // Also try "Total Criminal Cases: X"
  const totalCasesM = html.match(/Total Criminal Cases[^:]*:\s*(\d+)/i);
  if (totalCasesM) r.criminalCases = Math.max(r.criminalCases, parseInt(totalCasesM[1]));

  // IPC sections
  const ipcMatches = [...html.matchAll(/IPC Section[- ]*(\d+[A-Za-z]*)/gi)];
  r.ipcSections = [...new Set(ipcMatches.map((m) => m[1]))];

  // Serious IPC sections (5+ year sentences)
  const SERIOUS_IPC = ['302', '307', '376', '395', '396', '420', '467', '468', '471', '489A', '489B', '489C', '489D'];
  r.seriousIpcSections = r.ipcSections.filter((s) => SERIOUS_IPC.includes(s));

  // ── Photo URL ─────────────────────────────────────────────────────
  const photoM = html.match(/images_candidate\/[^"'\s>]+\.(?:jpg|jpeg|png)/i);
  if (photoM) r.photoUrl = `https://www.myneta.info/${photoM[0]}`;

  // ── Marital status ────────────────────────────────────────────────
  if (/Spouse Profession/i.test(html) || /Spouse Name/i.test(html)) {
    r.maritalStatus = 'Married';
  }

  // ── Votes received (if on candidate page) ─────────────────────────
  const votesM = html.match(/Votes[^:]*:\s*<\/b>\s*([\d,]+)/i)
    || html.match(/Total Valid Votes[^:]*:\s*([\d,]+)/i);
  if (votesM) r.votesReceived = parseIndianAmount(votesM[1]);

  return r;
}

// ═══════════════════════════════════════════════════════════════════════
// EDUCATION MAPPING
// ═══════════════════════════════════════════════════════════════════════

function mapEducation(eduStr) {
  if (!eduStr) return 'others';
  const e = eduStr.toLowerCase();
  if (e.includes('doctorate') || e.includes('phd') || e.includes('ph.d')) return 'doctorate';
  if (e.includes('post graduate') || e.includes('postgraduate')) return 'post_graduate';
  if (e.includes('professional')) return 'professional';
  if (e.includes('graduate')) return 'graduate';
  if (e.includes('12th') || e.includes('higher secondary') || e.includes('hsc') || e.includes('intermediate')) return '12th_pass';
  if (e.includes('10th') || e.includes('secondary') || e.includes('ssc') || e.includes('matric')) return '10th_pass';
  if (e.includes('8th')) return '8th_pass';
  if (e.includes('5th') || e.includes('primary')) return '5th_pass';
  if (e.includes('literate') && !e.includes('illiterate')) return '5th_pass';
  if (e.includes('illiterate')) return 'illiterate';
  return 'others';
}

// ═══════════════════════════════════════════════════════════════════════
// PARTY NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════

function normalizeParty(partyStr) {
  if (!partyStr) return 'IND';
  const p = partyStr.trim();
  const MAP = [
    [/Indian National Congress/i, 'INC'],
    [/Bharatiya Janata Party/i, 'BJP'],
    [/Bharat Rashtra Samithi/i, 'BRS'],
    [/Telangana Rashtra Samithi/i, 'TRS'],
    [/All India Majlis/i, 'AIMIM'],
    [/Communist Party.*Marxist/i, 'CPIM'],
    [/Communist Party of India(?!\s*\()/i, 'CPI'],
    [/Telugu Desam/i, 'TDP'],
    [/YSR Congress|Yuvajana Sramika/i, 'YSRCP'],
    [/Jana Sena/i, 'JSP'],
    [/Janata Dal.*Secular/i, 'JDS'],
    [/Janata Dal.*United/i, 'JDU'],
    [/Rashtriya Janata Dal/i, 'RJD'],
    [/Shiv Sena.*Uddhav|Shiv Sena.*UBT/i, 'SHSUBT'],
    [/Shiv Sena.*Eknath|Shiv Sena(?!.*UBT|.*Uddhav)/i, 'SHS'],
    [/Nationalist Congress.*Sharad/i, 'NCPSP'],
    [/Nationalist Congress/i, 'NCP'],
    [/Samajwadi Party/i, 'SP'],
    [/Bahujan Samaj/i, 'BSP'],
    [/Dravida Munnetra/i, 'DMK'],
    [/AIADMK|All India Anna/i, 'AIADMK'],
    [/Indian Union Muslim League/i, 'IUML'],
    [/Kerala Congress.*M/i, 'KCM'],
    [/Kerala Congress/i, 'KC'],
    [/Revolutionary Socialist/i, 'RSP'],
    [/All India Trinamool/i, 'TMC'],
    [/Aam Aadmi/i, 'AAP'],
    [/Biju Janata/i, 'BJD'],
    [/Jharkhand Mukti Morcha/i, 'JMM'],
    [/Jammu.*Kashmir.*National/i, 'JKNC'],
    [/Peoples Democratic/i, 'PDP'],
    [/Shiromani Akali/i, 'SAD'],
    [/Rashtriya Lok Dal/i, 'RLD'],
    [/Apna Dal.*Sonelal/i, 'ADS'],
    [/NISHAD Party|Nirbal Indian Shoshit Hamara/i, 'NISHAD'],
    [/Suheldev Bharatiya Samaj/i, 'SBSP'],
    [/Indian Secular Front/i, 'ISF'],
    [/Pattali Makkal Katchi/i, 'PMK'],
    [/Viduthalai Chiruthaigal/i, 'VCK'],
    [/Marumalarchi Dravida/i, 'MDMK'],
    [/Kongunadu Makkal/i, 'KMDK'],
    [/Naam Tamilar/i, 'NTK'],
    [/Independent/i, 'IND'],
  ];
  for (const [regex, code] of MAP) {
    if (regex.test(p)) return code;
  }
  // Try abbreviation from parentheses
  const abbr = p.match(/\(([A-Z][A-Z()\s]+)\)/);
  if (abbr) return abbr[1].trim();
  return p.length > 15 ? p.substring(0, 10) : p;
}

// ═══════════════════════════════════════════════════════════════════════
// DOB COMPUTATION FROM AGE
// ═══════════════════════════════════════════════════════════════════════

/**
 * If MyNeta gives age but not DOB, estimate DOB as YYYY-01-01
 * where YYYY = electionYear - age.
 * Mark these as estimated in the output.
 */
function estimateDOB(age, electionYear) {
  if (!age || !electionYear) return null;
  const birthYear = electionYear - age;
  return { dob: `${birthYear}-01-01`, isEstimated: true };
}

// ═══════════════════════════════════════════════════════════════════════
// GET WINNERS LIST FROM MYNETA
// ═══════════════════════════════════════════════════════════════════════

async function getWinners(electionKey) {
  const html = await fetchWithRetry(`/${electionKey}/index.php?action=show_winners&sort=default`);
  if (!html) return [];

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const seen = new Set();
  const winners = [];
  const skipNames = new Set([
    'Candidate', 'Constituency', 'Party', 'Criminal Cases',
    'Education', 'Total Assets', 'Liabilities', 'Age',
  ]);

  for (const m of links) {
    const id = m[1];
    const name = m[2].trim();
    if (skipNames.has(name) || name.length < 2) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    winners.push({ id, name });
  }
  return winners;
}

// ═══════════════════════════════════════════════════════════════════════
// SEED NAME MATCHING
// ═══════════════════════════════════════════════════════════════════════

function loadSeedNames() {
  const SEED_DIR = path.resolve(__dirname, '../data/seed');
  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('-constituencies.ts'));
  const allNames = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(SEED_DIR, file), 'utf-8');
    // Match various winner name patterns
    const patterns = [
      /winnerName\d{4}:\s*'([^']+)'/g,
      /winner:\s*'([^']+)'/g,
      /name:\s*'([^']+)'/g,
    ];
    for (const pat of patterns) {
      const matches = [...content.matchAll(pat)];
      for (const m of matches) {
        allNames[m[1]] = true;
      }
    }
  }
  return Object.keys(allNames);
}

function normalizeForMatch(name) {
  return name
    .toLowerCase()
    .replace(/dr\.|mr\.|mrs\.|smt\.|sri\.|shri\.|adv\.|prof\./gi, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .sort()
    .join(' ');
}

function nameSimilarity(a, b) {
  const wordsA = normalizeForMatch(a).split(' ');
  const wordsB = normalizeForMatch(b).split(' ');
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function findBestSeedMatch(mynetaName, seedNames) {
  let best = null;
  let bestScore = 0;
  for (const sn of seedNames) {
    const score = nameSimilarity(mynetaName, sn);
    if (score > bestScore) {
      bestScore = score;
      best = sn;
    }
  }
  return { match: best, score: bestScore };
}

// ═══════════════════════════════════════════════════════════════════════
// CHECKPOINT / RESUME
// ═══════════════════════════════════════════════════════════════════════

function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
  } catch {}
  return { completedElections: [], mlaData: {}, lsData: {}, rsData: {}, photoMap: {} };
}

function saveCheckpoint(cp) {
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════
// SCRAPE ONE ELECTION (MLA or LS)
// ═══════════════════════════════════════════════════════════════════════

async function scrapeElection(election, aliases, seedNames, dataMap, photoMap, label) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 ${label}: ${election.stateName || 'All India'} ${election.year} (${election.stateCode || 'IN'})`);
  console.log(`${'═'.repeat(70)}`);

  // Try primary key, then aliases
  let winners = await getWinners(election.key);
  let usedKey = election.key;

  if (winners.length === 0 && aliases) {
    console.log(`   ⚠️  No winners for key "${election.key}", trying aliases...`);
    for (const alias of aliases) {
      winners = await getWinners(alias);
      if (winners.length > 0) {
        console.log(`   ✅ Found ${winners.length} winners using "${alias}"`);
        usedKey = alias;
        break;
      }
      await sleep(500);
    }
  }

  if (winners.length === 0) {
    console.log(`   ❌ No data available for this election. Skipping.`);
    return { scraped: 0, photos: 0 };
  }

  console.log(`   Found ${winners.length} winners (expected: ${election.totalSeats || '?'})`);

  let scraped = 0;
  let photos = 0;
  const stateCode = election.stateCode || '';

  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    const displayName = w.name.substring(0, 35).padEnd(35);
    process.stdout.write(`   [${String(i + 1).padStart(3)}/${winners.length}] ${displayName}`);

    try {
      const html = await fetchWithRetry(`/${usedKey}/candidate.php?candidate_id=${w.id}`);
      if (!html) {
        console.log(' ❌ fetch failed');
        await sleep(DELAY_MS);
        continue;
      }

      const data = parseCandidatePage(html);

      // Match to seed name
      const { match: seedName, score } = findBestSeedMatch(w.name, seedNames);
      const canonicalName = score >= 0.5 ? seedName : (data.name || w.name);

      // Compute DOB
      let dob = data.dob || null;
      let dobEstimated = false;
      if (!dob && data.age) {
        const est = estimateDOB(data.age, election.year);
        if (est) {
          dob = est.dob;
          dobEstimated = true;
        }
      }

      // Build record
      const record = {
        canonicalName,
        mynetaName: w.name,
        mynetaCandidateId: parseInt(w.id),
        constituency: data.constituency || '',
        district: data.district || '',
        stateCode,
        party: normalizeParty(data.party),
        partyFull: data.party || '',
        electionYear: election.year,
        electionKey: usedKey,
        age: data.age || null,
        dob,
        dobEstimated,
        gender: data.gender || 'M',
        education: mapEducation(data.education),
        educationRaw: data.education || '',
        selfProfession: data.selfProfession || '',
        spouseProfession: data.spouseProfession || '',
        totalAssets: data.totalAssets || 0,
        totalLiabilities: data.totalLiabilities || 0,
        selfMovableAssets: data.selfMovableAssets || 0,
        selfImmovableAssets: data.selfImmovableAssets || 0,
        spouseMovableAssets: data.spouseMovableAssets || 0,
        spouseImmovableAssets: data.spouseImmovableAssets || 0,
        criminalCases: data.criminalCases || 0,
        ipcSections: data.ipcSections || [],
        seriousIpcSections: data.seriousIpcSections || [],
        maritalStatus: data.maritalStatus || null,
        isWinner: data.isWinner !== false,
        votesReceived: data.votesReceived || null,
        photoUrl: data.photoUrl || null,
        sourceUrl: `https://www.myneta.info/${usedKey}/candidate.php?candidate_id=${w.id}`,
        seedNameMatch: score >= 0.5 ? seedName : null,
        seedNameScore: Math.round(score * 100),
      };

      // Store
      const key = `${stateCode}_${election.year}_${canonicalName}`;
      dataMap[key] = record;

      // Photo
      if (data.photoUrl) {
        photoMap[canonicalName] = data.photoUrl;
        photos++;
      }

      scraped++;

      // Status line
      const ageStr = data.age ? `age:${data.age}` : '      ';
      const assetStr = data.totalAssets ? `₹${(data.totalAssets / 10000000).toFixed(1)}Cr` : '        ';
      const caseStr = data.criminalCases > 0 ? `⚠️${data.criminalCases}cases` : '';
      const photoStr = data.photoUrl ? '📷' : '  ';
      const matchStr = score >= 0.5 ? '' : ' ⚠️unmatch';
      console.log(` ✅ ${ageStr} ${assetStr} ${photoStr} ${caseStr}${matchStr}`);
    } catch (err) {
      console.log(` ❌ ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  return { scraped, photos };
}

// ═══════════════════════════════════════════════════════════════════════
// RAJYA SABHA — Scrape from Sansad.in
// ═══════════════════════════════════════════════════════════════════════

async function scrapeRajyaSabhaFromSansad() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 Rajya Sabha — Current Members (from sansad.in)`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   ℹ️  Rajya Sabha members are nominated/elected by state legislatures.`);
  console.log(`   ℹ️  MyNeta doesn't have a single election page for RS.`);
  console.log(`   ℹ️  Will attempt to scrape from sansad.in member list.\n`);

  // sansad.in has a members list at /members/alphabetical
  // However, it requires JavaScript rendering — we'll try the basic HTML version
  const rsData = {};

  try {
    const html = await fetchWithRetry('/rajya-sabha/rajya-sabha-members', 'sansad.in');
    if (!html) {
      console.log('   ❌ Could not fetch Rajya Sabha member list from sansad.in');
      console.log('   ℹ️  Rajya Sabha data will need manual entry or alternative source.');
      return rsData;
    }

    // Parse member rows — sansad.in table format varies
    const rows = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)];
    console.log(`   Found ${rows.length} table rows`);

    let parsed = 0;
    for (const row of rows) {
      const cells = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length >= 4) {
        const name = cells[0][1].replace(/<[^>]+>/g, '').trim();
        const state = cells[1] ? cells[1][1].replace(/<[^>]+>/g, '').trim() : '';
        const party = cells[2] ? cells[2][1].replace(/<[^>]+>/g, '').trim() : '';

        if (name && name.length > 2 && !/^(Name|Member)/i.test(name)) {
          rsData[name] = {
            canonicalName: name,
            stateCode: '', // Will need mapping
            stateName: state,
            party: normalizeParty(party),
            partyFull: party,
            house: 'rajya_sabha',
            source: 'sansad.in',
          };
          parsed++;
        }
      }
    }
    console.log(`   Parsed ${parsed} Rajya Sabha members`);
  } catch (err) {
    console.log(`   ❌ Error scraping sansad.in: ${err.message}`);
    console.log(`   ℹ️  Rajya Sabha data will need manual entry.`);
  }

  return rsData;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const doMLA = args.length === 0 || args.includes('--mla') || args.includes('--all');
  const doMP = args.length === 0 || args.includes('--mp') || args.includes('--all');
  const doResume = args.includes('--resume');
  const stateFilter = args.find((a) => a.startsWith('--state='));
  const filterStates = stateFilter ? stateFilter.split('=')[1].split(',') : null;

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  KSHETRA — Comprehensive Legislator Data Scraper               ║');
  console.log('║  Source: MyNeta.info (ADR / Election Commission of India)       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  ensureDir(OUTPUT_DIR);

  // Load checkpoint if resuming
  const cp = doResume ? loadCheckpoint() : { completedElections: [], mlaData: {}, lsData: {}, rsData: {}, photoMap: {} };

  const seedNames = loadSeedNames();
  console.log(`📦 Loaded ${seedNames.length} seed candidate names for matching\n`);

  let totalScraped = 0;
  let totalPhotos = 0;

  // ── Phase 1: MLAs ──────────────────────────────────────────────────
  if (doMLA) {
    console.log('\n' + '▓'.repeat(70));
    console.log('▓  PHASE 1: STATE ASSEMBLY MLAs');
    console.log('▓'.repeat(70));

    const elections = filterStates
      ? MLA_ELECTIONS.filter((e) => filterStates.includes(e.stateCode))
      : MLA_ELECTIONS;

    for (const election of elections) {
      const elKey = `MLA_${election.stateCode}_${election.year}`;
      if (cp.completedElections.includes(elKey)) {
        console.log(`\n   ⏭️  Skipping ${election.stateName} ${election.year} (already completed)`);
        continue;
      }

      const aliases = MLA_ALIASES[election.key] || [];
      const { scraped, photos } = await scrapeElection(
        election, aliases, seedNames, cp.mlaData, cp.photoMap, 'MLA'
      );

      totalScraped += scraped;
      totalPhotos += photos;

      // Save checkpoint after each state
      cp.completedElections.push(elKey);
      saveCheckpoint(cp);
      console.log(`   💾 Checkpoint saved (${Object.keys(cp.mlaData).length} MLAs total)`);
    }
  }

  // ── Phase 2: Lok Sabha MPs ─────────────────────────────────────────
  if (doMP) {
    console.log('\n' + '▓'.repeat(70));
    console.log('▓  PHASE 2: LOK SABHA MPs (18th Lok Sabha, 2024)');
    console.log('▓'.repeat(70));

    const lsKey = `LS_${LS_ELECTION.year}`;
    if (!cp.completedElections.includes(lsKey)) {
      const lsElection = {
        key: LS_ELECTION.key,
        stateCode: 'IN',
        stateName: 'All India',
        year: LS_ELECTION.year,
        totalSeats: LS_ELECTION.totalSeats,
      };

      const { scraped, photos } = await scrapeElection(
        lsElection, LS_ELECTION.aliases, seedNames, cp.lsData, cp.photoMap, 'LOK SABHA'
      );

      totalScraped += scraped;
      totalPhotos += photos;
      cp.completedElections.push(lsKey);
      saveCheckpoint(cp);
    } else {
      console.log(`\n   ⏭️  Skipping Lok Sabha 2024 (already completed)`);
    }

    // ── Rajya Sabha ──────────────────────────────────────────────────
    console.log('\n' + '▓'.repeat(70));
    console.log('▓  PHASE 3: RAJYA SABHA MPs');
    console.log('▓'.repeat(70));

    const rsKey = 'RS_current';
    if (!cp.completedElections.includes(rsKey)) {
      cp.rsData = await scrapeRajyaSabhaFromSansad();
      cp.completedElections.push(rsKey);
      saveCheckpoint(cp);
    } else {
      console.log(`\n   ⏭️  Skipping Rajya Sabha (already completed)`);
    }
  }

  // ── Write final outputs ────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('📁 Writing output files...');

  const mlaOutput = path.join(OUTPUT_DIR, 'mla-data.json');
  const lsOutput = path.join(OUTPUT_DIR, 'ls-mp-data.json');
  const rsOutput = path.join(OUTPUT_DIR, 'rs-mp-data.json');
  const photoOutput = path.join(OUTPUT_DIR, 'photo-map-all.json');

  fs.writeFileSync(mlaOutput, JSON.stringify(cp.mlaData, null, 2));
  fs.writeFileSync(lsOutput, JSON.stringify(cp.lsData, null, 2));
  fs.writeFileSync(rsOutput, JSON.stringify(cp.rsData, null, 2));
  fs.writeFileSync(photoOutput, JSON.stringify(cp.photoMap, null, 2));

  // ── Summary ────────────────────────────────────────────────────────
  const mlaCount = Object.keys(cp.mlaData).length;
  const lsCount = Object.keys(cp.lsData).length;
  const rsCount = Object.keys(cp.rsData).length;
  const photoCount = Object.keys(cp.photoMap).length;

  // Per-state MLA breakdown
  const mlaByState = {};
  for (const rec of Object.values(cp.mlaData)) {
    const sc = rec.stateCode || '??';
    mlaByState[sc] = (mlaByState[sc] || 0) + 1;
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✨ SCRAPING COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n   MLAs scraped:     ${mlaCount}`);
  for (const [sc, count] of Object.entries(mlaByState).sort()) {
    console.log(`     ${sc}: ${count}`);
  }
  console.log(`   LS MPs scraped:   ${lsCount}`);
  console.log(`   RS MPs found:     ${rsCount}`);
  console.log(`   Photos collected: ${photoCount}`);
  console.log(`\n   Output files:`);
  console.log(`     ${mlaOutput}`);
  console.log(`     ${lsOutput}`);
  console.log(`     ${rsOutput}`);
  console.log(`     ${photoOutput}`);
  console.log(`     ${CHECKPOINT_FILE}`);
  console.log(`\n   Next step: Run "node scripts/generate-legislator-seeds.js" to create TypeScript seed files.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
