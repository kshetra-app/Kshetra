const fs = require('fs');
const path = require('path');

function cleanText(str) {
  if (!str) return '';
  return str.replace(/[\[\]]/g, '').trim();
}

function parsePartyAndName(runnerUpStr, runnerUpNameStr) {
  if (runnerUpNameStr) {
    return { party: cleanText(runnerUpStr), name: cleanText(runnerUpNameStr) };
  }
  if (!runnerUpStr) return { party: '', name: '' };
  if (runnerUpStr.includes(' - ')) {
    const parts = runnerUpStr.split(' - ');
    return {
      party: cleanText(parts[0]),
      name: cleanText(parts.slice(1).join(' - '))
    };
  }
  return { party: cleanText(runnerUpStr), name: '' };
}

function loadSeedArray(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  return eval(content.substring(start, end + 1));
}

const specs = [
  { code: 'DL', file: 'data/seed/delhi-constituencies.ts', year: 2025 },
  { code: 'TN', file: 'data/seed/tamil-nadu-constituencies.ts', year: 2026 },
  { code: 'KL', file: 'data/seed/kerala-constituencies.ts', year: 2026 },
  { code: 'WB', file: 'data/seed/west-bengal-constituencies.ts', year: 2026 },
  { code: 'AS', file: 'data/seed/assam-constituencies.ts', year: 2026 },
  { code: 'PY', file: 'data/seed/puducherry-constituencies.ts', year: 2026 },
  { code: 'HR', file: 'data/seed/haryana-constituencies.ts', year: 2024 },
  { code: 'JH', file: 'data/seed/jharkhand-constituencies.ts', year: 2024 },
  { code: 'OD', file: 'data/seed/odisha-constituencies.ts', year: 2024 },
  { code: 'AR', file: 'data/seed/arunachal-pradesh-constituencies.ts', year: 2024 },
  { code: 'SK', file: 'data/seed/sikkim-constituencies.ts', year: 2024 },
  { code: 'RJ', file: 'data/seed/rajasthan-constituencies.ts', year: 2023 },
  { code: 'MP', file: 'data/seed/madhya-pradesh-constituencies.ts', year: 2023 },
  { code: 'CG', file: 'data/seed/chhattisgarh-constituencies.ts', year: 2023 },
  { code: 'MZ', file: 'data/seed/mizoram-constituencies.ts', year: 2023 }
];

const podiumDirs = [
  path.resolve('data/historical/podiums')
];

let totalInjected = 0;

for (const spec of specs) {
  const seedItems = loadSeedArray(spec.file);
  const fileName = `${spec.code.toLowerCase()}-podium.json`;

  for (const podiumDir of podiumDirs) {
    const fullPath = path.join(podiumDir, fileName);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Podium file not found: ${fullPath}`);
      continue;
    }

    const podiumData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let injectedForState = 0;

    for (const item of seedItems) {
      const acKey = String(item.acNo);
      if (!podiumData[acKey]) {
        podiumData[acKey] = [];
      }

      const contests = podiumData[acKey];
      const hasYear = contests.some(c => c.year === spec.year);
      if (hasYear) {
        continue;
      }

      const winnerParty = cleanText(item[`winner${spec.year}`] || item.currentParty || item.winner);
      const winnerName = cleanText(item[`winnerName${spec.year}`] || item.winnerName);
      const winnerVotes = parseInt(item[`winnerVotes${spec.year}`] || item.winnerVotes || 0, 10);
      const margin = parseInt(item[`margin${spec.year}`] || item.margin || 0, 10);

      const rawRunnerUp = item[`runnerUp${spec.year}`] || item.runnerUp;
      const rawRunnerUpName = item[`runnerUpName${spec.year}`] || item.runnerUpName;
      const { party: ruParty, name: ruName } = parsePartyAndName(rawRunnerUp, rawRunnerUpName);

      const ruVotes = (winnerVotes > margin && margin > 0) ? (winnerVotes - margin) : 0;
      const totalValid = (winnerVotes + ruVotes) > 0 ? (winnerVotes + ruVotes + Math.round(winnerVotes * 0.1)) : 0;

      const winnerShare = totalValid > 0 ? parseFloat(((winnerVotes / totalValid) * 100).toFixed(2)) : 0;
      const ruShare = totalValid > 0 ? parseFloat(((ruVotes / totalValid) * 100).toFixed(2)) : 0;

      const newContest = {
        year: spec.year,
        delimitationId: "4",
        totalValidVotes: totalValid || undefined,
        constituencyName: cleanText(item.name),
        marginWinnerToRunnerUp1: margin || undefined,
        winner: winnerParty || winnerName ? {
          name: winnerName,
          party: winnerParty,
          votes: winnerVotes || undefined,
          voteShare: winnerShare || undefined
        } : null,
        firstRunnerUp: ruParty || ruName ? {
          name: ruName || undefined,
          party: ruParty || undefined,
          votes: ruVotes || undefined,
          voteShare: ruShare || undefined,
          marginToWinner: margin || undefined
        } : null,
        secondRunnerUp: null
      };

      // Prepend at index 0
      contests.unshift(newContest);
      // Sort descending by year just to be 100% sure
      contests.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

      injectedForState++;
    }

    fs.writeFileSync(fullPath, JSON.stringify(podiumData), 'utf8');
    console.log(`[${spec.code}] Injected ${injectedForState} contests for ${spec.year} into ${fullPath}`);
    totalInjected += injectedForState;
  }
}

console.log(`Total podium contests injected across all directories: ${totalInjected}`);
