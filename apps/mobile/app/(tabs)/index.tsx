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
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  TELANGANA_CENTER,
  TELANGANA_ZOOM,
  CONSTITUENCY_ZOOM,
  MAP_STYLE,
  PARTY_COLORS,
  getPartyColor,
} from '@/lib/constants';
import { useUserLocation } from '@/lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { enrichGeoJSON } from '@/lib/enrichGeoJSON';
import StateSwitcher from '../../components/StateSwitcher';
import MapLegend from '../../components/MapLegend';
import MapFallback from '../../components/MapFallback';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import MapColorToggle, { type MapColorMode } from '../../components/MapColorToggle';
import { useFavoritesStore } from '../../stores/favorites';
import telanganaAssemblyGeo from '@/data/telangana-assembly.json';
import { TELANGANA_CONSTITUENCIES, type ConstituencySeed, getTriviaForConstituency, getRandomTriviaSet, getConstituencyHistory } from '@/lib/data';

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

/** Enrich once at module level (offline, ~2ms) */
const enrichedGeo = enrichGeoJSON(
  telanganaAssemblyGeo as GeoJSON.FeatureCollection,
);

/** Quick lookup from AC_NO */
const seedMap = new Map<number, ConstituencySeed>(
  TELANGANA_CONSTITUENCIES.map((c) => [c.acNo, c]),
);

/** Mapbox expression: color each polygon by WINNER_PARTY */
const partyFillColor: any = [
  'match',
  ['get', 'WINNER_PARTY'],
  'INC', PARTY_COLORS.INC,
  'BRS', PARTY_COLORS.BRS,
  'BJP', PARTY_COLORS.BJP,
  'AIMIM', PARTY_COLORS.AIMIM,
  'TDP', PARTY_COLORS.TDP,
  PARTY_COLORS.IND, // fallback
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
}

/** Pre-compute a set of random trivia for idle map state */
const idleTrivia = getRandomTriviaSet(8);

export default function MapScreen() {
  if (!mapboxAvailable) return <MapFallback />;
  return <FullMapScreen />;
}

function FullMapScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selected, setSelected] = useState<SelectedConstituency | null>(null);
  const [userMarker, setUserMarker] = useState<[number, number] | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('party');
  const { loading: locating, requestLocation } = useUserLocation();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);

  /** Compute fill color expression based on current color mode */
  const activeFillColor = useMemo(() => {
    switch (colorMode) {
      case 'margin': return marginFillColor;
      case 'reservation': return reservationFillColor;
      default: return partyFillColor;
    }
  }, [colorMode]);

  const snapPoints = useMemo(() => ['28%', '55%'], []);

  const selectConstituency = useCallback(
    (acNo: number, acName: string, distName: string) => {
      const seed = seedMap.get(acNo);
      setSelected({
        acNo,
        name: acName,
        district: distName,
        winner: seed?.winner2023 ?? 'IND',
        winnerName: seed?.winnerName2023 ?? '',
        runnerUp: seed?.runnerUp2023 ?? '',
        margin: seed?.margin2023 ?? 0,
        votes: seed?.winnerVotes2023 ?? 0,
        type: seed?.type ?? 'GEN',
        currentParty: seed?.currentParty,
      });
      bottomSheetRef.current?.snapToIndex(0);
    },
    [],
  );

  const handlePress = useCallback(
    (event: any) => {
      const feature = event?.features?.[0];
      if (!feature?.properties) return;

      const { AC_NO, AC_NAME, DIST_NAME } = feature.properties;
      selectConstituency(Number(AC_NO), AC_NAME, DIST_NAME);

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
      // Fallback: compute rough centroid from polygon ring
      if (!coord && feature.geometry?.coordinates?.[0]) {
        const ring = feature.geometry.coordinates[0];
        if (Array.isArray(ring) && ring.length > 0) {
          let sumLng = 0, sumLat = 0;
          for (const pt of ring) { sumLng += pt[0]; sumLat += pt[1]; }
          coord = [sumLng / ring.length, sumLat / ring.length];
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
    [selectConstituency],
  );

  const handleReset = useCallback(() => {
    setSelected(null);
    setUserMarker(null);
    bottomSheetRef.current?.close();
    cameraRef.current?.setCamera({
      centerCoordinate: TELANGANA_CENTER,
      zoomLevel: TELANGANA_ZOOM,
      animationDuration: 600,
    });
  }, []);

  const handleLocateMe = useCallback(async () => {
    const loc = await requestLocation();
    if (!loc) return;

    const coord: [number, number] = [loc.longitude, loc.latitude];
    setUserMarker(coord);

    const found = findConstituencyAtPoint(
      loc.longitude,
      loc.latitude,
      enrichedGeo,
    );

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
  }, [requestLocation, selectConstituency]);

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
            centerCoordinate: TELANGANA_CENTER,
            zoomLevel: TELANGANA_ZOOM,
            padding: { paddingTop: 80, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 },
          }}
          minZoomLevel={5}
          maxZoomLevel={14}
        />

        <MapboxGL.ShapeSource
          id="constituencies"
          shape={enrichedGeo}
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
          shape={enrichedGeo}
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
          {STATES.TS.name} · {STATES.TS.assemblySeats} Constituencies
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
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
      <MapLegend />

      {/* Color mode toggle */}
      <View style={styles.colorToggleContainer}>
        <MapColorToggle mode={colorMode} onModeChange={setColorMode} />
      </View>

      {/* Idle trivia — shown when no constituency is selected */}
      {!selected && (
        <View style={styles.idleTriviaContainer}>
          <TriviaCard items={idleTrivia} compact rotateInterval={5000} />
        </View>
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
              <Text style={styles.resultLabel}>2023 Winner</Text>
              <Text style={styles.resultValue}>{selected.winnerName}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {selected.votes.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Winner Votes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {selected.margin.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Margin</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{selected.runnerUp}</Text>
                <Text style={styles.statLabel}>Runner-up</Text>
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
              const items = getTriviaForConstituency(selected.acNo).filter(
                (t) => !t.contexts.every((c) => c.type === 'GLOBAL'),
              );
              return items.length > 0 ? (
                <View style={styles.triviaRow}>
                  <TriviaCard items={items} compact rotateInterval={6000} />
                </View>
              ) : null;
            })()}

            {/* Historical snapshot */}
            {(() => {
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
                    <Text style={styles.histMiniYear}>2023</Text>
                    <Text style={styles.histMiniParty}>{selected.winner}</Text>
                  </View>
                </View>
              );
            })()}

            {/* View detail button */}
            <Pressable style={styles.detailButton} onPress={handleViewDetail}>
              <Text style={styles.detailButtonText}>
                View Full Profile
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
