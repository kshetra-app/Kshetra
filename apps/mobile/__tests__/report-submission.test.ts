jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: true,
}));
jest.mock('../lib/errorReporting', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));
jest.mock('../lib/api', () => ({
  apiClient: { request: jest.fn() },
}));

import { apiClient } from '../lib/api';
import { submitContentReport } from '../lib/supabaseDataService';

describe('submitContentReport', () => {
  const request = apiClient.request as jest.Mock;

  afterEach(() => jest.resetAllMocks());

  it.each(['post', 'comment', 'user'] as const)(
    'submits %s reports through the authenticated API client',
    async (targetType) => {
      request.mockResolvedValue({ statusCode: 201 });

      await expect(
        submitContentReport({
          targetType,
          targetId: 'target-1',
          reason: 'spam',
        }),
      ).resolves.toBe(true);

      expect(request).toHaveBeenCalledWith('/api/v1/moderation/report', {
        method: 'POST',
        body: {
          contentId: 'target-1',
          contentType: targetType,
          reason: 'spam',
          description: undefined,
        },
        authPolicy: 'authenticated',
      });
    },
  );

  it('reports failure when the API request cannot be completed', async () => {
    request.mockRejectedValue(new Error('Unauthorized'));

    await expect(
      submitContentReport({ targetType: 'post', targetId: 'post-1', reason: 'spam' }),
    ).resolves.toBe(false);
  });
});

