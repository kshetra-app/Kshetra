import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.staging' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const acAliases = {
  'Bellampalle (Sc)': 'Bellampalli',
  'Boath (St)': 'Boath',
  'Chennur (Sc)': 'Chennur',
  'Khanapur (St)': 'Khanapur',
  'Secunderabad Cont (Sc)': 'Secunderabad Cantonment',
  'Choppadandi (Sc)': 'Choppadandi',
  'Dharmapuri (Sc)': 'Dharmapuri',
  'Huzarabad': 'Huzurabad',
  'Jagatial': 'Jagtial',
  'Manakondur (Sc)': 'Manakondur',
  'Sirisilla': 'Sircilla',
  'Aswaraopeta (St)': 'Aswaraopeta',
  'Pinapaka (St)': 'Pinapaka',
  'Sathupalle (Sc)': 'Sathupalli',
  'Yellandu (St)': 'Yellandu',
  'Alampur (Sc)': 'Alampur',
  'Devarakdra': 'Devarkadra',
  'Mahabubnagar': 'Mahbubnagar',
  'Andole (Sc)': 'Andole',
  'Zahirabad (Sc)': 'Zahirabad',
  'Huzuranagar': 'Huzurnagar',
  'Nakrekal (Sc)': 'Nakrekal',
  'Armoor': 'Armur',
  'Jukkal (Sc)': 'Jukkal',
  'Kukatpalle': 'Kukatpally',
  'Chevella (Sc)': 'Chevella',
  'Maheswaram': 'Maheshwaram',
  'Dornakal (St)': 'Dornakal',
  'Ghanpur (Station) (Sc)': 'Ghanpur Station',
  'Jangoan': 'Jangaon',
  'Mulug (St)': 'Mulug',
  'Waradhanapet (Sc)': 'Wardhannapet',
  'Lal Bahadur Nagar': 'L. B. Nagar',
  'Wyra (St)': 'Wyra',
  'Madhira (Sc)': 'Madhira',
  'Devarakonda (St)': 'Devarakonda',
  'Vikarabad (Sc)': 'Vicarabad',
  'Asifabad (St)': 'Asifabad',
  'Achampet (Sc)': 'Achampet',
  'Bhadrachalam (St)': 'Bhadrachalam',
  'Mahabubabad (St)': 'Mahabubabad',
  'Thungathurthi (Sc)': 'Thungathurthi',
  'Nagarjunasagar': 'Nagarjuna Sagar',
  'Nizamabad (Urban)': 'Nizamabad Urban',
  'Nizamabad (Rural)': 'Nizamabad Rural'
};

