/**
 * scripts/inspect-cross-phase-inventory.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

const b22cPopReport = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_population_execution_report.json'), 'utf8'));
const b22dPostPop = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_post_population_audit.json'), 'utf8'));
const b22ePostPop = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2e_post_population_audit.json'), 'utf8'));
const dem = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2e_demographics_manifest.json'), 'utf8'));

console.log('--- MASTER DATA INVENTORY SUMMARY ---');
console.log('B1:');
console.log('  Assembly Constituencies: 4,142');
console.log('  Parliamentary Constituencies: 543');
console.log('B2.2-C:');
console.log('  Organizations:', b22cPopReport.populationCounts.C1_Political_Organizations);
console.log('  Aliases:', b22cPopReport.populationCounts.C5_Organization_Aliases);
console.log('  Multilingual:', b22cPopReport.populationCounts.C3_Multilingual_Names);
console.log('  Symbols:', b22cPopReport.populationCounts.C4_Organization_Symbols);
console.log('  Relationships:', b22cPopReport.populationCounts.C2_Organization_Relationships);
console.log('  Provenance:', b22cPopReport.populationCounts.C0_Provenance_Record);
console.log('  TOTAL B2.2-C INSERTS:', b22cPopReport.populationCounts.TOTAL_ACTUAL_DATABASE_INSERTS);
console.log('B2.2-D:');
console.log('  Canonical Persons:', b22dPostPop.approvedPopulationCounts.D1_Canonical_Persons);
console.log('  Multilingual Identities:', b22dPostPop.approvedPopulationCounts.D2_Multilingual_Person_Identities);
console.log('  Candidacies:', b22dPostPop.approvedPopulationCounts.D3_Candidacies);
console.log('  Elected Tenures:', b22dPostPop.approvedPopulationCounts.D4_Elected_Tenures);
console.log('  Person Party Affiliations:', b22dPostPop.approvedPopulationCounts.D5_Person_Party_Affiliations);
console.log('  Tenure Party Switches:', b22dPostPop.approvedPopulationCounts.D6_Tenure_Party_Switches);
console.log('  Provenance:', b22dPostPop.approvedPopulationCounts.D0_Provenance_Record);
console.log('  TOTAL B2.2-D INSERTS:', b22dPostPop.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS);
console.log('B2.2-E:');
console.log('  Affidavits:', b22ePostPop.approvedPopulationCounts.E1_Candidate_Affidavits);
console.log('  Delimitation Lineage:', b22ePostPop.approvedPopulationCounts.E2_Constituency_Lineage);
console.log('  Constituency Demographics:', b22ePostPop.approvedPopulationCounts.E3_Constituency_Demographics);
console.log('  State Turnout Cycles:', b22ePostPop.approvedPopulationCounts.E4_State_Election_History_Turnout);
console.log('  Provenance:', b22ePostPop.approvedPopulationCounts.E0_Provenance_Record);
console.log('  TOTAL B2.2-E INSERTS:', b22ePostPop.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS);

const grandTotalInserts = b22cPopReport.populationCounts.TOTAL_ACTUAL_DATABASE_INSERTS +
                          b22dPostPop.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS +
                          b22ePostPop.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS;
console.log('--- GRAND TOTAL B2.2-C + B2.2-D + B2.2-E MUTATIONS: ---', grandTotalInserts);
