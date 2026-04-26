/**
 * Ray-casting point-in-polygon algorithm.
 * Works with GeoJSON-style [lng, lat] coordinate rings.
 *
 * Performance: O(n) per polygon where n = number of vertices.
 * For 119 constituencies with ~50-200 vertices each, a full scan
 * completes in <10ms on modern mobile hardware.
 */

type Position = [number, number]; // [lng, lat]
type Ring = Position[];

/**
 * Checks if a point lies inside a polygon ring using ray casting.
 * @param point [lng, lat]
 * @param ring Array of [lng, lat] positions forming a closed ring
 * @returns true if point is inside the ring
 */
export function pointInRing(point: Position, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if a point lies inside a GeoJSON Polygon geometry.
 * Handles exterior ring + optional hole rings.
 */
export function pointInPolygon(
  point: Position,
  coordinates: Ring[],
): boolean {
  // Must be inside exterior ring
  if (!pointInRing(point, coordinates[0])) return false;

  // Must NOT be inside any hole ring
  for (let i = 1; i < coordinates.length; i++) {
    if (pointInRing(point, coordinates[i])) return false;
  }

  return true;
}

/**
 * Checks if a point lies inside a GeoJSON MultiPolygon geometry.
 */
export function pointInMultiPolygon(
  point: Position,
  coordinates: Ring[][],
): boolean {
  for (const polygon of coordinates) {
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

export interface FoundFeature {
  /** Index in the FeatureCollection */
  index: number;
  /** Properties from the GeoJSON feature */
  properties: Record<string, any>;
}

/**
 * Finds which feature in a GeoJSON FeatureCollection contains the given point.
 * Returns the first matching feature or null.
 *
 * @param lng Longitude
 * @param lat Latitude
 * @param geojson A GeoJSON FeatureCollection
 */
export function findConstituencyAtPoint(
  lng: number,
  lat: number,
  geojson: GeoJSON.FeatureCollection,
): FoundFeature | null {
  const point: Position = [lng, lat];

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];
    const { geometry } = feature;

    if (geometry.type === 'Polygon') {
      if (pointInPolygon(point, geometry.coordinates as Ring[])) {
        return { index: i, properties: feature.properties ?? {} };
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (pointInMultiPolygon(point, geometry.coordinates as Ring[][])) {
        return { index: i, properties: feature.properties ?? {} };
      }
    }
  }

  return null;
}
