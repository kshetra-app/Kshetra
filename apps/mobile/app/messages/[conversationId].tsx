import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import { REPORT_REASONS, type ReportReason } from '../../lib/moderationTypes';
import type { DMMessageItem } from '../../lib/supabaseDataService';
import { useTimeAgo } from '../../lib/useTimeAgo';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { useForegroundChatRefresh } from '../../lib/useForegroundChatRefresh';
import {
  getLocalizedContactName,
} from '../../lib/dmLocalization';

const emptyMessages: DMMessageItem[] = [];

export default function ConversationThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { t, i18n } = useTranslation();
  const { timeAgo } = useTimeAgo();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;
  const inboxOwner = useDMStore((s) => s.inboxUserId);

  const chats = useDMStore((s) => s.chats);
  const requests = useDMStore((s) => s.requests);
  const activeMessages = useDMStore((s) => s.activeMessages);
  const loadThread = useDMStore((s) => s.loadThread);
  const loadInbox = useDMStore((s) => s.loadInbox);
  const sendMessage = useDMStore((s) => s.sendMessage);
  const acceptRequest = useDMStore((s) => s.acceptRequest);
  const declineRequest = useDMStore((s) => s.declineRequest);
  const blockAndReport = useDMStore((s) => s.blockAndReport);

  const [inputContent, setInputContent] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<Set<string>>(new Set());
  const [helpVisible, setHelpVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const sendingMessage = useRef(false);

  const conv = currentUserId === inboxOwner
    ? chats.find((c) => c.id === conversationId) || requests.find((c) => c.id === conversationId)
    : undefined;
  const isPending = conv?.status === 'pending';
  const isIncomingRequest = isPending && conv.initiated_by !== currentUserId;
  const otherUser = conv?.otherUser || {
    id: conv?.participant_two || '',
    displayName: 'Poligram User',
    role: 'citizen',
    isVerified: false,
  };
  const localizedOtherName = getLocalizedContactName(otherUser.displayName, i18n.language);

  const messages = (conversationId && currentUserId === inboxOwner ? activeMessages[conversationId] : undefined) ?? emptyMessages;
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const waitingForAccept = isPending && !isIncomingRequest && Boolean(conv.last_message_preview || messages.length);
  const canSend = Boolean(currentUserId && conv && !isIncomingRequest && !waitingForAccept);
  const flatListRef = useRef<FlatList>(null);

  useForegroundChatRefresh(useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    await loadInbox(currentUserId, true);
    const accepted = useDMStore.getState().chats.some((chat) => chat.id === conversationId);
    await loadThread(conversationId, currentUserId, accepted);
  }, [conversationId, currentUserId, loadInbox, loadThread]));

  const handleSend = async () => {
    if (!canSend || !inputContent.trim() || !conversationId || !currentUserId || sendingMessage.current) return;
    sendingMessage.current = true;
    setSending(true);
    setSendFailed(false);
    try {
      const result = await sendMessage(conversationId, currentUserId, inputContent.trim());
      if (result) {
        setInputContent('');
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      else setSendFailed(true);
    } finally {
      sendingMessage.current = false;
      setSending(false);
    }
  };

  const showActionError = () => {
    Alert.alert(
      t('messages.actionFailed', { defaultValue: 'Could not update this conversation. Try again.' }),
    );
  };

  const handleAccept = async () => {
    if (!conversationId || !currentUserId || !isIncomingRequest) return;
    if (!(await acceptRequest(conversationId, currentUserId))) showActionError();
  };

  const handleDecline = async () => {
    if (!conversationId || !currentUserId || !isIncomingRequest) return;
    Alert.alert(
      t('messages.declineTitle', { defaultValue: 'Decline Message Request' }),
      t('messages.declineConfirm', { defaultValue: 'This conversation will be removed. The sender will not be notified.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('messages.decline', { defaultValue: 'Decline' }),
          style: 'destructive',
          onPress: async () => {
            if (await declineRequest(conversationId, currentUserId)) router.back();
            else showActionError();
          },
        },
      ],
    );
  };

  const handleBlockReportPrompt = () => {
    if (!currentUserId || !otherUser.id) return;
    Alert.alert(
      t('messages.safetyOptions', { defaultValue: 'Safety & Moderation' }),
      t('messages.safetyDesc', { name: localizedOtherName }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('messages.blockUser', { defaultValue: 'Block User' }),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('messages.blockTitle', { defaultValue: 'Confirm Block' }),
              t('messages.blockConfirm', { defaultValue: 'Blocked users cannot message or interact with your profile.' }),
              [
                { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                {
                  text: t('messages.block', { defaultValue: 'Block' }),
                  style: 'destructive',
                  onPress: async () => {
                    if (await blockAndReport(currentUserId, otherUser.id, 'blocked_by_user', undefined, conversationId)) {
                      router.back();
                    } else showActionError();
                  },
                },
              ],
            );
          },
        },
        {
          text: t('messages.reportUser', { defaultValue: 'Report to Moderation' }),
          onPress: () => setReportModalVisible(true),
        },
      ],
    );
  };

  const submitReport = async () => {
    if (!currentUserId || !otherUser.id) return;
    if (!(await blockAndReport(currentUserId, otherUser.id, reportReason, reportDescription, conversationId))) {
      showActionError();
      return;
    }
    setReportModalVisible(false);
    Alert.alert(
      t('messages.reportedTitle', { defaultValue: 'Report Submitted' }),
      t('messages.reportedDesc', { defaultValue: 'Thank you for keeping Poligram safe. The user has been blocked and flagged to our Trust & Safety queue.' }),
      [{ text: t('common.ok', { defaultValue: 'OK' }), onPress: () => router.back() }],
    );
  };

  const renderMessageItem = ({ item }: { item: DMMessageItem }) => {
    const isMine = item.sender_id === currentUserId;
    const isMediaLocked = item.is_media_locked && !unlockedMediaIds.has(item.id);

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        <View
          style={[
            styles.msgBubble,
            isMine
              ? [styles.msgBubbleMine, { backgroundColor: colors.primary }]
              : [styles.msgBubbleOther, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          {/* Mutual-Accept Media Shield (Ticket 3.3) */}
          {item.media_url ? (
            isMediaLocked ? (
              <Pressable
                style={[styles.mediaShield, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => {
                  Alert.alert(
                    t('messages.mediaConsentTitle', { defaultValue: 'View Media Attachment' }),
                    t('messages.mediaConsentBody', {
                      defaultValue: 'This media is from an unvetted sender. Are you sure you want to reveal it?',
                    }),
                    [
                      { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                      {
                        text: t('messages.revealMedia', { defaultValue: 'Reveal Media' }),
                        onPress: () => setUnlockedMediaIds((prev) => new Set(prev).add(item.id)),
                      },
                    ],
                  );
                }}
              >
                <Ionicons name="eye-off-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.shieldTitle, { color: colors.text }]}>
                  {t('messages.mediaHidden', { defaultValue: 'Media Shield Active' })}
                </Text>
                <Text style={[styles.shieldSub, { color: colors.textMuted }]}>
                  {t('messages.tapToReveal', { defaultValue: 'Tap to inspect and confirm consent' })}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.mediaContainer}>
                <Image source={{ uri: item.media_url }} style={styles.mediaPreview} />
              </View>
            )
          ) : null}

          {/* Text Content */}
          {item.content ? (
            <Text
              style={[
                styles.msgText,
                { color: isMine ? '#FFFFFF' : colors.text },
              ]}
            >
              {item.content}
            </Text>
          ) : null}

          {/* Timestamp */}
          <Text
            style={[
              styles.msgTime,
              { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted },
            ]}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Pressable
          style={styles.headerTitleContainer}
          onPress={() => otherUser.id && router.push(`/user/${otherUser.id}` as any)}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {localizedOtherName}
          </Text>
          {otherUser.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
          )}
        </Pressable>

        {/* Safety & Help Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discovery.screenHelp', { defaultValue: 'Page guidance' })}
            onPress={() => setHelpVisible(true)}
            hitSlop={8}
            style={styles.headerBtn}
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleBlockReportPrompt} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="shield-half" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Pending Message Request Banner (Ticket 3.6) */}
      {isIncomingRequest && (
        <View style={[styles.requestBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.requestBannerTextRow}>
            <Ionicons name="mail-unread-outline" size={18} color={colors.primary} />
            <Text style={[styles.requestBannerText, { color: colors.textSecondary }]}>
              {t('messages.requestPrompt', {
                defaultValue: 'Message Request: Accept to add to Chats, or Decline to remove silently.',
              })}
            </Text>
          </View>
          <View style={styles.bannerActions}>
            <Pressable
              style={[styles.btnAction, styles.btnDecline, { borderColor: colors.border }]}
              onPress={handleDecline}
            >
              <Text style={[styles.btnActionText, { color: colors.textSecondary }]}>
                {t('messages.decline', { defaultValue: 'Decline' })}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnAction, styles.btnAccept, { backgroundColor: colors.primary }]}
              onPress={handleAccept}
            >
              <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>
                {t('messages.accept', { defaultValue: 'Accept' })}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {waitingForAccept && (
        <Text style={[styles.requestBanner, { color: colors.textSecondary }]}>
          {t('messages.waitingForAccept', { defaultValue: 'Request sent. You can send another message after it is accepted.' })}
        </Text>
      )}

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        key={conversationId}
        data={newestFirst}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 100 }}
      />

      {/* Input Bar */}
      {sendFailed && (
        <Text accessibilityRole="alert" style={[styles.requestBanner, { color: colors.text }]}>
          {t('messages.sendFailed', { defaultValue: 'Message could not send. Your text is still here.' })}
        </Text>
      )}
      {canSend && <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) + 4, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder={t('messages.typePlaceholder', { defaultValue: 'Send a direct message...' })}
          placeholderTextColor={colors.textMuted}
          value={inputContent}
          onChangeText={setInputContent}
          editable={!sending}
          maxLength={isPending ? 2000 : 5000}
          multiline
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: inputContent.trim() ? colors.primary : colors.textMuted },
          ]}
          onPress={handleSend}
          disabled={sending || !inputContent.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('common.send', { defaultValue: 'Send' })}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>}

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setReportModalVisible(false)} />
          <ScrollView style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            contentContainerStyle={[styles.modalContent, { paddingBottom: 20 + insets.bottom }]}
            keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('messages.reportTitle', { defaultValue: 'Report User & Conversation' })}
            </Text>

            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              {t('messages.selectReason', { defaultValue: 'Select primary reason for report:' })}
            </Text>

            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: reportReason === r.key }}
                style={[
                  styles.reasonRow,
                  reportReason === r.key && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setReportReason(r.key)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={16}
                  color={reportReason === r.key ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.reasonText,
                    { color: reportReason === r.key ? colors.primary : colors.text },
                  ]}
                >
                  {t(r.labelKey)}
                </Text>
              </Pressable>
            ))}

            <TextInput
              style={[styles.reportInput, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel={t('reportSheet.additionalDetails')}
              placeholder={t('reportSheet.additionalDetails')}
              placeholderTextColor={colors.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                onPress={submitReport}
              >
                <Text style={styles.reportSubmitText}>{t('messages.reportAndBlock')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="message-thread"
      />
    </KeyboardAvoidingView>
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
  headerBtn: { padding: 4 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  requestBanner: {
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  requestBannerTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestBannerText: { fontSize: 13, flex: 1 },
  bannerActions: { flexDirection: 'row', gap: 10 },
  btnAction: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnDecline: { borderWidth: 1 },
  btnAccept: {},
  btnActionText: { fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 6 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  msgBubbleMine: { borderBottomRightRadius: 4 },
  msgBubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  mediaShield: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 6,
    gap: 4,
  },
  shieldTitle: { fontSize: 13, fontWeight: '700' },
  shieldSub: { fontSize: 11, textAlign: 'center' },
  mediaContainer: { marginBottom: 6, borderRadius: 12, overflow: 'hidden' },
  mediaPreview: { width: 200, height: 200, borderRadius: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { flexGrow: 0, maxHeight: '90%', width: '100%', maxWidth: 600, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10 },
  reasonText: { flexShrink: 1, fontSize: 14, fontWeight: '600' },
  reportInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 80, fontSize: 14, textAlignVertical: 'top' },
  modalBtnRow: { gap: 8, marginTop: 8 },
  modalBtn: { minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportSubmitText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
});
