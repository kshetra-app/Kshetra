/**
 * KSHETRA Pulse Core — Real-Time & Historical Deep Analytics Engine
 *
 * Provides authoritative algorithms for:
 * 1. Anti-Incumbency Vulnerability Index (AIVI: 0–100)
 * 2. Multi-Axis Sentiment Radar (5-pillar civic mood)
 * 3. Civic Anomaly & Flashpoint Detector
 * 4. Executive Intelligence Briefing Synthesis
 */

export type VulnerabilityTier =
  | 'safe_stronghold'
  | 'likely_hold'
  | 'battleground_lean'
  | 'high_vulnerability_flip';

export interface VulnerabilityAssessment {
  score: number; // 0 to 100
  tier: VulnerabilityTier;
  label: string;
  color: string;
  confidence: number; // 0.0 to 1.0
  riskFactors: string[];
  swingProbability: number; // 0.0 to 1.0
}

export interface SentimentRadarScores {
  governance: number;      // 0-100
  infrastructure: number;  // 0-100
  welfare: number;         // 0-100
  economy: number;         // 0-100
  candidateTrust: number;  // 0-100
  overallSentiment: number;// -100 to +100
}

export interface FlashpointAnomaly {
  id: string;
  constituencyId: string;
  mandal?: string;
  category: 'water' | 'roads' | 'electricity' | 'health' | 'law_and_order' | 'political';
  surgePercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedAt: string;
}

export interface ExecutiveBriefing {
  constituencyId: string;
  constituencyName: string;
  stateCode: string;
  generatedAt: string;
  headline: string;
  vulnerability: VulnerabilityAssessment;
  sentimentRadar: SentimentRadarScores;
  activeFlashpoints: FlashpointAnomaly[];
  keyTakeaways: string[];
  strategicRecommendations: string[];
}

// ── 1. Anti-Incumbency Vulnerability Index (AIVI) ───────────────────────────

export interface AIVIInputs {
  marginPercent: number; // Last election margin % (e.g. 5.2)
  tenureTerms: number; // Terms served by current party/MLA (e.g. 2)
  unresolvedGrievanceRatio: number; // 0.0 (all resolved) to 1.0 (none resolved)
  sentimentScore: number; // -100 (hostile) to +100 (euphoric)
  demographicShiftFactor?: number; // 0.0 to 1.0 (boundary change impact)
  newsNegativeRatio?: number; // 0.0 to 1.0
}

/**
 * Computes the Anti-Incumbency Vulnerability Index (AIVI) on a 0–100 scale.
 * Higher score = higher probability of seat flip.
 */
export function computeAIVI(inputs: AIVIInputs): VulnerabilityAssessment {
  const {
    marginPercent,
    tenureTerms,
    unresolvedGrievanceRatio,
    sentimentScore,
    demographicShiftFactor = 0.1,
    newsNegativeRatio = 0.2,
  } = inputs;

  const riskFactors: string[] = [];

  // Component 1: Margin Vulnerability (0 to 35 pts)
  // Margins < 5% get max vulnerability; margins > 25% get near 0.
  let marginRisk = 0;
  if (marginPercent <= 3.0) {
    marginRisk = 35;
    riskFactors.push(`Razor-thin previous victory margin (${marginPercent.toFixed(1)}%)`);
  } else if (marginPercent <= 7.0) {
    marginRisk = 26;
    riskFactors.push(`Narrow margin under 7% (${marginPercent.toFixed(1)}%)`);
  } else if (marginPercent <= 15.0) {
    marginRisk = 15;
  } else {
    marginRisk = Math.max(0, 35 - marginPercent * 1.2);
  }

  // Component 2: Tenure & Anti-Incumbency Fatigue (0 to 25 pts)
  let tenureRisk = 0;
  if (tenureTerms >= 3) {
    tenureRisk = 25;
    riskFactors.push(`High voter fatigue: ${tenureTerms}+ consecutive terms in power`);
  } else if (tenureTerms === 2) {
    tenureRisk = 16;
    riskFactors.push('Two-term incumbency pressure');
  } else {
    tenureRisk = 6;
  }

  // Component 3: Civic Grievance Backlog (0 to 20 pts)
  const grievanceRisk = Math.min(20, Math.round(unresolvedGrievanceRatio * 20));
  if (unresolvedGrievanceRatio > 0.6) {
    riskFactors.push(`High unresolved grievance backlog (${Math.round(unresolvedGrievanceRatio * 100)}%)`);
  }

  // Component 4: Net Sentiment Deficit (0 to 20 pts)
  // Sentiment runs -100 to +100. Negative sentiment adds risk.
  let sentimentRisk = 0;
  if (sentimentScore < -20) {
    sentimentRisk = 20;
    riskFactors.push('Strong negative ground voter sentiment');
  } else if (sentimentScore < 0) {
    sentimentRisk = 13;
    riskFactors.push('Subdued voter sentiment');
  } else if (sentimentScore < 30) {
    sentimentRisk = 6;
  } else {
    sentimentRisk = 0;
  }

  // Component 5: Modifiers (Demographic Shift & Negative News)
  const modifier = Math.round(demographicShiftFactor * 5 + newsNegativeRatio * 5);

  const rawScore = marginRisk + tenureRisk + grievanceRisk + sentimentRisk + modifier;
  const score = Math.max(0, Math.min(100, rawScore));

  let tier: VulnerabilityTier = 'safe_stronghold';
  let label = 'Safe Stronghold';
  let color = '#10B981'; // Emerald

  if (score >= 70) {
    tier = 'high_vulnerability_flip';
    label = 'High Vulnerability (Flip Risk)';
    color = '#EF4444'; // Red
  } else if (score >= 45) {
    tier = 'battleground_lean';
    label = 'Battleground Lean';
    color = '#F59E0B'; // Amber
  } else if (score >= 25) {
    tier = 'likely_hold';
    label = 'Likely Hold';
    color = '#3B82F6'; // Blue
  }

  const swingProbability = parseFloat((score / 100 * 0.85).toFixed(2));
  const confidence = 0.92;

  return {
    score,
    tier,
    label,
    color,
    confidence,
    riskFactors: riskFactors.length > 0 ? riskFactors : ['Stable multi-cycle voting base'],
    swingProbability,
  };
}

