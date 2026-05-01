import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { computeAllSeatAllocations, computeStateSeatAllocation } from '../../lib/delimitation/seatCalculator';
import { simulateStateQuick } from '../../lib/delimitation/boundarySimulator';
import { analyzeStateReservation } from '../../lib/delimitation/reservationAnalyzer';
import { formatPopulation } from '../../lib/delimitationTypes';
import type { SeatAllocation } from '../../lib/delimitationTypes';

type SimMode = 'equal_population' | 'minimal_change' | 'political_neutral';

const MODE_CONFIG: Record<SimMode, { label: string; icon: string; description: string }> = {
  equal_population: {
    label: 'Equal Population',
    icon: 'people',
    description: 'Each constituency has roughly equal population (constitutional default)',
  },
  minimal_change: {
    label: 'Minimal Change',
    icon: 'git-merge',
    description: 'Preserve existing boundaries where possible, minimize disruption',
  },
  political_neutral: {
    label: 'Competitive',
    icon: 'trophy',
    description: 'Optimize for competitive constituencies, reduce safe seats',
  },
};

export default function SimulatorScreen() {
  const router = useRouter();
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
    return simulateStateQuick(selectedState);
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
    const text = [
      `KSHETRA Delimitation Simulator`,
      `State: ${currentAlloc.stateName}`,
      `Mode: ${MODE_CONFIG[mode].label}`,
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
  }, [currentAlloc, quickSim, mode, currentSeats, targetSeats]);

  const seatChange = targetSeats - currentSeats;
  const changeColor = seatChange > 0 ? '#10B981' : seatChange < 0 ? '#EF4444' : '#6B7280';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Delimitation Simulator</Text>
          <Text style={styles.headerSubtitle}>Interactive Boundary Simulation</Text>
        </View>
        {showResults && (
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={18} color="#4F8EF7" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* State Picker */}
        <Text style={styles.sectionTitle}>Select State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll}>
          {allAllocations.map((a) => (
            <Pressable
              key={a.stateCode}
              style={[styles.stateChip, selectedState === a.stateCode && styles.stateChipActive]}
              onPress={() => { setSelectedState(a.stateCode); setShowResults(false); setCustomSeats(null); }}
            >
              <Text style={[styles.stateChipText, selectedState === a.stateCode && styles.stateChipTextActive]}>
                {a.stateCode}
              </Text>
              <Text style={[styles.stateChipSub, selectedState === a.stateCode && { color: '#4F8EF7' }]}>
                {a.seatChange > 0 ? '+' : ''}{a.seatChange}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Mode Picker */}
        <Text style={styles.sectionTitle}>Simulation Mode</Text>
        <View style={styles.modeGrid}>
          {(Object.keys(MODE_CONFIG) as SimMode[]).map((m) => {
            const cfg = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <Pressable
                key={m}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => { setMode(m); setShowResults(false); }}
              >
                <Ionicons name={cfg.icon as any} size={18} color={active ? '#4F8EF7' : '#6B7280'} />
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{cfg.label}</Text>
                <Text style={styles.modeDesc}>{cfg.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Seat Slider */}
        <Text style={styles.sectionTitle}>Target Seats</Text>
        {currentAlloc && (
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderCurrent}>Current: {currentSeats}</Text>
              <Text style={[styles.sliderTarget, { color: changeColor }]}>
                Target: {targetSeats}
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
              minimumTrackTintColor="#4F8EF7"
              maximumTrackTintColor="#1F2937"
              thumbTintColor="#4F8EF7"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderMin}>{Math.max(10, Math.round(currentSeats * 0.5))}</Text>
              <Pressable onPress={() => { setCustomSeats(currentAlloc.projectedSeats); setShowResults(false); }}>
                <Text style={styles.sliderReset}>Reset to Projected ({currentAlloc.projectedSeats})</Text>
              </Pressable>
              <Text style={styles.sliderMax}>{Math.round(currentSeats * 2)}</Text>
            </View>
          </View>
        )}

        {/* Run Button */}
        {!showResults && (
          <Pressable style={styles.runBtn} onPress={handleRun}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.runBtnText}>Run Simulation</Text>
          </Pressable>
        )}

        {/* Results */}
        {showResults && quickSim && (
          <View>
            {/* Before → After */}
            <Text style={styles.sectionTitle}>Before → After</Text>
            <View style={styles.beforeAfter}>
              <View style={styles.baCard}>
                <Text style={styles.baLabel}>BEFORE</Text>
                <Text style={styles.baValue}>{currentSeats}</Text>
                <Text style={styles.baSub}>seats</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#6B7280" />
              <View style={[styles.baCard, { borderColor: changeColor }]}>
                <Text style={[styles.baLabel, { color: changeColor }]}>AFTER</Text>
                <Text style={[styles.baValue, { color: changeColor }]}>{targetSeats}</Text>
                <Text style={styles.baSub}>seats</Text>
              </View>
            </View>

            {/* Reservation Summary */}
            <Text style={styles.sectionTitle}>Reservation Split</Text>
            <View style={styles.resSummaryRow}>
              <View style={[styles.resBox, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.resBoxValue}>{quickSim.totals.scReserved}</Text>
                <Text style={styles.resBoxLabel}>SC</Text>
              </View>
              <View style={[styles.resBox, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.resBoxValue}>{quickSim.totals.stReserved}</Text>
                <Text style={styles.resBoxLabel}>ST</Text>
              </View>
              <View style={[styles.resBox, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.resBoxValue}>{quickSim.totals.general}</Text>
                <Text style={styles.resBoxLabel}>General</Text>
              </View>
            </View>

            {/* Reservation Bar */}
            <View style={styles.resBar}>
              <View style={[styles.resSegment, { flex: quickSim.totals.scReserved, backgroundColor: '#F59E0B' }]} />
              <View style={[styles.resSegment, { flex: quickSim.totals.stReserved, backgroundColor: '#10B981' }]} />
              <View style={[styles.resSegment, { flex: quickSim.totals.general, backgroundColor: '#3B82F6' }]} />
            </View>

            {/* District Breakdown */}
            <Text style={styles.sectionTitle}>District Breakdown</Text>
            <Text style={styles.sectionSub}>
              Ideal: {formatPopulation(quickSim.idealPopPerSeat)}/seat
            </Text>

            {quickSim.districtBreakdown
              .sort((a, b) => b.projectedSeats - a.projectedSeats)
              .map((d) => {
                const devOk = Math.abs(d.deviationPercent) <= 10;
                return (
                  <View key={d.districtName} style={styles.distRow}>
                    <View style={styles.distHeader}>
                      <Text style={styles.distName}>{d.districtName}</Text>
                      <View style={styles.distSeatBadge}>
                        <Text style={styles.distSeatText}>{d.projectedSeats}</Text>
                      </View>
                    </View>
                    <View style={styles.distStats}>
                      <Text style={styles.distStat}>{formatPopulation(d.population)}</Text>
                      <Text style={styles.distStat}>{formatPopulation(d.populationPerSeat)}/seat</Text>
                      <Text style={[styles.distDev, { color: devOk ? '#10B981' : '#EF4444' }]}>
                        {d.deviationPercent > 0 ? '+' : ''}{d.deviationPercent}%
                      </Text>
                    </View>
                    {/* SC/ST mini bar */}
                    <View style={styles.miniBar}>
                      <View style={[styles.miniSeg, { flex: d.scPercent, backgroundColor: '#F59E0B' }]} />
                      <View style={[styles.miniSeg, { flex: d.stPercent, backgroundColor: '#10B981' }]} />
                      <View style={[styles.miniSeg, { flex: Math.max(0.1, 100 - d.scPercent - d.stPercent), backgroundColor: '#1F293780' }]} />
                    </View>
                  </View>
                );
              })}

            {/* Hotspots */}
            {reservation && reservation.hotspots.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Reservation Hotspots</Text>
                {reservation.hotspots.slice(0, 5).map((h, i) => (
                  <View key={i} style={[styles.hotspot, {
                    borderLeftColor: h.significance === 'critical' ? '#EF4444' : h.significance === 'high' ? '#F59E0B' : '#3B82F6'
                  }]}>
                    <Text style={styles.hotspotType}>{h.type} — {h.districtName}</Text>
                    <Text style={styles.hotspotDesc}>{h.description}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionBtn} onPress={() => router.push(`/delimitation/state/${selectedState}`)}>
                <Ionicons name="open-outline" size={16} color="#4F8EF7" />
                <Text style={styles.actionBtnText}>Full Detail</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={16} color="#4F8EF7" />
                <Text style={styles.actionBtnText}>Share</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { borderColor: '#EF444440' }]} onPress={handleReset}>
                <Ionicons name="refresh" size={16} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reset</Text>
              </Pressable>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={14} color="#F59E0B" />
              <Text style={styles.disclaimerText}>
                Based on Census 2011 data using {MODE_CONFIG[mode].label} mode.
                Actual delimitation will use Census 2026 data.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  shareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F8EF715', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  sectionSub: { fontSize: 11, color: '#6B7280', marginBottom: 8, fontWeight: '600' },

  // State picker
  stateScroll: { marginBottom: 4, maxHeight: 56 },
  stateChip: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, alignItems: 'center', minWidth: 50 },
  stateChipActive: { backgroundColor: '#4F8EF720', borderWidth: 1, borderColor: '#4F8EF7' },
  stateChipText: { fontSize: 13, fontWeight: '800', color: '#9CA3AF' },
  stateChipTextActive: { color: '#4F8EF7' },
  stateChipSub: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 1 },

  // Mode
  modeGrid: { gap: 6 },
  modeCard: { backgroundColor: '#111827', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'transparent' },
  modeCardActive: { borderColor: '#4F8EF7', backgroundColor: '#4F8EF710' },
  modeLabel: { fontSize: 13, fontWeight: '800', color: '#9CA3AF', marginTop: 4 },
  modeLabelActive: { color: '#4F8EF7' },
  modeDesc: { fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 15 },

  // Slider
  sliderCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sliderCurrent: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  sliderTarget: { fontSize: 15, fontWeight: '900' },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  changeBadgeText: { fontSize: 13, fontWeight: '900' },
  slider: { width: '100%', height: 36 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderMin: { fontSize: 10, color: '#6B7280' },
  sliderMax: { fontSize: 10, color: '#6B7280' },
  sliderReset: { fontSize: 11, color: '#4F8EF7', fontWeight: '700' },

  // Run button
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F8EF7', borderRadius: 12, paddingVertical: 14, marginTop: 16, gap: 8 },
  runBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },

  // Before/After
  beforeAfter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  baCard: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  baLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  baValue: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  baSub: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Reservation summary
  resSummaryRow: { flexDirection: 'row', gap: 6 },
  resBox: { flex: 1, backgroundColor: '#111827', borderRadius: 8, padding: 10, alignItems: 'center', borderLeftWidth: 3 },
  resBoxValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  resBoxLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 },
  resBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  resSegment: { height: 6 },

  // District
  distRow: { backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 4 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distName: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  distSeatBadge: { backgroundColor: '#4F8EF720', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  distSeatText: { fontSize: 12, fontWeight: '900', color: '#4F8EF7' },
  distStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  distStat: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  distDev: { fontSize: 11, fontWeight: '800' },
  miniBar: { flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  miniSeg: { height: 3 },

  // Hotspot
  hotspot: { backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 4, borderLeftWidth: 3 },
  hotspotType: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  hotspotDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 3, lineHeight: 15 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4F8EF740' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#4F8EF7' },

  // Disclaimer
  disclaimer: { flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 10, padding: 10, gap: 6, marginTop: 12 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
