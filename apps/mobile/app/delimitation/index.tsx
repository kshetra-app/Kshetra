import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDelimitationStore } from '../../stores/delimitation';
import DelimitationTimeline from '../../components/DelimitationTimeline';
import SeatProjectionCard from '../../components/SeatProjectionCard';
import { computeAllSeatAllocations, getGainersAndLosers } from '../../lib/delimitation/seatCalculator';
import {
  DELIMITATION_STATUS_CONFIG,
  type SeatAllocation,
  type DelimitationEvent,
  type SeatCalculationModel,
} from '../../lib/delimitationTypes';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

type TabKey = 'overview' | 'projections' | 'timeline' | 'impact';
const TABS: { key: TabKey; i18nKey: string; icon: string }[] = [
  { key: 'overview', i18nKey: 'delimitation.overview', icon: 'home' },
  { key: 'projections', i18nKey: 'delimitation.projections', icon: 'bar-chart' },
  { key: 'timeline', i18nKey: 'delimitation.timeline', icon: 'time' },
  { key: 'impact', i18nKey: 'delimitation.impact', icon: 'flash' },
];

export default function DelimitationHub() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [helpVisible, setHelpVisible] = useState(false);

  const {
    nationalStatus,
    statusAvailable,
    statusLabel,
    statusDescription,
    events,
    timelineAvailable,
    isLoadingEvents,
    refreshOfficialData,
    setSeatAllocations,
    seatAllocations,
    selectedModel,
    setSelectedModel,
  } = useDelimitationStore();

  useFocusEffect(
    useCallback(() => {
      void refreshOfficialData();
    }, [refreshOfficialData]),
  );

  // Compute seat allocations whenever model changes
  useEffect(() => {
    const allocs = computeAllSeatAllocations(undefined, true, selectedModel);
    setSeatAllocations(allocs);
  }, [selectedModel, setSeatAllocations]);

  const statusConfig = nationalStatus
    ? DELIMITATION_STATUS_CONFIG[nationalStatus]
    : { label: t('common.dataUnavailable'), color: colors.textMuted, icon: 'help-circle-outline' };

  const { gainers, losers, summary } = useMemo(
    () => getGainersAndLosers(seatAllocations.length > 0 ? seatAllocations : undefined),
    [seatAllocations],
  );

  const verifiedCount = useMemo(() => events.filter((e) => e.isVerified).length, [events]);
  const timelineEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  const renderModelToggle = () => (
    <View style={[styles.modelToggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.modelToggleHeader}>
        <Ionicons name="calculator-outline" size={16} color={colors.primary} />
        <Text style={[styles.modelToggleTitle, { color: colors.text }]}>{t('delimitationExtended.scenarioModelTitle')}</Text>
      </View>
      <View style={styles.modelButtonsRow}>
        <Pressable
          style={[
            styles.modelBtn,
            {
              backgroundColor: selectedModel === 'EXPANSION_SAFE' ? colors.primary : colors.surfaceElevated,
              borderColor: selectedModel === 'EXPANSION_SAFE' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedModel('EXPANSION_SAFE')}
        >
          <Text style={[styles.modelBtnText, { color: selectedModel === 'EXPANSION_SAFE' ? '#FFFFFF' : colors.text }]}>
            {t('delimitationExtended.scenarioNoLossLabel')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modelBtn,
            {
              backgroundColor: selectedModel === 'PROPORTIONAL' ? colors.primary : colors.surfaceElevated,
              borderColor: selectedModel === 'PROPORTIONAL' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedModel('PROPORTIONAL')}
        >
          <Text style={[styles.modelBtnText, { color: selectedModel === 'PROPORTIONAL' ? '#FFFFFF' : colors.text }]}>
            {t('delimitationExtended.scenarioPopulationLabel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderScenarioDisclosure = () => (
    <View style={[styles.modelDisclosure, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
      <Ionicons name="information-circle" size={20} color="#C2410C" />
      <View style={styles.modelDisclosureText}>
        <Text style={styles.modelDisclosureTitle}>
          {t('delimitationExtended.scenarioNoticeTitle')}
        </Text>
        <Text style={styles.modelDisclosureBody}>
          {t('delimitationExtended.scenarioNoticeBody')}
        </Text>
      </View>
    </View>
  );

  const renderOverview = () => (
    <View>
      {/* Status card */}
      <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statusHeader}>
          <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{t('delimitation.overview')}</Text>
            <Text style={[styles.statusValue, { color: statusConfig.color }]}>
              {statusAvailable && statusLabel ? statusLabel : t('common.dataUnavailable')}
            </Text>
          </View>
        </View>
        <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
          {statusAvailable && statusDescription ? statusDescription : t('common.dataUnavailable')}
        </Text>
      </View>

      {/* Model Selector */}
      {renderModelToggle()}
      {renderScenarioDisclosure()}

      {/* Citizen Personal Impact Banner (Clickable) */}
      <Pressable
        style={[styles.impactCta, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}
        onPress={() => router.push('/delimitation/my-impact')}
      >
        <Ionicons name="location" size={22} color="#3B82F6" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.impactCtaTitle, { color: '#2563EB' }]}>{t('delimitation.whatChangesForYou', { defaultValue: 'What Changes For You?' })}</Text>
          <Text style={[styles.impactCtaSub, { color: colors.textSecondary }]}>
            {t('delimitation.enterPinDesc', { defaultValue: 'Enter your PIN code to see how boundary redraws, MLA shifts, and reservation affect your vote.' })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
      </Pressable>

      {/* Simulator CTA */}
      <Pressable
        style={[styles.simCta, { backgroundColor: colors.primary, borderColor: colors.primary }]}
        onPress={() => router.push('/delimitation/simulator')}
      >
        <Ionicons name="flask" size={20} color="#FFFFFF" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.simCtaTitle, { color: '#FFFFFF' }]}>{t('delimitationExtended.interactiveSimulator')}</Text>
          <Text style={[styles.simCtaSub, { color: '#FBE8E7' }]}>{t('delimitationExtended.simulatorSub')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>

      {/* Quick stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="bar-chart" size={20} color="#4F8EF7" />
          <Text style={[styles.statValue, { color: colors.text }]}>{seatAllocations.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('delimitation.projections')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {timelineAvailable ? events.length : t('common.dataUnavailable')}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('delimitationExtended.timelineEvents')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {timelineAvailable ? verifiedCount : t('common.dataUnavailable')}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('delimitationExtended.verifiedEvents')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="trending-up" size={20} color="#EF4444" />
          <Text style={[styles.statValue, { color: colors.text }]}>{summary.totalGained}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('delimitationExtended.seatsToGain')}</Text>
        </View>
      </View>

      {/* Biggest gainers/losers */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.gainers')}</Text>
      {gainers.slice(0, 3).map((a) => (
        <SeatProjectionCard
          key={a.stateCode}
          allocation={a}
          compact
          onPress={(code) => router.push(`/delimitation/state/${code}` as any)}
        />
      ))}

      {losers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.losers')}</Text>
          {losers.slice(0, 3).map((a) => (
            <SeatProjectionCard
              key={a.stateCode}
              allocation={a}
              compact
              onPress={(code) => router.push(`/delimitation/state/${code}` as any)}
            />
          ))}
        </>
      )}

      {/* Recent timeline */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitationExtended.recentEvents')}</Text>
      {timelineEvents.length > 0 ? (
        <DelimitationTimeline events={timelineEvents} maxItems={5} compact />
      ) : isLoadingEvents ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{t('common.dataUnavailable')}</Text>
      )}

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
        <Ionicons name="information-circle" size={14} color="#F59E0B" />
        <Text style={styles.disclaimerText}>
          {t('delimitationExtended.scenarioNoticeBody')}
        </Text>
      </View>
    </View>
  );

  const renderProjections = () => (
    <View>
      {renderModelToggle()}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('delimitationExtended.scenarioModelTitle')}
      </Text>
      {renderScenarioDisclosure()}

      {/* Summary */}
      <View style={styles.projSummary}>
        <View style={[styles.projSumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-up" size={16} color="#10B981" />
          <Text style={[styles.projSumValue, { color: '#10B981' }]}>+{summary.totalGained}</Text>
          <Text style={[styles.projSumLabel, { color: colors.textMuted }]}>{t('delimitation.gainers')}</Text>
        </View>
        <View style={[styles.projSumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-down" size={16} color="#EF4444" />
          <Text style={[styles.projSumValue, { color: '#EF4444' }]}>{summary.totalLost}</Text>
          <Text style={[styles.projSumLabel, { color: colors.textMuted }]}>{t('delimitation.losers')}</Text>
        </View>
      </View>

      {/* Gainers */}
      <Text style={[styles.subHeading, { color: colors.text }]}>
        <Ionicons name="trending-up" size={14} color="#10B981" /> {t('delimitationExtended.statesGainingSeats')}
      </Text>
      {gainers.map((a) => (
        <SeatProjectionCard
          key={a.stateCode}
          allocation={a}
          onPress={(code) => router.push(`/delimitation/state/${code}` as any)}
        />
      ))}

      {/* Losers */}
      {losers.length > 0 && (
        <>
          <Text style={[styles.subHeading, { color: colors.text }]}>
            <Ionicons name="trending-down" size={14} color="#EF4444" /> {t('delimitationExtended.statesLosingSeats')}
          </Text>
          {losers.map((a) => (
            <SeatProjectionCard
              key={a.stateCode}
              allocation={a}
              onPress={(code) => router.push(`/delimitation/state/${code}` as any)}
            />
          ))}
        </>
      )}
    </View>
  );

  const renderTimeline = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.timeline')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        {t('delimitation.timelineSubtitle', { defaultValue: 'Constitutional milestones, commission orders, and public consultations.' })}
      </Text>
      {timelineEvents.length > 0 ? (
        <DelimitationTimeline events={timelineEvents} />
      ) : isLoadingEvents ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{t('common.dataUnavailable')}</Text>
      )}
    </View>
  );

  const renderImpact = () => (
    <View>
      <Pressable
        style={[styles.impactCta, { backgroundColor: '#3B82F615', borderColor: '#3B82F640', marginBottom: 16 }]}
        onPress={() => router.push('/delimitation/my-impact')}
      >
        <Ionicons name="search" size={22} color="#3B82F6" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.impactCtaTitle, { color: '#2563EB' }]}>
            {t('delimitation.lookupCitizenImpact', { defaultValue: 'Lookup Citizen Delimitation Impact' })}
          </Text>
          <Text style={[styles.impactCtaSub, { color: colors.textSecondary }]}>
            {t('delimitationExtended.verifiedImpactUnavailableTitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
      </Pressable>

      <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.impactHeader}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.impactTitle, { color: colors.text }]}>
            {t('delimitationExtended.verifiedImpactUnavailableTitle')}
          </Text>
        </View>
        <Text style={[styles.impactBody, { color: colors.textSecondary }]}>
          {t('delimitationExtended.verifiedImpactUnavailableBody')}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.timelineLink, { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('timeline')}
        >
          <Ionicons name="time" size={16} color="#FFFFFF" />
          <Text style={styles.timelineLinkText}>{t('delimitation.timeline')}</Text>
        </Pressable>
      </View>

      {/* Constitutional Basis */}
      <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.impactHeader}>
          <Ionicons name="book" size={20} color={colors.primary} />
          <Text style={[styles.impactTitle, { color: colors.text }]}>{t('delimitation.frameworkTitle', { defaultValue: 'Constitutional Delimitation Framework' })}</Text>
        </View>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          {t('delimitation.art82Desc')}
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          {t('delimitation.art170_2Desc')}
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          {t('delimitation.art330_332Desc')}
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          {t('delimitation.delimActSec9Desc')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerMainRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {t('delimitation.hubTitle')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">
              {t('delimitationExtended.headerSubtitle')}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
            style={[styles.backBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => setHelpVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.headerStatusRow}>
          <View style={[styles.liveBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.liveDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.liveText, { color: statusConfig.color }]} numberOfLines={1}>
              {statusAvailable && statusLabel ? statusLabel : t('common.dataUnavailable')}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {t(tab.i18nKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'projections' && renderProjections()}
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'impact' && renderImpact()}
      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="delimitation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerStatusRow: {
    marginTop: 7,
    marginLeft: 46,
    alignItems: 'flex-start',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: '800' },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, borderRadius: 8, gap: 4,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: '#FFFFFF', fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Model Toggle
  modelToggleCard: {
    borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12,
  },
  modelToggleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  modelToggleTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  modelButtonsRow: { flexDirection: 'row', gap: 8 },
  modelBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center',
  },
  modelBtnText: { fontSize: 11, fontWeight: '700' },
  modelExplainText: { fontSize: 11, marginTop: 8, lineHeight: 15 },
  modelDisclosure: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  modelDisclosureText: { flex: 1, minWidth: 0 },
  modelDisclosureTitle: { color: '#9A3412', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  modelDisclosureBody: { color: '#7C2D12', fontSize: 11, lineHeight: 16 },

  // Citizen Impact CTA
  impactCta: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, borderWidth: 1, marginBottom: 12,
  },
  impactCtaTitle: { fontSize: 14, fontWeight: '800' },
  impactCtaSub: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  // Simulator CTA
  simCta: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, borderWidth: 1, marginBottom: 16,
  },
  simCtaTitle: { fontSize: 14, fontWeight: '800' },
  simCtaSub: { fontSize: 11, marginTop: 1 },

  // Status card
  statusCard: {
    borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusValue: { fontSize: 17, fontWeight: '800', marginTop: 1 },
  statusDesc: { fontSize: 12, marginTop: 10, lineHeight: 17 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  statCard: {
    width: '48%', borderRadius: 10, padding: 12, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  subHeading: { fontSize: 14, fontWeight: '800', marginTop: 12, marginBottom: 8 },

  // Projections summary
  projSummary: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  projSumCard: {
    flex: 1, borderRadius: 10, padding: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  projSumValue: { fontSize: 18, fontWeight: '900' },
  projSumLabel: { fontSize: 12, fontWeight: '600' },

  // State Picker
  statePickerScroll: { marginBottom: 14 },
  statePickerContent: { gap: 8 },
  stateChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  stateChipText: { fontSize: 12, fontWeight: '700' },

  // Impact Card
  impactCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  impactTitle: { fontSize: 15, fontWeight: '800' },
  impactBody: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  timelineLink: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  timelineLinkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  impactStatsRow: { flexDirection: 'row', gap: 10 },
  impactStat: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  impactStatValue: { fontSize: 15, fontWeight: '800' },
  impactStatLabel: { fontSize: 11, marginTop: 2 },

  // MLA Risk
  riskCounterRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  riskPill: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  riskPillNumber: { fontSize: 16, fontWeight: '900' },
  riskPillLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  mlaListTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  mlaCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  mlaHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  mlaName: { fontSize: 14, fontWeight: '800' },
  mlaSeat: { fontSize: 11, marginTop: 1 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingBadgeText: { fontSize: 10, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagBadgeText: { fontSize: 9, fontWeight: '800' },
  marginText: { fontSize: 10, marginLeft: 'auto' },
  mlaDetailBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  mlaDetailText: { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  factorItem: { fontSize: 11, lineHeight: 16 },

  // Party Projections Table
  partyTable: { marginTop: 4 },
  partyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1,
  },
  partyName: { fontSize: 14, fontWeight: '800' },
  partyShare: { fontSize: 11, marginTop: 2 },
  partySeats: { fontSize: 14, fontWeight: '800' },
  partyChange: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  featureItem: { fontSize: 12, lineHeight: 19, marginTop: 4 },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', borderRadius: 10, padding: 10,
    marginTop: 16, gap: 6, borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