// ── 2. Sentiment Radar Calculator ──────────────────────────────────────────

export function computeSentimentRadar(
  grievancesByCategory: Record<string, number>,
  resolvedPercent: number,
  newsPositivity: number, // 0.0 to 1.0
  pollingApproval: number, // 0.0 to 1.0
): SentimentRadarScores {
  const waterRoadCount = (grievancesByCategory['water'] ?? 0) + (grievancesByCategory['roads'] ?? 0);
  const infraScore = Math.max(20, Math.min(95, Math.round(100 - waterRoadCount * 2 + resolvedPercent * 0.3)));
  const govScore = Math.max(20, Math.min(95, Math.round(resolvedPercent * 0.6 + pollingApproval * 40)));
  const welfareScore = Math.max(30, Math.min(95, Math.round(pollingApproval * 60 + 30)));
  const econScore = Math.max(25, Math.min(90, Math.round(newsPositivity * 50 + 35)));
  const candidateTrust = Math.max(20, Math.min(98, Math.round(pollingApproval * 70 + newsPositivity * 25)));

  const overall = Math.round(((govScore + infraScore + welfareScore + econScore + candidateTrust) / 5 - 50) * 2);

  return {
    governance: govScore,
    infrastructure: infraScore,
    welfare: welfareScore,
    economy: econScore,
    candidateTrust,
    overallSentiment: Math.max(-100, Math.min(100, overall)),
  };
}

// ── 3. Executive AI Briefing Generator ─────────────────────────────────────

export function generateExecutiveBriefing(
  constituencyId: string,
  constituencyName: string,
  stateCode: string,
  aivi: VulnerabilityAssessment,
  radar: SentimentRadarScores,
  flashpoints: FlashpointAnomaly[] = [],
): ExecutiveBriefing {
  const isHighRisk = aivi.score >= 50;

  const headline = isHighRisk
    ? `${constituencyName} (${stateCode}) faces elevated anti-incumbency pressure (${aivi.score}/100) driven by ${aivi.riskFactors[0]?.toLowerCase() ?? 'voter sentiment'}.`
    : `${constituencyName} (${stateCode}) remains a stable incumbent seat (${aivi.score}/100) with strong base loyalty.`;

  const keyTakeaways: string[] = [
    `Anti-Incumbency Vulnerability is rated at ${aivi.score}/100 (${aivi.label}).`,
    `Infrastructure satisfaction stands at ${radar.infrastructure}/100, while Governance response is ${radar.governance}/100.`,
    `Candidate Trust index is currently indexed at ${radar.candidateTrust}/100.`,
  ];

  if (flashpoints.length > 0) {
    keyTakeaways.push(`Active civic flashpoint detected: ${flashpoints[0].description}`);
  }

  const strategicRecommendations: string[] = isHighRisk
    ? [
        'Prioritize high-visibility municipal grievance resolution in critical mandals.',
        'Intensify grassroots door-to-door outreach to counter anti-incumbency fatigue.',
        'Spotlight state welfare delivery and direct benefit transfer track records in campaign messaging.',
      ]
    : [
        'Maintain voter turnout momentum through active booth-level worker engagement.',
        'Monitor local opposition candidate alliances and seat-sharing dynamics.',
        'Reinforce incumbent track record through digital and WhatsApp broadcast channels.',
      ];

  return {
    constituencyId,
    constituencyName,
    stateCode,
    generatedAt: new Date().toISOString(),
    headline,
    vulnerability: aivi,
    sentimentRadar: radar,
    activeFlashpoints: flashpoints,
    keyTakeaways,
    strategicRecommendations,
  };
}
