import {
  pointInRing,
  pointInPolygon,
  pointInMultiPolygon,
  findConstituencyAtPoint,
} from '../geo/point-in-polygon';

describe('pointInRing', () => {
  // Simple square: (0,0) -> (10,0) -> (10,10) -> (0,10) -> (0,0)
  const square: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('returns true for a point inside the ring', () => {
    expect(pointInRing([5, 5], square)).toBe(true);
  });

  it('returns false for a point outside the ring', () => {
    expect(pointInRing([15, 5], square)).toBe(false);
  });

  it('returns false for a point far outside', () => {
    expect(pointInRing([-5, -5], square)).toBe(false);
  });

  it('returns true for a point near the edge (inside)', () => {
    expect(pointInRing([0.001, 0.001], square)).toBe(true);
  });

  it('handles a triangle', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [10, 0],
      [5, 10],
      [0, 0],
    ];
    expect(pointInRing([5, 3], triangle)).toBe(true);
    expect(pointInRing([0, 10], triangle)).toBe(false);
  });
});

describe('pointInPolygon', () => {
  // Square with a square hole
  const exterior: [number, number][] = [
    [0, 0],
    [20, 0],
    [20, 20],
    [0, 20],
    [0, 0],
  ];
  const hole: [number, number][] = [
    [5, 5],
    [15, 5],
    [15, 15],
    [5, 15],
    [5, 5],
  ];

  it('returns true for point inside exterior but outside hole', () => {
    expect(pointInPolygon([2, 2], [exterior, hole])).toBe(true);
  });

  it('returns false for point inside the hole', () => {
    expect(pointInPolygon([10, 10], [exterior, hole])).toBe(false);
  });

  it('returns false for point outside exterior', () => {
    expect(pointInPolygon([25, 25], [exterior, hole])).toBe(false);
  });

  it('works without holes', () => {
    expect(pointInPolygon([10, 10], [exterior])).toBe(true);
  });
});

describe('pointInMultiPolygon', () => {
  const poly1: [number, number][][] = [
    [
      [0, 0],
      [5, 0],
      [5, 5],
      [0, 5],
      [0, 0],
    ],
  ];
  const poly2: [number, number][][] = [
    [
      [10, 10],
      [15, 10],
      [15, 15],
      [10, 15],
      [10, 10],
    ],
  ];

  it('returns true if point is in the first polygon', () => {
    expect(pointInMultiPolygon([2, 2], [poly1, poly2])).toBe(true);
  });

  it('returns true if point is in the second polygon', () => {
    expect(pointInMultiPolygon([12, 12], [poly1, poly2])).toBe(true);
  });

  it('returns false if point is in neither polygon', () => {
    expect(pointInMultiPolygon([7, 7], [poly1, poly2])).toBe(false);
  });
});

describe('findConstituencyAtPoint', () => {
  const mockGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { AC_NO: 1, AC_NAME: 'Alpha', DIST_NAME: 'DistA' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78, 17],
              [79, 17],
              [79, 18],
              [78, 18],
              [78, 17],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { AC_NO: 2, AC_NAME: 'Beta', DIST_NAME: 'DistB' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [79, 17],
              [80, 17],
              [80, 18],
              [79, 18],
              [79, 17],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { AC_NO: 3, AC_NAME: 'Gamma', DIST_NAME: 'DistC' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [80, 17],
                [81, 17],
                [81, 18],
                [80, 18],
                [80, 17],
              ],
            ],
            [
              [
                [81, 17],
                [82, 17],
                [82, 18],
                [81, 18],
                [81, 17],
              ],
            ],
          ],
        },
      },
    ],
  };

  it('finds the correct Polygon feature', () => {
    const result = findConstituencyAtPoint(78.5, 17.5, mockGeoJSON);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NO).toBe(1);
    expect(result!.properties.AC_NAME).toBe('Alpha');
    expect(result!.index).toBe(0);
  });

  it('finds the second Polygon feature', () => {
    const result = findConstituencyAtPoint(79.5, 17.5, mockGeoJSON);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NO).toBe(2);
  });

  it('finds a MultiPolygon feature (first part)', () => {
    const result = findConstituencyAtPoint(80.5, 17.5, mockGeoJSON);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NO).toBe(3);
    expect(result!.properties.AC_NAME).toBe('Gamma');
  });

  it('finds a MultiPolygon feature (second part)', () => {
    const result = findConstituencyAtPoint(81.5, 17.5, mockGeoJSON);
    expect(result).not.toBeNull();
    expect(result!.properties.AC_NO).toBe(3);
  });

  it('returns null for a point outside all features', () => {
    const result = findConstituencyAtPoint(85, 20, mockGeoJSON);
    expect(result).toBeNull();
  });

  it('returns null for empty FeatureCollection', () => {
    const empty: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    const result = findConstituencyAtPoint(78.5, 17.5, empty);
    expect(result).toBeNull();
  });
});
