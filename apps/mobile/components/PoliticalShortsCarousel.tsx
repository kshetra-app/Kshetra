import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PoliticalShort } from '../data/politicalShortsData';
import { formatCount, formatDuration } from '../data/politicalShortsData';
import ShortsPlayerModal from './ShortsPlayerModal';
import UploadShortModal from './UploadShortModal';
import { usePoliticalShortsStore } from '../stores/politicalShorts';
import { useFeedStore } from '../stores/feed';
import { useActiveStateStore } from '../stores/activeState';
import { useMyConstituencyStore } from '../stores/myConstituency';

export default function PoliticalShortsCarousel() {
  const { t } = useTranslation();
  const [playerVisible, setPlayerVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Stores
  const allShorts = usePoliticalShortsStore((s) => s.shorts);
  const scopeFilter = useFeedStore((s) => s.scopeFilter);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const userConstituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  // Filter shorts based on active scope and targeting rules
  const filteredShorts = useMemo(() => {
    let list = [...allShorts];

    if (scopeFilter === 'constituency') {
      if (!userConstituencyId) return [];
      list = list.filter((s) => s.constituencyId === userConstituencyId);
    } else if (scopeFilter === 'state') {
      // Show state level shorts and national level shorts for the selected state
      // (Do NOT show constituency-restricted shorts in state view unless promoted)
      list = list.filter(
        (s) => s.stateCode === stateCode && s.visibilityLevel !== 'constituency'
      );
    } else if (scopeFilter === 'national') {
      // Show only shorts promoted to national visibility
      list = list.filter((s) => s.visibilityLevel === 'national');
    }

    return list;
  }, [allShorts, scopeFilter, stateCode, userConstituencyId]);

  const handleOpenShort = useCallback((index: number) => {
    setSelectedIndex(index);
    setPlayerVisible(true);
  }, []);

  const renderThumbnail = useCallback(
    ({ item, index }: { item: PoliticalShort; index: number }) => (
      <ShortThumbnailCard
        item={item}
        onPress={() => handleOpenShort(index)}
      />
    ),
    [handleOpenShort],
  );

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBg}>
            <Ionicons name="play-circle" size={18} color="#FF4444" />
          </View>
          <Text style={styles.headerTitle}>
            {t('shorts.title', { defaultValue: 'Political Shorts' })}
          </Text>
          {filteredShorts.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>NEW</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.seeAllBtn} onPress={() => setUploadVisible(true)}>
          <Ionicons name="add-circle" size={14} color="#4F8EF7" />
          <Text style={styles.seeAllText}>Upload Short</Text>
        </Pressable>
      </View>

      {/* Horizontal carousel */}
      <FlatList
        data={filteredShorts}
        keyExtractor={(item) => item.id}
        renderItem={renderThumbnail}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={148} // card width + gap
        decelerationRate="fast"
        ListHeaderComponent={
          <Pressable style={styles.uploadCard} onPress={() => setUploadVisible(true)}>
            <View style={styles.uploadCardInner}>
              <Ionicons name="camera" size={32} color="#4F8EF7" style={{ marginBottom: 4 }} />
              <Text style={styles.uploadCardTitle}>Add Short</Text>
              <Text style={styles.uploadCardDesc}>Share local report</Text>
            </View>
          </Pressable>
        }
        ListEmptyComponent={
          scopeFilter === 'constituency' ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No shorts in this constituency.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setUploadVisible(true)}>
                <Text style={styles.emptyBtnText}>Be the first!</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {/* Full-screen player modal */}
      {playerVisible && (
        <ShortsPlayerModal
          visible={playerVisible}
          shorts={filteredShorts}
          initialIndex={selectedIndex}
          onClose={() => setPlayerVisible(false)}
        />
      )}

      {/* Upload modal sheet */}
      {uploadVisible && (
        <UploadShortModal
          visible={uploadVisible}
          onClose={() => setUploadVisible(false)}
        />
      )}
    </View>
  );
}

// ── Thumbnail card (memoized for perf) ────────────────────────────

interface ThumbnailProps {
  item: PoliticalShort;
  onPress: () => void;
}

function ShortThumbnailCard({ item, onPress }: ThumbnailProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const visibilityColor = useMemo(() => {
    if (item.visibilityLevel === 'constituency') return '#F59E0B';
    if (item.visibilityLevel === 'state') return '#4F8EF7';
    return '#10B981';
  }, [item.visibilityLevel]);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Thumbnail Preview representation */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: item.gradientColors[0], borderRadius: 16 }]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: item.gradientColors[1],
                opacity: 0.45,
                borderRadius: 16,
              },
            ]}
          />
        </View>

        {/* Top Right: Duration badge */}
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={10} color="#FFFFFF" />
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>

        {/* Top Left: Verification Level Dot */}
        <View style={[styles.visibilityDot, { backgroundColor: visibilityColor }]} />

        {/* Center: Play icon */}
        <View style={styles.playIconWrap}>
          <View style={styles.playIcon}>
            <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </View>

        {/* Bottom overlay */}
        <View style={styles.cardBottom}>
          {/* State badge */}
          <View style={[styles.stateBadge, { backgroundColor: item.stateAccent + '35' }]}>
            <Text style={[styles.stateBadgeText, { color: item.stateAccent }]}>
              {item.stateName}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Views */}
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={10} color="#9CA3AF" />
            <Text style={styles.viewsText}>{formatCount(item.viewCount)}</Text>
          </View>
        </View>

        {/* Verified channel indicator */}
        {item.channelVerified && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark-circle" size={14} color="#4F8EF7" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const CARD_WIDTH = 140;
const CARD_HEIGHT = 220;

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FF444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F8EF7',
  },

  // ── Carousel list ───────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  // ── Thumbnail card ──────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    zIndex: 5,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  visibilityDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 5,
  },
  playIconWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cardBottom: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 4,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewsText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 5,
  },

  // ── Upload Card ──────────────────────────────────────────────
  uploadCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#4F8EF7',
    borderStyle: 'dashed',
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardInner: {
    alignItems: 'center',
    padding: 8,
  },
  uploadCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  uploadCardDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Empty State ──────────────────────────────────────────────
  emptyCard: {
    width: CARD_WIDTH * 1.5,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#4F8EF7',
  },
  emptyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
