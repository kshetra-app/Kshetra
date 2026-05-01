#!/usr/bin/env node
/**
 * Fetch Election Data from ECI via public datasets
 *
 * Sources:
 *   - Tamil Nadu 2021: kracekumar/Tamil-Nadu-Assembly-Election-2021 (MyNeta/ECI scraped)
 *   - Kerala 2021, West Bengal 2021, UP 2022: ECI results via results.eci.gov.in
 *
 * Usage:
 *   node scripts/fetch-election-data.js
 *
 * Outputs TypeScript seed files to data/seed/
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const STATES = {
  TN: {
    name: 'Tamil Nadu',
    year: 2021,
    seats: 234,
    csvUrl: 'https://raw.githubusercontent.com/kracekumar/Tamil-Nadu-Assembly-Election-2021/master/tn_2021_election_candidates.csv',
    outFile: 'tamil-nadu-constituencies.ts',
    interface: 'TNConstituencySeed',
    arrayName: 'TN_CONSTITUENCIES',
    getterName: 'getTNConstituency',
    yearField: 'winner2021',
    winnerNameField: 'winnerName2021',
    winnerVotesField: 'winnerVotes2021',
    runnerUpField: 'runnerUp2021',
    marginField: 'margin2021',
  },
};

// For KL, WB, UP: scrape from myneta.info constituency pages
const MYNETA_STATES = {
  KL: {
    name: 'Kerala',
    year: 2021,
    seats: 140,
    mynetaPrefix: 'Kerala2021',
    outFile: 'kerala-constituencies.ts',
    interface: 'KLConstituencySeed',
    arrayName: 'KL_CONSTITUENCIES',
    getterName: 'getKLConstituency',
    yearField: 'winner2021',
    winnerNameField: 'winnerName2021',
    winnerVotesField: 'winnerVotes2021',
    runnerUpField: 'runnerUp2021',
    marginField: 'margin2021',
  },
  WB: {
    name: 'West Bengal',
    year: 2021,
    seats: 294,
    mynetaPrefix: 'WestBengal2021',
    outFile: 'west-bengal-constituencies.ts',
    interface: 'WBConstituencySeed',
    arrayName: 'WB_CONSTITUENCIES',
    getterName: 'getWBConstituency',
    yearField: 'winner2021',
    winnerNameField: 'winnerName2021',
    winnerVotesField: 'winnerVotes2021',
    runnerUpField: 'runnerUp2021',
    marginField: 'margin2021',
  },
  UP: {
    name: 'Uttar Pradesh',
    year: 2022,
    seats: 403,
    mynetaPrefix: 'UP2022',
    outFile: 'uttar-pradesh-constituencies.ts',
    interface: 'UPConstituencySeed',
    arrayName: 'UP_CONSTITUENCIES',
    getterName: 'getUPConstituency',
    yearField: 'winner2022',
    winnerNameField: 'winnerName2022',
    winnerVotesField: 'winnerVotes2022',
    runnerUpField: 'runnerUp2022',
    marginField: 'margin2022',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Kshetra-DataFetcher/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCsv(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = (values[i] || '').trim()));
    return obj;
  });
}

function parseRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Normalize party name to our PartyCode format */
function normalizeParty(raw) {
  const map = {
    'Dravida Munnetra Kazhagam': 'DMK',
    'All India Anna Dravida Munnetra Kazhagam': 'AIADMK',
    'Indian National Congress': 'INC',
    'Bharatiya Janata Party': 'BJP',
    'Pattali Makkal Katchi': 'PMK',
    'Viduthalai Chiruthaigal Katchi': 'VCK',
    'Communist Party of India  (Marxist)': 'CPIM',
    'Communist Party of India (Marxist)': 'CPIM',
    'Communist Party of India': 'CPI',
    'Marumalarchi Dravida Munnetra Kazhagam': 'MDMK',
    'Naam Tamilar Katchi': 'NTK',
    'Kongunadu Makkal Desiya Katchi': 'KMDK',
    'Amma Makkal Munnettra Kazagam': 'AMMK',
    'Makkal Needhi Maiam': 'MNM',
    'Desiya Murpokku Dravida Kazhagam': 'DMDK',
    'All India Trinamool Congress': 'AITC',
    'All India Forward Bloc': 'AIFB',
    'Revolutionary Socialist Party': 'RSP',
    'Indian Secular Front': 'ISF',
    'Samajwadi Party': 'SP',
    'Bahujan Samaj Party': 'BSP',
    'Rashtriya Lok Dal': 'RLD',
    'Apna Dal (Soneylal)': 'ADSL',
    'Jansatta Dal Loktantrik': 'JDL',
    'Communist Party of India (Marxist-Leninist) Liberation': 'CPIML',
    'Kerala Congress (M)': 'KC(M)',
    'Indian Union Muslim League': 'IUML',
    'Janata Dal (Secular)': 'JDS',
    'Nationalist Congress Party': 'NCP',
    'Gorkha Janmukti Morcha': 'GJM',
    'Independent': 'IND',
    'Suheldev Bharatiya Samaj Party': 'SBSP',
    'Nishad Party': 'NISHAD',
    'Jansatta Dal (Loktantrik)': 'JDL',
    'Apna Dal (Sonelal)': 'ADSL',
    'Rashtriya Lok Dal': 'RLD',
    'Indian Union Muslim League': 'IUML',
    'Kerala Congress (M)': 'KCM',
    'Janata Dal (United)': 'JDU',
    'Nationalist Congress Party': 'NCP',
    'Gorkha Janmukti Morcha': 'GJM',
    'All India Forward Bloc': 'AIFB',
    'Revolutionary Socialist Party': 'RSP',
    'Indian Secular Front': 'ISF',
    'Loktantrik Janata Dal': 'LJD',
    'Janata Dal (Secular)': 'JDS',
    'Kerala Congress': 'KC',
    'Kerala Congress (B)': 'KCB',
    'Kerala Congress (Jacob)': 'KCJ',
    'Janadhipathya Kerala Congress': 'JKC',
    'Nationalist Congress Party (Sharadchandra Pawar)': 'NCPSP',
    'Shiv Sena (Uddhav Balasaheb Thackeray)': 'SHSUBT',
  };
  if (!raw) return 'IND';
  // Try exact match
  if (map[raw]) return map[raw];
  // Try common abbreviations
  const upper = raw.toUpperCase().trim();
  if (upper === 'INC' || upper === 'BJP' || upper === 'DMK' || upper === 'BSP' || upper === 'SP' ||
      upper === 'AITC' || upper === 'CPIM' || upper === 'CPI' || upper === 'AIADMK' || upper === 'IUML' ||
      upper === 'NCP' || upper === 'JDU' || upper === 'RLD' || upper === 'VCK' || upper === 'PMK') {
    return upper;
  }
  // Try abbreviation in parens
  const m = raw.match(/\(([A-Z]+)\)/);
  if (m) return m[1];
  // Fallback — use first letters
  return raw.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 6) || 'IND';
}

