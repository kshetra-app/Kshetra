import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { useActiveStateStore } from '../../stores/activeState';
import { useDelimitationStore } from '../../stores/delimitation';
import { computeStateSeatAllocation } from '../../lib/delimitation/seatCalculator';
import {
  DELIMITATION_STATUS_CONFIG,
  BOUNDARY_CHANGE_CONFIG,
  IMPACT_SEVERITY_CONFIG,
  buildCitizenImpactSummary,
  formatPopulation,
} from '../../lib/delimitationTypes';
import type { CitizenImpact } from '../../lib/delimitationTypes';

export default function MyImpactScreen() {
  const router = useRouter();
  const [pinCode, setPinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CitizenImpact | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const myHome = useMyConstituencyStore((s) => s.home);
  const activeState = useActiveStateStore((s) => s.stateCode);
  const nationalStatus = useDelimitationStore((s) => s.nationalStatus);
  const getCitizenImpact = useDelimitationStore((s) => s.getCitizenImpact);

  const stateProjection = useMemo(
    () => computeStateSeatAllocation(activeState),
    [activeState],
  );

  const statusConfig = DELIMITATION_STATUS_CONFIG[nationalStatus];

  const handleSearch = () => {
    if (pinCode.length !== 6 || !/^\d{6}$/.test(pinCode)) return;

    setSearching(true);

    // Simulate lookup — in production this queries the citizen_impact table
    setTimeout(() => {
      // Check local cache first
      const cached = getCitizenImpact(pinCode);
      if (cached) {
        setResult(cached);
      } else {
        // For now, show the "not yet available" state
        setResult(null);
        setShowSubscribe(true);
      }
      setSearching(false);
    }, 800);
  };

  const handleUseMyLocation = () => {
    if (myHome) {
      // Auto-fill context from saved constituency
      setResult(null);
      setShowSubscribe(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>What Changes For You</Text>
          <Text style={styles.headerSubtitle}>Personal delimitation impact</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero explanation */}
        <View style={styles.heroCard}>
          <Ionicons name="person-circle" size={40} color="#4F8EF7" />
          <Text style={styles.heroTitle}>
            How will delimitation affect YOUR constituency?
          </Text>
          <Text style={styles.heroDesc}>
            Enter your PIN code or use your saved constituency to see how boundary changes
            may impact your area — your MLA, your constituency name, and your reservation status.
          </Text>
        </View>

        {/* PIN Code Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your PIN Code</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="500001"
              placeholderTextColor="#374151"
              value={pinCode}
              onChangeText={(text) => setPinCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[styles.searchBtn, pinCode.length !== 6 && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={pinCode.length !== 6}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {myHome && (
            <Pressable style={styles.useHomeBtn} onPress={handleUseMyLocation}>
              <Ionicons name="home" size={14} color="#4F8EF7" />
              <Text style={styles.useHomeText}>
                Use my constituency: {myHome.name}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Result: Impact found */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="alert-circle" size={20} color={IMPACT_SEVERITY_CONFIG[result.impactSeverity].color} />
              <Text style={[styles.resultSeverity, { color: IMPACT_SEVERITY_CONFIG[result.impactSeverity].color }]}>
                {IMPACT_SEVERITY_CONFIG[result.impactSeverity].label}
              </Text>
            </View>

            <Text style={styles.resultSummary}>
              {buildCitizenImpactSummary(result)}
            </Text>

            {/* Current → Proposed */}
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>Current</Text>
                <Text style={styles.comparisonName}>{result.currentAcName}</Text>
                <Text style={styles.comparisonDetail}>AC #{result.currentAcNo}</Text>
                {result.currentMLA && (
                  <Text style={styles.comparisonDetail}>MLA: {result.currentMLA}</Text>
                )}
                <View style={[styles.resBadge, { backgroundColor: result.currentReservation === 'GEN' ? '#3B82F620' : result.currentReservation === 'SC' ? '#F59E0B20' : '#10B98120' }]}>
                  <Text style={[styles.resBadgeText, { color: result.currentReservation === 'GEN' ? '#3B82F6' : result.currentReservation === 'SC' ? '#F59E0B' : '#10B981' }]}>
                    {result.currentReservation}
                  </Text>
                </View>
              </View>

              <Ionicons name="arrow-forward" size={20} color="#6B7280" />

              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>Proposed</Text>
                <Text style={styles.comparisonName}>{result.proposedAcName ?? 'TBD'}</Text>
                {result.proposedAcNo && (
                  <Text style={styles.comparisonDetail}>AC #{result.proposedAcNo}</Text>
                )}
                <View style={[styles.changeBadge, { backgroundColor: BOUNDARY_CHANGE_CONFIG[result.changeType].color + '20' }]}>
                  <Text style={[styles.changeBadgeText, { color: BOUNDARY_CHANGE_CONFIG[result.changeType].color }]}>
                    {BOUNDARY_CHANGE_CONFIG[result.changeType].label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Result: Not yet available */}
        {showSubscribe && !result && (
          <View style={styles.pendingCard}>
            <Ionicons name="hourglass" size={36} color="#F59E0B" />
            <Text style={styles.pendingTitle}>Impact Not Yet Available</Text>
            <Text style={styles.pendingDesc}>
              Delimitation proposals haven't been published yet. Once the Delimitation Commission
              releases draft boundaries, we'll calculate the exact impact for your PIN code.
            </Text>

            <View style={styles.statusRow}>
              <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                Current Status: {statusConfig.label}
              </Text>
            </View>

            {/* Subscribe to alerts */}
            <Pressable style={styles.subscribeBtn}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
              <Text style={styles.subscribeBtnText}>Notify Me When Available</Text>
            </Pressable>

            <Text style={styles.subscribeNote}>
              We'll send a push notification the moment impact data becomes available for your area.
            </Text>
          </View>
        )}

        {/* State Projection Card */}
        {stateProjection && (
          <View style={styles.stateCard}>
            <Text style={styles.stateCardTitle}>
              Your State: {stateProjection.stateName}
            </Text>
            <View style={styles.stateStatsRow}>
              <View style={styles.stateStat}>
                <Text style={styles.stateStatValue}>{stateProjection.currentSeats}</Text>
                <Text style={styles.stateStatLabel}>Current Seats</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#6B7280" />
              <View style={styles.stateStat}>
                <Text style={[styles.stateStatValue, {
                  color: stateProjection.seatChange > 0 ? '#10B981' :
                    stateProjection.seatChange < 0 ? '#EF4444' : '#9CA3AF'
                }]}>
                  {stateProjection.projectedSeats}
                </Text>
                <Text style={styles.stateStatLabel}>Projected</Text>
              </View>
              <View style={styles.stateStat}>
                <Text style={[styles.stateStatValue, {
                  color: stateProjection.seatChange > 0 ? '#10B981' :
                    stateProjection.seatChange < 0 ? '#EF4444' : '#6B7280'
                }]}>
                  {stateProjection.seatChange > 0 ? '+' : ''}{stateProjection.seatChange}
                </Text>
                <Text style={styles.stateStatLabel}>Change</Text>
              </View>
            </View>
            <Text style={styles.stateCardNote}>
              Pop: {formatPopulation(stateProjection.totalPopulation)} · Based on Census 2011
            </Text>
          </View>
        )}

        {/* What we'll show when data is available */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="diamond" size={20} color="#8B5CF6" />
          <Text style={styles.comingSoonTitle}>Coming When Proposals Publish</Text>
          <Text style={styles.comingSoonItem}>• Your old vs new constituency name & boundaries</Text>
          <Text style={styles.comingSoonItem}>• MLA impact — does your current MLA stay?</Text>
          <Text style={styles.comingSoonItem}>• Reservation change (GEN/SC/ST)</Text>
          <Text style={styles.comingSoonItem}>• Population & voter count of new constituency</Text>
          <Text style={styles.comingSoonItem}>• Overlap map showing boundary changes</Text>
          <Text style={styles.comingSoonItem}>• Political impact for all parties in your area</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            All projections are simulations based on Census 2011 data.
            Actual delimitation will use Census 2026 data and may follow different methodology.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
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
    backgroundColor: '#1F2937',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Hero
  heroCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  heroTitle: {
    fontSize: 17, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginTop: 10, lineHeight: 22,
  },
  heroDesc: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    marginTop: 8, lineHeight: 18,
  },

  // Input
  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: 4, borderWidth: 1, borderColor: '#1F2937',
  },
  searchBtn: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#4F8EF7',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnDisabled: { backgroundColor: '#374151' },
  useHomeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingVertical: 6,
  },
  useHomeText: { fontSize: 13, color: '#4F8EF7', fontWeight: '600' },

  // Result
  resultCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultSeverity: { fontSize: 15, fontWeight: '800' },
  resultSummary: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, marginBottom: 14 },
  comparisonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0D1117', borderRadius: 10, padding: 12,
  },
  comparisonCol: { flex: 1, alignItems: 'center' },
  comparisonLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  comparisonName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  comparisonDetail: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  resBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6,
  },
  resBadgeText: { fontSize: 10, fontWeight: '800' },
  changeBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6,
  },
  changeBadgeText: { fontSize: 10, fontWeight: '800' },

  // Pending
  pendingCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  pendingTitle: { fontSize: 17, fontWeight: '800', color: '#F59E0B', marginTop: 10 },
  pendingDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: '#1F2937', borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F8EF7', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 16,
  },
  subscribeBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  subscribeNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 },

  // State card
  stateCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  stateCardTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  stateStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  stateStat: { alignItems: 'center' },
  stateStatValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  stateStatLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 2 },
  stateCardNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 },

  // Coming soon
  comingSoonCard: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#8B5CF630',
  },
  comingSoonTitle: { fontSize: 14, fontWeight: '800', color: '#8B5CF6', marginTop: 6, marginBottom: 10 },
  comingSoonItem: { fontSize: 13, color: '#9CA3AF', lineHeight: 22 },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 10,
    padding: 10, gap: 6,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
