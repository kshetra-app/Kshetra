import { getAvailableYearsForState } from '../lib/stateDataAdapter';
import { getPartyFillColorExpression, getExtrusionHeightExpression } from '../lib/mapFillColors';
import { enrichGeoJSONForState } from '../lib/enrichGeoJSON';

describe('Map Enhancements & Premium Utilities', () => {
  describe('getAvailableYearsForState', () => {
    it('returns [2014, 2018, 2023] for Telangana (TS)', () => {
      expect(getAvailableYearsForState('TS')).toEqual([2014, 2018, 2023]);
    });

    it('returns [2019, 2024] for Andhra Pradesh (AP)', () => {
      expect(getAvailableYearsForState('AP')).toEqual([2019, 2024]);
    });

    it('returns [2018, 2023] for Karnataka (KA)', () => {
      expect(getAvailableYearsForState('KA')).toEqual([2018, 2023]);
    });

    it('returns historical and current election years for TN, KL, and WB', () => {
      expect(getAvailableYearsForState('TN')).toEqual([2016, 2021, 2026]);
      expect(getAvailableYearsForState('KL')).toEqual([2016, 2021, 2026]);
      expect(getAvailableYearsForState('WB')).toEqual([2016, 2021, 2026]);
    });

    it('returns Rajasthan historical and current election years', () => {
      expect(getAvailableYearsForState('RJ')).toEqual([2013, 2018, 2023]);
    });
  });

  describe('mapFillColors expressions generator', () => {
    it('creates a dynamic WINNER_PARTY expression with year prefix', () => {
      const expr2018 = getPartyFillColorExpression(2018);
      expect(expr2018).toEqual(expect.any(Array));
      expect(expr2018[0]).toBe('match');
      expect(expr2018[1]).toEqual(['get', 'WINNER_PARTY_2018']);
    });

    it('creates a default WINNER_PARTY expression if no year is provided', () => {
      const expr = getPartyFillColorExpression();
      expect(expr[0]).toBe('match');
      expect(expr[1]).toEqual(['get', 'WINNER_PARTY']);
    });

    it('maps extrusion height expressions correctly', () => {
      const popExpr = getExtrusionHeightExpression('population');
      expect(popExpr).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'POPULATION'], 0], 0.08]]);

      const marginExpr = getExtrusionHeightExpression('margin');
      expect(marginExpr).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'MARGIN'], 0], 0.5]]);

      expect(getExtrusionHeightExpression('turnout')).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'TURNOUT'], 0], 200]]);
      expect(getExtrusionHeightExpression('literacy')).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'LITERACY'], 0], 200]]);

      const defaultExpr = getExtrusionHeightExpression('party');
      expect(defaultExpr).toEqual(['+', 8000, ['*', ['coalesce', ['get', 'MARGIN'], 8000], 0.35]]);
    });
  });

  describe('GeoJSON enrichment', () => {
    const dummyFeatureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [78.48, 17.38] },
          properties: { AC_NO: 1, AC_NAME: 'Dummy AC', DIST_NAME: 'Hyderabad' }
        }
      ]
    };

    it('enriches features with BATTLEGROUND and IS_SWING properties', () => {
      // Enriching Rajasthan (RJ) as a representative state
      const enriched = enrichGeoJSONForState(dummyFeatureCollection, 'RJ');
      expect(enriched.features[0].properties).toHaveProperty('BATTLEGROUND');
      expect(enriched.features[0].properties).toHaveProperty('IS_SWING');
      // Verify current year properties are added
      expect(enriched.features[0].properties).toHaveProperty('WINNER_PARTY_2023');
      expect(enriched.features[0].properties).toHaveProperty('WINNER_NAME_2023');
    });

    it('does not invent a current election year or independent winner for unmatched features', () => {
      const unmatched: GeoJSON.FeatureCollection = {
        ...dummyFeatureCollection,
        features: [{
          ...dummyFeatureCollection.features[0],
          properties: { AC_NO: 99999, AC_NAME: 'Unknown AC' },
        }],
      };

      const enriched = enrichGeoJSONForState(unmatched, 'RJ');
      const properties = enriched.features[0].properties;

      expect(properties?.WINNER_PARTY).toBe('');
      expect(properties?.WINNER_PARTY_2024).toBeUndefined();
      expect(properties?.WINNER_PARTY_2023).toBeUndefined();
    });
  });
});
