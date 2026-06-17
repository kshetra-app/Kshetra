import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useElectionLiveStore } from '../../stores/electionLive';
import LiveElectionTicker from '../../components/LiveElectionTicker';
import ConstituencyResultCard from '../../components/ConstituencyResultCard';
import DataPipelineCard from '../../components/DataPipelineCard';

type Tab = 'overview' | 'constituencies' | 'pipeline';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'bar-chart' },
  { key: 'constituencies', label: 'Constituencies', icon: 'list' },
  { key: 'pipeline', label: 'Data Pipeline', icon: 'git-network' },
];

export default function LiveElectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const store = useElectionLiveStore();
  const liveElection = useMemo(() => store.getLiveElection(), [store]);
  const pipeline = store.pipelineStatus;
  const pipelineHealth = useMemo(() => store.getPipelineHealth(), [store]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    store.refreshPipelineStatus();
    setTimeout(() => setRefreshing(false), 1000);
  }, [store]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Live Election</Text>
          <Text style={styles.headerSub}>Real-Time Counting & Data Pipeline</Text>
        </View>
        {liveElection?.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDotHeader} />
            <Text style={styles.liveTextHeader}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F8EF7" />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            {liveElection ? (
              <LiveElectionTicker election={liveElection} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="radio" size={48} color="#4B5563" />
                <Text style={styles.emptyTitle}>No Live Election</Text>
                <Text style={styles.emptyText}>Live election data will appear here when counting is in progress.</Text>
              </View>
            )}

            {/* Vote share comparison */}
            {liveElection && (
              <View style={styles.voteShareCard}>
                <Text style={styles.voteShareTitle}>Vote Share Comparison</Text>
                {liveElection.partyWise.map((t) => (
                  <View key={t.party} style={styles.voteShareRow}>
                    <View style={[styles.partyDot, { backgroundColor: t.partyColor }]} />
                    <Text style={styles.partyLabel}>{t.party}</Text>
                    <View style={styles.voteShareBars}>
                      <View style={[styles.voteShareCurrent, { width: `${Math.min(t.voteSharePercent * 2, 100)}%`, backgroundColor: t.partyColor }]} />
                      <View style={[styles.voteSharePrev, { width: `${Math.min(t.previousVoteShare * 2, 100)}%` }]} />
                    </View>
                    <Text style={styles.voteSharePct}>{t.voteSharePercent}%</Text>
                    <Text style={[styles.voteShareChange, { color: t.voteShareChange >= 0 ? '#10B981' : '#EF4444' }]}>
                      {t.voteShareChange >= 0 ? '+' : ''}{t.voteShareChange.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'constituencies' && (
          <>
            {liveElection ? (
              <>
                <Text style={styles.sectionTitle}>Constituency Results ({liveElection.constituencies.length})</Text>
                {liveElection.constituencies.map((c) => (
                  <ConstituencyResultCard key={c.acNo} result={c} />
                ))}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No constituency data available</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'pipeline' && (
          <>
            <View style={styles.healthSummary}>
              <View style={[styles.healthDot, { backgroundColor: pipelineHealth.overallStatus === 'healthy' ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.healthText, { color: pipelineHealth.overallStatus === 'healthy' ? '#10B981' : '#EF4444' }]}>
                System {pipelineHealth.overallStatus}: {pipelineHealth.healthy}/{pipelineHealth.total} sources healthy
              </Text>
            </View>
            <DataPipelineCard pipeline={pipeline} onRefresh={store.refreshPipelineStatus} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDotHeader: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTextHeader: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabActive: { backgroundColor: '#4F8EF715', borderWidth: 1, borderColor: '#4F8EF740' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#4F8EF7', fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginHorizontal: 40 },
  voteShareCard: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  voteShareTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  voteShareRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  partyDot: { width: 8, height: 8, borderRadius: 4 },
  partyLabel: { fontSize: 11, fontWeight: '700', color: '#D1D5DB', width: 40 },
  voteShareBars: { flex: 1, height: 8, backgroundColor: '#1F2937', borderRadius: 4, overflow: 'hidden' },
  voteShareCurrent: { height: '100%', borderRadius: 4 },
  voteSharePrev: { height: '100%', backgroundColor: '#FFFFFF20', borderRadius: 4, position: 'absolute', top: 0, left: 0 },
  voteSharePct: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', width: 36, textAlign: 'right' },
  voteShareChange: { fontSize: 10, fontWeight: '700', width: 36, textAlign: 'right' },
  healthSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937' },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  healthText: { fontSize: 13, fontWeight: '700' },
});
