import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostType, Post, PollOption } from '../lib/feedTypes';
import { useAuthStore } from '../stores/auth';
import { useMyConstituencyStore } from '../stores/myConstituency';

interface ComposeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: Post) => void;
  replyTo?: { postId: string; authorName: string };
}

const POST_TYPES: { key: PostType; icon: string; tKey: string; color: string }[] = [
  { key: 'discussion', icon: 'chatbubbles', tKey: 'postCard.discussion', color: '#6366F1' },
  { key: 'news', icon: 'newspaper', tKey: 'postCard.news', color: '#3B82F6' },
  { key: 'opinion', icon: 'megaphone', tKey: 'postCard.opinion', color: '#F59E0B' },
  { key: 'question', icon: 'help-circle', tKey: 'postCard.question', color: '#10B981' },
  { key: 'poll', icon: 'stats-chart', tKey: 'postCard.poll', color: '#8B5CF6' },
];

const MAX_CONTENT_LENGTH = 2000;
const MAX_POLL_OPTIONS = 4;

export default function ComposeSheet({ visible, onClose, onSubmit, replyTo }: ComposeSheetProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>(replyTo ? 'discussion' : 'discussion');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.user);
  const myHome = useMyConstituencyStore((s) => s.home);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setContent('');
      setPostType('discussion');
      setPollOptions(['', '']);
    }
  }, [visible]);

  const canSubmit = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH;
  const isPoll = postType === 'poll';
  const validPollOptions = pollOptions.filter((o) => o.trim().length > 0);
  const canSubmitPoll = isPoll ? validPollOptions.length >= 2 : true;

  const handleSubmit = () => {
    if (!canSubmit || !canSubmitPoll) return;

    const now = new Date().toISOString();
    const authorName = user?.email?.split('@')[0] ?? 'Anonymous';

    // Extract hashtags from content
    const hashtags = content.match(/#(\w+)/g)?.map((h) => h.slice(1).toLowerCase()) ?? [];

    const newPost: Post = {
      id: `local-${Date.now()}`,
      author: {
        id: user?.id ?? 'anon',
        displayName: authorName,
      },
      stateCode: 'TS',
      constituencyId: myHome ? `TS-AC-${myHome.acNo}` : undefined,
      constituencyName: myHome?.name,
      content: content.trim(),
      type: isPoll ? 'poll' : postType,
      parentId: replyTo?.postId,
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      hashtags,
      poll: isPoll
        ? {
            id: `poll-local-${Date.now()}`,
            question: content.trim(),
            options: validPollOptions.map((label, idx) => ({
              id: `opt-local-${Date.now()}-${idx}`,
              label,
              voteCount: 0,
              sortOrder: idx,
            })),
            totalVotes: 0,
            isClosed: false,
          }
        : undefined,
    };

    onSubmit(newPost);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {replyTo ? t('compose.replyTo', { name: replyTo.authorName }) : t('compose.title')}
          </Text>
          <Pressable
            style={[styles.submitButton, (!canSubmit || !canSubmitPoll) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || !canSubmitPoll}
          >
            <Text style={styles.submitText}>{t('compose.submit')}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Type selector */}
          {!replyTo && (
            <View style={styles.typeRow}>
              {POST_TYPES.map((pt) => {
                const active = postType === pt.key;
                return (
                  <Pressable
                    key={pt.key}
                    style={[styles.typeChip, active && { backgroundColor: pt.color + '20', borderColor: pt.color + '40' }]}
                    onPress={() => setPostType(pt.key)}
                  >
                    <Ionicons name={pt.icon as any} size={14} color={active ? pt.color : '#6B7280'} />
                    <Text style={[styles.typeChipText, active && { color: pt.color }]}>
                      {t(pt.tKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Constituency badge */}
          {myHome && (
            <View style={styles.constituencyBadge}>
              <Ionicons name="location" size={14} color="#4F8EF7" />
              <Text style={styles.constituencyBadgeText}>
                {t('compose.postingIn', { name: myHome.name })}
              </Text>
            </View>
          )}

          {/* Content input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={
              isPoll
                ? t('compose.pollPlaceholder')
                : replyTo
                  ? t('compose.replyPlaceholder')
                  : t('compose.constituencyPlaceholder')
            }
            placeholderTextColor="#4B5563"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={MAX_CONTENT_LENGTH}
            textAlignVertical="top"
          />

          {/* Character count */}
          <Text
            style={[
              styles.charCount,
              content.length > MAX_CONTENT_LENGTH * 0.9 && styles.charCountWarn,
            ]}
          >
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>

          {/* Poll options */}
          {isPoll && (
            <View style={styles.pollSection}>
              <Text style={styles.pollSectionTitle}>{t('compose.pollOptions')}</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={styles.pollOptionRow}>
                  <TextInput
                    style={styles.pollOptionInput}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor="#4B5563"
                    value={opt}
                    onChangeText={(text) => {
                      const next = [...pollOptions];
                      next[idx] = text;
                      setPollOptions(next);
                    }}
                    maxLength={200}
                  />
                  {pollOptions.length > 2 && (
                    <Pressable
                      onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </Pressable>
                  )}
                </View>
              ))}
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <Pressable
                  style={styles.addOptionButton}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Ionicons name="add-circle" size={18} color="#4F8EF7" />
                  <Text style={styles.addOptionText}>{t('compose.addOption')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 4,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  constituencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  constituencyBadgeText: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    minHeight: 120,
    marginTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarn: {
    color: '#EF4444',
  },
  pollSection: {
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937',
    paddingTop: 14,
  },
  pollSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 10,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
  },
});
