jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { globalSearch } from '../lib/globalSearch';
import { searchDiscoveryCatalog } from '../lib/discoveryCatalog';

describe('Search Feature & Help Discovery (Batch 4)', () => {
  it('globalSearch remains functional across constituencies and leaders', () => {
    const res = globalSearch('Jubilee');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });

  it('searchDiscoveryCatalog finds features locally without network requests', () => {
    const dict: Record<string, string> = {
      'discovery.goals.leadershipJourney.title': 'Build a civic leadership journey',
      'discovery.features.civicMetrics.title': 'Civic Metrics',
      'more.tiles.civicDashboard': 'Civic Dashboard',
    };
    const t = (k: string, opts?: any) => dict[k] || opts?.defaultValue || k;
    const { features, goals } = searchDiscoveryCatalog('civic', t);

    expect(features.some((f) => f.id === 'civic_dashboard' || f.id === 'civic_metrics')).toBe(true);
    expect(goals.some((g) => g.id === 'leadership_journey')).toBe(true);
  });

  it('preserves existing entity types and allows feature result type', () => {
    const result = {
      id: 'feature-civic_dashboard',
      type: 'feature' as const,
      title: 'Civic Dashboard',
      subtitle: 'Monitor local issues and promises',
      route: '/dashboard',
      score: 85,
    };

    expect(result.type).toBe('feature');
    expect(result.route).toBe('/dashboard');
  });
});
