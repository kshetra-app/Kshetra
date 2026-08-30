import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Slider from '@react-native-community/slider';
import { computeAllSeatAllocations, explainSeatCalculation } from '../../lib/delimitation/seatCalculator';
import { simulateStateQuick } from '../../lib/delimitation/boundarySimulator';
import { analyzeStateReservation } from '../../lib/delimitation/reservationAnalyzer';
import { formatPopulation } from '../../lib/delimitationTypes';
import { useTheme } from '../../lib/theme';

type SimMode = 'equal_population' | 'minimal_change' | 'political_neutral';

interface ModeInfo {
  labelKey: string;
  defaultLabel: string;
  icon: string;
  descKey: string;
  defaultDesc: string;
}

const MODE_CONFIG: Record<SimMode, ModeInfo> = {
  equal_population: {
    labelKey: 'delimitationExtended.equalPopulation',
    defaultLabel: 'Equal Population',
    icon: 'people',
    descKey: 'delimitationExtended.equalPopulationDesc',
    defaultDesc: 'Each constituency has roughly equal population (constitutional default)',
  },
  minimal_change: {
    labelKey: 'delimitationExtended.minimalChange',
    defaultLabel: 'Minimal Change',
    icon: 'git-merge',
    descKey: 'delimitationExtended.minimalChangeDesc',
    defaultDesc: 'Preserve existing boundaries where possible, minimize disruption',
  },
  political_neutral: {
    labelKey: 'delimitationExtended.competitive',
    defaultLabel: 'Competitive',
    icon: 'trophy',
    descKey: 'delimitationExtended.competitiveDesc',
    defaultDesc: 'Optimize for competitive constituencies, reduce safe seats',
  },
};

