/**
 * Adds every party code used across the seed data to the shared PartyCode union
 * and PARTY_CONFIG, so no constituency renders with the gray "unknown party"
 * fallback. Curated official colours where known; spelling variants of existing
 * parties (e.g. 'CPI(M)' -> CPIM, 'JD(U)' -> JDU) reuse the canonical colour.
 *
 *   node scripts/generate-parties.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const TYPES = 'C:/K/packages/shared/src/types/constituency.ts';
const PARTIES = 'C:/K/packages/shared/src/constants/parties.ts';
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

// curated [fullName, shortName, color, secondaryColor]
const CURATED = {
  AIADMK: ['All India Anna Dravida Munnetra Kazhagam', 'AIADMK', '#009933', '#33B35C'],
  AINRC: ['All India N.R. Congress', 'AINRC', '#FFB300', '#FFC94D'],
  LJK: ['Lok Jananayaga Katchi', 'LJK', '#C71585', '#D957A5'],
  NMK: ['Nam Tamilar / regional (Puducherry)', 'NMK', '#9932CC', '#B566D6'],
  MNF: ['Mizo National Front', 'MNF', '#006400', '#2E8B2E'],
  SDF: ['Sikkim Democratic Front', 'SDF', '#20B2AA', '#5CC7C1'],
  PPA: ["People's Party of Arunachal", 'PPA', '#FF8C00', '#FFB347'],
  TMP: ['Tipra Motha Party', 'TMP', '#2F4FAF', '#5E77C5'],
  IPFT: ["Indigenous People's Front of Tripura", 'IPFT', '#FF7F00', '#FFA64D'],
  AIFB: ['All India Forward Bloc', 'AIFB', '#E32636', '#EB6B76'],
  RSP: ['Revolutionary Socialist Party', 'RSP', '#D2122E', '#E0596B'],
  UDP: ['United Democratic Party', 'UDP', '#00688B', '#3A8FAC'],
  VPP: ["Voice of the People Party", 'VPP', '#1565C0', '#4D8AD0'],
  HSPDP: ["Hill State People's Democratic Party", 'HSPDP', '#8B4513', '#B5703A'],
  PDF: ["People's Democratic Front", 'PDF', '#607D8B', '#8AA1AC'],
  GNC: ['Garo National Council', 'GNC', '#2E8B57', '#5CB88A'],
  KPA: ["Kuki People's Alliance", 'KPA', '#B8860B', '#D4AA3A'],
  NPF: ["Naga People's Front", 'NPF', '#1B5E20', '#4D8453'],
  RPIA: ['Republican Party of India (Athawale)', 'RPI(A)', '#0000CD', '#4D4DDB'],
  LJPRV: ['Lok Janshakti Party (Ram Vilas)', 'LJP(RV)', '#6A0DAD', '#9B4DD6'],
  LJPV: ['Lok Janshakti Party (Ram Vilas)', 'LJP(RV)', '#6A0DAD', '#9B4DD6'],
  UKD: ['Uttarakhand Kranti Dal', 'UKD', '#228B22', '#52A852'],
  UJP: ['Uttarakhand Janata Party', 'UJP', '#556B2F', '#7E9152'],
  BAP: ['Bharat Adivasi Party', 'BAP', '#1E7D34', '#4DA864'],
  GFP: ['Goa Forward Party', 'GFP', '#FF6700', '#FF9447'],
  RGP: ['Revolutionary Goans Party', 'RGP', '#8B0000', '#B33A3A'],
  MG: ['Maharashtrawadi Gomantak Party', 'MGP', '#1F6FB2', '#4D95C9'],
  GGP: ['Gondwana Gantantra Party', 'GGP', '#1E5631', '#4D8366'],
  RLD: ['Rashtriya Lok Dal', 'RLD', '#007A33', '#33A05C'],
  SBSP: ['Suheldev Bharatiya Samaj Party', 'SBSP', '#FFA500', '#FFC04D'],
  NISHAD: ['Nishad Party', 'NISHAD', '#1CA9C9', '#5DC4D9'],
  ADSL: ['Azad Samaj Party (Kanshi Ram)', 'ASP', '#0F52BA', '#4D85D6'],
  VIP: ['Vikassheel Insaan Party', 'VIP', '#1E88E5', '#5BA8ED'],
  HAMS: ['Hindustani Awam Morcha (Secular)', 'HAM(S)', '#7A3E9D', '#A06BC0'],
  INLD: ['Indian National Lok Dal', 'INLD', '#138808', '#4DAE4D'],
  RD: ['Raijor Dal', 'RD', '#C8102E', '#D9536B'],
  PMK: ['Pattali Makkal Katchi', 'PMK', '#FFE135', '#FFEB6B'],
  MNM: ['Makkal Needhi Maiam', 'MNM', '#D81E5B', '#E55D8A'],
  AMMK: ['Amma Makkal Munnetra Kazhagam', 'AMMK', '#1B998B', '#4DBFB3'],
  VCK: ['Viduthalai Chiruthaigal Katchi', 'VCK', '#D32F2F', '#E06B6B'],
  IUML: ['Indian Union Muslim League', 'IUML', '#138808', '#4DAE4D'],
  INL: ['Indian National League', 'INL', '#1B7A3D', '#4D9E68'],
  KC: ['Kerala Congress', 'KC', '#0B6E4F', '#3E9374'],
  KCM: ['Kerala Congress (M)', 'KC(M)', '#0B6E4F', '#3E9374'],
  KCJ: ['Kerala Congress (Jacob)', 'KCJ', '#0B6E4F', '#3E9374'],
  LJD: ['Loktantrik Janata Dal', 'LJD', '#138808', '#4DAE4D'],
  RMPI: ['Revolutionary Marxist Party of India', 'RMPI', '#CC0000', '#E64D4D'],
  CMPJ: ['Communist Marxist Party (John)', 'CMP(J)', '#B22222', '#D45D5D'],
  NSC: ['Nationalist Party (Kerala)', 'NSC', '#4682B4', '#79A6CC'],
  CONS: ['Conservative / regional', 'CONS', '#5D6D7E', '#869AAB'],
  JKNPP: ['J&K National Panthers Party', 'JKNPP', '#FFD700', '#FFE34D'],
  JKPC: ["J&K People's Conference", 'JKPC', '#2E8B57', '#5CB88A'],
  JKPDP: ['J&K Peoples Democratic Party', 'PDP', '#1B7A3D', '#4D9E68'],
  JKC: ['J&K regional', 'JKC', '#3A7CA5', '#6FA3C4'],
  AP: ['regional (Jharkhand)', 'AP', '#7E5109', '#A87A33'],
  AJU: ['regional (West Bengal)', 'AJU', '#7B68EE', '#A293F2'],
  ISF: ['Indian Secular Front', 'ISF', '#1C6EA4', '#4D97C4'],
  CPIML: ['CPI (Marxist-Leninist) Liberation', 'CPI(ML)', '#D2122E', '#E0596B'],
  AIMM: ['All India Majlis-e-Ittehadul Muslimeen', 'AIMIM', '#008000', '#33B333'],
  KCB: ['Kerala Congress (B)', 'KC(B)', '#0B6E4F', '#3E9374'],
};
const PALETTE = ['#5B8C5A', '#A0522D', '#6495ED', '#CD853F', '#708090', '#9370DB', '#20B2AA', '#BC8F8C'];

// distinct codes used in seeds
const seedDir = 'C:/K/data/seed';
const used = new Set();
for (const f of readdirSync(seedDir).filter((f) => f.endsWith('-constituencies.ts'))) {
  const t = readFileSync(`${seedDir}/${f}`, 'utf8');
  for (const m of t.matchAll(/(?:winner\d{4}|currentParty|runnerUp\d{4}): '([^']*)'/g)) { if (m[1].trim()) used.add(m[1].trim()); }
}

const typesTxt = readFileSync(TYPES, 'utf8');
const unionCodes = new Set([...(typesTxt.match(/PartyCode\s*=([^;]*);/s)[1].matchAll(/'([^']+)'/g))].map((m) => m[1]));
const partiesTxt = readFileSync(PARTIES, 'utf8');
// existing colours by norm, for variant reuse
const byNorm = {};
for (const m of partiesTxt.matchAll(/^\s{2}'?([A-Z0-9()]+)'?: \{\s*code: '[^']*',\s*name: '([^']*)',\s*shortName: '([^']*)',\s*color: '([^']*)',\s*secondaryColor: '([^']*)',/gm)) {
  byNorm[norm(m[1])] = [m[2], m[3], m[4], m[5]];
}
for (const [k, v] of Object.entries(CURATED)) byNorm[norm(k)] = v;

const missing = [...used].filter((c) => !unionCodes.has(c)).sort();
const esc = (s) => s.replace(/'/g, "\\'");
let pi = 0;
const entryFor = (code) => {
  let e = byNorm[norm(code)];
  if (!e) { const col = PALETTE[pi++ % PALETTE.length]; e = [code, code, col, col]; }
  const [name, short, color, sec] = e;
  return { code, name, short, color, sec };
};
const entries = missing.map(entryFor);

console.log(`codes used: ${used.size} | already in union: ${unionCodes.size} | missing to add: ${missing.length}`);
console.log(missing.join(', '));

if (WRITE && missing.length) {
  const unionAdd = entries.map((e) => `  | '${esc(e.code)}'`).join('\n') + '\n';
  let t1 = typesTxt.replace(/(\n)(\s*\|\s*'NDA'\n)/, `\n${unionAdd}$2`);
  writeFileSync(TYPES, t1, 'utf8');

  const cfgAdd = entries.map((e) =>
    `  '${esc(e.code)}': {\n    code: '${esc(e.code)}',\n    name: '${esc(e.name)}',\n    shortName: '${esc(e.short)}',\n    color: '${e.color}',\n    secondaryColor: '${e.sec}',\n  },\n`).join('');
  let t2 = partiesTxt.replace(/(\n)(  NDA: \{)/, `\n${cfgAdd}$2`);
  writeFileSync(PARTIES, t2, 'utf8');
  console.log('PATCHED types + parties config with', missing.length, 'parties.');
}
