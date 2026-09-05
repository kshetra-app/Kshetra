import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '../../lib/theme';
import { useFeatureFlags } from '../../lib/featureFlags';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import { useNotificationsStore } from '../../stores/notifications';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/auth';
import FeedScreen from './feed';
import ShortsScreen from './shorts';
import LiveTabScreen from './live';

export type CommunitySegment = 'feed' | 'shorts' | 'live';

interface SegmentOption {
  key: CommunitySegment;
  labelKey: string;
  defaultLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  flagEnabled: boolean;
  showLiveDot?: boolean;
}

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flags = useFeatureFlags();

  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const notificationUnreadCount = useNotificationsStore((s) => s.unreadCount);
  const dmUnreadCount = useDMStore((s) => s.unreadCount);
  const refreshDMUnreadCount = useDMStore((s) => s.refreshUnreadCount);

  // Fetch DM unread count on mount and when user session changes
  useEffect(() => {
    if (user?.id) {
      refreshDMUnreadCount(user.id, session?.access_token);
    }
  }, [user?.id, session?.access_token, refreshDMUnreadCount]);

  // In-memory state only (never persisted, resets to feed on unmount/entry)
  const [activeSegment, setActiveSegment] = useState<CommunitySegment>('feed');

  // Live count for real-time red dot badge
  const liveEvents = useLiveExchangeStore(useShallow((s) => s.getLiveTabFeed()));
  const liveCount = liveEvents.filter((e) => e.status === 'live').length;

  const segments: SegmentOption[] = useMemo(
    () => [
      {
        key: 'feed',
        labelKey: 'tabs.feed',
        defaultLabel: 'Feed',
        icon: 'chatbubbles',
        flagEnabled: flags.enableFeed,
      },
      {
        key: 'shorts',
        labelKey: 'tabs.shorts',
        defaultLabel: 'Shorts',
        icon: 'play-circle',
        flagEnabled: flags.enableShortsTab,
      },
      {
        key: 'live',
        labelKey: 'tabs.live',
        defaultLabel: 'Live',
        icon: 'radio',
        flagEnabled: flags.enableLiveTab,
        showLiveDot: liveCount > 0,
      },
    ],
    [flags.enableFeed, flags.enableShortsTab, flags.enableLiveTab, liveCount],
  );

  // Visible segments according to feature flags
  const visibleSegments = useMemo(
    () => segments.filter((s) => s.flagEnabled),
    [segments],
  );

  // Active segment resolution: fallback to first visible if current is disabled
  const effectiveSegment = useMemo(() => {
    const isCurrentActiveVisible = visibleSegments.some((s) => s.key === activeSegment);
    if (!isCurrentActiveVisible && visibleSegments.length > 0) {
      return visibleSegments[0].key;
    }
    return activeSegment;
  }, [activeSegment, visibleSegments]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Persistent Community Header (Logo, Notifications, DMs) */}
      <View
        style={[
          styles.persistentHeader,
          {
            paddingTop: insets.top + 6,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: colors.primary }]}>KSHETRA</Text>
          <View style={[styles.communityBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.communityBadgeText, { color: colors.textSecondary }]}>
              {t('tabs.community', { defaultValue: 'Community' })}
            </Text>
          </View>
        </View>

        <View style={styles.headerIconsRow}>
          {/* Notifications Bell -> /notifications */}
          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => router.push('/notifications')}
            hitSlop={8}
            accessibilityLabel={t('more.tiles.notifications', { defaultValue: 'Notifications' })}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            {notificationUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* DM Paper-Plane -> /messages (Dedicated Unread Count, never merged) */}
          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => router.push('/messages' as any)}
            hitSlop={8}
            accessibilityLabel={t('more.tiles.messages', { defaultValue: 'Direct Messages' })}
          >
            <Ionicons name="paper-plane-outline" size={19} color={colors.text} />
            {dmUnreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.badgeText}>
                  {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Horizontal Segmented Control (Feed | Shorts | Live) */}
      <View
        style={[
          styles.segmentedContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.pillTrack,
            {
              backgroundColor: colors.background,
              borderColor: colors.goldBorder || colors.border,
            },
          ]}
        >
          {visibleSegments.map((item) => {
            const isActive = effectiveSegment === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveSegment(item.key)}
                style={[
                  styles.pillButton,
                  isActive && [styles.pillButtonActive, { backgroundColor: colors.primary }],
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.pillContent}>
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={isActive ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      { color: isActive ? '#FFFFFF' : colors.textSecondary },
                      isActive && styles.pillTextActive,
                    ]}
                  >
                    {t(item.labelKey, { defaultValue: item.defaultLabel })}
                  </Text>
                  {item.showLiveDot && (
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: '#EF4444' },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {effectiveSegment === 'feed' && <FeedScreen hideHeader />}
        {effectiveSegment === 'shorts' && <ShortsScreen hideHeader />}
        {effectiveSegment === 'live' && <LiveTabScreen hideHeader />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  pillTrack: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    fontWeight: '800',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  contentArea: {
    flex: 1,
  },
  persistentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 25,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  communityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  communityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
