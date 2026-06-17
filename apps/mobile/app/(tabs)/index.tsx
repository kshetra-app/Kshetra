import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../lib/responsive';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  CONSTITUENCY_ZOOM,
  MAP_STYLE,
  getPartyColor,
  getStateCenter,
  getStateZoom,
} from '@/lib/constants';
import CandidateAvatar from '@/components/CandidateAvatar';
import { useUserLocation } from '@/lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { MapboxGL, mapboxAvailable } from '@/lib/maplibreCompat';
import { getEnrichedGeoForState } from '@/lib/enrichedGeoCache';
import { computeDistrictDensityMap } from '@/lib/delimitationDensity';
import {
  partyFillColor,
  marginFillColor,
  reservationFillColor,
  populationFillColor,
  literacyFillColor,
  turnoutFillColor,
} from '@/lib/mapFillColors';
import StateSwitcher from '../../components/StateSwitcher';
import MapLegend from '../../components/MapLegend';
import MapFallback from '../../components/MapFallback';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import MapColorToggle, { type MapColorMode } from '../../components/MapColorToggle';
import MapSearch from '../../components/MapSearch';
import CompareSheet from '../../components/CompareSheet';
import ChiefMinisterBadge from '../../components/ChiefMinisterBadge';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import { useFavoritesStore } from '../../stores/favorites';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '@/lib/stateDataAdapter';
import { getTriviaForConstituencyInState, getAllTriviaForState } from '@/lib/stateTriviaAdapter';
import { getHistoryForState } from '@/lib/stateDataDispatcher';
import { selectFreshTrivia } from '@/lib/triviaSelector';
import { computeAllSeatAllocations } from '@/lib/delimitation/seatCalculator';
import { styles } from './index.styles';

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

  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDelimitation, setShowDelimitation] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string | null; name: string; party: string } | null>(null);
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
  const districtDensityMap = useMemo(
    () => computeDistrictDensityMap(stateCode, !!stateProjection),
    [stateCode, stateProjection],
  );

  /** Unified constituency list + lookup map for the active state */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const seedMap = useMemo(
    () => new Map<number, UnifiedConstituency>(stateConstituencies.map((c) => [c.acNo, c])),
    [stateConstituencies],
  );

  /** GeoJSON for the active state (enriched with party/election data).
   *  Uses universal per-state cache — enrichment runs once per state,
   *  then returns the same stable reference on every re-render / switch-back. */
  const activeGeoJSON = useMemo(
    () => getEnrichedGeoForState(stateCode),
    [stateCode],
  );

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
  const stateIdleTrivia = useMemo(() => {
    const all = getAllTriviaForState(stateCode);
    return selectFreshTrivia(all, 8);
  }, [stateCode]);

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
      // GeoJSONSource onPress or features-based fallback (lngLat as array from native)
      else if (event?.lngLat && Array.isArray(event.lngLat)) {
        [lng, lat] = event.lngLat;
      }
      // features-based direct selection (when coords extraction fails)
      if (lng == null && event?.features?.[0]?.properties?.AC_NO != null) {
        const f = event.features[0];
        const { AC_NO, AC_NAME, DIST_NAME } = f.properties;
        const acNo = Number(AC_NO);
        if (selectedRef.current?.acNo === acNo) {
          router.push(`/constituency/${acNo}` as any);
          return;
        }
        selectConstituency(acNo, AC_NAME, DIST_NAME);
        // Try to extract centroid for camera
        const lngLat = event.lngLat;
        if (Array.isArray(lngLat)) {
          cameraRef.current?.setCamera({
            centerCoordinate: [lngLat[0], lngLat[1]],
            zoomLevel: CONSTITUENCY_ZOOM,
            animationDuration: 600,
          });
        }
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

        {/* ── Constituency polygon layers (uniform for all states) ──
             key={stateCode} forces React to unmount old sources & mount new ones
             when the user switches states. This prevents MapLibre from holding
             stale GeoJSON data in its GL engine (root cause of grey/dark maps).
             Dynamic IDs ensure MapLibre never confuses old/new sources. */}
        {activeGeoJSON && (
          <React.Fragment key={stateCode}>
            <MapboxGL.ShapeSource
              id={`constituencies-${stateCode}`}
              shape={activeGeoJSON}
              onPress={handleMapPress}
            >
              <MapboxGL.FillLayer
                id={`constituency-fill-${stateCode}`}
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
                id={`constituency-border-${stateCode}`}
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
              id={`favourites-${stateCode}`}
              shape={activeGeoJSON}
            >
              <MapboxGL.LineLayer
                id={`fav-border-${stateCode}`}
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
              <MapboxGL.ShapeSource id={`delim-overlay-${stateCode}`} shape={delimGeoJSON}>
                <MapboxGL.FillLayer
                  id={`delim-fill-${stateCode}`}
                  style={{
                    fillColor: ['get', 'DELIM_COLOR'],
                    fillOpacity: 0.55,
                  }}
                />
                <MapboxGL.LineLayer
                  id={`delim-border-${stateCode}`}
                  style={{
                    lineColor: '#FFFFFF',
                    lineWidth: 0.5,
                    lineOpacity: 0.3,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </React.Fragment>
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
        <ChiefMinisterBadge stateCode={stateCode} compact />
      </View>

      {/* Action buttons */}
      <View style={[styles.actionButtons, { top: mapTopOffset + 110 }]}>
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
      <View style={[styles.colorToggleContainer, { top: mapTopOffset + 110 }]}>
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
            <Text style={styles.delimBarLbl}>&gt;20%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.delimBarLbl}>10-20%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#FBBF24' }]} />
            <Text style={styles.delimBarLbl}>0-10%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#A3E635' }]} />
            <Text style={styles.delimBarLbl}>-10-0%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.delimBarLbl}>&lt;-10%</Text>
          </View>
          <View style={styles.delimBarLegend}>
            <Text style={[styles.delimBarLbl, { color: '#EF4444' }]}>Under-represented</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={styles.delimBarStat}>{stateProjection.currentSeats}</Text>
            <Ionicons name="arrow-forward" size={12} color="#FCD34D" />
            <Text style={[styles.delimBarStat, { color: '#10B981' }]}>{stateProjection.projectedSeats}</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={[styles.delimBarLbl, { color: '#22C55E' }]}>Over-represented</Text>
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

      {/* Idle trivia — state-specific, hidden when delimitation overlay is active */}
      {!selected && !showDelimitation && stateIdleTrivia.length > 0 && (
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

      {/* Photo viewer modal — tap candidate avatar to enlarge */}
      <PhotoViewerModal
        visible={!!photoViewer}
        imageUri={photoViewer?.uri ?? null}
        name={photoViewer?.name ?? ''}
        party={photoViewer?.party ?? ''}
        subtitle={selected ? `AC #${selected.acNo} · ${selected.district}` : undefined}
        onClose={() => setPhotoViewer(null)}
      />

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
                  key={selected.winnerName}
                  name={selected.winnerName}
                  party={selected.winner}
                  size={36}
                  onPress={(uri) => setPhotoViewer({ uri, name: selected.winnerName, party: selected.winner })}
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
              const allConstituencyTrivia = getTriviaForConstituencyInState(stateCode, selected.acNo).filter(
                (t) => !t.contexts.every((c) => c.type === 'GLOBAL'),
              );
              const items = selectFreshTrivia(allConstituencyTrivia, 5);
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
