/**
 * scripts/generate-b2-organization-reconciliation-v2.mjs
 * 
 * Re-runs the full forensic party extraction and produces Reconciliation Ledger V2,
 * Exception Ledger, Relationships Ledger, and Schema Remediation Report
 * for Milestone W021.5-B2.2-B.
 * 
 * Enforces:
 *   - Explicit confidence levels: VERIFIED, RECONCILED, PROVISIONAL, CONFLICTING, MISSING.
 *   - Special audit of SHORTNAM (marked PROVISIONAL - Form 21E audit needed).
 *   - Special audit of 37 MP single-letter records (evidence-backed reconciliation).
 *   - Special audit of 13 MLA truncated records (evidence-backed reconciliation).
 *   - Adversarial parsing of 836 compound runner-up strings.
 *   - Independent candidate prohibition (is_independent = true, org_id = null).
 *   - NOTA as statutory ballot option (org_id = null).
 *   - Alliance entities separated (org_type: 'political_alliance').
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const vocabPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_raw_party_vocabulary.json');
const vocabData = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

// 1. Master Statutory Organization Registry (ECI Verified + Seed Observed)
const STATUTORY_ORGS = {
  // National Recognized Parties
  'BJP': { id: 'ORG-PARTY-BJP', name: 'Bharatiya Janata Party', shortName: 'BJP', ecPartyCode: 'BJP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'INC': { id: 'ORG-PARTY-INC', name: 'Indian National Congress', shortName: 'INC', ecPartyCode: 'INC', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'AAP': { id: 'ORG-PARTY-AAP', name: 'Aam Aadmi Party', shortName: 'AAP', ecPartyCode: 'AAP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'BSP': { id: 'ORG-PARTY-BSP', name: 'Bahujan Samaj Party', shortName: 'BSP', ecPartyCode: 'BSP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'UP', eciStatus: 'ECI_VERIFIED' },
  'CPIM': { id: 'ORG-PARTY-CPIM', name: 'Communist Party of India (Marxist)', shortName: 'CPI(M)', ecPartyCode: 'CPM', recognitionLevel: 'national', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'NPP': { id: 'ORG-PARTY-NPP', name: "National People's Party", shortName: 'NPP', ecPartyCode: 'NPP', recognitionLevel: 'national', orgType: 'political_party', hqState: 'ML', eciStatus: 'ECI_VERIFIED' },

  // State Recognized & Major Regional Parties
  'AITC': { id: 'ORG-PARTY-AITC', name: 'All India Trinamool Congress', shortName: 'TMC', ecPartyCode: 'AITC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'WB', eciStatus: 'ECI_VERIFIED' },
  'DMK': { id: 'ORG-PARTY-DMK', name: 'Dravida Munnetra Kazhagam', shortName: 'DMK', ecPartyCode: 'DMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN', eciStatus: 'ECI_VERIFIED' },
  'AIADMK': { id: 'ORG-PARTY-AIADMK', name: 'All India Anna Dravida Munnetra Kazhagam', shortName: 'AIADMK', ecPartyCode: 'AIADMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN', eciStatus: 'ECI_VERIFIED' },
  'TDP': { id: 'ORG-PARTY-TDP', name: 'Telugu Desam Party', shortName: 'TDP', ecPartyCode: 'TDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP', eciStatus: 'ECI_VERIFIED' },
  'YSRCP': { id: 'ORG-PARTY-YSRCP', name: 'YSR Congress Party', shortName: 'YSRCP', ecPartyCode: 'YSRCP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP', eciStatus: 'ECI_VERIFIED' },
  'JSP': { id: 'ORG-PARTY-JSP', name: 'Jana Sena Party', shortName: 'JSP', ecPartyCode: 'JSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AP', eciStatus: 'ECI_VERIFIED' },
  'BRS': { id: 'ORG-PARTY-BRS', name: 'Bharat Rashtra Samithi', shortName: 'BRS', ecPartyCode: 'BRS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG', eciStatus: 'ECI_VERIFIED' },
  'TRS': { id: 'ORG-PARTY-TRS', name: 'Telangana Rashtra Samithi (historical predecessor)', shortName: 'TRS', ecPartyCode: 'TRS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG', eciStatus: 'ECI_VERIFIED' },
  'AIMIM': { id: 'ORG-PARTY-AIMIM', name: 'All India Majlis-e-Ittehadul Muslimeen', shortName: 'AIMIM', ecPartyCode: 'AIMIM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TG', eciStatus: 'ECI_VERIFIED' },
  'SP': { id: 'ORG-PARTY-SP', name: 'Samajwadi Party', shortName: 'SP', ecPartyCode: 'SP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP', eciStatus: 'ECI_VERIFIED' },
  'RJD': { id: 'ORG-PARTY-RJD', name: 'Rashtriya Janata Dal', shortName: 'RJD', ecPartyCode: 'RJD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR', eciStatus: 'ECI_VERIFIED' },
  'JDU': { id: 'ORG-PARTY-JDU', name: 'Janata Dal (United)', shortName: 'JD(U)', ecPartyCode: 'JD(U)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR', eciStatus: 'ECI_VERIFIED' },
  'JDS': { id: 'ORG-PARTY-JDS', name: 'Janata Dal (Secular)', shortName: 'JD(S)', ecPartyCode: 'JD(S)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KA', eciStatus: 'ECI_VERIFIED' },
  'BJD': { id: 'ORG-PARTY-BJD', name: 'Biju Janata Dal', shortName: 'BJD', ecPartyCode: 'BJD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'OD', eciStatus: 'ECI_VERIFIED' },
  'SHS': { id: 'ORG-PARTY-SHS', name: 'Shiv Sena', shortName: 'SHS', ecPartyCode: 'SHS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH', eciStatus: 'ECI_VERIFIED' },
  'SHSUBT': { id: 'ORG-PARTY-SHSUBT', name: 'Shiv Sena (Uddhav Balasaheb Thackeray)', shortName: 'SHS(UBT)', ecPartyCode: 'SHSUBT', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH', eciStatus: 'ECI_VERIFIED' },
  'NCP': { id: 'ORG-PARTY-NCP', name: 'Nationalist Congress Party', shortName: 'NCP', ecPartyCode: 'NCP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH', eciStatus: 'ECI_VERIFIED' },
  'NCPSP': { id: 'ORG-PARTY-NCPSP', name: 'Nationalist Congress Party (Sharadchandra Pawar)', shortName: 'NCP(SP)', ecPartyCode: 'NCPSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH', eciStatus: 'ECI_VERIFIED' },
  'CPI': { id: 'ORG-PARTY-CPI', name: 'Communist Party of India', shortName: 'CPI', ecPartyCode: 'CPI', recognitionLevel: 'state', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'CPIML': { id: 'ORG-PARTY-CPIML', name: 'Communist Party of India (Marxist-Leninist) Liberation', shortName: 'CPI(ML)L', ecPartyCode: 'CPI(ML)L', recognitionLevel: 'state', orgType: 'political_party', hqState: 'DL', eciStatus: 'ECI_VERIFIED' },
  'JMM': { id: 'ORG-PARTY-JMM', name: 'Jharkhand Mukti Morcha', shortName: 'JMM', ecPartyCode: 'JMM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JH', eciStatus: 'ECI_VERIFIED' },
  'AJSU': { id: 'ORG-PARTY-AJSU', name: 'All Jharkhand Students Union', shortName: 'AJSU', ecPartyCode: 'AJSU', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JH', eciStatus: 'ECI_VERIFIED' },
  'JKNC': { id: 'ORG-PARTY-JKNC', name: 'Jammu & Kashmir National Conference', shortName: 'JKNC', ecPartyCode: 'JKNC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK', eciStatus: 'ECI_VERIFIED' },
  'JKPDP': { id: 'ORG-PARTY-JKPDP', name: 'Jammu & Kashmir Peoples Democratic Party', shortName: 'JKPDP', ecPartyCode: 'JKPDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK', eciStatus: 'ECI_VERIFIED' },
  'JKPC': { id: 'ORG-PARTY-JKPC', name: "Jammu & Kashmir People's Conference", shortName: 'JKPC', ecPartyCode: 'JKPC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'JK', eciStatus: 'SEED_OBSERVED' },
  'JKNPP': { id: 'ORG-PARTY-JKNPP', name: 'Jammu & Kashmir National Panthers Party', shortName: 'JKNPP', ecPartyCode: 'JKNPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'JK', eciStatus: 'ECI_VERIFIED' },
  'SKM': { id: 'ORG-PARTY-SKM', name: 'Sikkim Krantikari Morcha', shortName: 'SKM', ecPartyCode: 'SKM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'SK', eciStatus: 'ECI_VERIFIED' },
  'SDF': { id: 'ORG-PARTY-SDF', name: 'Sikkim Democratic Front', shortName: 'SDF', ecPartyCode: 'SDF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'SK', eciStatus: 'ECI_VERIFIED' },
  'NDPP': { id: 'ORG-PARTY-NDPP', name: 'Nationalist Democratic Progressive Party', shortName: 'NDPP', ecPartyCode: 'NDPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'NL', eciStatus: 'ECI_VERIFIED' },
  'NPF': { id: 'ORG-PARTY-NPF', name: "Naga People's Front", shortName: 'NPF', ecPartyCode: 'NPF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'NL', eciStatus: 'ECI_VERIFIED' },
  'ZPM': { id: 'ORG-PARTY-ZPM', name: "Zoram People's Movement", shortName: 'ZPM', ecPartyCode: 'ZPM', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MZ', eciStatus: 'ECI_VERIFIED' },
  'MNF': { id: 'ORG-PARTY-MNF', name: 'Mizo National Front', shortName: 'MNF', ecPartyCode: 'MNF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MZ', eciStatus: 'ECI_VERIFIED' },
  'UDP': { id: 'ORG-PARTY-UDP', name: 'United Democratic Party', shortName: 'UDP', ecPartyCode: 'UDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML', eciStatus: 'ECI_VERIFIED' },
  'HSPDP': { id: 'ORG-PARTY-HSPDP', name: "Hill State People's Democratic Party", shortName: 'HSPDP', ecPartyCode: 'HSPDP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML', eciStatus: 'ECI_VERIFIED' },
  'VPP': { id: 'ORG-PARTY-VPP', name: 'Voice of the People Party', shortName: 'VPP', ecPartyCode: 'VPP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'ML', eciStatus: 'ECI_VERIFIED' },
  'GNC': { id: 'ORG-PARTY-GNC', name: 'Garo National Council', shortName: 'GNC', ecPartyCode: 'GNC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'ML', eciStatus: 'SEED_OBSERVED' },
  'AGP': { id: 'ORG-PARTY-AGP', name: 'Asom Gana Parishad', shortName: 'AGP', ecPartyCode: 'AGP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS', eciStatus: 'ECI_VERIFIED' },
  'BPF': { id: 'ORG-PARTY-BPF', name: "Bodoland People's Front", shortName: 'BPF', ecPartyCode: 'BPF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS', eciStatus: 'ECI_VERIFIED' },
  'UPPL': { id: 'ORG-PARTY-UPPL', name: "United People's Party Liberal", shortName: 'UPPL', ecPartyCode: 'UPPL', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS', eciStatus: 'ECI_VERIFIED' },
  'AIUDF': { id: 'ORG-PARTY-AIUDF', name: 'All India United Democratic Front', shortName: 'AIUDF', ecPartyCode: 'AIUDF', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AS', eciStatus: 'ECI_VERIFIED' },
  'RD': { id: 'ORG-PARTY-RD', name: 'Raijor Dal', shortName: 'RD', ecPartyCode: 'RD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'AS', eciStatus: 'SEED_OBSERVED' },
  'TMP': { id: 'ORG-PARTY-TMP', name: 'Tipra Motha Party', shortName: 'TMP', ecPartyCode: 'TMP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TR', eciStatus: 'ECI_VERIFIED' },
  'IPFT': { id: 'ORG-PARTY-IPFT', name: "Indigenous People's Front of Tripura", shortName: 'IPFT', ecPartyCode: 'IPFT', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TR', eciStatus: 'ECI_VERIFIED' },
  'IUML': { id: 'ORG-PARTY-IUML', name: 'Indian Union Muslim League', shortName: 'IUML', ecPartyCode: 'IUML', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL', eciStatus: 'ECI_VERIFIED' },
  'KCM': { id: 'ORG-PARTY-KCM', name: 'Kerala Congress (M)', shortName: 'KC(M)', ecPartyCode: 'KC(M)', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL', eciStatus: 'ECI_VERIFIED' },
  'KC': { id: 'ORG-PARTY-KC', name: 'Kerala Congress (Joseph)', shortName: 'KC', ecPartyCode: 'KEC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL', eciStatus: 'ECI_VERIFIED' },
  'KCB': { id: 'ORG-PARTY-KCB', name: 'Kerala Congress (B)', shortName: 'KC(B)', ecPartyCode: 'KECB', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'KCJ': { id: 'ORG-PARTY-KCJ', name: 'Kerala Congress (Jacob)', shortName: 'KC(J)', ecPartyCode: 'KECJ', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'CMPJ': { id: 'ORG-PARTY-CMPJ', name: 'Communist Marxist Party (John)', shortName: 'CMP(J)', ecPartyCode: 'CMP(J)', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'RSP': { id: 'ORG-PARTY-RSP', name: 'Revolutionary Socialist Party', shortName: 'RSP', ecPartyCode: 'RSP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'KL', eciStatus: 'ECI_VERIFIED' },
  'INL': { id: 'ORG-PARTY-INL', name: 'Indian National League', shortName: 'INL', ecPartyCode: 'INL', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'NSC': { id: 'ORG-PARTY-NSC', name: 'National Secular Conference', shortName: 'NSC', ecPartyCode: 'NSC', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'RMPI': { id: 'ORG-PARTY-RMPI', name: 'Revolutionary Marxist Party of India', shortName: 'RMPI', ecPartyCode: 'RMPI', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'CS': { id: 'ORG-PARTY-CS', name: 'Congress (Secular)', shortName: 'CS', ecPartyCode: 'CONS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KL', eciStatus: 'SEED_OBSERVED' },
  'AINRC': { id: 'ORG-PARTY-AINRC', name: 'All India N.R. Congress', shortName: 'AINRC', ecPartyCode: 'AINRC', recognitionLevel: 'state', orgType: 'political_party', hqState: 'PY', eciStatus: 'ECI_VERIFIED' },
  'PMK': { id: 'ORG-PARTY-PMK', name: 'Pattali Makkal Katchi', shortName: 'PMK', ecPartyCode: 'PMK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN', eciStatus: 'ECI_VERIFIED' },
  'VCK': { id: 'ORG-PARTY-VCK', name: 'Viduthalai Chiruthaigal Katchi', shortName: 'VCK', ecPartyCode: 'VCK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN', eciStatus: 'ECI_VERIFIED' },
  'MDMK': { id: 'ORG-PARTY-MDMK', name: 'Marumalarchi Dravida Munnetra Kazhagam', shortName: 'MDMK', ecPartyCode: 'MDMK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'AMMK': { id: 'ORG-PARTY-AMMK', name: 'Amma Makkal Munnettra Kazagam', shortName: 'AMMK', ecPartyCode: 'AMMK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'TVK': { id: 'ORG-PARTY-TVK', name: 'Tamilaga Vettri Kazhagam', shortName: 'TVK', ecPartyCode: 'TVK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'MNM': { id: 'ORG-PARTY-MNM', name: 'Makkal Needhi Maiam', shortName: 'MNM', ecPartyCode: 'MNM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'NTK': { id: 'ORG-PARTY-NTK', name: 'Naam Tamilar Katchi', shortName: 'NTK', ecPartyCode: 'NTK', recognitionLevel: 'state', orgType: 'political_party', hqState: 'TN', eciStatus: 'ECI_VERIFIED' },
  'DMDK': { id: 'ORG-PARTY-DMDK', name: 'Desiya Murpokku Dravida Kazhagam', shortName: 'DMDK', ecPartyCode: 'DMDK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'SAD': { id: 'ORG-PARTY-SAD', name: 'Shiromani Akali Dal', shortName: 'SAD', ecPartyCode: 'SAD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'PB', eciStatus: 'ECI_VERIFIED' },
  'INLD': { id: 'ORG-PARTY-INLD', name: 'Indian National Lok Dal', shortName: 'INLD', ecPartyCode: 'INLD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'HR', eciStatus: 'ECI_VERIFIED' },
  'HLP': { id: 'ORG-PARTY-HLP', name: 'Haryana Lokhit Party', shortName: 'HLP', ecPartyCode: 'HLP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'HR', eciStatus: 'SEED_OBSERVED' },
  'HJSP': { id: 'ORG-PARTY-HJSP', name: 'Haryana Jansevak Party', shortName: 'HJSP', ecPartyCode: 'HJSP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'HR', eciStatus: 'SEED_OBSERVED' },
  'RLD': { id: 'ORG-PARTY-RLD', name: 'Rashtriya Lok Dal', shortName: 'RLD', ecPartyCode: 'RLD', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP', eciStatus: 'ECI_VERIFIED' },
  'ADAL': { id: 'ORG-PARTY-ADAL', name: 'Apna Dal (Sonelal)', shortName: 'AD(S)', ecPartyCode: 'ADAL', recognitionLevel: 'state', orgType: 'political_party', hqState: 'UP', eciStatus: 'ECI_VERIFIED' },
  'NISHAD': { id: 'ORG-PARTY-NISHAD', name: 'Nirbal Indian Shoshit Hamara Aam Dal', shortName: 'NISHAD', ecPartyCode: 'NISHAD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP', eciStatus: 'SEED_OBSERVED' },
  'SBSP': { id: 'ORG-PARTY-SBSP', name: 'Suheldev Bharatiya Samaj Party', shortName: 'SBSP', ecPartyCode: 'SBSP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP', eciStatus: 'SEED_OBSERVED' },
  'ASPKR': { id: 'ORG-PARTY-ASPKR', name: 'Azad Samaj Party (Kanshi Ram)', shortName: 'ASP(KR)', ecPartyCode: 'ASPKR', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP', eciStatus: 'SEED_OBSERVED' },
  'JSD': { id: 'ORG-PARTY-JSD', name: 'Jansatta Dal (Loktantrik)', shortName: 'JSD(L)', ecPartyCode: 'JSD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UP', eciStatus: 'SEED_OBSERVED' },
  'LJPRV': { id: 'ORG-PARTY-LJPRV', name: 'Lok Janshakti Party (Ram Vilas)', shortName: 'LJP(RV)', ecPartyCode: 'LJPRV', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR', eciStatus: 'ECI_VERIFIED' },
  'LJP': { id: 'ORG-PARTY-LJP', name: 'Lok Janshakti Party (pre-split historical)', shortName: 'LJP', ecPartyCode: 'LJP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'BR', eciStatus: 'ECI_VERIFIED' },
  'HAMS': { id: 'ORG-PARTY-HAMS', name: 'Hindustani Awam Morcha (Secular)', shortName: 'HAM(S)', ecPartyCode: 'HAMS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR', eciStatus: 'SEED_OBSERVED' },
  'VIP': { id: 'ORG-PARTY-VIP', name: 'Vikassheel Insaan Party', shortName: 'VIP', ecPartyCode: 'VIP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR', eciStatus: 'SEED_OBSERVED' },
  'BAP': { id: 'ORG-PARTY-BAP', name: 'Bharat Adivasi Party', shortName: 'BAP', ecPartyCode: 'BAP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'RJ', eciStatus: 'ECI_VERIFIED' },
  'RLP': { id: 'ORG-PARTY-RLP', name: 'Rashtriya Loktantrik Party', shortName: 'RLP', ecPartyCode: 'RLP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'RJ', eciStatus: 'ECI_VERIFIED' },
  'MGP': { id: 'ORG-PARTY-MGP', name: 'Maharashtrawadi Gomantak Party', shortName: 'MGP', ecPartyCode: 'MAG', recognitionLevel: 'state', orgType: 'political_party', hqState: 'GA', eciStatus: 'ECI_VERIFIED' },
  'GFP': { id: 'ORG-PARTY-GFP', name: 'Goa Forward Party', shortName: 'GFP', ecPartyCode: 'GFP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'GA', eciStatus: 'SEED_OBSERVED' },
  'RGP': { id: 'ORG-PARTY-RGP', name: 'Revolutionary Goans Party', shortName: 'RGP', ecPartyCode: 'RGP', recognitionLevel: 'state', orgType: 'political_party', hqState: 'GA', eciStatus: 'ECI_VERIFIED' },
  'MNS': { id: 'ORG-PARTY-MNS', name: 'Maharashtra Navnirman Sena', shortName: 'MNS', ecPartyCode: 'MNS', recognitionLevel: 'state', orgType: 'political_party', hqState: 'MH', eciStatus: 'ECI_VERIFIED' },
  'PWPI': { id: 'ORG-PARTY-PWPI', name: 'Peasants and Workers Party of India', shortName: 'PWPI', ecPartyCode: 'PWPI', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'JSS': { id: 'ORG-PARTY-JSS', name: 'Jan Surajya Shakti', shortName: 'JSS', ecPartyCode: 'JSS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'RPIA': { id: 'ORG-PARTY-RPIA', name: 'Republican Party of India (Athawale)', shortName: 'RPI(A)', ecPartyCode: 'RPI(A)', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'RSPP': { id: 'ORG-PARTY-RSPP', name: 'Rashtriya Samaj Paksha', shortName: 'RSPP', ecPartyCode: 'RSPS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'YYP': { id: 'ORG-PARTY-YYP', name: 'Yuva Swabhiman Party', shortName: 'YYP', ecPartyCode: 'YYP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'KRPP': { id: 'ORG-PARTY-KRPP', name: 'Kalyana Rajya Pragathi Paksha', shortName: 'KRPP', ecPartyCode: 'KRPP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA', eciStatus: 'SEED_OBSERVED' },
  'SKP': { id: 'ORG-PARTY-SKP', name: 'Sarvodaya Karnataka Paksha', shortName: 'SKP', ecPartyCode: 'SKP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA', eciStatus: 'SEED_OBSERVED' },
  'KJP': { id: 'ORG-PARTY-KJP', name: 'Karnataka Janata Paksha', shortName: 'KJP', ecPartyCode: 'KJP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA', eciStatus: 'SEED_OBSERVED' },
  'BSRCP': { id: 'ORG-PARTY-BSRCP', name: 'BSR Congress', shortName: 'BSRCP', ecPartyCode: 'BSRCP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'KA', eciStatus: 'SEED_OBSERVED' },
  'JLKM': { id: 'ORG-PARTY-JLKM', name: 'Jharkhand Loktantrik Krantikari Morcha', shortName: 'JLKM', ecPartyCode: 'JLKM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'JH', eciStatus: 'SEED_OBSERVED' },
  'GGP': { id: 'ORG-PARTY-GGP', name: 'Gondwana Gantantra Party', shortName: 'GGP', ecPartyCode: 'GGP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MP', eciStatus: 'SEED_OBSERVED' },
  'AIFB': { id: 'ORG-PARTY-AIFB', name: 'All India Forward Bloc', shortName: 'AIFB', ecPartyCode: 'AIFB', recognitionLevel: 'state', orgType: 'political_party', hqState: 'WB', eciStatus: 'ECI_VERIFIED' },
  'ISF': { id: 'ORG-PARTY-ISF', name: 'Indian Secular Front', shortName: 'ISF', ecPartyCode: 'ISF', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'WB', eciStatus: 'SEED_OBSERVED' },
  'GJM': { id: 'ORG-PARTY-GJM', name: 'Gorkha Janmukti Morcha', shortName: 'GJM', ecPartyCode: 'GJM', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'WB', eciStatus: 'SEED_OBSERVED' },
  'PPA': { id: 'ORG-PARTY-PPA', name: "People's Party of Arunachal", shortName: 'PPA', ecPartyCode: 'PPA', recognitionLevel: 'state', orgType: 'political_party', hqState: 'AR', eciStatus: 'ECI_VERIFIED' },
  'KPA': { id: 'ORG-PARTY-KPA', name: "Kuki People's Alliance", shortName: 'KPA', ecPartyCode: 'KPA', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MN', eciStatus: 'SEED_OBSERVED' },
  'UKD': { id: 'ORG-PARTY-UKD', name: 'Uttarakhand Kranti Dal', shortName: 'UKD', ecPartyCode: 'UKD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UK', eciStatus: 'SEED_OBSERVED' },
  'UJP': { id: 'ORG-PARTY-UJP', name: 'Uttarakhand Janata Party', shortName: 'UJP', ecPartyCode: 'UJP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'UK', eciStatus: 'SEED_OBSERVED' },
  'LJD': { id: 'ORG-PARTY-LJD', name: 'Loktantrik Janata Dal (merged into RJD)', shortName: 'LJD', ecPartyCode: 'LJD', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'BR', eciStatus: 'SEED_OBSERVED' },
  'PDF': { id: 'ORG-PARTY-PDF', name: "People's Democratic Front (Meghalaya, merged into NPP)", shortName: 'PDF', ecPartyCode: 'PDF', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'ML', eciStatus: 'SEED_OBSERVED' },
  'LJK': { id: 'ORG-PARTY-LJK', name: 'Lok Jananayaga Katchi', shortName: 'LJK', ecPartyCode: 'LJK', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'TN', eciStatus: 'SEED_OBSERVED' },
  'VTPP': { id: 'ORG-PARTY-VTPP', name: 'Vanchit Bahujan Aghadi / Vidarbha Rajya Parivarthan', shortName: 'VTPP', ecPartyCode: 'VTPP', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'MH', eciStatus: 'SEED_OBSERVED' },
  'RJS': { id: 'ORG-PARTY-RJS', name: 'Rashtriya Janata Sena', shortName: 'RaJS', ecPartyCode: 'RJS', recognitionLevel: 'unrecognized', orgType: 'political_party', hqState: 'RJ', eciStatus: 'SEED_OBSERVED' },

  // Alliances
  'NDA': { id: 'ORG-ALLIANCE-NDA', name: 'National Democratic Alliance', shortName: 'NDA', ecPartyCode: null, recognitionLevel: 'unrecognized', orgType: 'political_alliance', hqState: 'DL', eciStatus: 'SEED_OBSERVED' }
};

// 2. Multilingual Representations Registry (GAP-ORG-001)
const MULTILINGUAL_IDENTITIES = [
  { orgId: 'ORG-PARTY-BJP', lang: 'hi', script: 'Deva', type: 'OFFICIAL', name: 'भारतीय जनता पार्टी', short: 'भाजपा', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-BJP', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'భారతీయ జనతా పార్టీ', short: 'భాజపా', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-BJP', lang: 'ta', script: 'Taml', type: 'OFFICIAL', name: 'பாரதிய ஜனதா கட்சி', short: 'பாஜக', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-INC', lang: 'hi', script: 'Deva', type: 'OFFICIAL', name: 'भारतीय राष्ट्रीय कांग्रेस', short: 'कांग्रेस', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-INC', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'భారత జాతీయ కాంగ్రెస్', short: 'కాంగ్రెస్', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-INC', lang: 'ta', script: 'Taml', type: 'OFFICIAL', name: 'இந்திய தேசிய காங்கிரசு', short: 'காங்கிரஸ்', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-BRS', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'భారత్ రాష్ట్ర సమితి', short: 'బీఆర్ఎస్', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-TRS', lang: 'te', script: 'Telu', type: 'HISTORICAL', name: 'తెలంగాణ రాష్ట్ర సమితి', short: 'తెరాస', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-TDP', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'తెలుగుదేశం పార్టీ', short: 'తెదేపా', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-YSRCP', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'వైఎస్సార్ కాంగ్రెస్ పార్టీ', short: 'వైసీపీ', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-JSP', lang: 'te', script: 'Telu', type: 'OFFICIAL', name: 'జనసేన పార్టీ', short: 'జనసేన', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AIMIM', lang: 'ur', script: 'Arab', type: 'OFFICIAL', name: 'کل ہند مجلس اتحاد المسلمین', short: 'مجلس', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-DMK', lang: 'ta', script: 'Taml', type: 'OFFICIAL', name: 'திராவிட முன்னேற்றக் கழகம்', short: 'திமுக', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AIADMK', lang: 'ta', script: 'Taml', type: 'OFFICIAL', name: 'அனைத்திந்திய அண்ணா திராவிட முன்னேற்றக் கழகம்', short: 'அதிமுக', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AITC', lang: 'bn', script: 'Beng', type: 'OFFICIAL', name: 'সর্বভারতীয় তৃণমূল কংগ্রেস', short: 'তৃণমূল', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-CPIM', lang: 'bn', script: 'Beng', type: 'OFFICIAL', name: 'ভারতের কমিউনিস্ট পার্টি (মার্ক্সবাদী)', short: 'সিপিআই(এম)', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-CPIM', lang: 'ml', script: 'Mlym', type: 'OFFICIAL', name: 'കമ്യൂണിസ്റ്റ് പാർട്ടി ഓഫ് ഇന്ത്യ (മാർക്സിസ്റ്റ്)', short: 'സിപിഐ(എം)', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-SHS', lang: 'mr', script: 'Deva', type: 'OFFICIAL', name: 'शिवसेना', short: 'शिवसेना', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-SHSUBT', lang: 'mr', script: 'Deva', type: 'OFFICIAL', name: 'शिवसेना (उद्धव बाळासाहेब ठाकरे)', short: 'शिवसेना (उबाठा)', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-NCP', lang: 'mr', script: 'Deva', type: 'OFFICIAL', name: 'राष्ट्रवादी काँग्रेस पक्ष', short: 'राकाँप', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-NCPSP', lang: 'mr', script: 'Deva', type: 'OFFICIAL', name: 'राष्ट्रवादी काँग्रेस पक्ष (शरदचंद्र पवार)', short: 'राकाँप (शप)', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AAP', lang: 'hi', script: 'Deva', type: 'OFFICIAL', name: 'आम आदमी पार्टी', short: 'आप', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AAP', lang: 'pa', script: 'Guru', type: 'OFFICIAL', name: 'ਆਮ ਆਦਮੀ ਪਾਰਟੀ', short: 'ਆਪ', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-SAD', lang: 'pa', script: 'Guru', type: 'OFFICIAL', name: 'ਸ਼੍ਰੋਮਣੀ ਅਕਾਲੀ ਦਲ', short: 'ਅਕਾਲੀ ਦਲ', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-JDS', lang: 'kn', script: 'Knda', type: 'OFFICIAL', name: 'ಜನತಾ ದಳ (ಜಾತ್ಯತೀತ)', short: 'ಜೆಡಿಎಸ್', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-BJD', lang: 'or', script: 'Orya', type: 'OFFICIAL', name: 'ବିଜୁ ଜନତା ଦଳ', short: 'ବିଜେଡି', isOfficial: true, isPreferred: true },
  { orgId: 'ORG-PARTY-AGP', lang: 'as', script: 'Beng', type: 'OFFICIAL', name: 'অসম গণ পৰিষদ', short: 'অগপ', isOfficial: true, isPreferred: true }
];

// 3. Temporal Symbols Registry (GAP-ORG-003)
const TEMPORAL_SYMBOLS = [
  { orgId: 'ORG-PARTY-BJP', symbolName: 'Lotus', validFrom: '1980-04-06', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Allotment Order' },
  { orgId: 'ORG-PARTY-INC', symbolName: 'Hand', validFrom: '1978-01-01', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Notification No. 56/1978' },
  { orgId: 'ORG-PARTY-INC', symbolName: 'Calf and Cow', validFrom: '1971-01-01', validTo: '1977-12-31', isCurrent: false, statutoryOrderRef: 'ECI Historical Symbol' },
  { orgId: 'ORG-PARTY-INC', symbolName: 'Two Bullocks with Yoke', validFrom: '1952-01-01', validTo: '1969-11-12', isCurrent: false, statutoryOrderRef: 'ECI Historical Symbol' },
  { orgId: 'ORG-PARTY-AAP', symbolName: 'Broom', validFrom: '2012-11-26', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 2012' },
  { orgId: 'ORG-PARTY-BSP', symbolName: 'Elephant', validFrom: '1984-04-14', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 1984' },
  { orgId: 'ORG-PARTY-CPIM', symbolName: 'Hammer, Sickle and Star', validFrom: '1964-11-07', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 1964' },
  { orgId: 'ORG-PARTY-CPI', symbolName: 'Ears of Corn and Sickle', validFrom: '1952-01-01', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 1952' },
  { orgId: 'ORG-PARTY-TDP', symbolName: 'Bicycle', validFrom: '1982-03-29', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 1982' },
  { orgId: 'ORG-PARTY-BRS', symbolName: 'Car', validFrom: '2022-10-05', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Notification No. 56/2022' },
  { orgId: 'ORG-PARTY-TRS', symbolName: 'Car', validFrom: '2001-04-27', validTo: '2022-10-04', isCurrent: false, statutoryOrderRef: 'ECI Order 2001' },
  { orgId: 'ORG-PARTY-YSRCP', symbolName: 'Ceiling Fan', validFrom: '2011-03-12', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 2011' },
  { orgId: 'ORG-PARTY-JSP', symbolName: 'Glass Tumbler', validFrom: '2014-03-14', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 2014' },
  { orgId: 'ORG-PARTY-AIMIM', symbolName: 'Kite', validFrom: '1958-03-02', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order 1958' },
  { orgId: 'ORG-PARTY-SHS', symbolName: 'Bow and Arrow', validFrom: '2023-02-17', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order No. 56/Dispute/2022' },
  { orgId: 'ORG-PARTY-SHSUBT', symbolName: 'Flaming Torch', validFrom: '2022-10-10', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Notification 56/Dispute/2022' },
  { orgId: 'ORG-PARTY-NCP', symbolName: 'Clock', validFrom: '2024-02-06', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Order No. 56/Dispute/2023' },
  { orgId: 'ORG-PARTY-NCPSP', symbolName: 'Man Blowing Turha (Tutari)', validFrom: '2024-02-22', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Notification 56/Dispute/2023' },
  { orgId: 'ORG-PARTY-LJPRV', symbolName: 'Helicopter', validFrom: '2021-10-05', validTo: null, isCurrent: true, statutoryOrderRef: 'ECI Notification 56/Dispute/2021' }
];

// 4. Organization Relationships (Splits, Mergers, Successors, Alliances)
const ORGANIZATION_RELATIONSHIPS = [
  {
    sourceOrgId: 'ORG-PARTY-TRS',
    targetOrgId: 'ORG-PARTY-BRS',
    relationshipType: 'renamed_to',
    validFrom: '2022-10-05',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'ECI Notification No. 56/2022', previousName: 'Telangana Rashtra Samithi' },
    dataStatus: 'OFFICIAL',
    notes: 'Telangana Rashtra Samithi officially renamed to Bharat Rashtra Samithi.'
  },
  {
    sourceOrgId: 'ORG-PARTY-SHS',
    targetOrgId: 'ORG-PARTY-SHSUBT',
    relationshipType: 'split_from',
    validFrom: '2022-06-25',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'ECI Order 56/Dispute/2022', awardedOriginalName: 'Eknath Shinde Faction' },
    dataStatus: 'OFFICIAL',
    notes: 'Shiv Sena split into original SHS and Uddhav Thackeray faction (SHSUBT).'
  },
  {
    sourceOrgId: 'ORG-PARTY-NCP',
    targetOrgId: 'ORG-PARTY-NCPSP',
    relationshipType: 'split_from',
    validFrom: '2023-07-02',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'ECI Order 56/Dispute/2023', awardedOriginalName: 'Ajit Pawar Faction' },
    dataStatus: 'OFFICIAL',
    notes: 'Nationalist Congress Party split into original NCP and Sharadchandra Pawar faction (NCPSP).'
  },
  {
    sourceOrgId: 'ORG-PARTY-LJP',
    targetOrgId: 'ORG-PARTY-LJPRV',
    relationshipType: 'split_from',
    validFrom: '2021-10-05',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'ECI Order 56/Dispute/2021', leader: 'Chirag Paswan' },
    dataStatus: 'OFFICIAL',
    notes: 'Lok Janshakti Party split into LJP(RV) and Rashtriya Lok Janshakti Party.'
  },
  {
    sourceOrgId: 'ORG-PARTY-LJD',
    targetOrgId: 'ORG-PARTY-RJD',
    relationshipType: 'merged_into',
    validFrom: '2022-03-20',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'National Party Convention Resolution', leader: 'Sharad Yadav' },
    dataStatus: 'OFFICIAL',
    notes: 'Loktantrik Janata Dal led by Sharad Yadav merged into Rashtriya Janata Dal.'
  },
  {
    sourceOrgId: 'ORG-PARTY-PDF',
    targetOrgId: 'ORG-PARTY-NPP',
    relationshipType: 'merged_into',
    validFrom: '2023-05-06',
    validTo: null,
    isCurrent: true,
    metadata: { legalInstrument: 'General Council Resolution', state: 'ML' },
    dataStatus: 'OFFICIAL',
    notes: "People's Democratic Front (Meghalaya) merged into National People's Party."
  },
  {
    sourceOrgId: 'ORG-PARTY-BJP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'coalition_partner',
    validFrom: '1998-05-01',
    validTo: null,
    isCurrent: true,
    metadata: { allianceName: 'National Democratic Alliance', role: 'Lead Partner' },
    dataStatus: 'OFFICIAL',
    notes: 'BJP founded and leads the National Democratic Alliance.'
  },
  {
    sourceOrgId: 'ORG-PARTY-TDP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    validFrom: '2024-03-09',
    validTo: null,
    isCurrent: true,
    metadata: { agreement: '2024 General & AP Assembly Alliance Declaration' },
    dataStatus: 'OFFICIAL',
    notes: 'TDP re-joined NDA alliance in March 2024.'
  },
  {
    sourceOrgId: 'ORG-PARTY-JSP',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    validFrom: '2024-03-09',
    validTo: null,
    isCurrent: true,
    metadata: { agreement: '2024 General & AP Assembly Alliance Declaration' },
    dataStatus: 'OFFICIAL',
    notes: 'JSP electoral alliance with NDA.'
  },
  {
    sourceOrgId: 'ORG-PARTY-JDU',
    targetOrgId: 'ORG-ALLIANCE-NDA',
    relationshipType: 'alliance_with',
    validFrom: '2024-01-28',
    validTo: null,
    isCurrent: true,
    metadata: { agreement: 'NDA Re-entry Agreement 2024' },
    dataStatus: 'OFFICIAL',
    notes: 'JD(U) rejoined NDA in January 2024.'
  }
];

// 5. Special Audit Exception Ledgers
const mpSingleLetterExceptions = [
  { id: 'LS_036', name: 'Sudama Prasad', letter: 'C', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-CPIML', resolvedPartyCode: 'CPIML', confidence: 'VERIFIED', evidence: 'Elected MP for Arrah (BR) 2024 on CPI(ML)L ticket' },
  { id: 'LS_061', name: 'Giridhari Yadav', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Banka (BR) 2024 on JD(U) ticket' },
  { id: 'LS_089', name: 'Ajay Kumar Mandal', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Bhagalpur (BR) 2024 on JD(U) ticket' },
  { id: 'LS_165', name: 'Nalin Soren', letter: 'J', state: 'JH', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JMM', resolvedPartyCode: 'JMM', confidence: 'VERIFIED', evidence: 'Elected MP for Dumka (JH) 2024 on JMM ticket' },
  { id: 'LS_195', name: 'Dr. Alok Kumar Suman', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Gopalganj (BR) 2024 on JD(U) ticket' },
  { id: 'LS_247', name: 'Ramprit Mandal', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Jhanjharpur (BR) 2024 on JD(U) ticket' },
  { id: 'LS_271', name: 'Raja Ram Singh', letter: 'C', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-CPIML', resolvedPartyCode: 'CPIML', confidence: 'VERIFIED', evidence: 'Elected MP for Karakat (BR) 2024 on CPI(ML)L ticket' },
  { id: 'LS_322', name: 'Dinesh Chandra Yadav', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Madhepura (BR) 2024 on JD(U) ticket' },
  { id: 'LS_361', name: 'Rajiv Ranjan Singh Alias Lalan Singh', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Munger (BR) 2024 on JD(U) ticket' },
  { id: 'LS_375', name: 'Kaushalendra Kumar', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Nalanda (BR) 2024 on JD(U) ticket' },
  { id: 'LS_432', name: 'Vijay Kumar Hansdak', letter: 'J', state: 'JH', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JMM', resolvedPartyCode: 'JMM', confidence: 'VERIFIED', evidence: 'Elected MP for Rajmahal (JH) 2024 on JMM ticket' },
  { id: 'LS_464', name: 'Lovely Anand', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Sheohar (BR) 2024 on JD(U) ticket' },
  { id: 'LS_475', name: 'Joba Majhi', letter: 'J', state: 'JH', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JMM', resolvedPartyCode: 'JMM', confidence: 'VERIFIED', evidence: 'Elected MP for Singhbhum (JH) 2024 on JMM ticket' },
  { id: 'LS_477', name: 'Devesh Chandra Thakur', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Sitamarhi (BR) 2024 on JD(U) ticket' },
  { id: 'LS_480', name: 'Vijaylakshmi Devi', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Siwan (BR) 2024 on JD(U) ticket' },
  { id: 'LS_492', name: 'Dileshwar Kamait', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Supaul (BR) 2024 on JD(U) ticket' },
  { id: 'LS_528', name: 'Sunil Kumar', letter: 'J', state: 'BR', house: 'lok_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected MP for Valmiki Nagar (BR) 2024 on JD(U) ticket' },
  { id: 'RS_005', name: 'Khiru Mahto', letter: 'J', state: 'BR', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'Elected Rajya Sabha MP from Bihar 2022 on JD(U) ticket' },
  { id: 'RS_006', name: 'Mahua Maji', letter: 'J', state: 'JH', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-JMM', resolvedPartyCode: 'JMM', confidence: 'VERIFIED', evidence: 'Elected Rajya Sabha MP from Jharkhand 2022 on JMM ticket' },
  { id: 'RS_012', name: 'Jose K. Mani', letter: 'K', state: 'KL', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-KCM', resolvedPartyCode: 'KC(M)', confidence: 'VERIFIED', evidence: 'Chairman KC(M), elected Rajya Sabha MP 2024' },
  { id: 'RS_022', name: 'Sudha Murty', letter: 'N', state: 'NO', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isNominated: true, confidence: 'VERIFIED', evidence: 'Nominated by President of India under Art 80(1)(a) March 2024; non-party member' },
  { id: 'RS_028', name: 'Rwngwra Narzary', letter: 'U', state: 'AS', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-UPPL', resolvedPartyCode: 'UPPL', confidence: 'VERIFIED', evidence: 'Working President UPPL, elected Rajya Sabha MP from Assam 2022' },
  { id: 'RS_036', name: 'Gurwinder Singh Oberoi', letter: 'J', state: 'JK', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-JKNC', resolvedPartyCode: 'JKNC', confidence: 'VERIFIED', evidence: 'Treasurer JKNC, elected Rajya Sabha MP from Jammu & Kashmir 2025' },
  { id: 'RS_045', name: 'Sharadchandra Pawar', letter: 'N', state: 'MH', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-NCPSP', resolvedPartyCode: 'NCP(SP)', confidence: 'VERIFIED', evidence: 'Founder President NCP(SP), elected Rajya Sabha MP from Maharashtra' },
  { id: 'RS_049', name: 'V. Vijayendra Prasad', letter: 'N', state: 'NO', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isNominated: true, confidence: 'VERIFIED', evidence: 'Nominated by President under Art 80(1)(a) July 2022; non-party member' },
  { id: 'RS_055', name: 'Anbumani Ramadoss', letter: 'P', state: 'TN', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-PMK', resolvedPartyCode: 'PMK', confidence: 'VERIFIED', evidence: 'President PMK, elected Rajya Sabha MP from Tamil Nadu' },
  { id: 'RS_059', name: 'Chowdry Mohammad Ramzan', letter: 'J', state: 'JK', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-JKNC', resolvedPartyCode: 'JKNC', confidence: 'VERIFIED', evidence: 'Additional General Secretary JKNC, elected Rajya Sabha MP from J&K 2025' },
  { id: 'RS_062', name: 'Sanjay Raut', letter: 'S', state: 'MH', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-SHSUBT', resolvedPartyCode: 'SHS(UBT)', confidence: 'VERIFIED', evidence: 'Leader SHS(UBT), elected Rajya Sabha MP from Maharashtra' },
  { id: 'RS_064', name: 'Dilip Kumar Ray', letter: 'I', state: 'OD', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isIndependent: true, confidence: 'VERIFIED', evidence: 'Elected Rajya Sabha MP from Odisha March 2026 as Independent candidate' },
  { id: 'RS_084', name: 'Kartikeya Sharma', letter: 'I', state: 'HR', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isIndependent: true, confidence: 'VERIFIED', evidence: 'Elected Rajya Sabha MP from Haryana 2022 as Independent candidate' },
  { id: 'RS_088', name: 'Shri Harivansh', letter: 'N', state: 'NO', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isNominated: true, confidence: 'VERIFIED', evidence: 'Nominated by President of India April 2026 (Journalism quota); Deputy Chairman RS' },
  { id: 'RS_091', name: 'Kapil Sibal', letter: 'I', state: 'UP', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isIndependent: true, confidence: 'VERIFIED', evidence: 'Elected Rajya Sabha MP from UP 2022 as Independent candidate supported by SP' },
  { id: 'RS_115', name: 'L. K. Sudhish', letter: 'D', state: 'TN', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-DMDK', resolvedPartyCode: 'DMDK', confidence: 'VERIFIED', evidence: 'DMDK leader, elected Rajya Sabha MP from Tamil Nadu March 2026' },
  { id: 'RS_122', name: 'Ram Nath Thakur', letter: 'J', state: 'BR', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-JDU', resolvedPartyCode: 'JDU', confidence: 'VERIFIED', evidence: 'JD(U) leader, elected Rajya Sabha MP from Bihar 2020' },
  { id: 'RS_124', name: 'M. Thambi Durai', letter: 'A', state: 'TN', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-AIADMK', resolvedPartyCode: 'AIADMK', confidence: 'VERIFIED', evidence: 'AIADMK leader, elected Rajya Sabha MP from Tamil Nadu 2020' },
  { id: 'RS_129', name: 'P. T. Usha', letter: 'N', state: 'NO', house: 'rajya_sabha', resolvedPartyId: null, resolvedPartyCode: null, isNominated: true, confidence: 'VERIFIED', evidence: 'Nominated by President of India under Art 80(1)(a) July 2022; non-party member' },
  { id: 'RS_132', name: 'K. Vanlalvena', letter: 'M', state: 'MZ', house: 'rajya_sabha', resolvedPartyId: 'ORG-PARTY-MNF', resolvedPartyCode: 'MNF', confidence: 'VERIFIED', evidence: 'MNF leader, elected Rajya Sabha MP from Mizoram 2020' }
];

const mlaTruncatedExceptions = [
  { raw: 'AIMM', occurrences: 7, file: 'bihar-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-AIMIM', confidence: 'VERIFIED', evidence: 'All 7 candidates won/contested on AIMIM symbol in Seemanchal Bihar 2020' },
  { raw: 'CPI(ML', occurrences: 15, file: 'bihar-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-CPIML', confidence: 'VERIFIED', evidence: 'All 15 MLAs (e.g. Sandeep Saurav, Gopal Ravidas) are elected members of CPI-ML Liberation' },
  { raw: 'Apna Dal (', occurrences: 13, file: 'uttar-pradesh-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-ADAL', confidence: 'VERIFIED', evidence: 'All 13 MLAs (e.g. Vachaspati, Jay Kumar Singh) are elected members of Apna Dal (Sonelal)' },
  { raw: 'Jansatta D', occurrences: 1, file: 'uttar-pradesh-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-JSD', confidence: 'VERIFIED', evidence: 'MLA Lokendra Pratap Singh contested on Jansatta Dal (Loktantrik)' },
  { raw: 'RPI(', occurrences: 2, file: 'nagaland-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-RPIA', confidence: 'VERIFIED', evidence: 'MLAs Y. Lima Onen Chang (AC-51) & Imtichoba (AC-54) won on Republican Party of India (Athawale)' },
  { raw: 'CONGRESS(', occurrences: 1, file: 'kerala-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-CS', confidence: 'VERIFIED', evidence: 'MLA Kadannappalli Ramachandran won Kannur AC-11 on Congress (Secular)' },
  { raw: 'LOKTANTRIK', occurrences: 1, file: 'kerala-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-LJD', confidence: 'VERIFIED', evidence: 'MLA K. P. Mohanan won Kuthuparamba AC-14 on Loktantrik Janata Dal' },
  { raw: 'NATIONALS', occurrences: 1, file: 'kerala-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-NSC', confidence: 'VERIFIED', evidence: 'MLA V. Abdurahman won Tanur AC-44 on Nationalist Secular Conference (LDF)' },
  { raw: 'RASHTRIYA', occurrences: 1, file: 'west-bengal-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-ISF', confidence: 'VERIFIED', evidence: 'MLA Md Nawsad Siddique won Bhangar AC-148 on Rashtriya Secular Majlis / Indian Secular Front' },
  { raw: 'Jan Surajy', occurrences: 2, file: 'maharashtra-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-JSS', confidence: 'VERIFIED', evidence: 'MLAs Vinay Kore (Shahuwadi) & Ashokrao Mane won on Jan Surajya Shakti' },
  { raw: 'Peasants A', occurrences: 1, file: 'maharashtra-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-PWPI', confidence: 'VERIFIED', evidence: 'MLA Babasaheb Deshmukh won Loha on Peasants and Workers Party of India' },
  { raw: 'Rashtriya ', occurrences: 2, file: 'maharashtra-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-YYP', confidence: 'RECONCILED', evidence: 'Ravi Rana (Badnera) heads Yuva Swabhiman Party; Ratnakar Gutte (Gangakhed) contested RSPP' },
  { raw: 'Kalyana Ra', occurrences: 1, file: 'karnataka-mla-profiles.ts', resolvedPartyId: 'ORG-PARTY-KRPP', confidence: 'VERIFIED', evidence: 'MLA Janardhan Reddy won Gangawati on Kalyana Rajya Pragathi Paksha' }
];

// 6. Reconciliation Ledger V2 Builder
const reconciliationRecordsV2 = [];

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
  let confidence = 'VERIFIED';
  let notes = '';

  // Rule 1: Compound "Party - Candidate"
  if (raw.includes(' - ')) {
    resolutionType = 'COMPOUND_CANDIDATE_STRING';
    const parts = raw.split(' - ');
    const partyPrefix = parts[0].trim();
    candidateExtracted = parts.slice(1).join(' - ').trim();

    if (partyPrefix === 'IND') {
      isIndependent = true;
      confidence = 'VERIFIED';
      notes = `Independent candidate: ${candidateExtracted}. Map candidacy.is_independent = true.`;
    } else if (partyPrefix === 'SHORTNAM') {
      resolutionType = 'MALFORMED_PLACEHOLDER_STRING';
      canonicalOrgId = 'ORG-PARTY-RJS';
      normalizedPartyCode = 'RaJS';
      confidence = 'PROVISIONAL';
      notes = `Placeholder string SHORTNAM with candidate ${candidateExtracted} in Behror AC-62. ECI candidate affidavit proves Rashtriya Janata Sena; flagged PROVISIONAL pending Form 21E historical gazette audit.`;
    } else if (partyPrefix === 'AAZADSAM') {
      canonicalOrgId = 'ORG-PARTY-ASPKR';
      normalizedPartyCode = 'ASPKR';
      confidence = 'RECONCILED';
      notes = `Azad Samaj Party (Kanshi Ram) alias prefix with candidate ${candidateExtracted}`;
    } else if (partyPrefix === 'Haryana Jan Sevak Party') {
      canonicalOrgId = 'ORG-PARTY-HJSP';
      normalizedPartyCode = 'HJSP';
      confidence = 'VERIFIED';
      notes = `Haryana Jansevak Party full name prefix with candidate ${candidateExtracted}`;
    } else if (STATUTORY_ORGS[partyPrefix]) {
      canonicalOrgId = STATUTORY_ORGS[partyPrefix].id;
      normalizedPartyCode = partyPrefix;
      confidence = 'VERIFIED';
      notes = `Standard party prefix ${partyPrefix} extracted for candidate ${candidateExtracted}`;
    } else {
      resolutionType = 'CONFLICTING';
      confidence = 'CONFLICTING';
      notes = `Unrecognized party prefix ${partyPrefix} in compound string`;
    }
  }
  // Rule 2: Independent
  else if (['IND', 'INDP', 'Independent'].includes(raw)) {
    resolutionType = 'INDEPENDENT_REPRESENTATION';
    isIndependent = true;
    confidence = 'VERIFIED';
    notes = 'Independent political status. NOT an organization; modeled via candidacy.is_independent = true.';
  }
  // Rule 3: NOTA
  else if (['NOTA', 'None of the Above'].includes(raw)) {
    resolutionType = 'STATUTORY_BALLOT_OPTION';
    isNota = true;
    confidence = 'VERIFIED';
    notes = 'None of the Above. Statutory non-candidate ballot counter; modeled as election counter.';
  }
  // Rule 4: Alliances
  else if (['NDA', 'National Democratic Alliance'].includes(raw)) {
    resolutionType = 'ALLIANCE_ENTITY';
    isAlliance = true;
    canonicalOrgId = 'ORG-ALLIANCE-NDA';
    confidence = 'VERIFIED';
    notes = 'Multi-party political alliance; registered in public.political_organizations as org_type: political_alliance.';
  }
  // Rule 5: MP Single-Letter codes
  else if (entry.sources.some(s => s.includes('mp-profiles')) && raw.length === 1) {
    resolutionType = 'CORRUPTED_1LETTER_CODE';
    confidence = 'RECONCILED';
    notes = `Single letter truncated party code '${raw}' in mp-profiles.ts. Reconciled via individual candidate MP records.`;
    if (raw === 'N') {
      isNominated = true;
      notes = `Letter 'N' indicates Nominated Rajya Sabha members (Sudha Murty, Harivansh, etc.). Modeled as nomination method.`;
    } else if (raw === 'I') {
      isIndependent = true;
      notes = `Letter 'I' indicates Independent Rajya Sabha members (Sibal, Ray, Sharma). Modeled as is_independent = true.`;
    }
  }
  // Rule 6: Known truncated MLA strings
  else if (mlaTruncatedExceptions.some(e => e.raw === raw.trim())) {
    resolutionType = 'CORRUPTED_TRUNCATED_STRING';
    const exc = mlaTruncatedExceptions.find(e => e.raw === raw.trim());
    canonicalOrgId = exc.resolvedPartyId;
    normalizedPartyCode = STATUTORY_ORGS[exc.resolvedPartyId.replace('ORG-PARTY-', '')]?.shortName || exc.raw;
    confidence = exc.confidence;
    notes = `${exc.evidence} (file: ${exc.file})`;
  }
  // Rule 7: Aliases
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
  } else if (['CMP(J)', 'Communist Marxist Party (John)', 'CMP'].includes(raw)) {
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
    confidence = 'RECONCILED';
    notes = 'Truncated / placeholder alias for AJSU in Jharkhand';
  } else if (['AJU', 'regional (West Bengal)'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-AIFB';
    normalizedPartyCode = 'AIFB';
    confidence = 'RECONCILED';
    notes = 'Truncated / placeholder alias for All India Forward Bloc in West Bengal';
  } else if (['NMK', 'Nam Tamilar / regional (Puducherry)'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-NTK';
    normalizedPartyCode = 'NTK';
    confidence = 'RECONCILED';
    notes = 'Nam Tamilar Katchi variant code in Puducherry / Tamil Nadu';
  } else if (['JKC', 'J&K regional', "J&K People's Conference"].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JKPC';
    normalizedPartyCode = 'JKPC';
    confidence = 'RECONCILED';
    notes = "J&K People's Conference placeholder";
  } else if (['CONS', 'Conservative / regional'].includes(raw)) {
    resolutionType = 'SYNTHETIC_CODE_ALIAS';
    canonicalOrgId = 'ORG-PARTY-CS';
    normalizedPartyCode = 'CS';
    confidence = 'RECONCILED';
    notes = 'Placeholder for Congress (Secular) in Kerala';
  } else if (raw === 'GONDWANA') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-GGP';
    normalizedPartyCode = 'GGP';
    confidence = 'VERIFIED';
  } else if (raw === 'JDL') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JSD';
    normalizedPartyCode = 'JSD';
    confidence = 'VERIFIED';
  } else if (raw === 'JP') {
    resolutionType = 'STANDARD_ALIAS';
    canonicalOrgId = 'ORG-PARTY-JSP';
    normalizedPartyCode = 'JSP';
    confidence = 'VERIFIED';
  } else if (['Other', 'OTH'].includes(raw)) {
    resolutionType = 'GENERIC_BUCKET_LABEL';
    confidence = 'RECONCILED';
    notes = 'Generic aggregator string for minor parties in seed summaries. Excluded from org insertion.';
  }
  // Rule 8: Exact match against Canonical Organizations
  else if (STATUTORY_ORGS[raw]) {
    resolutionType = 'EXACT_MATCH';
    canonicalOrgId = STATUTORY_ORGS[raw].id;
    normalizedPartyCode = raw;
    confidence = 'VERIFIED';
  } else {
    const matchingByName = Object.values(STATUTORY_ORGS).find(o => o.name.toLowerCase() === raw.toLowerCase());
    if (matchingByName) {
      resolutionType = 'FULL_NAME_MATCH';
      canonicalOrgId = matchingByName.id;
      normalizedPartyCode = matchingByName.shortName;
      confidence = 'VERIFIED';
    } else {
      resolutionType = 'PROVISIONAL_UNRESOLVED';
      confidence = 'PROVISIONAL';
      notes = `Unresolved organization string '${raw}'. Flagged PROVISIONAL.`;
    }
  }

  reconciliationRecordsV2.push({
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
    confidence,
    sources: entry.sources,
    contexts: entry.contexts,
    notes
  });
}

// 7. Output Metrics
const confidenceCounts = {
  VERIFIED: reconciliationRecordsV2.filter(r => r.confidence === 'VERIFIED').length,
  RECONCILED: reconciliationRecordsV2.filter(r => r.confidence === 'RECONCILED').length,
  PROVISIONAL: reconciliationRecordsV2.filter(r => r.confidence === 'PROVISIONAL').length,
  CONFLICTING: reconciliationRecordsV2.filter(r => r.confidence === 'CONFLICTING').length,
  MISSING: reconciliationRecordsV2.filter(r => r.confidence === 'MISSING').length
};

const reportsDir = path.join(REPO_ROOT, 'reports');

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_reconciliation_v2.json'),
  JSON.stringify({
    auditedAt: new Date().toISOString(),
    totalRawStrings: reconciliationRecordsV2.length,
    totalOccurrences: vocabData.totalOccurrences,
    confidenceCounts,
    reconciliationRecords: reconciliationRecordsV2
  }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_exceptions.json'),
  JSON.stringify({
    auditedAt: new Date().toISOString(),
    mpSingleLetterExceptions,
    mlaTruncatedExceptions,
    placeholderException: {
      raw: 'SHORTNAM - Baljeet Yadav',
      status: 'PROVISIONAL',
      reason: 'Requires Form 21E historical gazette audit before canonical elevation.'
    }
  }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_relationships.json'),
  JSON.stringify({
    auditedAt: new Date().toISOString(),
    relationshipsCount: ORGANIZATION_RELATIONSHIPS.length,
    relationships: ORGANIZATION_RELATIONSHIPS
  }, null, 2)
);

fs.writeFileSync(
  path.join(reportsDir, 'w021_5b2_organization_schema_remediation.json'),
  JSON.stringify({
    auditedAt: new Date().toISOString(),
    migrationFile: 'supabase/migrations/064_political_organization_governance_remediation.sql',
    multilingualIdentitiesCount: MULTILINGUAL_IDENTITIES.length,
    multilingualIdentities: MULTILINGUAL_IDENTITIES,
    temporalSymbolsCount: TEMPORAL_SYMBOLS.length,
    temporalSymbols: TEMPORAL_SYMBOLS
  }, null, 2)
);

console.log(`[B2.2-B] Reconciliation V2 generated. Verified: ${confidenceCounts.VERIFIED}, Reconciled: ${confidenceCounts.RECONCILED}, Provisional: ${confidenceCounts.PROVISIONAL}, Conflicting: ${confidenceCounts.CONFLICTING}`);
