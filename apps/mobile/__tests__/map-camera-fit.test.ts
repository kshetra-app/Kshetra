import { getMapCameraForBounds, getMapCameraPadding } from '../lib/mapCamera';

describe('MapLibre camera fitting', () => {
  it('fits the full national geometry into the portrait phone viewport', () => {
    const width = 393;
    const height = 873;
    const padding = getMapCameraPadding(width, height);
    const camera = getMapCameraForBounds(
      {
        minLng: 68.0938,
        minLat: 6.7551,
        maxLng: 97.4079,
        maxLat: 37.077,
      },
      width,
      height,
      padding,
    );

    expect(camera).not.toBeNull();
    expect(camera!.centerCoordinate[0]).toBeCloseTo(82.7509, 3);
    expect(camera!.centerCoordinate[1]).toBeGreaterThan(20);
    expect(camera!.centerCoordinate[1]).toBeLessThan(24);
    expect(camera!.zoomLevel).toBeGreaterThan(2.5);
    expect(camera!.zoomLevel).toBeLessThan(3.2);
  });

  it('fits a state geometry more closely than the national geometry', () => {
    const width = 393;
    const height = 873;
    const padding = getMapCameraPadding(width, height);
    const national = getMapCameraForBounds(
      { minLng: 68.09, minLat: 6.75, maxLng: 97.41, maxLat: 37.08 },
      width,
      height,
      padding,
    );
    const maharashtra = getMapCameraForBounds(
      { minLng: 72.655, minLat: 15.607, maxLng: 80.898, maxLat: 22.03 },
      width,
      height,
      padding,
    );

    expect(maharashtra).not.toBeNull();
    expect(maharashtra!.zoomLevel).toBeGreaterThan(national!.zoomLevel);
    expect(maharashtra!.zoomLevel).toBeGreaterThan(4.2);
    expect(maharashtra!.zoomLevel).toBeLessThan(5.2);
  });

  it('rejects empty or invalid geometry bounds instead of producing NaN camera values', () => {
    expect(
      getMapCameraForBounds(
        { minLng: 80, minLat: 20, maxLng: 80, maxLat: 20 },
        393,
        873,
      ),
    ).toBeNull();
    expect(
      getMapCameraForBounds(
        { minLng: Number.NaN, minLat: 10, maxLng: 20, maxLat: 30 },
        393,
        873,
      ),
    ).toBeNull();
  });
});
