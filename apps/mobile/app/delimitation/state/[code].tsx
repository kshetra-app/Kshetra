import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  computeStateSeatAllocation,
  explainSeatCalculation,
} from '../../../lib/delimitation/seatCalculator';
import { quickDistrictAggregation } from '../../../lib/delimitation/populationAggregator';
import { analyzeStateReservation } from '../../../lib/delimitation/reservationAnalyzer';
import {
  computeMLARiskProfiles,
  computeStatePartyProjections,
} from '../../../lib/delimitation/constituencyMapper';
import { getUnifiedConstituenciesForState } from '../../../lib/stateDataAdapter';
import { formatPopulation, type SeatCalculationModel } from '../../../lib/delimitationTypes';
import { useTheme } from '../../../lib/theme';

export default function StateDelimitationDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const stateCode = (code ?? '').toUpperCase();

  const [model, setModel] = useState<SeatCalculationModel>('EXPANSION_SAFE');
  const [showConstituencies, setShowConstituencies] = useState(false);
  const [showMLAs, setShowMLAs] = useState(false);

  const allocation = useMemo(() => computeStateSeatAllocation(stateCode, undefined, model), [stateCode, model]);
  const mathExplanation = useMemo(() => explainSeatCalculation(stateCode, model), [stateCode, model]);
  const districtAgg = useMemo(() => quickDistrictAggregation(stateCode), [stateCode]);
  const reservation = useMemo(() => analyzeStateReservation(stateCode), [stateCode]);
  const mlaProfiles = useMemo(() => computeMLARiskProfiles(stateCode), [stateCode]);
  const partyProjections = useMemo(() => computeStatePartyProjections(stateCode), [stateCode]);
  const constituencies = useMemo(() => getUnifiedConstituenciesForState(stateCode), [stateCode]);

  if (!allocation) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Ionicons name="alert-circle" size={40} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{t('constituency.notFound')}: {stateCode}</Text>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: colors.text }]}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const changeColor = allocation.seatChange > 0 ? '#10B981' : allocation.seatChange < 0 ? '#EF4444' : colors.textMuted;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{allocation.stateName}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('delimitation.stateAnalysisTitle', { defaultValue: 'State Delimitation & Constitutional Analysis' })}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>

        {/* Model Selector */}
        <View style={[styles.modelToggleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.modelToggleTitle, { color: colors.text }]}>{t('delimitation.calcModel', { defaultValue: 'Constitutional Model' })}</Text>
          <View style={styles.modelToggleRow}>
            <Pressable
              style={[
                styles.modelChip,
                {
                  backgroundColor: model === 'EXPANSION_SAFE' ? colors.primary : colors.surfaceElevated,
                  borderColor: model === 'EXPANSION_SAFE' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setModel('EXPANSION_SAFE')}
            >
              <Text style={[styles.modelChipText, { color: model === 'EXPANSION_SAFE' ? '#FFFFFF' : colors.text }]}>{t('delimitation.expansionSafe')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modelChip,
                {
                  backgroundColor: model === 'PROPORTIONAL' ? colors.primary : colors.surfaceElevated,
                  borderColor: model === 'PROPORTIONAL' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setModel('PROPORTIONAL')}
            >
              <Text style={[styles.modelChipText, { color: model === 'PROPORTIONAL' ? '#FFFFFF' : colors.text }]}>{t('delimitation.proportional')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Stats */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: colors.text }]}>{allocation.currentSeats}</Text>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>{t('delimitation.currentSeats')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: changeColor }]}>{allocation.projectedSeats}</Text>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>{t('delimitation.projectedSeats')}</Text>
            </View>
            <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
              <Text style={[styles.changeText, { color: changeColor }]}>
                {allocation.seatChange > 0 ? '+' : ''}{allocation.seatChange}
              </Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>
              Population: {formatPopulation(allocation.totalPopulation)} · {formatPopulation(allocation.populationPerProjectedSeat)}/seat
            </Text>
            <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>
              Constitutional Deviation: {allocation.deviationPercent > 0 ? '+' : ''}{allocation.deviationPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Mathematical Derivation & Reasoning */}
        {mathExplanation && (
          <View style={[styles.section, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="school" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                {t('delimitation.formulaBreakdown', { defaultValue: 'Constitutional Formula Breakdown' })}
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('delimitation.exactDerivation', { article: mathExplanation.constitutionalArticles.assemblyArticle, defaultValue: `Exact mathematical derivation under ${mathExplanation.constitutionalArticles.assemblyArticle}` })}
            </Text>

            <View style={styles.reasoningList}>
              {mathExplanation.reasoningSteps.map((step, idx) => (
                <Text key={idx} style={[styles.reasoningStepText, { color: colors.textSecondary }]}>
                  {step}
                </Text>
              ))}
            </View>

            <View style={[styles.equationBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.equationText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>{t('delimitation.divisorEquation')}: </Text>
                {mathExplanation.formulas.idealPopEquation}
              </Text>
              <Text style={[styles.equationText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>{t('delimitation.seatQuota')}</Text>
                {mathExplanation.formulas.seatQuotaEquation}
              </Text>
              <Text style={[styles.equationText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>{t('delimitation.scQuota')}: </Text>
                {mathExplanation.formulas.scQuotaEquation}
              </Text>
              <Text style={[styles.equationText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>{t('delimitation.stQuota')}: </Text>
                {mathExplanation.formulas.stQuotaEquation}
              </Text>
            </View>
          </View>
        )}

        {/* Reservation Breakdown */}
        {reservation && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.reservation')}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.resRow}>
                <Text style={[styles.resLabel, { color: colors.textMuted }]}>{t('constituency.type')}</Text>
                <Text style={[styles.resHeader, { color: colors.textMuted }]}>{t('constituency.current')}</Text>
                <Text style={[styles.resHeader, { color: colors.textMuted }]}>{t('delimitation.projectedSeats')}</Text>
                <Text style={[styles.resHeader, { color: colors.textMuted }]}>{t('delimitation.seatChange')}</Text>
              </View>
              <View style={[styles.resDivider, { backgroundColor: colors.border }]} />

              {/* SC */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.resCategory, { color: colors.text }]}>SC ({reservation.scPercent}%)</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{reservation.current.scReserved}</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{allocation.reservedSC}</Text>
                <Text style={[styles.resChange, { color: allocation.reservedSC - reservation.current.scReserved >= 0 ? '#10B981' : '#EF4444' }]}>
                  {allocation.reservedSC - reservation.current.scReserved >= 0 ? '+' : ''}{allocation.reservedSC - reservation.current.scReserved}
                </Text>
              </View>

              {/* ST */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.resCategory, { color: colors.text }]}>ST ({reservation.stPercent}%)</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{reservation.current.stReserved}</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{allocation.reservedST}</Text>
                <Text style={[styles.resChange, { color: allocation.reservedST - reservation.current.stReserved >= 0 ? '#10B981' : '#EF4444' }]}>
                  {allocation.reservedST - reservation.current.stReserved >= 0 ? '+' : ''}{allocation.reservedST - reservation.current.stReserved}
                </Text>
              </View>

              {/* General */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.resCategory, { color: colors.text }]}>{t('delimitation.general')}</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{reservation.current.general}</Text>
                <Text style={[styles.resValue, { color: colors.text }]}>{allocation.general}</Text>
                <Text style={[styles.resChange, { color: allocation.general - reservation.current.general >= 0 ? '#10B981' : '#EF4444' }]}>
                  {allocation.general - reservation.current.general >= 0 ? '+' : ''}{allocation.general - reservation.current.general}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Party Seat Projections */}
        {partyProjections && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('delimitation.partyProjectionsTitle', { state: allocation.stateName, defaultValue: `Party Seat Projections (${allocation.stateName})` })}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 8 }]}>
                {partyProjections.methodologyNotes}
              </Text>
              {partyProjections.parties.map((p) => (
                <View key={p.party} style={[styles.partyRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.partyName, { color: colors.text }]}>{p.party}</Text>
                    <Text style={[styles.partyMeta, { color: colors.textMuted }]}>
                      Share: {p.currentVoteSharePercent}% · Safe: {p.safeSeats} · Battleground: {p.battlegroundSeats}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.partySeats, { color: colors.text }]}>{p.currentSeats} → {p.projectedSeats}</Text>
                    <Text style={[styles.partyChange, { color: p.seatChange >= 0 ? '#10B981' : '#EF4444' }]}>
                      {p.seatChange >= 0 ? `+${p.seatChange}` : p.seatChange} seats
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sitting MLA Risk Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              {t('delimitation.sittingMlaAnalyzer', { state: `${mlaProfiles.length} MLAs`, defaultValue: `Sitting MLA Risk Analyzer (${mlaProfiles.length} MLAs)` })}
            </Text>
            <Pressable onPress={() => setShowMLAs(!showMLAs)}>
              <Text style={[styles.toggleBtnText, { color: colors.primary }]}>
                {showMLAs ? t('common.collapse', { defaultValue: 'Collapse' }) : t('common.expandAll', { defaultValue: 'Expand All' })}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(showMLAs ? mlaProfiles : mlaProfiles.slice(0, 4)).map((m) => (
              <View key={m.currentAcNo} style={[styles.mlaRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mlaName, { color: colors.text }]}>{m.mlaName} ({m.party})</Text>
                  <Text style={[styles.mlaConstituency, { color: colors.textSecondary }]}>
                    AC #{m.currentAcNo} {m.currentAcName} → {m.primaryNewAcName}
                  </Text>
                  <Text style={[styles.mlaMeta, { color: colors.textMuted }]}>
                    Shift: {m.seatChangeType.toUpperCase()} · Margin: {m.currentMarginPercent}%
                  </Text>
                </View>
                <View style={[styles.riskTag, {
                  backgroundColor: m.riskRating === 'critical_risk' ? '#EF444420' :
                    m.riskRating === 'high_risk' ? '#F9731620' :
                    m.riskRating === 'moderate_risk' ? '#F59E0B20' : '#10B98120'
                }]}>
                  <Text style={[styles.riskTagText, {
                    color: m.riskRating === 'critical_risk' ? '#EF4444' :
                      m.riskRating === 'high_risk' ? '#F97316' :
                      m.riskRating === 'moderate_risk' ? '#F59E0B' : '#10B981'
                  }]}>
                    {m.riskRating.replace('_', ' ').toUpperCase()} ({m.riskScore})
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* District Breakdown */}
        {districtAgg && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('constituency.district')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {districtAgg.districts.length} districts · {allocation.projectedSeats} projected seats · Ideal: {formatPopulation(districtAgg.idealPopPerSeat)}/seat
            </Text>

            {districtAgg.districts
              .sort((a, b) => b.projectedSeats - a.projectedSeats)
              .map((d) => (
                <View key={d.districtName} style={[styles.districtCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.districtHeader}>
                    <Text style={[styles.districtName, { color: colors.text }]}>{d.districtName}</Text>
                    <View style={[styles.districtSeatBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.districtSeatText, { color: colors.primary }]}>{d.projectedSeats} seats</Text>
                    </View>
                  </View>
                  <View style={styles.districtStats}>
                    <View style={styles.districtStat}>
                      <Text style={[styles.dStatValue, { color: colors.text }]}>{formatPopulation(d.population)}</Text>
                      <Text style={[styles.dStatLabel, { color: colors.textMuted }]}>{t('delimitation.population', { defaultValue: 'Population' })}</Text>
                    </View>
                    <View style={styles.districtStat}>
                      <Text style={[styles.dStatValue, { color: colors.text }]}>{formatPopulation(d.populationPerSeat)}</Text>
                      <Text style={[styles.dStatLabel, { color: colors.textMuted }]}>{t('delimitation.popPerSeat', { defaultValue: 'Pop/Seat' })}</Text>
                    </View>
                    <View style={styles.districtStat}>
                      <Text style={[styles.dStatValue, {
                        color: Math.abs(d.deviationPercent) <= 10 ? '#10B981' : '#EF4444'
                      }]}>
                        {d.deviationPercent > 0 ? '+' : ''}{d.deviationPercent}%
                      </Text>
                      <Text style={[styles.dStatLabel, { color: colors.textMuted }]}>{t('delimitation.deviation', { defaultValue: 'Deviation' })}</Text>
                    </View>
                  </View>
                  <View style={styles.districtResBar}>
                    <View style={[styles.resSegment, { flex: d.scPercent || 0.1, backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.resSegment, { flex: d.stPercent || 0.1, backgroundColor: '#10B981' }]} />
                    <View style={[styles.resSegment, { flex: Math.max(0.1, 100 - d.scPercent - d.stPercent), backgroundColor: colors.primaryLight }]} />
                  </View>
                  <Text style={[styles.districtResText, { color: colors.textSecondary }]}>SC {d.scPercent}% · ST {d.stPercent}% · Urban {d.urbanPercent}%</Text>
                </View>
              ))}
          </View>
        )}

        {/* Assembly Constituencies List */}
        {constituencies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                {t('delimitation.assemblyConstituencies', { count: constituencies.length, defaultValue: `Assembly Constituencies (${constituencies.length})` })}
              </Text>
              <Pressable onPress={() => setShowConstituencies(!showConstituencies)}>
                <Text style={[styles.toggleBtnText, { color: colors.primary }]}>
                  {showConstituencies ? 'Hide' : 'View All'}
                </Text>
              </Pressable>
            </View>

            {showConstituencies && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 }]}>
                {constituencies.map((c) => (
                  <Pressable
                    key={`${c.stateCode}-${c.acNo}`}
                    style={[styles.acRow, { borderBottomColor: colors.border }]}
                    onPress={() => router.push(`/constituency/${c.acNo}` as any)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.acName, { color: colors.text }]}>
                        AC #{c.acNo} {c.name}
                      </Text>
                      <Text style={[styles.acDistrict, { color: colors.textMuted }]}>
                        District: {c.district} · MLA: {c.winnerName || 'Incumbent'} ({c.winnerParty || 'IND'})
                      </Text>
                    </View>
                    <View style={[styles.acTypeBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.acTypeText, { color: colors.primary }]}>{c.type}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            {t('delimitation.stateFooterDisclaimer', { defaultValue: 'Delimitation calculations derived from Census of India official district demographic figures under Articles 81, 82, and 170 of the Constitution.' })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  backButton: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backButtonText: { fontSize: 14, fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Model Toggle Box
  modelToggleBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  modelToggleTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  modelToggleRow: { flexDirection: 'row', gap: 8 },
  modelChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modelChipText: { fontSize: 11, fontWeight: '700' },

  // Hero Card
  heroCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  heroStat: { alignItems: 'center' },
  heroValue: { fontSize: 28, fontWeight: '900' },
  heroLabel: { fontSize: 11, marginTop: 2 },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  changeText: { fontSize: 16, fontWeight: '900' },
  heroMeta: { gap: 2, alignItems: 'center' },
  heroMetaText: { fontSize: 11 },

  section: { marginTop: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  sectionSubtitle: { fontSize: 11, marginBottom: 10 },
  toggleBtnText: { fontSize: 12, fontWeight: '700' },

  card: { borderRadius: 12, padding: 14, borderWidth: 1 },

  // Math Reasoning
  reasoningList: { gap: 6, marginBottom: 10 },
  reasoningStepText: { fontSize: 11, lineHeight: 16 },
  equationBox: { borderRadius: 8, padding: 10, borderWidth: 1, gap: 4 },
  equationText: { fontSize: 11, lineHeight: 15 },

  // Reservation
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  resDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  resLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  resCategory: { flex: 1, fontSize: 12, fontWeight: '700' },
  resHeader: { width: 64, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  resValue: { width: 64, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  resChange: { width: 64, fontSize: 13, fontWeight: '900', textAlign: 'right' },
  resDivider: { height: 1, marginVertical: 6 },

  // Party Row
  partyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  partyName: { fontSize: 13, fontWeight: '800' },
  partyMeta: { fontSize: 10, marginTop: 2 },
  partySeats: { fontSize: 13, fontWeight: '800' },
  partyChange: { fontSize: 11, fontWeight: '700', marginTop: 1 },

  // MLA Row
  mlaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  mlaName: { fontSize: 13, fontWeight: '800' },
  mlaConstituency: { fontSize: 11, marginTop: 1 },
  mlaMeta: { fontSize: 10, marginTop: 2 },
  riskTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  riskTagText: { fontSize: 9, fontWeight: '800' },

  // District Card
  districtCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  districtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  districtName: { fontSize: 14, fontWeight: '800' },
  districtSeatBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  districtSeatText: { fontSize: 11, fontWeight: '800' },
  districtStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  districtStat: { alignItems: 'center' },
  dStatValue: { fontSize: 13, fontWeight: '800' },
  dStatLabel: { fontSize: 10, marginTop: 1 },
  districtResBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  resSegment: { height: 4 },
  districtResText: { fontSize: 10, marginTop: 6 },

  // AC Row
  acRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  acName: { fontSize: 13, fontWeight: '800' },
  acDistrict: { fontSize: 10, marginTop: 2 },
  acTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  acTypeText: { fontSize: 9, fontWeight: '800' },

  // Disclaimer
  disclaimer: { flexDirection: 'row', borderRadius: 10, padding: 10, gap: 6, marginTop: 16, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
