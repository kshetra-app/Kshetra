import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../lib/responsive';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  TELANGANA_CENTER,
  TELANGANA_ZOOM,
  CONSTITUENCY_ZOOM,
  MAP_STYLE,
  PARTY_COLORS,
  getPartyColor,
  getStateCenter,
  getStateZoom,
} from '@/lib/constants';
import CandidateAvatar from '@/components/CandidateAvatar';
import { useUserLocation } from '@/lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { enrichGeoJSON, enrichGeoJSONForState } from '@/lib/enrichGeoJSON';
import StateSwitcher from '../../components/StateSwitcher';
import MapLegend from '../../components/MapLegend';
import MapFallback from '../../components/MapFallback';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import MapColorToggle, { type MapColorMode } from '../../components/MapColorToggle';
import MapSearch from '../../components/MapSearch';
import CompareSheet from '../../components/CompareSheet';
import { useFavoritesStore } from '../../stores/favorites';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { getStateGeoJSON } from '@/lib/geoLoader';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '@/lib/stateDataAdapter';
import { getRandomTriviaSetForState, getTriviaForConstituencyInState } from '@/lib/stateTriviaAdapter';
import { getHistoryForState } from '@/lib/stateDataDispatcher';
import { computeAllSeatAllocations } from '@/lib/delimitation/seatCalculator';
import { getCensusDistricts } from '../../../../data/census/india-district-population-2011';

/**
 * Dynamically load MapLibre — native module not available in Expo Go.
 * Falls back to MapFallback component when unavailable.
 *
 * Compatibility shim: maps old @rnmapbox/maps namespace API
 * to new @maplibre/maplibre-react-native named exports so all
 * existing JSX (MapboxGL.MapView, .Camera, .ShapeSource, etc.) works.
 */
