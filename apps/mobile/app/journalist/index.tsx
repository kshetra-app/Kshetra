import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournalistStore } from '../../stores/journalist';
import ArticleCard from '../../components/ArticleCard';
import FactCheckCard from '../../components/FactCheckCard';
import BreakingNewsBanner from '../../components/BreakingNewsBanner';
import JournalistProfileCard from '../../components/JournalistProfileCard';

type Tab = 'feed' | 'fact_checks' | 'breaking' | 'journalists';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'feed', label: 'Feed', icon: 'newspaper' },
  { key: 'fact_checks', label: 'Fact Check', icon: 'checkmark-circle' },
  { key: 'breaking', label: 'Breaking', icon: 'flash' },
  { key: 'journalists', label: 'Journalists', icon: 'people' },
];

export default function JournalistDashboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const articles = useJournalistStore((s) => s.articles);
  const factChecks = useJournalistStore((s) => s.factChecks);
  const breakingNewsRaw = useJournalistStore((s) => s.breakingNews);
  const journalists = useJournalistStore((s) => s.journalists);

  const publishedArticles = useMemo(() => {
    return articles
      .filter((a) => a.status === 'published')
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
  }, [articles]);

  const editorPicks = useMemo(() => {
    return articles.filter((a) => a.isEditorPick && a.status === 'published');
  }, [articles]);

  const breakingNews = useMemo(() => {
    return breakingNewsRaw.filter((b) => b.isActive && new Date(b.expiresAt).getTime() > Date.now());
  }, [breakingNewsRaw]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Newsroom', headerShown: true, headerStyle: { backgroundColor: '#0A0A1A' }, headerTintColor: '#FFFFFF' }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {tab.key === 'breaking' && breakingNews.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{breakingNews.length}</Text></View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F8EF7" />}>
        {activeTab === 'feed' && (
          <>
            {/* Editor's Picks */}
            {editorPicks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Editor's Picks</Text>
                {editorPicks.slice(0, 2).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Latest Articles</Text>
            {publishedArticles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </>
        )}

        {activeTab === 'fact_checks' && (
          <>
            <Text style={styles.sectionTitle}>Recent Fact Checks</Text>
            {factChecks.map((fc) => (
              <FactCheckCard key={fc.id} factCheck={fc} />
            ))}
          </>
        )}

        {activeTab === 'breaking' && (
          <>
            <Text style={styles.sectionTitle}>Breaking News</Text>
            {breakingNews.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flash-off" size={40} color="#4B5563" />
                <Text style={styles.emptyText}>No breaking news right now</Text>
              </View>
            ) : (
              breakingNews.map((bn) => (
                <BreakingNewsBanner key={bn.id} item={bn} />
              ))
            )}
          </>
        )}

        {activeTab === 'journalists' && (
          <>
            <Text style={styles.sectionTitle}>Top Journalists</Text>
            {journalists.map((j) => (
              <JournalistProfileCard key={j.id} journalist={j} />
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
  badge: { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 8 },
});
