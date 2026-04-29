import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useNotificationsStore, type NotificationItem } from '../stores/notifications';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  election_results: 'trophy',
  constituency_updates: 'location',
  new_state_added: 'map',
  app_updates: 'sparkles',
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => markRead(item.id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={CATEGORY_ICONS[item.category] ?? 'notifications'}
          size={20}
          color={item.read ? '#4B5563' : '#4F8EF7'}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.cardTime}>{formatTimeAgo(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />

      {/* Actions */}
      {items.length > 0 && (
        <View style={styles.actions}>
          {unreadCount > 0 && (
            <Pressable style={styles.actionButton} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={16} color="#4F8EF7" />
              <Text style={styles.actionText}>Mark all read</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionButton} onPress={clearAll}>
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Clear all</Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You'll see election updates and alerts here
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
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
    color: '#4F8EF7',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardUnread: {
    backgroundColor: '#111827',
    borderLeftWidth: 3,
    borderLeftColor: '#4F8EF7',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
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
    color: '#9CA3AF',
  },
  cardTitleUnread: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F8EF7',
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
    color: '#6B7280',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
