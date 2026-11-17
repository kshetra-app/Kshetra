/** MapLibre camera helpers shared by the political map and its tests. */

export interface MapGeoBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapCameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapCameraPosition {
  centerCoordinate: [number, number];
  zoomLevel: number;
}

const MAPLIBRE_WORLD_TILE_SIZE = 512;
const MIN_MAP_ZOOM = 2.5;
const MAX_MAP_ZOOM = 14;
const FIT_MARGIN_ZOOM = 0.18;

/** Reserve room for the map header, floating tools, and bottom navigation. */
export function getMapCameraPadding(width: number, height: number): MapCameraPadding {
  return {
    top: Math.min(180, Math.max(120, Math.round(height * 0.2))),
    right: Math.min(96, Math.max(72, Math.round(width * 0.22))),
    bottom: Math.min(96, Math.max(64, Math.round(height * 0.1))),
    left: 16,
  };
}

function latitudeToMercatorY(latitude: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (clamped * Math.PI) / 180;
  return (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2;
}

function mercatorYToLatitude(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * Fit geographic bounds into the usable map viewport using MapLibre's 512 px
 * world tile and Mercator latitude scale. A small zoom margin keeps boundary
 * strokes and antimeridian-free regional extents away from the screen edge.
 */
export function getMapCameraForBounds(
  bounds: MapGeoBounds,
  width: number,
  height: number,
  padding = getMapCameraPadding(width, height),
): MapCameraPosition | null {
  const { minLng, minLat, maxLng, maxLat } = bounds;
  if (
    ![minLng, minLat, maxLng, maxLat, width, height].every(Number.isFinite) ||
    maxLng <= minLng ||
    maxLat <= minLat
  ) {
    return null;
  }

  const usableWidth = Math.max(200, width - padding.left - padding.right);
  const usableHeight = Math.max(260, height - padding.top - padding.bottom);
  const longitudeSpan = maxLng - minLng;
  const mercatorTop = latitudeToMercatorY(maxLat);
  const mercatorBottom = latitudeToMercatorY(minLat);
  const mercatorSpan = mercatorBottom - mercatorTop;
  if (longitudeSpan <= 0 || mercatorSpan <= 0) return null;

  const longitudeZoom = Math.log2(
    (usableWidth * 360) / (MAPLIBRE_WORLD_TILE_SIZE * longitudeSpan),
  );
  const latitudeZoom = Math.log2(
    usableHeight / (MAPLIBRE_WORLD_TILE_SIZE * mercatorSpan),
  );
  const zoomLevel = Math.max(
    MIN_MAP_ZOOM,
    Math.min(MAX_MAP_ZOOM, Math.min(longitudeZoom, latitudeZoom) - FIT_MARGIN_ZOOM),
  );

  const centerY = (mercatorTop + mercatorBottom) / 2;
  return {
    centerCoordinate: [(minLng + maxLng) / 2, mercatorYToLatitude(centerY)],
    zoomLevel: Number(zoomLevel.toFixed(2)),
  };
}
