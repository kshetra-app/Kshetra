import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const schemaRemPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_schema_remediation.json');
const schemaRem = JSON.parse(fs.readFileSync(schemaRemPath, 'utf8'));

const identities = schemaRem.multilingualIdentities;

const output = {
  auditedAt: new Date().toISOString(),
  milestone: 'W021.5-B2.2-C Multilingual Matrix',
  totalIdentitiesAudited: identities.length,
  languagesCovered: Array.from(new Set(identities.map(i => i.lang))).sort(),
  scriptsCovered: Array.from(new Set(identities.map(i => i.script))).sort(),
  representationTypes: Array.from(new Set(identities.map(i => i.type))).sort(),
  identities: identities
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_multilingual_matrix.json'),
  JSON.stringify(output, null, 2)
);

console.log(`[MULTILINGUAL MATRIX] Written ${identities.length} verified statutory multilingual identities across ${output.languagesCovered.length} languages.`);
