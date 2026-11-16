jest.mock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
jest.mock('../lib/api', () => ({ apiClient: { civic: { listIssues: jest.fn() } } }));
jest.mock('../lib/supabaseDataService', () => ({}));
jest.mock('../lib/offlineSync', () => ({ enqueue: jest.fn(), retryFailedOp: jest.fn() }));
jest.mock('../stores/auth', () => ({ useAuthStore: { getState: () => ({ user: null }) } }));

import { apiClient } from '../lib/api';
import { useCivicStore } from '../stores/civic';

const issueRow = (id: string) => ({
  id,
  reporter_id: 'user-1',
  reporter_name: 'Citizen',
  state_code: 'TS',
  constituency_id: 'TS-AC-1',
  title: 'Road repair needed',
  category: 'roads',
  severity: 'medium',
  status: 'open',
  upvote_count: 0,
  comment_count: 0,
  follow_count: 0,
  evidence_count: 0,
  dispute_count: 0,
  media_urls: [],
  created_at: '2026-11-16T10:00:00.000Z',
  updated_at: '2026-11-16T10:00:00.000Z',
});

describe('civic issue scope refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCivicStore.setState({
      issues: [],
      issueLoadStatus: 'idle',
      issueLoadScopeKey: null,
      issueLoadTotal: null,
      issueLoadPage: 0,
      issueRefreshing: false,
      issueRefreshError: false,
    });
  });

  it('refreshes an expired scope while retaining last good issues when the request fails', async () => {
    const listIssues = apiClient.civic.listIssues as jest.Mock;
    listIssues.mockResolvedValueOnce({ issues: [issueRow('existing')], total: 1, page: 1, limit: 50 });
    await useCivicStore.getState().loadIssuesForScope('state', 'TS');

    const now = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      await useCivicStore.getState().loadIssuesForScope('state', 'TS');
      expect(listIssues).toHaveBeenCalledTimes(1);

      nowSpy.mockReturnValue(now + 60_001);
      listIssues.mockRejectedValueOnce(new Error('temporary network failure'));
      await expect(useCivicStore.getState().loadIssuesForScope('state', 'TS')).rejects.toThrow(
        'temporary network failure',
      );

      expect(useCivicStore.getState()).toMatchObject({
        issueLoadStatus: 'loaded',
        issueRefreshing: false,
        issueRefreshError: true,
        issues: [{ id: 'existing' }],
      });
      expect(listIssues).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
