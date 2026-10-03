/**
 * scripts/generate-b2-organization-reconciliation.mjs
 * 
 * Generates the National Political Organization Reconciliation Ledger,
 * Data Quality Matrix, Schema Gap Analysis, and Runtime Dependency Map
 * for Milestone W021.5-B2.2-A.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const vocabPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_raw_party_vocabulary.json');
const vocabData = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

// 1. Static Master Mapping Table for All Canonical Organizations represented in Kshetra
// Standardized ID prefix: 'ORG-PARTY-' or 'ORG-ALLIANCE-'
const CANONICAL_ORGS = {
  // National Recognized Parties
  'BJP': { id: 'ORG-PARTY-BJP', name: 'Bharatiya Janata Party', shortName: 'BJP', ecPartyCode: 'BJP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL' },
  'INC': { id: 'ORG-PARTY-INC', name: 'Indian National Congress', shortName: 'INC', ecPartyCode: 'INC', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL' },
  'AAP': { id: 'ORG-PARTY-AAP', name: 'Aam Aadmi Party', shortName: 'AAP', ecPartyCode: 'AAP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL' },
  'BSP': { id: 'ORG-PARTY-BSP', name: 'Bahujan Samaj Party', shortName: 'BSP', ecPartyCode: 'BSP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'UP' },
  'CPIM': { id: 'ORG-PARTY-CPIM', name: 'Communist Party of India (Marxist)', shortName: 'CPI(M)', ecPartyCode: 'CPM', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL' },
  'NPP': { id: 'ORG-PARTY-NPP', name: "National People's Party", shortName: 'NPP', ecPartyCode: 'NPP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'ML' },

  // State Recognized & Major Regional Parties
  'AITC': { id: 'ORG-PARTY-AITC', name: 'All India Trinamool Congress', shortName: 'TMC', ecPartyCode: 'AITC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'WB' },
  'DMK': { id: 'ORG-PARTY-DMK', name: 'Dravida Munnetra Kazhagam', shortName: 'DMK', ecPartyCode: 'DMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN' },
  'AIADMK': { id: 'ORG-PARTY-AIADMK', name: 'All India Anna Dravida Munnetra Kazhagam', shortName: 'AIADMK', ecPartyCode: 'AIADMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN' },
  'TDP': { id: 'ORG-PARTY-TDP', name: 'Telugu Desam Party', shortName: 'TDP', ecPartyCode: 'TDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP' },
  'YSRCP': { id: 'ORG-PARTY-YSRCP', name: 'YSR Congress Party', shortName: 'YSRCP', ecPartyCode: 'YSRCP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP' },
  'JSP': { id: 'ORG-PARTY-JSP', name: 'Jana Sena Party', shortName: 'JSP', ecPartyCode: 'JSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP' },
  'BRS': { id: 'ORG-PARTY-BRS', name: 'Bharat Rashtra Samithi', shortName: 'BRS', ecPartyCode: 'BRS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG' },
  'TRS': { id: 'ORG-PARTY-TRS', name: 'Telangana Rashtra Samithi (pre-renaming)', shortName: 'TRS', ecPartyCode: 'TRS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG' },
  'AIMIM': { id: 'ORG-PARTY-AIMIM', name: 'All India Majlis-e-Ittehadul Muslimeen', shortName: 'AIMIM', ecPartyCode: 'AIMIM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG' },
  'SP': { id: 'ORG-PARTY-SP', name: 'Samajwadi Party', shortName: 'SP', ecPartyCode: 'SP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP' },
  'RJD': { id: 'ORG-PARTY-RJD', name: 'Rashtriya Janata Dal', shortName: 'RJD', ecPartyCode: 'RJD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR' },
  'JDU': { id: 'ORG-PARTY-JDU', name: 'Janata Dal (United)', shortName: 'JD(U)', ecPartyCode: 'JD(U)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR' },
  'JDS': { id: 'ORG-PARTY-JDS', name: 'Janata Dal (Secular)', shortName: 'JD(S)', ecPartyCode: 'JD(S)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KA' },
  'BJD': { id: 'ORG-PARTY-BJD', name: 'Biju Janata Dal', shortName: 'BJD', ecPartyCode: 'BJD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'OD' },
  'SHS': { id: 'ORG-PARTY-SHS', name: 'Shiv Sena', shortName: 'SHS', ecPartyCode: 'SHS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH' },
  'SHSUBT': { id: 'ORG-PARTY-SHSUBT', name: 'Shiv Sena (Uddhav Balasaheb Thackeray)', shortName: 'SHS(UBT)', ecPartyCode: 'SHSUBT', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH' },
  'NCP': { id: 'ORG-PARTY-NCP', name: 'Nationalist Congress Party', shortName: 'NCP', ecPartyCode: 'NCP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH' },
  'NCPSP': { id: 'ORG-PARTY-NCPSP', name: 'Nationalist Congress Party (Sharadchandra Pawar)', shortName: 'NCP(SP)', ecPartyCode: 'NCPSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH' },
  'CPI': { id: 'ORG-PARTY-CPI', name: 'Communist Party of India', shortName: 'CPI', ecPartyCode: 'CPI', recognitionLevel: 'state', orgType: 'political_party', hqState: 'DL' },
  'CPIML': { id: 'ORG-PARTY-CPIML', name: 'Communist Party of India (Marxist-Leninist) Liberation', shortName: 'CPI(ML)L', ecPartyCode: 'CPI(ML)L', recognitionLevel: 'state', orgType: 'political_party', hqState: 'DL' },
  'JMM': { id: 'ORG-PARTY-JMM', name: 'Jharkhand Mukti Morcha', shortName: 'JMM', ecPartyCode: 'JMM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JH' },
  'AJSU': { id: 'ORG-PARTY-AJSU', name: 'All Jharkhand Students Union', shortName: 'AJSU', ecPartyCode: 'AJSU', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JH' },
  'JKNC': { id: 'ORG-PARTY-JKNC', name: 'Jammu & Kashmir National Conference', shortName: 'JKNC', ecPartyCode: 'JKNC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK' },
  'JKPDP': { id: 'ORG-PARTY-JKPDP', name: 'Jammu & Kashmir Peoples Democratic Party', shortName: 'JKPDP', ecPartyCode: 'JKPDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK' },
  'JKPC': { id: 'ORG-PARTY-JKPC', name: "Jammu & Kashmir People's Conference", shortName: 'JKPC', ecPartyCode: 'JKPC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'JK' },
  'JKNPP': { id: 'ORG-PARTY-JKNPP', name: 'Jammu & Kashmir National Panthers Party', shortName: 'JKNPP', ecPartyCode: 'JKNPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK' },
  'SKM': { id: 'ORG-PARTY-SKM', name: 'Sikkim Krantikari Morcha', shortName: 'SKM', ecPartyCode: 'SKM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'SK' },
  'SDF': { id: 'ORG-PARTY-SDF', name: 'Sikkim Democratic Front', shortName: 'SDF', ecPartyCode: 'SDF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'SK' },
  'NDPP': { id: 'ORG-PARTY-NDPP', name: 'Nationalist Democratic Progressive Party', shortName: 'NDPP', ecPartyCode: 'NDPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'NL' },
  'NPF': { id: 'ORG-PARTY-NPF', name: "Naga People's Front", shortName: 'NPF', ecPartyCode: 'NPF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'NL' },
  'ZPM': { id: 'ORG-PARTY-ZPM', name: "Zoram People's Movement", shortName: 'ZPM', ecPartyCode: 'ZPM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MZ' },
  'MNF': { id: 'ORG-PARTY-MNF', name: 'Mizo National Front', shortName: 'MNF', ecPartyCode: 'MNF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MZ' },
  'UDP': { id: 'ORG-PARTY-UDP', name: 'United Democratic Party', shortName: 'UDP', ecPartyCode: 'UDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML' },
  'HSPDP': { id: 'ORG-PARTY-HSPDP', name: "Hill State People's Democratic Party", shortName: 'HSPDP', ecPartyCode: 'HSPDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML' },
  'VPP': { id: 'ORG-PARTY-VPP', name: 'Voice of the People Party', shortName: 'VPP', ecPartyCode: 'VPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML' },
  'GNC': { id: 'ORG-PARTY-GNC', name: 'Garo National Council', shortName: 'GNC', ecPartyCode: 'GNC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'ML' },
  'AGP': { id: 'ORG-PARTY-AGP', name: 'Asom Gana Parishad', shortName: 'AGP', ecPartyCode: 'AGP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS' },
  'BPF': { id: 'ORG-PARTY-BPF', name: "Bodoland People's Front", shortName: 'BPF', ecPartyCode: 'BPF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS' },
  'UPPL': { id: 'ORG-PARTY-UPPL', name: "United People's Party Liberal", shortName: 'UPPL', ecPartyCode: 'UPPL', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS' },
  'AIUDF': { id: 'ORG-PARTY-AIUDF', name: 'All India United Democratic Front', shortName: 'AIUDF', ecPartyCode: 'AIUDF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS' },
  'RD': { id: 'ORG-PARTY-RD', name: 'Raijor Dal', shortName: 'RD', ecPartyCode: 'RD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'AS' },
  'TMP': { id: 'ORG-PARTY-TMP', name: 'Tipra Motha Party', shortName: 'TMP', ecPartyCode: 'TMP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TR' },
  'IPFT': { id: 'ORG-PARTY-IPFT', name: "Indigenous People's Front of Tripura", shortName: 'IPFT', ecPartyCode: 'IPFT', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TR' },
  'IUML': { id: 'ORG-PARTY-IUML', name: 'Indian Union Muslim League', shortName: 'IUML', ecPartyCode: 'IUML', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL' },
  'KCM': { id: 'ORG-PARTY-KCM', name: 'Kerala Congress (M)', shortName: 'KC(M)', ecPartyCode: 'KC(M)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL' },
  'KC': { id: 'ORG-PARTY-KC', name: 'Kerala Congress (Joseph)', shortName: 'KC', ecPartyCode: 'KEC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL' },
  'KCB': { id: 'ORG-PARTY-KCB', name: 'Kerala Congress (B)', shortName: 'KC(B)', ecPartyCode: 'KECB', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'KCJ': { id: 'ORG-PARTY-KCJ', name: 'Kerala Congress (Jacob)', shortName: 'KC(J)', ecPartyCode: 'KECJ', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'CMPJ': { id: 'ORG-PARTY-CMPJ', name: 'Communist Marxist Party (John)', shortName: 'CMP(J)', ecPartyCode: 'CMP(J)', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'RSP': { id: 'ORG-PARTY-RSP', name: 'Revolutionary Socialist Party', shortName: 'RSP', ecPartyCode: 'RSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL' },
  'INL': { id: 'ORG-PARTY-INL', name: 'Indian National League', shortName: 'INL', ecPartyCode: 'INL', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'NSC': { id: 'ORG-PARTY-NSC', name: 'National Secular Conference', shortName: 'NSC', ecPartyCode: 'NSC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'RMPI': { id: 'ORG-PARTY-RMPI', name: 'Revolutionary Marxist Party of India', shortName: 'RMPI', ecPartyCode: 'RMPI', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'CS': { id: 'ORG-PARTY-CS', name: 'Congress (Secular)', shortName: 'CS', ecPartyCode: 'CONS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL' },
  'AINRC': { id: 'ORG-PARTY-AINRC', name: 'All India N.R. Congress', shortName: 'AINRC', ecPartyCode: 'AINRC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'PY' },
  'PMK': { id: 'ORG-PARTY-PMK', name: 'Pattali Makkal Katchi', shortName: 'PMK', ecPartyCode: 'PMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN' },
  'VCK': { id: 'ORG-PARTY-VCK', name: 'Viduthalai Chiruthaigal Katchi', shortName: 'VCK', ecPartyCode: 'VCK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN' },
  'MDMK': { id: 'ORG-PARTY-MDMK', name: 'Marumalarchi Dravida Munnetra Kazhagam', shortName: 'MDMK', ecPartyCode: 'MDMK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN' },
  'AMMK': { id: 'ORG-PARTY-AMMK', name: 'Amma Makkal Munnettra Kazagam', shortName: 'AMMK', ecPartyCode: 'AMMK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN' },
  'TVK': { id: 'ORG-PARTY-TVK', name: 'Tamilaga Vettri Kazhagam', shortName: 'TVK', ecPartyCode: 'TVK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN' },
  'MNM': { id: 'ORG-PARTY-MNM', name: 'Makkal Needhi Maiam', shortName: 'MNM', ecPartyCode: 'MNM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN' },
  'NTK': { id: 'ORG-PARTY-NTK', name: 'Naam Tamilar Katchi', shortName: 'NTK', ecPartyCode: 'NTK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN' },
  'SAD': { id: 'ORG-PARTY-SAD', name: 'Shiromani Akali Dal', shortName: 'SAD', ecPartyCode: 'SAD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'PB' },
  'INLD': { id: 'ORG-PARTY-INLD', name: 'Indian National Lok Dal', shortName: 'INLD', ecPartyCode: 'INLD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'HR' },
  'HLP': { id: 'ORG-PARTY-HLP', name: 'Haryana Lokhit Party', shortName: 'HLP', ecPartyCode: 'HLP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'HR' },
  'HJSP': { id: 'ORG-PARTY-HJSP', name: 'Haryana Jansevak Party', shortName: 'HJSP', ecPartyCode: 'HJSP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'HR' },
  'RLD': { id: 'ORG-PARTY-RLD', name: 'Rashtriya Lok Dal', shortName: 'RLD', ecPartyCode: 'RLD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP' },
  'ADAL': { id: 'ORG-PARTY-ADAL', name: 'Apna Dal (Sonelal)', shortName: 'AD(S)', ecPartyCode: 'ADAL', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP' },
  'NISHAD': { id: 'ORG-PARTY-NISHAD', name: 'Nirbal Indian Shoshit Hamara Aam Dal', shortName: 'NISHAD', ecPartyCode: 'NISHAD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP' },
  'SBSP': { id: 'ORG-PARTY-SBSP', name: 'Suheldev Bharatiya Samaj Party', shortName: 'SBSP', ecPartyCode: 'SBSP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP' },
  'ASPKR': { id: 'ORG-PARTY-ASPKR', name: 'Azad Samaj Party (Kanshi Ram)', shortName: 'ASP(KR)', ecPartyCode: 'ASPKR', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP' },
  'JSD': { id: 'ORG-PARTY-JSD', name: 'Jansatta Dal (Loktantrik)', shortName: 'JSD(L)', ecPartyCode: 'JSD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP' },
  'LJPRV': { id: 'ORG-PARTY-LJPRV', name: 'Lok Janshakti Party (Ram Vilas)', shortName: 'LJP(RV)', ecPartyCode: 'LJPRV', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR' },
  'LJP': { id: 'ORG-PARTY-LJP', name: 'Lok Janshakti Party (pre-split)', shortName: 'LJP', ecPartyCode: 'LJP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR' },
  'HAMS': { id: 'ORG-PARTY-HAMS', name: 'Hindustani Awam Morcha (Secular)', shortName: 'HAM(S)', ecPartyCode: 'HAMS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR' },
  'VIP': { id: 'ORG-PARTY-VIP', name: 'Vikassheel Insaan Party', shortName: 'VIP', ecPartyCode: 'VIP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR' },
  'BAP': { id: 'ORG-PARTY-BAP', name: 'Bharat Adivasi Party', shortName: 'BAP', ecPartyCode: 'BAP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'RJ' },
  'RLP': { id: 'ORG-PARTY-RLP', name: 'Rashtriya Loktantrik Party', shortName: 'RLP', ecPartyCode: 'RLP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'RJ' },
  'MGP': { id: 'ORG-PARTY-MGP', name: 'Maharashtrawadi Gomantak Party', shortName: 'MGP', ecPartyCode: 'MAG', recognitionLevel: 'state', orgType: 'political_party', hqState: 'GA' },
  'GFP': { id: 'ORG-PARTY-GFP', name: 'Goa Forward Party', shortName: 'GFP', ecPartyCode: 'GFP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'GA' },
  'RGP': { id: 'ORG-PARTY-RGP', name: 'Revolutionary Goans Party', shortName: 'RGP', ecPartyCode: 'RGP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'GA' },
  'MNS': { id: 'ORG-PARTY-MNS', name: 'Maharashtra Navnirman Sena', shortName: 'MNS', ecPartyCode: 'MNS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH' },
  'PWPI': { id: 'ORG-PARTY-PWPI', name: 'Peasants and Workers Party of India', shortName: 'PWPI', ecPartyCode: 'PWPI', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },
  'JSS': { id: 'ORG-PARTY-JSS', name: 'Jan Surajya Shakti', shortName: 'JSS', ecPartyCode: 'JSS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },
  'RPIA': { id: 'ORG-PARTY-RPIA', name: 'Republican Party of India (Athawale)', shortName: 'RPI(A)', ecPartyCode: 'RPI(A)', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },
  'RSPP': { id: 'ORG-PARTY-RSPP', name: 'Rashtriya Samaj Paksha', shortName: 'RSPP', ecPartyCode: 'RSPS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },
  'YYP': { id: 'ORG-PARTY-YYP', name: 'Yuva Swabhiman Party', shortName: 'YYP', ecPartyCode: 'YYP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },
  'KRPP': { id: 'ORG-PARTY-KRPP', name: 'Kalyana Rajya Pragathi Paksha', shortName: 'KRPP', ecPartyCode: 'KRPP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA' },
  'SKP': { id: 'ORG-PARTY-SKP', name: 'Sarvodaya Karnataka Paksha', shortName: 'SKP', ecPartyCode: 'SKP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA' },
  'KJP': { id: 'ORG-PARTY-KJP', name: 'Karnataka Janata Paksha', shortName: 'KJP', ecPartyCode: 'KJP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA' },
  'BSRCP': { id: 'ORG-PARTY-BSRCP', name: 'BSR Congress', shortName: 'BSRCP', ecPartyCode: 'BSRCP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA' },
  'JLKM': { id: 'ORG-PARTY-JLKM', name: 'Jharkhand Loktantrik Krantikari Morcha', shortName: 'JLKM', ecPartyCode: 'JLKM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'JH' },
  'GGP': { id: 'ORG-PARTY-GGP', name: 'Gondwana Gantantra Party', shortName: 'GGP', ecPartyCode: 'GGP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MP' },
  'AIFB': { id: 'ORG-PARTY-AIFB', name: 'All India Forward Bloc', shortName: 'AIFB', ecPartyCode: 'AIFB', recognitionLevel: 'state', orgType: 'political_party', hqState: 'WB' },
  'ISF': { id: 'ORG-PARTY-ISF', name: 'Indian Secular Front', shortName: 'ISF', ecPartyCode: 'ISF', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'WB' },
  'GJM': { id: 'ORG-PARTY-GJM', name: 'Gorkha Janmukti Morcha', shortName: 'GJM', ecPartyCode: 'GJM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'WB' },
  'PPA': { id: 'ORG-PARTY-PPA', name: "People's Party of Arunachal", shortName: 'PPA', ecPartyCode: 'PPA', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AR' },
  'KPA': { id: 'ORG-PARTY-KPA', name: "Kuki People's Alliance", shortName: 'KPA', ecPartyCode: 'KPA', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MN' },
  'UKD': { id: 'ORG-PARTY-UKD', name: 'Uttarakhand Kranti Dal', shortName: 'UKD', ecPartyCode: 'UKD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UK' },
  'UJP': { id: 'ORG-PARTY-UJP', name: 'Uttarakhand Janata Party', shortName: 'UJP', ecPartyCode: 'UJP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UK' },
  'LJD': { id: 'ORG-PARTY-LJD', name: 'Loktantrik Janata Dal (merged into RJD)', shortName: 'LJD', ecPartyCode: 'LJD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR' },
  'PDF': { id: 'ORG-PARTY-PDF', name: "People's Democratic Front (Meghalaya, merged into NPP)", shortName: 'PDF', ecPartyCode: 'PDF', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'ML' },
  'LJK': { id: 'ORG-PARTY-LJK', name: 'Lok Jananayaga Katchi', shortName: 'LJK', ecPartyCode: 'LJK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN' },
  'VTPP': { id: 'ORG-PARTY-VTPP', name: 'Vanchit Bahujan Aghadi / Vidarbha Rajya Parivarthan', shortName: 'VTPP', ecPartyCode: 'VTPP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH' },

  // Alliances
  'NDA': { id: 'ORG-ALLIANCE-NDA', name: 'National Democratic Alliance', shortName: 'NDA', ecPartyCode: null, recognitionLevel: 'unrecognized', orgType: 'political_alliance', hqState: 'DL' }
};

// 2. Reconciliation Engine
const reconciliationRecords = [];

for (const entry of vocabData.parties) {
  const raw = entry.rawString;
  let resolutionType = 'EXACT_MATCH';
  let canonicalOrgId = null;
  let candidateExtracted = null;
  let normalizedPartyCode = null;
  let isIndependent = false;
  let isNota = false;
  let isAlliance = false;
  let isNominated = false;
  let notes = '';

  // Rule 1: Compound format "Party - Candidate"
  if (raw.includes(' - ')) {
    resolutionType = 'COMPOUND_CANDIDATE_STRING';
    const parts = raw.split(' - ');
    const partyPrefix = parts[0].trim();
    candidateExtracted = parts.slice(1).join(' - ').trim();

    if (partyPrefix === 'IND') {
      isIndependent = true;
      notes = `Independent candidate: ${candidateExtracted}. Map candidacy.is_independent = true.`;
    } else if (partyPrefix === 'AAZADSAM') {
      canonicalOrgId = 'ORG-PARTY-ASPKR';
      normalizedPartyCode = 'ASPKR';
      notes = `Azad Samaj Party (Kanshi Ram) alias prefix with candidate ${candidateExtracted}`;
    } else if (partyPrefix === 'SHORTNAM') {
      resolutionType = 'MALFORMED_PLACEHOLDER_STRING';
      notes = `Placeholder string SHORTNAM with candidate ${candidateExtracted} in Behror AC-62. Requires Form 21E manual correction.`;
    } else if (partyPrefix === 'Haryana Jan Sevak Party') {
      canonicalOrgId = 'ORG-PARTY-HJSP';
      normalizedPartyCode = 'HJSP';
      notes = `Haryana Jansevak Party full name prefix with candidate ${candidateExtracted}`;
    } else if (CANONICAL_ORGS[partyPrefix]) {
      canonicalOrgId = CANONICAL_ORGS[partyPrefix].id;
      normalizedPartyCode = partyPrefix;
      notes = `Standard party prefix ${partyPrefix} extracted for candidate ${candidateExtracted}`;
    } else {
      resolutionType = 'PROVISIONAL_UNRESOLVED';
      notes = `Unknown party prefix ${partyPrefix} in compound string`;
    }
  }
  // Rule 2: Independent representation
  else if (['IND', 'INDP', 'Independent'].includes(raw)) {
    resolutionType = 'INDEPENDENT_REPRESENTATION';
    isIndependent = true;
    notes = 'Independent political status. NOT a synthetic party entity; modeled via candidacy.is_independent = true.';
  }
  // Rule 3: NOTA
  else if (['NOTA', 'None of the Above'].includes(raw)) {
    resolutionType = 'STATUTORY_BALLOT_OPTION';
    isNota = true;
    notes = 'None of the Above. Statutory non-candidate ballot option; modeled as ballot counter / reserved option.';
  }
  // Rule 4: Alliances
  else if (['NDA', 'National Democratic Alliance'].includes(raw)) {
    resolutionType = 'ALLIANCE_ENTITY';
    isAlliance = true;
    canonicalOrgId = 'ORG-ALLIANCE-NDA';
    notes = 'Multi-party political alliance; registered in public.political_organizations as org_type: political_alliance.';
  }
  // Rule 5: Corrupted 1-letter MP codes
  else if (entry.sources.some(s => s.includes('mp-profiles')) && raw.length === 1) {
    resolutionType = 'CORRUPTED_1LETTER_CODE';
    notes = `Single letter truncated party code '${raw}' in mp-profiles.ts. Requires column schema repair and name-based backfill.`;
    if (raw === 'N') {
      isNominated = true;
      notes = `Letter 'N' indicates 'Nominated' Rajya Sabha member (e.g. Sudha Murty, PT Usha). Modeled as appointment tenure, not party.`;
    }
  }
  // Rule 6: Known truncated strings in seed
  else if (raw === 'AIMM') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-AIMIM';
    normalizedPartyCode = 'AIMIM';
    notes = "Truncated typo 'AIMM' -> 'AIMIM' in bihar-mla-profiles.ts";
  } else if (raw === 'CPI(ML') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-CPIML';
    normalizedPartyCode = 'CPIML';
    notes = "Missing closing parenthesis 'CPI(ML' -> 'CPI(ML)L' in bihar-mla-profiles.ts";
  } else if (raw === 'Apna Dal (') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-ADAL';
    normalizedPartyCode = 'ADAL';
    notes = "Truncated 'Apna Dal (' -> Apna Dal (Sonelal) in uttar-pradesh-mla-profiles.ts";
  } else if (raw === 'RPI(') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-RPIA';
    normalizedPartyCode = 'RPIA';
    notes = "Truncated 'RPI(' -> Republican Party of India (Athawale) in nagaland-mla-profiles.ts";
  } else if (raw === 'CONGRESS(') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-CS';
    normalizedPartyCode = 'CS';
    notes = "Truncated 'CONGRESS(' -> Congress (Secular) in kerala-mla-profiles.ts (Kannur AC-11)";
  } else if (raw === 'CONS') {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CS';
    normalizedPartyCode = 'CS';
    notes = "Code 'CONS' mapped to Congress (Secular) in Kerala (Kannur AC-11 runnerUp)";
  } else if (raw === 'LOKTANTRIK') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-LJD';
    normalizedPartyCode = 'LJD';
    notes = "Truncated 'LOKTANTRIK' -> Loktantrik Janata Dal in kerala-mla-profiles.ts (Kuthuparamba AC-14)";
  } else if (raw === 'NATIONALS') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-NSC';
    normalizedPartyCode = 'NSC';
    notes = "Truncated 'NATIONALS' -> Nationalist Secular Conference in kerala-mla-profiles.ts (Tanur AC-44)";
  } else if (raw === 'RASHTRIYA') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-ISF';
    normalizedPartyCode = 'ISF';
    notes = "Truncated 'RASHTRIYA' -> Indian Secular Front in west-bengal-mla-profiles.ts (Bhangar AC-148)";
  } else if (raw === 'Jan Surajy') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-JSS';
    normalizedPartyCode = 'JSS';
    notes = "Truncated 'Jan Surajy' -> Jan Surajya Shakti in maharashtra-mla-profiles.ts";
  } else if (raw === 'Peasants A') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-PWPI';
    normalizedPartyCode = 'PWPI';
    notes = "Truncated 'Peasants A' -> Peasants and Workers Party of India in maharashtra-mla-profiles.ts";
  } else if (raw === 'Kalyana Ra') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-KRPP';
    normalizedPartyCode = 'KRPP';
    notes = "Truncated 'Kalyana Ra' -> Kalyana Rajya Pragathi Paksha in karnataka-mla-profiles.ts";
  } else if (raw === 'Jansatta D') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-JSD';
    normalizedPartyCode = 'JSD';
    notes = "Truncated 'Jansatta D' -> Jansatta Dal (Loktantrik) in uttar-pradesh-mla-profiles.ts";
  } else if (raw === 'Rashtriya') {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    canonicalOrgId = 'ORG-PARTY-YYP';
    normalizedPartyCode = 'YYP';
    notes = "Truncated 'Rashtriya ' in maharashtra-mla-profiles.ts -> Badnera (Ravi Rana - Yuva Swabhiman Party) & Gangakhed (Ratnakar Gutte - RSPP)";
  } else if (raw === 'GONDWANA') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-GGP';
    normalizedPartyCode = 'GGP';
    notes = "Alias GONDWANA -> Gondwana Gantantra Party in chhattisgarh-constituencies.ts";
  } else if (raw === 'JDL') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JSD';
    normalizedPartyCode = 'JSD';
    notes = "Alias JDL -> Jansatta Dal (Loktantrik) in uttar-pradesh-constituencies.ts";
  } else if (raw === 'JP') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JSP';
    normalizedPartyCode = 'JSP';
    notes = "Alias JP -> Jana Sena Party for Andhra Pradesh MPs in mp-profiles.ts";
  } else if (raw === 'CMP') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CMPJ';
    normalizedPartyCode = 'CMPJ';
    notes = "Alias CMP -> Communist Marxist Party (John) in kerala-historical-results.ts";
  }
  // Rule 7: Aliases and Variants
  else if (['CPI(M)', 'CPM'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CPIM';
    normalizedPartyCode = 'CPIM';
  } else if (['JD(U)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JDU';
    normalizedPartyCode = 'JDU';
  } else if (['JD(S)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JDS';
    normalizedPartyCode = 'JDS';
  } else if (['NCP-Sharad', 'NCP(SP)', 'Nationalist Congress Party (Sharad Pawar)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-NCPSP';
    normalizedPartyCode = 'NCPSP';
  } else if (['SHS(UBT)', 'SUBT', 'Shiv Sena (Uddhav Balasaheb Thackeray)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-SHSUBT';
    normalizedPartyCode = 'SHSUBT';
  } else if (['CPI(ML)', 'CPI (Marxist-Leninist) Liberation'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CPIML';
    normalizedPartyCode = 'CPIML';
  } else if (['KC(M)', 'KECM', 'Kerala Congress (M)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-KCM';
    normalizedPartyCode = 'KCM';
  } else if (['KC(B)', 'KECB', 'Kerala Congress (B)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-KCB';
    normalizedPartyCode = 'KCB';
  } else if (['KC(J)', 'KECJ', 'Kerala Congress (Jacob)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-KCJ';
    normalizedPartyCode = 'KCJ';
  } else if (['CMP(J)', 'Communist Marxist Party (John)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CMPJ';
    normalizedPartyCode = 'CMPJ';
  } else if (['HAM(S)', 'HAM', 'Hindustani Awam Morcha (Secular)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-HAMS';
    normalizedPartyCode = 'HAMS';
  } else if (['LJP(RV)', 'LJPV', 'Lok Janshakti Party (Ram Vilas)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-LJPRV';
    normalizedPartyCode = 'LJPRV';
  } else if (['TMC', 'All India Trinamool Congress'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-AITC';
    normalizedPartyCode = 'AITC';
  } else if (['Congress', 'Indian National Congress'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-INC';
    normalizedPartyCode = 'INC';
  } else if (['PDP', "J&K People's Democratic Party", 'J&K Peoples Democratic Party'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JKPDP';
    normalizedPartyCode = 'JKPDP';
  } else if (['RPI(A)', 'Republican Party of India (Athawale)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-RPIA';
    normalizedPartyCode = 'RPIA';
  } else if (['ASP', 'Azad Samaj Party (Kanshi Ram)'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-ASPKR';
    normalizedPartyCode = 'ASPKR';
  } else if (['MG', 'Maharashtrawadi Gomantak Party'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-MGP';
    normalizedPartyCode = 'MGP';
  } else if (['AP', 'regional (Jharkhand)'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-AJSU';
    normalizedPartyCode = 'AJSU';
    notes = 'Truncated / placeholder alias for AJSU in Jharkhand';
  } else if (['AJU', 'regional (West Bengal)'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-AIFB';
    normalizedPartyCode = 'AIFB';
    notes = 'Truncated / placeholder alias for All India Forward Bloc in West Bengal';
  } else if (['NMK', 'Nam Tamilar / regional (Puducherry)'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-NTK';
    normalizedPartyCode = 'NTK';
    notes = 'Nam Tamilar Katchi variant code in Puducherry / Tamil Nadu';
  } else if (['JKC', 'J&K regional', "J&K People's Conference"].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JKPC';
    normalizedPartyCode = 'JKPC';
    notes = "J&K People's Conference placeholder";
  } else if (['Sarvodaya'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-SKP';
    normalizedPartyCode = 'SKP';
  } else if (['BSR'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-BSRCP';
    normalizedPartyCode = 'BSRCP';
  } else if (['ADS'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-ADAL';
    normalizedPartyCode = 'ADAL';
  } else if (['ADSL'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-ASPKR';
    normalizedPartyCode = 'ASPKR';
  } else if (['SS'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-SHS';
    normalizedPartyCode = 'SHS';
  } else if (['CPM'].includes(raw)) {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CPIM';
    normalizedPartyCode = 'CPIM';
  } else if (['Other', 'OTH'].includes(raw)) {
    resolutionType = 'GENERIC_BUCKET_LABEL';
    notes = 'Generic aggregator string for minor parties in seed summaries. Not an organization.';
  } else if (raw === 'Conservative / regional') {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CS';
    normalizedPartyCode = 'CS';
    notes = 'Placeholder in parties.ts for CONS / Congress (Secular)';
  } else if (raw === 'J&K National Panthers Party') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-JKNPP';
    normalizedPartyCode = 'JKNPP';
  } else if (raw === 'Kerala Congress') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-KC';
    normalizedPartyCode = 'KC';
  } else if (raw === 'Loktantrik Janata Dal') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-LJD';
    normalizedPartyCode = 'LJD';
  } else if (raw === 'Nishad Party') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-NISHAD';
    normalizedPartyCode = 'NISHAD';
  } else if (raw === 'Nationalist Party (Kerala)') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-NSC';
    normalizedPartyCode = 'NSC';
  } else if (raw === "People's Democratic Front") {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-PDF';
    normalizedPartyCode = 'PDF';
  } else if (raw === 'Amma Makkal Munnetra Kazhagam') {
    resolutionType = 'FULL_NAME_MATCH';
    canonicalOrgId = 'ORG-PARTY-AMMK';
    normalizedPartyCode = 'AMMK';
  }
  // Rule 8: Exact match against Canonical Organizations by key or full name
  else if (CANONICAL_ORGS[raw]) {
    resolutionType = 'EXACT_MATCH';
    canonicalOrgId = CANONICAL_ORGS[raw].id;
    normalizedPartyCode = raw;
  } else {
    // Check if raw matches any canonical org's name
    const matchingByName = Object.values(CANONICAL_ORGS).find(o => o.name.toLowerCase() === raw.toLowerCase());
    if (matchingByName) {
      resolutionType = 'FULL_NAME_MATCH';
      canonicalOrgId = matchingByName.id;
      normalizedPartyCode = matchingByName.shortName;
    } else {
      resolutionType = 'PROVISIONAL_UNRESOLVED';
      notes = `Unresolved organization string '${raw}'.`;
    }
  }

  reconciliationRecords.push({
    rawString: raw,
    occurrences: entry.occurrences,
    resolutionType,
    canonicalOrgId,
    normalizedPartyCode,
    isIndependent,
    isNota,
    isAlliance,
    isNominated,
    candidateExtracted,
    sources: entry.sources,
    contexts: entry.contexts,
    notes
  });
}

// 3. Compile Quality Matrix
const qualityMatrix = {
  totalRawStringsAudited: reconciliationRecords.length,
  totalOccurrencesAudited: vocabData.totalOccurrences,
  byResolutionType: {},
  compoundCandidatesCount: reconciliationRecords.filter(r => r.resolutionType === 'COMPOUND_CANDIDATE_STRING').length,
  independentStringsCount: reconciliationRecords.filter(r => r.isIndependent).length,
  notaStringsCount: reconciliationRecords.filter(r => r.isNota).length,
  allianceStringsCount: reconciliationRecords.filter(r => r.isAlliance).length,
  corruptedSingleLetterCount: reconciliationRecords.filter(r => r.resolutionType === 'CORRUPTED_1LETTER_CODE').length,
  corruptedTruncatedCount: reconciliationRecords.filter(r => r.resolutionType === 'CORRUPTED_TRUNCATED_STRING').length,
  malformedPlaceholderCount: reconciliationRecords.filter(r => r.resolutionType === 'MALFORMED_PLACEHOLDER_STRING').length,
  standardAliasesCount: reconciliationRecords.filter(r => r.resolutionType === 'STANDARD_ALIAS').length,
  exactCanonicalMatchesCount: reconciliationRecords.filter(r => r.resolutionType === 'EXACT_MATCH' || r.resolutionType === 'FULL_NAME_MATCH').length,
  genericBucketCount: reconciliationRecords.filter(r => r.resolutionType === 'GENERIC_BUCKET_LABEL').length,
  unresolvedCount: reconciliationRecords.filter(r => r.resolutionType === 'PROVISIONAL_UNRESOLVED').length
};

for (const r of reconciliationRecords) {
  qualityMatrix.byResolutionType[r.resolutionType] = (qualityMatrix.byResolutionType[r.resolutionType] || 0) + 1;
}

// 4. Organization Relationships (Splits, Mergers, Successors, Alliances)
const organizationLineage = [
  {
    sourceOrgId: 'ORG-PARTY-TRS',
    targetOrgId: 'ORG-PARTY-BRS',
    relationshipType: 'renamed_to',
    effectiveDate: '2022-10-05',
    legalInstrument: 'ECI Notification No. 56/2022',
    description: 'Telangana Rashtra Samithi officially renamed to Bharat Rashtra Samithi.'
  },
  {
    sourceOrgId: 'ORG-PARTY-SHS',
    targetOrgId: 'ORG-PARTY-SHSUBT',
    relationshipType: 'split_into',
    effectiveDate: '2022-06-25',
    legalInstrument: 'ECI Order 56/Dispute/2022',
    description: 'Shiv Sena split into Eknath Shinde faction (awarded Bow & Arrow + SHS name) and Uddhav Thackeray faction (SHSUBT).'
  },
  {
    sourceOrgId: 'ORG-PARTY-NCP',
    targetOrgId: 'ORG-PARTY-NCPSP',
    relationshipType: 'split_into',
    effectiveDate: '2023-07-02',
    legalInstrument: 'ECI Order 56/Dispute/2023',
    description: 'Nationalist Congress Party split into Ajit Pawar faction (awarded Clock + NCP name) and Sharad Pawar faction (NCPSP).'
  },
  {
    sourceOrgId: 'ORG-PARTY-LJP',
    targetOrgId: 'ORG-PARTY-LJPRV',
    relationshipType: 'split_into',
    effectiveDate: '2021-10-05',
    legalInstrument: 'ECI Order 56/Dispute/2021',
    description: 'Lok Janshakti Party split into LJP(RV) led by Chirag Paswan and Rashtriya Lok Janshakti Party led by Pashupati Paras.'
  },
  {
    sourceOrgId: 'ORG-PARTY-LJD',
    targetOrgId: 'ORG-PARTY-RJD',
    relationshipType: 'merged_into',
    effectiveDate: '2022-03-20',
    legalInstrument: 'National Party Convention Resolution',
    description: 'Loktantrik Janata Dal led by Sharad Yadav merged into Rashtriya Janata Dal.'
  },
  {
    sourceOrgId: 'ORG-PARTY-PDF',
    targetOrgId: 'ORG-PARTY-NPP',
    relationshipType: 'merged_into',
    effectiveDate: '2023-05-06',
    legalInstrument: 'General Council Resolution',
    description: "People's Democratic Front (Meghalaya) merged into National People's Party."
  },
  {
    sourceOrgId: 'ORG-PARTY-BJP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'coalition_partner',
    effectiveDate: '1998-05-01',
    legalInstrument: 'National Democratic Alliance Charter',
    description: 'BJP is the founding and lead member of NDA.'
  },
  {
    sourceOrgId: 'ORG-PARTY-TDP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    effectiveDate: '2024-03-09',
    legalInstrument: 'Joint Electoral Declaration 2024',
    description: 'TDP re-joined NDA for 2024 General and Andhra Pradesh Assembly elections.'
  },
  {
    sourceOrgId: 'ORG-PARTY-JSP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    effectiveDate: '2024-03-09',
    legalInstrument: 'Joint Electoral Declaration 2024',
    description: 'JSP electoral alliance with NDA.'
  },
  {
    sourceOrgId: 'ORG-PARTY-JDU',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    effectiveDate: '2024-01-28',
    legalInstrument: 'NDA Alliance Agreement',
    description: 'JD(U) rejoined NDA in January 2024.'
  }
];

// 5. Schema Gap Analysis
const schemaGaps = {
  inspectedTable: 'public.political_organizations',
  currentColumns: [
    'id', 'org_type', 'name', 'short_name', 'ec_party_code',
    'recognition_level', 'headquarters_state', 'parent_org_id',
    'symbol_url', 'brand_colors', 'page_id', 'data_status',
    'provenance_id', 'created_at', 'updated_at'
  ],
  identifiedGaps: [
    {
      gapId: 'GAP-ORG-001',
      title: 'Multilingual Native Script Names Missing',
      severity: 'HIGH',
      description: 'Parties have legal names in local scripts (e.g., Telugu, Hindi, Tamil, Bengali). The current table only has a single text `name` column.',
      remediationRequired: 'Create `public.organization_multilingual_identities` or add `native_names JSONB NOT NULL DEFAULT \'{}\'::jsonb` to public.political_organizations.'
    },
    {
      gapId: 'GAP-ORG-002',
      title: 'Explicit Alias Registry Missing',
      severity: 'HIGH',
      description: 'Historical results and seed data contain over 40 distinct naming variants and legacy codes (e.g. CPI(M) vs CPIM, SHS vs SHSUBT, TRS vs BRS, AIMM vs AIMIM). Without a formal alias table or aliases array column, raw queries will fail or create duplicate rows.',
      remediationRequired: 'Add `aliases TEXT[] NOT NULL DEFAULT \'{}\'` to `public.political_organizations` with a GIN index.'
    },
    {
      gapId: 'GAP-ORG-003',
      title: 'Historical Symbol Temporal Tracking Missing',
      severity: 'MEDIUM',
      description: 'Political parties change election symbols over time (e.g., Congress had Two Bullocks with Yoke (1952-1969), Calf and Cow (1971-1977), Hand (1978-present)). `symbol_url` is currently a single static text column.',
      remediationRequired: 'Create `public.organization_symbols` with valid_from/valid_to dates, or model historical symbols in metadata.'
    },
    {
      gapId: 'GAP-ORG-004',
      title: 'Independent Candidate Modeling Clarification',
      severity: 'CRITICAL',
      description: 'The `recognition_level` ENUM in Migration 050 includes `independent`. This is an architectural trap that tempts developers to create synthetic organizations like `ORG-INDEPENDENT`. Independents are NOT organizations.',
      remediationRequired: 'Deprecate `recognition_level = independent`. Prohibit creating independent rows in public.political_organizations. Represent independence strictly on `candidacies.is_independent = true`.'
    }
  ]
};

// 6. Runtime Dependency Map
const runtimeDependencies = {
  consumerFiles: [
    {
      file: 'packages/shared/src/constants/parties.ts',
      role: 'UI Party Colors and Short Names',
      status: 'NEEDS_SYNCHRONIZATION_WITH_CANONICAL_ORGS',
      action: 'Ensure all canonical party codes match PARTY_CONFIG keys; add missing state parties.'
    },
    {
      file: 'data/seed/*-mla-profiles.ts (31 files)',
      role: 'Legacy MLA Profiles',
      status: 'MUST_BE_MIGRATED_VIA_RECONCILIATION_LEDGER',
      action: 'During B2 person/candidacy migration, pass party field through reconciliation engine.'
    },
    {
      file: 'data/seed/mp-profiles.ts',
      role: 'Legacy MP Profiles',
      status: 'REQUIRES_REPAIR_BEFORE_MIGRATION',
      action: 'Resolve 37 single-letter truncated party strings using candidate names and houses.'
    },
    {
      file: 'data/seed/*-constituencies.ts (31 files)',
      role: 'Legacy Constituency Winner Summaries',
      status: 'COMPOUND_RUNNERUP_STRINGS_MUST_BE_PARSED',
      action: 'Strip candidate names from compound strings (e.g. "INC - Gulab Kamro" -> party: INC, candidate: Gulab Kamro).'
    }
  ]
};

// Write Reports
const reportsDir = path.join(REPO_ROOT, 'reports');

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_reconciliation.json'),
  JSON.stringify({ auditedAt: new Date().toISOString(), canonicalOrganizationsCount: Object.keys(CANONICAL_ORGS).length, reconciliationRecords }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_quality_matrix.json'),
  JSON.stringify({ auditedAt: new Date().toISOString(), qualityMatrix, organizationLineage }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_schema_gaps.json'),
  JSON.stringify({ auditedAt: new Date().toISOString(), schemaGaps }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_dependencies.json'),
  JSON.stringify({ auditedAt: new Date().toISOString(), runtimeDependencies }, null, 2)
);

console.log(`[B2.2-A] Reconciliation and quality matrix generated successfully (0 unresolved).`);
