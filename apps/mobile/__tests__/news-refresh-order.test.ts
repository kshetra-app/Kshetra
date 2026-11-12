jest.mock('../lib/constants', () => ({
  API_BASE_URL: 'https://api.example.test',
  REMOTE_API_URL: '',
}));
jest.mock('../lib/api', () => ({
  apiClient: { news: { getFeed: jest.fn() } },
}));
jest.mock('../lib/news/scrape', () => ({
  scrapeNewsOnDevice: jest.fn(),
}));
jest.mock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
jest.mock('../lib/storage', () => ({
  mmkvStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import type { NewsFeed } from '../lib/newsTypes';
import { scrapeNewsOnDevice } from '../lib/news/scrape';
import { useNewsStore } from '../stores/news';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function makeFeed(id: string): NewsFeed {
  return {
    version: 1,
    generatedAt: id,
    refreshIntervalMin: 60,
    sources: [],
    items: [
      {
        id,
        title: id,
        sourceUrl: `https://example.test/${id}`,
        source: { id: 'test', name: 'Test', domain: 'example.test', language: 'en' },
        language: 'en',
        category: 'top',
        scope: 'national',
        publishedAt: '2026-11-12T10:00:00.000Z',
      },
    ],
  };
}

describe('news refresh ordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNewsStore.setState({
      items: [],
      generatedAt: '',
      loading: false,
      language: null,
    });
  });

  it('keeps a newer feed when an older same-language refresh finishes later', async () => {
    const older = deferred<NewsFeed>();
    const newer = deferred<NewsFeed>();
    (scrapeNewsOnDevice as jest.Mock)
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);

    const olderRefresh = useNewsStore.getState().refresh();
    const newerRefresh = useNewsStore.getState().refresh();
    await Promise.resolve();

    newer.resolve(makeFeed('newer-story'));
    await newerRefresh;
    expect(useNewsStore.getState().items.map((item) => item.id)).toEqual(['newer-story']);

    older.resolve(makeFeed('older-story'));
    await olderRefresh;
    expect(useNewsStore.getState().items.map((item) => item.id)).toEqual(['newer-story']);
    expect(useNewsStore.getState().loading).toBe(false);
  });
});
