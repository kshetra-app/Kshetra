jest.mock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
jest.mock('../lib/api', () => ({
  apiClient: { civic: { listIssues: jest.fn(), getIssue: jest.fn(), getIssueComments: jest.fn(), getIssueHistory: jest.fn() } },
}));
jest.mock('../lib/supabaseDataService', () => ({}));
jest.mock('../lib/offlineSync', () => ({ enqueue: jest.fn(), retryFailedOp: jest.fn() }));
jest.mock('../stores/auth', () => ({ useAuthStore: { getState: jest.fn() } }));

import { apiClient } from '../lib/api';
import { ApiAuthError } from '../lib/api/errors';
import { useAuthStore } from '../stores/auth';
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
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: null });
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

  it('opens a public issue even when the account finishes loading during the request', async () => {
    const read = apiClient.civic.getIssue as jest.Mock;
    read.mockImplementationOnce(async () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
      return { data: { issue: issueRow('linked-report') } };
    });
    (apiClient.civic.getIssueComments as jest.Mock).mockResolvedValueOnce({ data: { comments: [] } });
    (apiClient.civic.getIssueHistory as jest.Mock).mockResolvedValueOnce({ data: { history: [] } });

    await expect(useCivicStore.getState().loadIssueDetails('linked-report')).resolves.toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('linked-report', false);
    expect(useCivicStore.getState().getIssueById('linked-report')?.title).toBe('Road repair needed');
  });

  it('retries a public issue read when a restored session cannot authenticate', async () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    const read = apiClient.civic.getIssue as jest.Mock;
    read.mockRejectedValueOnce(new ApiAuthError('Session expired'))
      .mockResolvedValueOnce({ data: { issue: issueRow('linked-report') } });
    (apiClient.civic.getIssueComments as jest.Mock).mockResolvedValueOnce({ data: { comments: [] } });
    (apiClient.civic.getIssueHistory as jest.Mock).mockResolvedValueOnce({ data: { history: [] } });

    await expect(useCivicStore.getState().loadIssueDetails('linked-report')).resolves.toBe(true);
    expect(read.mock.calls).toEqual([['linked-report', true], ['linked-report', false]]);
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
