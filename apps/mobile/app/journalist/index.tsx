import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournalistStore } from '../../stores/journalist';
import ArticleCard from '../../components/ArticleCard';
import FactCheckCard from '../../components/FactCheckCard';
import BreakingNewsBanner from '../../components/BreakingNewsBanner';
import JournalistProfileCard from '../../components/JournalistProfileCard';
import { useResponsive } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

type JournalistTab = 'news' | 'factcheck' | 'breaking' | 'journalists';

const TAB_KEYS: { key: JournalistTab; icon: string; i18nKey: string }[] = [
  { key: 'news', icon: 'newspaper', i18nKey: 'journalist.tabs.news' },
  { key: 'breaking', icon: 'flash', i18nKey: 'journalist.tabs.breaking' },
  { key: 'factcheck', icon: 'shield-checkmark', i18nKey: 'journalist.tabs.factcheck' },
  { key: 'journalists', icon: 'people', i18nKey: 'journalist.tabs.journalists' },
];

export default function JournalistDashboardScreen() {
  const { t } = useTranslation();
  const { insets } = useResponsive();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<JournalistTab>('news');
  const [refreshing, setRefreshing] = useState(false);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('journalist.screenTitle'), headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />

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
            {tab.key === 'breaking' && breakingNews.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{breakingNews.length}</Text></View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {activeTab === 'news' && (
          <>
            {/* Editor's Picks */}
            {editorPicks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('journalist.editorsPicks')}</Text>
                {editorPicks.slice(0, 2).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>{t('journalist.latestArticles')}</Text>
            {publishedArticles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </>
        )}

        {activeTab === 'factcheck' && (
          <>
            <Text style={styles.sectionTitle}>{t('journalist.recentFactChecks')}</Text>
            {factChecks.map((fc) => (
              <FactCheckCard key={fc.id} factCheck={fc} />
            ))}
          </>
        )}

        {activeTab === 'breaking' && (
          <>
            <Text style={styles.sectionTitle}>{t('journalist.breakingNews')}</Text>
            {breakingNews.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flash-off" size={40} color="#4B5563" />
                <Text style={styles.emptyText}>{t('journalist.noBreakingNews')}</Text>
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
            <Text style={styles.sectionTitle}>{t('journalist.topJournalists')}</Text>
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
  container: { flex: 1 },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  badge: { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 8 },
});
