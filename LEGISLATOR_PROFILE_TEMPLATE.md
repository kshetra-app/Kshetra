# Master Legislator Profile Template
## For MLA, MP (Lok Sabha & Rajya Sabha), and MLC

> This template defines the **complete, uniform data schema** used across all Indian states  
> for every elected representative. Designed for researchers, historians, and citizens.

---

## Schema Version: 1.0

---

## 1. IDENTITY & PERSONAL

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | string | System | Unique identifier (format: `{HOUSE}_{STATE}_{YEAR}_{AC_NO}_{SERIAL}`) |
| `fullName` | string | ECI/MyNeta | Full legal name as on affidavit |
| `displayName` | string | Curated | Commonly known name (e.g., "KCR", "KTR") |
| `aliases` | string[] | Curated | All known name variants, maiden names, pen names |
| `gender` | enum | ECI | `male`, `female`, `other` |
| `dob` | date | Wikipedia/ECI | Date of birth (YYYY-MM-DD) |
| `ageAtElection` | number | MyNeta | Age when the election affidavit was filed |
| `currentAge` | number | Computed | Calculated from DOB |
| `religion` | string | Affidavit/Public | Declared religion (if public) |
| `caste` | string | ECI | SC/ST/OBC/General (reservation category) |
| `maritalStatus` | enum | MyNeta | `single`, `married`, `widowed`, `divorced`, `separated` |
| `spouseName` | string | MyNeta | Name of spouse |
| `dependents` | number | MyNeta | Number of dependents declared |
| `photoUrl` | string | PRS/MyNeta | Best available photograph URL |
| `photoSources` | object | Multi | `{ myneta, prs, wikipedia, legislature }` — all available photo URLs |

---

## 2. POLITICAL CAREER

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `house` | enum | — | `state_assembly` (MLA), `lok_sabha` (MP-LS), `rajya_sabha` (MP-RS), `state_council` (MLC) |
| `stateCode` | string | — | Two-letter state code (e.g., TS, AP, KA) |
| `stateName` | string | — | Full state name |
| `constituencyName` | string | ECI | Name of constituency currently representing |
| `constituencyNumber` | number | ECI | Official constituency number |
| `constituencyType` | enum | ECI | `general`, `sc`, `st` |
| `district` | string | ECI | District the constituency falls in |
| `currentParty` | string | — | Current party affiliation (abbreviated) |
| `currentPartyFull` | string | — | Full party name |
| `previousParties` | object[] | Research | `[{ party, fromYear, toYear, reason }]` — party switches |
| `termsServed` | number | PRS | Total terms served in this house |
| `firstElectedYear` | number | ECI | Year first elected to any legislative body |
| `isCurrentMember` | boolean | — | Whether currently serving |
| `isCabinetMinister` | boolean | Gov | Whether currently a minister |
| `ministerialPortfolio` | string | Gov | Current portfolio(s) held |
| `isChiefMinister` | boolean | Gov | Whether currently or formerly CM |
| `isOppositionLeader` | boolean | Gov | Whether currently Leader of Opposition |
| `committeeMemberships` | string[] | PRS/Sansad | Parliamentary/Assembly committees |
| `specialPositions` | string[] | Research | Speaker, Deputy Speaker, Whip, etc. |

---

## 3. COMPLETE ELECTION HISTORY

> Array of **all** elections ever contested — wins, losses, margins.  
> This is the heart of the profile for researchers.

```typescript
interface ElectionRecord {
  electionYear: number;           // Year of election
  electionType: string;           // 'assembly' | 'lok_sabha' | 'rajya_sabha' | 'by_election'
  electionKey: string;            // MyNeta election key (e.g., 'Telangana2023')
  stateCode: string;              // State where contested
  constituencyName: string;       // Constituency contested from
  constituencyNumber: number;     // Constituency number
  party: string;                  // Party contested under
  result: string;                 // 'won' | 'lost' | 'forfeited_deposit'
  votesReceived: number;          // Total votes (EVM + postal)
  evmVotes: number;               // EVM votes
  postalVotes: number;            // Postal votes
  voteShare: number;              // Percentage of total valid votes
  margin: number;                 // Win/loss margin
  totalVoters: number;            // Total voters in constituency
  turnoutPercent: number;         // Voter turnout percentage
  rank: number;                   // Position (1 = winner, 2 = runner-up, etc.)
  totalCandidates: number;        // Total candidates in that constituency
  runnerUp: string;               // Name of runner-up (if won) or winner (if lost)
  runnerUpParty: string;          // Party of the above
  runnerUpVotes: number;          // Votes of the above
}
```

