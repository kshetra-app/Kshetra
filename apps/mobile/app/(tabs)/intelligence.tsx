import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StateSwitcher from '../../components/StateSwitcher';
import { PARTY_COLORS, getPartyColor } from '../../lib/constants';
import { getElectionHistoryForState, hasFullDataForState, getTimelineForState } from '../../lib/stateDataDispatcher';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '../../lib/stateDataAdapter';
import { useActiveStateStore } from '../../stores/activeState';
import { STATES } from '@kshetra/shared';
import { useResponsive } from '../../lib/responsive';
import PartyStrengthChart from '../../components/PartyStrengthChart';
import { useTheme } from '../../lib/theme';

/** Compute analytics from seed data — recomputed when state changes */
function useElectionAnalytics(stateCode: string) {
  return useMemo(() => {
    const constituencies = getUnifiedConstituenciesForState(stateCode);
    const totalConstituencies = constituencies.length;
    const partySeats: Record<string, number> = {};
    const partyVotes: Record<string, number> = {};
    let totalVotes = 0;
    let closestMargin = Infinity;
    let closestAC = '';
    let biggestMargin = 0;
    let biggestAC = '';
    const reservationCounts: Record<'GEN' | 'SC' | 'ST', number> = { GEN: 0, SC: 0, ST: 0 };

    for (const c of constituencies) {
      partySeats[c.winnerParty] = (partySeats[c.winnerParty] || 0) + 1;
      partyVotes[c.winnerParty] =
        (partyVotes[c.winnerParty] || 0) + c.winnerVotes;
      totalVotes += c.winnerVotes;
      if (c.type in reservationCounts) reservationCounts[c.type as 'GEN' | 'SC' | 'ST']++;

      if (c.margin < closestMargin) {
        closestMargin = c.margin;
        closestAC = c.name;
      }
      if (c.margin > biggestMargin) {
        biggestMargin = c.margin;
        biggestAC = c.name;
      }
    }

    const sorted = Object.entries(partySeats)
      .sort(([, a], [, b]) => b - a)
      .map(([party, seats]) => ({
        party,
        seats,
        pct: parseFloat(((seats / (totalConstituencies || 1)) * 100).toFixed(1)),
      }));

    const districts = new Set(constituencies.map((c) => c.district));

    // District-wise: count seats per party per district, find dominant party
    const districtPartyMap: Record<string, Record<string, number>> = {};
    for (const c of constituencies) {
      if (!districtPartyMap[c.district]) districtPartyMap[c.district] = {};
      districtPartyMap[c.district][c.winnerParty] =
        (districtPartyMap[c.district][c.winnerParty] || 0) + 1;
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
      totalConstituencies,
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
  }, [stateCode]);
}

export default function IntelligenceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const currentState = STATES[stateCode];
  const hasFull = hasFullDataForState(stateCode);
  const analytics = useElectionAnalytics(stateCode);

  // Determine election year for the active state
  const electionYear = analytics.partyBreakdown.length > 0
    ? (stateCode === 'AP' || stateCode === 'MH' ? 2024 : 2023)
    : '';

  const { insets } = useResponsive();

  const electionSeats = useMemo(() => {
    const seats: Record<string, number> = {};
    const constituencies = getUnifiedConstituenciesForState(stateCode);
    for (const c of constituencies) {
      seats[c.winnerParty] = (seats[c.winnerParty] || 0) + 1;
    }
    return seats;
  }, [stateCode]);

  const currentSeats = useMemo(() => {
    const seats: Record<string, number> = {};
    const constituencies = getUnifiedConstituenciesForState(stateCode);
    for (const c of constituencies) {
      const party = c.currentParty || c.winnerParty;
      seats[party] = (seats[party] || 0) + 1;
    }
    return seats;
  }, [stateCode]);

  const { defectionCount, byelectionCount } = useMemo(() => {
    try {
      const constituencies = getUnifiedConstituenciesForState(stateCode);
      let defs = 0;
      let bys = 0;
      const seenIds = new Set<string>();
      for (const c of constituencies) {
        const timeline = getTimelineForState(stateCode, c.acNo);
        for (const event of timeline) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            if (event.eventType === 'DEFECTION') defs++;
            if (event.eventType === 'BY_ELECTION') bys++;
          }
        }
      }
      return { defectionCount: defs, byelectionCount: bys };
    } catch {
      return { defectionCount: 0, byelectionCount: 0 };
    }
  }, [stateCode]);


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Intelligence</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
              onPress={() => router.push('/parliament' as any)}
            >
              <Ionicons name="business" size={16} color={colors.teal} />
              <Text style={[styles.aiButtonText, { color: colors.teal }]}>MPs</Text>
            </Pressable>
            <Pressable
              style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
              onPress={() => router.push('/ai-chat')}
            >
              <Ionicons name="sparkles" size={16} color={colors.gold} />
              <Text style={[styles.aiButtonText, { color: colors.gold }]}>AI</Text>
            </Pressable>
            <StateSwitcher />
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {currentState?.name ?? stateCode} {electionYear} · Assembly Elections
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{analytics.totalConstituencies}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Constituencies</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="location" size={20} color={colors.teal} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{analytics.districtCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Districts</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="flag" size={20} color={colors.gold} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {analytics.partyBreakdown.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Parties Won</Text>
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

      {/* Election History Timeline */}
      {hasFull && (() => {
        const stateHistory = getElectionHistoryForState(stateCode);
        if (stateHistory.length === 0) return null;
        return <View style={styles.section}>
          <Text style={styles.sectionTitle}>Election Timeline</Text>
          {stateHistory.map((election) => {
          const top3 = [...election.partyResults]
            .sort((a, b) => b.seatsWon - a.seatsWon)
            .slice(0, 3);
          return (
            <View key={election.year} style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineYear}>{election.year}</Text>
                {election.turnout && (
                  <Text style={styles.timelineTurnout}>
                    {election.turnout}% turnout
                  </Text>
                )}
              </View>
              <View style={styles.timelineParties}>
                {top3.map((p) => (
                  <View key={p.party} style={styles.timelinePartyItem}>
                    <View
                      style={[
                        styles.timelinePartyDot,
                        { backgroundColor: getPartyColor(p.party) },
                      ]}
                    />
                    <Text style={styles.timelinePartyName}>{p.party}</Text>
                    <Text style={styles.timelinePartySeats}>{p.seatsWon}</Text>
                    {p.voteShare != null && (
                      <Text style={styles.timelineVoteShare}>
                        {p.voteShare}%
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              {election.notes && (
                <Text style={styles.timelineNotes}>{election.notes}</Text>
              )}
            </View>
          );
          })}
        </View>;
      })()}

      {/* Defection Tracker Section */}
      {hasFull && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Defection Tracker</Text>
          <PartyStrengthChart
            electionSeats={electionSeats}
            currentSeats={currentSeats}
            totalSeats={analytics.totalConstituencies}
            defectionsCount={defectionCount}
            byelectionsCount={byelectionCount}
          />
        </View>
      )}


      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Data: {currentState?.name ?? stateCode} State Election Commission
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    width: 52,
  },
  seatCount: {
    fontSize: 13,
    marginLeft: 8,
  },
  barContainer: {
    height: 8,
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
    fontWeight: '600',
    textAlign: 'right',
  },
  reservationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reservationCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  reservationValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  reservationLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  districtRow: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
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
  },
  districtSeats: {
    fontSize: 13,
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
  timelineCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineYear: {
    fontSize: 20,
    fontWeight: '800',
  },
  timelineTurnout: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineParties: {
    gap: 8,
  },
  timelinePartyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelinePartyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  timelinePartyName: {
    fontSize: 13,
    fontWeight: '700',
    width: 48,
  },
  timelinePartySeats: {
    fontSize: 14,
    fontWeight: '800',
    width: 30,
    textAlign: 'right',
  },
  timelineVoteShare: {
    fontSize: 12,
    marginLeft: 8,
  },
  timelineNotes: {
    fontSize: 11,
    marginTop: 10,
    lineHeight: 15,
  },
  footerText: {
    fontSize: 11,
  },
});
