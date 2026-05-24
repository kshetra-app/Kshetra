import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaignStore } from '../../stores/campaign';
import CampaignDashboardCard from '../../components/CampaignDashboardCard';
import AdPerformanceCard from '../../components/AdPerformanceCard';
import RevenueCard from '../../components/RevenueCard';

type Tab = 'campaigns' | 'ads' | 'revenue' | 'booths';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'campaigns', label: 'Campaigns', icon: 'flag' },
  { key: 'ads', label: 'Ads', icon: 'megaphone' },
  { key: 'revenue', label: 'Revenue', icon: 'cash' },
  { key: 'booths', label: 'Booths', icon: 'location' },
];

export default function CampaignManagerScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaigns = useCampaignStore((s) => s.getActiveCampaigns());
  const activeAds = useCampaignStore((s) => s.getActiveAds());
  const allAds = useCampaignStore((s) => s.ads);
  const revenueData = useCampaignStore((s) => s.getRevenueFlow());
  const booths = useCampaignStore((s) => s.booths);
  const volunteers = useCampaignStore((s) => s.volunteers);
  const pauseAd = useCampaignStore((s) => s.pauseAd);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Campaign Manager', headerShown: true, headerStyle: { backgroundColor: '#0A0A1A' }, headerTintColor: '#FFFFFF' }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F8EF7" />}>
        {activeTab === 'campaigns' && (
          <>
            {/* Summary bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{activeCampaigns.length}</Text>
                <Text style={styles.summaryLabel}>Active</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{campaigns.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{volunteers.length}</Text>
                <Text style={styles.summaryLabel}>Volunteers</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{booths.length}</Text>
                <Text style={styles.summaryLabel}>Booths</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Active Campaigns</Text>
            {activeCampaigns.map((c) => (
              <CampaignDashboardCard key={c.id} campaign={c} />
            ))}

            {campaigns.filter((c) => c.status !== 'active').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Other Campaigns</Text>
                {campaigns.filter((c) => c.status !== 'active').map((c) => (
                  <CampaignDashboardCard key={c.id} campaign={c} />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'ads' && (
          <>
            <Text style={styles.sectionTitle}>Active Ads ({activeAds.length})</Text>
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
            <Text style={styles.sectionTitle}>Booth Strategy ({booths.length} booths)</Text>
            {booths.map((b) => (
              <View key={b.id} style={styles.boothCard}>
                <View style={styles.boothHeader}>
                  <View>
                    <Text style={styles.boothName}>{b.boothName}</Text>
                    <Text style={styles.boothMeta}>Booth #{b.boothNumber} · AC #{b.constituencyAcNo} · Ward {b.wardNo}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: b.priority === 'critical' ? '#EF444420' : b.priority === 'high' ? '#F59E0B20' : '#6B728020' }]}>
                    <Text style={[styles.priorityText, { color: b.priority === 'critical' ? '#EF4444' : b.priority === 'high' ? '#F59E0B' : '#6B7280' }]}>{b.priority.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.boothStats}>
                  <Text style={styles.boothStat}>Voters: {b.totalVoters}</Text>
                  <Text style={styles.boothStat}>Target: {b.targetVotes}</Text>
                  <Text style={styles.boothStat}>Support: {b.supportEstimate}%</Text>
                  <Text style={styles.boothStat}>Canvas: {b.canvassingCompletion}%</Text>
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
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabActive: { backgroundColor: '#4F8EF715', borderWidth: 1, borderColor: '#4F8EF740' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#4F8EF7', fontWeight: '700' },
  content: { flex: 1 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  summaryLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  boothCard: { backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  boothHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  boothName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  boothMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: '800' },
  boothStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  boothStat: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  boothNotes: { fontSize: 11, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
});
