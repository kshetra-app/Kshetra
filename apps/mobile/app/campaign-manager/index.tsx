import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaignStore } from '../../stores/campaign';
import CampaignDashboardCard from '../../components/CampaignDashboardCard';
import AdPerformanceCard from '../../components/AdPerformanceCard';
import RevenueCard from '../../components/RevenueCard';
import CampaignOutreachPanel from '../../components/CampaignOutreachPanel';
import { useResponsive } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

type CampaignTab = 'campaigns' | 'outreach' | 'ads' | 'revenue' | 'booths' | 'volunteers';

const TAB_KEYS: { key: CampaignTab; icon: string; i18nKey: string }[] = [
  { key: 'campaigns', icon: 'flag', i18nKey: 'campaignManager.tabs.campaigns' },
  { key: 'ads', icon: 'megaphone', i18nKey: 'campaignManager.tabs.ads' },
  { key: 'revenue', icon: 'cash', i18nKey: 'campaignManager.tabs.revenue' },
  { key: 'volunteers', icon: 'people', i18nKey: 'campaignManager.tabs.volunteers' },
  { key: 'booths', icon: 'location', i18nKey: 'campaignManager.tabs.booths' },
];

export default function CampaignManagerScreen() {
  const { t } = useTranslation();
  const { insets } = useResponsive();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<CampaignTab>('campaigns');
  const [refreshing, setRefreshing] = useState(false);

  const campaigns = useCampaignStore((s) => s.campaigns);
  const allAds = useCampaignStore((s) => s.ads);
  const revenueData = useCampaignStore((s) => s.revenueData);
  const booths = useCampaignStore((s) => s.booths);
  const volunteers = useCampaignStore((s) => s.volunteers);
  const pauseAd = useCampaignStore((s) => s.pauseAd);

  const activeCampaigns = useMemo(() => {
    return campaigns.filter((c) => c.status === 'active');
  }, [campaigns]);

  const activeAds = useMemo(() => {
    return allAds.filter((ad) => ad.status === 'active');
  }, [allAds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('campaignManager.screenTitle'), headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TAB_KEYS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 },
              activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFFFFF', fontWeight: '700' }]}>{t(tab.i18nKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {activeTab === 'campaigns' && (
          <>
            {/* Summary bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{activeCampaigns.length}</Text>
                <Text style={styles.summaryLabel}>{t('campaignManager.active')}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{campaigns.length}</Text>
                <Text style={styles.summaryLabel}>{t('campaignManager.total')}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{volunteers.length}</Text>
                <Text style={styles.summaryLabel}>{t('campaignManager.volunteers')}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{booths.length}</Text>
                <Text style={styles.summaryLabel}>{t('campaignManager.booths')}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('campaignManager.activeCampaigns')}</Text>
            {activeCampaigns.map((c) => (
              <CampaignDashboardCard key={c.id} campaign={c} />
            ))}

            {campaigns.filter((c) => c.status !== 'active').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('campaignManager.otherCampaigns')}</Text>
                {campaigns.filter((c) => c.status !== 'active').map((c) => (
                  <CampaignDashboardCard key={c.id} campaign={c} />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'outreach' && <CampaignOutreachPanel />}

        {activeTab === 'ads' && (
          <>
            <Text style={styles.sectionTitle}>{t('campaignManager.activeAds', { count: activeAds.length })}</Text>
            {allAds.map((ad) => (
              <AdPerformanceCard key={ad.id} ad={ad} onPause={ad.status === 'active' ? () => pauseAd(ad.id) : undefined} />
            ))}
          </>
        )}

        {activeTab === 'revenue' && (
          <RevenueCard data={revenueData} />
        )}

        {activeTab === 'booths' && (
          <>
            <Text style={styles.sectionTitle}>{t('campaignManager.boothStrategy', { count: booths.length })}</Text>
            {booths.map((b) => (
              <View key={b.id} style={styles.boothCard}>
                <View style={styles.boothHeader}>
                  <View>
                    <Text style={styles.boothName}>{b.boothName}</Text>
                    <Text style={styles.boothMeta}>{t('campaignManager.boothMeta', { boothNumber: b.boothNumber, acNo: b.constituencyAcNo, wardNo: b.wardNo })}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: b.priority === 'critical' ? '#EF444420' : b.priority === 'high' ? '#F59E0B20' : '#6B728020' }]}>
                    <Text style={[styles.priorityText, { color: b.priority === 'critical' ? '#EF4444' : b.priority === 'high' ? '#F59E0B' : '#6B7280' }]}>{b.priority.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.boothStats}>
                  <Text style={styles.boothStat}>{t('campaignManager.voters', { count: b.totalVoters })}</Text>
                  <Text style={styles.boothStat}>{t('campaignManager.target', { count: b.targetVotes })}</Text>
                  <Text style={styles.boothStat}>{t('campaignManager.support', { pct: b.supportEstimate })}</Text>
                  <Text style={styles.boothStat}>{t('campaignManager.canvas', { pct: b.canvassingCompletion })}</Text>
                </View>
                {b.notes && <Text style={styles.boothNotes}>{b.notes}</Text>}
              </View>
            ))}
          </>
        )}

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  content: { flex: 1 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  boothCard: { borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1 },
  boothHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  boothName: { fontSize: 14, fontWeight: '700' },
  boothMeta: { fontSize: 11, marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: '800' },
  boothStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  boothStat: { fontSize: 11, fontWeight: '600' },
  boothNotes: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },
});
