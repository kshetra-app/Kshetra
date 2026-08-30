import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useElectionLiveStore } from '../../stores/electionLive';
import LiveElectionTicker from '../../components/LiveElectionTicker';
import ConstituencyResultCard from '../../components/ConstituencyResultCard';
import DataPipelineCard from '../../components/DataPipelineCard';
import { useTheme } from '../../lib/theme';

type Tab = 'overview' | 'constituencies' | 'pipeline';

const TAB_KEYS: { key: Tab; i18nKey: string; icon: string }[] = [
  { key: 'overview', i18nKey: 'liveElection.tabOverview', icon: 'bar-chart' },
  { key: 'constituencies', i18nKey: 'liveElection.tabConstituencies', icon: 'list' },
  { key: 'pipeline', i18nKey: 'liveElection.tabPipeline', icon: 'git-network' },
];

export default function LiveElectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={colors.statusBar} />

      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('liveElection.screenTitle')}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{t('liveElection.screenSubtitle')}</Text>
        </View>
        {liveElection?.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDotHeader} />
            <Text style={styles.liveTextHeader}>{t('liveElection.live')}</Text>
          </View>
        )}
      </View>

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
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={15} color={activeTab === tab.key ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFFFFF', fontWeight: '700' }]}>{t(tab.i18nKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            {liveElection ? (
              <LiveElectionTicker election={liveElection} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="radio" size={48} color="#4B5563" />
                <Text style={styles.emptyTitle}>{t('liveElection.noLiveElection')}</Text>
                <Text style={styles.emptyText}>{t('liveElection.noLiveElectionDesc')}</Text>
              </View>
            )}

            {/* Vote share comparison */}
            {liveElection && (
              <View style={styles.voteShareCard}>
                <Text style={styles.voteShareTitle}>{t('liveElection.voteShareComparison')}</Text>
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
                <Text style={styles.sectionTitle}>{t('liveElection.constituencyResults', { count: liveElection.constituencies.length })}</Text>
                {liveElection.constituencies.map((c) => (
                  <ConstituencyResultCard key={c.acNo} result={c} />
                ))}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('liveElection.noConstituencyData')}</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'pipeline' && (
          <>
            <View style={styles.healthSummary}>
              <View style={[styles.healthDot, { backgroundColor: pipelineHealth.overallStatus === 'healthy' ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.healthText, { color: pipelineHealth.overallStatus === 'healthy' ? '#10B981' : '#EF4444' }]}>
                {t('liveElection.systemHealth', { status: pipelineHealth.overallStatus, healthy: pipelineHealth.healthy, total: pipelineHealth.total })}
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSub: { fontSize: 11, fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDotHeader: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTextHeader: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 4, marginHorizontal: 40 },
  voteShareCard: { borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1 },
  voteShareTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  voteShareRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  partyDot: { width: 8, height: 8, borderRadius: 4 },
  partyLabel: { fontSize: 11, fontWeight: '700', width: 40 },
  voteShareBars: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  voteShareCurrent: { height: '100%', borderRadius: 4 },
  voteSharePrev: { height: '100%', borderRadius: 4, position: 'absolute', top: 0, left: 0 },
  voteSharePct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  voteShareChange: { fontSize: 10, fontWeight: '700', width: 36, textAlign: 'right' },
  healthSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  healthText: { fontSize: 13, fontWeight: '700' },
});
