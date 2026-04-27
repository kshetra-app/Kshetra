import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonItem({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton for constituency lists */
export function ConstituencyCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonItem width={44} height={28} borderRadius={6} />
      <View style={styles.cardContent}>
        <SkeletonItem width="70%" height={16} />
        <SkeletonItem width="50%" height={12} style={{ marginTop: 6 }} />
        <SkeletonItem width="80%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Multiple card skeletons for loading state */
export function ConstituencyListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <ConstituencyCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Generic stat card skeleton */
export function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <SkeletonItem width={40} height={40} borderRadius={20} />
      <SkeletonItem width="60%" height={20} style={{ marginTop: 8 }} />
      <SkeletonItem width="40%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

export default SkeletonItem;

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1F2937',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  statCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
});
