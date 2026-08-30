import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { useTheme } from '../../lib/theme';

export default function MyImpactScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pinCode, setPinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CitizenImpact | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const myHome = useMyConstituencyStore((s) => s.home);
  const activeState = useActiveStateStore((s) => s.stateCode);
  const nationalStatus = useDelimitationStore((s) => s.nationalStatus);
  const getCitizenImpact = useDelimitationStore((s) => s.getCitizenImpact);
  const getCitizenImpactForConstituency = useDelimitationStore((s) => s.getCitizenImpactForConstituency);

  const stateProjection = useMemo(
    () => computeStateSeatAllocation(activeState),
    [activeState],
  );

  const statusConfig = DELIMITATION_STATUS_CONFIG[nationalStatus];

  const handleSearch = (overridePin?: string) => {
    const targetPin = overridePin ?? pinCode;
    if (targetPin.length !== 6 || !/^\d{6}$/.test(targetPin)) return;

    if (overridePin) setPinCode(overridePin);
    setSearching(true);

    const impact = getCitizenImpact(targetPin);
    if (impact) {
      setResult(impact);
      setShowSubscribe(false);
    } else {
      setShowSubscribe(true);
    }
    setSearching(false);
  };

  const handleUseMyLocation = () => {
    if (myHome) {
      const impact = getCitizenImpactForConstituency(activeState, myHome.acNo);
      setResult(impact);
      setPinCode(impact.pinCode);
      setShowSubscribe(false);
    }
  };

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
            {t('delimitationExtended.whatChangesForYou', { defaultValue: 'What Changes For You' })}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {t('delimitationExtended.personalImpact', { defaultValue: 'Personal delimitation impact' })}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero explanation */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="person-circle" size={40} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t('delimitationExtended.heroImpactTitle', { defaultValue: 'How will delimitation affect YOUR constituency?' })}
          </Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            {t('delimitationExtended.heroImpactDesc', { defaultValue: 'Enter your PIN code or use your saved constituency to see how boundary changes may impact your area — your MLA, your constituency name, and your reservation status.' })}
          </Text>
        </View>

        {/* PIN Code Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            {t('delimitationExtended.enterPinCode', { defaultValue: 'Enter your PIN Code' })}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="500001"
              placeholderTextColor={colors.textMuted}
              value={pinCode}
              onChangeText={(text) => setPinCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[styles.searchBtn, { backgroundColor: colors.primary }, pinCode.length !== 6 && styles.searchBtnDisabled]}
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
              <Ionicons name="home" size={14} color={colors.primary} />
              <Text style={[styles.useHomeText, { color: colors.primary }]}>
                {t('delimitationExtended.useMyConstituency', { name: myHome.name, defaultValue: `Use my constituency: ${myHome.name}` })}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Result: Impact found */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Ionicons name="alert-circle" size={20} color={IMPACT_SEVERITY_CONFIG[result.impactSeverity].color} />
              <Text style={[styles.resultSeverity, { color: IMPACT_SEVERITY_CONFIG[result.impactSeverity].color }]}>
                {IMPACT_SEVERITY_CONFIG[result.impactSeverity].label}
              </Text>
            </View>

            <Text style={[styles.resultSummary, { color: colors.text }]}>
              {buildCitizenImpactSummary(result)}
            </Text>

            {/* Current → Proposed */}
            <View style={[styles.comparisonRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.comparisonCol}>
                <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                  {t('delimitationExtended.current', { defaultValue: 'Current' })}
                </Text>
                <Text style={[styles.comparisonName, { color: colors.text }]}>{result.currentAcName}</Text>
                <Text style={[styles.comparisonDetail, { color: colors.textSecondary }]}>AC #{result.currentAcNo}</Text>
                {result.currentMLA && (
                  <Text style={[styles.comparisonDetail, { color: colors.textSecondary }]}>MLA: {result.currentMLA}</Text>
                )}
                <View style={[styles.resBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.resBadgeText, { color: colors.primary }]}>
                    {result.currentReservation}
                  </Text>
                </View>
              </View>

              <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />

              <View style={styles.comparisonCol}>
                <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                  {t('delimitationExtended.proposed', { defaultValue: 'Proposed' })}
                </Text>
                <Text style={[styles.comparisonName, { color: colors.text }]}>{result.proposedAcName ?? 'TBD'}</Text>
                <Text style={[styles.comparisonDetail, { color: colors.textSecondary }]}>
                  {result.proposedAcNo ? `AC #${result.proposedAcNo}` : 'TBD'}
                </Text>
                <View style={[styles.resBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.resBadgeText, { color: colors.primary }]}>
                    {result.proposedReservation ?? 'TBD'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Change detail badges */}
            <View style={styles.changeBadgesRow}>
              {result.changeType && BOUNDARY_CHANGE_CONFIG[result.changeType] && (
                <View style={[styles.changeTypeBadge, { backgroundColor: BOUNDARY_CHANGE_CONFIG[result.changeType].color + '20' }]}>
                  <Text style={[styles.changeTypeBadgeText, { color: BOUNDARY_CHANGE_CONFIG[result.changeType].color }]}>
                    {BOUNDARY_CHANGE_CONFIG[result.changeType].label}
                  </Text>
                </View>
              )}
            </View>

            {/* Explanation */}
            {result.impactSummary ? (
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                {result.impactSummary}
              </Text>
            ) : null}
          </View>
        )}

        {/* State not yet available / Subscribe */}
        {showSubscribe && !result && (
          <View style={[styles.subscribeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time" size={32} color={colors.primary} />
            <Text style={[styles.subscribeTitle, { color: colors.text }]}>
              {t('delimitationExtended.impactDataSoon', { defaultValue: 'Impact Data Coming Soon' })}
            </Text>
            <Text style={[styles.subscribeDesc, { color: colors.textSecondary }]}>
              {t('delimitationExtended.impactDataSoonDesc', { defaultValue: "Delimitation proposals haven't been published yet. Once the Delimitation Commission releases draft boundaries, we'll calculate the exact impact for your PIN code." })}
            </Text>

            <View style={styles.statusRow}>
              <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {t('delimitationExtended.currentStatus', { status: statusConfig.label, defaultValue: `Current Status: ${statusConfig.label}` })}
              </Text>
            </View>

            {/* Subscribe to alerts */}
            <Pressable style={[styles.subscribeBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
              <Text style={styles.subscribeBtnText}>
                {t('delimitationExtended.notifyMe', { defaultValue: 'Notify Me When Available' })}
              </Text>
            </Pressable>

            <Text style={[styles.subscribeNote, { color: colors.textMuted }]}>
              {t('delimitationExtended.notifyNote', { defaultValue: "We'll send a push notification the moment impact data becomes available for your area." })}
            </Text>
          </View>
        )}

        {/* State Projection Card */}
        {stateProjection && (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.stateCardTitle, { color: colors.text }]}>
              {t('delimitationExtended.yourState', { state: stateProjection.stateName, defaultValue: `Your State: ${stateProjection.stateName}` })}
            </Text>
            <View style={styles.stateStatsRow}>
              <View style={styles.stateStat}>
                <Text style={[styles.stateStatValue, { color: colors.text }]}>{stateProjection.currentSeats}</Text>
                <Text style={[styles.stateStatLabel, { color: colors.textMuted }]}>
                  {t('delimitation.currentSeats', { defaultValue: 'Current Seats' })}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <View style={styles.stateStat}>
                <Text style={[styles.stateStatValue, {
                  color: stateProjection.seatChange > 0 ? '#10B981' :
                    stateProjection.seatChange < 0 ? '#EF4444' : colors.textMuted
                }]}>
                  {stateProjection.projectedSeats}
                </Text>
                <Text style={[styles.stateStatLabel, { color: colors.textMuted }]}>
                  {t('delimitation.projectedSeats', { defaultValue: 'Projected' })}
                </Text>
              </View>
              <View style={styles.stateStat}>
                <Text style={[styles.stateStatValue, {
                  color: stateProjection.seatChange > 0 ? '#10B981' :
                    stateProjection.seatChange < 0 ? '#EF4444' : colors.textMuted
                }]}>
                  {stateProjection.seatChange > 0 ? '+' : ''}{stateProjection.seatChange}
                </Text>
                <Text style={[styles.stateStatLabel, { color: colors.textMuted }]}>
                  {t('delimitationExtended.change', { defaultValue: 'Change' })}
                </Text>
              </View>
            </View>
            <Text style={[styles.stateCardNote, { color: colors.textMuted }]}>
              Pop: {formatPopulation(stateProjection.totalPopulation)} · Based on Census 2011
            </Text>
          </View>
        )}

        {/* Sample PIN codes for quick demonstration */}
        <View style={[styles.sampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sampleTitle, { color: colors.text }]}>Quick Test PIN Codes</Text>
          <Text style={[styles.sampleSub, { color: colors.textSecondary }]}>Tap any PIN code to immediately calculate personal delimitation impact:</Text>
          <View style={styles.sampleChipsRow}>
            {[
              { pin: '500001', label: 'Hyderabad (500001)' },
              { pin: '530001', label: 'Visakhapatnam (530001)' },
              { pin: '560001', label: 'Bengaluru (560001)' },
              { pin: '400001', label: 'Mumbai (400001)' },
              { pin: '110001', label: 'Delhi (110001)' },
              { pin: '600001', label: 'Chennai (600001)' },
              { pin: '800001', label: 'Patna (800001)' },
            ].map((item) => (
              <Pressable
                key={item.pin}
                style={[
                  styles.sampleChip,
                  {
                    backgroundColor: pinCode === item.pin ? colors.primary : colors.surfaceElevated,
                    borderColor: pinCode === item.pin ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSearch(item.pin)}
              >
                <Text
                  style={[
                    styles.sampleChipText,
                    { color: pinCode === item.pin ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Constitutional Framework & Citizen Rights */}
        <View style={[styles.comingSoonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            Constitutional Framework & Citizen Rights
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Article 170</Text>: Mandates that each constituency within a state must have equal population within a strict ±10% deviation bound.
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Articles 330 & 332</Text>: Proportional reservations for Scheduled Castes and Scheduled Tribes based on the latest published Census figures.
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Public Objection Window</Text>: Under Section 9(2) of the Delimitation Act, the Commission must publish draft boundaries and allow citizens to submit objections before final notification.
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Contiguity Requirement</Text>: All redrawn constituencies must be geographically contiguous without enclaves or isolated pockets.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            {t('delimitationExtended.myImpactDisclaimer', { defaultValue: 'All projections are simulations based on Census 2011 data. Actual delimitation will use Census 2026 data and may follow different methodology.' })}
          </Text>
        </View>
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
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero
  heroCard: {
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 17, fontWeight: '800',
    textAlign: 'center', marginTop: 10, lineHeight: 22,
  },
  heroDesc: {
    fontSize: 13, textAlign: 'center',
    marginTop: 8, lineHeight: 18,
  },

  // Input
  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontWeight: '700',
    letterSpacing: 4, borderWidth: 1,
  },
  searchBtn: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  useHomeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingVertical: 6,
  },
  useHomeText: { fontSize: 13, fontWeight: '600' },

  // Result
  resultCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultSeverity: { fontSize: 15, fontWeight: '800' },
  resultSummary: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  comparisonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  comparisonCol: { flex: 1 },
  comparisonLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  comparisonName: { fontSize: 15, fontWeight: '800' },
  comparisonDetail: { fontSize: 12, marginTop: 1 },
  resBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    marginTop: 6,
  },
  resBadgeText: { fontSize: 10, fontWeight: '800' },

  changeBadgesRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  changeTypeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  changeTypeBadgeText: { fontSize: 11, fontWeight: '800' },

  explanationText: { fontSize: 12, marginTop: 10, lineHeight: 16 },

  // Subscribe
  subscribeCard: {
    borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1,
  },
  subscribeTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  subscribeDesc: {
    fontSize: 13, textAlign: 'center',
    marginTop: 8, lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginVertical: 14,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  subscribeBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  subscribeNote: { fontSize: 11, textAlign: 'center', marginTop: 10 },

  // State Card
  stateCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  stateCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  stateStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stateStat: { alignItems: 'center' },
  stateStatValue: { fontSize: 22, fontWeight: '900' },
  stateStatLabel: { fontSize: 11, marginTop: 2 },
  stateCardNote: { fontSize: 11, textAlign: 'center', marginTop: 12 },

  // Coming Soon
  comingSoonCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  comingSoonTitle: { fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  comingSoonItem: { fontSize: 12, lineHeight: 20 },

  // Sample PIN codes
  sampleCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  sampleTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  sampleSub: { fontSize: 11, marginBottom: 10, lineHeight: 15 },
  sampleChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sampleChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  sampleChipText: { fontSize: 11, fontWeight: '700' },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', borderRadius: 10, padding: 12,
    gap: 8, marginBottom: 16, borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 16 },
});
