import React from 'react';

/**
 * Dynamically load MapLibre — native module not available in Expo Go.
 * Consumers should render <MapFallback /> when `mapboxAvailable` is false.
 *
 * Compatibility shim: maps the old @rnmapbox/maps namespace API
 * to the new @maplibre/maplibre-react-native named exports so all
 * existing JSX (MapboxGL.MapView, .Camera, .ShapeSource, etc.) works.
 *
 * Extracted verbatim from app/(tabs)/index.tsx — behaviour unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MapboxGL: any = null;
let mapboxAvailable = false;

/**
 * Robust helper: extract [lng, lat] from any MapLibre / @rnmapbox / React Native press-event shape.
 * Performs type checks, extracts numeric primitives, and detects/fixes inverted Indian coordinates.
 */
export function extractLngLat(raw: any): [number, number] | null {
  if (!raw) return null;
  const ne = raw.nativeEvent ?? raw;

  let lng: number | undefined;
  let lat: number | undefined;

  // 1. Direct array lngLat [lng, lat]
  const ll = ne?.lngLat ?? raw?.lngLat;
  if (Array.isArray(ll) && typeof ll[0] === 'number' && typeof ll[1] === 'number') {
    lng = ll[0];
    lat = ll[1];
  } else if (ll && typeof ll === 'object') {
    if (typeof ll.lng === 'number') lng = ll.lng;
    else if (typeof ll.longitude === 'number') lng = ll.longitude;

    if (typeof ll.lat === 'number') lat = ll.lat;
    else if (typeof ll.latitude === 'number') lat = ll.latitude;
  }

  // 2. Direct array coordinates or coordinate
  if (lng === undefined || lat === undefined) {
    const coords = ne?.coordinates ?? raw?.coordinates ?? ne?.coordinate ?? raw?.coordinate;
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      lng = coords[0];
      lat = coords[1];
    } else if (coords && typeof coords === 'object') {
      if (typeof coords.longitude === 'number') lng = coords.longitude;
      else if (typeof coords.lng === 'number') lng = coords.lng;

      if (typeof coords.latitude === 'number') lat = coords.latitude;
      else if (typeof coords.lat === 'number') lat = coords.lat;
    }
  }

  // 3. Point geometry { type: 'Point', coordinates: [lng, lat] }
  // Strictly accept Point only (never Polygon or MultiPolygon whose coordinates are nested rings)
  if (lng === undefined || lat === undefined) {
    const geom = ne?.geometry ?? raw?.geometry;
    if (geom && Array.isArray(geom.coordinates) && typeof geom.coordinates[0] === 'number' && typeof geom.coordinates[1] === 'number') {
      lng = geom.coordinates[0];
      lat = geom.coordinates[1];
    }
  }

  if (lng === undefined || lat === undefined || isNaN(lng) || isNaN(lat)) {
    return null;
  }

  // Safeguard: India coordinate swap detection
  // Longitude in India is ~68°E to 98°E, Latitude is ~6°N to 38°N.
  // If lng is between 5 and 40 and lat is between 65 and 100, they were inverted as [lat, lng]
  if (lng >= 5 && lng <= 40 && lat >= 65 && lat <= 100) {
    const temp = lng;
    lng = lat;
    lat = temp;
  }

  return [lng, lat];
}

