import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PoliticalShort } from '../../data/politicalShortsData';
import { formatCount, formatDuration } from '../../data/politicalShortsData';
import ShortsPlayerModal from '../../components/ShortsPlayerModal';
import UploadShortModal from '../../components/UploadShortModal';
import { usePoliticalShortsStore } from '../../stores/politicalShorts';
import { useActiveStateStore } from '../../stores/activeState';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { useTheme } from '../../lib/theme';

type ShortsScope = 'constituency' | 'state' | 'national';

export default function ShortsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const allShorts = usePoliticalShortsStore((s) => s.shorts);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const userConstituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  const [scope, setScope] = useState<ShortsScope>(stateCode === 'IN' ? 'national' : 'state');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Preserve the original targeting/visibility logic from the feed carousel.
  const shorts = useMemo(() => {
    let list = [...allShorts];
    if (scope === 'constituency') {
      if (!userConstituencyId) return [];
      list = list.filter((s) => s.constituencyId === userConstituencyId);
    } else if (scope === 'state') {
      list = list.filter((s) => s.stateCode === stateCode && s.visibilityLevel !== 'constituency');
    } else {
      list = list.filter((s) => s.visibilityLevel === 'national');
    }
    return list;
  }, [allShorts, scope, stateCode, userConstituencyId]);

  const openShort = useCallback((index: number) => {
    setSelectedIndex(index);
    setPlayerVisible(true);
  }, []);

  const cardWidth = (width - 16 * 2 - 10) / 2;
  const cardHeight = cardWidth * 1.55;

  const SCOPES: { key: ShortsScope; label: string; icon: string; disabled: boolean }[] = [
    { key: 'national', label: 'National', icon: 'globe', disabled: false },
    { key: 'state', label: 'My State', icon: 'map', disabled: stateCode === 'IN' },
    { key: 'constituency', label: myHome?.name ?? 'My Area', icon: 'location', disabled: !myHome || stateCode === 'IN' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="play-circle" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('tabs.shorts', { defaultValue: 'Shorts' })}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{shorts.length} short{shorts.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Pressable style={[styles.uploadBtn, { backgroundColor: colors.primary }]} onPress={() => setUploadVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.uploadText}>Upload</Text>
        </Pressable>
      </View>

      {/* Scope selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railWrap} contentContainerStyle={styles.railContent}>
        {SCOPES.map((s) => (
          <Pressable
            key={s.key}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              scope === s.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              s.disabled && styles.chipDisabled,
            ]}
            onPress={() => !s.disabled && setScope(s.key)}
          >
            <Ionicons
              name={s.icon as any}
              size={12}
              color={scope === s.key ? '#FFF' : s.disabled ? colors.textMuted : colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: colors.textSecondary },
                scope === s.key && styles.chipTextActive,
                s.disabled && { color: colors.textMuted },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 100, paddingTop: 4 }}
        renderItem={({ item, index }) => (
          <ShortCard item={item} width={cardWidth} height={cardHeight} onPress={() => openShort(index)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shorts at this scope</Text>
            <Pressable style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setUploadVisible(true)}>
              <Text style={styles.emptyBtnText}>Upload the first one</Text>
            </Pressable>
          </View>
        }
      />

      {playerVisible && (
        <ShortsPlayerModal
          visible={playerVisible}
          shorts={shorts}
          initialIndex={selectedIndex}
          onClose={() => setPlayerVisible(false)}
        />
      )}
      {uploadVisible && (
        <UploadShortModal visible={uploadVisible} onClose={() => setUploadVisible(false)} />
      )}
    </View>
  );
}

function ShortCard({ item, width, height, onPress }: { item: PoliticalShort; width: number; height: number; onPress: () => void }) {
  const { colors } = useTheme();
  const visibilityColor =
    item.visibilityLevel === 'constituency' ? colors.gold : item.visibilityLevel === 'state' ? colors.teal : colors.primary;
  return (
    <Pressable onPress={onPress} style={[styles.card, { width, height, borderColor: colors.goldBorder || colors.border }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: item.gradientColors[0], borderRadius: 16 }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: item.gradientColors[1], opacity: 0.45, borderRadius: 16 }]} />
      </View>
      <View style={styles.durationBadge}>
        <Ionicons name="time-outline" size={10} color="#FFFFFF" />
        <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
      </View>
      <View style={[styles.visibilityDot, { backgroundColor: visibilityColor }]} />
      <View style={styles.playIconWrap}>
        <View style={styles.playIcon}>
          <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={[styles.stateBadge, { backgroundColor: item.stateAccent + '35' }]}>
          <Text style={[styles.stateBadgeText, { color: item.stateAccent }]}>{item.stateName}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={10} color="#F4EBE1" />
          <Text style={styles.viewsText}>{formatCount(item.viewCount)}</Text>
        </View>
      </View>
      {item.channelVerified && (
        <View style={styles.verifiedDot}>
          <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  uploadText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  railWrap: { maxHeight: 40, marginBottom: 6 },
  railContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  chipActive: {},
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  durationBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3, zIndex: 5 },
  durationText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  visibilityDot: { position: 'absolute', top: 10, left: 10, width: 8, height: 8, borderRadius: 4, zIndex: 5 },
  playIconWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  cardBottom: { paddingHorizontal: 10, paddingBottom: 10, gap: 4 },
  stateBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stateBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', lineHeight: 16 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsText: { fontSize: 10, color: '#F4EBE1', fontWeight: '600' },
  verifiedDot: { position: 'absolute', bottom: 8, right: 8, zIndex: 5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '700' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
