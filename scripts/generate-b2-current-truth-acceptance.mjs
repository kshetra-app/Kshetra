import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const currentTruthAcceptance = {
  version: '1.0.0',
  milestone: 'W021.5-B2-PREFLIGHT-REMEDIATION',
  title: 'Current Political Truth & Temporal Resolution Architecture Specification',
  generatedAt: new Date().toISOString(),
  governance: 'CTO Master Implementation Architecture Freeze Directive',
  resolutionChain: {
    steps: [
      { step: 1, entity: 'JURISDICTION', table: 'public.states', role: 'Sovereign state/UT envelope (e.g. TS, UP, AS)' },
      { step: 2, entity: 'SEAT', table: 'public.constituencies', role: 'Constituency identity (e.g. TS-AC-065 Kodangal)' },
      { step: 3, entity: 'STATUTORY_VERSION', table: 'public.constituency_versions', role: 'Delimitation boundary version active at date D' },
      { step: 4, entity: 'ELECTION_CONTEST', table: 'public.election_contests', role: 'Specific electoral event in that seat (e.g. 2023 General Election)' },
      { step: 5, entity: 'WINNING_CANDIDACY', table: 'public.candidacies', role: 'Winning candidate record with immutable election party' },
      { step: 6, entity: 'ELECTED_TENURE', table: 'public.elected_tenures', role: 'Sovereign term starting on gazette notification date' },
      { step: 7, entity: 'VACANCY_CHECK', table: 'public.tenure_vacancies', role: 'Check if seat vacated before date D' },
      { step: 8, entity: 'BY_ELECTION_LINK', table: 'public.election_contests', role: 'If vacated, traverse to subsequent by-election winning tenure' },
      { step: 9, entity: 'PARTY_SWITCH_CHECK', table: 'public.tenure_party_switches', role: 'Check contemporaneous party switches valid at date D' },
      { step: 10, entity: 'CURRENT_TRUTH', table: 'API DTO', role: 'Resolved sovereign representative + contemporaneous party at date D' }
    ]
  },
  officeholderVsPartySeparation: {
    officeholderFact: 'Elected tenure belongs to the HUMAN PERSON. Officeholder status remains valid until end of term, resignation, disqualification, or death.',
    partyFact: 'Political party affiliation is a temporal relationship. Changing party during a tenure creates a tenure_party_switch record, updating contemporaneous party without modifying the immutable election party or historical contest.'
  },
  vacancyModel: {
    supportedReasons: [
      'DEATH',
      'RESIGNATION',
      'DISQUALIFICATION_TENTH_SCHEDULE',
      'DISQUALIFICATION_RPA_SEC_8',
      'ELECTION_ANNULLED_COURT_ORDER',
      'EXPULSION',
      'VACANCY_GAZETTED'
    ],
    requiredFields: [
      'tenure_id',
      'effective_date',
      'vacancy_reason',
      'authority_notifying',
      'gazette_notification_number',
      'evidence_record_id',
      'provenance_id'
    ],
    stateBehavior: 'When asOfDate >= vacancy.effective_date (and before by-election winner takes oath), API returns status: "VACANT", representative: null, vacancy_details: {...}'
  },
  byElectionModel: {
    chainStructure: [
      'General Election Tenure (Active)',
      'Vacancy Event (Terminates Tenure)',
      'By-Election Event (election_type = "BY_ELECTION")',
      'New Contest & Candidacies',
      'New Winning Tenure (starts on by-election gazette date)'
    ],
    provenanceRequirement: 'By-election contest must reference previous_vacated_tenure_id.'
  },
  partySwitchModel: {
    immutabilityRule: 'candidacies.party_id is FROZEN and NEVER updated after election certification.',
    switchRecordFields: [
      'tenure_id',
      'person_id',
      'from_party_id',
      'to_party_id',
      'effective_date',
      'switch_type (DEFECTION | MERGER | EXPULSION | INDEPENDENT_ALLIANCE)',
      'statutory_tenth_schedule_status (CHALLENGED | IMMUNE_MERGER | PENDING_SPEAKER)',
      'gazette_reference'
    ],
    temporalResolutionLogic: `
      SELECT coalesce(tps.to_party_id, et.original_party_id) AS contemporaneous_party
      FROM public.elected_tenures et
      LEFT JOIN LATERAL (
        SELECT to_party_id
        FROM public.tenure_party_switches
        WHERE tenure_id = et.id AND effective_date <= asOfDate
        ORDER BY effective_date DESC, created_at DESC
        LIMIT 1
      ) tps ON true
      WHERE et.id = :tenureId;
    `
  },
  affidavitRightsTaxonomy: {
    principles: 'Do not claim broad "Sovereign Public Domain" without official legal counsel. Classify all political facts under structured technical data rights taxonomy.',
    classifications: [
      {
        tag: 'STATUTORY_FACT',
        legalStatus: 'Public Statutory Filing',
        description: 'Mandatory statutory candidate declaration filed under RP Act 1950 Sec 33A / Form 26.',
        apiExposure: 'PUBLIC_FREE_ACCESS'
      },
      {
        tag: 'SOURCE_EXTRACTED_FACT',
        legalStatus: 'Raw Extracted Value',
        description: 'Unprocessed string or numeric values directly scraped or parsed from Form 26.',
        apiExposure: 'PUBLIC_FREE_ACCESS'
      },
      {
        tag: 'NORMALIZED_FACT',
        legalStatus: 'Engineered Entity',
        description: 'Parsed and typed fields (e.g. integer INR assets, date parsed DOB, enum education).',
        apiExposure: 'PUBLIC_FREE_ACCESS'
      },
      {
        tag: 'DERIVED_FACT',
        legalStatus: 'Proprietary Derived Metric',
        description: 'Net worth calculations, asset growth percent, criminal severity scoring.',
        apiExposure: 'PUBLIC_APPLICATION_API'
      },
      {
        tag: 'SOURCE_NARRATIVE',
        legalStatus: 'Third-Party Editorial',
        description: 'Editorial biography paragraphs, party commentary, news digests.',
        apiExposure: 'RESTRICTED_ATTRIBUTED_ONLY'
      },
      {
        tag: 'THIRD_PARTY_COMMENTARY',
        legalStatus: 'Third-Party Proprietary',
        description: 'External opinion, political ratings, editorial evaluations.',
        apiExposure: 'EXCLUDED_FROM_CANONICAL'
      },
      {
        tag: 'UNKNOWN_RIGHTS_STATUS',
        legalStatus: 'Unverified Origin',
        description: 'Data where provenance does not cleanly map to official ECI Form 26.',
        apiExposure: 'PROHIBITED_FROM_PUBLIC_API'
      }
    ]
  }
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_current_truth_acceptance.json'),
  JSON.stringify(currentTruthAcceptance, null, 2)
);

