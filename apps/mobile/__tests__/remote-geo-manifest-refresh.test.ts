const mockFetchStateGeoJSON = jest.fn();
const mockGetGeoBaseUrl = jest.fn(() => 'https://api.example.test');
const mockGetManifestEntry = jest.fn();
const mockGetStateGeoJSON = jest.fn();
const mockIsBundledGeoJSON = jest.fn();

jest.mock('../lib/geoLoader', () => ({
  getStateGeoJSON: (...args: unknown[]) => mockGetStateGeoJSON(...args),
  isBundledGeoJSON: (...args: unknown[]) => mockIsBundledGeoJSON(...args),
}));

jest.mock('../lib/remoteGeoLoader', () => ({
  fetchStateGeoJSON: (...args: unknown[]) => mockFetchStateGeoJSON(...args),
  getGeoBaseUrl: () => mockGetGeoBaseUrl(),
}));

jest.mock('../lib/geoManifest', () => ({
  getManifestEntry: (...args: unknown[]) => mockGetManifestEntry(...args),
}));

jest.mock('../lib/enrichGeoJSON', () => ({
  enrichGeoJSON: (geo: unknown) => geo,
  enrichGeoJSONForState: (geo: unknown) => geo,
  enrichIndiaGeoJSON: (geo: unknown) => geo,
}));

const geo = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;

describe('remote geography manifest refresh', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetManifestEntry.mockReturnValue({
      file: 'local-boundary.json',
      count: 1,
      hasPolygons: true,
      version: 'local-v1',
    });
    mockIsBundledGeoJSON.mockReturnValue(false);
    mockFetchStateGeoJSON.mockResolvedValue(geo);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('loads the API manifest route and uses its file and content version', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        TS: {
          file: 'new-boundary.json',
          count: 2,
          hasPolygons: true,
          version: 'remote-v2',
        },
      }),
    }) as unknown as typeof fetch;

    const { loadEnrichedGeoForState } = require('../lib/enrichedGeoCache');
    await expect(loadEnrichedGeoForState('TS')).resolves.toBe(geo);

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.test/geo/manifest.json', {
      headers: { Accept: 'application/json' },
    });
    expect(mockFetchStateGeoJSON).toHaveBeenCalledWith('TS', 'remote-v2', 'new-boundary.json');
  });

  it('falls back to the bundled manifest when the API manifest is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const { loadEnrichedGeoForState } = require('../lib/enrichedGeoCache');
      await expect(loadEnrichedGeoForState('TS')).resolves.toBe(geo);
      expect(mockFetchStateGeoJSON).toHaveBeenCalledWith('TS', 'local-v1', 'local-boundary.json');
    } finally {
      warn.mockRestore();
    }
  });

  it('refreshes an already-loaded map when the remote asset version changes', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const updatedGeo = { type: 'FeatureCollection', features: [{ id: 'updated' }] } as unknown as GeoJSON.FeatureCollection;
    const responseFor = (file: string, version: string) => ({
      ok: true,
      json: async () => ({
        TS: { file, count: 1, hasPolygons: true, version },
      }),
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(responseFor('local-boundary.json', 'remote-v1'))
      .mockResolvedValueOnce(responseFor('updated-boundary.json', 'remote-v2')) as unknown as typeof fetch;
    mockFetchStateGeoJSON.mockResolvedValueOnce(geo).mockResolvedValueOnce(updatedGeo);

    try {
      const { loadEnrichedGeoForState, subscribeToGeoCache } = require('../lib/enrichedGeoCache');
      const listener = jest.fn();
      const unsubscribe = subscribeToGeoCache(listener);

      await expect(loadEnrichedGeoForState('TS')).resolves.toBe(geo);
      now.mockReturnValue(62_000);
      await expect(loadEnrichedGeoForState('TS')).resolves.toBe(geo);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockFetchStateGeoJSON).toHaveBeenLastCalledWith(
        'TS',
        'remote-v2',
        'updated-boundary.json',
      );
      expect(listener).toHaveBeenCalledWith('TS', updatedGeo);
      unsubscribe();
    } finally {
      now.mockRestore();
    }
  });
});
