import type { FastifyInstance } from 'fastify';
import {
  computeAIVI,
  computeSentimentRadar,
  generateExecutiveBriefing,
  type FlashpointAnomaly,
} from '@kshetra/shared';
import { getConstituencies, getRawConstituency } from '../services/stateData';

export async function intelligenceRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/enterprise/intelligence/constituency/:stateCode/:acNo/pulse
   * Returns deep analytics: Anti-Incumbency Vulnerability Index (AIVI),
   * 5-Pillar Sentiment Radar, active flashpoints, and AI Executive Briefing.
   */
  app.get(
    '/api/v1/enterprise/intelligence/constituency/:stateCode/:acNo/pulse',
    async (request, reply) => {
      const { stateCode, acNo: acNoStr } = request.params as {
        stateCode: string;
        acNo: string;
      };

      const code = stateCode.toUpperCase();
      const acNo = parseInt(acNoStr, 10);
      const raw = getRawConstituency(code, acNo);

      if (!raw) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Constituency AC-${acNo} in state ${code} not found`,
        });
      }

      // Compute Margin %
      const votes = raw.winnerVotes2024 ?? raw.winnerVotes2023 ?? raw.winnerVotes ?? 65000;
      const margin = raw.margin2024 ?? raw.margin2023 ?? raw.margin ?? 4500;
      const marginPercent = votes > 0 ? (margin / votes) * 100 : 5.0;
      const tenureTerms = raw.termsServed ?? 2;

      // Real-Time / Simulated Stream Indicators
      const aivi = computeAIVI({
        marginPercent,
        tenureTerms,
        unresolvedGrievanceRatio: 0.38,
        sentimentScore: 12,
        demographicShiftFactor: 0.15,
        newsNegativeRatio: 0.22,
      });

      const radar = computeSentimentRadar(
        { water: 12, roads: 18, sanitation: 6, electricity: 4 },
        68,
        0.72,
        0.65,
      );

      const flashpoints: FlashpointAnomaly[] = aivi.score >= 50 ? [
        {
          id: `fp-${code}-${acNo}-1`,
          constituencyId: `${code}-AC-${acNo}`,
          mandal: 'Central Town',
          category: 'water',
          surgePercentage: 180,
          severity: 'high',
          description: 'Drinking water pipeline maintenance delay causing localized citizen dissatisfaction surge.',
          reportedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        }
      ] : [];

      const briefing = generateExecutiveBriefing(
        `${code}-AC-${acNo}`,
        raw.name,
        code,
        aivi,
        radar,
        flashpoints,
      );

      return {
        status: 'ok',
        constituency: {
          id: `${code}-AC-${acNo}`,
          name: raw.name,
          acNo,
          stateCode: code,
          currentParty: raw.winner2024 ?? raw.winner2023 ?? raw.winner ?? '',
          currentMLA: raw.winnerName2024 ?? raw.winnerName2023 ?? raw.winnerName ?? '',
        },
        pulse: {
          aivi,
          sentimentRadar: radar,
          activeFlashpoints: flashpoints,
          executiveBriefing: briefing,
        },
      };
    },
  );

  /**
   * GET /api/v1/enterprise/intelligence/states/:stateCode/heatmap
   * Returns high-level choropleth vulnerability and sentiment scores for all ACs in a state.
   */
  app.get('/api/v1/enterprise/intelligence/states/:stateCode/heatmap', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const code = stateCode.toUpperCase();
    const all = getConstituencies(code);

    if (all.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `State ${code} has no data available`,
      });
    }

    const items = all.map((c) => {
      const raw = getRawConstituency(code, c.acNo);
      const votes = raw?.winnerVotes2024 ?? raw?.winnerVotes2023 ?? raw?.winnerVotes ?? 60000;
      const margin = raw?.margin2024 ?? raw?.margin2023 ?? raw?.margin ?? 5000;
      const marginPercent = votes > 0 ? (margin / votes) * 100 : 7.0;

      const aivi = computeAIVI({
        marginPercent,
        tenureTerms: 1,
        unresolvedGrievanceRatio: 0.3,
        sentimentScore: 15,
      });

      return {
        id: c.id,
        acNo: c.acNo,
        name: c.name,
        party: c.currentParty,
        vulnerabilityScore: aivi.score,
        vulnerabilityTier: aivi.tier,
        vulnerabilityColor: aivi.color,
      };
    });

    return {
      status: 'ok',
      stateCode: code,
      totalCount: items.length,
      heatmap: items,
    };
  });
}