let md = `# W021.5-B2 CURRENT POLITICAL TRUTH & TEMPORAL ACCEPTANCE SPECIFICATION\n\n`;
md += `**Milestone:** W021.5-B2 Architecture Freeze\n`;
md += `**Scope:** Temporal Resolution Chain, Vacancies, By-Elections, Party Switches, and Affidavit Taxonomy\n\n`;

md += `## 1. Complete Temporal Resolution Chain\n\n`;
md += `$$\\text{Representative}(\\text{Seat}, D) = \\Pi_{\\text{person}}(\\sigma_{\\text{valid\\_at}(D) \\land \\neg \\text{vacated}(D)}(\\text{elected\\_tenures}))$$\n\n`;
md += `| Step | Entity | Table | Role |\n`;
md += `|---|---|---|---|\n`;
for (const s of currentTruthAcceptance.resolutionChain.steps) {
  md += `| ${s.step} | **${s.entity}** | \`${s.table}\` | ${s.role} |\n`;
}

md += `\n## 2. Officeholder Fact vs Party Affiliation Fact\n\n`;
md += `- **Officeholder Fact:** ${currentTruthAcceptance.officeholderVsPartySeparation.officeholderFact}\n`;
md += `- **Party Fact:** ${currentTruthAcceptance.officeholderVsPartySeparation.partyFact}\n\n`;

md += `## 3. First-Class Vacancy Model\n\n`;
md += `Supported reasons: \`${currentTruthAcceptance.vacancyModel.supportedReasons.join('`, `')}\`\n\n`;
md += `Behavior: ${currentTruthAcceptance.vacancyModel.stateBehavior}\n\n`;

md += `## 4. Party Switch Temporal Ledger\n\n`;
md += `- **Immutability Invariant:** ${currentTruthAcceptance.partySwitchModel.immutabilityRule}\n`;
md += `- **Resolution Query:**\n\`\`\`sql${currentTruthAcceptance.partySwitchModel.temporalResolutionLogic}\`\`\`\n\n`;

md += `## 5. Technical Affidavit Rights Taxonomy\n\n`;
md += `| Classification | Legal Status | Description | API Exposure |\n`;
md += `|---|---|---|---|\n`;
for (const c of currentTruthAcceptance.affidavitRightsTaxonomy.classifications) {
  md += `| \`${c.tag}\` | ${c.legalStatus} | ${c.description} | \`${c.apiExposure}\` |\n`;
}

fs.writeFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_current_truth_acceptance.md'), md);
console.log('Current truth acceptance reports generated successfully!');
