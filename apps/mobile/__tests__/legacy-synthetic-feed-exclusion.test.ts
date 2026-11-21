jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: true,
}));
jest.mock('../lib/errorReporting', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import { supabase } from '../lib/supabase';
import {
  fetchBlendedFeed,
  fetchFeedForState,
  fetchPostsByAuthor,
} from '../lib/supabaseDataService';
import { LEGACY_SYNTHETIC_POSTS_FILTER } from '../lib/legacySyntheticPosts';

const mockFrom = supabase.from as jest.Mock;

function makeFeedQuery() {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['eq', 'is', 'not', 'lt', 'gte', 'order']) {
    query[method] = jest.fn(() => query);
  }
  query.limit = jest.fn().mockResolvedValue({ data: [], error: null });
  query.range = jest.fn().mockResolvedValue({ data: [], error: null });
  return query;
}

describe('legacy synthetic posts are excluded from every mobile feed read path', () => {
  afterEach(() => jest.resetAllMocks());

  it('excludes them from author profile post lists', async () => {
    const query = makeFeedQuery();
    mockFrom.mockReturnValue({ select: () => query });

    await fetchPostsByAuthor('author-1');

    expect(query.not).toHaveBeenCalledWith('id', 'in', LEGACY_SYNTHETIC_POSTS_FILTER);
  });

  it('excludes them from the blended latest and archive feed', async () => {
    const query = makeFeedQuery();
    mockFrom.mockReturnValue({ select: () => query });

    await fetchBlendedFeed(null, null, 'TS', 10, [], 'archive', 0);

    expect(query.not).toHaveBeenCalledWith('id', 'in', LEGACY_SYNTHETIC_POSTS_FILTER);
    expect(query.lt).toHaveBeenCalledTimes(1);
  });

  it('excludes them from a state feed', async () => {
    const query = makeFeedQuery();
    mockFrom.mockReturnValue({ select: () => query });

    await fetchFeedForState('TS');

    expect(query.not).toHaveBeenCalledWith('id', 'in', LEGACY_SYNTHETIC_POSTS_FILTER);
  });
});
