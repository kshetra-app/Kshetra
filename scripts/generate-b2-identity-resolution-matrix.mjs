import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const identityMatrix = {
  version: '1.0.0',
  milestone: 'W021.5-B2-PREFLIGHT-REMEDIATION',
  title: 'Canonical Political Identity Resolution & Disambiguation Matrix',
  generatedAt: new Date().toISOString(),
  governance: 'Master Execution Framework Rule IV-001 (Zero False Merges Invariant)',
  tiers: [
    {
      tier: 'TIER_1_DETERMINISTIC',
      authorityLevel: 'HIGHEST',
      autoMergePermitted: true,
      confidenceScore: 1.0,
      identifiers: [
        {
          type: 'ECI_CANDIDATE_ID',
          description: 'Unique candidate identifier issued by Election Commission of India on Affidavit Portal',
          provenance: 'ECI Candidate Affidavit Portal (affidavit.eci.gov.in)',
          collisionRisk: 'ZERO',
        },
        {
          type: 'SANSAD_MEMBER_ID',
          description: 'Official Lok Sabha / Rajya Sabha Secretariat member biographical ID',
          provenance: 'Parliament of India (sansad.in / loksabha.nic.in)',
          collisionRisk: 'ZERO',
        },
        {
          type: 'OFFICIAL_GAZETTE_REF',
          description: 'State Election Commission / Chief Electoral Officer Form 21E Declaration Notification',
          provenance: 'Official Extraordinary State Gazette',
          collisionRisk: 'ZERO',
        },
        {
          type: 'EXISTING_CANONICAL_UUID',
          description: 'Verified foreign key linkage already sealed in public.canonical_persons',
          provenance: 'Kshetra Canonical Database Ledger',
          collisionRisk: 'ZERO',
        }
      ]
    },
    {
      tier: 'TIER_2_STRONG_COMPOUND',
      authorityLevel: 'HIGH_STAGING_PROMOTION',
      autoMergePermitted: true,
      confidenceScoreThreshold: 0.95,
      conflictOverridePermitted: false,
      compoundKeys: [
        {
          name: 'COMPOUND_BIOGRAPHICAL_KEY',
          components: ['normalized_name', 'dob', 'father_or_spouse_name', 'state_code'],
          rationale: 'Two individuals with identical legal names, exact identical dates of birth, identical parent names, in the same state is statistically zero.',
        },
        {
          name: 'COMPOUND_POLITICAL_CAREER_KEY',
          components: ['normalized_name', 'consecutive_election_history', 'party_continuity', 'constituency_lineage'],
          rationale: 'Incumbent winning 2018 and contesting 2023 in the same constituency under the same or continuous party platform.',
        }
      ]
    },
    {
      tier: 'TIER_3_AMBIGUOUS_STAGING_QUEUE',
      authorityLevel: 'REVIEW_REQUIRED',
      autoMergePermitted: false,
      confidenceScoreRange: [0.70, 0.94],
      conflictOverridePermitted: false,
      action: 'ISOLATE_TO_STAGING_REVIEW_QUEUE',
      rules: [
        'Names match but dates of birth differ by 1-3 years (potential age misreporting in affidavit vs true DOB)',
        'Names match and constituency matches but party differs without an explicit recorded defection/switch event',
        'Common patronymics or title variations (e.g., "Rao", "Reddy", "Sharma", "Singh", "Kumar") with partial career overlap',
        'Must remain separate canonical candidates in public.candidacies without merging human identities until human verification'
      ]
    },
    {
      tier: 'TIER_4_CONFLICT_HARD_LOCK',
      authorityLevel: 'STRICT_LOCKOUT',
      autoMergePermitted: false,
      confidenceScoreOverride: 'PROHIBITED',
      action: 'REJECT_MERGE_EMIT_ALERT',
      conflictTriggers: [
        {
          trigger: 'SIMULTANEOUS_DIFFERENT_STATE_OFFICES',
          description: 'A person cannot simultaneously be an active sitting MLA in Telangana and an active sitting MLA in Bihar on the same date D.',
        },
        {
          trigger: 'BIOLOGICAL_IMPOSSIBILITY',
          description: 'Date of birth discrepancies > 5 years or parent name contradiction.',
        },
        {
          trigger: 'SAME_NAME_CONTESTANTS_IN_SAME_ELECTION',
          description: 'Different human beings with identical or similar names contesting the same seat in the same election cycle (common dummy candidate tactic in Indian elections).',
        },
        {
          trigger: 'EXPLICIT_SOURCE_CONFLICT',
          description: 'Source records explicitly identify the candidates as distinct individuals.',
        }
      ]
    }
  ],
  governanceRule: 'NO AUTOMATED MERGE MAY OVERRIDE AN EXPLICIT IDENTITY CONFLICT MERELY BECAUSE A NUMERICAL SIMILARITY SCORE IS HIGH.'
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_identity_resolution_matrix.json'),
  JSON.stringify(identityMatrix, null, 2)
);

let md = `# W021.5-B2 CANONICAL POLITICAL IDENTITY RESOLUTION & DISAMBIGUATION MATRIX\n\n`;
md += `**Milestone:** W021.5-B2 Architecture Freeze\n`;
md += `**Governance Principle:** Zero False Merges Invariant (Rule IV-001)\n\n`;
md += `> **Absolute Rule:** A numerical confidence score is NOT the sole merge authority. No automated merge may override an explicit identity conflict merely because a string similarity score is high.\n\n`;

for (const t of identityMatrix.tiers) {
  md += `## ${t.tier} (Authority: ${t.authorityLevel})\n\n`;
  md += `- **Auto-Merge Permitted:** ${t.autoMergePermitted}\n`;
  md += `- **Confidence Requirement:** ${t.confidenceScore ?? t.confidenceScoreThreshold ?? JSON.stringify(t.confidenceScoreRange) ?? t.confidenceScoreOverride}\n\n`;
  if (t.identifiers) {
    md += `### Deterministic Identifiers\n\n`;
    for (const id of t.identifiers) {
      md += `- **\`${id.type}\`**: ${id.description} *(Provenance: ${id.provenance})*\n`;
    }
  }
  if (t.compoundKeys) {
    md += `### Strong Compound Keys\n\n`;
    for (const ck of t.compoundKeys) {
      md += `- **\`${ck.name}\`**: Components = \`[${ck.components.join(', ')}]\`. ${ck.rationale}\n`;
    }
  }
  if (t.rules) {
    md += `### Ambiguity Handling\n\n`;
    for (const r of t.rules) {
      md += `- ${r}\n`;
    }
  }
  if (t.conflictTriggers) {
    md += `### Hard-Lock Conflict Triggers (Merge Forbidden)\n\n`;
    for (const ct of t.conflictTriggers) {
      md += `- **\`${ct.trigger}\`**: ${ct.description}\n`;
    }
  }
  md += `\n`;
}

fs.writeFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_identity_resolution_matrix.md'), md);
console.log('Identity resolution matrix generated successfully!');
