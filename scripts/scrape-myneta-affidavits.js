#!/usr/bin/env node
/**
 * scrape-myneta-affidavits.js
 *
 * Scrapes REAL election affidavit data from MyNeta.info for all winning candidates.
 * Extracts: age, party, education, assets, liabilities, criminal cases, profession, photo.
 *
 * Usage:  node scripts/scrape-myneta-affidavits.js
 *
 * Output:
 *   - apps/mobile/data/candidate-photo-map.json   (photos)
 *   - apps/mobile/data/candidate-affidavits.json   (full affidavit data)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────
const ELECTIONS = [
  { key: 'Telangana2023', stateCode: 'TS', label: 'Telangana 2023', year: 2023 },
  { key: 'AndhraPradesh2024', stateCode: 'AP', label: 'Andhra Pradesh 2024', year: 2024 },
  { key: 'Karnataka2023', stateCode: 'KA', label: 'Karnataka 2023', year: 2023 },
  { key: 'Maharashtra2024', stateCode: 'MH', label: 'Maharashtra 2024', year: 2024 },
  { key: 'TamilNadu2024', stateCode: 'TN', label: 'Tamil Nadu 2024', year: 2024 },
  { key: 'Kerala2024', stateCode: 'KL', label: 'Kerala 2024', year: 2024 },
  { key: 'WestBengal2024', stateCode: 'WB', label: 'West Bengal 2024', year: 2024 },
  { key: 'UttarPradesh2022', stateCode: 'UP', label: 'Uttar Pradesh 2022', year: 2022 },
];

// Try alternative election keys if primary fails
const ELECTION_ALIASES = {
  'TamilNadu2024': ['TamilNadu2021', 'tamilnadu2021'],
  'Kerala2024': ['Kerala2021', 'kerala2021'],
  'WestBengal2024': ['WestBengal2021', 'westbengal2021'],
  'UttarPradesh2022': ['UttarPradesh2022', 'uttarpradesh2022'],
};

const DELAY_MS = 250;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const PHOTO_OUTPUT = path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json');
const AFFIDAVIT_OUTPUT = path.resolve(__dirname, '../apps/mobile/data/candidate-affidavits.json');

// Seed data directory
const SEED_DIR = path.resolve(__dirname, '../data/seed');

// ── Helpers ────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.myneta.info',
      path: urlPath,
      headers: { 'User-Agent': UA },
      timeout: 20000,
    };
    https.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          const u = new URL(loc, 'https://www.myneta.info');
          return fetchPage(u.pathname + u.search).then(resolve, reject);
        }
      }
      if (res.statusCode !== 200) {
        resolve(null); // Return null for non-200
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

// ── Parse candidate page HTML ──────────────────────────────────────────
function parseCandidatePage(html, electionKey) {
  const result = {};

  // Name
  const nameM = html.match(/<h2[^>]*>([^<]+)\s*\((?:Winner|Lost)\)/i);
  if (nameM) result.name = nameM[1].trim();

  // Winner status
  result.isWinner = /\(Winner\)/i.test(html);

  // Constituency
  const constM = html.match(/<h5[^>]*>([^(]+)\s*\(([^)]+)\)/i);
  if (constM) {
    result.constituency = constM[1].trim();
    result.district = constM[2].trim();
  }

  // Party
  const partyM = html.match(/Party:<\/b>\s*([^<\n]+)/i);
  if (partyM) result.party = partyM[1].trim();

  // Age
  const ageM = html.match(/Age:<\/b>\s*(\d+)/i);
  if (ageM) result.age = parseInt(ageM[1]);

  // Education
  const eduM = html.match(/Category:\s*([^\n<]+)/i);
  if (eduM) result.education = eduM[1].trim();

  // Self Profession
  const selfProfM = html.match(/Self Profession:<\/b>\s*([^<\n]+)/i);
  if (selfProfM) result.selfProfession = selfProfM[1].trim();

  // Spouse Profession
  const spouseProfM = html.match(/Spouse Profession:<\/b>\s*([^<\n]+)/i);
  if (spouseProfM) result.spouseProfession = spouseProfM[1].trim();

  // Assets & Liabilities from summary block
  const assetM = html.match(/Assets:\s*<\/td><td>\s*<b>Rs&nbsp;([\d,]+)<\/b>/i);
  if (assetM) result.totalAssets = parseIndianAmount(assetM[1]);

  const liabM = html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)<\/b>/i);
  if (liabM) result.totalLiabilities = parseIndianAmount(liabM[1]);

  // Try alternate patterns for assets/liabilities  
  if (!result.totalAssets) {
    const alt = html.match(/total\s+assets[^R]*Rs[&\s;nbsp]*([\d,]+)/i);
    if (alt) result.totalAssets = parseIndianAmount(alt[1]);
  }
  if (!result.totalLiabilities) {
    const alt = html.match(/total\s+liabilit[^R]*Rs[&\s;nbsp]*([\d,]+)/i);
    if (alt) result.totalLiabilities = parseIndianAmount(alt[1]);
  }

  // Criminal cases count
  const caseBlocks = html.match(/charges related to/gi);
  result.criminalCases = caseBlocks ? caseBlocks.length : 0;

  // IPC sections
  const ipcMatches = [...html.matchAll(/IPC Section[- ]*(\d+[A-Za-z]*)/gi)];
  result.ipcSections = [...new Set(ipcMatches.map(m => m[1]))];

  // Photo URL
  const photoM = html.match(/images_candidate\/[^"'\s>]+\.jpg/i);
  if (photoM) result.photoUrl = `https://www.myneta.info/${photoM[0]}`;

  // Movable assets (self)
  const movSelfM = html.match(/id=movable_assets[\s\S]*?<tr>[\s\S]*?total[\s\S]*?<td[^>]*align=right[^>]*>([\d,]+)/i);
  // We'll parse individual movable/immovable from the table rows later if needed

  return result;
}

function parseIndianAmount(str) {
  if (!str) return 0;
  return parseInt(str.replace(/,/g, ''), 10) || 0;
}

// ── Load seed names for matching ───────────────────────────────────────
function loadSeedNames() {
  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('-constituencies.ts'));
  const allNames = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(SEED_DIR, file), 'utf-8');
    const matches = [...content.matchAll(/winnerName2023:\s*'([^']+)'/g)];
    for (const m of matches) {
      allNames[m[1]] = true;
    }
    // Also try winnerName2024 pattern
    const matches2024 = [...content.matchAll(/winnerName2024:\s*'([^']+)'/g)];
    for (const m of matches2024) {
      allNames[m[1]] = true;
    }
  }
  return Object.keys(allNames);
}

// ── Fuzzy name matching ────────────────────────────────────────────────
function normalizeForMatch(name) {
  return name
    .toLowerCase()
    .replace(/dr\.|mr\.|mrs\.|smt\.|sri\.|shri\./gi, '')
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
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
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

// ── Get winners list ───────────────────────────────────────────────────
async function getWinners(electionKey) {
  const html = await fetchPage(`/${electionKey}/index.php?action=show_winners&sort=default`);
  if (!html) return [];

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const seen = new Set();
  const winners = [];
  const skipNames = ['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities'];

  for (const m of links) {
    const id = m[1];
    const name = m[2].trim();
    if (skipNames.includes(name)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    winners.push({ id, name });
  }
  return winners;
}

// ── Map education string to our enum ───────────────────────────────────
function mapEducation(eduStr) {
  if (!eduStr) return 'others';
  const e = eduStr.toLowerCase();
  if (e.includes('doctorate') || e.includes('phd') || e.includes('ph.d')) return 'doctorate';
  if (e.includes('post graduate') || e.includes('postgraduate')) return 'post_graduate';
  if (e.includes('professional')) return 'professional';
  if (e.includes('graduate')) return 'graduate';
  if (e.includes('12th') || e.includes('higher secondary') || e.includes('hsc')) return '12th_pass';
  if (e.includes('10th') || e.includes('secondary') || e.includes('ssc') || e.includes('matric')) return '10th_pass';
  if (e.includes('8th')) return '8th_pass';
  if (e.includes('5th')) return '5th_pass';
  if (e.includes('literate')) return 'literate';
  if (e.includes('illiterate')) return 'illiterate';
  return 'others';
}

// ── Map party abbreviations ────────────────────────────────────────────
function normalizeParty(partyStr) {
  if (!partyStr) return 'IND';
  const p = partyStr.trim();
  // Common abbreviations
  if (/Indian National Congress/i.test(p)) return 'INC';
  if (/Bharatiya Janata Party/i.test(p)) return 'BJP';
  if (/Bharat Rashtra Samithi/i.test(p)) return 'BRS';
  if (/Telangana Rashtra Samithi/i.test(p)) return 'TRS';
  if (/All India Majlis/i.test(p)) return 'AIMIM';
  if (/Communist Party.*Marxist/i.test(p)) return 'CPI(M)';
  if (/Communist Party/i.test(p)) return 'CPI';
  if (/Telugu Desam/i.test(p)) return 'TDP';
  if (/YSR Congress|Yuvajana Sramika/i.test(p)) return 'YSRCP';
  if (/Janata Dal.*Secular/i.test(p)) return 'JD(S)';
  if (/Janata Dal.*United/i.test(p)) return 'JD(U)';
  if (/Shiv Sena.*Eknath/i.test(p)) return 'SHS';
  if (/Shiv Sena.*Uddhav/i.test(p)) return 'SHS(UBT)';
  if (/Shiv Sena/i.test(p)) return 'SHS';
  if (/Nationalist Congress.*Sharad/i.test(p)) return 'NCP(SP)';
  if (/Nationalist Congress/i.test(p)) return 'NCP';
  if (/Samajwadi Party/i.test(p)) return 'SP';
  if (/Bahujan Samaj/i.test(p)) return 'BSP';
  if (/Dravida Munnetra/i.test(p)) return 'DMK';
  if (/AIADMK|All India Anna/i.test(p)) return 'AIADMK';
  if (/Indian Union Muslim League/i.test(p)) return 'IUML';
  if (/Kerala Congress/i.test(p)) return 'KC';
  if (/Left Democratic Front|LDF/i.test(p)) return 'LDF';
  if (/All India Trinamool/i.test(p)) return 'TMC';
  if (/Independent/i.test(p)) return 'IND';
  // Return abbreviated form from parentheses if present
  const abbr = p.match(/\(([A-Z]+)\)/);
  if (abbr) return abbr[1];
  return p.substring(0, 10);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 MyNeta Comprehensive Scraper');
  console.log('================================\n');

  const seedNames = loadSeedNames();
  console.log(`📦 Loaded ${seedNames.length} seed candidate names\n`);

  const photoMap = {};
  const affidavitMap = {};
  let totalCandidates = 0;
  let totalPhotos = 0;
  let totalAffidavits = 0;

  for (const election of ELECTIONS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 ${election.label} (${election.stateCode})`);
    console.log(`${'═'.repeat(60)}`);

    // Try primary key first, then aliases
    let winners = await getWinners(election.key);
    
    if (winners.length === 0) {
      console.log(`   ⚠️  No winners found for ${election.key}, trying aliases...`);
      const aliases = ELECTION_ALIASES[election.key] || [];
      for (const alias of aliases) {
        winners = await getWinners(alias);
        if (winners.length > 0) {
          console.log(`   ✅ Found ${winners.length} winners using ${alias}`);
          election.key = alias; // Update key for candidate page fetches
          break;
        }
      }
      if (winners.length === 0) {
        console.log(`   ❌ No data available, skipping`);
        continue;
      }
    } else {
      console.log(`   Found ${winners.length} winners`);
    }

    totalCandidates += winners.length;

    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      process.stdout.write(`   [${i + 1}/${winners.length}] ${w.name.substring(0, 30).padEnd(30)}...`);

      try {
        const html = await fetchPage(`/${election.key}/candidate.php?candidate_id=${w.id}`);
        if (!html) {
          console.log(' ❌ fetch failed');
          await sleep(DELAY_MS);
          continue;
        }

        const data = parseCandidatePage(html, election.key);

        // Match to seed name
        const { match: seedName, score } = findBestSeedMatch(w.name, seedNames);
        const key = score >= 0.5 ? seedName : w.name;

        // Photo
        if (data.photoUrl) {
          photoMap[key] = data.photoUrl;
          totalPhotos++;
        }

        // Build affidavit record
        const affidavit = {
          candidateName: key,
          mynetaName: w.name,
          mynetaCandidateId: parseInt(w.id),
          constituency: data.constituency || '',
          district: data.district || '',
          stateCode: election.stateCode,
          party: normalizeParty(data.party),
          partyFull: data.party || '',
          electionYear: election.year,
          age: data.age || null,
          education: mapEducation(data.education),
          educationRaw: data.education || '',
          selfProfession: data.selfProfession || '',
          spouseProfession: data.spouseProfession || '',
          totalAssets: data.totalAssets || 0,
          totalLiabilities: data.totalLiabilities || 0,
          criminalCases: data.criminalCases || 0,
          ipcSections: data.ipcSections || [],
          isWinner: data.isWinner !== false,
          photoUrl: data.photoUrl || null,
          sourceUrl: `https://www.myneta.info/${election.key}/candidate.php?candidate_id=${w.id}`,
          seedNameMatch: score >= 0.5 ? seedName : null,
          seedNameScore: Math.round(score * 100),
        };

        affidavitMap[key] = affidavit;
        totalAffidavits++;

        const ageStr = data.age ? `age:${data.age}` : '';
        const assetStr = data.totalAssets ? `₹${(data.totalAssets / 10000000).toFixed(1)}Cr` : '';
        const photoStr = data.photoUrl ? '📷' : '';
        console.log(` ✅ ${ageStr} ${assetStr} ${photoStr} ${score >= 0.5 ? '' : '⚠️ no seed match'}`);

      } catch (err) {
        console.log(` ❌ ${err.message}`);
      }

      await sleep(DELAY_MS);
    }
  }

  // Write outputs
  fs.writeFileSync(PHOTO_OUTPUT, JSON.stringify(photoMap, null, 2));
  fs.writeFileSync(AFFIDAVIT_OUTPUT, JSON.stringify(affidavitMap, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ SCRAPING COMPLETE`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Total candidates: ${totalCandidates}`);
  console.log(`   Photos collected: ${totalPhotos}`);
  console.log(`   Affidavits scraped: ${totalAffidavits}`);
  console.log(`   Photo map: ${PHOTO_OUTPUT} (${Object.keys(photoMap).length} entries)`);
  console.log(`   Affidavit data: ${AFFIDAVIT_OUTPUT} (${Object.keys(affidavitMap).length} entries)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
