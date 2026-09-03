import { readFileSync, writeFileSync } from 'node:fs';

const HINDI_EXTRA = {
  churah: 'चुराह',
  bharmour: 'भरमौर',
  chamba: 'चम्बा',
  dalhousie: 'डलहौजी',
  bhattiyat: 'भटियात',
  nurpur: 'नूरपुर',
  indora: 'इन्दौरा',
  fatehpur: 'फतेहपुर',
  jawali: 'जवाली',
  dehra: 'देहरा',
  jaswanpragpur: 'जसवां-परागपुर',
  jawalamukhi: 'ज्वालामुखी',
  jaisinghpur: 'जयसिंहपुर',
  sullah: 'सुलह',
  nagrota: 'नगरोटा',
  kangra: 'कांगड़ा',
  shahpur: 'शाहपुर',
  dharamshala: 'धर्मशाला',
  palampur: 'पालमपुर',
  baijnath: 'बैजनाथ',
  lahaulandspiti: 'लाहौल और स्पीति',
  lahaulspiti: 'लाहौल और स्पीति',
  manali: 'मनाली',
  kullu: 'कुल्लू',
  banjar: 'बंजार',
  anni: 'आनी',
  karsog: 'करसोग',
  sundernagar: 'सुन्दरनगर',
  nachan: 'नाचन',
  seraj: 'सराज',
  darang: 'दरंग',
  jogindernagar: 'जोगिन्दरनगर',
  dharampur: 'धरमपुर',
  mandi: 'मण्डी',
  balh: 'बल्ह',
  sarkaghat: 'सरकाघाट',
  bhoranj: 'भोरंज',
  sujanpur: 'सुजानपुर',
  hamirpur: 'हमीरपुर',
  barsar: 'बड़सर',
  nadaun: 'नादौन',
  chintpurni: 'चिन्तपूर्णी',
  gagret: 'गगरेट',
  haroli: 'हरोली',
  una: 'ऊना',
  kutlehar: 'कुटलैहड़',
  jhanduta: 'झंडूता',
  ghumarwin: 'घुमारवीं',
  bilaspur: 'बिलासपुर',
  srinainadeviji: 'श्री नैना देवीजी',
  arki: 'अर्की',
  nalagarh: 'नालागढ़',
  doon: 'दून',
  solan: 'सोलन',
  kasauli: 'कसौली',
  pachhad: 'पच्छाद',
  nahan: 'नाहन',
  srirenukaji: 'श्री रेणुकाजी',
  paontasahib: 'पांवटा साहिब',
  shillai: 'शिलाई',
  chopal: 'चौपाल',
  theog: 'ठियोग',
  kasumpti: 'कसुम्पटी',
  shimla: 'शिमला',
  shimlarural: 'शिमला ग्रामीण',
  jubbalkotkhai: 'जुब्बल-कोटखाई',
  rampur: 'रामपुर',
  rohru: 'रोहड़ू',
  kinnaur: 'किन्नौर',
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const wiki = readFileSync('scripts/hp-2022-wiki.txt', 'utf8');
const rows = wiki.split('|-');

const seats = [];
let currentDistrict = '';

for (const r of rows) {
  const lines = r.split('\n').map(l => l.trim()).filter(Boolean);
  
  // District match
  const distMatch = r.match(/!\s*(?:rowspan="\d+"\s*\|)?\s*\[\[([^\]]+)\]\]/i);
  if (distMatch && !distMatch[1].includes('List of') && distMatch[1].toLowerCase().includes('district')) {
    const rawDist = distMatch[1].split('|')[1] || distMatch[1].split('|')[0];
    currentDistrict = rawDist.replace(/district/gi, '').replace(/,/g, '').replace(/Himachal Pradesh/gi, '').trim();
  }

  // Find index of cell starting with |<digits>
  let acIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*\d+\s*$/.test(lines[i])) {
      acIdx = i;
      break;
    }
  }
  if (acIdx === -1) continue;

  const acNo = parseInt(lines[acIdx].replace('|', '').trim());
  const nameLine = lines[acIdx + 1] || '';
  let rawName = nameLine.replace(/^\|/, '').trim();
  const nameMatch = rawName.match(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/);
  let name = nameMatch ? nameMatch[1] : rawName;
  
  let type = 'GEN';
  if (rawName.includes('(SC)') || name.includes('(SC)')) type = 'SC';
  if (rawName.includes('(ST)') || name.includes('(ST)')) type = 'ST';
  name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Filter remaining lines to only content lines (ignore style lines)
  const contentLines = lines.slice(acIdx + 2).filter(l => !l.startsWith('style') && !l.startsWith('!'));
  const clean = (s) => (s || '').replace(/^\|/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/['"{}]/g, '').trim();

  const wCand = clean(contentLines[0]);
  let wParty = clean(contentLines[1]);
  if (wParty.includes('BJP')) wParty = 'BJP';
  else if (wParty.includes('INC') || wParty.includes('Congress')) wParty = 'INC';
  else if (wParty.includes('IND') || wParty.includes('Independent')) wParty = 'IND';
  else if (wParty.includes('AAP')) wParty = 'AAP';
  else if (wParty.includes('CPI')) wParty = 'CPIM';
  const wVotes = parseInt(clean(contentLines[2]).replace(/,/g, '')) || 0;

  const ruCand = clean(contentLines[4]);
  let ruParty = clean(contentLines[5]);
  if (ruParty.includes('BJP')) ruParty = 'BJP';
  else if (ruParty.includes('INC') || ruParty.includes('Congress')) ruParty = 'INC';
  else if (ruParty.includes('IND') || ruParty.includes('Independent')) ruParty = 'IND';
  else if (ruParty.includes('AAP')) ruParty = 'AAP';
  else if (ruParty.includes('CPI')) ruParty = 'CPIM';

  const margin = parseInt(clean(contentLines[7]).replace(/,/g, '')) || 0;

  const localName = HINDI_EXTRA[norm(name)] || name;

  seats.push({
    acNo,
    name,
    localName,
    district: currentDistrict,
    type,
    winner2022: wParty,
    winnerName2022: wCand,
    winnerVotes2022: wVotes,
    runnerUp2022: ruParty ? `${ruParty} - ${ruCand}` : '',
    margin2022: margin,
    currentParty: wParty,
  });
}

seats.sort((a, b) => a.acNo - b.acNo);

const out = `/**
 * Himachal Pradesh Assembly Constituencies — 68 seats (2022)
 *
 * Source: Election Commission of India (ECI)
 * General Election to Legislative Assembly of Himachal Pradesh 2022
 */

export interface HPConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2022: string;
  winnerName2022: string;
  winnerVotes2022: number;
  runnerUp2022: string;
  margin2022: number;
  currentParty: string;
}

export const HP_CONSTITUENCIES: HPConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2022: '${s.winner2022}', winnerName2022: '${s.winnerName2022.replace(/'/g, "\\'")}', winnerVotes2022: ${s.winnerVotes2022}, runnerUp2022: '${s.runnerUp2022.replace(/'/g, "\\'")}', margin2022: ${s.margin2022}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getHPConstituency(acNo: number): HPConstituencySeed | undefined {
  return HP_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;

writeFileSync('data/seed/himachal-pradesh-constituencies.ts', out, 'utf8');
console.log('Successfully wrote data/seed/himachal-pradesh-constituencies.ts with', seats.length, 'seats.');