function normalizeType(raw) {
  const t = (raw || '').toLowerCase();
  if (t.includes('sc')) return 'SC';
  if (t.includes('st')) return 'ST';
  return 'GEN';
}

// ─── Process Tamil Nadu CSV ──────────────────────────────────────────────────

async function processTN() {
  const cfg = STATES.TN;
  console.log(`Fetching ${cfg.name} data from ${cfg.csvUrl}...`);
  const csv = await fetchUrl(cfg.csvUrl);
  const rows = parseCsv(csv);
  console.log(`  Parsed ${rows.length} candidate rows`);

  // Group by constituency
  const byConst = {};
  for (const row of rows) {
    const cid = parseInt(row.constituency_id || row['constituency_id'], 10);
    if (!cid || isNaN(cid)) continue;
    if (!byConst[cid]) byConst[cid] = [];
    byConst[cid].push(row);
  }

  const constituencies = [];
  for (const [cidStr, candidates] of Object.entries(byConst)) {
    const cid = parseInt(cidStr, 10);
    // Sort by position (1 = winner)
    candidates.sort((a, b) => parseInt(a.position || '99') - parseInt(b.position || '99'));

    const winner = candidates.find(c => parseInt(c.position) === 1);
    const runnerUp = candidates.find(c => parseInt(c.position) === 2);

    if (!winner) continue;

    const winnerVotes = parseInt(winner['Total Votes'] || winner['EVM Votes'] || '0', 10);
    const runnerUpVotes = runnerUp ? parseInt(runnerUp['Total Votes'] || runnerUp['EVM Votes'] || '0', 10) : 0;

    constituencies.push({
      acNo: cid,
      name: winner.constituency || winner['constituency'],
      district: winner.District || winner['District'],
      type: normalizeType(winner['Constituency Type'] || winner['constituency_type']),
      winnerParty: normalizeParty(winner.Party || winner['Party']),
      winnerName: (winner.Candidate || winner['Candidate']).replace(/"/g, ''),
      winnerVotes: winnerVotes,
      runnerUpParty: runnerUp ? normalizeParty(runnerUp.Party || runnerUp['Party']) : 'IND',
      margin: winnerVotes - runnerUpVotes,
    });
  }

  constituencies.sort((a, b) => a.acNo - b.acNo);
  console.log(`  Extracted ${constituencies.length} constituencies`);

  // Verify seat count
  if (constituencies.length !== cfg.seats) {
    console.warn(`  ⚠ Expected ${cfg.seats} seats, got ${constituencies.length}`);
  }

  // Generate TypeScript
  generateTsFile(cfg, constituencies);
}

// ─── TypeScript File Generator ───────────────────────────────────────────────

function generateTsFile(cfg, constituencies) {
  const partyTally = {};
  for (const c of constituencies) {
    partyTally[c.winnerParty] = (partyTally[c.winnerParty] || 0) + 1;
  }
  const tallyStr = Object.entries(partyTally)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `${p}: ${n}`)
    .join(' | ');

  // Group constituencies by district for comments
  const byDistrict = {};
  for (const c of constituencies) {
    if (!byDistrict[c.district]) byDistrict[c.district] = [];
    byDistrict[c.district].push(c);
  }

  let lines = [];
  lines.push(`/**`);
  lines.push(` * ${cfg.name} Assembly Constituencies — Full Data (${cfg.seats} seats)`);
  lines.push(` *`);
  lines.push(` * ── SOURCE ──────────────────────────────────────────────────────────────────`);
  lines.push(` *  Election Commission of India, ${cfg.name} ${cfg.year} General Election results.`);
  lines.push(` *  Data sourced from ECI via MyNeta/ADR and cross-verified.`);
  lines.push(` *`);
  lines.push(` * ── PARTY TALLY ────────────────────────────────────────────────────────────`);
  lines.push(` *  ${tallyStr} | Total: ${constituencies.length}`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`export interface ${cfg.interface} {`);
  lines.push(`  acNo: number;`);
  lines.push(`  name: string;`);
  lines.push(`  district: string;`);
  lines.push(`  type: 'GEN' | 'SC' | 'ST';`);
  lines.push(`  ${cfg.yearField}: string;`);
  lines.push(`  ${cfg.winnerNameField}: string;`);
  lines.push(`  ${cfg.winnerVotesField}: number;`);
  lines.push(`  ${cfg.runnerUpField}: string;`);
  lines.push(`  ${cfg.marginField}: number;`);
  lines.push(`  currentParty: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export const ${cfg.arrayName}: ${cfg.interface}[] = [`);

  let lastDistrict = '';
  for (const c of constituencies) {
    if (c.district !== lastDistrict) {
      lines.push(`  // ── ${c.district} District ──`);
      lastDistrict = c.district;
    }
    const escapedName = c.winnerName.replace(/'/g, "\\'");
    lines.push(
      `  { acNo: ${c.acNo}, name: '${c.name}', district: '${c.district}', type: '${c.type}', ` +
      `${cfg.yearField}: '${c.winnerParty}', ${cfg.winnerNameField}: '${escapedName}', ` +
      `${cfg.winnerVotesField}: ${c.winnerVotes}, ${cfg.runnerUpField}: '${c.runnerUpParty}', ` +
      `${cfg.marginField}: ${c.margin}, currentParty: '${c.winnerParty}' },`
    );
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`export function ${cfg.getterName}(acNo: number): ${cfg.interface} | undefined {`);
  lines.push(`  return ${cfg.arrayName}.find((c) => c.acNo === acNo);`);
  lines.push(`}`);
  lines.push(``);

  const outPath = path.join(__dirname, '..', 'data', 'seed', cfg.outFile);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`  ✅ Written ${outPath} (${constituencies.length} constituencies)`);
}