---

## 4. FINANCIAL DISCLOSURE (Per Election)

> From ECI/MyNeta affidavits — one record per election contested.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `electionYear` | number | MyNeta | Which election this data is from |
| `selfMovableAssets` | number | MyNeta | Cash, deposits, vehicles, jewellery, etc. (INR) |
| `selfImmovableAssets` | number | MyNeta | Land, buildings, property (INR) |
| `spouseMovableAssets` | number | MyNeta | Spouse's movable assets (INR) |
| `spouseImmovableAssets` | number | MyNeta | Spouse's immovable assets (INR) |
| `dependentsAssets` | number | MyNeta | HUF/dependent assets (INR) |
| `totalAssets` | number | Computed | Sum of all above |
| `totalLiabilities` | number | MyNeta | Loans, dues, debts (INR) |
| `netWorth` | number | Computed | `totalAssets - totalLiabilities` |
| `selfIncome` | number | MyNeta | Self annual income (INR) |
| `spouseIncome` | number | MyNeta | Spouse annual income (INR) |
| `totalIncome` | number | Computed | Combined income |
| `isCrorepati` | boolean | Computed | `totalAssets >= 1,00,00,000` |
| `wealthGrowth` | object | Computed | `{ fromYear, toYear, percentGrowth, annualizedGrowth }` |
| `sourceUrl` | string | MyNeta | Direct link to affidavit page |
| `affidavitFiledDate` | date | MyNeta | Date affidavit was filed |

---

## 5. CRIMINAL RECORD

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `hasCriminalCases` | boolean | MyNeta | Any declared cases |
| `totalCases` | number | MyNeta | Total criminal cases |
| `seriousCases` | number | MyNeta | Cases with 5+ year sentence potential |
| `convictions` | number | MyNeta | Number of convictions |
| `caseDetails` | object[] | MyNeta | Full case breakdown (see below) |

```typescript
interface CriminalCase {
  caseNo: string;
  court: string;
  ipcSections: string[];         // IPC sections charged under
  otherActs: string[];           // Other acts (PCA, NDPS, etc.)
  status: 'pending' | 'convicted' | 'acquitted' | 'discharged';
  chargesFramed: boolean;
  cognizanceYear: number;
  description: string;           // Brief description of charges
  isSeriousIPC: boolean;         // IPC 302, 307, 376, 420, etc.
}
```

---

## 6. EDUCATION & PROFESSION

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `educationLevel` | enum | MyNeta | Standardized level (illiterate → doctorate) |
| `educationCategory` | string | MyNeta | Raw MyNeta category string |
| `educationDetail` | string | MyNeta | Specific qualification (e.g., "B.Tech from IIT") |
| `selfProfession` | string | MyNeta | Self-declared profession |
| `spouseProfession` | string | MyNeta | Spouse profession |
| `otherActivities` | string[] | Research | NGOs, trusts, board memberships |

---

## 7. LEGISLATIVE PERFORMANCE

> From PRS India / Sansad.in — measures actual legislative work.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `questionsAsked` | number | PRS | Total questions raised in house |
| `debatesParticipated` | number | PRS | Debates participated in |
| `privateMemberBills` | number | PRS | Private member bills introduced |
| `attendancePercent` | number | PRS | Session attendance (%) |
| `nregsQuestions` | number | PRS | Questions on NREGS/rural employment |
| `womenIssueQuestions` | number | PRS | Questions on women's issues |
| `localIssueQuestions` | number | PRS | Questions on own constituency |
| `mpladsFundsUtilized` | number | Gov | MPLADS/MLALADS funds used (%) |
| `developmentProjects` | number | Gov | Projects sanctioned under MLALADS |
| `performanceScore` | number | Computed | Weighted score (0-100) |

---

## 8. CONSTITUENCY CONTEXT

> Links the legislator to their constituency's demographics and development.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `population` | number | Census | Constituency population |
| `areaKmSq` | number | ECI | Area in km² |
| `literacyRate` | number | Census | Literacy percentage |
| `urbanRural` | enum | Census | `urban`, `rural`, `semi_urban` |
| `scPercentage` | number | Census | SC population % |
| `stPercentage` | number | Census | ST population % |
| `totalElectors` | number | ECI | Registered voters |
| `avgTurnout` | number | ECI | Average turnout across elections |
| `isDynastic` | boolean | Research | Whether family members also contest |

