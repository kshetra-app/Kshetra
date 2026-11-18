import { useState, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { useDelimitationStore } from '../../stores/delimitation';
import { DELIMITATION_STATUS_CONFIG } from '../../lib/delimitationTypes';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

export default function MyImpactScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [helpVisible, setHelpVisible] = useState(false);

  const nationalStatus = useDelimitationStore((s) => s.nationalStatus);
  const statusAvailable = useDelimitationStore((s) => s.statusAvailable);
  const statusLabel = useDelimitationStore((s) => s.statusLabel);
  const statusDescription = useDelimitationStore((s) => s.statusDescription);
  const refreshOfficialData = useDelimitationStore((s) => s.refreshOfficialData);

  const statusConfig = nationalStatus
    ? DELIMITATION_STATUS_CONFIG[nationalStatus]
    : { label: t('common.dataUnavailable'), color: colors.textMuted, icon: 'help-circle-outline' };

  useFocusEffect(
    useCallback(() => {
      void refreshOfficialData();
    }, [refreshOfficialData]),
  );

  const openOfficialCensus = () => {
    void Linking.openURL('https://censusindia.gov.in/census.website/en').catch(() => {
      Alert.alert(
        t('common.error', { defaultValue: 'Unable to open link' }),
        t('delimitationExtended.officialSourceOpenError', { defaultValue: 'Open the Census of India website in your browser to view its latest official updates.' }),
      );
    });
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
        <Pressable
          accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
          style={[styles.backBtn, { backgroundColor: colors.surfaceElevated, marginLeft: 8 }]}
          onPress={() => setHelpVisible(true)}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="map-outline" size={40} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t('delimitationExtended.verifiedImpactUnavailableTitle')}
          </Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            {t('delimitationExtended.verifiedImpactUnavailableBody')}
          </Text>
        </View>

        <View style={[styles.subscribeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={statusConfig.icon as any} size={28} color={statusConfig.color} />
          <Text style={[styles.subscribeTitle, { color: colors.text }]}>
            {t('common.status')}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.liveDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusAvailable && statusLabel ? statusLabel : t('common.dataUnavailable')}
            </Text>
          </View>
          {statusAvailable && statusDescription ? (
            <Text style={[styles.subscribeDesc, { color: colors.textSecondary }]}>
              {statusDescription}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="link"
            style={[styles.subscribeBtn, { backgroundColor: colors.primary }]}
            onPress={openOfficialCensus}
          >
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
            <Text style={styles.subscribeBtnText}>
              {t('common.learnMore')} · Census of India
            </Text>
          </Pressable>
        </View>

        <View style={[styles.comingSoonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            {t('delimitation.constitutionalFramework', { defaultValue: 'Constitutional Framework & Citizen Rights' })}
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            {t('delimitation.art170Desc')}
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            {t('delimitation.art330Desc')}
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            {t('delimitation.publicObjectionDesc')}
          </Text>
          <Text style={[styles.comingSoonItem, { color: colors.textSecondary }]}>
            {t('delimitation.contiguityDesc')}
          </Text>
        </View>      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="delimitation-impact"
      />
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
  liveDot: { width: 8, height: 8, borderRadius: 4 },
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
