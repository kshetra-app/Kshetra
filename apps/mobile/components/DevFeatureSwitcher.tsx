import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeatureFlagsStore } from '../lib/featureFlags';
import { useTheme } from '../lib/theme';
import type { AppFeatureFlags } from '@kshetra/shared';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FlagGroup {
  title: string;
  phase: string;
  items: {
    key: keyof AppFeatureFlags;
    label: string;
    description: string;
  }[];
}

const FLAG_GROUPS: FlagGroup[] = [
  {
    title: 'Phase 1: Core Civic Foundation',
    phase: 'MVP',
    items: [
      {
        key: 'enableMap',
        label: 'Constituency Map',
        description: 'Interactive boundaries & party color overlays',
      },
      {
        key: 'enableExploreSearch',
        label: 'Search & Directory',
        description: 'MLA profiles, candidate dossiers & demographics',
      },
      {
        key: 'enableElectionHistory',
        label: 'Election History',
        description: 'Historical multi-cycle results & stronghold tracking',
      },
      {
        key: 'enableTriviaEngine',
        label: 'Political Trivia',
        description: 'Curated Did You Know facts on revisiting',
      },
      {
        key: 'enableMultiLanguage',
        label: 'Multi-Language i18n',
        description: '10+ native Indian languages',
      },
    ],
  },
  {
    title: 'Phase 2: Civic Engagement',
    phase: 'Community',
    items: [
      {
        key: 'enableFeed',
        label: 'Community Feed',
        description: 'Posts, verified polls & discussions',
      },
      {
        key: 'enableCivicDashboard',
        label: 'Civic Dashboard',
        description: 'Issue reporting, ward sentiment & budgets',
      },
      {
        key: 'enableNotifications',
        label: 'Push Notifications',
        description: 'Breaking alerts & live updates',
      },
    ],
  },
  {
    title: 'Phase 3: Media & Video Experience',
    phase: 'Media',
    items: [
      {
        key: 'enableLiveTab',
        label: 'Live Media Exchange (LMX)',
        description: 'WebRTC-WHIP live broadcasts & feeds',
      },
      {
        key: 'enableNewsTab',
        label: 'News Aggregator',
        description: 'Geo-tagged RSS feeds with reader',
      },
      {
        key: 'enableShortsTab',
        label: 'Political Shorts',
        description: 'Vertical video reel feed',
      },
    ],
  },
  {
    title: 'Phase 4: Delimitation & Deep Analytics',
    phase: 'Intelligence',
    items: [
      {
        key: 'enableDelimitation',
        label: 'Delimitation Simulator',
        description: 'Post-census redistricting projections',
      },
      {
        key: 'enableDeepAnalytics',
        label: 'KSHETRA Pulse Core',
        description: 'Anti-incumbency vulnerability & sentiment radar',
      },
    ],
  },
  {
    title: 'Phase 5: Political SaaS & Campaigns',
    phase: 'B2B SaaS',
    items: [
      {
        key: 'enablePoliticianPortal',
        label: 'Politician Portal',
        description: 'Verified legislator identity & manifesto publisher',
      },
      {
        key: 'enableAspirants',
        label: 'Aspirants Onboarding',
        description: 'Candidate KYC & onboarding workflow',
      },
      {
        key: 'enableCampaignManager',
        label: 'Campaign Manager',
        description: 'WhatsApp/SMS outreach panel & field ops',
      },
      {
        key: 'enableLeadershipAcademy',
        label: 'Leadership Academy',
        description: 'Aspirant training courses & certificates',
      },
    ],
  },
  {
    title: 'Phase 6: Enterprise & Institutional',
    phase: 'Enterprise',
    items: [
      {
        key: 'enableInvestorDemo',
        label: 'Investor Demo Hub',
        description: 'Metric showcase & moat visualizations',
      },
      {
        key: 'enableEnterpriseApis',
        label: 'Enterprise API Gateway',
        description: 'B2B/B2G API suite & usage metering',
      },
    ],
  },
];

export function DevFeatureSwitcher({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const flags = useFeatureFlagsStore();
  const setFlag = useFeatureFlagsStore((s) => s.setFlag);
  const resetFlags = useFeatureFlagsStore((s) => s.resetFlags);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="toggle" size={14} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>DEV CONTROL</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Feature Switches</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Toggle features on or off in real-time. Changes take effect instantly without restarting the app.
          </Text>

          {FLAG_GROUPS.map((group, gIdx) => (
            <View key={gIdx} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                <View style={[styles.phasePill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.phaseText, { color: colors.primary }]}>{group.phase}</Text>
                </View>
              </View>

              {group.items.map((item, iIdx) => {
                const isEnabled = !!flags[item.key];
                return (
                  <View
                    key={item.key}
                    style={[
                      styles.itemRow,
                      iIdx < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.description}</Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={(val) => setFlag(item.key, val)}
                      trackColor={{ false: '#E2E8F0', true: colors.primary }}
                      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                    />
                  </View>
                );
              })}
            </View>
          ))}

          {/* Reset All */}
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: colors.danger, backgroundColor: colors.surface }]}
            onPress={resetFlags}
          >
            <Ionicons name="refresh" size={16} color={colors.danger} />
            <Text style={[styles.resetText, { color: colors.danger }]}>Reset All to Default Settings</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
