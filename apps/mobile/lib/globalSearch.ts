/**
 * Global Search Engine
 *
 * Searches across all content types:
 * - Constituencies (name, district, MLA, party, AC number)
 * - Civic issues (title, category)
 * - Feed posts (content, hashtags)
 * - Promises (title, party, category)
 * - MLAs (name, party)
 *
 * Returns a ranked, deduplicated result set.
 */

import { getUnifiedConstituenciesForState, type UnifiedConstituency } from './stateDataAdapter';
import { useCivicStore } from '../stores/civic';
import { useFeedStore } from '../stores/feed';
import { usePromiseStore } from '../stores/promises';
import { searchMPs } from './data';

export type SearchResultType = 'constituency' | 'issue' | 'post' | 'promise' | 'mla' | 'mp' | 'person';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  /** Route to navigate to */
  route: string;
  /** Relevance score (higher = better) */
  score: number;
  /** Extra metadata */
  meta?: {
    party?: string;
    stateCode?: string;
    acNo?: number;
    mpId?: string;
    status?: string;
  };
}

const SUPPORTED_STATES = ['TS', 'AP', 'KA', 'MH'];

/**
 * Search across all data sources.
 */
export function globalSearch(query: string, maxResults = 30): SearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  // 1. Constituencies
  for (const stateCode of SUPPORTED_STATES) {
    const constituencies = getUnifiedConstituenciesForState(stateCode);
    for (const c of constituencies) {
      const score = scoreConstituency(c, q);
      if (score > 0) {
        results.push({
          id: `${stateCode}-AC-${c.acNo}`,
          type: 'constituency',
          title: `AC ${c.acNo}: ${c.name}`,
          subtitle: `${c.district}, ${stateCode} · ${c.currentParty}`,
          route: `/constituency/${stateCode}-AC-${c.acNo}`,
          score,
          meta: { party: c.currentParty, stateCode, acNo: c.acNo },
        });
      }

      // MLA match
      const mlaScore = scoreMLA(c, q);
      if (mlaScore > 0) {
        results.push({
          id: `mla-${stateCode}-${c.acNo}`,
          type: 'mla',
          title: c.winnerName,
          subtitle: `MLA, ${c.name} (${c.currentParty}) · ${stateCode}`,
          route: `/constituency/${stateCode}-AC-${c.acNo}`,
          score: mlaScore,
          meta: { party: c.currentParty, stateCode, acNo: c.acNo },
        });
      }
    }
  }

  // 2. Civic Issues
  const issues = useCivicStore.getState().issues;
  for (const issue of issues) {
    const matchTitle = issue.title.toLowerCase().includes(q);
    const matchCategory = issue.category.toLowerCase().includes(q);
    if (matchTitle || matchCategory) {
      results.push({
        id: `issue-${issue.id}`,
        type: 'issue',
        title: issue.title,
        subtitle: `${issue.category} · ${issue.status} · ${issue.severity}`,
        route: `/issue/${issue.id}`,
        score: matchTitle ? 70 : 40,
        meta: { status: issue.status },
      });
    }
  }

  // 3. Feed Posts
  const posts = useFeedStore.getState().posts;
  for (const post of posts) {
    const matchContent = post.content.toLowerCase().includes(q);
    const matchHashtag = post.hashtags?.some((h) => h.toLowerCase().includes(q));
    if (matchContent || matchHashtag) {
      results.push({
        id: `post-${post.id}`,
        type: 'post',
        title: post.content.slice(0, 60) + (post.content.length > 60 ? '...' : ''),
        subtitle: `by ${post.author.displayName} · ${post.type}`,
        route: `/(tabs)/feed`,
        score: matchHashtag ? 55 : 35,
      });
    }
  }

  // 4. Promises
  const promises = usePromiseStore.getState().promises;
  for (const p of promises) {
    const matchTitle = p.title.toLowerCase().includes(q);
    const matchParty = p.party.toLowerCase().includes(q);
    const matchCategory = p.category.toLowerCase().includes(q);
    if (matchTitle || matchParty || matchCategory) {
      results.push({
        id: `promise-${p.id}`,
        type: 'promise',
        title: p.title,
        subtitle: `${p.party} · ${p.status} · ${p.category}`,
        route: `/(tabs)/dashboard`,
        score: matchTitle ? 65 : matchParty ? 50 : 35,
        meta: { party: p.party, status: p.status },
      });
    }
  }

  // 5. MPs (Lok Sabha + Rajya Sabha)
  const mpResults = searchMPs(q, 10);
  for (const mp of mpResults) {
    const houseLabel = mp.house === 'lok_sabha' ? 'Lok Sabha' : 'Rajya Sabha';
    results.push({
      id: `mp-${mp.id}`,
      type: 'mp',
      title: mp.name,
      subtitle: `MP · ${houseLabel} · ${mp.constituency ?? mp.stateCode} (${mp.party})`,
      route: `/parliament`,
      score: mp.name.toLowerCase().startsWith(q) ? 85 : mp.name.toLowerCase().includes(q) ? 65 : 45,
      meta: { party: mp.party, stateCode: mp.stateCode, mpId: mp.id },
    });
  }

  // Sort by score, deduplicate, limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function scoreConstituency(c: UnifiedConstituency, q: string): number {
  let score = 0;

  // Exact AC number match
  if (q.match(/^\d+$/) && parseInt(q, 10) === c.acNo) return 95;

  // Name match
  const nameLower = c.name.toLowerCase();
  if (nameLower === q) return 90;
  if (nameLower.startsWith(q)) score = 80;
  else if (nameLower.includes(q)) score = 60;

  // District match
  if (c.district.toLowerCase().includes(q)) score = Math.max(score, 45);

  // Party match
  if (c.currentParty.toLowerCase() === q) score = Math.max(score, 40);

  return score;
}

function scoreMLA(c: UnifiedConstituency, q: string): number {
  const name = c.winnerName.toLowerCase();
  if (name === q) return 90;
  if (name.startsWith(q)) return 75;
  if (name.includes(q)) return 55;
  return 0;
}

/**
 * Get search suggestions based on popular/recent searches.
 */
export function getSearchSuggestions(): string[] {
  return [
    'BJP', 'INC', 'BRS', 'TDP', 'YSRCP',
    'Hyderabad', 'Bangalore', 'Mumbai', 'Vijayawada',
    'SC constituency', 'Water supply', 'Roads',
    'Promise delivered', 'Delimitation',
  ];
}
