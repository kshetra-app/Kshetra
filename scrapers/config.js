/**
 * Scraper Configuration — All 29+ Indian States/UTs, MyNeta keys, PRS mappings
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ── All State/UT Definitions ───────────────────────────────────────────
const STATES = [
  { code: 'AP', name: 'Andhra Pradesh', prsName: 'Andhra Pradesh', mynetaKeys: ['AndhraPradesh2024','andhrapradesh2019','andhra2014','andhraPradesh2004'], prsTerm: 2, totalSeats: 175 },
  { code: 'AR', name: 'Arunachal Pradesh', prsName: 'Arunachal Pradesh', mynetaKeys: ['ArunachalPradesh2024','ArunachalPradesh2019','arunachal2014','an2009','an2004'], prsTerm: 1, totalSeats: 60 },
  { code: 'AS', name: 'Assam', prsName: 'Assam', mynetaKeys: ['Assam2026','Assam2021','assam2016','assam2011','assam2006'], prsTerm: 1, totalSeats: 126 },
  { code: 'BR', name: 'Bihar', prsName: 'Bihar', mynetaKeys: ['Bihar2022','bihar2017'], prsTerm: 1, totalSeats: 243 },
  { code: 'CG', name: 'Chhattisgarh', prsName: 'Chhattisgarh', mynetaKeys: ['Chhattisgarh2023','chhattisgarh2018','chhattisgarh2013'], prsTerm: 1, totalSeats: 90 },
  { code: 'DL', name: 'Delhi', prsName: 'Delhi', mynetaKeys: ['Delhi2022','delhi2017','delhi2013'], prsTerm: 1, totalSeats: 70 },
  { code: 'GA', name: 'Goa', prsName: 'Goa', mynetaKeys: ['goa2022','goa2017','goa2012','goa2007'], prsTerm: 1, totalSeats: 40 },
  { code: 'GJ', name: 'Gujarat', prsName: 'Gujarat', mynetaKeys: ['Gujarat2022','Gujarat2017','gujarat2012'], prsTerm: 1, totalSeats: 182 },
  { code: 'HR', name: 'Haryana', prsName: 'Haryana', mynetaKeys: ['Haryana2024','haryana2019','haryana2014','ha2009','hr2005'], prsTerm: 1, totalSeats: 90 },
  { code: 'HP', name: 'Himachal Pradesh', prsName: 'Himachal Pradesh', mynetaKeys: ['HimachalPradesh2022','HimachalPradesh2017','hp2012','him2007'], prsTerm: 1, totalSeats: 68 },
  { code: 'JK', name: 'Jammu and Kashmir', prsName: 'Jammu and Kashmir', mynetaKeys: ['JammuAndKashmir2024'], prsTerm: 1, totalSeats: 90 },
  { code: 'JH', name: 'Jharkhand', prsName: 'Jharkhand', mynetaKeys: ['Jharkhand2024','jharkhand2019','jharkhand2014'], prsTerm: 1, totalSeats: 81 },
  { code: 'KA', name: 'Karnataka', prsName: 'Karnataka', mynetaKeys: ['Karnataka2023','karnataka2018','karnataka2013','karnatka2008','karnataka2004'], prsTerm: 16, totalSeats: 224 },
  { code: 'KL', name: 'Kerala', prsName: 'Kerala', mynetaKeys: ['Kerala2026','Kerala2021','kerala2016','kerala2011','ker2006'], prsTerm: 1, totalSeats: 140 },
  { code: 'MP', name: 'Madhya Pradesh', prsName: 'Madhya Pradesh', mynetaKeys: ['MadhyaPradesh2023','madhyapradesh2018','mp2013'], prsTerm: 1, totalSeats: 230 },
  { code: 'MH', name: 'Maharashtra', prsName: 'Maharashtra', mynetaKeys: ['Maharashtra2024','maharashtra2019','maharashtra2014','mh2009','mah2004'], prsTerm: 15, totalSeats: 288 },
  { code: 'MN', name: 'Manipur', prsName: 'Manipur', mynetaKeys: ['manipur2022','manipur2017','manipur2012'], prsTerm: 1, totalSeats: 60 },
  { code: 'ML', name: 'Meghalaya', prsName: 'Meghalaya', mynetaKeys: ['Meghalaya2023','meghalaya2018','meghalaya2013'], prsTerm: 1, totalSeats: 60 },
  { code: 'MZ', name: 'Mizoram', prsName: 'Mizoram', mynetaKeys: ['Mizoram2023','mizoram2018','mizoram2013'], prsTerm: 1, totalSeats: 40 },
  { code: 'NL', name: 'Nagaland', prsName: 'Nagaland', mynetaKeys: ['Nagaland2023','nagaland2018','nagaland2013'], prsTerm: 1, totalSeats: 60 },
  { code: 'OD', name: 'Odisha', prsName: 'Odisha', mynetaKeys: ['Odisha2024','odisha2019','odisha2014','orissa2009','orissa2004'], prsTerm: 1, totalSeats: 147 },
  { code: 'PY', name: 'Puducherry', prsName: 'Puducherry', mynetaKeys: ['Puducherry2026','Puducherry2021','puducherry2016','puducherry2011','pond2006'], prsTerm: 1, totalSeats: 30 },
  { code: 'PB', name: 'Punjab', prsName: 'Punjab', mynetaKeys: ['punjab2022','punjab2017','pb2012','pb2007'], prsTerm: 1, totalSeats: 117 },
  { code: 'RJ', name: 'Rajasthan', prsName: 'Rajasthan', mynetaKeys: ['Rajasthan2023','rajasthan2018','rajasthan2013','rj2008'], prsTerm: 1, totalSeats: 200 },
  { code: 'SK', name: 'Sikkim', prsName: 'Sikkim', mynetaKeys: ['Sikkim2024','sikkim2019','sikkim2014','sikkim2009','sikkim2004'], prsTerm: 1, totalSeats: 32 },
  { code: 'TN', name: 'Tamil Nadu', prsName: 'Tamil Nadu', mynetaKeys: ['TamilNadu2026','TamilNadu2021','tamilnadu2016','tamilnadu2011','tn2006'], prsTerm: 1, totalSeats: 234 },
  { code: 'TS', name: 'Telangana', prsName: 'Telangana', mynetaKeys: ['Telangana2023','telangana2018','telangana2014'], prsTerm: 3, totalSeats: 119 },
  { code: 'TR', name: 'Tripura', prsName: 'Tripura', mynetaKeys: ['Tripura2023','tripura2018','tripura2013','tripura2008'], prsTerm: 1, totalSeats: 60 },
  { code: 'UP', name: 'Uttar Pradesh', prsName: 'Uttar Pradesh', mynetaKeys: ['uttarpradesh2022','uttarpradesh2017','up2012','up2007'], prsTerm: 1, totalSeats: 403 },
  { code: 'UK', name: 'Uttarakhand', prsName: 'Uttarakhand', mynetaKeys: ['uttarakhand2022','uttarakhand2017','utt2012'], prsTerm: 1, totalSeats: 70 },
  { code: 'WB', name: 'West Bengal', prsName: 'West Bengal', mynetaKeys: ['WestBengal2026','WestBengal2021','westbengal2016','westbengal2011','wb2006'], prsTerm: 1, totalSeats: 294 },
];

// ── Lok Sabha Election Keys ────────────────────────────────────────────
const LOK_SABHA_KEYS = ['LokSabha2024', 'LokSabha2019', 'ls2014', 'ls2009', 'loksabha2004'];

// ── Extract election year from a MyNeta key ────────────────────────────
function extractYear(key) {
  const m = key.match(/(\d{4})/);
  return m ? parseInt(m[1]) : 0;
}

// ── Output paths ───────────────────────────────────────────────────────
const path = require('path');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const PHOTO_MAP_OUTPUT = path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json');
const AFFIDAVIT_OUTPUT = path.resolve(__dirname, 'output/affidavits');
const ELECTION_RESULTS_OUTPUT = path.resolve(__dirname, 'output/election-results');
const PHOTOS_OUTPUT = path.resolve(__dirname, 'output/photos');

// ── HTTP config ────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const DELAY_MS = 300; // Rate limit between requests
const TIMEOUT_MS = 20000;

module.exports = {
  STATES,
  LOK_SABHA_KEYS,
  extractYear,
  OUTPUT_DIR,
  PHOTO_MAP_OUTPUT,
  AFFIDAVIT_OUTPUT,
  ELECTION_RESULTS_OUTPUT,
  PHOTOS_OUTPUT,
  UA,
  DELAY_MS,
  TIMEOUT_MS,
};