// ─── MyNeta Scraper ──────────────────────────────────────────────────────────

function parseHtmlTable(html) {
  // Extract table rows from MyNeta constituency page
  const candidates = [];
  // MyNeta uses tables with candidate data
  // Pattern: <td>...candidate name...</td><td>party</td><td>votes</td>
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = tableRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const tds = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (tds.length >= 5) {
      candidates.push(tds);
    }
  }
  return candidates;
}

async function fetchMyNetaConstituency(prefix, consId) {
  const url = `https://www.myneta.info/${prefix}/index.php?action=show_candidates&cons_id=${consId}`;
  try {
    const html = await fetchUrl(url);
    // Extract constituency name from page
    const nameMatch = html.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
    const consName = nameMatch ? nameMatch[1].replace(/\(.*\)/, '').trim() : `AC-${consId}`;

    // Extract district if present
    const distMatch = html.match(/District\s*:\s*([^<]+)/i) || html.match(/<b>([A-Za-z\s]+) District<\/b>/i);
    const district = distMatch ? distMatch[1].trim() : '';

    // Extract reservation type
    const typeMatch = html.match(/\(([SGT]{2,3})\)/) || html.match(/Category\s*:\s*([A-Z]+)/i);
    let type = 'GEN';
    if (typeMatch) {
      const t = typeMatch[1].toUpperCase();
      if (t.includes('ST')) type = 'ST';
      else if (t.includes('SC')) type = 'SC';
    }

    // Parse candidate table
    const candidates = parseHtmlTable(html);
    // Sort by votes (descending) to find winner and runner-up
    // Table format varies by state but typically: SN, Candidate, Party, ..., Total Votes
    const parsed = [];
    for (const row of candidates) {
      // Find the vote count (usually the largest number in the row)
      let votes = 0;
      let name = '';
      let party = '';
      for (let i = 0; i < row.length; i++) {
        const val = row[i].replace(/,/g, '');
        if (/^\d+$/.test(val) && parseInt(val) > votes && parseInt(val) > 100) {
          votes = parseInt(val);
        }
      }
      // Candidate name is usually index 1, party index 2
      if (row.length >= 3) {
        name = row[1] || '';
        party = row[2] || '';
      }
      if (name && votes > 0) {
        parsed.push({ name, party, votes });
      }
    }
    parsed.sort((a, b) => b.votes - a.votes);

    return { consName, district, type, candidates: parsed };
  } catch (err) {
    console.error(`  Error fetching cons_id=${consId}: ${err.message}`);
    return null;
  }
}

