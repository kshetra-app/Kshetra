import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import { LiveStreamCard } from '../../components/LiveStreamCard';
import type { IssueCategory, LiveEvent } from '../../lib/lmxTypes';
import { ISSUE_CATEGORY_CONFIG } from '../../lib/lmxTypes';

type FreshnessFilter = 'all' | 'live' | 'replay';
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

export default function LiveTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Zustand v5 has no built-in selector memoization, so a selector that returns
  // a fresh array (filter+sort) must be wrapped in useShallow — otherwise every
  // render produces a new reference and React infinite-loops (crashes in release).
  const events = useLiveExchangeStore(useShallow((s) => s.getLiveTabFeed()));
  const aiServiceEnabled = useLiveExchangeStore((s) => s.aiServiceEnabled);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [freshness, setFreshness] = useState<FreshnessFilter>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (category !== 'all' && e.issueCategory !== category) return false;
      if (freshness === 'live' && e.status !== 'live') return false;
      if (freshness === 'replay' && e.status === 'live') return false;
      if (verifiedOnly && e.accreditationTier === 'citizen') return false;
      return true;
    });
  }, [events, category, freshness, verifiedOnly]);

  const liveCount = events.filter((e) => e.status === 'live').length;

  const openEvent = (e: LiveEvent) => router.push(`/live/${e.id}` as any);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Kshetra Live</Text>
            <View style={styles.subRow}>
              <View style={styles.liveDot} />
              <Text style={styles.subtitle}>{liveCount} live now</Text>
              {!aiServiceEnabled && (
                <Text style={styles.aiOff}>· AI enrichment off</Text>
              )}
            </View>
          </View>
          <Pressable style={styles.goLive} onPress={() => router.push('/live/go-live' as any)}>
            <Ionicons name="radio" size={16} color="#FFFFFF" />
            <Text style={styles.goLiveText}>Go Live</Text>
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
            const color = cfg?.color ?? '#4F8EF7';
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, active && { backgroundColor: color + '22', borderColor: color }]}
              >
                {cfg && <Ionicons name={cfg.icon as any} size={12} color={active ? color : '#9CA3AF'} />}
                <Text style={[styles.chipText, active && { color }]}>
                  {c === 'all' ? 'All' : cfg!.label}
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
          {(['all', 'live', 'replay'] as FreshnessFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFreshness(f)}
              style={[styles.chip, freshness === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, freshness === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f === 'live' ? 'Live now' : 'Replays'}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setVerifiedOnly((v) => !v)}
            style={[styles.chip, verifiedOnly && styles.chipActive]}
          >
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={verifiedOnly ? '#10B981' : '#9CA3AF'}
            />
            <Text style={[styles.chipText, verifiedOnly && styles.chipTextActive]}>Verified</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Feed */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <LiveStreamCard event={item} onPress={openEvent} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="videocam-off" size={40} color="#374151" />
            <Text style={styles.emptyTitle}>No live streams match your filters</Text>
            <Text style={styles.emptySub}>Be the first — tap Go Live to broadcast from here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  subtitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  aiOff: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  goLive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  goLiveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  filters: { gap: 8, paddingBottom: 6 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  chipActive: { backgroundColor: '#4F8EF722', borderColor: '#4F8EF7' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  chipTextActive: { color: '#4F8EF7' },
  list: { padding: 16, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#9CA3AF' },
  emptySub: { fontSize: 12, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },
});
