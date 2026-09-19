import OpenAI from 'openai';
import { flagContent } from './moderation';

export interface ContentModerationResult {
  flagged: boolean;
  reasons: string[];
  provider: 'openai' | 'rule_engine';
  categories?: Record<string, boolean>;
  categoryScores?: Record<string, number>;
}

/**
 * ModerationUnavailableError
 * Thrown when an automated moderation provider or infrastructure dependency
 * fails, times out, or encounters a network error.
 * 
 * Semantic rule (DEF-004):
 * Network/provider failure != content violation.
 * Failing closed means the action/publication cannot proceed, but the content
 * must never be falsely marked as a policy violation.
 */
export class ModerationUnavailableError extends Error {
  public readonly code: string = 'MODERATION_UNAVAILABLE';
  public readonly statusCode: number = 503;
  public readonly cause?: unknown;

  constructor(message: string = 'Content moderation service is temporarily unavailable', cause?: unknown) {
    super(message);
    this.name = 'ModerationUnavailableError';
    this.cause = cause;
    Object.setPrototypeOf(this, ModerationUnavailableError.prototype);
  }
}

export type ModerationProviderMock = (text: string) => Promise<ContentModerationResult>;

let openAIClient: OpenAI | null = null;
let mockModerationProvider: ModerationProviderMock | null = null;

export function setMockModerationProvider(mock: ModerationProviderMock | null): void {
  mockModerationProvider = mock;
}

export function getMockModerationProvider(): ModerationProviderMock | null {
  return mockModerationProvider;
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey });
  }
  return openAIClient;
}

/**
 * Moderate text content using automated moderation (OpenAI or test mock)
 * with fallback to local safety patterns.
 *
 * If the external moderation provider fails or times out, it throws ModerationUnavailableError
 * (fail-closed, DEF-004) instead of silently treating unflagged content as compliant.
 */
export async function moderateContent(text: string, options?: { timeoutMs?: number }): Promise<ContentModerationResult> {
  // Step 1: Run local safety pattern check first
  const localCheck = flagContent(text);
  if (localCheck.flagged) {
    return {
      flagged: true,
      reasons: localCheck.reasons,
      provider: 'rule_engine',
    };
  }

  // Step 2: If a mock moderation provider is registered (for testing provider failures/timeouts), invoke it
  if (mockModerationProvider) {
    try {
      return await mockModerationProvider(text);
    } catch (err) {
      if (err instanceof ModerationUnavailableError) {
        throw err;
      }
      throw new ModerationUnavailableError(
        'Content moderation service is temporarily unavailable',
        err
      );
    }
  }

  // Step 3: Check external provider (OpenAI)
  const ai = getOpenAI();
  if (ai) {
    const timeoutMs = options?.timeoutMs ?? 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await ai.moderations.create(
        { input: text },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

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

      return {
        flagged: false,
        reasons: [],
        provider: 'openai',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('[ModerationService] External moderation provider failed or timed out:', err?.message || err);
      // DEF-004: Network/provider failure != content violation.
      // Must NOT swallow exception and return flagged: false.
      throw new ModerationUnavailableError(
        'Content moderation service is temporarily unavailable',
        err
      );
    }
  }

  // Step 4: When no external moderation provider is configured (e.g. OPENAI_API_KEY missing/unset)
  // DEF-004 Remediation: No required moderation decision may silently resolve to compliant!
  // Failing closed means the action/publication cannot proceed without required moderation.
  throw new ModerationUnavailableError(
    'Content moderation provider is not configured or unavailable'
  );
}