---

## 9. DYNASTY & POLITICAL FAMILY

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `isDynast` | boolean | Research | Has family members in politics |
| `familyInPolitics` | object[] | Research | `[{ name, relation, party, position, years }]` |
| `politicalGeneration` | number | Research | Which generation in politics (1 = first) |
| `familyConstituencies` | string[] | Research | Constituencies held by family |

---

## 10. KEY DATES & MILESTONES

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `dob` | date | Wikipedia | Date of birth |
| `firstElected` | date | ECI | Date first won an election |
| `partyJoinDate` | date | Research | When joined current party |
| `oathDate` | date | Legislature | Date took oath in current term |
| `termStartDate` | date | Legislature | Start of current term |
| `termEndDate` | date | Legislature | Expected end of current term |
| `notableEventsTimeline` | object[] | Research | `[{ date, event, description }]` |

---

## 11. COMPUTED INSIGHTS & RED FLAGS

| Field | Type | Logic | Description |
|-------|------|-------|-------------|
| `redFlags` | array | Computed | Auto-detected anomalies (see affidavitTypes) |
| `wealthRank` | number | Computed | Rank among all MLAs/MPs by assets |
| `criminalRank` | number | Computed | Rank by criminal cases |
| `performanceRank` | number | Computed | Rank by legislative performance score |
| `attendanceRank` | number | Computed | Rank by attendance |
| `incumbencyAdvantage` | boolean | Computed | Won from same seat in consecutive elections |
| `voteShareTrend` | string | Computed | `increasing`, `decreasing`, `stable` |
| `assetGrowthTrend` | string | Computed | `normal`, `high`, `suspicious` |
| `antiIncumbencyRisk` | string | Computed | `low`, `medium`, `high` |

---

## 12. SOURCE ATTRIBUTION & METADATA

| Field | Type | Description |
|-------|------|-------------|
| `dataSources` | string[] | List of all sources used for this profile |
| `mynetaUrl` | string | Direct MyNeta affidavit URL |
| `prsUrl` | string | PRS India profile URL |
| `sansadUrl` | string | Sansad.in profile URL |
| `wikipediaArticle` | string | Wikipedia article title |
| `legislatureUrl` | string | Official state legislature page |
| `lastUpdated` | datetime | When this profile was last refreshed |
| `dataCompleteness` | number | Percentage of fields populated (0-100) |
| `verificationStatus` | enum | `verified`, `partial`, `unverified` |

---

## House-Specific Fields

### For MLAs (State Assembly)
- `assemblyTerm` — Which assembly term (e.g., 16th Karnataka Assembly)
- `reservationStatus` — SC/ST/General for seat
- `delimitation2008` — Previous constituency name (if renamed)

### For MPs — Lok Sabha
- `lokSabhaNumber` — Which Lok Sabha (e.g., 18th Lok Sabha)
- `parliamentaryConstituency` — PC name
- `assemblySegments` — List of assembly segments within this PC

### For MPs — Rajya Sabha
- `nominatedBy` — State legislature that nominated
- `termStart` / `termEnd` — 6-year Rajya Sabha term
- `retirementBatch` — Which biennial batch

### For MLCs (State Council)
- `councilType` — `graduates`, `teachers`, `local_authority`, `assembly_elected`, `governor_nominated`
- `mlcTermYears` — Term duration

---

## Sample Complete Profile (Revanth Reddy)

