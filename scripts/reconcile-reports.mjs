import fs from 'fs';
import path from 'path';

const brainScratch = path.join('C:', 'Users', 'Laven', '.gemini', 'antigravity', 'brain', 'c4e5c1f0-d7c0-4b78-b106-d1887d5fb8df', 'scratch');
const reportsDir = path.join(process.cwd(), 'reports');

const metadata = {
  repository: 'https://github.com/kshetra-app/Kshetra.git',
  branch: 'master',
  commitSha: '77fb553',
  databaseVersion: '034_political_ads',
  apiVersion: 'v1 (0.1.0)',
  mobileVersion: '0.1.0',
  environment: 'production',
  verifiedBy: 'DEVOPS+QA',
  timestamp: new Date().toISOString()
};

// 1. W001 R4 Full Report
const w001Path = path.join(brainScratch, 'w001_r4_full_report.json');
if (fs.existsSync(w001Path)) {
  const w001Raw = JSON.parse(fs.readFileSync(w001Path, 'utf8'));
  const w001Report = {
    evidenceMetadata: metadata,
    ...w001Raw
  };
  fs.writeFileSync(path.join(reportsDir, 'w001_production_verification_report.json'), JSON.stringify(w001Report, null, 2));
  console.log('Written: reports/w001_production_verification_report.json');
}

// 2. i18n Verification Report
const i18nPath = path.join(brainScratch, 'i18n_verification_report.json');
if (fs.existsSync(i18nPath)) {
  const i18nRaw = JSON.parse(fs.readFileSync(i18nPath, 'utf8'));
  const i18nReport = {
    evidenceMetadata: metadata,
    ...i18nRaw
  };
  fs.writeFileSync(path.join(reportsDir, 'w001_i18n_verification_report.json'), JSON.stringify(i18nReport, null, 2));
  console.log('Written: reports/w001_i18n_verification_report.json');
}

// 3. W000 Audit Output
const w000Path = path.join(brainScratch, 'audit_output.json');
if (fs.existsSync(w000Path)) {
  const w000Raw = JSON.parse(fs.readFileSync(w000Path, 'utf8'));
  const w000Report = {
    evidenceMetadata: { ...metadata, commitSha: '0f7e104', verifiedBy: 'ARCH' },
    ...w000Raw
  };
  fs.writeFileSync(path.join(reportsDir, 'w000_baseline_audit.json'), JSON.stringify(w000Report, null, 2));
  console.log('Written: reports/w000_baseline_audit.json');
}

console.log('Report reconciliation complete.');
