/**
 * Lazy Screen Loader
 *
 * Wraps React.lazy() with a consistent loading UI (skeleton).
 * Prevents heavy screens from blocking initial bundle load.
 */

import { Suspense, lazy, type ComponentType } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LazyScreenOptions {
  /** Fallback text shown while loading */
  label?: string;
}

/**
 * Create a lazy-loaded screen component with a consistent loading state.
 *
 * Usage:
 * ```ts
 * const AnalyticsScreen = lazyScreen(() => import('../app/analytics'));
 * ```
 */
export function lazyScreen<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: LazyScreenOptions,
) {
  const LazyComponent = lazy(importFn);

  function WrappedScreen(props: P) {
    return (
      <Suspense fallback={<LazyFallback label={options?.label} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  WrappedScreen.displayName = `Lazy(${options?.label ?? 'Screen'})`;
  return WrappedScreen;
}

function LazyFallback({ label }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F8EF7" />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
