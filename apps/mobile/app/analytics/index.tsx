import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Share,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  analyzeState,
  compareStates,
  type StateAnalytics,
  type PartyStrength,
  type DistrictHeatmap,
  type SwingSeat,
} from '../../lib/analytics/electionAnalytics';

const STATES = ['TS', 'AP', 'KA', 'MH'] as const;
const STATE_NAMES: Record<string, string> = { TS: 'Telangana', AP: 'Andhra Pradesh', KA: 'Karnataka', MH: 'Maharashtra' };
type TabKey = 'overview' | 'parties' | 'districts' | 'swing';

const TAB_KEYS: { key: TabKey; tKey: string; icon: string }[] = [
  { key: 'overview', tKey: 'analytics.tabs.overview', icon: 'stats-chart' },
  { key: 'parties', tKey: 'analytics.tabs.parties', icon: 'people' },
  { key: 'districts', tKey: 'analytics.tabs.heatmap', icon: 'map' },
  { key: 'swing', tKey: 'analytics.tabs.swingSeats', icon: 'swap-horizontal' },
];

const PARTY_COLORS: Record<string, string> = {
  INC: '#19AAED', BJP: '#FF9933', BRS: '#E91E7A', TDP: '#FFED00',
  YSRCP: '#0D47A1', JDS: '#138808', AIMIM: '#008000', AAP: '#0066B3',
  SHSUBT: '#FF6F00', SHS: '#FF6F00', NCP: '#00BCD4', NCPSP: '#004D40',
  JSP: '#E53935', CPI: '#FF0000', CPIM: '#FF0000',
};
const getPartyColor = (p: string) => PARTY_COLORS[p] ?? '#6B7280';

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const [selectedState, setSelectedState] = useState<string>('TS');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const analytics = useMemo(() => analyzeState(selectedState), [selectedState]);
  const national = useMemo(() => compareStates([...STATES]), []);

  const handleShare = useCallback(async () => {
    if (!analytics) return;
    const top3 = analytics.partyStrength.slice(0, 3);
    const text = [
      `KSHETRA ${t('analytics.title')} — ${STATE_NAMES[selectedState]}`,
      `${t('analytics.electionYear')}: ${analytics.electionYear}`,
      `${t('analytics.totalSeats')}: ${analytics.totalSeats}`,
      ``,
      `${t('analytics.partyStrength')}:`,
      ...top3.map((p) => `  ${p.party}: ${p.seatsWon} ${t('analytics.seatsWon')} (${p.seatPercent}%)`),
      ``,
      `${t('analytics.tabs.swingSeats')}: ${analytics.swingSeats.length}`,
      ``,
      `${t('analytics.keyInsights')}:`,
      ...analytics.insights.map((i) => `  • ${i}`),
      ``,
      `Powered by KSHETRA`,
    ].join('\n');
    await Share.share({ message: text });
  }, [analytics, selectedState]);

  if (!analytics) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No data for {selectedState}</Text>
        </View>
      </View>
    );
  }

  // ─── OVERVIEW TAB ───
  const renderOverview = () => {
    const top = analytics.partyStrength[0];
    const { antiIncumbency, reservation } = analytics;
    return (
      <View>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroState}>{STATE_NAMES[selectedState]}</Text>
          <Text style={styles.heroYear}>{t('analytics.assemblyElection', { year: analytics.electionYear })}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{analytics.totalSeats}</Text>
              <Text style={styles.heroLabel}>{t('analytics.totalSeats')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: getPartyColor(top?.party ?? '') }]}>{top?.party ?? '-'}</Text>
              <Text style={styles.heroLabel}>{t('analytics.ruling')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{analytics.swingSeats.length}</Text>
              <Text style={styles.heroLabel}>{t('analytics.tabs.swingSeats')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{antiIncumbency.defectionCount}</Text>
              <Text style={styles.heroLabel}>{t('analytics.defections')}</Text>
            </View>
          </View>
        </View>

        {/* Party Bar */}
        <Text style={styles.sectionTitle}>{t('analytics.seatDistribution')}</Text>
        <View style={styles.partyBar}>
          {analytics.partyStrength.map((p) => (
            <View key={p.party} style={[styles.partySegment, { flex: p.seatsWon, backgroundColor: getPartyColor(p.party) }]} />
          ))}
        </View>
        <View style={styles.partyLegend}>
          {analytics.partyStrength.slice(0, 5).map((p) => (
            <View key={p.party} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getPartyColor(p.party) }]} />
              <Text style={styles.legendText}>{p.party} {p.seatsWon}</Text>
            </View>
          ))}
        </View>

        {/* Reservation */}
        <Text style={styles.sectionTitle}>{t('analytics.reservation')}</Text>
        <View style={styles.resRow}>
          <View style={[styles.resBox, { borderLeftColor: '#3B82F6' }]}>
            <Text style={styles.resValue}>{reservation.gen.count}</Text>
            <Text style={styles.resLabel}>{t('explore.gen')}</Text>
          </View>
          <View style={[styles.resBox, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.resValue}>{reservation.sc.count}</Text>
            <Text style={styles.resLabel}>{t('explore.sc')}</Text>
          </View>
          <View style={[styles.resBox, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.resValue}>{reservation.st.count}</Text>
            <Text style={styles.resLabel}>{t('explore.st')}</Text>
          </View>
        </View>

        {/* Insights */}
        <Text style={styles.sectionTitle}>{t('analytics.keyInsights')}</Text>
        {analytics.insights.map((insight, i) => (
          <View key={i} style={styles.insightCard}>
            <Ionicons name="bulb" size={14} color="#F59E0B" />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}

        {/* Cross-State */}
        <Text style={styles.sectionTitle}>{t('analytics.crossStateComparison')}</Text>
        {national.states.map((s) => (
          <Pressable
            key={s.stateCode}
            style={[styles.compareRow, s.stateCode === selectedState && styles.compareRowActive]}
            onPress={() => setSelectedState(s.stateCode)}
          >
            <Text style={styles.compareName}>{STATE_NAMES[s.stateCode]}</Text>
            <Text style={[styles.compareParty, { color: getPartyColor(s.topParty) }]}>{s.topParty}</Text>
            <Text style={styles.compareSeats}>{s.topPartySeats}/{s.totalSeats}</Text>
            <View style={styles.compIdx}>
              <Text style={styles.compIdxText}>{s.competitiveIndex}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  // ─── PARTIES TAB ───
  const renderParties = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('analytics.partyStrength')}</Text>
      {analytics.partyStrength.map((p) => (
        <View key={p.party} style={styles.partyCard}>
          <View style={styles.partyHeader}>
            <View style={[styles.partyDot, { backgroundColor: getPartyColor(p.party) }]} />
            <Text style={styles.partyName}>{p.party}</Text>
            <Text style={styles.partySeatCount}>{p.seatsWon} {t('analytics.seatsWon')} ({p.seatPercent}%)</Text>
          </View>
          {/* Seat bar */}
          <View style={styles.seatBar}>
            <View style={[styles.seatSafe, { flex: p.safeSeats || 0.01 }]} />
            <View style={[styles.seatComfortable, { flex: p.comfortableSeats || 0.01 }]} />
            <View style={[styles.seatMarginal, { flex: p.marginalSeats || 0.01 }]} />
          </View>
          <View style={styles.seatLegend}>
            <Text style={styles.seatLegendItem}>{t('analytics.safe')}: {p.safeSeats}</Text>
            <Text style={styles.seatLegendItem}>{t('analytics.comfortable')}: {p.comfortableSeats}</Text>
            <Text style={styles.seatLegendItem}>{t('analytics.marginal')}: {p.marginalSeats}</Text>
          </View>
          <View style={styles.partyStats}>
            <View style={styles.pStat}>
              <Text style={styles.pStatValue}>{(p.avgMargin / 1000).toFixed(1)}K</Text>
              <Text style={styles.pStatLabel}>{t('analytics.averageMargin')}</Text>
            </View>
            <View style={styles.pStat}>
              <Text style={styles.pStatValue}>{(p.medianMargin / 1000).toFixed(1)}K</Text>
              <Text style={styles.pStatLabel}>{t('analytics.median')}</Text>
            </View>
            <View style={styles.pStat}>
              <Text style={[styles.pStatValue, { color: '#EF4444' }]}>{p.closeSeats}</Text>
              <Text style={styles.pStatLabel}>{'Close (<5K)'}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // ─── DISTRICTS TAB ───
  const renderDistricts = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('analytics.districtHeatmap')}</Text>
      <Text style={styles.sectionSub}>{t('analytics.competitiveIndexDesc')}</Text>
      {analytics.districtHeatmap.map((d) => (
        <View key={d.districtName} style={styles.distCard}>
          <View style={styles.distHeader}>
            <Text style={styles.distName}>{d.districtName}</Text>
            <View style={[styles.compBadge, {
              backgroundColor: d.competitiveIndex >= 60 ? '#10B98120' : d.competitiveIndex >= 30 ? '#F59E0B20' : '#EF444420'
            }]}>
              <Text style={[styles.compBadgeText, {
                color: d.competitiveIndex >= 60 ? '#10B981' : d.competitiveIndex >= 30 ? '#F59E0B' : '#EF4444'
              }]}>{d.competitiveIndex}</Text>
            </View>
          </View>
          <Text style={styles.distMeta}>{d.totalSeats} {t('analytics.seatsWon')} · {t('analytics.dominant')}: {d.dominantParty} ({d.dominancePercent}%)</Text>
          <View style={styles.distBar}>
            {d.partyBreakdown.map((pb) => (
              <View key={pb.party} style={[styles.distSeg, { flex: pb.seats, backgroundColor: getPartyColor(pb.party) }]} />
            ))}
          </View>
          <View style={styles.distParties}>
            {d.partyBreakdown.slice(0, 4).map((pb) => (
              <Text key={pb.party} style={styles.distPartyText}>
                <Text style={{ color: getPartyColor(pb.party) }}>{pb.party}</Text> {pb.seats}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  // ─── SWING TAB ───
  const renderSwing = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('analytics.swingSeatsTitle')}</Text>
      <Text style={styles.sectionSub}>{t('analytics.seatsCouldFlip', { count: analytics.swingSeats.length })}</Text>

      {analytics.swingSeats.map((s) => (
        <View key={s.acNo} style={styles.swingCard}>
          <View style={styles.swingHeader}>
            <Text style={styles.swingName}>AC {s.acNo}: {s.name}</Text>
            <Text style={styles.swingMargin}>{(s.margin / 1000).toFixed(1)}K</Text>
          </View>
          <Text style={styles.swingMeta}>{s.district} · {s.type}</Text>
          <View style={styles.swingParties}>
            <Text style={[styles.swingParty, { color: getPartyColor(s.winnerParty) }]}>{s.winnerParty}</Text>
            <Text style={styles.swingVs}>vs</Text>
            <Text style={[styles.swingParty, { color: getPartyColor(s.runnerUp) }]}>{s.runnerUp}</Text>
          </View>
        </View>
      ))}

      {/* Anti-incumbency */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('analytics.antiIncumbencyIndicators')}</Text>
      <View style={styles.aiCard}>
        <View style={styles.aiRow}>
          <Text style={styles.aiLabel}>{t('analytics.defectionRate')}</Text>
          <Text style={styles.aiValue}>{analytics.antiIncumbency.defectionRate}%</Text>
        </View>
        <View style={styles.aiRow}>
          <Text style={styles.aiLabel}>{t('analytics.defections')}</Text>
          <Text style={styles.aiValue}>{analytics.antiIncumbency.defectionCount}</Text>
        </View>
        <View style={styles.aiRow}>
          <Text style={styles.aiLabel}>{t('analytics.vulnerableSeats')}</Text>
          <Text style={styles.aiValue}>{analytics.antiIncumbency.vulnerableSeats.length}</Text>
        </View>
      </View>

      {analytics.antiIncumbency.defectionCount > 0 && (
        <>
          <Text style={styles.subHeading}>{t('analytics.defectionFlow')}</Text>
          {Object.entries(analytics.antiIncumbency.defectedFrom).map(([party, count]) => (
            <View key={party} style={styles.defRow}>
              <Text style={[styles.defParty, { color: getPartyColor(party) }]}>{party}</Text>
              <Text style={styles.defArrow}>lost {count} →</Text>
              {Object.entries(analytics.antiIncumbency.defectedTo).map(([to, c]) => (
                <Text key={to} style={[styles.defParty, { color: getPartyColor(to) }]}>{to} (+{c})</Text>
              ))}
            </View>
          ))}
        </>
      )}

      {/* Closest contests */}
      <Text style={styles.subHeading}>{t('analytics.closestContestsTop10')}</Text>
      {analytics.antiIncumbency.closestContests.map((c) => (
        <View key={c.acNo} style={styles.closeRow}>
          <Text style={styles.closeName}>{c.name}</Text>
          <Text style={[styles.closeParty, { color: getPartyColor(c.winnerParty) }]}>{c.winnerParty}</Text>
          <Text style={styles.closeMargin}>{(c.margin / 1000).toFixed(1)}K ({c.marginPercent}%)</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, isSmallScreen && { paddingTop: 4, paddingBottom: 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={isSmallScreen ? 20 : 22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isSmallScreen && { fontSize: 16 }]}>{t('analytics.title')}</Text>
          <Text style={styles.headerSub}>{t('analytics.crossStateIntelligence')}</Text>
        </View>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color="#4F8EF7" />
        </Pressable>
      </View>

      {/* State Picker */}
      <View style={[styles.statePicker, isSmallScreen && { marginBottom: 2 }]}>
        {STATES.map((code) => (
          <Pressable
            key={code}
            style={[styles.stateChip, isSmallScreen && { paddingVertical: 6 }, selectedState === code && styles.stateChipActive]}
            onPress={() => setSelectedState(code)}
          >
            <Text style={[styles.stateChipText, isSmallScreen && { fontSize: 12 }, selectedState === code && styles.stateChipTextActive]}>{code}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, isSmallScreen && { marginBottom: 2 }]}>
        {TAB_KEYS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, isSmallScreen && { paddingVertical: 6 }, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={isSmallScreen ? 12 : 14} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, isSmallScreen && { fontSize: 10 }, activeTab === tab.key && styles.tabLabelActive]}>{t(tab.tKey)}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'parties' && renderParties()}
        {activeTab === 'districts' && renderDistricts()}
        {activeTab === 'swing' && renderSwing()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A', overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  shareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F8EF715', alignItems: 'center', justifyContent: 'center' },

  statePicker: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 4 },
  stateChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  stateChipActive: { backgroundColor: '#4F8EF720', borderWidth: 1, borderColor: '#4F8EF7' },
  stateChipText: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
  stateChipTextActive: { color: '#4F8EF7' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 4 },
  tabActive: { backgroundColor: '#4F8EF715' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#4F8EF7', fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  sectionSub: { fontSize: 11, color: '#6B7280', marginBottom: 8, fontWeight: '600' },
  subHeading: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 14, marginBottom: 6 },

  // Hero
  heroCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16 },
  heroState: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  heroYear: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  heroStats: { flexDirection: 'row', marginTop: 12, gap: 8 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  heroLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 },

  // Party bar
  partyBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  partySegment: { height: 8 },
  partyLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  // Reservation
  resRow: { flexDirection: 'row', gap: 6 },
  resBox: { flex: 1, backgroundColor: '#111827', borderRadius: 8, padding: 10, alignItems: 'center', borderLeftWidth: 3 },
  resValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  resLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 },

  // Insights
  insightCard: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 4, gap: 8 },
  insightText: { flex: 1, fontSize: 12, color: '#D1D5DB', lineHeight: 17 },

  // Compare
  compareRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 4, gap: 8 },
  compareRowActive: { borderWidth: 1, borderColor: '#4F8EF7' },
  compareName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  compareParty: { fontSize: 13, fontWeight: '800' },
  compareSeats: { fontSize: 12, color: '#6B7280', fontWeight: '600', width: 50, textAlign: 'right' },
  compIdx: { backgroundColor: '#1F2937', borderRadius: 6, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  compIdxText: { fontSize: 11, fontWeight: '800', color: '#4F8EF7' },

  // Party card
  partyCard: { backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 6 },
  partyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partyDot: { width: 10, height: 10, borderRadius: 5 },
  partyName: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  partySeatCount: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 'auto' },
  seatBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  seatSafe: { height: 6, backgroundColor: '#10B981' },
  seatComfortable: { height: 6, backgroundColor: '#F59E0B' },
  seatMarginal: { height: 6, backgroundColor: '#EF4444' },
  seatLegend: { flexDirection: 'row', gap: 10, marginTop: 4 },
  seatLegendItem: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  partyStats: { flexDirection: 'row', marginTop: 8, gap: 8 },
  pStat: { flex: 1, alignItems: 'center' },
  pStatValue: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  pStatLabel: { fontSize: 9, fontWeight: '600', color: '#6B7280', marginTop: 1 },

  // District
  distCard: { backgroundColor: '#111827', borderRadius: 10, padding: 10, marginBottom: 4 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distName: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  compBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  compBadgeText: { fontSize: 11, fontWeight: '900' },
  distMeta: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  distBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  distSeg: { height: 5 },
  distParties: { flexDirection: 'row', gap: 8, marginTop: 4 },
  distPartyText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },

  // Swing
  swingCard: { backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 4 },
  swingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  swingName: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  swingMargin: { fontSize: 13, fontWeight: '900', color: '#EF4444' },
  swingMeta: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  swingParties: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  swingParty: { fontSize: 13, fontWeight: '800' },
  swingVs: { fontSize: 10, color: '#6B7280' },

  // Anti-incumbency
  aiCard: { backgroundColor: '#111827', borderRadius: 10, padding: 12 },
  aiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  aiLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  aiValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  defParty: { fontSize: 12, fontWeight: '800' },
  defArrow: { fontSize: 11, color: '#6B7280' },

  // Closest
  closeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 6, padding: 8, marginBottom: 3, gap: 6 },
  closeName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  closeParty: { fontSize: 12, fontWeight: '800' },
  closeMargin: { fontSize: 11, color: '#EF4444', fontWeight: '700', width: 80, textAlign: 'right' },
});
