import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PARTY_COLORS, getPartyColor } from '@/lib/constants';
import { STATES } from '@kshetra/shared';
import StateSwitcher from './StateSwitcher';
import { getUnifiedConstituenciesForState } from '@/lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';

/**
 * Fallback map screen shown when Mapbox native module is not available
 * (e.g. running in Expo Go instead of a development build).
 * Shows a styled constituency overview with quick-tap navigation.
 */
export default function MapFallback() {
  const router = useRouter();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const currentState = STATES[stateCode];
  const constituencies = getUnifiedConstituenciesForState(stateCode);

  const partySummary = constituencies.reduce<Record<string, number>>(
    (acc, c) => {
      const p = c.winnerParty;
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const sortedParties = Object.entries(partySummary).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>KSHETRA</Text>
          <StateSwitcher />
        </View>
        <Text style={styles.headerSubtitle}>
          {currentState?.name ?? stateCode} · {constituencies.length} Constituencies
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Notice banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color="#4F8EF7" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Interactive Map Unavailable</Text>
            <Text style={styles.bannerBody}>
              The full Mapbox map requires a development build.{'\n'}
              Run: npx expo run:android (or create an EAS dev build).{'\n'}
              All other features work normally in Expo Go!
            </Text>
          </View>
        </View>

        {/* Party seat overview */}
        <Text style={styles.sectionTitle}>Election — Party Seats</Text>
        <View style={styles.partyGrid}>
          {sortedParties.map(([party, seats]) => (
            <View key={party} style={styles.partyCard}>
              <View
                style={[
                  styles.partyDot,
                  { backgroundColor: getPartyColor(party) },
                ]}
              />
              <Text style={styles.partyName}>{party}</Text>
              <Text style={styles.partySeats}>{seats}</Text>
            </View>
          ))}
        </View>

        {/* Top constituencies */}
        <Text style={styles.sectionTitle}>
          Top Constituencies by Margin
        </Text>
        {[...constituencies]
          .sort((a, b) => b.margin - a.margin)
          .slice(0, 15)
          .map((c) => (
            <Pressable
              key={c.acNo}
              style={styles.row}
              onPress={() => router.push(`/constituency/${c.acNo}` as any)}
            >
              <View
                style={[
                  styles.rowBadge,
                  { backgroundColor: getPartyColor(c.winnerParty) },
                ]}
              >
                <Text style={styles.rowBadgeText}>{c.winnerParty}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{c.name}</Text>
                <Text style={styles.rowSub}>
                  AC #{c.acNo} · {c.district}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowMargin}>
                  +{c.margin.toLocaleString()}
                </Text>
                <Text style={styles.rowWinner}>{c.winnerName}</Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  headerSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#4F8EF7',
    gap: 12,
    alignItems: 'flex-start',
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerBody: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  partyDot: { width: 10, height: 10, borderRadius: 5 },
  partyName: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  partySeats: { fontSize: 15, fontWeight: '800', color: '#4F8EF7' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  rowBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  rowSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowMargin: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  rowWinner: { fontSize: 10, color: '#6B7280', marginTop: 2 },
});
