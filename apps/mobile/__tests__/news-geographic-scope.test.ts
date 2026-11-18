import { filterNewsByScope } from '@kshetra/shared';
import type { NewsItem } from '../lib/newsTypes';

function item(
  id: string,
  scope: NewsItem['scope'],
  stateCode?: string,
  constituencyId?: string,
): NewsItem {
  return {
    id,
    title: id,
    sourceUrl: `https://example.test/${id}`,
    source: { id: 'source', name: 'Source', domain: 'example.test', language: 'en' },
    language: 'en',
    category: 'politics',
    scope,
    stateCode,
    constituencyId,
    publishedAt: '2026-11-18T00:00:00.000Z',
  };
}

describe('news geographic scope', () => {
  const feed = [
    item('national', 'national'),
    item('telangana', 'state', 'TS'),
    item('andhra', 'state', 'AP'),
    item('goshamahal', 'constituency', 'TS', 'TS-AC-65'),
    item('charminar', 'constituency', 'TS', 'TS-AC-66'),
  ];

  it('shows only explicitly tagged stories in the selected state', () => {
    expect(filterNewsByScope(feed, 'state', 'TS').map(({ id }) => id)).toEqual(['telangana']);
  });

  it('shows the selected constituency and its state stories, without other scopes', () => {
    expect(filterNewsByScope(feed, 'constituency', 'TS', 'TS-AC-65').map(({ id }) => id)).toEqual([
      'telangana',
      'goshamahal',
    ]);
  });

  it('keeps national stories in the national tab', () => {
    expect(filterNewsByScope(feed, 'national', 'TS').map(({ id }) => id)).toEqual(['national']);
  });
});
