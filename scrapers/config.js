/**
 * Scraper Configuration — All 29+ Indian States/UTs, MyNeta keys, PRS mappings
 * + Hierarchy Framework configuration (CEO portals, SEC, LGD codes, terminology)
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ── All State/UT Definitions ───────────────────────────────────────────
const STATES = [
  { code: 'AP', name: 'Andhra Pradesh', prsName: 'Andhra Pradesh', mynetaKeys: ['AndhraPradesh2024','andhrapradesh2019','andhra2014','andhraPradesh2004'], prsTerm: 2, totalSeats: 175,
    ceoUrl: 'https://ceoandhra.nic.in', secUrl: 'https://apsec.gov.in', lgdStateCode: '28',
    hierarchyTerms: { block: 'mandal', village: 'gram panchayat', subDistrict: 'mandal' },
    hierarchyEstimates: { totalDistricts: 26, totalMandals: 670, totalPanchayats: 15024, totalBooths: 46120 } },
  { code: 'AR', name: 'Arunachal Pradesh', prsName: 'Arunachal Pradesh', mynetaKeys: ['ArunachalPradesh2024','ArunachalPradesh2019','arunachal2014','an2009','an2004'], prsTerm: 1, totalSeats: 60,
    ceoUrl: 'https://ceoarunachal.nic.in', secUrl: 'https://sec.arunachal.gov.in', lgdStateCode: '12',
    hierarchyTerms: { block: 'circle', village: 'gram panchayat', subDistrict: 'circle' },
    hierarchyEstimates: { totalDistricts: 25, totalMandals: 224, totalPanchayats: 2012, totalBooths: 2790 } },
  { code: 'AS', name: 'Assam', prsName: 'Assam', mynetaKeys: ['Assam2026','Assam2021','assam2016','assam2011','assam2006'], prsTerm: 1, totalSeats: 126,
    ceoUrl: 'https://ceoassam.nic.in', secUrl: 'https://sec.assam.gov.in', lgdStateCode: '18',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 35, totalMandals: 219, totalPanchayats: 2489, totalBooths: 33530 } },
  { code: 'BR', name: 'Bihar', prsName: 'Bihar', mynetaKeys: ['Bihar2022','bihar2017'], prsTerm: 1, totalSeats: 243,
    ceoUrl: 'https://ceobihar.nic.in', secUrl: 'https://sec.bihar.gov.in', lgdStateCode: '10',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 38, totalMandals: 534, totalPanchayats: 8386, totalBooths: 72723 } },
  { code: 'CG', name: 'Chhattisgarh', prsName: 'Chhattisgarh', mynetaKeys: ['Chhattisgarh2023','chhattisgarh2018','chhattisgarh2013'], prsTerm: 1, totalSeats: 90,
    ceoUrl: 'https://ceochhattisgarh.nic.in', secUrl: 'https://sec.cg.gov.in', lgdStateCode: '22',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 33, totalMandals: 150, totalPanchayats: 11664, totalBooths: 24685 } },
  { code: 'DL', name: 'Delhi', prsName: 'Delhi', mynetaKeys: ['Delhi2022','delhi2017','delhi2013'], prsTerm: 1, totalSeats: 70,
    ceoUrl: 'https://ceodelhi.nic.in', secUrl: 'https://sec.delhi.gov.in', lgdStateCode: '07',
    hierarchyTerms: { block: 'tehsil', village: 'ward', subDistrict: 'tehsil' },
    hierarchyEstimates: { totalDistricts: 11, totalMandals: 33, totalPanchayats: 272, totalBooths: 13850 } },
  { code: 'GA', name: 'Goa', prsName: 'Goa', mynetaKeys: ['goa2022','goa2017','goa2012','goa2007'], prsTerm: 1, totalSeats: 40,
    ceoUrl: 'https://ceogoa.nic.in', secUrl: 'https://sec.goa.gov.in', lgdStateCode: '30',
    hierarchyTerms: { block: 'taluk', village: 'village panchayat', subDistrict: 'taluk' },
    hierarchyEstimates: { totalDistricts: 2, totalMandals: 12, totalPanchayats: 191, totalBooths: 1822 } },
  { code: 'GJ', name: 'Gujarat', prsName: 'Gujarat', mynetaKeys: ['Gujarat2022','Gujarat2017','gujarat2012'], prsTerm: 1, totalSeats: 182,
    ceoUrl: 'https://ceogujarat.nic.in', secUrl: 'https://sec.gujarat.gov.in', lgdStateCode: '24',
    hierarchyTerms: { block: 'taluk', village: 'gram panchayat', subDistrict: 'taluk' },
    hierarchyEstimates: { totalDistricts: 33, totalMandals: 250, totalPanchayats: 14290, totalBooths: 51782 } },
  { code: 'HR', name: 'Haryana', prsName: 'Haryana', mynetaKeys: ['Haryana2024','haryana2019','haryana2014','ha2009','hr2005'], prsTerm: 1, totalSeats: 90,
    ceoUrl: 'https://ceoharyana.nic.in', secUrl: 'https://sec.haryana.gov.in', lgdStateCode: '06',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 22, totalMandals: 143, totalPanchayats: 6222, totalBooths: 20308 } },
  { code: 'HP', name: 'Himachal Pradesh', prsName: 'Himachal Pradesh', mynetaKeys: ['HimachalPradesh2022','HimachalPradesh2017','hp2012','him2007'], prsTerm: 1, totalSeats: 68,
    ceoUrl: 'https://ceohimachal.nic.in', secUrl: 'https://sec.hp.gov.in', lgdStateCode: '02',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 12, totalMandals: 78, totalPanchayats: 3243, totalBooths: 7928 } },
  { code: 'JK', name: 'Jammu and Kashmir', prsName: 'Jammu and Kashmir', mynetaKeys: ['JammuAndKashmir2024'], prsTerm: 1, totalSeats: 90,
    ceoUrl: 'https://ceojk.nic.in', secUrl: 'https://sec.jk.gov.in', lgdStateCode: '01',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 20, totalMandals: 290, totalPanchayats: 4483, totalBooths: 11527 } },
  { code: 'JH', name: 'Jharkhand', prsName: 'Jharkhand', mynetaKeys: ['Jharkhand2024','jharkhand2019','jharkhand2014'], prsTerm: 1, totalSeats: 81,
    ceoUrl: 'https://ceojharkhand.nic.in', secUrl: 'https://sec.jharkhand.gov.in', lgdStateCode: '20',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 24, totalMandals: 264, totalPanchayats: 4423, totalBooths: 29464 } },
  { code: 'KA', name: 'Karnataka', prsName: 'Karnataka', mynetaKeys: ['Karnataka2023','karnataka2018','karnataka2013','karnatka2008','karnataka2004'], prsTerm: 16, totalSeats: 224,
    ceoUrl: 'https://ceokarnataka.kar.nic.in', secUrl: 'https://sec.karnataka.gov.in', lgdStateCode: '29',
    hierarchyTerms: { block: 'taluk', village: 'gram panchayat', subDistrict: 'taluk' },
    hierarchyEstimates: { totalDistricts: 31, totalMandals: 226, totalPanchayats: 6024, totalBooths: 58545 } },
  { code: 'KL', name: 'Kerala', prsName: 'Kerala', mynetaKeys: ['Kerala2026','Kerala2021','kerala2016','kerala2011','ker2006'], prsTerm: 1, totalSeats: 140,
    ceoUrl: 'https://ceokerala.nic.in', secUrl: 'https://sec.kerala.gov.in', lgdStateCode: '32',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 14, totalMandals: 152, totalPanchayats: 941, totalBooths: 26762 } },
  { code: 'MP', name: 'Madhya Pradesh', prsName: 'Madhya Pradesh', mynetaKeys: ['MadhyaPradesh2023','madhyapradesh2018','mp2013'], prsTerm: 1, totalSeats: 230,
    ceoUrl: 'https://ceomadhyapradesh.nic.in', secUrl: 'https://sec.mp.gov.in', lgdStateCode: '23',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 55, totalMandals: 313, totalPanchayats: 23006, totalBooths: 64498 } },
  { code: 'MH', name: 'Maharashtra', prsName: 'Maharashtra', mynetaKeys: ['Maharashtra2024','maharashtra2019','maharashtra2014','mh2009','mah2004'], prsTerm: 15, totalSeats: 288,
    ceoUrl: 'https://ceo.maharashtra.gov.in', secUrl: 'https://sec.maharashtra.gov.in', lgdStateCode: '27',
    hierarchyTerms: { block: 'taluk', village: 'gram panchayat', subDistrict: 'taluk' },
    hierarchyEstimates: { totalDistricts: 36, totalMandals: 358, totalPanchayats: 27993, totalBooths: 96654 } },
  { code: 'MN', name: 'Manipur', prsName: 'Manipur', mynetaKeys: ['manipur2022','manipur2017','manipur2012'], prsTerm: 1, totalSeats: 60,
    ceoUrl: 'https://ceomanipur.nic.in', secUrl: 'https://sec.manipur.gov.in', lgdStateCode: '14',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 16, totalMandals: 38, totalPanchayats: 166, totalBooths: 2886 } },
  { code: 'ML', name: 'Meghalaya', prsName: 'Meghalaya', mynetaKeys: ['Meghalaya2023','meghalaya2018','meghalaya2013'], prsTerm: 1, totalSeats: 60,
    ceoUrl: 'https://ceomeghalaya.nic.in', secUrl: 'https://sec.meghalaya.gov.in', lgdStateCode: '17',
    hierarchyTerms: { block: 'block', village: 'village council', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 12, totalMandals: 39, totalPanchayats: 6026, totalBooths: 3434 } },
  { code: 'MZ', name: 'Mizoram', prsName: 'Mizoram', mynetaKeys: ['Mizoram2023','mizoram2018','mizoram2013'], prsTerm: 1, totalSeats: 40,
    ceoUrl: 'https://ceomizoram.nic.in', secUrl: 'https://sec.mizoram.gov.in', lgdStateCode: '15',
    hierarchyTerms: { block: 'block', village: 'village council', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 11, totalMandals: 26, totalPanchayats: 830, totalBooths: 1275 } },
  { code: 'NL', name: 'Nagaland', prsName: 'Nagaland', mynetaKeys: ['Nagaland2023','nagaland2018','nagaland2013'], prsTerm: 1, totalSeats: 60,
    ceoUrl: 'https://ceonagaland.nic.in', secUrl: 'https://sec.nagaland.gov.in', lgdStateCode: '13',
    hierarchyTerms: { block: 'block', village: 'village council', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 16, totalMandals: 74, totalPanchayats: 1428, totalBooths: 2248 } },
  { code: 'OD', name: 'Odisha', prsName: 'Odisha', mynetaKeys: ['Odisha2024','odisha2019','odisha2014','orissa2009','orissa2004'], prsTerm: 1, totalSeats: 147,
    ceoUrl: 'https://ceoodisha.nic.in', secUrl: 'https://sec.odisha.gov.in', lgdStateCode: '21',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 30, totalMandals: 314, totalPanchayats: 6798, totalBooths: 36380 } },
  { code: 'PY', name: 'Puducherry', prsName: 'Puducherry', mynetaKeys: ['Puducherry2026','Puducherry2021','puducherry2016','puducherry2011','pond2006'], prsTerm: 1, totalSeats: 30,
    ceoUrl: 'https://ceopuducherry.nic.in', secUrl: 'https://sec.py.gov.in', lgdStateCode: '34',
    hierarchyTerms: { block: 'commune', village: 'commune panchayat', subDistrict: 'commune' },
    hierarchyEstimates: { totalDistricts: 4, totalMandals: 10, totalPanchayats: 98, totalBooths: 1050 } },
  { code: 'PB', name: 'Punjab', prsName: 'Punjab', mynetaKeys: ['punjab2022','punjab2017','pb2012','pb2007'], prsTerm: 1, totalSeats: 117,
    ceoUrl: 'https://ceopunjab.nic.in', secUrl: 'https://sec.punjab.gov.in', lgdStateCode: '03',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 23, totalMandals: 150, totalPanchayats: 13268, totalBooths: 24740 } },
  { code: 'RJ', name: 'Rajasthan', prsName: 'Rajasthan', mynetaKeys: ['Rajasthan2023','rajasthan2018','rajasthan2013','rj2008'], prsTerm: 1, totalSeats: 200,
    ceoUrl: 'https://ceorajasthan.nic.in', secUrl: 'https://sec.rajasthan.gov.in', lgdStateCode: '08',
    hierarchyTerms: { block: 'tehsil', village: 'gram panchayat', subDistrict: 'tehsil' },
    hierarchyEstimates: { totalDistricts: 50, totalMandals: 352, totalPanchayats: 11341, totalBooths: 52830 } },
  { code: 'SK', name: 'Sikkim', prsName: 'Sikkim', mynetaKeys: ['Sikkim2024','sikkim2019','sikkim2014','sikkim2009','sikkim2004'], prsTerm: 1, totalSeats: 32,
    ceoUrl: 'https://ceosikkim.nic.in', secUrl: 'https://sec.sikkim.gov.in', lgdStateCode: '11',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 6, totalMandals: 32, totalPanchayats: 185, totalBooths: 572 } },
  { code: 'TN', name: 'Tamil Nadu', prsName: 'Tamil Nadu', mynetaKeys: ['TamilNadu2026','TamilNadu2021','tamilnadu2016','tamilnadu2011','tn2006'], prsTerm: 1, totalSeats: 234,
    ceoUrl: 'https://ceotamilnadu.nic.in', secUrl: 'https://tnsec.tn.gov.in', lgdStateCode: '33',
    hierarchyTerms: { block: 'taluk', village: 'village panchayat', subDistrict: 'taluk' },
    hierarchyEstimates: { totalDistricts: 38, totalMandals: 285, totalPanchayats: 12524, totalBooths: 68324 } },
  { code: 'TS', name: 'Telangana', prsName: 'Telangana', mynetaKeys: ['Telangana2023','telangana2018','telangana2014'], prsTerm: 3, totalSeats: 119,
    ceoUrl: 'https://ceotelangana.nic.in', secUrl: 'https://tsec.gov.in', lgdStateCode: '36',
    hierarchyTerms: { block: 'mandal', village: 'gram panchayat', subDistrict: 'mandal' },
    hierarchyEstimates: { totalDistricts: 33, totalMandals: 602, totalPanchayats: 12769, totalBooths: 35655 } },
  { code: 'TR', name: 'Tripura', prsName: 'Tripura', mynetaKeys: ['Tripura2023','tripura2018','tripura2013','tripura2008'], prsTerm: 1, totalSeats: 60,
    ceoUrl: 'https://ceotripura.nic.in', secUrl: 'https://sec.tripura.gov.in', lgdStateCode: '16',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 8, totalMandals: 58, totalPanchayats: 591, totalBooths: 3354 } },
  { code: 'UP', name: 'Uttar Pradesh', prsName: 'Uttar Pradesh', mynetaKeys: ['uttarpradesh2022','uttarpradesh2017','up2012','up2007'], prsTerm: 1, totalSeats: 403,
    ceoUrl: 'https://ceoup.nic.in', secUrl: 'https://sec.up.nic.in', lgdStateCode: '09',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 75, totalMandals: 826, totalPanchayats: 59163, totalBooths: 163334 } },
  { code: 'UK', name: 'Uttarakhand', prsName: 'Uttarakhand', mynetaKeys: ['uttarakhand2022','uttarakhand2017','utt2012'], prsTerm: 1, totalSeats: 70,
    ceoUrl: 'https://ceouttarakhand.nic.in', secUrl: 'https://sec.uk.gov.in', lgdStateCode: '05',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 13, totalMandals: 95, totalPanchayats: 7950, totalBooths: 11788 } },
  { code: 'WB', name: 'West Bengal', prsName: 'West Bengal', mynetaKeys: ['WestBengal2026','WestBengal2021','westbengal2016','westbengal2011','wb2006'], prsTerm: 1, totalSeats: 294,
    ceoUrl: 'https://ceowb.nic.in', secUrl: 'https://sec.wb.gov.in', lgdStateCode: '19',
    hierarchyTerms: { block: 'block', village: 'gram panchayat', subDistrict: 'block' },
    hierarchyEstimates: { totalDistricts: 23, totalMandals: 346, totalPanchayats: 3354, totalBooths: 78032 } },
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

// ── Hierarchy Framework Output Paths ───────────────────────────────────
const HIERARCHY_OUTPUT_DIR = path.resolve(__dirname, 'output/hierarchy');
const BOOTH_RESULTS_OUTPUT_DIR = path.resolve(__dirname, 'output/booth-results');
const LOCAL_BODY_OUTPUT_DIR = path.resolve(__dirname, 'output/local-body');

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
  HIERARCHY_OUTPUT_DIR,
  BOOTH_RESULTS_OUTPUT_DIR,
  LOCAL_BODY_OUTPUT_DIR,
  UA,
  DELAY_MS,
  TIMEOUT_MS,
};
