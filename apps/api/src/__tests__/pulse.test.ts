import {
  computeAIVI,
  computeSentimentRadar,
  generateExecutiveBriefing,
} from '@kshetra/shared';

describe('KSHETRA Pulse Engine', () => {
  it('computes low vulnerability for a safe stronghold', () => {
    const assessment = computeAIVI({
      marginPercent: 28.5,
      tenureTerms: 1,
      unresolvedGrievanceRatio: 0.15,
      sentimentScore: 45,
    });

    expect(assessment.score).toBeLessThan(35);
    expect(assessment.tier).toBe('safe_stronghold');
    expect(assessment.confidence).toBeGreaterThan(0.8);
  });

  it('computes high vulnerability for a razor-thin multi-term seat with high complaints', () => {
    const assessment = computeAIVI({
      marginPercent: 1.8,
      tenureTerms: 3,
      unresolvedGrievanceRatio: 0.85,
      sentimentScore: -35,
    });

    expect(assessment.score).toBeGreaterThanOrEqual(70);
    expect(assessment.tier).toBe('high_vulnerability_flip');
    expect(assessment.riskFactors.length).toBeGreaterThan(2);
  });

  it('computes 5-pillar sentiment radar scores accurately', () => {
    const radar = computeSentimentRadar(
      { water: 5, roads: 8 },
      75,
      0.8,
      0.7,
    );

    expect(radar.governance).toBeGreaterThan(50);
    expect(radar.infrastructure).toBeGreaterThan(50);
    expect(radar.welfare).toBeGreaterThan(50);
    expect(radar.candidateTrust).toBeGreaterThan(50);
    expect(radar.overallSentiment).toBeGreaterThan(0);
  });

  it('generates an actionable executive briefing', () => {
    const aivi = computeAIVI({
      marginPercent: 3.2,
      tenureTerms: 2,
      unresolvedGrievanceRatio: 0.6,
      sentimentScore: -10,
    });

    const radar = computeSentimentRadar({}, 60, 0.5, 0.5);

    const briefing = generateExecutiveBriefing('TS-AC-1', 'Sirpur', 'TS', aivi, radar);

    expect(briefing.constituencyName).toBe('Sirpur');
    expect(briefing.headline).toContain('Sirpur');
    expect(briefing.keyTakeaways.length).toBeGreaterThan(0);
    expect(briefing.strategicRecommendations.length).toBeGreaterThan(0);
  });
});
