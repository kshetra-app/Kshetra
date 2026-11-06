const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');

// Disambiguation / custom titles for Wikipedia
const WIKI_TITLE_OVERRIDES = {
  // Telangana
  'TS_88': 'L._B._Nagar_(Assembly_constituency)',
  'TS_73': 'Vikarabad_Assembly_constituency',
  'TS_102': 'Wardhanapet_Assembly_constituency',

  // Andhra Pradesh
  'AP_20': 'Bheemunipatnam_Assembly_constituency',
  'AP_36': 'Prathipadu,_Kakinada_Assembly_constituency',
  'AP_47': 'Gannavaram,_Konaseema_Assembly_constituency',
  'AP_77': 'Gannavaram,_Krishna_Assembly_constituency',
  'AP_89': 'Ponnur_Assembly_constituency',
  'AP_93': 'Prathipadu,_Guntur_Assembly_constituency',
  'AP_96': 'Gurazala_Assembly_constituency',
  'AP_149': 'Tadpatri_Assembly_constituency',
  'AP_168': 'Satyavedu_Assembly_constituency',
};

// Helper: normalize party codes
function normalizeParty(raw) {
  if (!raw) return 'IND';
  const clean = raw.replace(/[\[\]]/g, '').trim();
  const lower = clean.toLowerCase();
  if (lower.includes('telugu desam') || lower === 'tdp') return 'TDP';
  if (lower.includes('ysr') || lower.includes('ysrcp')) return 'YSRCP';
  if (lower.includes('janasena') || lower.includes('jana sena') || lower === 'jsp') return 'JSP';
  if (lower.includes('bharat rashtra') || lower.includes('telangana rashtra') || lower === 'brs' || lower === 'trs') return 'BRS';
  if (lower.includes('congress') || lower === 'inc') return 'INC';
  if (lower.includes('bharatiya janata') || lower === 'bjp') return 'BJP';
  if (lower.includes('all india majlis') || lower === 'aimim') return 'AIMIM';
  if (lower.includes('bahujan samaj') || lower === 'bsp') return 'BSP';
  if (lower.includes('communist party of india (marxist)') || lower.includes('cpi(m)') || lower === 'cpim') return 'CPI(M)';
  if (lower.includes('communist party of india') || lower === 'cpi') return 'CPI';
  if (lower.includes('forward bloc') || lower === 'aifb') return 'AIFB';
  return clean.toUpperCase();
}

