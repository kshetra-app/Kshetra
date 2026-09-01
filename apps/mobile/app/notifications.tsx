import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore, type NotificationItem } from '../stores/notifications';
import { useTheme } from '../lib/theme';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  election_results: 'trophy',
  constituency_updates: 'location',
  new_state_added: 'map',
  app_updates: 'sparkles',
};

function formatTimeAgo(ts: number, t: (key: string, opts?: any) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.justNow', { defaultValue: 'Just now' });
  if (mins < 60) return t('notifications.minutesAgo', { n: mins, defaultValue: `${mins}m ago` });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.hoursAgo', { n: hours, defaultValue: `${hours}h ago` });
  const days = Math.floor(hours / 24);
  return t('notifications.daysAgo', { n: days, defaultValue: `${days}d ago` });
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const insets = useSafeAreaInsets();

  const handlePress = (item: NotificationItem) => {
    markRead(item.id);
    if (item.data?.acNo) {
      router.push(`/constituency/${item.data.stateCode ? `${item.data.stateCode}-AC-${item.data.acNo}` : item.data.acNo}` as any);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 },
        !item.read && [styles.cardUnread, { borderLeftColor: colors.primary }],
      ]}
      onPress={() => handlePress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons
          name={(CATEGORY_ICONS[item.category] || 'notifications') as any}
          size={18}
          color={item.read ? colors.textMuted : colors.primary}
        />
      </View>
      <View style={styles.cardContent}>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.textSecondary },
            !item.read && [styles.cardTitleUnread, { color: colors.text }],
          ]}
        >
          {item.title}
        </Text>
        <Text style={[styles.cardBody, { color: colors.textMuted }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.cardTime, { color: colors.textMuted }]}>{formatTimeAgo(item.timestamp, t)}</Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('notifications.title', { defaultValue: 'Notifications' }),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />

      {/* Actions */}
      {items.length > 0 && (
        <View style={styles.actions}>
          {unreadCount > 0 && (
            <Pressable style={styles.actionButton} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={16} color="#4F8EF7" />
              <Text style={styles.actionText}>{t('notifications.markAllRead', { defaultValue: 'Mark all read' })}</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionButton} onPress={clearAll}>
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('notifications.clearAll', { defaultValue: 'Clear all' })}</Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>{t('notifications.noNotifications', { defaultValue: 'No notifications yet' })}</Text>
          <Text style={styles.emptyText}>
            {t('notifications.caughtUp', { defaultValue: "You're all caught up!" })}
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ ...styles.listContent, paddingBottom: Math.max(insets.bottom, 20) + 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardUnread: {
    borderLeftWidth: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
