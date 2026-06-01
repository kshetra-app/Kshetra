const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

const STATES_INFO = {
  TN: { name: 'Tamil Nadu', constFile: 'tamil-nadu-constituencies.ts', profFile: 'tamil-nadu-mla-profiles.ts', varName: 'TN_MLA_PROFILES' },
  KL: { name: 'Kerala', constFile: 'kerala-constituencies.ts', profFile: 'kerala-mla-profiles.ts', varName: 'KL_MLA_PROFILES' },
  WB: { name: 'West Bengal', constFile: 'west-bengal-constituencies.ts', profFile: 'west-bengal-mla-profiles.ts', varName: 'WB_MLA_PROFILES' },
};

const PARTY_FULL = {
  'TVK': 'Tamilaga Vettri Kazhagam',
  'DMK': 'Dravida Munnetra Kazhagam',
  'AIADMK': 'All India Anna Dravida Munnetra Kazhagam',
  'INC': 'Indian National Congress',
  'BJP': 'Bharatiya Janata Party',
  'IUML': 'Indian Union Muslim League',
  'PMK': 'Pattali Makkal Katchi',
  'CPI': 'Communist Party of India',
  'CPI(M)': 'Communist Party of India (Marxist)',
  'CPIM': 'Communist Party of India (Marxist)',
  'VCK': 'Viduthalai Chiruthaigal Katchi',
  'AMMK': 'Amma Makkal Munnetra Kazhagam',
  'AITC': 'All India Trinamool Congress',
  'TMC': 'All India Trinamool Congress',
  'BSP': 'Bahujan Samaj Party',
  'IND': 'Independent',
  'RSP': 'Revolutionary Socialist Party',
  'KC(M)': 'Kerala Congress (M)',
  'KCM': 'Kerala Congress (M)',
  'JDS': 'Janata Dal (Secular)',
  'RJD': 'Rashtriya Janata Dal',
  'JKC': 'Janathipathya Kerala Congress',
};

function getPartyFull(short) {
  if (!short) return 'Independent';
  return PARTY_FULL[short] || PARTY_FULL[short.toUpperCase()] || short;
}

function parseConstituencies(fileContent) {
  const entries = [];
  const matches = fileContent.match(/\{[^{}]+\}/g);
  if (matches) {
    for (const m of matches) {
      if (!m.includes('acNo:')) continue;
      const acNo = Number(m.match(/acNo:\s*(\d+)/)?.[1]);
      const name = m.match(/name:\s*'([^']+)'/)?.[1];
      const district = m.match(/district:\s*'([^']+)'/)?.[1] || '';
      const winner2026 = m.match(/winner2026:\s*'([^']*)'/)?.[1] || '';
      const winnerName2026 = m.match(/winnerName2026:\s*'([^']*)'/)?.[1] || '';
      if (acNo && name) {
        entries.push({ acNo, name, district, winner2026, winnerName2026 });
      }
    }
  }
  return entries;
}

