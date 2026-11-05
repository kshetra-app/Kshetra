import { extractLngLat } from '../lib/maplibreCompat';
import { getStateCodeFromName, enrichIndiaGeoJSON } from '../lib/enrichGeoJSON';
import { findConstituencyAtPoint, pointInPolygon, pointInMultiPolygon, STATES } from '@kshetra/shared';
import * as fs from 'fs';
import * as path from 'path';

describe('Map Touch Precision & State Hit Testing', () => {
  const indiaGeoRaw = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../data/india-states-overview.json'), 'utf8')
  );
  const activeGeoJSON = enrichIndiaGeoJSON(indiaGeoRaw);

  it('correctly normalizes state names to state codes', () => {
    expect(getStateCodeFromName('Telangana')).toBe('TS');
    expect(getStateCodeFromName('Maharashtra')).toBe('MH');
    expect(getStateCodeFromName('Karnataka')).toBe('KA');
    expect(getStateCodeFromName('Andhra Pradesh')).toBe('AP');
    expect(getStateCodeFromName('Tamil Nadu')).toBe('TN');
    expect(getStateCodeFromName('NCT of Delhi')).toBe('DL');
    expect(getStateCodeFromName('Jammu & Kashmir')).toBe('JK');
  });

  describe('extractLngLat robust coordinate handling', () => {
    it('extracts [lng, lat] from standard MapLibre event', () => {
      const event = {
        lngLat: [78.4867, 17.385],
        point: [200, 350],
      };
      expect(extractLngLat(event)).toEqual([78.4867, 17.385]);
    });

    it('extracts [lng, lat] from nativeEvent.lngLat', () => {
      const event = {
        nativeEvent: {
          lngLat: [78.4867, 17.385],
        },
      };
      expect(extractLngLat(event)).toEqual([78.4867, 17.385]);
    });

    it('swaps inverted [lat, lng] coordinates inside Indian boundary', () => {
      // Inverted: [lat (17.385), lng (78.4867)]
      const event = {
        coordinates: [17.385, 78.4867],
      };
      expect(extractLngLat(event)).toEqual([78.4867, 17.385]);
    });

    it('ignores Polygon coordinates array [[[...]]] and does not return corrupted arrays', () => {
      const polygonEvent = {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.1, 17.1],
              [78.2, 17.2],
              [78.1, 17.1],
            ],
          ],
        },
      };
      expect(extractLngLat(polygonEvent)).toBeNull();
    });
  });

  describe('Point-in-Polygon hit testing on Telangana vs Maharashtra', () => {
    // Known locations in Telangana
    const telanganaPoints = [
      { name: 'Hyderabad', lng: 78.4867, lat: 17.385 },
      { name: 'Warangal', lng: 79.5941, lat: 17.9689 },
      { name: 'Nizamabad', lng: 78.0941, lat: 18.6725 },
      { name: 'Khammam', lng: 80.1514, lat: 17.2473 },
      { name: 'Karimnagar', lng: 79.1288, lat: 18.4386 },
      { name: 'Mahbubnagar', lng: 77.9818, lat: 16.7488 },
      { name: 'Suryapet (Huzurnagar area)', lng: 79.6239, lat: 17.1439 },
      { name: 'Nalgonda', lng: 79.2684, lat: 17.0577 },
      { name: 'Adilabad', lng: 78.532, lat: 19.664 },
    ];

    telanganaPoints.forEach(({ name, lng, lat }) => {
      it(`resolves ${name} (${lng}, ${lat}) strictly to Telangana (TS), NEVER Maharashtra (MH)`, () => {
        const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
        expect(found).not.toBeNull();
        const feature = activeGeoJSON.features[found!.index];
        expect(feature.properties?.STATE_CODE).toBe('TS');
        expect(feature.properties?.ST_NM).toBe('Telangana');
        expect(feature.properties?.STATE_CODE).not.toBe('MH');
      });
    });

    // Known locations in Maharashtra
    const maharashtraPoints = [
      { name: 'Mumbai', lng: 72.8777, lat: 19.076 },
      { name: 'Pune', lng: 73.8567, lat: 18.5204 },
      { name: 'Nagpur', lng: 79.0882, lat: 21.1458 },
      { name: 'Nanded', lng: 77.3178, lat: 19.1383 },
      { name: 'Aurangabad (Chhatrapati Sambhajinagar)', lng: 75.3433, lat: 19.8762 },
    ];

    maharashtraPoints.forEach(({ name, lng, lat }) => {
      it(`resolves ${name} (${lng}, ${lat}) strictly to Maharashtra (MH), NEVER Telangana (TS)`, () => {
        const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
        expect(found).not.toBeNull();
        const feature = activeGeoJSON.features[found!.index];
        expect(feature.properties?.STATE_CODE).toBe('MH');
        expect(feature.properties?.ST_NM).toBe('Maharashtra');
      });
    });
  });

  describe('Priority 2 candidate feature evaluation', () => {
    it('evaluates polygon boundary inside candidate features list', () => {
      const tsFeature = activeGeoJSON.features.find((f: any) => f.properties.STATE_CODE === 'TS');
      const mhFeature = activeGeoJSON.features.find((f: any) => f.properties.STATE_CODE === 'MH');

      // Tap in Hyderabad: [78.4867, 17.3850]
      const tapLng = 78.4867;
      const tapLat = 17.385;

      // Even if MapLibre returns Maharashtra FIRST in event.features:
      const eventFeatures = [mhFeature, tsFeature];

      let selectedFeature: any = null;
      for (const f of eventFeatures) {
        if (!f) continue;
        if (f.geometry?.type === 'Polygon' && pointInPolygon([tapLng, tapLat], f.geometry.coordinates as any)) {
          selectedFeature = f;
          break;
        } else if (f.geometry?.type === 'MultiPolygon' && pointInMultiPolygon([tapLng, tapLat], f.geometry.coordinates as any)) {
          selectedFeature = f;
          break;
        }
      }

      expect(selectedFeature).not.toBeNull();
      expect(selectedFeature.properties.STATE_CODE).toBe('TS');
    });
  });
});
