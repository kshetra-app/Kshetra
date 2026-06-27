/**
 * Skeleton Loaders — Lightweight placeholder components for async data
 *
 * Used during Phase 4 UX polish to improve perceived performance.
 * Provides visual feedback while GeoJSON, seed data, and other async content loads.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// ═════════════════════════════════════════════════════════════════════════
// ── Shimmer Effect ──────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Shimmer animation for skeleton loaders.
 * Creates a subtle left-to-right wave effect.
 */
function Shimmer({ children }: { children: React.ReactNode }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── Map Loading Skeleton ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function MapLoadingSkeleton() {
  return (
    <View style={styles.mapSkeleton}>
      <Shimmer>
        <View style={styles.mapBackground} />
      </Shimmer>
      
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.titleSkeleton} />
        <View style={styles.subtitleSkeleton} />
      </View>

      {/* Action buttons skeleton */}
      <View style={styles.actionButtonsSkeleton}>
        <View style={styles.buttonSkeleton} />
        <View style={styles.buttonSkeleton} />
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── Constituency Card Skeleton ──────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function ConstituencyCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <Shimmer>
        <View>
          {/* Header */}
          <View style={styles.cardHeaderSkeleton}>
            <View style={styles.cardTitleSkeleton} />
            <View style={styles.cardSubtitleSkeleton} />
          </View>

          {/* MLA section */}
          <View style={styles.mlaCardSkeleton}>
            <View style={styles.avatarSkeleton} />
            <View style={styles.mlaInfoSkeleton}>
              <View style={styles.mlaNameSkeleton} />
              <View style={styles.mlaPartySkeleton} />
            </View>
          </View>

          {/* Stats section */}
          <View style={styles.statsSkeleton}>
            <View style={styles.statItemSkeleton} />
            <View style={styles.statItemSkeleton} />
            <View style={styles.statItemSkeleton} />
          </View>
        </View>
      </Shimmer>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── List Item Skeleton ──────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function ListItemSkeleton() {
  return (
    <View style={styles.listItemSkeleton}>
      <Shimmer>
        <View style={styles.listItemContent}>
          <View style={styles.listItemTitleSkeleton} />
          <View style={styles.listItemSubtitleSkeleton} />
        </View>
      </Shimmer>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── Text Skeleton ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function TextSkeleton({ lines = 3, width: w = '100%' }: { lines?: number; width?: string | number }) {
  return (
    <View style={{ width: typeof w === 'number' ? w : w === '100%' ? '100%' : w as any }}>
      <Shimmer>
        <View>
          {Array.from({ length: lines }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.textLineSkeleton,
                i < lines - 1 && styles.textLineMargin,
                i === lines - 1 && { width: '70%' },
              ]}
            />
          ))}
        </View>
      </Shimmer>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── Styles ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Map skeleton
  mapSkeleton: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#374151',
  },
  headerSkeleton: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  titleSkeleton: {
    height: 24,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    marginBottom: 8,
    width: '40%',
  },
  subtitleSkeleton: {
    height: 16,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    width: '60%',
  },
  actionButtonsSkeleton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    gap: 12,
  },
  buttonSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4B5563',
  },

  // Card skeleton
  cardSkeleton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardHeaderSkeleton: {
    marginBottom: 16,
  },
  cardTitleSkeleton: {
    height: 20,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  cardSubtitleSkeleton: {
    height: 14,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    width: '50%',
  },

  // MLA card skeleton
  mlaCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatarSkeleton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4B5563',
  },
  mlaInfoSkeleton: {
    flex: 1,
  },
  mlaNameSkeleton: {
    height: 16,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    marginBottom: 6,
    width: '80%',
  },
  mlaPartySkeleton: {
    height: 12,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    width: '50%',
  },

  // Stats skeleton
  statsSkeleton: {
    flexDirection: 'row',
    gap: 12,
  },
  statItemSkeleton: {
    flex: 1,
    height: 60,
    backgroundColor: '#374151',
    borderRadius: 8,
  },

  // List item skeleton
  listItemSkeleton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  listItemContent: {
    gap: 8,
  },
  listItemTitleSkeleton: {
    height: 16,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    width: '80%',
  },
  listItemSubtitleSkeleton: {
    height: 12,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    width: '60%',
  },

  // Text skeleton
  textLineSkeleton: {
    height: 12,
    backgroundColor: '#4B5563',
    borderRadius: 4,
  },
  textLineMargin: {
    marginBottom: 6,
  },
});
