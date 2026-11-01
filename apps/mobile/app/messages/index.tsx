import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import {
  type DMConversationItem,
  searchUsersForDM,
  type DMUserSearchResult,
} from '../../lib/supabaseDataService';
import { useTimeAgo } from '../../lib/useTimeAgo';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

type InboxTab = 'chats' | 'requests';
type CategoryFilter = 'all' | 'leaders' | 'aspirants' | 'citizens';

export default function MessagesInboxScreen() {
  const { t } = useTranslation();
  const { timeAgo } = useTimeAgo();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<InboxTab>('chats');
  const [refreshing, setRefreshing] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // New Chat Modal & User Search State
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DMUserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  const chats = useDMStore((s) => s.chats);
  const requests = useDMStore((s) => s.requests);
  const loadInbox = useDMStore((s) => s.loadInbox);

  const userId = user?.id || 'anon';

  useEffect(() => {
    if (userId) {
      loadInbox(userId);
    }
  }, [userId, loadInbox]);

  // Load contacts whenever the "New Message" modal opens or search query changes
  useEffect(() => {
    let active = true;
    if (!newChatModalVisible) return;

    const fetchContacts = async () => {
      setSearchLoading(true);
      try {
        const results = await searchUsersForDM(searchQuery, userId);
        if (active) {
          setSearchResults(results);
        }
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    };

    const timer = setTimeout(fetchContacts, searchQuery ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [newChatModalVisible, searchQuery, userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox(userId);
    setRefreshing(false);
  };

  const filteredContacts = useMemo(() => {
    if (selectedCategory === 'all') return searchResults;
    if (selectedCategory === 'leaders') {
      return searchResults.filter(
        (r) =>
          r.role?.toLowerCase().includes('minister') ||
          r.role?.toLowerCase().includes('leader') ||
          r.role?.toLowerCase().includes('authority') ||
          r.role?.toLowerCase().includes('politician'),
      );
    }
    if (selectedCategory === 'aspirants') {
      return searchResults.filter((r) => r.role?.toLowerCase().includes('aspirant'));
    }
    if (selectedCategory === 'citizens') {
      return searchResults.filter(
        (r) =>
          !r.role?.toLowerCase().includes('minister') &&
          !r.role?.toLowerCase().includes('aspirant') &&
          !r.role?.toLowerCase().includes('authority'),
      );
    }
    return searchResults;
  }, [searchResults, selectedCategory]);

  const handleStartConversation = async (contact: DMUserSearchResult) => {
    try {
      setStartingChatId(contact.id);
      const convId = await useDMStore.getState().startConversationWithUser(
        userId,
        {
          id: contact.id,
          displayName: contact.displayName,
          avatarUrl: contact.avatarUrl,
          role: contact.role,
          isVerified: contact.isVerified,
        },
      );
      setNewChatModalVisible(false);
      if (convId) {
        router.push(`/messages/${convId}` as any);
      }
    } finally {
      setStartingChatId(null);
    }
  };

  const listData = activeTab === 'chats' ? chats : requests;

  const renderConversationItem = ({ item }: { item: DMConversationItem }) => {
    const other = item.otherUser || {
      id: item.participant_two,
      displayName: 'Poligram User',
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
        <View style={styles.headerRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discovery.screenHelp', { defaultValue: 'Page guidance' })}
            style={styles.headerIconBtn}
            onPress={() => setHelpVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
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
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
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

            {/* Direct Initiation CTA in Empty State */}
            {activeTab === 'chats' && (
              <Pressable
                style={[styles.startChatCta, { backgroundColor: colors.primary }]}
                onPress={() => setNewChatModalVisible(true)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.startChatCtaText}>
                  {t('messages.startChat', { defaultValue: 'Start a Conversation' })}
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Floating Action Button (FAB) to Start New Conversation */}
      <Pressable
        style={[
          styles.composeFab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 20,
          },
        ]}
        onPress={() => setNewChatModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('messages.newChat', { defaultValue: 'New conversation' })}
      >
        <Ionicons name="create-outline" size={24} color="#FFFFFF" />
      </Pressable>

      {/* New Message / Select Contact Modal */}
      <Modal
        visible={newChatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewChatModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderTitleRow}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('messages.newConversation', { defaultValue: 'New Conversation' })}
              </Text>
            </View>
            <Pressable
              onPress={() => setNewChatModalVisible(false)}
              hitSlop={8}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Search Box */}
          <View style={styles.searchBoxWrapper}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('messages.searchPlaceholder', { defaultValue: 'Search citizens, leaders, or aspirants...' })}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryRail}>
            {(['all', 'leaders', 'aspirants', 'citizens'] as CategoryFilter[]).map((cat) => {
              const isSelected = selectedCategory === cat;
              const label =
                cat === 'all'
                  ? 'All Contacts'
                  : cat === 'leaders'
                  ? 'Leaders & Ministers'
                  : cat === 'aspirants'
                  ? 'Aspirants'
                  : 'Citizens';

              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Contact List */}
          {searchLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.modalLoadingText, { color: colors.textMuted }]}>
                {t('common.loading', { defaultValue: 'Loading contacts...' })}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.contactsList, { paddingBottom: insets.bottom + 24 }]}
              renderItem={({ item }) => {
                const isSelected = startingChatId === item.id;
                return (
                  <Pressable
                    style={[
                      styles.contactRow,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => handleStartConversation(item)}
                    disabled={isSelected}
                  >
                    {/* Avatar */}
                    <View style={[styles.contactAvatar, { backgroundColor: colors.primaryLight }]}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.contactAvatarImg} />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                          {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>

                    {/* Details */}
                    <View style={styles.contactDetails}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        {item.isVerified && (
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <Text style={[styles.contactRole, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.role || 'Citizen'} {item.stateCode ? `• ${item.stateCode}` : ''}
                      </Text>
                    </View>

                    {/* Action button */}
                    <View
                      style={[
                        styles.chatActionBadge,
                        { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                      ]}
                    >
                      {isSelected ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.chatActionText, { color: colors.primary }]}>
                            {t('messages.chat', { defaultValue: 'Chat' })}
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContactsContainer}>
                  <Ionicons name="person-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {t('messages.noContactsFound', { defaultValue: 'No contacts found' })}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    {searchQuery
                      ? t('messages.noContactsMatch', { defaultValue: 'Try searching with a different name' })
                      : t('messages.noContactsAvailable', { defaultValue: 'No registered contacts match this filter' })}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="messages"
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
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: { padding: 6, borderRadius: 20 },
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
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  startChatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startChatCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  composeFab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalCloseBtn: { padding: 6, borderRadius: 20 },
  searchBoxWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  categoryRail: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: 12, fontWeight: '700' },
  contactsList: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  contactDetails: { flex: 1, marginLeft: 12, marginRight: 8 },
  contactName: { fontSize: 15, fontWeight: '700' },
  contactRole: { fontSize: 12, marginTop: 2 },
  chatActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatActionText: { fontSize: 12, fontWeight: '800' },
  modalLoading: { alignItems: 'center', paddingTop: 60, gap: 10 },
  modalLoadingText: { fontSize: 13 },
  emptyContactsContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
});
