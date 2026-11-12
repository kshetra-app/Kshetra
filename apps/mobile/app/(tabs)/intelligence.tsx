import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StateSwitcher from '../../components/StateSwitcher';
import { getPartyColor } from '../../lib/constants';
import { getElectionHistoryForState, hasFullDataForState, getTimelineForState } from '../../lib/stateDataDispatcher';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '../../lib/stateDataAdapter';
import { useConstituencyDirectory } from '../../lib/useConstituencyDirectory';
import { formatIntelligenceDirectoryCount } from '../../lib/intelligencePresentation';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';
import { useActiveStateStore } from '../../stores/activeState';
import { STATES } from '@kshetra/shared';
import { useResponsive } from '../../lib/responsive';
import PartyStrengthChart from '../../components/PartyStrengthChart';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

/** Compute analytics from live database records or local reference data. */
function useElectionAnalytics(
  stateCode: string,
  directoryRecords: UnifiedConstituency[],
  liveMode: boolean,
) {
  return useMemo(() => {
    const constituencies = liveMode
      ? directoryRecords.filter((record) => record.dataStatus === 'DATABASE_RECORDED')
      : getUnifiedConstituenciesForState(stateCode);
    const totalConstituencies = constituencies.length;
    const partySeats: Record<string, number> = {};
    let closestMargin = Infinity;
    let closestAC = '';
    let biggestMargin = 0;
    let biggestAC = '';
    const reservationCounts: Record<'GEN' | 'SC' | 'ST', number> = { GEN: 0, SC: 0, ST: 0 };

    for (const c of constituencies) {
      const party = liveMode ? c.currentParty.trim() : c.winnerParty || 'Unknown';
      if (party) partySeats[party] = (partySeats[party] || 0) + 1;
      if (c.type in reservationCounts) reservationCounts[c.type as 'GEN' | 'SC' | 'ST']++;

      if (!liveMode && c.margin != null && c.margin < closestMargin) {
        closestMargin = c.margin;
        closestAC = c.name;
      }
      if (!liveMode && c.margin != null && c.margin > biggestMargin) {
        biggestMargin = c.margin;
        biggestAC = c.name;
      }
    }

    const partyRecordCount = Object.values(partySeats).reduce((sum, count) => sum + count, 0);
    const sorted = Object.entries(partySeats)
      .sort(([, a], [, b]) => b - a)
      .map(([party, seats]) => ({
        party,
        seats,
        pct: parseFloat(((seats / ((liveMode ? partyRecordCount : totalConstituencies) || 1)) * 100).toFixed(1)),
      }));

    const districts = new Set(constituencies.map((c) => c.district.trim()).filter(Boolean));
    const electionYears = [...new Set(
      constituencies
        .map((c) => c.electionYear)
        .filter((year): year is number => year !== null),
    )].sort((a, b) => a - b);

    // District-wise: count seats per party per district, find dominant party
    const districtPartyMap: Record<string, Record<string, number>> = {};
    for (const c of constituencies) {
      const party = liveMode ? c.currentParty.trim() : c.winnerParty;
      if (!party || !c.district.trim()) continue;
      if (!districtPartyMap[c.district]) districtPartyMap[c.district] = {};
      districtPartyMap[c.district][party] =
        (districtPartyMap[c.district][party] || 0) + 1;
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
      partyRecordCount,
      electionYears,
      partyBreakdown: sorted,
      closestMargin: Number.isFinite(closestMargin) ? closestMargin : null,
      closestAC,
      biggestMargin: biggestAC ? biggestMargin : null,
      biggestAC,
      reservationCounts,
      districtCount: districts.size,
      districtBreakdown,
    };
  }, [stateCode, directoryRecords, liveMode]);
}

