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

    it('returns [2016, 2021, 2026] for Tamil Nadu (TN), Kerala (KL), and West Bengal (WB)', () => {
      expect(getAvailableYearsForState('TN')).toEqual([2016, 2021, 2026]);
      expect(getAvailableYearsForState('KL')).toEqual([2016, 2021, 2026]);
      expect(getAvailableYearsForState('WB')).toEqual([2016, 2021, 2026]);
    });

    it('defaults to a single year array for states with no history', () => {
      // RJ (Rajasthan) has no historical seed, returns its election cycle year (2023)
      const rjYears = getAvailableYearsForState('RJ');
      expect(rjYears.length).toBe(1);
      expect(rjYears[0]).toBe(2023);
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
      expect(popExpr).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'POPULATION'], 100000], 0.08]]);

      const marginExpr = getExtrusionHeightExpression('margin');
      expect(marginExpr).toEqual(['+', 6000, ['*', ['coalesce', ['get', 'MARGIN'], 5000], 0.5]]);

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
  });
});
