import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import type { DMConversationItem } from '../../lib/supabaseDataService';
import VerificationBadge from '../../components/VerificationBadge';
import { useTimeAgo } from '../../lib/useTimeAgo';

type InboxTab = 'chats' | 'requests';

export default function MessagesInboxScreen() {
  const { t } = useTranslation();
  const { timeAgo } = useTimeAgo();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<InboxTab>('chats');
  const [refreshing, setRefreshing] = useState(false);

  const chats = useDMStore((s) => s.chats);
  const requests = useDMStore((s) => s.requests);
  const loading = useDMStore((s) => s.loading);
  const loadInbox = useDMStore((s) => s.loadInbox);

  const userId = user?.id || 'anon';

  useEffect(() => {
    if (userId) {
      loadInbox(userId);
    }
  }, [userId, loadInbox]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox(userId);
    setRefreshing(false);
  };

  const listData = activeTab === 'chats' ? chats : requests;

  const renderConversationItem = ({ item }: { item: DMConversationItem }) => {
    const other = item.otherUser || {
      id: item.participant_two,
      displayName: 'Kshetra User',
      role: 'citizen',
      isVerified: false,
    };

    return (
      <Pressable
        style={[
          styles.convCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => router.push(`/messages/${item.id}` as any)}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          {other.avatarUrl ? (
            <Image source={{ uri: other.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {other.displayName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.convBody}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {other.displayName}
              </Text>
              {other.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>

          <Text
            style={[
              styles.preview,
              { color: item.status === 'pending' ? colors.textSecondary : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {item.last_message_preview || (item.status === 'pending' ? 'Message request' : 'No messages yet')}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('messages.inbox', { defaultValue: 'Direct Messages' })}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Segmented Tabs (Chats vs Requests) */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'chats' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('chats')}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'chats' ? colors.primary : colors.textSecondary },
              ]}
            >
              {t('messages.chats', { defaultValue: 'Chats' })}
            </Text>
            {chats.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{chats.length}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'requests' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'requests' ? colors.primary : colors.textSecondary },
              ]}
            >
              {t('messages.requests', { defaultValue: 'Requests' })}
            </Text>
            {requests.length > 0 && (
              <View style={[styles.quietBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.quietBadgeText, { color: colors.textSecondary }]}>
                  {requests.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Notice Banner for Requests */}
      {activeTab === 'requests' && (
        <View style={[styles.requestNotice, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="shield-outline" size={16} color={colors.primary} />
          <Text style={[styles.requestNoticeText, { color: colors.textSecondary }]}>
            {t('messages.requestsDesc', {
              defaultValue: 'Messages from accounts you do not follow. Senders won’t know you have seen them until you accept.',
            })}
          </Text>
        </View>
      )}

      {/* Conversation List */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'chats' ? 'chatbubbles-outline' : 'mail-unread-outline'}
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'chats'
                ? t('messages.noChats', { defaultValue: 'No active conversations' })
                : t('messages.noRequests', { defaultValue: 'No pending requests' })}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {activeTab === 'chats'
                ? t('messages.noChatsSub', { defaultValue: 'Connect with citizens, leaders, and aspirants directly' })
                : t('messages.noRequestsSub', { defaultValue: 'New messages from non-followed accounts appear here' })}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: {},
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  quietBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  quietBadgeText: { fontSize: 11, fontWeight: '700' },
  requestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  requestNoticeText: { fontSize: 12, flex: 1, lineHeight: 16 },
  listContent: { padding: 16, gap: 10 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 18, fontWeight: '800' },
  convBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 11 },
  preview: { fontSize: 13, marginTop: 3 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
