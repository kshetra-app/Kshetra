import {
  DISCOVERY_GOALS,
  FEATURE_DIRECTORY,
  SCREEN_GUIDES,
  searchDiscoveryCatalog,
} from '../lib/discoveryCatalog';

describe('Discovery Catalog Specification Compliance', () => {
  it('defines exactly the 6 approved user goals', () => {
    expect(DISCOVERY_GOALS).toHaveLength(6);
    const ids = DISCOVERY_GOALS.map((g) => g.id);
    expect(ids).toEqual([
      'understand_my_area',
      'find_representatives',
      'stay_informed',
      'participate_community',
      'understand_elections',
      'leadership_journey',
    ]);
  });

  it('guarantees unique IDs across feature directory and goals', () => {
    const goalIds = new Set(DISCOVERY_GOALS.map((g) => g.id));
    expect(goalIds.size).toBe(DISCOVERY_GOALS.length);

    const featureIds = new Set(FEATURE_DIRECTORY.map((f) => f.id));
    expect(featureIds.size).toBe(FEATURE_DIRECTORY.length);
  });

  it('ensures no feature directory item has fabricated placeholder dynamic route without isDynamic=true', () => {
    for (const item of FEATURE_DIRECTORY) {
      if (item.route.includes(':') || item.route.includes('[id]')) {
        expect(item.isDynamic).toBe(true);
      }
      expect(item.route).not.toBe('');
      expect(item.titleKey).toBeTruthy();
    }
  });

  it('provides screen guides for key application screens without network dependency', () => {
    expect(SCREEN_GUIDES['map']).toBeDefined();
    expect(SCREEN_GUIDES['explore']).toBeDefined();
    expect(SCREEN_GUIDES['community']).toBeDefined();
    expect(SCREEN_GUIDES['news']).toBeDefined();
    expect(SCREEN_GUIDES['more']).toBeDefined();
    expect(SCREEN_GUIDES['profile']).toBeDefined();
    expect(SCREEN_GUIDES['dashboard']).toBeDefined();
    expect(SCREEN_GUIDES['intelligence']).toBeDefined();
    expect(SCREEN_GUIDES['constituency_detail']).toBeDefined();

    for (const [key, guide] of Object.entries(SCREEN_GUIDES)) {
      expect(guide.screenKey).toBe(key);
      expect(guide.stepsKeys.length).toBeGreaterThanOrEqual(1);
      expect(guide.verifiedRoute).toBeTruthy();
    }
  });

  it('searches the catalog locally and deterministically', () => {
    const mockT = (key: string, opts?: any) => {
      const dict: Record<string, string> = {
        'discovery.goals.understandArea.title': 'Understand my area',
        'tabs.news': 'News',
        'more.tiles.civicDashboard': 'Civic Dashboard',
        'discovery.guides.map.title': 'Map Guide',
      };
      return dict[key] ?? opts?.defaultValue ?? key;
    };

    const emptySearch = searchDiscoveryCatalog('', mockT);
    expect(emptySearch.goals).toHaveLength(6);
    expect(emptySearch.features).toHaveLength(FEATURE_DIRECTORY.length);

    const newsSearch = searchDiscoveryCatalog('news', mockT);
    expect(newsSearch.features.some((f) => f.id === 'news')).toBe(true);

    const areaSearch = searchDiscoveryCatalog('area', mockT);
    expect(areaSearch.goals.some((g) => g.id === 'understand_my_area')).toBe(true);
  });
});
