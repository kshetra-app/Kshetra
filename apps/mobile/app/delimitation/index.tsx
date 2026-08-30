import { useEffect, useMemo, useState, useCallback } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDelimitationStore } from '../../stores/delimitation';
import { useActiveStateStore } from '../../stores/activeState';
import DelimitationTimeline from '../../components/DelimitationTimeline';
import SeatProjectionCard from '../../components/SeatProjectionCard';
import { computeAllSeatAllocations, getGainersAndLosers } from '../../lib/delimitation/seatCalculator';
import { computeMLARiskProfiles, computeStatePartyProjections } from '../../lib/delimitation/constituencyMapper';
import {
  DELIMITATION_STATUS_CONFIG,
  BOUNDARY_CHANGE_CONFIG,
  IMPACT_SEVERITY_CONFIG,
  type SeatAllocation,
  type DelimitationEvent,
  type SeatCalculationModel,
  type MLARiskProfile,
} from '../../lib/delimitationTypes';
import { useTheme } from '../../lib/theme';

type TabKey = 'overview' | 'projections' | 'timeline' | 'impact';
const TABS: { key: TabKey; i18nKey: string; icon: string }[] = [
  { key: 'overview', i18nKey: 'delimitation.overview', icon: 'home' },
  { key: 'projections', i18nKey: 'delimitation.projections', icon: 'bar-chart' },
  { key: 'timeline', i18nKey: 'delimitation.timeline', icon: 'time' },
  { key: 'impact', i18nKey: 'delimitation.impact', icon: 'flash' },
];

const IMPACT_STATES = [
  { code: 'TS', name: 'Telangana' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'UP', name: 'Uttar Pradesh' },
];