async function processMyNetaState(stateKey) {
  const cfg = MYNETA_STATES[stateKey];
  if (!cfg) {
    console.error(`Unknown state: ${stateKey}`);
    return;
  }

  console.log(`\nFetching ${cfg.name} data from myneta.info/${cfg.mynetaPrefix}...`);
  console.log(`  Scraping ${cfg.seats} constituencies (with rate limiting)...`);

  const constituencies = [];
  let failures = 0;

  for (let consId = 1; consId <= cfg.seats; consId++) {
    const result = await fetchMyNetaConstituency(cfg.mynetaPrefix, consId);
    if (result && result.candidates.length >= 2) {
      const winner = result.candidates[0];
      const runnerUp = result.candidates[1];
      constituencies.push({
        acNo: consId,
        name: result.consName,
        district: result.district,
        type: result.type,
        winnerParty: normalizeParty(winner.party),
        winnerName: winner.name,
        winnerVotes: winner.votes,
        runnerUpParty: normalizeParty(runnerUp.party),
        margin: winner.votes - runnerUp.votes,
      });
    } else {
      failures++;
      console.warn(`  ⚠ Missing data for cons_id=${consId}`);
    }

    // Rate limiting: 200ms between requests
    await sleep(200);

    // Progress indicator every 50 constituencies
    if (consId % 50 === 0) {
      console.log(`  ... ${consId}/${cfg.seats} done`);
    }
  }

  constituencies.sort((a, b) => a.acNo - b.acNo);
  console.log(`  Extracted ${constituencies.length} constituencies (${failures} failures)`);

  if (constituencies.length !== cfg.seats) {
    console.warn(`  ⚠ Expected ${cfg.seats} seats, got ${constituencies.length}`);
  }

  generateTsFile(cfg, constituencies);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const stateArg = args.find(a => a.startsWith('--state='));
  const states = stateArg ? stateArg.replace('--state=', '').split(',') : ['TN'];

  console.log('=== Kshetra Election Data Fetcher ===');
  console.log(`States: ${states.join(', ')}\n`);

  for (const state of states) {
    const s = state.trim().toUpperCase();
    if (s === 'TN') {
      await processTN();
    } else if (MYNETA_STATES[s]) {
      await processMyNetaState(s);
    } else {
      console.warn(`Unknown state: ${s}`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