try {
  const ML = require('@maplibre/maplibre-react-native');

  // MapView compat — maps old @rnmapbox/maps prop names to v11 API
  const MapViewCompat = (props: any) => {
    const {
      styleURL,
      logoEnabled,
      attributionEnabled,
      scaleBarEnabled,
      compassEnabled,
      rotateEnabled,
      pitchEnabled,
      zoomEnabled,
      scrollEnabled,
      onRegionDidChange,
      onPress,
      ...rest
    } = props;

    // Wrap onRegionDidChange — MapLibre v11 fires NativeSyntheticEvent<ViewStateChangeEvent>
    // with { nativeEvent: { zoom, center, pitch, bearing, ... } }.
    // Old @rnmapbox code reads event.properties?.zoomLevel.
    const wrappedOnRegionDidChange = onRegionDidChange
      ? (e: any) => {
          const ne = e?.nativeEvent ?? e;
          // Provide both shapes so existing handlers work regardless
          onRegionDidChange({
            properties: { zoomLevel: ne?.zoom },
            zoomLevel: ne?.zoom,
            centerCoordinate: ne?.center,
            pitch: ne?.pitch,
            bearing: ne?.bearing,
            ...ne,
          });
        }
      : undefined;

    const wrappedOnPress = onPress
      ? (e: any) => {
          const coords = extractLngLat(e);
          const ne = e?.nativeEvent ?? e;
          if (coords) {
            onPress({
              ...ne,
              geometry: { type: 'Point', coordinates: coords },
              coordinates: coords,
              lngLat: coords,
              features: ne?.features ?? [],
            });
          }
        }
      : undefined;

    return (
      <ML.Map
        mapStyle={styleURL}
        onPress={wrappedOnPress}
        onRegionDidChange={wrappedOnRegionDidChange}
        logo={logoEnabled}
        attribution={attributionEnabled}
        scaleBar={scaleBarEnabled}
        compass={compassEnabled}
        touchRotate={rotateEnabled}
        touchPitch={pitchEnabled}
        touchZoom={zoomEnabled}
        dragPan={scrollEnabled}
        {...rest}
      />
    );
  };

  // Camera compat
  const CameraCompat = React.forwardRef((props: any, outerRef: any) => {
    const { defaultSettings, minZoomLevel, maxZoomLevel, ...rest } = props;
    const innerRef = React.useRef<any>(null);

    React.useImperativeHandle(outerRef, () => ({
      setCamera: (opts: any) => {
        const { centerCoordinate, zoomLevel, pitch, bearing, animationDuration = 600 } = opts || {};
        const stopOpts: any = {};
        if (centerCoordinate !== undefined) stopOpts.center = centerCoordinate;
        if (zoomLevel !== undefined) stopOpts.zoom = zoomLevel;
        if (pitch !== undefined) stopOpts.pitch = pitch;
        if (bearing !== undefined) stopOpts.bearing = bearing;
        stopOpts.duration = animationDuration;
        stopOpts.easing = centerCoordinate !== undefined ? 'fly' : 'ease';
        innerRef.current?.setStop(stopOpts);
      },
    }));

    const initialViewState = defaultSettings ? {
      center: defaultSettings.centerCoordinate,
      zoom: defaultSettings.zoomLevel,
      padding: defaultSettings.padding,
    } : undefined;

    return (
      <ML.Camera
        ref={innerRef}
        initialViewState={initialViewState}
        minZoom={minZoomLevel}
        maxZoom={maxZoomLevel}
        {...rest}
      />
    );
  });

  // ShapeSource compat — passes onPress through to GeoJSONSource
  const ShapeSourceCompat = (props: any) => {
    const { shape, onPress, hitbox, ...rest } = props;
    const wrappedOnPress = onPress
      ? (e: any) => {
          const coords = extractLngLat(e);
          const ne = e?.nativeEvent ?? e;
          // IMPORTANT: ...ne goes FIRST so canonical point coordinates & geometry are NEVER overwritten by ne.geometry (Polygon)
          onPress({
            ...ne,
            geometry: coords ? { type: 'Point', coordinates: coords } : (ne?.geometry?.type === 'Point' ? ne.geometry : undefined),
            coordinates: coords,
            lngLat: coords,
            features: ne?.features ?? [],
          });
        }
      : undefined;
    // Set minimal hitbox by default (4x4 px) so taps don't query 44px across state borders
    const effectiveHitbox = hitbox ?? { top: 4, bottom: 4, left: 4, right: 4 };
    return <ML.GeoJSONSource data={shape} onPress={wrappedOnPress} hitbox={effectiveHitbox} {...rest} />;
  };

  // VectorSource compat — provides MapLibre vector tile source support for canonical PostGIS MVT
  const VectorSourceCompat = (props: any) => {
    const { url, tileUrlTemplates, onPress, hitbox, ...rest } = props;
    const wrappedOnPress = onPress
      ? (e: any) => {
          const coords = extractLngLat(e);
          const ne = e?.nativeEvent ?? e;
          onPress({
            ...ne,
            geometry: coords ? { type: 'Point', coordinates: coords } : (ne?.geometry?.type === 'Point' ? ne.geometry : undefined),
            coordinates: coords,
            lngLat: coords,
            features: ne?.features ?? [],
          });
        }
      : undefined;
    const effectiveHitbox = hitbox ?? { top: 4, bottom: 4, left: 4, right: 4 };
    return <ML.VectorSource url={url} tileUrlTemplates={tileUrlTemplates} onPress={wrappedOnPress} hitbox={effectiveHitbox} {...rest} />;
  };

  // FillLayer compat — uses deprecated `style` prop (camelCase, works in v11)
  const FillLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="fill" style={layerStyle} {...rest} />;
  };

  // FillExtrusionLayer compat — fixes opacity: MapLibre v11 only allows
  // fillExtrusionOpacity with ["zoom"] expressions, not feature-level ones.
  // The caller uses feature-based ['get','AC_NO'] expressions which silently
  // break the entire layer style.  We split it into a static top-level
  // opacity (0.75) and let fillExtrusionColor handle per-feature logic.
  const FillExtrusionLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    const fixedStyle = { ...layerStyle };
    // MapLibre GL fill-extrusion-opacity is per-layer (zoom only).
    // Feature-level opacity control is not supported — remove it to
    // prevent a fatal style-parse error that silently kills the layer.
    if (fixedStyle.fillExtrusionOpacity !== undefined) {
      // Use the default value from the expression or fall back to 0.75
      fixedStyle.fillExtrusionOpacity = typeof fixedStyle.fillExtrusionOpacity === 'number'
        ? fixedStyle.fillExtrusionOpacity
        : 0.75;
    }
    return <ML.Layer type="fill-extrusion" style={fixedStyle} {...rest} />;
  };

  // LineLayer compat — uses deprecated `style` prop (camelCase, works in v11)
  const LineLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="line" style={layerStyle} {...rest} />;
  };

  // CircleLayer compat — polling booth markers require this layer type
  const CircleLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="circle" style={layerStyle} {...rest} />;
  };

  // PointAnnotation compat
  const PointAnnotationCompat = (props: any) => {
    const { coordinate, children, id } = props;
    return <ML.Marker coordinate={coordinate} anchor="center" id={id}>{children}</ML.Marker>;
  };

  // SymbolLayer compat — uses style prop
  const SymbolLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="symbol" style={layerStyle} {...rest} />;
  };

  try {
    if (typeof ML.setAccessToken === 'function') {
      ML.setAccessToken(null);
    }
  } catch {}

  MapboxGL = {
    MapView: MapViewCompat,
    Camera: CameraCompat,
    ShapeSource: ShapeSourceCompat,
    VectorSource: VectorSourceCompat,
    FillLayer: FillLayerCompat,
    FillExtrusionLayer: FillExtrusionLayerCompat,
    LineLayer: LineLayerCompat,
    CircleLayer: CircleLayerCompat,
    PointAnnotation: PointAnnotationCompat,
    SymbolLayer: SymbolLayerCompat,
    setAccessToken: () => {},
    setTelemetryEnabled: () => {},
  };
  mapboxAvailable = true;
} catch (e) {
  console.warn('MapLibre native module not available:', e);
  const NullComponent = () => null;
  MapboxGL = {
    MapView: NullComponent,
    Camera: NullComponent,
    ShapeSource: NullComponent,
    VectorSource: NullComponent,
    FillLayer: NullComponent,
    FillExtrusionLayer: NullComponent,
    LineLayer: NullComponent,
    CircleLayer: NullComponent,
    PointAnnotation: NullComponent,
    SymbolLayer: NullComponent,
    setAccessToken: () => {},
    setTelemetryEnabled: () => {},
  };
}

export { MapboxGL, mapboxAvailable };
