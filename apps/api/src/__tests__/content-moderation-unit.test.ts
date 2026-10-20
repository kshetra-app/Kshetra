import {
  moderateContent,
  setMockModerationProvider,
  getMockModerationProvider,
  ModerationUnavailableError,
} from '../services/contentModeration';

const mockModerationsCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    moderations: {
      create: (...args: any[]) => mockModerationsCreate(...args),
    },
  }));
});

describe('Content Moderation Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    mockModerationsCreate.mockReset();
    setMockModerationProvider(null);
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    setMockModerationProvider(null);
  });

  describe('ModerationUnavailableError', () => {
    it('initializes with default message and standard properties', () => {
      const err = new ModerationUnavailableError();
      expect(err.name).toBe('ModerationUnavailableError');
      expect(err.code).toBe('MODERATION_UNAVAILABLE');
      expect(err.statusCode).toBe(503);
      expect(err.message).toBe('Content moderation service is temporarily unavailable');
      expect(err.cause).toBeUndefined();
      expect(err instanceof Error).toBe(true);
      expect(err instanceof ModerationUnavailableError).toBe(true);
    });

    it('initializes with custom message and cause', () => {
      const rootCause = new Error('Socket timeout');
      const err = new ModerationUnavailableError('Provider timed out', rootCause);
      expect(err.name).toBe('ModerationUnavailableError');
      expect(err.code).toBe('MODERATION_UNAVAILABLE');
      expect(err.statusCode).toBe(503);
      expect(err.message).toBe('Provider timed out');
      expect(err.cause).toBe(rootCause);
    });
  });

  describe('Rule Engine (Local Safety Patterns)', () => {
    it('flags content containing local safety violations immediately without external call', async () => {
      const text = 'I will kill you all in a violent attack';
      const result = await moderateContent(text);
      expect(result.flagged).toBe(true);
      expect(result.provider).toBe('rule_engine');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('Mock Moderation Provider', () => {
    it('sets and gets mock moderation provider correctly', () => {
      const dummyMock = jest.fn();
      setMockModerationProvider(dummyMock);
      expect(getMockModerationProvider()).toBe(dummyMock);
      setMockModerationProvider(null);
      expect(getMockModerationProvider()).toBeNull();
    });

    it('invokes mock provider when registered for non-flagged local content', async () => {
      const mockResult = {
        flagged: false,
        reasons: [],
        provider: 'openai' as const,
      };
      const mockFn = jest.fn().mockResolvedValue(mockResult);
      setMockModerationProvider(mockFn);

      const result = await moderateContent('Clean civic discussion regarding public parks');
      expect(mockFn).toHaveBeenCalledWith('Clean civic discussion regarding public parks');
      expect(result).toEqual(mockResult);
    });

    it('rethrows ModerationUnavailableError directly when thrown by mock provider', async () => {
      const unavail = new ModerationUnavailableError('Direct upstream failure');
      setMockModerationProvider(jest.fn().mockRejectedValue(unavail));

      await expect(
        moderateContent('Neutral text for moderation check')
      ).rejects.toThrow(unavail);
    });

    it('wraps generic Error from mock provider in ModerationUnavailableError', async () => {
      const genericError = new Error('Unexpected network crash');
      setMockModerationProvider(jest.fn().mockRejectedValue(genericError));

      try {
        await moderateContent('Neutral text');
        fail('Should have thrown ModerationUnavailableError');
      } catch (err: any) {
        expect(err instanceof ModerationUnavailableError).toBe(true);
        expect(err.message).toBe('Content moderation service is temporarily unavailable');
        expect(err.cause).toBe(genericError);
      }
    });
  });

  describe('External Provider (OpenAI Moderation API)', () => {
    it('throws ModerationUnavailableError when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(
        moderateContent('Neutral text with no API key')
      ).rejects.toThrow(ModerationUnavailableError);

      await expect(
        moderateContent('Neutral text with no API key')
      ).rejects.toThrow('Content moderation provider is not configured or unavailable');
    });

    it('successfully processes flagged content from OpenAI moderation API', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-test-key';

      mockModerationsCreate.mockResolvedValueOnce({
        results: [
          {
            flagged: true,
            categories: {
              hate: true,
              violence: false,
              harassment: true,
            },
            category_scores: {
              hate: 0.92,
              violence: 0.05,
              harassment: 0.88,
            },
          },
        ],
      });

      const result = await moderateContent('Questionable text subject to AI audit');
      expect(result.flagged).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.reasons).toEqual([
        'Flagged by automated moderation: hate',
        'Flagged by automated moderation: harassment',
      ]);
      expect(result.categories).toBeDefined();
      expect(result.categoryScores).toBeDefined();
    });

    it('successfully processes clean unflagged content from OpenAI moderation API', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-test-key';

      mockModerationsCreate.mockResolvedValueOnce({
        results: [
          {
            flagged: false,
            categories: {
              hate: false,
              violence: false,
            },
            category_scores: {
              hate: 0.001,
              violence: 0.002,
            },
          },
        ],
      });

      const result = await moderateContent('Clean constituency newsletter text');
      expect(result.flagged).toBe(false);
      expect(result.provider).toBe('openai');
      expect(result.reasons).toEqual([]);
    });

    it('handles empty results array from OpenAI gracefully as unflagged', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-test-key';

      mockModerationsCreate.mockResolvedValueOnce({
        results: [],
      });

      const result = await moderateContent('Content with empty results array');
      expect(result.flagged).toBe(false);
      expect(result.provider).toBe('openai');
      expect(result.reasons).toEqual([]);
    });

    it('throws ModerationUnavailableError when OpenAI moderation call fails or times out', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-test-key';

      const apiError = new Error('504 Gateway Timeout from api.openai.com');
      mockModerationsCreate.mockRejectedValueOnce(apiError);

      try {
        await moderateContent('Any text triggering OpenAI timeout', { timeoutMs: 100 });
        fail('Should have thrown ModerationUnavailableError');
      } catch (err: any) {
        expect(err instanceof ModerationUnavailableError).toBe(true);
        expect(err.cause).toBe(apiError);
      }
    });

    it('respects custom timeoutMs option and fires abort callback when timeout expires', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-test-key';

      mockModerationsCreate.mockImplementationOnce((_params, options) => {
        return new Promise((_, reject) => {
          if (options.signal?.aborted) {
            reject(new Error('Aborted immediately'));
          } else {
            options.signal?.addEventListener('abort', () => {
              reject(new Error('Operation aborted by controller'));
            });
          }
        });
      });

      await expect(
        moderateContent('Timeout trigger text', { timeoutMs: 10 })
      ).rejects.toThrow(ModerationUnavailableError);
    });
  });
});
