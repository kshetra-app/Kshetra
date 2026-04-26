import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import {
  TELANGANA_CENTER,
  TELANGANA_ZOOM,
  CONSTITUENCY_ZOOM,
  MAP_STYLE,
  getPartyColor,
} from '@/lib/constants';
import telanganaAssemblyGeo from '@/data/telangana-assembly.json';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

interface SelectedConstituency {
  acNo: number;
  name: string;
  district: string;
  winner: string;
}

export default function MapScreen() {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [selected, setSelected] = useState<SelectedConstituency | null>(null);

  const handlePress = useCallback((event: any) => {
    const feature = event?.features?.[0];
    if (!feature?.properties) return;

    const { AC_NO, AC_NAME, DIST_NAME } = feature.properties;
    setSelected({
      acNo: AC_NO,
      name: AC_NAME,
      district: DIST_NAME,
      winner: 'INC', // TODO: merge with seed data
    });

    cameraRef.current?.setCamera({
      centerCoordinate: event.coordinates ?? feature.geometry?.coordinates?.[0]?.[0],
      zoomLevel: CONSTITUENCY_ZOOM,
      animationDuration: 600,
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelected(null);
    cameraRef.current?.setCamera({
      centerCoordinate: TELANGANA_CENTER,
      zoomLevel: TELANGANA_ZOOM,
      animationDuration: 600,
    });
  }, []);

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
          }}
          minZoomLevel={5}
          maxZoomLevel={14}
        />

        <MapboxGL.ShapeSource
          id="constituencies"
          shape={telanganaAssemblyGeo as GeoJSON.FeatureCollection}
          onPress={handlePress}
        >
          <MapboxGL.FillLayer
            id="constituency-fill"
            style={{
              fillColor: [
                'case',
                ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                '#FFD700',
                '#19AAED33',
              ],
              fillOpacity: 0.6,
            }}
          />
          <MapboxGL.LineLayer
            id="constituency-border"
            style={{
              lineColor: '#FFFFFF',
              lineWidth: [
                'case',
                ['==', ['get', 'AC_NO'], selected?.acNo ?? -1],
                2.5,
                0.8,
              ],
              lineOpacity: 0.7,
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Header overlay */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KSHETRA</Text>
        <Text style={styles.headerSubtitle}>Telangana · 119 Constituencies</Text>
      </View>

      {/* Reset button */}
      {selected && (
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="locate" size={22} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Bottom card */}
      {selected && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.partyDot,
                { backgroundColor: getPartyColor(selected.winner) },
              ]}
            />
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>{selected.name}</Text>
              <Text style={styles.cardSubtitle}>
                AC #{selected.acNo} · {selected.district}
              </Text>
            </View>
            <Pressable onPress={handleReset} hitSlop={12}>
              <Ionicons name="close-circle" size={24} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.cardHint}>
            Tap to view full constituency details →
          </Text>
        </View>
      )}
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
    alignItems: 'center',
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
  resetButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 16,
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
  card: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 12,
  },
  cardHint: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
  },
});
