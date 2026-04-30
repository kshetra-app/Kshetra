import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { useUserLocation } from '@/lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { enrichGeoJSON } from '@/lib/enrichGeoJSON';
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
import { getConstituencyHistory } from '@/lib/data';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '@/lib/stateDataAdapter';
import { getRandomTriviaSetForState, getTriviaForConstituencyInState } from '@/lib/stateTriviaAdapter';

/**
 * Dynamically load Mapbox — native module not available in Expo Go.
 * Falls back to MapFallback component when unavailable.
 */
let MapboxGL: any = null;
let mapboxAvailable = false;
try {
  MapboxGL = require('@rnmapbox/maps').default;
  MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
  mapboxAvailable = true;
} catch {
  // Native Mapbox module not available (Expo Go / web)
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
  const myHome = useMyConstituencyStore((s) => s.home);

  /** Unified constituency list + lookup map for the active state */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const seedMap = useMemo(
    () => new Map<number, UnifiedConstituency>(stateConstituencies.map((c) => [c.acNo, c])),
    [stateConstituencies],
  );

  /** GeoJSON for the active state (enriched for TS, raw for others) */
  const activeGeoJSON = useMemo(
    () => isTS ? getEnrichedTSGeo() : getStateGeoJSON(stateCode),
    [stateCode, isTS],
  );

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

  const handlePress = useCallback(
    (event: any) => {
      const feature = event?.features?.[0];
      if (!feature?.properties) return;

      const { AC_NO, AC_NAME, DIST_NAME } = feature.properties;
      const acNo = Number(AC_NO);

      // If tapping the already-selected constituency, go straight to detail
      if (selectedRef.current?.acNo === acNo) {
        router.push(`/constituency/${acNo}`);
        return;
      }

      selectConstituency(acNo, AC_NAME, DIST_NAME);

      // @rnmapbox/maps returns {latitude, longitude} — convert to [lng, lat]
      let coord: [number, number] | undefined;
      if (event.coordinates) {
        const c = event.coordinates;
        if (Array.isArray(c)) {
          coord = c as [number, number];
        } else if (c.longitude != null && c.latitude != null) {
          coord = [c.longitude, c.latitude];
        }
      }
      // Fallback: extract coord from geometry
      if (!coord && feature.geometry) {
        if (feature.geometry.type === 'Point' && feature.geometry.coordinates) {
          coord = feature.geometry.coordinates as [number, number];
        } else if (feature.geometry.coordinates?.[0]) {
          // Polygon: compute rough centroid from ring
          const ring = feature.geometry.coordinates[0];
          if (Array.isArray(ring) && ring.length > 0) {
            let sumLng = 0, sumLat = 0;
            for (const pt of ring) { sumLng += pt[0]; sumLat += pt[1]; }
            coord = [sumLng / ring.length, sumLat / ring.length];
          }
        }
      }

      if (coord) {
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: CONSTITUENCY_ZOOM,
          animationDuration: 600,
        });
      }
    },
    [selectConstituency, router],
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
      router.push(`/constituency/${selected.acNo}`);
    }
  }, [selected, router]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE}
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
              onPress={handlePress}
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>KSHETRA</Text>
          <StateSwitcher />
        </View>
        <Text style={styles.headerSubtitle}>
          {currentState?.name ?? stateCode} · {currentState?.assemblySeats ?? '?'} {t('explore.constituencies')}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
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
      <View style={styles.colorToggleContainer}>
        <MapColorToggle mode={colorMode} onModeChange={setColorMode} />
      </View>

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
              <Text style={styles.resultValue}>{selected.winnerName}</Text>
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

            {/* Historical snapshot — only Telangana has multi-election history */}
            {isTS && (() => {
              const hist = getConstituencyHistory(selected.acNo);
              if (!hist.ac2014 && !hist.ac2018) return null;
              return (
                <View style={styles.histRow}>
                  {hist.ac2014 && (
                    <View style={styles.histMiniCard}>
                      <Text style={styles.histMiniYear}>2014</Text>
                      <Text style={styles.histMiniParty}>{hist.ac2014.party}</Text>
                    </View>
                  )}
                  {hist.ac2018 && (
                    <View style={styles.histMiniCard}>
                      <Text style={styles.histMiniYear}>2018</Text>
                      <Text style={styles.histMiniParty}>{hist.ac2018.party}</Text>
                    </View>
                  )}
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
    top: Platform.OS === 'ios' ? 60 : 40,
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
    top: Platform.OS === 'ios' ? 110 : 90,
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
  resultValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
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
    top: Platform.OS === 'ios' ? 110 : 90,
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
});
