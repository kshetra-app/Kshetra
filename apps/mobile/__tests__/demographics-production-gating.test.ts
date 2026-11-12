describe('production constituency demographics', () => {
  const previousEnvironment = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = previousEnvironment;
    jest.resetModules();
  });

  function loadDemographicsForState(environment: string) {
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    let getDemographicsForState!: (stateCode: string, acNo: number) => unknown;
    jest.isolateModules(() => {
      ({ getDemographicsForState } = require('../lib/stateDataDispatcher'));
    });
    return getDemographicsForState;
  }

  function enrichTelanganaMap(environment: string) {
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    let enrichGeoJSON!: (geojson: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection;
    jest.isolateModules(() => {
      ({ enrichGeoJSON } = require('../lib/enrichGeoJSON'));
    });
    return enrichGeoJSON;
  }

  it('withholds bundled figures for every state in production', () => {
    const getDemographicsForState = loadDemographicsForState('production');

    expect(getDemographicsForState('TS', 1)).toBeUndefined();
    expect(getDemographicsForState('AP', 1)).toBeUndefined();
    expect(getDemographicsForState('JK', 1)).toBeUndefined();
  });

  it('withholds Telangana figures from the dedicated map enrichment path in production', () => {
    const enrichGeoJSON = enrichTelanganaMap('production');
    const result = enrichGeoJSON({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { AC_NO: 1 },
      }],
    });

    expect(result.features[0].properties?.POPULATION).toBeNull();
    expect(result.features[0].properties?.TURNOUT).toBeNull();
  });

  it('keeps offline reference figures available in development', () => {
    const getDemographicsForState = loadDemographicsForState('development');

    expect(getDemographicsForState('TS', 1)).toBeDefined();
  });
});
