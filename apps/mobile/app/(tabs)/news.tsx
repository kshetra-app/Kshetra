import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNewsStore } from '../../stores/news';
import { useActiveStateStore } from '../../stores/activeState';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import {
  NEWS_LANGUAGES,
  NEWS_CATEGORIES,
  formatRelativeTime,
  type NewsItem,
} from '../../lib/newsTypes';
import NewsCard from '../../components/NewsCard';
import { STATES } from '@kshetra/shared';

type NewsScopeTab = 'national' | 'state' | 'constituency';

export default function NewsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const items = useNewsStore((s) => s.items);
  const generatedAt = useNewsStore((s) => s.generatedAt);
  const refreshIntervalMin = useNewsStore((s) => s.refreshIntervalMin);
  const loading = useNewsStore((s) => s.loading);
  const language = useNewsStore((s) => s.language);
  const category = useNewsStore((s) => s.category);
  const bookmarks = useNewsStore((s) => s.bookmarks);
  const setLanguage = useNewsStore((s) => s.setLanguage);
  const setCategory = useNewsStore((s) => s.setCategory);
  const toggleBookmark = useNewsStore((s) => s.toggleBookmark);
  const refresh = useNewsStore((s) => s.refresh);

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const userConstituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  const [scope, setScope] = useState<NewsScopeTab>(stateCode === 'IN' ? 'national' : 'state');
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Refresh on mount + hourly auto-refresh (mirrors the scraper cadence).
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, Math.max(15, refreshIntervalMin) * 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, refreshIntervalMin]);

  // National-only mode locks scope to national.
  useEffect(() => {
    if (stateCode === 'IN' && scope !== 'national') setScope('national');
  }, [stateCode, scope]);

  const filtered = useMemo(() => {
    let list = [...items];

    // ── Language consumption preference ──
    if (language) list = list.filter((i) => i.language === language);

    // ── Geographic hierarchy (inclusive: narrower scope shows broader context) ──
    if (scope === 'national') {
      list = list.filter((i) => i.scope === 'national');
    } else if (scope === 'state') {
      list = list.filter((i) => i.scope === 'national' || i.stateCode === stateCode);
    } else if (scope === 'constituency') {
      list = list.filter(
        (i) =>
          i.scope === 'national' ||
          i.stateCode === stateCode ||
          i.constituencyId === userConstituencyId,
      );
    }

    // ── Category ──
    if (category === 'video') list = list.filter((i) => !!i.video);
    else if (category !== 'top') list = list.filter((i) => i.category === category);

    // ── Bookmarks view ──
    if (showBookmarks) list = list.filter((i) => bookmarks.includes(i.id));

    // Most-local first, then newest.
    const scopeRank = (i: NewsItem) =>
      i.constituencyId === userConstituencyId ? 0 : i.stateCode === stateCode ? 1 : 2;
    return list.sort((a, b) => {
      const r = scopeRank(a) - scopeRank(b);
      if (r !== 0) return r;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [items, language, scope, category, showBookmarks, bookmarks, stateCode, userConstituencyId]);

  const stateName = (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;

  const SCOPES: { key: NewsScopeTab; label: string; icon: string; disabled: boolean }[] = [
    { key: 'national', label: 'National', icon: 'globe', disabled: false },
    { key: 'state', label: stateName, icon: 'map', disabled: stateCode === 'IN' },
    { key: 'constituency', label: myHome?.name ?? 'My Area', icon: 'location', disabled: !myHome || stateCode === 'IN' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('tabs.news', { defaultValue: 'News' })}</Text>
          <View style={styles.updatedRow}>
            <View style={styles.liveDot} />
            <Text style={styles.updatedText}>
              Updated {formatRelativeTime(generatedAt)} · every {refreshIntervalMin}m
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.iconBtn, showBookmarks && styles.iconBtnActive]}
          onPress={() => setShowBookmarks((v) => !v)}
        >
          <Ionicons name={showBookmarks ? 'bookmark' : 'bookmark-outline'} size={18} color={showBookmarks ? '#F59E0B' : '#9CA3AF'} />
        </Pressable>
      </View>

      {/* Language rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railWrap} contentContainerStyle={styles.railContent}>
        <Chip label="All langs" active={language === null} onPress={() => setLanguage(null)} icon="language" />
        {NEWS_LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.native} active={language === l.code} onPress={() => setLanguage(l.code)} />
        ))}
      </ScrollView>

      {/* Scope selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railWrap} contentContainerStyle={styles.railContent}>
        {SCOPES.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            icon={s.icon}
            active={scope === s.key}
            disabled={s.disabled}
            onPress={() => !s.disabled && setScope(s.key)}
          />
        ))}
      </ScrollView>

      {/* Category rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.railWrap, { marginBottom: 4 }]} contentContainerStyle={styles.railContent}>
        {NEWS_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} icon={c.icon} active={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </ScrollView>

      {/* Feed */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <NewsCard
            item={item}
            bookmarked={bookmarks.includes(item.id)}
            onToggleBookmark={() => toggleBookmark(item.id)}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#4F8EF7" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={showBookmarks ? 'bookmark-outline' : 'newspaper-outline'} size={48} color="#1F2937" />
            <Text style={styles.emptyText}>
              {showBookmarks ? 'No saved stories yet' : 'No stories match these filters'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Chip({
  label, active, onPress, icon, disabled,
}: { label: string; active: boolean; onPress: () => void; icon?: string; disabled?: boolean }) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon as any} size={12} color={active ? '#FFF' : disabled ? '#374151' : '#9CA3AF'} />}
      <Text
        numberOfLines={1}
        style={[styles.chipText, active && styles.chipTextActive, disabled && { color: '#374151' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 6 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  updatedText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  iconBtnActive: { backgroundColor: '#F59E0B20' },
  railWrap: { height: 44, marginBottom: 6 },
  railContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center', paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: '#111827', minHeight: 32 },
  chipActive: { backgroundColor: '#4F8EF7' },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', lineHeight: 16, includeFontPadding: false, textAlignVertical: 'center' },
  chipTextActive: { color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#374151' },
});
