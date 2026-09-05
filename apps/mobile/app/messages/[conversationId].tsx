import React, { useEffect, useState, useRef } from 'react';
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

export default function ConversationThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { t } = useTranslation();
  const { timeAgo } = useTimeAgo();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id || 'anon';

  const chats = useDMStore((s) => s.chats);
  const requests = useDMStore((s) => s.requests);
  const activeMessages = useDMStore((s) => s.activeMessages);
  const loadThread = useDMStore((s) => s.loadThread);
  const sendMessage = useDMStore((s) => s.sendMessage);
  const acceptRequest = useDMStore((s) => s.acceptRequest);
  const declineRequest = useDMStore((s) => s.declineRequest);
  const blockAndReport = useDMStore((s) => s.blockAndReport);

  const [inputContent, setInputContent] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<Set<string>>(new Set());

  const conv = chats.find((c) => c.id === conversationId) || requests.find((c) => c.id === conversationId);
  const isPending = conv?.status === 'pending';
  const otherUser = conv?.otherUser || {
    id: conv?.participant_two || '',
    displayName: 'Kshetra User',
    role: 'citizen',
    isVerified: false,
  };

  const messages = (conversationId ? activeMessages[conversationId] : []) || [];
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (conversationId) {
      loadThread(conversationId);
    }
  }, [conversationId, loadThread]);

  const handleSend = async () => {
    if (!inputContent.trim() || !conversationId) return;
    const text = inputContent.trim();
    setInputContent('');
    await sendMessage(conversationId, currentUserId, text);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleAccept = async () => {
    if (!conversationId) return;
    await acceptRequest(conversationId, currentUserId);
  };

  const handleDecline = async () => {
    if (!conversationId) return;
    Alert.alert(
      t('messages.declineTitle', { defaultValue: 'Decline Message Request' }),
      t('messages.declineConfirm', { defaultValue: 'This conversation will be removed. The sender will not be notified.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('messages.decline', { defaultValue: 'Decline' }),
          style: 'destructive',
          onPress: async () => {
            await declineRequest(conversationId, currentUserId);
            router.back();
          },
        },
      ],
    );
  };

  const handleBlockReportPrompt = () => {
    Alert.alert(
      t('messages.safetyOptions', { defaultValue: 'Safety & Moderation' }),
      t('messages.safetyDesc', { defaultValue: `Options for conversation with ${otherUser.displayName}:` }),
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
                    await blockAndReport(currentUserId, otherUser.id, 'blocked_by_user', undefined, conversationId);
                    router.back();
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
    await blockAndReport(currentUserId, otherUser.id, reportReason, reportDescription, conversationId);
    setReportModalVisible(false);
    Alert.alert(
      t('messages.reportedTitle', { defaultValue: 'Report Submitted' }),
      t('messages.reportedDesc', { defaultValue: 'Thank you for keeping Kshetra safe. The user has been blocked and flagged to our Trust & Safety queue.' }),
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            {otherUser.displayName}
          </Text>
          {otherUser.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
          )}
        </Pressable>

        {/* 3-dots Safety Menu (Ticket 3.4) */}
        <Pressable onPress={handleBlockReportPrompt} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="shield-half" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Pending Message Request Banner (Ticket 3.6) */}
      {isPending && (
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

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder={t('messages.typePlaceholder', { defaultValue: 'Send a direct message...' })}
          placeholderTextColor={colors.textMuted}
          value={inputContent}
          onChangeText={setInputContent}
          multiline
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: inputContent.trim() ? colors.primary : colors.textMuted },
          ]}
          onPress={handleSend}
          disabled={!inputContent.trim()}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('messages.reportTitle', { defaultValue: 'Report User & Conversation' })}
            </Text>

            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              {t('messages.selectReason', { defaultValue: 'Select primary reason for report:' })}
            </Text>

            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.key}
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
                  {r.label}
                </Text>
              </Pressable>
            ))}

            <TextInput
              style={[styles.reportInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Additional details (optional)..."
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
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                onPress={submitReport}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Submit Report & Block</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10 },
  reasonText: { fontSize: 14, fontWeight: '600' },
  reportInput: { borderWidth: 1, borderRadius: 12, padding: 12, height: 80, fontSize: 13 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