```json
{
  "id": "MLA_TS_2023_84_1",
  "fullName": "Anumula Revanth Reddy",
  "displayName": "Revanth Reddy",
  "aliases": ["A. Revanth Reddy", "Revanth Reddy"],
  "gender": "male",
  "dob": "1969-11-08",
  "ageAtElection": 54,
  "currentAge": 56,
  "caste": "OBC",
  "maritalStatus": "married",
  "photoUrl": "https://prsindia.org/files/mlatrack/telangana/3/mla_images/Anumula Revanth Reddy.jpg",
  "photoSources": {
    "myneta": "https://www.myneta.info/images_candidate/...",
    "prs": "https://prsindia.org/files/mlatrack/telangana/3/mla_images/Anumula Revanth Reddy.jpg",
    "wikipedia": "https://upload.wikimedia.org/..."
  },
  "house": "state_assembly",
  "stateCode": "TS",
  "stateName": "Telangana",
  "constituencyName": "Kodangal",
  "constituencyNumber": 84,
  "constituencyType": "general",
  "district": "Vikarabad",
  "currentParty": "INC",
  "currentPartyFull": "Indian National Congress",
  "previousParties": [
    { "party": "TDP", "fromYear": 2007, "toYear": 2017, "reason": "defection" }
  ],
  "termsServed": 4,
  "firstElectedYear": 2009,
  "isCurrentMember": true,
  "isCabinetMinister": true,
  "ministerialPortfolio": "Chief Minister of Telangana",
  "isChiefMinister": true,
  "electionHistory": [
    {
      "electionYear": 2023,
      "electionType": "assembly",
      "electionKey": "Telangana2023",
      "stateCode": "TS",
      "constituencyName": "Kodangal",
      "constituencyNumber": 84,
      "party": "INC",
      "result": "won",
      "votesReceived": 126453,
      "voteShare": 52.3,
      "margin": 67382,
      "rank": 1,
      "runnerUp": "Patnam Narender Reddy",
      "runnerUpParty": "BRS",
      "runnerUpVotes": 59071
    },
    {
      "electionYear": 2018,
      "electionType": "assembly",
      "electionKey": "telangana2018",
      "stateCode": "TS",
      "constituencyName": "Kodangal",
      "constituencyNumber": 84,
      "party": "INC",
      "result": "won",
      "votesReceived": 91543,
      "voteShare": 44.1,
      "margin": 5234,
      "rank": 1
    }
  ],
  "financialHistory": [
    {
      "electionYear": 2023,
      "totalAssets": 300498852,
      "totalLiabilities": 19026339,
      "netWorth": 281472513,
      "selfIncome": 4500000,
      "isCrorepati": true,
      "sourceUrl": "https://www.myneta.info/Telangana2023/candidate.php?candidate_id=141"
    },
    {
      "electionYear": 2018,
      "totalAssets": 198000000,
      "totalLiabilities": 12000000,
      "netWorth": 186000000,
      "isCrorepati": true
    }
  ],
  "criminalRecord": {
    "hasCriminalCases": false,
    "totalCases": 0,
    "seriousCases": 0
  },
  "education": {
    "educationLevel": "graduate",
    "educationCategory": "Graduate",
    "selfProfession": "Business / Political Work",
    "spouseProfession": "Home Maker"
  },
  "legislativePerformance": {
    "questionsAsked": 45,
    "debatesParticipated": 12,
    "attendancePercent": 78
  },
  "dynasty": {
    "isDynast": false,
    "politicalGeneration": 1
  },
  "dataSources": ["myneta", "prs", "wikipedia", "eci"],
  "mynetaUrl": "https://www.myneta.info/Telangana2023/candidate.php?candidate_id=141",
  "prsUrl": "https://prsindia.org/mlatrack/anumula-revanth-reddy",
  "wikipediaArticle": "Revanth Reddy",
  "lastUpdated": "2026-05-12T12:00:00Z",
  "dataCompleteness": 92,
  "verificationStatus": "verified"
}
```

---

## Display Rules

1. **Always show DOB + Age at Election + Current Age** — never just one
2. **Financial data**: Show per-election breakdown with growth visualization
3. **Criminal cases**: Show even if zero (transparency = showing clean record too)
4. **Election history**: All elections contested, not just wins
5. **Key contestants**: Show top 3 candidates per constituency for each election
6. **Red flags**: Auto-computed, shown prominently if critical
7. **Source attribution**: Every data point links to its source URL
8. **Completeness indicator**: Show what % of data is filled to set expectations
9. **Last updated**: Always show when data was last refreshed
10. **Cross-reference**: If discrepancy exists between sources, show both with note

---

## Data Priority (Conflict Resolution)

When multiple sources disagree:
1. **ECI Affidavit** (official legal filing) > all others for financial/criminal data
2. **Wikipedia** (community-verified) > all others for DOB and biographical facts
3. **PRS India** > others for legislative performance metrics
4. **MyNeta** = ECI data, just parsed — treat as equivalent
5. **Sansad.in** > others for current parliamentary positions/committee data

---

## Implementation Notes

- This template is implemented as TypeScript interface in `apps/mobile/lib/legislatorProfileTypes.ts`
- Scrapers output data conforming to this schema into `scrapers/output/merged/`
- The app reads from this unified data store, not individual source files
- All 29 states + 2 UTs (Delhi, Puducherry) covered
- Historical data from 2008-2009 onwards (last 3-4 elections per state)
- Template applies uniformly: same fields for MLA, MP (LS/RS), and MLC
