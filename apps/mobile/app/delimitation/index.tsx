import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDelimitationStore } from '../../stores/delimitation';
import DelimitationTimeline from '../../components/DelimitationTimeline';
import SeatProjectionCard from '../../components/SeatProjectionCard';
import { computeAllSeatAllocations, getGainersAndLosers } from '../../lib/delimitation/seatCalculator';
import { DELIMITATION_STATUS_CONFIG } from '../../lib/delimitationTypes';
import type { SeatAllocation, DelimitationEvent } from '../../lib/delimitationTypes';

type TabKey = 'overview' | 'projections' | 'timeline' | 'impact';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'projections', label: 'Projections', icon: 'bar-chart' },
  { key: 'timeline', label: 'Timeline', icon: 'time' },
  { key: 'impact', label: 'Impact', icon: 'flash' },
];

export default function DelimitationHub() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { nationalStatus, events, setSeatAllocations, seatAllocations } = useDelimitationStore();

  // Compute seat projections on mount
  useEffect(() => {
    if (seatAllocations.length === 0) {
      const allocs = computeAllSeatAllocations();
      setSeatAllocations(allocs);
    }
  }, []);

  const statusConfig = DELIMITATION_STATUS_CONFIG[nationalStatus];
  const { gainers, losers, summary } = useMemo(
    () => getGainersAndLosers(seatAllocations.length > 0 ? seatAllocations : undefined),
    [seatAllocations],
  );

  const verifiedCount = useMemo(() => events.filter((e) => e.isVerified).length, [events]);
  const timelineEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  const renderOverview = () => (
    <View>
      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.statusLabel}>National Status</Text>
            <Text style={[styles.statusValue, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.statusDesc}>
          India's next delimitation exercise will redraw all constituency boundaries based on Census 2026 data.
          This will affect every MLA, MP, political party, and voter in the country.
        </Text>
      </View>

      {/* Simulator CTA */}
      <Pressable
        style={styles.simCta}
        onPress={() => router.push('/delimitation/simulator')}
      >
        <Ionicons name="flask" size={20} color="#FFFFFF" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.simCtaTitle}>Interactive Simulator</Text>
          <Text style={styles.simCtaSub}>Adjust seats, compare modes, share results</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4F8EF7" />
      </Pressable>

      {/* Quick stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="bar-chart" size={20} color="#4F8EF7" />
          <Text style={styles.statValue}>{seatAllocations.length}</Text>
          <Text style={styles.statLabel}>States Analyzed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{events.length}</Text>
          <Text style={styles.statLabel}>Timeline Events</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.statValue}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified Events</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={20} color="#EF4444" />
          <Text style={styles.statValue}>{summary.totalGained}</Text>
          <Text style={styles.statLabel}>Seats to Gain*</Text>
        </View>
      </View>

      {/* Biggest gainers/losers */}
      <Text style={styles.sectionTitle}>Biggest Gainers</Text>
      {gainers.slice(0, 3).map((a) => (
        <SeatProjectionCard key={a.stateCode} allocation={a} compact />
      ))}

      <Text style={styles.sectionTitle}>Smallest Gainers</Text>
      {[...seatAllocations]
        .filter((a) => a.seatChange >= 0)
        .sort((a, b) => a.seatChange - b.seatChange)
        .slice(0, 3)
        .map((a) => (
          <SeatProjectionCard key={a.stateCode} allocation={a} compact />
        ))
      }

      {/* Recent timeline */}
      <Text style={styles.sectionTitle}>Recent Events</Text>
      <DelimitationTimeline events={timelineEvents} maxItems={5} compact />

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={14} color="#F59E0B" />
        <Text style={styles.disclaimerText}>
          *Projections based on Census 2011 data. Actual delimitation will use Census 2026 data
          and may follow different methodology. These are simulations, not predictions.
        </Text>
      </View>
    </View>
  );

  const renderProjections = () => (
    <View>
      <Text style={styles.sectionTitle}>Seat Projections by State</Text>
      <Text style={styles.sectionSubtitle}>
        Based on equal-population principle using Census 2011 data
      </Text>

      {/* Summary */}
      <View style={styles.projSummary}>
        <View style={styles.projSumCard}>
          <Ionicons name="arrow-up" size={16} color="#10B981" />
          <Text style={[styles.projSumValue, { color: '#10B981' }]}>+{summary.totalGained}</Text>
          <Text style={styles.projSumLabel}>Total Gained</Text>
        </View>
        <View style={styles.projSumCard}>
          <Ionicons name="arrow-down" size={16} color="#EF4444" />
          <Text style={[styles.projSumValue, { color: '#EF4444' }]}>{summary.totalLost}</Text>
          <Text style={styles.projSumLabel}>Total Lost</Text>
        </View>
      </View>

      {/* Gainers */}
      <Text style={styles.subHeading}>
        <Ionicons name="trending-up" size={14} color="#10B981" /> States Gaining Seats
      </Text>
      {gainers.map((a) => (
        <SeatProjectionCard key={a.stateCode} allocation={a} />
      ))}

      {/* Losers */}
      <Text style={styles.subHeading}>
        <Ionicons name="trending-down" size={14} color="#EF4444" /> States Losing Seats
      </Text>
      {losers.map((a) => (
        <SeatProjectionCard key={a.stateCode} allocation={a} />
      ))}
    </View>
  );

  const renderTimeline = () => (
    <View>
      <Text style={styles.sectionTitle}>Delimitation Timeline</Text>
      <Text style={styles.sectionSubtitle}>
        Historical events and upcoming milestones
      </Text>
      <DelimitationTimeline events={timelineEvents} />
    </View>
  );

  const renderImpact = () => (
    <View>
      <Text style={styles.sectionTitle}>Political Impact Analysis</Text>
      <Text style={styles.sectionSubtitle}>
        How delimitation affects parties, MLAs, and voters
      </Text>

      {/* The political earthquake */}
      <View style={styles.impactCard}>
        <View style={styles.impactHeader}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.impactTitle}>The North-South Divide</Text>
        </View>
        <Text style={styles.impactBody}>
          Southern states (TN, KA, KL, TS, AP) that invested in family planning and reduced population
          growth will LOSE seats. Northern states (UP, BR, RJ, MP) that didn't will GAIN massively.
          This is the most politically sensitive aspect of delimitation.
        </Text>
        <View style={styles.impactStatsRow}>
          <View style={styles.impactStat}>
            <Text style={[styles.impactStatValue, { color: '#10B981' }]}>North</Text>
            <Text style={styles.impactStatLabel}>Gains 200+ seats</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={[styles.impactStatValue, { color: '#EF4444' }]}>South</Text>
            <Text style={styles.impactStatLabel}>Loses 100+ seats</Text>
          </View>
        </View>
      </View>

      {/* Per-state impact summaries */}
      <Text style={styles.subHeading}>State-Level Impact</Text>
      {[...gainers.slice(0, 3), ...losers.slice(0, 3)].map((a) => {
        const isGain = a.seatChange > 0;
        return (
          <View key={a.stateCode} style={styles.impactRow}>
            <Text style={styles.impactRowState}>{a.stateName}</Text>
            <Text style={[styles.impactRowChange, { color: isGain ? '#10B981' : '#EF4444' }]}>
              {isGain ? '+' : ''}{a.seatChange} seats
            </Text>
            <Text style={styles.impactRowDetail}>
              {a.currentSeats} → {a.projectedSeats}
            </Text>
          </View>
        );
      })}

      {/* What Kshetra provides */}
      <View style={styles.featureCard}>
        <Ionicons name="diamond" size={20} color="#F59E0B" />
        <Text style={styles.featureTitle}>Coming Soon on KSHETRA</Text>
        <Text style={styles.featureItem}>• "What Changes For You" — enter pin code, see impact</Text>
        <Text style={styles.featureItem}>• MLA Risk Calculator — which MLAs lose safe seats</Text>
        <Text style={styles.featureItem}>• Party Seat Projections — new boundaries, new estimates</Text>
        <Text style={styles.featureItem}>• Boundary Overlay — old vs new on interactive map</Text>
        <Text style={styles.featureItem}>• Real-time Gazette Monitor — alerts as proposals publish</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Delimitation Hub</Text>
          <Text style={styles.headerSubtitle}>India's Constituency Redraw Tracker</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <View style={[styles.liveDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.liveText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'projections' && renderProjections()}
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'impact' && renderImpact()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#4F8EF715',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#4F8EF7',
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // ─── Status card ───
  statusCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  // ─── Stats grid ───
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  // ─── Sections ───
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 8,
  },
  // ─── Projections ───
  projSummary: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  projSumCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  projSumValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  projSumLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  // ─── Impact ───
  impactCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  impactBody: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 10,
  },
  impactStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  impactStat: {
    flex: 1,
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  impactStatValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  impactStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  impactRowState: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  impactRowChange: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 10,
  },
  impactRowDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  featureCard: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 8,
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  // ─── Simulator CTA ───
  simCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F8EF720',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F8EF740',
  },
  simCtaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  simCtaSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  // ─── Disclaimer ───
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 15,
  },
});
