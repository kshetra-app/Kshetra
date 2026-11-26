import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import { useAuthStore } from '../../stores/auth';
import { LiveStreamCard } from '../../components/LiveStreamCard';
import type { IssueCategory, LiveEvent } from '../../lib/lmxTypes';
import { ISSUE_CATEGORY_CONFIG } from '../../lib/lmxTypes';
import { useTheme } from '../../lib/theme';
import { isInContentPeriod } from '@kshetra/shared';

type FreshnessFilter = 'recent' | 'live' | 'replay' | 'archive';
type CategoryFilter = IssueCategory | 'all';

const CATEGORY_ORDER: CategoryFilter[] = [
  'all',
  'emergency',
  'breaking_news',
  'traffic',
  'weather',
  'civic',
  'general',
];

export interface LiveTabScreenProps {
  hideHeader?: boolean;
  searchQuery?: string;
}

export default function LiveTabScreen({ hideHeader = false, searchQuery = '' }: LiveTabScreenProps = {}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Zustand v5 has no built-in selector memoization, so a selector that returns
  // a fresh array (filter+sort) must be wrapped in useShallow — otherwise every
  // render produces a new reference and React infinite-loops (crashes in release).
  const events = useLiveExchangeStore(useShallow((s) => s.getLiveTabFeed()));
  const aiServiceEnabled = useLiveExchangeStore((s) => s.aiServiceEnabled);
  const refreshEvents = useLiveExchangeStore((s) => s.refreshEvents);
  const role = useAuthStore((s) => s.user?.app_metadata?.role);
  const canReview = ['moderator', 'admin', 'super_admin', 'compliance_officer'].includes(role);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [freshness, setFreshness] = useState<FreshnessFilter>('recent');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEvents();
      setFeedError(false);
    } catch {
      setFeedError(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshEvents]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    const matches = events.filter((e) => {
      if (category !== 'all' && e.issueCategory !== category) return false;
      const archived = e.status === 'archived' ||
        (e.status === 'ended' && !isInContentPeriod(e.endedAt ?? e.startedAt, 'recent'));
      if (freshness === 'recent' && archived) return false;
      if (freshness === 'live' && e.status !== 'live') return false;
      if (freshness === 'replay' && (e.status !== 'ended' || archived)) return false;
      if (freshness === 'archive' && !archived) return false;
      if (verifiedOnly && e.accreditationTier === 'citizen') return false;
      if (searchQuery && searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchesReporter = e.reporterName?.toLowerCase().includes(q);
        const matchesOrg = e.organizationName?.toLowerCase().includes(q);
        const matchesLoc = e.districtName?.toLowerCase().includes(q) || e.locality?.toLowerCase().includes(q);
        const matchesTag = e.tags?.some((t: string) => t.toLowerCase().includes(q));
        const matchesHeadline = e.ai?.autoHeadline?.toLowerCase().includes(q) || e.ai?.summary?.toLowerCase().includes(q);
        if (!matchesReporter && !matchesOrg && !matchesLoc && !matchesTag && !matchesHeadline) return false;
      }
      return true;
    });

    return matches.sort((a, b) => {
      const aDate = Date.parse(a.endedAt ?? a.startedAt) || 0;
      const bDate = Date.parse(b.endedAt ?? b.startedAt) || 0;
      if (freshness !== 'archive' && a.status === 'live' && b.status !== 'live') return -1;
      if (freshness !== 'archive' && b.status === 'live' && a.status !== 'live') return 1;
      if (freshness === 'recent' && a.status !== b.status) {
        return a.status === 'live' ? -1 : 1;
      }
      return bDate - aDate;
    });
  }, [events, category, freshness, verifiedOnly, searchQuery]);

  const liveCount = events.filter((e) => e.status === 'live').length;

  const openEvent = (e: LiveEvent) => router.push(`/live/${e.id}` as any);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: hideHeader ? 8 : (insets.top + 8), borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            {!hideHeader && (
              <Text style={[styles.title, { color: colors.text }]}>{t('lmx.screenTitle')}</Text>
            )}
            <View style={[styles.subRow, hideHeader && { marginTop: 0 }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('lmx.liveNow', { count: liveCount })}</Text>
              {!aiServiceEnabled && (
                <Text style={[styles.aiOff, { color: colors.textMuted }]}>· {t('lmx.aiEnrichmentOff')}</Text>
              )}
            </View>
          </View>
          <Pressable style={[styles.goLive, { backgroundColor: colors.primary }]} onPress={() => router.push('/live/go-live' as any)}>
            <Ionicons name="radio" size={16} color="#FFFFFF" />
            <Text style={styles.goLiveText}>{t('lmx.goLive')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORY_ORDER.map((c) => {
            const active = category === c;
            const cfg = c === 'all' ? null : ISSUE_CATEGORY_CONFIG[c];
            const color = cfg?.color ?? colors.primary;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                  active && { backgroundColor: color + '22', borderColor: color },
                ]}
              >
                {cfg && <Ionicons name={cfg.icon as any} size={12} color={active ? color : colors.textMuted} />}
                <Text style={[styles.chipText, { color: colors.textSecondary }, active && { color, fontWeight: '800' }]}>
                  {c === 'all' ? t('lmx.filters.all') : t(cfg!.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(['recent', 'live', 'replay', 'archive'] as FreshnessFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFreshness(f)}
              style={[
                styles.chip,
                { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                freshness === f && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }, freshness === f && styles.chipTextActive]}>
                {f === 'recent'
                  ? t('feed.sort.latest', { defaultValue: 'Recent' })
                  : f === 'live'
                    ? t('lmx.filters.liveNow')
                    : f === 'replay'
                      ? t('lmx.filters.replays')
                      : t('common.archive', { defaultValue: 'Archive' })}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setVerifiedOnly((v) => !v)}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              verifiedOnly && { backgroundColor: colors.teal, borderColor: colors.teal },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={verifiedOnly ? '#FFFFFF' : colors.textMuted}
            />
            <Text style={[styles.chipText, { color: colors.textSecondary }, verifiedOnly && styles.chipTextActive]}>{t('lmx.filters.verified')}</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Feed */}
      {canReview && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/live/moderation-queue')} style={[styles.reviewLink, { borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('lmx.moderation.title')}</Text>
        </Pressable>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <LiveStreamCard event={item} onPress={openEvent} />}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="videocam-off" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {refreshing ? t('common.loading') : feedError
                ? t('lmx.empty.loadFailed', { defaultValue: 'Live could not refresh.' }) : t('lmx.empty.title')}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {feedError ? t('lmx.empty.retry', { defaultValue: 'Pull down to try again.' }) : refreshing ? '' : t('lmx.empty.subtitle')}
            </Text>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                paddingVertical: 11,
                paddingHorizontal: 20,
                borderRadius: 22,
                marginTop: 16,
              }}
              onPress={() => router.push('/live/go-live')}
            >
              <Ionicons name="radio" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {t('lmx.goLive', { defaultValue: 'Start a Broadcast' })}
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reviewLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 26, fontWeight: '800' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  subtitle: { fontSize: 12, fontWeight: '600' },
  aiOff: { fontSize: 11, fontWeight: '500' },
  goLive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  goLiveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  filters: { gap: 8, paddingBottom: 6 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  chipActive: {},
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 12, textAlign: 'center', paddingHorizontal: 40 },
});
