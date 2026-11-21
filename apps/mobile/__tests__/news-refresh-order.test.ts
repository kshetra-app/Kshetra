jest.mock('../lib/constants', () => ({
  API_BASE_URL: 'https://api.example.test',
  REMOTE_API_URL: 'https://api.example.test',
}));
jest.mock('../lib/api', () => ({
  apiClient: { news: { getFeed: jest.fn() } },
}));
jest.mock('../lib/news/scrape', () => ({
  scrapeNewsOnDevice: jest.fn(),
}));
jest.mock('../lib/environment', () => ({
  IS_LIVE_ENVIRONMENT: true,
  CURRENT_ENVIRONMENT: 'production',
}));
jest.mock('../lib/storage', () => ({
  mmkvStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import type { NewsFeed } from '../lib/newsTypes';
import { apiClient } from '../lib/api';
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
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
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
      loaded: false,
      language: null,
    });
  });

  it('keeps a newer feed when an older same-language refresh finishes later', async () => {
    const older = deferred<NewsFeed>();
    const newer = deferred<NewsFeed>();
    (apiClient.news.getFeed as jest.Mock)
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);

    const olderRefresh = useNewsStore.getState().refresh();
    const newerRefresh = useNewsStore.getState().refresh();
    expect(useNewsStore.getState().loaded).toBe(false);
    expect(useNewsStore.getState().loading).toBe(true);
    await Promise.resolve();

    newer.resolve(makeFeed('newer-story'));
    await newerRefresh;
    expect(useNewsStore.getState().items.map((item) => item.id)).toEqual(['newer-story']);
    expect(useNewsStore.getState().loaded).toBe(true);

    older.resolve(makeFeed('older-story'));
    await olderRefresh;
    expect(useNewsStore.getState().items.map((item) => item.id)).toEqual(['newer-story']);
    expect(useNewsStore.getState().loading).toBe(false);
  });

  it('keeps an authoritative empty backend feed instead of showing fallback stories', async () => {
    const emptyFeed: NewsFeed = {
      version: 1,
      generatedAt: '2026-11-16T10:00:00.000Z',
      refreshIntervalMin: 60,
      sources: [],
      items: [],
    };
    (apiClient.news.getFeed as jest.Mock).mockResolvedValue(emptyFeed);

    await useNewsStore.getState().refresh();

    expect(useNewsStore.getState().items).toEqual([]);
    expect(useNewsStore.getState().generatedAt).toBe(emptyFeed.generatedAt);
    expect(scrapeNewsOnDevice).not.toHaveBeenCalled();
  });

  it('requests publisher revalidation for the selected geography and language', async () => {
    useNewsStore.setState({ language: 'te' });
    (apiClient.news.getFeed as jest.Mock).mockResolvedValue(makeFeed('refreshed'));
    await useNewsStore.getState().refresh({ scope: 'state', state: 'TS' }, true);
    expect(apiClient.news.getFeed).toHaveBeenCalledWith({
      scope: 'state', state: 'TS', lang: 'te', refresh: true,
    });
    expect(useNewsStore.getState().queryKey).toBe('te:state:TS');
  });

  it('removes expired on-device news cache instead of reviving stale headlines', async () => {
    const storage = jest.requireMock('../lib/storage').mmkvStorage;
    const expiredCache = JSON.stringify({
      version: 1,
      generatedAt: '2026-10-01T00:00:00.000Z',
      refreshIntervalMin: 60,
      sources: [],
      items: [
        {
          id: 'expired-story',
          title: 'Expired story',
          sourceUrl: 'https://example.test/expired',
          source: { id: 'test', name: 'Test', domain: 'example.test', language: 'en' },
          language: 'en',
          category: 'top',
          scope: 'national',
          publishedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    });
    storage.getItem.mockImplementation((key: string) =>
      key === 'poligram-news-cache:production:all' ? expiredCache : null,
    );
    (apiClient.news.getFeed as jest.Mock).mockRejectedValue(new Error('network offline'));
    (scrapeNewsOnDevice as jest.Mock).mockResolvedValue(null);

    await useNewsStore.getState().refresh();

    expect(storage.removeItem).toHaveBeenCalledWith('poligram-news-cache:production:all');
    expect(useNewsStore.getState().items).toEqual([]);
    expect(scrapeNewsOnDevice).not.toHaveBeenCalled();
  });

  it('keeps live news empty when the authoritative backend fails and there is no fresh backend cache', async () => {
    (apiClient.news.getFeed as jest.Mock).mockRejectedValue(new Error('backend unavailable'));
    (scrapeNewsOnDevice as jest.Mock).mockResolvedValue(makeFeed('device-only-story'));

    await useNewsStore.getState().refresh();

    expect(useNewsStore.getState().items).toEqual([]);
    expect(useNewsStore.getState().generatedAt).toBe('');
    expect(useNewsStore.getState().loaded).toBe(true);
    expect(scrapeNewsOnDevice).not.toHaveBeenCalled();
  });
});