// Clean candidate name
function cleanName(raw) {
  if (!raw) return '';
  let str = raw.replace(/\{\{[^}]+\}\}/g, '').replace(/[\[\]]/g, '');
  if (str.includes('|')) {
    // If wikitext link [[Target|Label]], prefer the label
    const parts = str.split('|');
    str = parts[parts.length - 1];
  }
  return str.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchWikiPages(titles) {
  if (titles.length === 0) return {};
  const queryTitles = titles.map(t => encodeURIComponent(t)).join('|');
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${queryTitles}&prop=revisions&rvprop=content&format=json`;

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'PoligramBot/1.0 (contact@poligram.in)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json?.query?.pages || {};
          const map = {};
          for (const p of Object.values(pages)) {
            if (p.title && p.revisions?.[0]?.['*']) {
              map[p.title] = p.revisions[0]['*'];
              map[p.title.replace(/\s+/g, '_')] = p.revisions[0]['*'];
            }
          }
          resolve(map);
        } catch (err) {
          resolve({});
        }
      });
    }).on('error', () => resolve({}));
  });
}

function parseCandidatesFromWikitext(wikitext, targetYear) {
  if (!wikitext) return [];

  // Match target year election box
  const yearRegexes = [
    new RegExp(`===\\s*${targetYear}[\\s\\S]*?\\{\\{Election box begin[\\s\\S]*?\\{\\{Election box end\\}\\}`, 'i'),
    new RegExp(`\\{\\{Election box begin[\\s\\S]*?${targetYear}[\\s\\S]*?\\{\\{Election box end\\}\\}`, 'i'),
    new RegExp(`\\{\\{Election box begin[\\s\\S]*?\\{\\{Election box end\\}\\}`, 'i'),
  ];

  let box = null;
  for (const regex of yearRegexes) {
    const match = wikitext.match(regex);
    if (match) {
      box = match[0];
      break;
    }
  }

  if (!box) return [];

  const candMatches = [...box.matchAll(/\{\{Election box (?:winning )?candidate[^\}]*\}\}/gi)];
  const candidates = [];

  for (const cm of candMatches) {
    const raw = cm[0];
    const party = (raw.match(/party\s*=\s*([^|\}]+)/i) || [])[1]?.trim() || '';
    const candRaw = (raw.match(/candidate\s*=\s*([^|\}]+)/i) || [])[1]?.trim() || '';
    const votesStr = (raw.match(/votes\s*=\s*([^|\}]+)/i) || [])[1]?.replace(/,/g, '').trim() || '0';
    const pctStr = (raw.match(/percentage\s*=\s*([^|\}]+)/i) || [])[1]?.trim() || '0';

    const name = cleanName(candRaw);
    if (!name || /none of the above|nota/i.test(name) || /none of the above|nota/i.test(party)) {
      continue;
    }

    candidates.push({
      name,
      party: normalizeParty(party),
      votes: parseInt(votesStr, 10) || 0,
      voteShare: parseFloat(pctStr) || 0,
    });
  }

  return candidates;
}

async function processState(stateCode, targetYear, seedFile, podiumFile, resultsFile) {
  console.log(`\n========================================`);
  console.log(`Processing State ${stateCode} (Election ${targetYear})`);
  console.log(`========================================`);

  const seedContent = fs.readFileSync(path.join(ROOT_DIR, seedFile), 'utf8');
  const constMatches = [...seedContent.matchAll(/acNo:\s*(\d+),\s*name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?(?:,\s*district:\s*'([^']*)')?/g)];
  
  const constituencies = constMatches.map(m => {
    const acNo = parseInt(m[1], 10);
    const name = m[2];
    const override = WIKI_TITLE_OVERRIDES[`${stateCode}_${acNo}`];
    const wikiTitle = override || `${name.replace(/\s+/g, '_')}_Assembly_constituency`;
    return { acNo, name, wikiTitle };
  });

  console.log(`Found ${constituencies.length} constituencies in ${seedFile}`);

  // Load existing podium and results
  const podiumData = fs.existsSync(path.join(ROOT_DIR, podiumFile))
    ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, podiumFile), 'utf8'))
    : {};

  const resultsData = fs.existsSync(path.join(ROOT_DIR, resultsFile))
    ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, resultsFile), 'utf8'))
    : {};

  // Batch fetch wikitext from Wikipedia in chunks of 30
  const BATCH_SIZE = 30;
  const wikiPages = {};

  for (let i = 0; i < constituencies.length; i += BATCH_SIZE) {
    const chunk = constituencies.slice(i, i + BATCH_SIZE);
    const titles = chunk.map(c => c.wikiTitle);
    console.log(`Fetching Wikipedia batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(constituencies.length / BATCH_SIZE)} (${chunk.length} pages)...`);
    const pages = await fetchWikiPages(titles);
    Object.assign(wikiPages, pages);
    // Be polite to Wikipedia API
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`Received ${Object.keys(wikiPages).length} Wikipedia pages.`);

  let updatedContests = 0;
  let populatedRu2Count = 0;

  for (const item of constituencies) {
    const acKey = String(item.acNo);
    const pageText = wikiPages[item.wikiTitle] || wikiPages[item.wikiTitle.replace(/_/g, ' ')];
    const parsedCands = parseCandidatesFromWikitext(pageText, targetYear);

    // Existing podium contest for target year
    let contests = podiumData[acKey] || [];
    let contest = contests.find(c => c.year === targetYear);
    if (!contest) {
      contest = {
        year: targetYear,
        delimitationId: "4",
        constituencyName: item.name,
        winner: null,
        firstRunnerUp: null,
        secondRunnerUp: null
      };
      contests.unshift(contest);
      podiumData[acKey] = contests;
    }

    // Seed file fallback info
    const acRegex = new RegExp(`acNo:\\s*${item.acNo}[\\s\\S]*?\\}`);
    const seedBlock = (seedContent.match(acRegex) || [])[0] || '';
    const seedWinnerName = (seedBlock.match(new RegExp(`winnerName${targetYear}:\\s*'([^']+)'`)) || [])[1] || '';
    const seedWinnerParty = (seedBlock.match(new RegExp(`winner${targetYear}:\\s*'([^']+)'`)) || [])[1] || '';
    const seedWinnerVotes = parseInt((seedBlock.match(new RegExp(`winnerVotes${targetYear}:\\s*(\\d+)`)) || [])[1] || '0', 10);
    const seedRuName = (seedBlock.match(new RegExp(`runnerUpName${targetYear}:\\s*'([^']+)'`)) || [])[1] || '';
    const seedRuParty = (seedBlock.match(new RegExp(`runnerUp${targetYear}:\\s*'([^']+)'`)) || [])[1] || '';
    const seedMargin = parseInt((seedBlock.match(new RegExp(`margin${targetYear}:\\s*(\\d+)`)) || [])[1] || '0', 10);

    // Reconcile Winner
    const wCand = parsedCands[0];
    const wName = wCand?.name || contest.winner?.name || seedWinnerName;
    const wParty = wCand?.party || contest.winner?.party || seedWinnerParty;
    const wVotes = wCand?.votes || contest.winner?.votes || seedWinnerVotes;
    const wShare = wCand?.voteShare || contest.winner?.voteShare || 0;

    contest.winner = {
      ...(contest.winner || {}),
      name: wName,
      party: normalizeParty(wParty),
      votes: wVotes,
      voteShare: wShare > 0 ? wShare : contest.winner?.voteShare,
    };

    // Reconcile 1st Runner-up (Rank 2)
    const ru1Cand = parsedCands[1];
    let ru1Name = ru1Cand?.name || contest.firstRunnerUp?.name || seedRuName;
    if (!ru1Name || /candidate/i.test(ru1Name)) {
      ru1Name = seedRuName || ru1Cand?.name || 'Runner-up Candidate';
    }
    const ru1Party = ru1Cand?.party || contest.firstRunnerUp?.party || seedRuParty;
    const ru1Votes = ru1Cand?.votes || contest.firstRunnerUp?.votes || (wVotes > seedMargin ? wVotes - seedMargin : 0);
    const ru1Share = ru1Cand?.voteShare || contest.firstRunnerUp?.voteShare || 0;
    const margin1 = (wVotes > 0 && ru1Votes > 0) ? (wVotes - ru1Votes) : seedMargin;

    contest.firstRunnerUp = {
      ...(contest.firstRunnerUp || {}),
      name: ru1Name,
      party: normalizeParty(ru1Party),
      votes: ru1Votes,
      voteShare: ru1Share > 0 ? ru1Share : contest.firstRunnerUp?.voteShare,
      marginToWinner: margin1,
    };

    // Reconcile 2nd Runner-up (Rank 3)
    const ru2Cand = parsedCands[2];
    if (ru2Cand && ru2Cand.name && !/candidate/i.test(ru2Cand.name)) {
      const margin2 = wVotes > 0 && ru2Cand.votes > 0 ? (wVotes - ru2Cand.votes) : undefined;
      const marginRu1ToRu2 = ru1Votes > 0 && ru2Cand.votes > 0 ? (ru1Votes - ru2Cand.votes) : undefined;

      contest.secondRunnerUp = {
        name: ru2Cand.name,
        party: normalizeParty(ru2Cand.party),
        votes: ru2Cand.votes,
        voteShare: ru2Cand.voteShare,
        marginToWinner: margin2,
        marginToFirstRunnerUp: marginRu1ToRu2,
      };
      contest.marginWinnerToRunnerUp2 = margin2;
      contest.marginRunnerUp1ToRunnerUp2 = marginRu1ToRu2;
      populatedRu2Count++;
    }

    contest.marginWinnerToRunnerUp1 = margin1;
    const totalValid = wVotes + ru1Votes + (contest.secondRunnerUp?.votes || 0);
    if (totalValid > 0 && !contest.totalValidVotes) {
      contest.totalValidVotes = totalValid;
    }

    // Also update resultsData
    const resKey = Object.keys(resultsData).find(k => {
      const r = resultsData[k];
      return r.acNo === item.acNo && (r.electionYear === targetYear || r.year === targetYear);
    });

    if (resKey && resultsData[resKey]) {
      const r = resultsData[resKey];
      if (contest.winner) {
        r.winner = { ...(r.winner || {}), ...contest.winner };
      }
      if (contest.firstRunnerUp) {
        r.firstRunnerUp = { ...(r.firstRunnerUp || {}), ...contest.firstRunnerUp };
      }
      if (contest.secondRunnerUp) {
        r.secondRunnerUp = { ...(r.secondRunnerUp || {}), ...contest.secondRunnerUp };
      }
    }

    updatedContests++;
  }

  // Save updated podium JSON
  fs.writeFileSync(path.join(ROOT_DIR, podiumFile), JSON.stringify(podiumData, null, 2), 'utf8');
  console.log(`Saved ${podiumFile} with ${updatedContests} contests (Rank 3 populated: ${populatedRu2Count}).`);

  // Save updated results JSON
  fs.writeFileSync(path.join(ROOT_DIR, resultsFile), JSON.stringify(resultsData, null, 2), 'utf8');
  console.log(`Saved ${resultsFile}.`);
}

async function main() {
  // Update candidate photo map first with Shanampudi Saidi Reddy
  const photoMapPath = path.join(ROOT_DIR, 'apps/mobile/data/candidate-photo-map.json');
  if (fs.existsSync(photoMapPath)) {
    const photoMap = JSON.parse(fs.readFileSync(photoMapPath, 'utf8'));
    const saidiPhoto = 'https://www.myneta.info/images_candidate/Telangana2023/8d862a898684c1048c70c32201a2ee29c9898621.jpg';
    photoMap['Shanampudi Saidi Reddy'] = saidiPhoto;
    photoMap['shanampudi saidi reddy'] = saidiPhoto;
    photoMap['Shanampudi Saidireddy'] = saidiPhoto;
    photoMap['shanampudi saidireddy'] = saidiPhoto;
    photoMap['Sanampudi Saidireddy'] = saidiPhoto;
    photoMap['sanampudi saidireddy'] = saidiPhoto;
    photoMap['Saidi Reddy'] = saidiPhoto;
    photoMap['saidi reddy'] = saidiPhoto;
    fs.writeFileSync(photoMapPath, JSON.stringify(photoMap, null, 2), 'utf8');
    console.log(`✓ Added Shanampudi Saidi Reddy to candidate-photo-map.json (Total entries: ${Object.keys(photoMap).length})`);
  }

  // Process Telangana 2023
  await processState(
    'TS',
    2023,
    'data/seed/telangana-constituencies.ts',
    'data/historical/podiums/ts-podium.json',
    'data/historical/ts-podium-results.json'
  );

  // Process Andhra Pradesh 2024
  await processState(
    'AP',
    2024,
    'data/seed/andhra-pradesh-constituencies.ts',
    'data/historical/podiums/ap-podium.json',
    'data/historical/ap-podium-results.json'
  );

  console.log('\n========================================');
  console.log('All podiums and candidate details enriched successfully!');
  console.log('========================================');
}

main().catch(err => {
  console.error('Fatal reconciliation error:', err);
  process.exit(1);
});