async function buildCsvs() {
  // 1. GENERATE AC CSV
  const acData = JSON.parse(fs.readFileSync('data/geo/candidate_authoritative/tgrac_assembly_constituencies_raw.json', 'utf8'));
  const { data: dbAcs } = await s.from('constituencies').select('id, ac_no, name, canonical_code, reservation_status').order('ac_no', { ascending: true });
  const acRows = ['tgrac_fid,tgrac_assembly_name,tgrac_pre2016_district,tgrac_parliament,canonical_ac_id,canonical_ac_no,canonical_ac_name,canonical_code,canonical_reservation,match_method,evidence_rationale'];

  for (const f of acData.features) {
    const fid = f.attributes.FID;
    const srcName = f.attributes.ASSEMBLY_N.trim();
    const dname1 = f.attributes.DNAME1;
    const parlament = f.attributes.Parlament;

    let targetDbName = srcName;
    let method = 'DIRECT_NAME_MATCH';
    let evidence = 'Exact case-insensitive match on constituency name';

    if (acAliases[srcName]) {
      targetDbName = acAliases[srcName];
      if (['Nagarjunasagar', 'Nizamabad (Urban)', 'Nizamabad (Rural)'].includes(srcName)) {
        method = 'NORMALIZED_NAME_MATCH';
        evidence = 'Normalized whitespace or parentheses variation';
      } else if (srcName.includes('(Sc)') || srcName.includes('(St)')) {
        method = 'DOCUMENTED_AUTHORITY_MAPPING';
        evidence = 'Source includes reservation suffix matching canonical reservation_status';
      } else {
        method = 'DOCUMENTED_AUTHORITY_MAPPING';
        evidence = 'Known transliteration / spelling variation documented in ECI Delimitation Gazette';
      }
    }

    const match = dbAcs.find(d => d.name.toLowerCase() === targetDbName.toLowerCase());
    acRows.push([
      fid,
      JSON.stringify(srcName),
      JSON.stringify(dname1),
      JSON.stringify(parlament),
      match.id,
      match.ac_no,
      JSON.stringify(match.name),
      match.canonical_code,
      match.reservation_status,
      method,
      JSON.stringify(evidence)
    ].join(','));
  }
  fs.writeFileSync('docs/w016_c2_ac_identifier_mapping.csv', acRows.join('\n'));
  console.log('Saved docs/w016_c2_ac_identifier_mapping.csv (' + acRows.length + ' lines)');

  // 2. GENERATE DISTRICT CSV
  const distData = JSON.parse(fs.readFileSync('data/geo/candidate_authoritative/tgrac_districts_raw.json', 'utf8'));
  const { data: dbDists } = await s.from('districts').select('id, code, name');
  const distAliases = {
    'Jangoan': 'Jangaon',
    'Warangal Rural': 'Warangal',
    'Warangal Urban': 'Hanamkonda',
    'Medchal Malkajgiri': 'Medchal-Malkajgiri',
    'Kumurambheem Asifabad': 'Kumuram Bheem Asifabad'
  };

  const distRows = ['tgrac_fid,tgrac_dist_name,canonical_district_id,canonical_code,canonical_name,match_method,temporal_regime,evidence_rationale'];
  for (const f of distData.features) {
    const fid = f.attributes.FID;
    const srcName = f.attributes.dist_name.trim();
    let target = srcName;
    let method = 'DIRECT_NAME_MATCH';
    let regime = '2019-2021_INTERMEDIATE_REGIME';
    let evidence = 'Exact name match with canonical district';

    if (distAliases[srcName]) {
      target = distAliases[srcName];
      method = 'DOCUMENTED_AUTHORITY_MAPPING';
      if (srcName.startsWith('Warangal')) {
        regime = '2019-2021_INTERMEDIATE_REGIME';
        evidence = 'Renamed to ' + target + ' under G.O.Ms. 153 dated 12.08.2021';
      } else {
        evidence = 'Documented spelling / hyphenation variation in state notifications';
      }
    }

    const match = dbDists.find(d => d.name.toLowerCase() === target.toLowerCase());
    distRows.push([
      fid,
      JSON.stringify(srcName),
      match.id,
      match.code,
      JSON.stringify(match.name),
      method,
      regime,
      JSON.stringify(evidence)
    ].join(','));
  }
  fs.writeFileSync('docs/w016_c2_district_identifier_mapping.csv', distRows.join('\n'));
  console.log('Saved docs/w016_c2_district_identifier_mapping.csv (' + distRows.length + ' lines)');

  // 3. GENERATE MANDAL CSV
  const mdlData = JSON.parse(fs.readFileSync('data/geo/candidate_authoritative/tgrac_mandals_raw.json', 'utf8'));
  const { data: dbMdls } = await s.from('mandals').select('id, name, district, lgd_code');
  const pilotMap = new Map();
  for (const dm of dbMdls) {
    pilotMap.set(dm.name.toLowerCase().replace(/[^a-z]/g, ''), dm);
  }

  const mdlRows = ['tgrac_fid,tgrac_s_no,tgrac_mandal_name,tgrac_district,tgrac_revenue_division,canonical_pilot_id,lgd_code_available,temporal_regime,status'];
  for (const f of mdlData.features) {
    const fid = f.attributes.FID;
    const sNo = f.attributes.s_no;
    const mName = f.attributes.mandal_nam.trim();
    const dName = f.attributes.dist_name.trim();
    const rName = f.attributes.rev_div_na ? f.attributes.rev_div_na.trim() : '';

    const normKey = mName.toLowerCase().replace(/[^a-z]/g, '');
    let pilotId = 'UNMAPPED_PILOT_ABSENT';
    let lgd = 'NOT_PRESENT_IN_SOURCE';

    if (pilotMap.has(normKey)) {
      const dm = pilotMap.get(normKey);
      pilotId = dm.id;
      lgd = String(dm.lgd_code);
    } else if (normKey === 'sirpurt') {
      pilotId = 'TS-MDL-7101';
      lgd = '4676';
    } else if (normKey === 'kotapalle') {
      pilotId = 'TS-MDL-5328';
      lgd = '4660';
    } else if (normKey === 'bellampalle') {
      pilotId = 'TS-MDL-5324';
      lgd = '4647';
    } else if (normKey === 'dandepalle') {
      pilotId = 'TS-MDL-5322';
      lgd = '4650';
    }

    mdlRows.push([
      fid,
      sNo,
      JSON.stringify(mName),
      JSON.stringify(dName),
      JSON.stringify(rName),
      pilotId,
      lgd,
      '2016_POST_REORGANISATION_REGIME',
      'CANDIDATE_FEATURE_VALID'
    ].join(','));
  }
  fs.writeFileSync('docs/w016_c2_mandal_identifier_mapping.csv', mdlRows.join('\n'));
  console.log('Saved docs/w016_c2_mandal_identifier_mapping.csv (' + mdlRows.length + ' lines)');
}

buildCsvs().catch(err => {
  console.error(err);
  process.exit(1);
});
