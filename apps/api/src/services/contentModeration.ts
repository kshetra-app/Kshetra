import OpenAI from 'openai';
import { flagContent } from './moderation';

export interface ContentModerationResult {
  flagged: boolean;
  reasons: string[];
  provider: 'openai' | 'rule_engine';
  categories?: Record<string, boolean>;
  categoryScores?: Record<string, number>;
}

let openAIClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey });
  }
  return openAIClient;
}

/**
 * Moderate text content using OpenAI Moderation API with fallback to local safety patterns.
 */
export async function moderateContent(text: string): Promise<ContentModerationResult> {
  const localCheck = flagContent(text);
  if (localCheck.flagged) {
    return {
      flagged: true,
      reasons: localCheck.reasons,
      provider: 'rule_engine',
    };
  }

  const ai = getOpenAI();
  if (ai) {
    try {
      const response = await ai.moderations.create({
        input: text,
      });

      const result = response.results?.[0];
      if (result && result.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, isFlagged]) => isFlagged)
          .map(([cat]) => cat);

        return {
          flagged: true,
          reasons: flaggedCategories.map((c) => `Flagged by automated moderation: ${c}`),
          provider: 'openai',
          categories: result.categories as unknown as Record<string, boolean>,
          categoryScores: result.category_scores as unknown as Record<string, number>,
        };
      }
    } catch (err) {
      console.warn('[ModerationService] OpenAI moderation call failed, relying on local safety rules:', err);
    }
  }

  return {
    flagged: false,
    reasons: [],
    provider: ai ? 'openai' : 'rule_engine',
  };
}
