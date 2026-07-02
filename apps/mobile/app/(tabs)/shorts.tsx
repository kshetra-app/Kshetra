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

type ShortsScope = 'constituency' | 'state' | 'national';

export default function ShortsScreen() {
  const { t } = useTranslation();
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBg}>
            <Ionicons name="play-circle" size={20} color="#FF4444" />
          </View>
          <View>
            <Text style={styles.title}>{t('tabs.shorts', { defaultValue: 'Shorts' })}</Text>
            <Text style={styles.subtitle}>{shorts.length} short{shorts.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Pressable style={styles.uploadBtn} onPress={() => setUploadVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.uploadText}>Upload</Text>
        </Pressable>
      </View>

      {/* Scope selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railWrap} contentContainerStyle={styles.railContent}>
        {SCOPES.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.chip, scope === s.key && styles.chipActive, s.disabled && styles.chipDisabled]}
            onPress={() => !s.disabled && setScope(s.key)}
          >
            <Ionicons name={s.icon as any} size={12} color={scope === s.key ? '#FFF' : s.disabled ? '#374151' : '#9CA3AF'} />
            <Text style={[styles.chipText, scope === s.key && styles.chipTextActive, s.disabled && { color: '#374151' }]}>{s.label}</Text>
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
            <Ionicons name="videocam-outline" size={48} color="#1F2937" />
            <Text style={styles.emptyText}>No shorts at this scope</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setUploadVisible(true)}>
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
  const visibilityColor =
    item.visibilityLevel === 'constituency' ? '#F59E0B' : item.visibilityLevel === 'state' ? '#4F8EF7' : '#10B981';
  return (
    <Pressable onPress={onPress} style={[styles.card, { width, height }]}>
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
          <Ionicons name="eye-outline" size={10} color="#D1D5DB" />
          <Text style={styles.viewsText}>{formatCount(item.viewCount)}</Text>
        </View>
      </View>
      {item.channelVerified && (
        <View style={styles.verifiedDot}>
          <Ionicons name="checkmark-circle" size={14} color="#4F8EF7" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FF444420', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4F8EF7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  uploadText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  railWrap: { maxHeight: 40, marginBottom: 6 },
  railContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: '#111827' },
  chipActive: { backgroundColor: '#4F8EF7' },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  chipTextActive: { color: '#FFFFFF' },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
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
  viewsText: { fontSize: 10, color: '#D1D5DB', fontWeight: '600' },
  verifiedDot: { position: 'absolute', bottom: 8, right: 8, zIndex: 5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#4F8EF7' },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