export default function SimulatorScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const allAllocations = useMemo(() => computeAllSeatAllocations(), []);

  // State selection
  const [selectedState, setSelectedState] = useState<string>('TS');
  // Mode
  const [mode, setMode] = useState<SimMode>('equal_population');
  // Custom seats slider
  const [customSeats, setCustomSeats] = useState<number | null>(null);
  // Show results
  const [showResults, setShowResults] = useState(false);

  const currentAlloc = useMemo(
    () => allAllocations.find((a) => a.stateCode === selectedState),
    [allAllocations, selectedState],
  );

  const targetSeats = customSeats ?? currentAlloc?.projectedSeats ?? 0;
  const currentSeats = currentAlloc?.currentSeats ?? 0;

  // Quick simulation
  const quickSim = useMemo(() => {
    if (!showResults) return null;
    return simulateStateQuick(selectedState, targetSeats, mode);
  }, [selectedState, showResults, targetSeats, mode]);

  const mathExplanation = useMemo(() => {
    if (!showResults) return null;
    return explainSeatCalculation(selectedState);
  }, [selectedState, showResults]);

  const reservation = useMemo(() => {
    if (!showResults) return null;
    return analyzeStateReservation(selectedState);
  }, [selectedState, showResults]);

  const handleRun = useCallback(() => {
    setShowResults(true);
  }, []);

  const handleReset = useCallback(() => {
    setShowResults(false);
    setCustomSeats(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!currentAlloc || !quickSim) return;
    const modeLabel = t(MODE_CONFIG[mode].labelKey, { defaultValue: MODE_CONFIG[mode].defaultLabel });
    const text = [
      `KSHETRA Delimitation Simulator`,
      `State: ${currentAlloc.stateName}`,
      `Mode: ${modeLabel}`,
      `Current Seats: ${currentSeats}`,
      `Simulated Seats: ${targetSeats}`,
      `Change: ${targetSeats - currentSeats > 0 ? '+' : ''}${targetSeats - currentSeats}`,
      ``,
      `District Breakdown:`,
      ...quickSim.districtBreakdown.map(
        (d) => `  ${d.districtName}: ${d.projectedSeats} seats (${d.deviationPercent > 0 ? '+' : ''}${d.deviationPercent}%)`
      ),
      ``,
      `Reservation:`,
      `  SC: ${quickSim.totals.scReserved} | ST: ${quickSim.totals.stReserved} | General: ${quickSim.totals.general}`,
      ``,
      `Based on Census 2011 | Powered by KSHETRA`,
    ].join('\n');

    await Share.share({ message: text });
  }, [currentAlloc, quickSim, mode, currentSeats, targetSeats, t]);

  const seatChange = targetSeats - currentSeats;
  const changeColor = seatChange > 0 ? '#10B981' : seatChange < 0 ? '#EF4444' : colors.textMuted;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('delimitationExtended.interactiveSimulator', { defaultValue: 'Delimitation Simulator' })}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {t('delimitationExtended.simulatorSub', { defaultValue: 'Interactive Boundary Simulation' })}
          </Text>
        </View>
        {showResults && (
          <Pressable onPress={handleShare} style={[styles.shareBtn, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="share-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>

        {/* State Picker */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('delimitationExtended.selectState', { defaultValue: 'Select State' })}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll}>
          {allAllocations.map((a) => {
            const isSelected = selectedState === a.stateCode;
            return (
              <Pressable
                key={a.stateCode}
                style={[
                  styles.stateChip,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setSelectedState(a.stateCode); setShowResults(false); setCustomSeats(null); }}
              >
                <Text style={[styles.stateChipText, { color: isSelected ? colors.primary : colors.text }]}>
                  {a.stateCode}
                </Text>
                <Text style={[styles.stateChipSub, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                  {a.seatChange > 0 ? '+' : ''}{a.seatChange}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Mode Picker */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('delimitationExtended.simulationMode', { defaultValue: 'Simulation Mode' })}
        </Text>
        <View style={styles.modeGrid}>
          {(Object.keys(MODE_CONFIG) as SimMode[]).map((m) => {
            const cfg = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <Pressable
                key={m}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setMode(m); setShowResults(false); }}
              >
                <Ionicons name={cfg.icon as any} size={18} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.modeLabel, { color: active ? colors.primary : colors.text }]}>
                  {t(cfg.labelKey, { defaultValue: cfg.defaultLabel })}
                </Text>
                <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                  {t(cfg.descKey, { defaultValue: cfg.defaultDesc })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Seat Slider */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('delimitationExtended.targetSeats', { defaultValue: 'Target Seats' })}
        </Text>
        {currentAlloc && (
          <View style={[styles.sliderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderCurrent, { color: colors.textSecondary }]}>
                {t('delimitationExtended.current', { defaultValue: 'Current' })}: {currentSeats}
              </Text>
              <Text style={[styles.sliderTarget, { color: changeColor }]}>
                {t('delimitationExtended.target', { defaultValue: 'Target' })}: {targetSeats}
              </Text>
              <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
                <Text style={[styles.changeBadgeText, { color: changeColor }]}>
                  {seatChange > 0 ? '+' : ''}{seatChange}
                </Text>
              </View>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={Math.max(10, Math.round(currentSeats * 0.5))}
              maximumValue={Math.round(currentSeats * 2)}
              step={1}
              value={targetSeats}
              onValueChange={(v) => { setCustomSeats(Math.round(v)); setShowResults(false); }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderMin, { color: colors.textMuted }]}>{Math.max(10, Math.round(currentSeats * 0.5))}</Text>
              <Pressable onPress={() => { setCustomSeats(currentAlloc.projectedSeats); setShowResults(false); }}>
                <Text style={[styles.sliderReset, { color: colors.primary }]}>
                  {t('delimitationExtended.resetToProjected', { count: currentAlloc.projectedSeats, defaultValue: `Reset to Projected (${currentAlloc.projectedSeats})` })}
                </Text>
              </Pressable>
              <Text style={[styles.sliderMax, { color: colors.textMuted }]}>{Math.round(currentSeats * 2)}</Text>
            </View>
          </View>
        )}

        {/* Run Button */}
        {!showResults && (
          <Pressable style={[styles.runBtn, { backgroundColor: colors.primary }]} onPress={handleRun}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.runBtnText}>
              {t('delimitationExtended.runSimulation', { defaultValue: 'Run Simulation' })}
            </Text>
          </Pressable>
        )}

        {/* Results */}
        {showResults && quickSim && (
          <View>
            {/* Before → After */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('delimitationExtended.beforeAfter', { defaultValue: 'Before → After' })}
            </Text>
            <View style={styles.beforeAfter}>
              <View style={[styles.baCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.baLabel, { color: colors.textMuted }]}>
                  {t('delimitationExtended.before', { defaultValue: 'BEFORE' })}
                </Text>
                <Text style={[styles.baValue, { color: colors.text }]}>{currentSeats}</Text>
                <Text style={[styles.baSub, { color: colors.textSecondary }]}>
                  {t('delimitation.seats', { defaultValue: 'seats' })}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
              <View style={[styles.baCard, { backgroundColor: colors.surface, borderColor: changeColor }]}>
                <Text style={[styles.baLabel, { color: changeColor }]}>
                  {t('delimitationExtended.after', { defaultValue: 'AFTER' })}
                </Text>
                <Text style={[styles.baValue, { color: changeColor }]}>{targetSeats}</Text>
                <Text style={[styles.baSub, { color: colors.textSecondary }]}>
                  {t('delimitation.seats', { defaultValue: 'seats' })}
                </Text>
              </View>
            </View>

            {/* Reservation Summary */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('delimitationExtended.reservationSplit', { defaultValue: 'Reservation Split' })}
            </Text>
            <View style={styles.resSummaryRow}>
              <View style={[styles.resBox, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: '#F59E0B' }]}>
                <Text style={[styles.resBoxValue, { color: colors.text }]}>{quickSim.totals.scReserved}</Text>
                <Text style={[styles.resBoxLabel, { color: colors.textSecondary }]}>{t('delimitation.sc')}</Text>
              </View>
              <View style={[styles.resBox, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: '#10B981' }]}>
                <Text style={[styles.resBoxValue, { color: colors.text }]}>{quickSim.totals.stReserved}</Text>
                <Text style={[styles.resBoxLabel, { color: colors.textSecondary }]}>{t('delimitation.st')}</Text>
              </View>
              <View style={[styles.resBox, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primary }]}>
                <Text style={[styles.resBoxValue, { color: colors.text }]}>{quickSim.totals.general}</Text>
                <Text style={[styles.resBoxLabel, { color: colors.textSecondary }]}>{t('delimitation.general')}</Text>
              </View>
            </View>

            {/* Reservation Bar */}
            <View style={styles.resBar}>
              <View style={[styles.resSegment, { flex: quickSim.totals.scReserved, backgroundColor: '#F59E0B' }]} />
              <View style={[styles.resSegment, { flex: quickSim.totals.stReserved, backgroundColor: '#10B981' }]} />
              <View style={[styles.resSegment, { flex: quickSim.totals.general, backgroundColor: colors.primary }]} />
            </View>

            {/* District Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('delimitationExtended.districtBreakdown', { defaultValue: 'District Breakdown' })}
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              {t('delimitationExtended.ideal', { defaultValue: 'Ideal' })}: {formatPopulation(quickSim.totals.idealPopPerSeat)}/{t('delimitationExtended.seat', { defaultValue: 'seat' })}
            </Text>

            {quickSim.districtBreakdown
              .sort((a, b) => b.projectedSeats - a.projectedSeats)
              .map((d) => {
                const devOk = Math.abs(d.deviationPercent) <= 10;
                return (
                  <View key={d.districtName} style={[styles.distRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.distHeader}>
                      <Text style={[styles.distName, { color: colors.text }]}>{d.districtName}</Text>
                      <View style={[styles.distSeatBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.distSeatText, { color: colors.primary }]}>{d.projectedSeats}</Text>
                      </View>
                    </View>
                    <View style={styles.distStats}>
                      <Text style={[styles.distStat, { color: colors.textSecondary }]}>{formatPopulation(d.population)}</Text>
                      <Text style={[styles.distStat, { color: colors.textSecondary }]}>{formatPopulation(d.populationPerSeat)}/{t('delimitationExtended.seat', { defaultValue: 'seat' })}</Text>
                      <Text style={[styles.distDev, { color: devOk ? '#10B981' : '#EF4444' }]}>
                        {d.deviationPercent > 0 ? '+' : ''}{d.deviationPercent}%
                      </Text>
                    </View>
                    {(() => {
                      const scPct = d.projectedSeats > 0 ? Math.round((d.scReserved / d.projectedSeats) * 100) : 0;
                      const stPct = d.projectedSeats > 0 ? Math.round((d.stReserved / d.projectedSeats) * 100) : 0;
                      const genPct = Math.max(0.1, 100 - scPct - stPct);
                      return (
                        <View style={styles.miniBar}>
                          <View style={[styles.miniSeg, { flex: scPct || 0.1, backgroundColor: '#F59E0B' }]} />
                          <View style={[styles.miniSeg, { flex: stPct || 0.1, backgroundColor: '#10B981' }]} />
                          <View style={[styles.miniSeg, { flex: genPct, backgroundColor: colors.primaryLight }]} />
                        </View>
                      );
                    })()}
                  </View>
                );
              })}

            {/* Hotspots */}
            {reservation && reservation.hotspots.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('delimitationExtended.reservationHotspots', { defaultValue: 'Reservation Hotspots' })}
                </Text>
                {reservation.hotspots.slice(0, 5).map((h, i) => (
                  <View key={i} style={[styles.hotspot, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: h.significance === 'critical' ? '#EF4444' : h.significance === 'high' ? '#F59E0B' : colors.primary
                  }]}>
                    <Text style={[styles.hotspotType, { color: colors.text }]}>{h.type} — {h.districtName}</Text>
                    <Text style={[styles.hotspotDesc, { color: colors.textSecondary }]}>{h.description}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Mathematical & Constitutional Explainability */}
            {mathExplanation && (
              <View style={[styles.explainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.explainHeader}>
                  <Ionicons name="school" size={20} color={colors.primary} />
                  <Text style={[styles.explainTitle, { color: colors.text }]}>
                    {t('delimitation.mathematicalDerivation', { defaultValue: 'Constitutional Formulas & Mathematical Derivation' })}
                  </Text>
                </View>

                <View style={[styles.qualityPill, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.qualityPillText, { color: '#10B981' }]}>
                    Simulation Quality: {quickSim.qualityScore}% within ±10% deviation bound
                  </Text>
                </View>

                {/* Step by step derivation */}
                <Text style={[styles.formulaSubhead, { color: colors.text }]}>{t('delimitation.reasoningSteps', { defaultValue: 'Constitutional Reasoning Steps:' })}</Text>
                {mathExplanation.reasoningSteps.map((step, sIdx) => (
                  <Text key={sIdx} style={[styles.reasoningStepText, { color: colors.textSecondary }]}>
                    {step}
                  </Text>
                ))}

                {/* Mathematical formulas */}
                <View style={[styles.formulaBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={[styles.formulaItem, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700' }}>{t('delimitation.idealDivisor')}</Text>
                    {mathExplanation.formulas.idealPopEquation}
                  </Text>
                  <Text style={[styles.formulaItem, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700' }}>{t('delimitation.seatQuota')}</Text>
                    {mathExplanation.formulas.seatQuotaEquation}
                  </Text>
                  <Text style={[styles.formulaItem, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700' }}>{t('delimitation.article332Sc')}</Text>
                    {mathExplanation.formulas.scQuotaEquation}
                  </Text>
                  <Text style={[styles.formulaItem, { color: colors.text }]}>
                    <Text style={{ fontWeight: '700' }}>{t('delimitation.article332St')}</Text>
                    {mathExplanation.formulas.stQuotaEquation}
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push(`/delimitation/state/${selectedState}`)}>
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('delimitationExtended.fullDetail', { defaultValue: 'Full Detail' })}
                </Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('common.share', { defaultValue: 'Share' })}
                </Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: '#EF444440' }]} onPress={handleReset}>
                <Ionicons name="refresh" size={16} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                  {t('common.reset', { defaultValue: 'Reset' })}
                </Text>
              </Pressable>
            </View>

            {/* Disclaimer */}
            <View style={[styles.disclaimer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
              <Ionicons name="information-circle" size={14} color="#F59E0B" />
              <Text style={styles.disclaimerText}>
                {t('delimitationExtended.simulatorDisclaimer', { mode: t(MODE_CONFIG[mode].labelKey, { defaultValue: MODE_CONFIG[mode].defaultLabel }), defaultValue: `Based on Census 2011 data using ${MODE_CONFIG[mode].defaultLabel} mode. Actual delimitation will use Census 2026 data.` })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  shareBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  sectionSub: { fontSize: 11, marginBottom: 8, fontWeight: '600' },

  // State picker
  stateScroll: { marginBottom: 4, maxHeight: 56 },
  stateChip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, alignItems: 'center', minWidth: 50, borderWidth: 1 },
  stateChipText: { fontSize: 13, fontWeight: '800' },
  stateChipSub: { fontSize: 10, fontWeight: '700', marginTop: 1 },

  // Mode
  modeGrid: { gap: 6 },
  modeCard: { borderRadius: 10, padding: 12, borderWidth: 1 },
  modeLabel: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  modeDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  // Slider
  sliderCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sliderCurrent: { fontSize: 13, fontWeight: '700' },
  sliderTarget: { fontSize: 15, fontWeight: '900' },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  changeBadgeText: { fontSize: 13, fontWeight: '900' },
  slider: { width: '100%', height: 36 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderMin: { fontSize: 10 },
  sliderMax: { fontSize: 10 },
  sliderReset: { fontSize: 11, fontWeight: '700' },

  // Run button
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginTop: 16, gap: 8 },
  runBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },

  // Before/After
  beforeAfter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  baCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  baLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  baValue: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  baSub: { fontSize: 11, fontWeight: '600' },

  // Reservation summary
  resSummaryRow: { flexDirection: 'row', gap: 6 },
  resBox: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderLeftWidth: 3, borderWidth: 1 },
  resBoxValue: { fontSize: 20, fontWeight: '900' },
  resBoxLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  resBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  resSegment: { height: 6 },

  // District
  distRow: { borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distName: { fontSize: 13, fontWeight: '800' },
  distSeatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  distSeatText: { fontSize: 12, fontWeight: '900' },
  distStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  distStat: { fontSize: 11, fontWeight: '600' },
  distDev: { fontSize: 11, fontWeight: '800' },
  miniBar: { flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  miniSeg: { height: 3 },

  // Hotspot
  hotspot: { borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderWidth: 1 },
  hotspotType: { fontSize: 12, fontWeight: '800' },
  hotspotDesc: { fontSize: 11, marginTop: 3, lineHeight: 15 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  // Explainability Card
  explainCard: { borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1 },
  explainHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  explainTitle: { fontSize: 13, fontWeight: '800' },
  qualityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  qualityPillText: { fontSize: 11, fontWeight: '700' },
  formulaSubhead: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  reasoningStepText: { fontSize: 11, lineHeight: 16, marginBottom: 4 },
  formulaBox: { borderRadius: 8, padding: 10, borderWidth: 1, marginTop: 8, gap: 4 },
  formulaItem: { fontSize: 11, lineHeight: 15 },

  // Disclaimer
  disclaimer: { flexDirection: 'row', borderRadius: 10, padding: 10, gap: 6, marginTop: 12, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
