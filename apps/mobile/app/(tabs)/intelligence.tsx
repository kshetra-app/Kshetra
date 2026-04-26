import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TELANGANA_CONSTITUENCIES, type ConstituencySeed } from '../../../../data/seed/telangana-constituencies';
import { PARTY_COLORS, getPartyColor } from '@/lib/constants';

/** Compute analytics from seed data once */
function useElectionAnalytics() {
  return useMemo(() => {
    const partySeats: Record<string, number> = {};
    const partyVotes: Record<string, number> = {};
    let totalVotes = 0;
    let closestMargin = Infinity;
    let closestAC = '';
    let biggestMargin = 0;
    let biggestAC = '';
    const reservationCounts: Record<'GEN' | 'SC' | 'ST', number> = { GEN: 0, SC: 0, ST: 0 };

    for (const c of TELANGANA_CONSTITUENCIES) {
      partySeats[c.winner2023] = (partySeats[c.winner2023] || 0) + 1;
      partyVotes[c.winner2023] =
        (partyVotes[c.winner2023] || 0) + c.winnerVotes2023;
      totalVotes += c.winnerVotes2023;
      reservationCounts[c.type]++;

      if (c.margin2023 < closestMargin) {
        closestMargin = c.margin2023;
        closestAC = c.name;
      }
      if (c.margin2023 > biggestMargin) {
        biggestMargin = c.margin2023;
        biggestAC = c.name;
      }
    }

    const sorted = Object.entries(partySeats)
      .sort(([, a], [, b]) => b - a)
      .map(([party, seats]) => ({
        party,
        seats,
        pct: parseFloat(((seats / 119) * 100).toFixed(1)),
      }));

    const districts = new Set(TELANGANA_CONSTITUENCIES.map((c: ConstituencySeed) => c.district));

    // District-wise: count seats per party per district, find dominant party
    const districtPartyMap: Record<string, Record<string, number>> = {};
    for (const c of TELANGANA_CONSTITUENCIES) {
      if (!districtPartyMap[c.district]) districtPartyMap[c.district] = {};
      districtPartyMap[c.district][c.winner2023] =
        (districtPartyMap[c.district][c.winner2023] || 0) + 1;
    }

    const districtBreakdown = Object.entries(districtPartyMap)
      .map(([district, parties]) => {
        const totalSeats = Object.values(parties).reduce((a, b) => a + b, 0);
        const [dominantParty, dominantCount] = Object.entries(parties).sort(
          ([, a], [, b]) => b - a,
        )[0];
        return { district, totalSeats, dominantParty, dominantCount, parties };
      })
      .sort((a, b) => b.totalSeats - a.totalSeats);

    return {
      partyBreakdown: sorted,
      totalVotes,
      closestMargin,
      closestAC,
      biggestMargin,
      biggestAC,
      reservationCounts,
      districtCount: districts.size,
      districtBreakdown,
    };
  }, []);
}

export default function IntelligenceScreen() {
  const analytics = useElectionAnalytics();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Intelligence</Text>
        <Text style={styles.headerSubtitle}>
          Telangana 2023 · Assembly Elections
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="people" size={20} color="#4F8EF7" />
          <Text style={styles.summaryValue}>119</Text>
          <Text style={styles.summaryLabel}>Constituencies</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="location" size={20} color="#4F8EF7" />
          <Text style={styles.summaryValue}>{analytics.districtCount}</Text>
          <Text style={styles.summaryLabel}>Districts</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="flag" size={20} color="#4F8EF7" />
          <Text style={styles.summaryValue}>
            {analytics.partyBreakdown.length}
          </Text>
          <Text style={styles.summaryLabel}>Parties Won</Text>
        </View>
      </View>

      {/* Party Seat Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Party Seat Distribution</Text>
        {analytics.partyBreakdown.map(({ party, seats, pct }) => (
          <View key={party} style={styles.partyRow}>
            <View style={styles.partyInfo}>
              <View
                style={[
                  styles.partyDot,
                  { backgroundColor: getPartyColor(party) },
                ]}
              />
              <Text style={styles.partyName}>{party}</Text>
              <Text style={styles.seatCount}>
                {seats} seat{seats !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${pct}%`,
                    backgroundColor: getPartyColor(party),
                  },
                ]}
              />
            </View>
            <Text style={styles.pctText}>{pct}%</Text>
          </View>
        ))}
      </View>

      {/* Reservation Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reservation Status</Text>
        <View style={styles.reservationRow}>
          {(
            [
              ['GEN', 'General', '#4F8EF7'],
              ['SC', 'SC Reserved', '#F59E0B'],
              ['ST', 'ST Reserved', '#10B981'],
            ] as const
          ).map(([key, label, color]) => (
            <View key={key} style={styles.reservationCard}>
              <Text style={[styles.reservationValue, { color }]}>
                {analytics.reservationCounts[key]}
              </Text>
              <Text style={styles.reservationLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* District Breakdown — Top 10 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>District Breakdown</Text>
        {analytics.districtBreakdown.slice(0, 10).map((d) => (
          <View key={d.district} style={styles.districtRow}>
            <View style={styles.districtInfo}>
              <Text style={styles.districtName}>{d.district}</Text>
              <Text style={styles.districtSeats}>
                {d.totalSeats} seat{d.totalSeats !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.districtParties}>
              {Object.entries(d.parties)
                .sort(([, a], [, b]) => b - a)
                .map(([party, count]) => (
                  <View
                    key={party}
                    style={[
                      styles.districtPartyChip,
                      { backgroundColor: getPartyColor(party) + '30' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.districtPartyText,
                        { color: getPartyColor(party) },
                      ]}
                    >
                      {party} {count}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        ))}
      </View>

      {/* Key Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Insights</Text>

        <View style={styles.insightCard}>
          <Ionicons name="trophy" size={18} color="#FFD700" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Biggest Victory</Text>
            <Text style={styles.insightValue}>
              {analytics.biggestAC} — margin of{' '}
              {analytics.biggestMargin.toLocaleString()} votes
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="flash" size={18} color="#EF4444" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Closest Contest</Text>
            <Text style={styles.insightValue}>
              {analytics.closestAC} — margin of{' '}
              {analytics.closestMargin.toLocaleString()} votes
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="pie-chart" size={18} color="#8B5CF6" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Majority Party</Text>
            <Text style={styles.insightValue}>
              {analytics.partyBreakdown[0].party} with{' '}
              {analytics.partyBreakdown[0].seats} seats (
              {analytics.partyBreakdown[0].pct}%)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Data: Telangana State Election Commission · 2023 Results
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  partyRow: {
    marginBottom: 14,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  partyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 52,
  },
  seatCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  barContainer: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 2,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  pctText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'right',
  },
  reservationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reservationCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  reservationValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  reservationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
  },
  districtRow: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  districtInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  districtName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  districtSeats: {
    fontSize: 13,
    color: '#6B7280',
  },
  districtParties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  districtPartyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  districtPartyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#374151',
  },
});
