/**
 * Four-State Offline Mutation Sync Lifecycle Test Suite
 * Master Execution Framework — Jobs 030-037 / Launch Gate A
 *
 * Verifies:
 * 1. Complete 4-state lifecycle transitions: QUEUED -> SYNCING -> SYNCED | FAILED
 * 2. Store reconciliation: Authoritative server UUIDs replace client tokens
 * 3. Max retries handling & transition to FAILED state
 * 4. Manual retry mechanism via retryFailedOp
 * 5. Sync event listeners receive granular lifecycle events
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../lib/supabase', () => ({
  ...jest.requireActual('../lib/supabase'),
  isSupabaseConfigured: true,
}));

let mockIsOnline = true;
jest.mock('../lib/networkStatus', () => ({
  isOnline: () => mockIsOnline,
  useNetworkStore: {
    getState: () => ({ isConnected: mockIsOnline }),
  },
}));

import {
  enqueue,
  flushQueue,
  clearQueue,
  getPendingOps,
  addSyncListener,
  retryFailedOp,
  type SyncEvent,
} from '../lib/offlineSync';
import * as dataService from '../lib/supabaseDataService';
import { useFeedStore } from '../stores/feed';
import { useCivicStore } from '../stores/civic';

describe('Track 2: Four-State Offline Mutation Sync Lifecycle', () => {
  beforeEach(() => {
    clearQueue();
    mockIsOnline = true;
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearQueue();
  });

  describe('1. Lifecycle State Progression (Online & Offline)', () => {
    it('dispatches immediately and transitions to SYNCED when online', async () => {
      mockIsOnline = true;
      const events: SyncEvent[] = [];
      const unsub = addSyncListener((e) => events.push(e));

      jest.spyOn(dataService, 'composePost').mockResolvedValueOnce({
        id: 'server-post-uuid-123',
        success: true,
      });

      await enqueue(
        'compose_post',
        {
          content: 'Hello Kshetra',
          type: 'discussion',
          stateCode: 'TS',
          authorId: 'usr-1',
        },
        'client-token-1',
      );

      unsub();
      // When online, executes immediately without leaving items in queue
      expect(getPendingOps()).toHaveLength(0);
      expect(events).toEqual([
        { opType: 'compose_post', clientToken: 'client-token-1', status: 'SYNCING' },
        {
          opType: 'compose_post',
          clientToken: 'client-token-1',
          status: 'SYNCED',
          serverId: 'server-post-uuid-123',
        },
      ]);
    });

    it('enqueues with QUEUED status when offline', async () => {
      mockIsOnline = false;
      const events: SyncEvent[] = [];
      const unsub = addSyncListener((e) => events.push(e));

      await enqueue(
        'compose_post',
        {
          content: 'Offline post',
          type: 'discussion',
          stateCode: 'TS',
          authorId: 'usr-1',
        },
        'client-token-offline',
      );

      unsub();
      expect(getPendingOps()).toHaveLength(1);
      expect(events).toEqual([
        { opType: 'compose_post', clientToken: 'client-token-offline', status: 'QUEUED' },
      ]);
    });
  });

  describe('2. Queue Replay & Store Reconciliation on flushQueue', () => {
    it('reconciles feed store post with authoritative server UUID when flushed', async () => {
      // 1. Setup offline post in feed store
      mockIsOnline = false;
      const clientToken = 'client-token-reconcile-post';

      useFeedStore.setState({
        posts: [
          {
            id: clientToken,
            clientToken,
            author: { id: 'usr-1', displayName: 'Citizen' },
            content: 'Offline issue report',
            stateCode: 'TS',
            type: 'discussion',
            syncStatus: 'QUEUED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replyCount: 0,
            reactionCount: 0,
            isPinned: false,
            isDeleted: false,
          },
        ],
      });

      await enqueue(
        'compose_post',
        {
          content: 'Offline issue report',
          type: 'discussion',
          stateCode: 'TS',
          authorId: 'usr-1',
          clientToken,
        },
        clientToken,
      );

      // 2. Connectivity restored
      mockIsOnline = true;
      jest.spyOn(dataService, 'composePost').mockResolvedValueOnce({
        id: 'auth-server-uuid-777',
        success: true,
      });

      const { processed, failed } = await flushQueue();
      expect(processed).toBe(1);
      expect(failed).toBe(0);
      expect(getPendingOps()).toHaveLength(0);

      // Verify store reconciliation
      const posts = useFeedStore.getState().posts;
      const reconciled = posts.find((p) => p.id === 'auth-server-uuid-777');
      expect(reconciled).toBeDefined();
      expect(reconciled?.syncStatus).toBe('SYNCED');
      expect(reconciled?.clientToken).toBe(clientToken);
    });

    it('reconciles civic store issue with authoritative server UUID when flushed', async () => {
      mockIsOnline = false;
      const clientToken = 'client-token-reconcile-issue';

      useCivicStore.setState({
        issues: [
          {
            id: clientToken,
            clientToken,
            reporterId: 'usr-1',
            reporterName: 'Citizen',
            constituencyId: 'TS-AC-1',
            stateCode: 'TS',
            title: 'Water logging',
            category: 'water',
            severity: 'medium',
            status: 'open',
            syncStatus: 'QUEUED',
            upvoteCount: 0,
            commentCount: 0,
            followCount: 0,
            evidenceCount: 0,
            disputeCount: 0,
            mlaTagged: false,
            mlaResponded: false,
            isVerifiedReport: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      await enqueue(
        'report_issue',
        {
          title: 'Water logging',
          category: 'water',
          severity: 'medium',
          stateCode: 'TS',
          reporterId: 'usr-1',
          clientToken,
        },
        clientToken,
      );

      mockIsOnline = true;
      jest.spyOn(dataService, 'reportIssue').mockResolvedValueOnce({
        id: 'auth-issue-uuid-888',
        success: true,
      });

      const { processed, failed } = await flushQueue();
      expect(processed).toBe(1);
      expect(failed).toBe(0);

      const issues = useCivicStore.getState().issues;
      const reconciled = issues.find((i) => i.id === 'auth-issue-uuid-888');
      expect(reconciled).toBeDefined();
      expect(reconciled?.syncStatus).toBe('SYNCED');
    });
  });

  describe('3. Max Retries & FAILED Terminal State', () => {
    it('transitions to FAILED state after exhausting MAX_RETRIES (3 attempts)', async () => {
      mockIsOnline = false;
      const clientToken = 'client-token-failure';

      useFeedStore.setState({
        posts: [
          {
            id: clientToken,
            clientToken,
            author: { id: 'usr-1', displayName: 'Citizen' },
            content: 'Failing post',
            stateCode: 'TS',
            type: 'discussion',
            syncStatus: 'QUEUED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replyCount: 0,
            reactionCount: 0,
            isPinned: false,
            isDeleted: false,
          },
        ],
      });

      await enqueue(
        'compose_post',
        { content: 'Failing post', clientToken },
        clientToken,
      );

      mockIsOnline = true;
      jest.spyOn(dataService, 'composePost').mockResolvedValue({
        id: null,
        success: false,
      });

      // Attempt 1
      await flushQueue();
      expect(getPendingOps()[0].retries).toBe(1);
      expect(useFeedStore.getState().posts[0].syncStatus).toBe('QUEUED');

      // Attempt 2
      await flushQueue();
      expect(getPendingOps()[0].retries).toBe(2);
      expect(useFeedStore.getState().posts[0].syncStatus).toBe('QUEUED');

      // Attempt 3: Exhausted
      const result = await flushQueue();
      expect(result.failed).toBe(1);
      expect(getPendingOps()).toHaveLength(0); // dropped from pending queue
      expect(useFeedStore.getState().posts[0].syncStatus).toBe('FAILED');
    });

    it('manual retryFailedOp resets attempts and recovers to SYNCED upon backend recovery', async () => {
      const clientToken = 'client-token-manual-retry';

      useFeedStore.setState({
        posts: [
          {
            id: clientToken,
            clientToken,
            author: { id: 'usr-1', displayName: 'Citizen' },
            content: 'Recovering post',
            stateCode: 'TS',
            type: 'discussion',
            syncStatus: 'FAILED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replyCount: 0,
            reactionCount: 0,
            isPinned: false,
            isDeleted: false,
          },
        ],
      });

      // Enqueue again (user taps retry)
      mockIsOnline = false;
      await enqueue('compose_post', { content: 'Recovering post', clientToken }, clientToken);
      expect(useFeedStore.getState().posts[0].syncStatus).toBe('QUEUED');

      // Network back online and server succeeds
      mockIsOnline = true;
      jest.spyOn(dataService, 'composePost').mockResolvedValueOnce({
        id: 'recovered-server-uuid',
        success: true,
      });

      const recovered = await retryFailedOp(clientToken);
      expect(recovered).toBe(true);

      const post = useFeedStore.getState().posts.find((p) => p.id === 'recovered-server-uuid');
      expect(post?.syncStatus).toBe('SYNCED');
    });
  });
});
