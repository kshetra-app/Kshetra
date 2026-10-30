import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ConstituencyListSkeleton } from './SkeletonLoader';
import type { ScreenStateConfig } from '@kshetra/shared';

export interface StateViewProps extends ScreenStateConfig {
  children?: React.ReactNode;
  skeletonVariant?: 'feed' | 'issue-list' | 'issue-detail' | 'candidate-profile' | 'map-card';
}

/**
 * Universal Screen Resilience Component (JOB 073)
 * Guarantees zero blank screens, standardized error handling, and offline awareness.
 */
export function StateView({
  currentState,
  loadingMessageKey,
  emptyTitleKey = 'No content available',
  emptyDescriptionKey = 'There is currently no data to display for this view.',
  emptyActionLabelKey,
  onEmptyAction,
  errorMessage,
  errorCode = 'ERR_UNKNOWN',
  correlationId,
  onRetry,
  retryCooldownSeconds = 3,
  isOfflineCached = false,
  children,
}: StateViewProps) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const handleRetryPress = async () => {
    if (cooldown > 0 || isRetrying || !onRetry) return;
    setIsRetrying(true);
    setCooldown(retryCooldownSeconds);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // 1. Loading State: Skeleton Shimmer
  if (currentState === 'loading') {
    return (
      <View style={styles.container} testID="state-view-loading">
        <ConstituencyListSkeleton count={4} />
        {loadingMessageKey && (
          <Text style={styles.loadingText}>{t(loadingMessageKey, 'Loading Poligram data...')}</Text>
        )}
      </View>
    );
  }

  // 2. Empty State
  if (currentState === 'empty') {
    return (
      <View style={styles.centerContainer} testID="state-view-empty">
        <View style={styles.iconCircle}>
          <Ionicons name="file-tray-outline" size={40} color="#6B7280" />
        </View>
        <Text style={styles.titleText}>{t(emptyTitleKey, emptyTitleKey)}</Text>
        <Text style={styles.descriptionText}>{t(emptyDescriptionKey, emptyDescriptionKey)}</Text>
        {onEmptyAction && emptyActionLabelKey && (
          <TouchableOpacity style={styles.primaryButton} onPress={onEmptyAction} activeOpacity={0.8} testID="state-view-empty-cta">
            <Text style={styles.primaryButtonText}>{t(emptyActionLabelKey, emptyActionLabelKey)}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. Error or Retry State
  if (currentState === 'error' || currentState === 'retry') {
    return (
      <View style={styles.centerContainer} testID="state-view-error">
        <View style={[styles.iconCircle, styles.errorIconCircle]}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        </View>
        <Text style={styles.titleText}>{t('error_title', 'Something went wrong')}</Text>
        <Text style={styles.descriptionText}>
          {errorMessage || t('error_default_desc', 'Unable to retrieve data. Please check your connection and retry.')}
        </Text>
        {correlationId && (
          <Text style={styles.correlationText}>Ref: {correlationId} ({errorCode})</Text>
        )}
        {onRetry && (
          <TouchableOpacity
            style={[styles.primaryButton, cooldown > 0 && styles.disabledButton]}
            onPress={handleRetryPress}
            disabled={cooldown > 0 || isRetrying}
            activeOpacity={0.8}
            testID="state-view-retry-button"
          >
            {isRetrying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.buttonRow}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>
                  {cooldown > 0 ? `${t('retry_in', 'Retry in')} ${cooldown}s` : t('retry_now', 'Try Again')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 4. Offline State (or Ready with isOfflineCached = true)
  if (currentState === 'offline' || isOfflineCached) {
    return (
      <View style={styles.container} testID="state-view-offline">
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#B45309" style={{ marginRight: 6 }} />
          <Text style={styles.offlineBannerText}>
            {t('offline_cached_banner', 'Offline Mode: Displaying saved local data.')}
          </Text>
        </View>
        {children}
      </View>
    );
  }

  // 5. Ready / Default State
  if (currentState === 'ready' || !currentState) {
    return <View style={styles.container} testID="state-view-ready">{children}</View>;
  }

  return <View style={styles.container} testID="state-view-ready">{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  correlationText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
});