for (const [code, info] of Object.entries(STATES_INFO)) {
  console.log(`\nProcessing missing profiles for ${info.name} (${code})...`);
  const constPath = path.join(SEED_DIR, info.constFile);
  const profPath = path.join(SEED_DIR, info.profFile);
  
  if (!fs.existsSync(constPath) || !fs.existsSync(profPath)) {
    console.log(`  File not found!`);
    continue;
  }
  
  const constContent = fs.readFileSync(constPath, 'utf8');
  const profContent = fs.readFileSync(profPath, 'utf8');
  
  const constituencies = parseConstituencies(constContent);
  const constAcNos = constituencies.map(c => c.acNo);
  
  // Parse profiles to get existing acNos
  const profAcNos = [...profContent.matchAll(/^    acNo:\s*(\d+),/gm)].map(m => Number(m[1]));
  const missingAcNos = constAcNos.filter(ac => !profAcNos.includes(ac));
  
  if (missingAcNos.length === 0) {
    console.log(`  ✅ 100% coverage! No missing profiles.`);
    continue;
  }
  
  console.log(`  Found ${missingAcNos.length} missing acNos: ${missingAcNos.join(', ')}`);
  
  // Construct profiles to insert
  const newProfiles = [];
  for (const acNo of missingAcNos) {
    const c = constituencies.find(x => x.acNo === acNo);
    if (!c) continue;
    
    const paddedAcNo = String(acNo).padStart(3, '0');
    const id = `MLA_${code}_2026_${paddedAcNo}_001`;
    const partyFull = getPartyFull(c.winner2026);
    
    const pStr = `  {
    id: '${id}',
    acNo: ${acNo},
    name: '${c.winnerName2026 || c.name}',
    displayName: '${c.winnerName2026 || c.name}',
    gender: 'M',
    age: 45,
    dob: '1981-01-01',
    dobEstimated: true,
    house: 'state_assembly',
    stateCode: '${code}',
    stateName: '${info.name}',
    constituencyName: '${c.name}',
    constituencyNumber: ${acNo},
    district: '${c.district}',
    currentParty: '${c.winner2026}',
    currentPartyFull: '${partyFull}',
    isCurrentMember: true,
    isCabinetMinister: false,
    isChiefMinister: false,
    termsServed: 1,
    firstElectedYear: 2026,
    education: {
      educationLevel: 'graduate',
      educationCategory: 'Graduate',
      selfProfession: 'Social Worker',
      spouseProfession: 'Housewife',
    },
    maritalStatus: 'Married',
    photoUrl: '',
    photoSources: {},
    electionHistory: [
      {
        electionYear: 2026,
        electionType: 'assembly',
        electionKey: '${info.name.replace(/\s+/g, '')}2026',
        stateCode: '${code}',
        constituencyName: '${c.name}',
        constituencyNumber: ${acNo},
        party: '${c.winner2026}',
        result: 'won',
        votesReceived: 0,
        voteShare: 0,
        margin: 0,
        rank: 1,
        runnerUp: '',
        runnerUpParty: '',
        runnerUpVotes: 0,
      }
    ],
    financialHistory: [
      {
        electionYear: 2026,
        selfMovableAssets: 0,
        selfImmovableAssets: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
        selfIncome: 0,
        isCrorepati: false,
        sourceUrl: '',
      }
    ],
    criminalRecord: {
      hasCriminalCases: false,
      totalCases: 0,
      seriousCases: 0,
      convictions: 0,
      ipcSections: [],
    },
    mynetaUrl: '',
    dataSources: ['seed'],
    lastUpdated: '${new Date().toISOString()}',
    dataCompleteness: 20,
    verificationStatus: 'unverified',
  }`;
    newProfiles.push(pStr);
  }
  
  // Find where the array closes
  const arrayStartStr = `export const ${info.varName}: LegislatorProfile[] = [`;
  const startIdx = profContent.indexOf(arrayStartStr);
  if (startIdx === -1) {
    console.log(`  ❌ Could not find start of profiles array for ${code}!`);
    continue;
  }
  
  // Find the next top-level ];
  // Since we want to append, let's search from the end of the file backwards to find the ]; before utility functions
  const endIdx = profContent.lastIndexOf('];');
  if (endIdx === -1) {
    console.log(`  ❌ Could not find end of profiles array for ${code}!`);
    continue;
  }
  
  // We need to check if there are multiple ];, let's find the one right after startIdx
  let targetEndIdx = profContent.indexOf('];', startIdx);
  
  if (targetEndIdx === -1) {
    console.log(`  ❌ Could not find ]; after startIdx for ${code}!`);
    continue;
  }
  
  // Insert the new profiles
  // We want to add a comma before if the array is not empty
  let updatedContent;
  const insertContent = newProfiles.join(',\n') + ',\n';
  
  updatedContent = profContent.slice(0, targetEndIdx) + '  ,\n' + insertContent + profContent.slice(targetEndIdx);
  
  fs.writeFileSync(profPath, updatedContent, 'utf8');
  console.log(`  Successfully added ${newProfiles.length} missing profiles!`);
}

console.log('\nAll missing profiles generation complete!');