export default function IntelligenceScreen() {
  const router = useRouter();
  const [helpVisible, setHelpVisible] = useState(false);
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const currentState = STATES[stateCode];
  const hasFull = hasFullDataForState(stateCode);
  const {
    constituencies: directoryRecords,
    status: directoryStatus,
    refresh: refreshDirectory,
  } = useConstituencyDirectory(stateCode);
  const analytics = useElectionAnalytics(stateCode, directoryRecords, IS_LIVE_ENVIRONMENT);

  // Determine election year for the active state
  const electionYear = analytics.electionYears.length === 1
    ? analytics.electionYears[0]
    : analytics.electionYears.length > 1 ? 'Mixed election years' : '';

  const { insets } = useResponsive();

  const electionSeats = useMemo(() => {
    const seats: Record<string, number> = {};
    if (IS_LIVE_ENVIRONMENT) return seats;
    const constituencies = getUnifiedConstituenciesForState(stateCode);
    for (const c of constituencies) {
      seats[c.winnerParty] = (seats[c.winnerParty] || 0) + 1;
    }
    return seats;
  }, [stateCode]);

  const currentSeats = useMemo(() => {
    const seats: Record<string, number> = {};
    const constituencies = IS_LIVE_ENVIRONMENT
      ? directoryRecords.filter((record) => record.dataStatus === 'DATABASE_RECORDED')
      : getUnifiedConstituenciesForState(stateCode);
    for (const c of constituencies) {
      const party = IS_LIVE_ENVIRONMENT
        ? c.currentParty.trim()
        : c.officeholderStatus === 'VACANT'
        ? 'VACANT'
        : c.currentParty || c.winnerParty;
      if (!party) continue;
      seats[party] = (seats[party] || 0) + 1;
    }
    return seats;
  }, [stateCode, directoryRecords]);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('intelligence.title', { defaultValue: 'Intelligence' })}</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
              style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
              onPress={() => setHelpVisible(true)}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
              onPress={() => router.push('/parliament' as any)}
            >
              <Ionicons name="business" size={16} color={colors.teal} />
              <Text style={[styles.aiButtonText, { color: colors.teal }]}>{t('intelligence.mps', { defaultValue: 'MPs' })}</Text>
            </Pressable>
            <Pressable
              style={[styles.aiButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
              onPress={() => router.push('/ai-chat')}
            >
              <Ionicons name="sparkles" size={16} color={colors.gold} />
              <Text style={[styles.aiButtonText, { color: colors.gold }]}>{t('intelligence.ai', { defaultValue: 'AI' })}</Text>
            </Pressable>
            <StateSwitcher />
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {IS_LIVE_ENVIRONMENT
            ? `${currentState?.name ?? stateCode} · ${t('intelligence.currentRecords', { defaultValue: 'Current database records' })}`
            : `${currentState?.name ?? stateCode} ${electionYear} · Assembly Elections`}
        </Text>
      </View>

      {IS_LIVE_ENVIRONMENT && (
        <View style={[styles.liveDataNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {directoryStatus === 'LOADING' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name={directoryStatus === 'DATABASE_RECORDS' ? 'server-outline' : 'information-circle-outline'}
              size={17}
              color={directoryStatus === 'DATABASE_RECORDS' ? colors.teal : colors.textMuted}
            />
          )}
          <Text style={[styles.liveDataNoticeText, { color: colors.textSecondary }]}>
            {directoryStatus === 'LOADING'
              ? t('constituencyDirectory.loading', { defaultValue: 'Checking live constituency records…' })
              : directoryStatus === 'DATABASE_RECORDS'
                ? t('intelligence.liveCoverage', { count: analytics.totalConstituencies, knownParties: analytics.partyRecordCount, defaultValue: `${analytics.totalConstituencies} constituency database records loaded; party percentages use ${analytics.partyRecordCount} records with a party. Election margins and historical totals are not connected.` })
                : directoryStatus === 'STALE_DATABASE_RECORDS'
                  ? t('constituencyDirectory.staleRecords', { defaultValue: 'Showing previously loaded records; current database data could not be confirmed.' })
                  : directoryStatus === 'DATABASE_EMPTY'
                    ? t('constituencyDirectory.empty', { defaultValue: 'No representative records are available for this state yet.' })
                    : directoryStatus === 'NOT_APPLICABLE'
                      ? t('intelligence.nationalUnavailable', { defaultValue: 'A national current-party dataset is not connected.' })
                      : t('constituencyDirectory.unavailable', { defaultValue: 'Live representative records are unavailable.' })}
          </Text>
          {(directoryStatus === 'UNAVAILABLE' || directoryStatus === 'STALE_DATABASE_RECORDS' || directoryStatus === 'DATABASE_EMPTY') && (
            <Pressable
              onPress={refreshDirectory}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
            >
              <Ionicons name="refresh" size={17} color={colors.primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatIntelligenceDirectoryCount(analytics.totalConstituencies, directoryStatus, IS_LIVE_ENVIRONMENT)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{IS_LIVE_ENVIRONMENT ? t('intelligence.databaseRecords', { defaultValue: 'Database records' }) : t('intelligence.constituencies', { defaultValue: 'Constituencies' })}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="location" size={20} color={colors.teal} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatIntelligenceDirectoryCount(analytics.districtCount, directoryStatus, IS_LIVE_ENVIRONMENT)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('intelligence.districts', { defaultValue: 'Districts' })}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="flag" size={20} color={colors.gold} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatIntelligenceDirectoryCount(analytics.partyBreakdown.length, directoryStatus, IS_LIVE_ENVIRONMENT)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{IS_LIVE_ENVIRONMENT ? t('intelligence.partiesRecorded', { defaultValue: 'Parties recorded' }) : t('intelligence.partiesWon', { defaultValue: 'Parties Won' })}</Text>
        </View>
      </View>

      {/* Party Seat Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{IS_LIVE_ENVIRONMENT ? t('intelligence.currentPartyRecords', { defaultValue: 'Current Party Records' }) : t('intelligence.seatDistribution', { defaultValue: 'Party Seat Distribution' })}</Text>
        {analytics.partyBreakdown.length === 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('constituencyDirectory.partyRecordsUnavailable', { defaultValue: 'Current party records are unavailable for this view.' })}
          </Text>
        )}
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
                {seats} {IS_LIVE_ENVIRONMENT ? t('intelligence.records', { defaultValue: 'records' }) : `seat${seats !== 1 ? 's' : ''}`}
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
        <Text style={styles.sectionTitle}>
          {t('intelligence.reservationStatus', { defaultValue: 'Reservation Status' })}
          {IS_LIVE_ENVIRONMENT ? ` · ${t('intelligence.databaseRecords', { defaultValue: 'database records' })}` : ''}
        </Text>
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
                {formatIntelligenceDirectoryCount(analytics.reservationCounts[key], directoryStatus, IS_LIVE_ENVIRONMENT)}
              </Text>
              <Text style={styles.reservationLabel}>
                {IS_LIVE_ENVIRONMENT
                  ? `${label} ${t('intelligence.records', { defaultValue: 'records' })}`
                  : label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* District Breakdown — Top 10 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('intelligence.districtBreakdown', { defaultValue: 'District Breakdown' })}
          {IS_LIVE_ENVIRONMENT ? ` · ${t('intelligence.databaseRecords', { defaultValue: 'database records' })}` : ''}
        </Text>
        {(showAllDistricts ? analytics.districtBreakdown : analytics.districtBreakdown.slice(0, 5)).map((d) => (
          <View key={d.district} style={styles.districtRow}>
            <View style={styles.districtInfo}>
              <Text style={styles.districtName}>{d.district}</Text>
              <Text style={styles.districtSeats}>
                {IS_LIVE_ENVIRONMENT
                  ? `${d.totalSeats} ${t('intelligence.records', { defaultValue: 'records' })}`
                  : `${d.totalSeats} seat${d.totalSeats !== 1 ? 's' : ''}`}
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
        {analytics.districtBreakdown.length > 5 && (
          <Pressable
            style={{
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 8,
              marginTop: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={() => setShowAllDistricts(!showAllDistricts)}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {showAllDistricts
                ? t('common.showLess', { defaultValue: 'Show Less' })
                : t('common.showMoreCount', { count: analytics.districtBreakdown.length, defaultValue: `Show All (${analytics.districtBreakdown.length} Districts)` })}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Key Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('intelligence.keyInsights', { defaultValue: 'Key Insights' })}</Text>

        <View style={styles.insightCard}>
          <Ionicons name="trophy" size={18} color="#FFD700" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>{t('intelligence.biggestVictory', { defaultValue: 'Biggest Victory' })}</Text>
            <Text style={styles.insightValue}>
              {analytics.biggestAC && analytics.biggestMargin != null
                ? `${analytics.biggestAC} — margin of ${analytics.biggestMargin.toLocaleString()} votes`
                : 'Margin data unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="flash" size={18} color="#EF4444" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>{t('intelligence.closestContest', { defaultValue: 'Closest Contest' })}</Text>
            <Text style={styles.insightValue}>
              {analytics.closestAC && analytics.closestMargin != null
                ? `${analytics.closestAC} — margin of ${analytics.closestMargin.toLocaleString()} votes`
                : 'Margin data unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="pie-chart" size={18} color="#8B5CF6" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>{IS_LIVE_ENVIRONMENT ? t('intelligence.largestRecordedParty', { defaultValue: 'Largest recorded party' }) : t('intelligence.majorityParty', { defaultValue: 'Majority Party' })}</Text>
            <Text style={styles.insightValue}>
              {analytics.partyBreakdown[0]
                ? IS_LIVE_ENVIRONMENT
                  ? `${analytics.partyBreakdown[0].party} appears in ${analytics.partyBreakdown[0].seats} recorded constituencies (${analytics.partyBreakdown[0].pct}% of party-known records)`
                  : `${analytics.partyBreakdown[0].party} with ${analytics.partyBreakdown[0].seats} seats (${analytics.partyBreakdown[0].pct}%)`
                : 'Party data unavailable'}
            </Text>
          </View>
        </View>
      </View>

      {/* Election History Timeline */}
      {hasFull && (() => {
        const stateHistory = getElectionHistoryForState(stateCode);
        if (stateHistory.length === 0) return null;
        return <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('intelligence.electionTimeline', { defaultValue: 'Election Timeline' })}</Text>
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
          <Text style={styles.sectionTitle}>{t('intelligence.defectionTracker', { defaultValue: 'Defection Tracker' })}</Text>
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
          {IS_LIVE_ENVIRONMENT
            ? t('intelligence.liveSource', { defaultValue: 'Source: Poligram constituency database' })
            : `Data: ${currentState?.name ?? stateCode} State Election Commission`}
        </Text>
      </View>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="intelligence"
      />
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
  liveDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  liveDataNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
