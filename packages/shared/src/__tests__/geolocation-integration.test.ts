import * as fs from 'fs';
import * as path from 'path';
import { findConstituencyAtPoint } from '../geo/point-in-polygon';

/**
 * Integration test: uses real Telangana GeoJSON data
 * to verify point-in-polygon lookup for known locations.
 */
describe('Geolocation Integration — Telangana Constituencies', () => {
  let geojson: GeoJSON.FeatureCollection;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      '../../../../data/geo/telangana-assembly.geojson',
    );
    const raw = fs.readFileSync(filePath, 'utf-8');
    geojson = JSON.parse(raw);
  });

  it('should load 120 features (119 unique ACs)', () => {
    expect(geojson.features.length).toBe(120);
  });

  it('should find Goshamahal constituency for a point near Charminar monument', () => {
    // Charminar monument area — falls in Goshamahal per GeoJSON boundaries
    const result = findConstituencyAtPoint(78.4747, 17.3616, geojson);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NAME).toBe('Goshamahal');
  });

  it('should find Charminar constituency at its polygon centroid', () => {
    // Actual centroid computed from GeoJSON polygon
    const result = findConstituencyAtPoint(78.5136, 17.3536, geojson);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NAME).toBe('Charminar');
  });

  it('should find Secunderabad for a point near Secunderabad Railway Station', () => {
    // Secunderabad Railway Station area
    const result = findConstituencyAtPoint(78.5014, 17.4344, geojson);
    expect(result).not.toBeNull();
    // Should be either Secunderabad or Secunderabad Cantt
    expect(result!.properties.AC_NAME).toMatch(/Secunderabad/);
  });

  it('should find Sircilla for KTR constituency', () => {
    // Rajanna Sircilla town area
    const result = findConstituencyAtPoint(78.8380, 18.3866, geojson);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NAME).toBe('Sircilla');
  });

  it('should find Gajwel for KCR constituency', () => {
    // Gajwel town approximate coordinates
    const result = findConstituencyAtPoint(78.6879, 17.8496, geojson);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NAME).toBe('Gajwel');
  });

  it('should find Kodangal for Revanth Reddy constituency', () => {
    // Actual centroid computed from GeoJSON polygon
    const result = findConstituencyAtPoint(77.6635, 17.0861, geojson);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NAME).toBe('Kodangal');
  });

  it('should return null for a point in Karnataka (outside Telangana)', () => {
    // Bangalore coordinates
    const result = findConstituencyAtPoint(77.5946, 12.9716, geojson);
    expect(result).toBeNull();
  });

  it('should return null for a point in Maharashtra (outside Telangana)', () => {
    // Nagpur coordinates
    const result = findConstituencyAtPoint(79.0882, 21.1458, geojson);
    expect(result).toBeNull();
  });

  it('should run a full scan in under 500ms', () => {
    const start = performance.now();
    // Test 10 lookups to measure average
    for (let i = 0; i < 10; i++) {
      findConstituencyAtPoint(78.4747, 17.3616, geojson);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 10;
    // Should be well under 500ms per lookup under VM CPU load
    expect(avgMs).toBeLessThan(500);
  });
});