let MapboxGL: any = null;
let mapboxAvailable = false;
try {
  const ML = require('@maplibre/maplibre-react-native');
  const React = require('react');

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
    const innerRef = React.useRef(null);

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

/** Cache for TS enriched geo (demographics + seed data) */
let _enrichedTSGeo: GeoJSON.FeatureCollection | null = null;
function getEnrichedTSGeo(): GeoJSON.FeatureCollection {
  if (!_enrichedTSGeo) {
    const raw = getStateGeoJSON('TS');
    _enrichedTSGeo = raw ? enrichGeoJSON(raw) : { type: 'FeatureCollection', features: [] };
  }
  return _enrichedTSGeo;
}

// seedMap is now computed per-state inside FullMapScreen

/** Mapbox expression: color each polygon by WINNER_PARTY */
const partyFillColor: any = [
  'match',
  ['get', 'WINNER_PARTY'],
  'INC', PARTY_COLORS.INC ?? '#19AA4F',
  'BRS', PARTY_COLORS.BRS ?? '#E91E63',
  'BJP', PARTY_COLORS.BJP ?? '#FF9933',
  'AIMIM', PARTY_COLORS.AIMIM ?? '#388E3C',
  'TDP', PARTY_COLORS.TDP ?? '#FFEB3B',
  'YSRCP', PARTY_COLORS.YSRCP ?? '#1565C0',
  'JSP', PARTY_COLORS.JSP ?? '#D32F2F',
  'JDS', PARTY_COLORS.JDS ?? '#4CAF50',
  'SHSUBT', PARTY_COLORS.SHSUBT ?? '#FF5722',
  'SHS', PARTY_COLORS.SHS ?? '#FF9800',
  'NCP', PARTY_COLORS.NCP ?? '#00BCD4',
  'NCPSP', PARTY_COLORS.NCPSP ?? '#0097A7',
  'AAP', PARTY_COLORS.AAP ?? '#0288D1',
  'CPI', PARTY_COLORS.CPI ?? '#F44336',
  'CPIM', PARTY_COLORS.CPIM ?? '#B71C1C',
  // TN / KL / WB / UP parties
  'DMK', '#E30613',
  'AIADMK', '#006400',
  'AITC', '#20C646',
  'SP', '#FF2222',
  'BSP', '#0000FF',
  'IUML', '#009900',
  'KCM', '#FFD700',
  'VCK', '#8B0000',
  'PMK', '#FFCC00',
  'RLD', '#228B22',
  'AD(S)', '#FF69B4',
  'ISF', '#00CED1',
  '#808080', // fallback — IND / others
];

/** Mapbox expression: color by winning margin (heatmap) */
const marginFillColor: any = [
  'interpolate',
  ['linear'],
  ['get', 'MARGIN'],
  0,    '#EF4444',   // red  = razor thin
  5000, '#F59E0B',   // amber = competitive
  20000, '#10B981',  // green = comfortable
  50000, '#3B82F6',  // blue  = landslide
  100000, '#8B5CF6', // purple = massive
];

/** Mapbox expression: color by reservation type */
const reservationFillColor: any = [
  'match',
  ['get', 'RESERVATION'],
  'GEN', '#6366F1',  // indigo
  'SC',  '#F59E0B',  // amber
  'ST',  '#10B981',  // emerald
  '#6B7280',         // fallback
];

/** Mapbox expression: color by population density */
const populationFillColor: any = [
  'interpolate',
  ['linear'],
  ['get', 'POPULATION'],
  200000, '#DBEAFE',   // light blue — sparse
  250000, '#60A5FA',   // blue
  280000, '#3B82F6',   // medium
  310000, '#2563EB',   // dense
  350000, '#1D4ED8',   // very dense
];

/** Mapbox expression: color by literacy rate */
const literacyFillColor: any = [
  'interpolate',
  ['linear'],
  ['get', 'LITERACY'],
  40,  '#EF4444',   // red — very low
  50,  '#F59E0B',   // amber — low
  60,  '#FBBF24',   // yellow — moderate
  70,  '#10B981',   // green — good
  80,  '#059669',   // dark green — high
];

/** Mapbox expression: color by voter turnout */
const turnoutFillColor: any = [
  'interpolate',
  ['linear'],
  ['get', 'TURNOUT'],
  60,  '#EF4444',   // red — low turnout
  68,  '#F59E0B',   // amber
  72,  '#FBBF24',   // yellow
  76,  '#10B981',   // green
  82,  '#059669',   // dark green — high turnout
];

interface SelectedConstituency {
  acNo: number;
  name: string;
  district: string;
  winner: string;
  winnerName: string;
  runnerUp: string;
  margin: number;
  votes: number;
  type: string;
  currentParty?: string;
  electionYear: number;
}

// idleTrivia is now computed per-state inside FullMapScreen

export default function MapScreen() {
  if (!mapboxAvailable) return <MapFallback />;
  return <FullMapScreen />;
}

function FullMapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selected, setSelected] = useState<SelectedConstituency | null>(null);
  const selectedRef = useRef<SelectedConstituency | null>(null);
  const [userMarker, setUserMarker] = useState<[number, number] | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('party');
  const { loading: locating, requestLocation } = useUserLocation();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const currentState = STATES[stateCode];
  const isTS = stateCode === 'TS';

  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDelimitation, setShowDelimitation] = useState(false);
  const myHome = useMyConstituencyStore((s) => s.home);

  /** Delimitation seat projections (computed once) */
  const delimitationProjections = useMemo(() => computeAllSeatAllocations(), []);
  const stateProjection = useMemo(
    () => delimitationProjections.find((p) => p.stateCode === stateCode),
    [delimitationProjections, stateCode],
  );

  /**
   * District-level seat density for delimitation overlay.
   * Maps modern districts → census districts, computes pop-per-seat ratio,
   * assigns deviation % to each constituency district.
   *
   * Census 2011 used old district boundaries (e.g. 10 in Telangana),
   * while seed data uses current 33. This map resolves that.
   */
  const districtDensityMap = useMemo(() => {
    const censusDistricts = getCensusDistricts(stateCode);
    if (!censusDistricts.length || !stateProjection) return new Map<string, number>();

    const constituencies = getUnifiedConstituenciesForState(stateCode);
    const totalPop = censusDistricts.reduce((s, d) => s + d.totalPopulation, 0);
    const totalSeats = constituencies.length;
    const idealPopPerSeat = totalPop / totalSeats;

    // Census district pop lookup (lowercase key)
    const censusPop = new Map<string, number>();
    for (const d of censusDistricts) {
      censusPop.set(d.districtName.toLowerCase(), d.totalPopulation);
    }

    // Map modern district → census parent (for reorganised states)
    const DISTRICT_PARENT: Record<string, string> = {
      // ── Telangana (33 → 10 census districts) ──
      'Kumuram Bheem Asifabad': 'Adilabad', 'Mancherial': 'Adilabad', 'Nirmal': 'Adilabad',
      'Peddapalli': 'Karimnagar', 'Rajanna Sircilla': 'Karimnagar', 'Jagtial': 'Karimnagar',
      'Kamareddy': 'Nizamabad',
      'Hanamkonda': 'Warangal', 'Jangaon': 'Warangal', 'Jayashankar Bhupalpally': 'Warangal',
      'Mahabubabad': 'Warangal', 'Mulugu': 'Warangal',
      'Bhadradri Kothagudem': 'Khammam',
      'Suryapet': 'Nalgonda', 'Yadadri Bhuvanagiri': 'Nalgonda',
      'Vikarabad': 'Rangareddy',
      'Medak': 'Sangareddy', 'Siddipet': 'Sangareddy',
      'Nagarkurnool': 'Mahbubnagar', 'Wanaparthy': 'Mahbubnagar',
      'Narayanpet': 'Mahbubnagar', 'Jogulamba Gadwal': 'Mahbubnagar',
      'Mahabubnagar': 'Mahbubnagar',
    };

    // Group constituencies by their census parent district
    const seatsByCensusDistrict = new Map<string, { seats: number; children: string[] }>();
    for (const c of constituencies) {
      const parent = (DISTRICT_PARENT[c.district] ?? c.district).toLowerCase();
      const entry = seatsByCensusDistrict.get(parent) ?? { seats: 0, children: [] };
      entry.seats++;
      if (!entry.children.includes(c.district)) entry.children.push(c.district);
      seatsByCensusDistrict.set(parent, entry);
    }

    // Compute deviation for each census district, then fan out to children
    const densityMap = new Map<string, number>();
    for (const [censusKey, { seats, children }] of seatsByCensusDistrict) {
      const pop = censusPop.get(censusKey);
      if (!pop || seats === 0) continue;
      const popPerSeat = pop / seats;
      const deviation = ((popPerSeat - idealPopPerSeat) / idealPopPerSeat) * 100;
      for (const child of children) {
        densityMap.set(child, deviation);
      }
    }
    return densityMap;
  }, [stateCode, stateProjection]);

  /** Unified constituency list + lookup map for the active state */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const seedMap = useMemo(
    () => new Map<number, UnifiedConstituency>(stateConstituencies.map((c) => [c.acNo, c])),
    [stateConstituencies],
  );

  /** GeoJSON for the active state (enriched with party/election data) */
  const activeGeoJSON = useMemo(() => {
    if (isTS) return getEnrichedTSGeo();
    const raw = getStateGeoJSON(stateCode);
    if (!raw) return null;
    return enrichGeoJSONForState(raw, stateCode);
  }, [stateCode, isTS]);

  /** Build delimitation GeoJSON — colours constituencies by district density */
  const delimGeoJSON = useMemo(() => {
    if (!activeGeoJSON || !showDelimitation || districtDensityMap.size === 0) return null;

    return {
      ...activeGeoJSON,
      features: activeGeoJSON.features.map((f: any) => {
        const district = f.properties?.DISTRICT || f.properties?.DIST_NAME || '';
        const deviation = districtDensityMap.get(district) ?? 0;
        let color: string;
        if (deviation > 20) color = '#EF4444';
        else if (deviation > 10) color = '#F97316';
        else if (deviation > 0) color = '#FBBF24';
        else if (deviation > -10) color = '#A3E635';
        else color = '#22C55E';

        return {
          ...f,
          properties: {
            ...f.properties,
            DELIM_COLOR: color,
            DELIM_DEVIATION: Math.round(deviation),
          },
        };
      }),
    };
  }, [activeGeoJSON, showDelimitation, districtDensityMap]);

  /** Random trivia for idle map — re-fetched when state changes */
  const stateIdleTrivia = useMemo(
    () => getRandomTriviaSetForState(stateCode, 8),
    [stateCode],
  );

  /** Compute fill color expression based on current color mode */
  const activeFillColor = useMemo(() => {
    switch (colorMode) {
      case 'margin': return marginFillColor;
      case 'reservation': return reservationFillColor;
      case 'population': return populationFillColor;
      case 'literacy': return literacyFillColor;
      case 'turnout': return turnoutFillColor;
      default: return partyFillColor;
    }
  }, [colorMode]);

  const snapPoints = useMemo(() => ['28%', '55%'], []);

  // Keep ref in sync so handlePress always sees latest selected
  selectedRef.current = selected;

  const selectConstituency = useCallback(
    (acNo: number, acName: string, distName: string) => {
      const seed = seedMap.get(acNo);
      setSelected({
        acNo,
        name: acName,
        district: distName,
        winner: seed?.winnerParty ?? 'IND',
        winnerName: seed?.winnerName ?? '',
        runnerUp: seed?.runnerUp ?? '',
        margin: seed?.margin ?? 0,
        votes: seed?.winnerVotes ?? 0,
        type: seed?.type ?? 'GEN',
        currentParty: seed?.currentParty,
        electionYear: seed?.electionYear ?? 2023,
      });
      bottomSheetRef.current?.snapToIndex(0);
    },
    [seedMap],
  );

  const handleMapPress = useCallback(
    (event: any) => {
      // Extract tap coordinates from MapLibre / @rnmapbox event formats
      let lng: number | undefined;
      let lat: number | undefined;

      // MapLibre RN: geometry.coordinates = [lng, lat]
      if (event?.geometry?.coordinates) {
        [lng, lat] = event.geometry.coordinates;
      }
      // MapLibre alternative: coordinate array
      else if (event?.coordinate) {
        if (Array.isArray(event.coordinate)) {
          [lng, lat] = event.coordinate;
        }
      }
      // @rnmapbox/maps legacy: {longitude, latitude}
      else if (event?.coordinates) {
        const c = event.coordinates;
        if (Array.isArray(c)) { [lng, lat] = c; }
        else if (c.longitude != null) { lng = c.longitude; lat = c.latitude; }
      }
      // features-based fallback
      else if (event?.features?.[0]?.properties?.AC_NO != null) {
        const f = event.features[0];
        const { AC_NO, AC_NAME, DIST_NAME } = f.properties;
        const acNo = Number(AC_NO);
        if (selectedRef.current?.acNo === acNo) {
          router.push(`/constituency/${acNo}` as any);
          return;
        }
        selectConstituency(acNo, AC_NAME, DIST_NAME);
        return;
      }

      if (lng == null || lat == null || !activeGeoJSON) return;

      // Reliable point-in-polygon constituency detection (works offline, all states)
      const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
      if (!found) return;

      const { AC_NO, AC_NAME, DIST_NAME } = found.properties;
      const acNo = Number(AC_NO);

      // If tapping already-selected → navigate to detail
      if (selectedRef.current?.acNo === acNo) {
        router.push(`/constituency/${acNo}` as any);
        return;
      }

      selectConstituency(acNo, AC_NAME, DIST_NAME);

      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: CONSTITUENCY_ZOOM,
        animationDuration: 600,
      });
    },
    [selectConstituency, router, activeGeoJSON],
  );

  // Fly camera to new state when state switcher changes
  useEffect(() => {
    setSelected(null);
    bottomSheetRef.current?.close();
    cameraRef.current?.setCamera({
      centerCoordinate: getStateCenter(stateCode),
      zoomLevel: getStateZoom(stateCode),
      animationDuration: 800,
    });
  }, [stateCode]);

  const handleReset = useCallback(() => {
    setSelected(null);
    setUserMarker(null);
    bottomSheetRef.current?.close();
    cameraRef.current?.setCamera({
      centerCoordinate: getStateCenter(stateCode),
      zoomLevel: getStateZoom(stateCode),
      animationDuration: 600,
    });
  }, [stateCode]);

  const handleLocateMe = useCallback(async () => {
    const loc = await requestLocation();
    if (!loc) return;

    const coord: [number, number] = [loc.longitude, loc.latitude];
    setUserMarker(coord);

    const found = activeGeoJSON ? findConstituencyAtPoint(
      loc.longitude,
      loc.latitude,
      activeGeoJSON,
    ) : null;

    if (found) {
      selectConstituency(
        found.properties.AC_NO,
        found.properties.AC_NAME,
        found.properties.DIST_NAME,
      );
      cameraRef.current?.setCamera({
        centerCoordinate: coord,
        zoomLevel: CONSTITUENCY_ZOOM,
        animationDuration: 800,
      });
    } else {
      setSelected(null);
      cameraRef.current?.setCamera({
        centerCoordinate: coord,
        zoomLevel: 8,
        animationDuration: 800,
      });
    }
  }, [requestLocation, selectConstituency, activeGeoJSON]);

  const handleViewDetail = useCallback(() => {
    if (selected) {
      router.push(`/constituency/${selected.acNo}` as any);
    }
  }, [selected, router]);

  const { insets } = useResponsive();
  const mapTopOffset = insets.top + 8;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE}
        onPress={handleMapPress}
        rotateEnabled={false}
        pitchEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: getStateCenter(stateCode),
            zoomLevel: getStateZoom(stateCode),
            padding: { paddingTop: 80, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 },
          }}
          minZoomLevel={5}
          maxZoomLevel={14}
        />

        {/* ── Constituency polygon layers (uniform for all states) ── */}
        {activeGeoJSON && (
          <>
            <MapboxGL.ShapeSource
              id="constituencies"
              shape={activeGeoJSON}
            >
              <MapboxGL.FillLayer
                id="constituency-fill"
                style={{
                  fillColor: [
                    'case',
                    ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                    '#FFD700',
                    activeFillColor,
                  ],
                  fillOpacity: [
                    'case',
                    ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                    0.8,
                    0.5,
                  ],
                }}
              />
              <MapboxGL.LineLayer
                id="constituency-border"
                style={{
                  lineColor: [
                    'case',
                    ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                    '#FFD700',
                    'rgba(255,255,255,0.4)',
                  ],
                  lineWidth: [
                    'case',
                    ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                    2.5,
                    0.6,
                  ],
                }}
              />
            </MapboxGL.ShapeSource>

            {/* Favourites highlight layer */}
            <MapboxGL.ShapeSource
              id="favourites"
              shape={activeGeoJSON}
            >
              <MapboxGL.LineLayer
                id="fav-border"
                filter={['in', ['get', 'AC_NO'], ['literal', favoriteIds]]}
                style={{
                  lineColor: '#EF4444',
                  lineWidth: 2.5,
                  lineOpacity: 0.9,
                }}
              />
            </MapboxGL.ShapeSource>

            {/* ── Delimitation overlay: district-level population density ── */}
            {showDelimitation && delimGeoJSON && (
              <MapboxGL.ShapeSource id="delim-overlay" shape={delimGeoJSON}>
                <MapboxGL.FillLayer
                  id="delim-fill"
                  style={{
                    fillColor: ['get', 'DELIM_COLOR'],
                    fillOpacity: 0.55,
                  }}
                />
                <MapboxGL.LineLayer
                  id="delim-border"
                  style={{
                    lineColor: '#FFFFFF',
                    lineWidth: 0.5,
                    lineOpacity: 0.3,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </>
        )}

        {/* User location marker */}
        {userMarker && (
          <MapboxGL.PointAnnotation
            id="user-location"
            coordinate={userMarker}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* Header overlay */}
      <View style={[styles.header, { top: mapTopOffset }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>KSHETRA</Text>
          <StateSwitcher />
        </View>
        <Text style={styles.headerSubtitle}>
          {currentState?.name ?? stateCode} · {currentState?.assemblySeats ?? '?'} {t('explore.constituencies')}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={[styles.actionButtons, { top: mapTopOffset + 52 }]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => setShowSearch(true)}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.compareButton]}
          onPress={() => setShowCompare(true)}
        >
          <Ionicons name="git-compare" size={20} color="#FFFFFF" />
        </Pressable>
        {selected && (
          <Pressable style={styles.actionButton} onPress={handleReset}>
            <Ionicons name="resize" size={20} color="#FFFFFF" />
          </Pressable>
        )}
        <Pressable
          style={[
            styles.actionButton,
            showDelimitation && styles.delimButtonActive,
          ]}
          onPress={() => setShowDelimitation((v) => !v)}
        >
          <Ionicons name="layers" size={20} color={showDelimitation ? '#FCD34D' : '#FFFFFF'} />
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            styles.locateButton,
            locating && styles.actionButtonDisabled,
          ]}
          onPress={handleLocateMe}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Map Legend */}
      <MapLegend colorMode={colorMode} stateCode={stateCode} />

      {/* Color mode toggle */}
      <View style={[styles.colorToggleContainer, { top: mapTopOffset + 52 }]}>
        <MapColorToggle mode={colorMode} onModeChange={setColorMode} />
      </View>

      {/* Delimitation overlay info bar */}
      {showDelimitation && stateProjection && (
        <View style={styles.delimBar}>
          <View style={styles.delimBarTop}>
            <Ionicons name="layers" size={14} color="#FCD34D" />
            <Text style={styles.delimBarTitle}>Seat Density Overlay</Text>
            <Text style={styles.delimBarBadge}>PROJECTED</Text>
          </View>
          <View style={styles.delimBarLegend}>
            <View style={[styles.delimDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.delimBarLbl}>Needs seats</Text>
            <View style={[styles.delimDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.delimBarLbl}>May lose</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={styles.delimBarStat}>{stateProjection.currentSeats}</Text>
            <Ionicons name="arrow-forward" size={12} color="#FCD34D" />
            <Text style={[styles.delimBarStat, { color: '#10B981' }]}>{stateProjection.projectedSeats}</Text>
          </View>
          <Pressable onPress={() => router.push('/delimitation' as any)}>
            <Text style={styles.delimBarLink}>View full analysis →</Text>
          </Pressable>
        </View>
      )}

      {/* My Constituency home marker — shown above trivia when no selection */}
      {myHome && !selected && (
        <Pressable
          style={styles.homeIndicator}
          onPress={() => {
            selectConstituency(myHome.acNo, myHome.name, myHome.district);
            const feature = activeGeoJSON?.features.find(
              (f) => f.properties?.AC_NO === myHome.acNo,
            );
            if (feature?.geometry?.type === 'Point') {
              cameraRef.current?.setCamera({
                centerCoordinate: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
                zoomLevel: CONSTITUENCY_ZOOM,
                animationDuration: 600,
              });
            } else if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
              const coords = feature.geometry.type === 'Polygon'
                ? (feature.geometry as GeoJSON.Polygon).coordinates[0]
                : (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
              if (coords?.length > 0) {
                let sumLng = 0, sumLat = 0;
                for (const pt of coords) { sumLng += pt[0]; sumLat += pt[1]; }
                cameraRef.current?.setCamera({
                  centerCoordinate: [sumLng / coords.length, sumLat / coords.length],
                  zoomLevel: CONSTITUENCY_ZOOM,
                  animationDuration: 600,
                });
              }
            }
          }}
        >
          <Ionicons name="home" size={14} color="#10B981" />
          <Text style={styles.homeText}>{myHome.name}</Text>
        </Pressable>
      )}

      {/* Idle trivia — state-specific, shown when no constituency is selected */}
      {!selected && stateIdleTrivia.length > 0 && (
        <View style={styles.idleTriviaContainer}>
          <TriviaCard items={stateIdleTrivia} compact rotateInterval={5000} />
        </View>
      )}

      {/* Search overlay */}
      {showSearch && (
        <MapSearch
          constituencies={stateConstituencies}
          onSelect={(acNo, name, district) => {
            setShowSearch(false);
            selectConstituency(acNo, name, district);
            const feature = activeGeoJSON?.features.find(
              (f) => f.properties?.AC_NO === acNo,
            );
            if (feature?.geometry?.type === 'Point') {
              cameraRef.current?.setCamera({
                centerCoordinate: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
                zoomLevel: CONSTITUENCY_ZOOM,
                animationDuration: 600,
              });
            } else if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
              const coords = feature.geometry.type === 'Polygon'
                ? (feature.geometry as GeoJSON.Polygon).coordinates[0]
                : (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
              if (coords?.length > 0) {
                let sumLng = 0, sumLat = 0;
                for (const pt of coords) { sumLng += pt[0]; sumLat += pt[1]; }
                cameraRef.current?.setCamera({
                  centerCoordinate: [sumLng / coords.length, sumLat / coords.length],
                  zoomLevel: CONSTITUENCY_ZOOM,
                  animationDuration: 600,
                });
              }
            }
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Compare sheet — mount only when needed to avoid Fabric Modal crash */}
      {showCompare && (
        <CompareSheet
          visible={showCompare}
          initialAcNo={selected?.acNo}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <BottomSheetView style={styles.sheetContent}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.partyBadge,
                  { backgroundColor: getPartyColor(selected.winner) },
                ]}
              >
                <Text style={styles.partyBadgeText}>{selected.winner}</Text>
              </View>
              <View style={styles.sheetTitleGroup}>
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  AC #{selected.acNo} · {selected.district} · {selected.type}
                </Text>
              </View>
            </View>

            {/* Election result */}
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>{t('mapSheet.winnerYear', { year: selected.electionYear })}</Text>
              <View style={styles.resultWinnerRow}>
                <CandidateAvatar
                  name={selected.winnerName}
                  party={selected.winner}
                  size={36}
                />
                <Text style={styles.resultValue}>{selected.winnerName}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {selected.votes.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>{t('mapSheet.winnerVotes')}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {selected.margin.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>{t('mapSheet.margin')}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{selected.runnerUp}</Text>
                <Text style={styles.statLabel}>{t('mapSheet.runnerUp')}</Text>
              </View>
            </View>

            {/* Defection badge */}
            {selected.currentParty && selected.currentParty !== selected.winner && (
              <View style={styles.defectionRow}>
                <DefectionBadge
                  electedParty={selected.winner}
                  currentParty={selected.currentParty}
                  compact
                />
              </View>
            )}

            {/* Contextual trivia */}
            {(() => {
              const items = getTriviaForConstituencyInState(stateCode, selected.acNo).filter(
                (t) => !t.contexts.every((c) => c.type === 'GLOBAL'),
              );
              return items.length > 0 ? (
                <View style={styles.triviaRow}>
                  <TriviaCard items={items} compact rotateInterval={6000} />
                </View>
              ) : null;
            })()}

            {/* Historical snapshot — all states */}
            {(() => {
              const pastElections = getHistoryForState(stateCode, selected.acNo);
              if (pastElections.length === 0) return null;
              return (
                <View style={styles.histRow}>
                  {pastElections.map((e) => (
                    <View key={e.year} style={styles.histMiniCard}>
                      <Text style={styles.histMiniYear}>{e.year}</Text>
                      <Text style={styles.histMiniParty}>{e.party}</Text>
                    </View>
                  ))}
                  <View style={[styles.histMiniCard, styles.histMiniCardCurrent]}>
                    <Text style={styles.histMiniYear}>{selected.electionYear}</Text>
                    <Text style={styles.histMiniParty}>{selected.winner}</Text>
                  </View>
                </View>
              );
            })()}

            {/* View detail button */}
            <Pressable style={styles.detailButton} onPress={handleViewDetail}>
              <Text style={styles.detailButtonText}>
                {t('mapSheet.viewFullProfile')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </BottomSheetView>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  locateButton: {
    backgroundColor: '#4F8EF7',
  },
  compareButton: {
    backgroundColor: '#8B5CF6',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  homeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 142, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F8EF7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // ─── Bottom Sheet ───
  sheetBackground: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: '#4B5563',
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 14,
  },
  partyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetTitleGroup: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resultSection: {
    marginBottom: 14,
  },
  resultLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  sheetAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  sheetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  resultValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  defectionRow: {
    marginBottom: 14,
  },
  triviaRow: {
    marginBottom: 14,
  },
  colorToggleContainer: {
    position: 'absolute',
    left: 16,
  },
  idleTriviaContainer: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  detailButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ─── Historical mini-cards ───
  histRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  histMiniCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  histMiniCardCurrent: {
    borderWidth: 1,
    borderColor: '#4F8EF740',
  },
  histMiniYear: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  histMiniParty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  // ─── Delimitation overlay ───
  delimButtonActive: {
    backgroundColor: '#78350F',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  delimBar: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: '#1C1917F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FCD34D40',
    elevation: 5,
  },
  delimBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  delimBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCD34D',
    flex: 1,
  },
  delimBarBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: '#78350F50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  delimBarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  delimDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  delimBarLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  delimBarSpacer: {
    flex: 1,
  },
  delimBarStat: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  delimBarLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD34D',
    textAlign: 'center',
  },
});