export default function DelimitationHub() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const activeStateCode = useActiveStateStore((s) => s.stateCode);
  const [impactState, setImpactState] = useState<string>(activeStateCode || 'TS');
  const [expandedMlaId, setExpandedMlaId] = useState<number | null>(null);

  const {
    nationalStatus,
    events,
    setSeatAllocations,
    seatAllocations,
    selectedModel,
    setSelectedModel,
  } = useDelimitationStore();

  // Compute seat allocations whenever model changes
  useEffect(() => {
    const allocs = computeAllSeatAllocations(undefined, true, selectedModel);
    setSeatAllocations(allocs);
  }, [selectedModel, setSeatAllocations]);

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

  // Dynamic MLA risk profiles for selected impact state
  const mlaProfiles = useMemo(() => {
    return computeMLARiskProfiles(impactState);
  }, [impactState]);

  // Dynamic party projections for selected impact state
  const partyProjections = useMemo(() => {
    return computeStatePartyProjections(impactState);
  }, [impactState]);

  const mlaSummary = useMemo(() => {
    return {
      total: mlaProfiles.length,
      critical: mlaProfiles.filter((m) => m.riskRating === 'critical_risk').length,
      high: mlaProfiles.filter((m) => m.riskRating === 'high_risk').length,
      moderate: mlaProfiles.filter((m) => m.riskRating === 'moderate_risk').length,
      safe: mlaProfiles.filter((m) => m.riskRating === 'safe').length,
    };
  }, [mlaProfiles]);

  const renderModelToggle = () => (
    <View style={[styles.modelToggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.modelToggleHeader}>
        <Ionicons name="calculator-outline" size={16} color={colors.primary} />
        <Text style={[styles.modelToggleTitle, { color: colors.text }]}>Constitutional Calculation Model</Text>
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
            Expansion-Safe Protection
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
            Proportional (Art. 170)
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.modelExplainText, { color: colors.textSecondary }]}>
        {selectedModel === 'EXPANSION_SAFE'
          ? 'Protects states that implemented successful family planning. No state loses seats; fast-growing states gain.'
          : 'Strict constitutional proportional representation based on Census population. Slower-growth states see seat reductions.'}
      </Text>
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
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
          {t('delimitationExtended.statusDesc')}
        </Text>
      </View>

      {/* Model Selector */}
      {renderModelToggle()}

      {/* Citizen Personal Impact Banner (Clickable) */}
      <Pressable
        style={[styles.impactCta, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}
        onPress={() => router.push('/delimitation/my-impact')}
      >
        <Ionicons name="location" size={22} color="#3B82F6" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.impactCtaTitle, { color: '#2563EB' }]}>What Changes For You?</Text>
          <Text style={[styles.impactCtaSub, { color: colors.textSecondary }]}>
            Enter your PIN code to see how boundary redraws, MLA shifts, and reservation affect your vote.
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
          <Text style={[styles.statValue, { color: colors.text }]}>{events.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('delimitationExtended.timelineEvents')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{verifiedCount}</Text>
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
      <DelimitationTimeline events={timelineEvents} maxItems={5} compact />

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
        <Ionicons name="information-circle" size={14} color="#F59E0B" />
        <Text style={styles.disclaimerText}>
          {t('delimitation.disclaimer')}
        </Text>
      </View>
    </View>
  );

  const renderProjections = () => (
    <View>
      {renderModelToggle()}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.projections')}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        {t('delimitationExtended.projectionsBasis')}
      </Text>

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
        Constitutional milestones, commission orders, and public consultations.
      </Text>
      <DelimitationTimeline events={timelineEvents} />
    </View>
  );

  const renderImpact = () => (
    <View>
      {/* What Changes For You interactive card */}
      <Pressable
        style={[styles.impactCta, { backgroundColor: '#3B82F615', borderColor: '#3B82F640', marginBottom: 16 }]}
        onPress={() => router.push('/delimitation/my-impact')}
      >
        <Ionicons name="search" size={22} color="#3B82F6" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.impactCtaTitle, { color: '#2563EB' }]}>Lookup Citizen Delimitation Impact</Text>
          <Text style={[styles.impactCtaSub, { color: colors.textSecondary }]}>
            Check how your PIN code or home constituency is impacted under proposed boundaries.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
      </Pressable>

      {/* State Switcher for MLA Risk & Party Modeling */}
      <Text style={[styles.subHeading, { color: colors.text }]}>Select State for In-Depth Political Analysis</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statePickerScroll} contentContainerStyle={styles.statePickerContent}>
        {IMPACT_STATES.map((s) => (
          <Pressable
            key={s.code}
            style={[
              styles.stateChip,
              {
                backgroundColor: impactState === s.code ? colors.primary : colors.surface,
                borderColor: impactState === s.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setImpactState(s.code)}
          >
            <Text style={[styles.stateChipText, { color: impactState === s.code ? '#FFFFFF' : colors.text }]}>
              {s.name} ({s.code})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sitting MLA Risk Analyzer */}
      <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.impactHeader}>
          <Ionicons name="shield" size={20} color="#F59E0B" />
          <Text style={[styles.impactTitle, { color: colors.text }]}>
            Sitting MLA Risk Analyzer ({impactState})
          </Text>
        </View>
        <Text style={[styles.impactBody, { color: colors.textSecondary }]}>
          Calculates boundary disruption, reservation displacement, and voter margin buffer for all {mlaSummary.total} sitting legislators.
        </Text>

        <View style={styles.riskCounterRow}>
          <View style={[styles.riskPill, { backgroundColor: '#EF444420' }]}>
            <Text style={[styles.riskPillNumber, { color: '#EF4444' }]}>{mlaSummary.critical}</Text>
            <Text style={[styles.riskPillLabel, { color: '#EF4444' }]}>Critical</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: '#F9731620' }]}>
            <Text style={[styles.riskPillNumber, { color: '#F97316' }]}>{mlaSummary.high}</Text>
            <Text style={[styles.riskPillLabel, { color: '#F97316' }]}>High Risk</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: '#F59E0B20' }]}>
            <Text style={[styles.riskPillNumber, { color: '#F59E0B' }]}>{mlaSummary.moderate}</Text>
            <Text style={[styles.riskPillLabel, { color: '#F59E0B' }]}>Moderate</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: '#10B98120' }]}>
            <Text style={[styles.riskPillNumber, { color: '#10B981' }]}>{mlaSummary.safe}</Text>
            <Text style={[styles.riskPillLabel, { color: '#10B981' }]}>Safe</Text>
          </View>
        </View>

        {/* Top At-Risk MLAs */}
        <Text style={[styles.mlaListTitle, { color: colors.text }]}>High-Displacement Constituencies:</Text>
        {mlaProfiles.slice(0, 5).map((m) => {
          const isExpanded = expandedMlaId === m.currentAcNo;
          const ratingColor = m.riskRating === 'critical_risk' ? '#EF4444' :
            m.riskRating === 'high_risk' ? '#F97316' :
            m.riskRating === 'moderate_risk' ? '#F59E0B' : '#10B981';

          return (
            <Pressable
              key={m.currentAcNo}
              style={[styles.mlaCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => setExpandedMlaId(isExpanded ? null : m.currentAcNo)}
            >
              <View style={styles.mlaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mlaName, { color: colors.text }]}>{m.mlaName} ({m.party})</Text>
                  <Text style={[styles.mlaSeat, { color: colors.textSecondary }]}>
                    AC #{m.currentAcNo} {m.currentAcName} → {m.primaryNewAcName}
                  </Text>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '20' }]}>
                  <Text style={[styles.ratingBadgeText, { color: ratingColor }]}>
                    Score: {m.riskScore}/100
                  </Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.tagBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagBadgeText, { color: colors.primary }]}>
                    {m.seatChangeType.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {m.reservationChange !== 'unchanged' && (
                  <View style={[styles.tagBadge, { backgroundColor: '#EF444420' }]}>
                    <Text style={[styles.tagBadgeText, { color: '#EF4444' }]}>
                      {m.reservationChange.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.marginText, { color: colors.textMuted }]}>
                  Margin: {m.currentMarginPercent}% ({m.currentMarginVotes.toLocaleString()} votes)
                </Text>
              </View>

              {isExpanded && (
                <View style={[styles.mlaDetailBox, { borderTopColor: colors.border }]}>
                  <Text style={[styles.mlaDetailText, { color: colors.text }]}>{m.detailedAnalysis}</Text>
                  {m.riskFactors.map((rf, idx) => (
                    <Text key={idx} style={[styles.factorItem, { color: '#EF4444' }]}>• {rf}</Text>
                  ))}
                  {m.mitigatingFactors.map((mf, idx) => (
                    <Text key={idx} style={[styles.factorItem, { color: '#10B981' }]}>• {mf}</Text>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Party Projections Modeler */}
      {partyProjections && (
        <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.impactHeader}>
            <Ionicons name="pie-chart" size={20} color="#3B82F6" />
            <Text style={[styles.impactTitle, { color: colors.text }]}>
              Party Seat Projections ({partyProjections.stateName})
            </Text>
          </View>
          <Text style={[styles.impactBody, { color: colors.textSecondary }]}>
            {partyProjections.methodologyNotes}
          </Text>

          <View style={styles.partyTable}>
            {partyProjections.parties.slice(0, 4).map((p) => (
              <View key={p.party} style={[styles.partyRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyName, { color: colors.text }]}>{p.party}</Text>
                  <Text style={[styles.partyShare, { color: colors.textMuted }]}>
                    Vote Share: {p.currentVoteSharePercent}% · Safe: {p.safeSeats} · Battleground: {p.battlegroundSeats}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.partySeats, { color: colors.text }]}>
                    {p.currentSeats} → {p.projectedSeats}
                  </Text>
                  <Text style={[styles.partyChange, { color: p.seatChange >= 0 ? '#10B981' : '#EF4444' }]}>
                    {p.seatChange >= 0 ? `+${p.seatChange}` : p.seatChange} seats
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Geopolitical North vs South Analysis */}
      <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.impactHeader}>
          <Ionicons name="earth" size={20} color="#8B5CF6" />
          <Text style={[styles.impactTitle, { color: colors.text }]}>{t('delimitationExtended.northSouthDivide')}</Text>
        </View>
        <Text style={[styles.impactBody, { color: colors.textSecondary }]}>
          {t('delimitationExtended.northSouthBody')}
        </Text>
        <View style={styles.impactStatsRow}>
          <View style={[styles.impactStat, { backgroundColor: '#10B98115' }]}>
            <Text style={[styles.impactStatValue, { color: '#10B981' }]}>{t('delimitationExtended.north')}</Text>
            <Text style={[styles.impactStatLabel, { color: colors.textMuted }]}>{t('delimitationExtended.northGains')}</Text>
          </View>
          <View style={[styles.impactStat, { backgroundColor: '#EF444415' }]}>
            <Text style={[styles.impactStatValue, { color: '#EF4444' }]}>{t('delimitationExtended.south')}</Text>
            <Text style={[styles.impactStatLabel, { color: colors.textMuted }]}>{t('delimitationExtended.southLoses')}</Text>
          </View>
        </View>
      </View>

      {/* Constitutional Basis */}
      <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.impactHeader}>
          <Ionicons name="book" size={20} color={colors.primary} />
          <Text style={[styles.impactTitle, { color: colors.text }]}>Constitutional Delimitation Framework</Text>
        </View>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          • <Text style={{ fontWeight: '700' }}>Article 82</Text>: Readjustment of allocation of seats in the House of the People and division of each State into territorial constituencies.
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          • <Text style={{ fontWeight: '700' }}>Article 170(2)</Text>: Each State assembly divided into territorial constituencies such that population:seats ratio is practically uniform.
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          • <Text style={{ fontWeight: '700' }}>Articles 330 & 332</Text>: Mandatory proportional reservations for Scheduled Castes and Scheduled Tribes.
        </Text>
        <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
          • <Text style={{ fontWeight: '700' }}>Delimitation Act Section 9</Text>: Equal population deviation bound (±10%), physical features, and administrative unit integrity.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('delimitation.hubTitle')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('delimitationExtended.headerSubtitle')}</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <View style={[styles.liveDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.liveText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
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
