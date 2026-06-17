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

try {
  const ML = require('@maplibre/maplibre-react-native');

  // ── Helper: extract [lng, lat] from any press-event shape ──
  // Native codegen delivers lngLat as [lng, lat] array,
  // but the TS type exposes it as LngLat = [number, number].
  // Defensively handle both array and object forms.
  function extractLngLat(raw: any): [number, number] | null {
    if (!raw) return null;
    const ne = raw.nativeEvent ?? raw;
    const ll = ne?.lngLat;
    if (Array.isArray(ll) && ll.length >= 2) return [ll[0], ll[1]];
    if (ll && typeof ll.lng === 'number') return [ll.lng, ll.lat];
    if (ll && typeof ll.longitude === 'number') return [ll.longitude, ll.latitude];
    return null;
  }

  // MapView compat
  const MapViewCompat = (props: any) => {
    const { styleURL, logoEnabled, attributionEnabled, scaleBarEnabled,
            compassEnabled, rotateEnabled, pitchEnabled, onPress, ...rest } = props;

    const wrappedOnPress = onPress
      ? (e: any) => {
          const coords = extractLngLat(e);
          const ne = e?.nativeEvent ?? e;
          if (coords) {
            onPress({
              geometry: { coordinates: coords },
              features: ne?.features ?? [],
            });
          }
        }
      : undefined;

    return <ML.Map mapStyle={styleURL} onPress={wrappedOnPress} {...rest} />;
  };

  // Camera compat
  const CameraCompat = React.forwardRef((props: any, outerRef: any) => {
    const { defaultSettings, minZoomLevel, maxZoomLevel, ...rest } = props;
    const innerRef = React.useRef<any>(null);

    React.useImperativeHandle(outerRef, () => ({
      setCamera: (opts: any) => {
        const { centerCoordinate, zoomLevel, animationDuration = 600 } = opts || {};
        innerRef.current?.flyTo({
          center: centerCoordinate,
          zoom: zoomLevel,
          duration: animationDuration,
        });
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
    const { shape, onPress, ...rest } = props;
    const wrappedOnPress = onPress
      ? (e: any) => {
          const ne = e?.nativeEvent ?? e;
          onPress(ne);
        }
      : undefined;
    return <ML.GeoJSONSource data={shape} onPress={wrappedOnPress} {...rest} />;
  };

  // FillLayer compat — uses deprecated `style` prop (camelCase, works in v11)
  const FillLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="fill" style={layerStyle} {...rest} />;
  };

  // LineLayer compat — uses deprecated `style` prop (camelCase, works in v11)
  const LineLayerCompat = (props: any) => {
    const { style: layerStyle, ...rest } = props;
    return <ML.Layer type="line" style={layerStyle} {...rest} />;
  };

  // PointAnnotation compat
  const PointAnnotationCompat = (props: any) => {
    const { coordinate, children, id } = props;
    return <ML.Marker coordinate={coordinate} anchor="center" id={id}>{children}</ML.Marker>;
  };

  MapboxGL = {
    MapView: MapViewCompat,
    Camera: CameraCompat,
    ShapeSource: ShapeSourceCompat,
    FillLayer: FillLayerCompat,
    LineLayer: LineLayerCompat,
    PointAnnotation: PointAnnotationCompat,
  };
  mapboxAvailable = true;
} catch (e) {
  console.warn('MapLibre native module not available:', e);
}

export { MapboxGL, mapboxAvailable };
