jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../lib/environment', () => ({
  ...jest.requireActual('../lib/environment'),
  IS_LIVE_ENVIRONMENT: true,
}));
jest.mock('../lib/supabaseDataService', () => ({ composePost: jest.fn(), editPost: jest.fn() }));

import type { Post } from '../lib/feedTypes';
import { useFeedStore } from '../stores/feed';
import { useAuthStore } from '../stores/auth';
import { useNetworkStore } from '../lib/networkStatus';
import * as data from '../lib/supabaseDataService';
import { addSyncListener, clearQueue, flushQueue, getPendingOps, type SyncEvent } from '../lib/offlineSync';

const user = { id: 'creator-a', email: 'creator-a@example.test' };
const draft: Post = {
  id: 'client-a', clientToken: 'client-a', author: { id: user.id, displayName: 'Author A' },
  stateCode: 'NATIONAL', content: 'Review fixture', type: 'discussion', replyCount: 0, reactionCount: 0,
  createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:00Z', isPinned: false, isDeleted: false,
};

beforeEach(() => {
  clearQueue();
  jest.resetAllMocks();
  useAuthStore.setState({ user: user as any });
  useFeedStore.setState({ posts: [], lastPostTime: 0 });
  useNetworkStore.setState({ isConnected: true });
});

it('submits national posts for review and keeps pending text out of the public feed', async () => {
  let finish!: (value: Awaited<ReturnType<typeof data.composePost>>) => void;
  jest.mocked(data.composePost).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const submission = useFeedStore.getState().addPost(draft);
  expect(useFeedStore.getState().posts).toEqual([]);
  expect(data.composePost).toHaveBeenCalledWith(expect.objectContaining({ stateCode: 'IN', clientToken: 'client-a' }));
  finish({ id: 'post-a', success: true, reviewStatus: 'pending' });
  await expect(submission).resolves.toBe('pending');
  expect(useFeedStore.getState().posts).toEqual([]);
});

it('removes an edited public item while it awaits the second review', async () => {
  useFeedStore.setState({ posts: [{ ...draft, id: 'post-a' }] });
  jest.mocked(data.editPost).mockResolvedValueOnce('pending');
  await expect(useFeedStore.getState().editPost('post-a', 'Updated')).resolves.toBe('pending');
  expect(useFeedStore.getState().posts).toEqual([]);
});

it('retains a private queued submission across account switches and reports the actual replay receipt', async () => {
  useNetworkStore.setState({ isConnected: false });
  await expect(useFeedStore.getState().addPost(draft)).resolves.toBe('queued');
  expect(useFeedStore.getState().posts).toEqual([]);
  expect(getPendingOps()[0].payload).toMatchObject({ stateCode: 'IN', authorId: user.id });
  useAuthStore.setState({ user: { ...user, id: 'creator-b' } as any });
  useNetworkStore.setState({ isConnected: true });
  await flushQueue();
  expect(data.composePost).not.toHaveBeenCalled();
  expect(getPendingOps()).toHaveLength(1);
  const events: SyncEvent[] = [];
  const unsubscribe = addSyncListener((event) => events.push(event));
  try {
    useAuthStore.setState({ user: user as any });
    jest.mocked(data.composePost).mockResolvedValueOnce({ id: 'post-a', success: true, reviewStatus: 'pending' });
    await flushQueue();
    expect(events).toContainEqual(expect.objectContaining({
      status: 'SYNCED', reviewStatus: 'pending', serverId: 'post-a', replayAuthorId: user.id,
    }));
    expect(getPendingOps()).toEqual([]);
    expect(useFeedStore.getState().posts).toEqual([]);
  } finally {
    unsubscribe();
  }
});
