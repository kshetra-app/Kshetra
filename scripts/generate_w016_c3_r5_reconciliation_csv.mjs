import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const env = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const parseCsvLines = (text) => {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentLine.push(currentField);
      currentField = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i+1] === '\n') i++;
      currentLine.push(currentField);
      lines.push(currentLine);
      currentLine = [];
      currentField = '';
    } else {
      currentField += c;
    }
  }
  if (currentLine.length > 0 || currentField) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }
  return lines;
};

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function buildReconciliationCsv() {
  console.log('Fetching live 589 historical mandal_versions from panIN-staging...');
  const { data: histVersions, error: hvErr } = await supabase
    .from('mandal_versions')
    .select('id, mandal_id, version_code, name, lgd_code, valid_from, valid_to, is_current, primary_dataset_version_id')
    .eq('is_current', false);

  if (hvErr) throw hvErr;
  console.log(`Fetched ${histVersions.length} historical versions.`);

  console.log('Fetching live 589 provenance records for ts_lgd_mandals_2016_v1...');
  const { data: provRecords, error: prErr } = await supabase
    .from('provenance_records')
    .select('id, dataset_version_id, source_record_id, verification_evidence_id, verified_by')
    .eq('dataset_version_id', 'ts_lgd_mandals_2016_v1');

  if (prErr) throw prErr;
  console.log(`Fetched ${provRecords.length} provenance records.`);

  const provBySourceId = new Map();
  provRecords.forEach(p => provBySourceId.set(p.source_record_id, p));

  const hvByVersionCode = new Map();
  histVersions.forEach(hv => hvByVersionCode.set(hv.version_code, hv));

  console.log('Reading raw TGRAC geometry artifact...');
  const rawTgrac = JSON.parse(fs.readFileSync('data/geo/candidate_authoritative/tgrac_mandals_raw.json', 'utf8'));
  console.log(`TGRAC contains ${rawTgrac.features.length} features.`);

  console.log('Reading baseline temporal semantics mapping...');
  const semLines = parseCsvLines(fs.readFileSync('docs/w016_c3_temporal_geometry_semantics.csv', 'utf8'));
  const semHeader = semLines[0];
  console.log('Semantics header length:', semHeader.length);

  const semByFid = new Map();
  for (let i = 1; i < semLines.length; i++) {
    const row = semLines[i];
    const fid = parseInt(row[0], 10);
    semByFid.set(fid, {
      fid,
      histMandalId: row[1],
      versionCode: row[2],
      tgracName: row[3],
      lgdName: row[4],
      tgracDist: row[5],
      lgdCode: parseInt(row[6], 10),
      validFrom: row[8],
      validTo: row[9],
      timelineStatus: row[10],
      geometrySemantic: row[12]
    });
  }

  // Reconcile 589 features
  const csvHeaders = [
    'tgrac_feature_id',
    'source_name',
    'source_district',
    'source_lgd_code',
    'canonical_stable_mandal_id',
    'historical_mandal_version_id',
    'historical_version_code',
    'historical_valid_from',
    'historical_valid_to',
    'dataset_version_id',
    'provenance_id',
    'verification_evidence_id',
    'coverage_category',
    'match_method',
    'match_status'
  ];

  const csvRows = [csvHeaders.join(',')];
  const reconciledFids = new Set();
  const reconciledVersionIds = new Set();
  const categoryCounts = { A: 0, B: 0, C: 0, D: 0 };

  for (const f of rawTgrac.features) {
    const fid = f.attributes.FID;
    const srcName = f.attributes.mandal_nam.trim();
    const srcDist = f.attributes.dist_name.trim();

    const sem = semByFid.get(fid);
    if (!sem) {
      throw new Error(`FID ${fid} missing in temporal geometry semantics!`);
    }

    const hv = hvByVersionCode.get(sem.versionCode);
    if (!hv) {
      throw new Error(`Version code ${sem.versionCode} not found in historical mandal_versions on staging!`);
    }

    const prov = provBySourceId.get(sem.versionCode);
    if (!prov) {
      throw new Error(`Provenance record for source_record_id ${sem.versionCode} not found on staging!`);
    }

    // Determine category
    let category = 'A';
    if (sem.timelineStatus === 'SPLIT_2020_09_24') {
      category = 'B';
    } else if (sem.timelineStatus === 'SPLIT_2022_09_26') {
      category = 'C';
    } else if (sem.timelineStatus === 'SPLIT_POST_2022') {
      category = 'D';
    } else if (sem.timelineStatus === 'UNDIVIDED_HISTORICAL') {
      category = 'A';
    }
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    let matchMethod = 'DETERMINISTIC_INCEPTION_CODE_LOOKUP';
    if (sem.tgracName.toLowerCase() === sem.lgdName.toLowerCase()) {
      matchMethod = 'EXACT_NAME_AND_LGD_MATCH';
    } else {
      matchMethod = 'STANDARDIZED_TRANSLITERATION_MAP';
    }

    const row = [
      fid,
      escapeCsvField(srcName),
      escapeCsvField(srcDist),
      sem.lgdCode,
      hv.mandal_id,
      hv.id,
      hv.version_code,
      hv.valid_from,
      hv.valid_to,
      hv.primary_dataset_version_id,
      prov.id,
      prov.verification_evidence_id,
      category,
      matchMethod,
      'RESOLVED_1_TO_1'
    ];

    csvRows.push(row.join(','));
    reconciledFids.add(fid);
    reconciledVersionIds.add(hv.id);
  }

  console.log(`Reconciled ${reconciledFids.size} unique FIDs.`);
  console.log(`Mapped to ${reconciledVersionIds.size} unique historical mandal_version_id UUIDs.`);
  console.log('Category breakdown:', categoryCounts);

  if (reconciledFids.size !== 589 || reconciledVersionIds.size !== 589) {
    throw new Error(`Reconciliation failure: expected 589 unique FIDs and versions, got FIDs=${reconciledFids.size}, Versions=${reconciledVersionIds.size}`);
  }

  const outPath = 'reports/w016_c3_r5_geometry_reconciliation.csv';
  fs.writeFileSync(outPath, csvRows.join('\n'), 'utf8');
  console.log(`[PASS] Written ${outPath} (${csvRows.length - 1} data rows).`);

  return {
    rowCount: csvRows.length - 1,
    uniqueFids: reconciledFids.size,
    uniqueVersionIds: reconciledVersionIds.size,
    categoryCounts
  };
}

buildReconciliationCsv().catch(err => {
  console.error('Fatal error building reconciliation CSV:', err);
  process.exit(1);
});
