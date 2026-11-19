/**
 * Offline Banner — Shows when device loses connectivity.
 * Displays pending sync queue size.
 * Auto-flushes queue when coming back online.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStore } from '../lib/networkStatus';
import { useAuthStore } from '../stores/auth';
import { addSyncListener, flushQueue, getQueueSize } from '../lib/offlineSync';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [pendingCount, setPendingCount] = useState(0);
  const [justReconnected, setJustReconnected] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  const [reviewMessage, setReviewMessage] = useState<'feed.postReviewPending' | 'feed.postReviewRejected' | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = addSyncListener((event) => {
      if (!event.replayAuthorId || event.replayAuthorId !== useAuthStore.getState().user?.id) return;
      if (event.reviewStatus !== 'pending' && event.reviewStatus !== 'rejected') return;
      setReviewMessage(event.reviewStatus === 'pending' ? 'feed.postReviewPending' : 'feed.postReviewRejected');
      clearTimeout(timer);
      timer = setTimeout(() => setReviewMessage(null), 6500);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  // Monitor queue size
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getQueueSize());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-flush when reconnected
  useEffect(() => {
    if (isConnected && pendingCount > 0) {
      flushQueue().then(({ processed }) => {
        if (processed > 0) {
          setJustReconnected(true);
          setTimeout(() => setJustReconnected(false), 3000);
        }
        setPendingCount(getQueueSize());
      });
    }
  }, [isConnected]);

  // Animate show/hide
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: !isConnected || justReconnected || reviewMessage ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, justReconnected, reviewMessage, opacity]);

  if (isConnected && !justReconnected && !reviewMessage) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        justReconnected ? styles.bannerOnline : styles.bannerOffline,
        { opacity },
      ]}
    >
      <Ionicons
        name={justReconnected ? 'cloud-done' : 'cloud-offline'}
        size={14}
        color={justReconnected ? '#10B981' : '#F59E0B'}
      />
      <Text style={[styles.text, justReconnected && styles.textOnline]}>
        {reviewMessage ? t(reviewMessage) : justReconnected
          ? t('offlineBanner.backOnline')
          : pendingCount > 0
            ? t('offlineBanner.offlinePendingSyncs', { count: pendingCount })
            : t('offlineBanner.youAreOffline')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bannerOffline: {
    backgroundColor: '#F59E0B20',
  },
  bannerOnline: {
    backgroundColor: '#10B98120',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  textOnline: {
    color: '#10B981',
  },
});
