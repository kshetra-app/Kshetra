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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostType, Post, PollOption, PostMedia } from '../lib/feedTypes';
import { useAuthStore } from '../stores/auth';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { gateContentAction, logContentAction } from '../lib/contentAccountability';
import { useContentPromotionStore } from '../stores/contentPromotion';
import { useUserProfileStore } from '../stores/userProfile';

interface ComposeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: Post) => void;
  onEditSubmit?: (postId: string, content: string, media?: PostMedia[]) => void;
  editPost?: Post;
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

export default function ComposeSheet({ visible, onClose, onSubmit, onEditSubmit, editPost, replyTo }: ComposeSheetProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>(replyTo ? 'discussion' : 'discussion');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.user);
  const myHome = useMyConstituencyStore((s) => s.home);
  const isEditMode = !!editPost;

  useEffect(() => {
    if (visible) {
      if (editPost) {
        setContent(editPost.content);
        setPostType(editPost.type);
        setMediaItems(editPost.media ?? []);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setContent('');
      setPostType('discussion');
      setPollOptions(['', '']);
      setMediaItems([]);
      setShowLinkInput(false);
      setLinkUrl('');
    }
  }, [visible, editPost]);

  const canSubmit = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH;
  const isPoll = postType === 'poll';
  const validPollOptions = pollOptions.filter((o) => o.trim().length > 0);
  const canSubmitPoll = isPoll ? validPollOptions.length >= 2 : true;

  const addLinkMedia = () => {
    const url = linkUrl.trim();
    if (!url) return;
    setMediaItems((prev) => [
      ...prev,
      { id: `media-${Date.now()}`, mediaType: 'link', url, altText: url.replace(/https?:\/\//, '').slice(0, 40) },
    ]);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = () => {
    if (!canSubmit || !canSubmitPoll) return;

    if (isEditMode && editPost) {
      if (!gateContentAction('edit_post')) return;
      onEditSubmit?.(editPost.id, content.trim(), mediaItems.length > 0 ? mediaItems : undefined);
      logContentAction('edit_post', { type: 'post', id: editPost.id, body: content.trim(), screenName: 'compose' });
      onClose();
      return;
    }

    if (!gateContentAction('create_post')) return;

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
      media: mediaItems.length > 0 ? mediaItems : undefined,
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
    logContentAction('create_post', { type: 'post', id: newPost.id, body: newPost.content, screenName: 'compose' });

    // Register in Content Promotion Pipeline
    const profile = useUserProfileStore.getState().profile;
    useContentPromotionStore.getState().registerContent({
      contentType: postType === 'news' ? 'news' : postType === 'opinion' ? 'opinion' : 'post',
      contentId: newPost.id,
      authorId: user?.id ?? 'anon',
      constituencyId: newPost.constituencyId ?? null,
      stateCode: newPost.stateCode ?? null,
      postType,
      authorRole: profile?.role ?? 'citizen',
      authorReputation: profile?.reputation ?? 0,
      isAuthorVerified: profile?.isVerified ?? false,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.container, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 24 }]}>
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
              {isEditMode
                ? t('compose.editTitle')
                : replyTo
                  ? t('compose.replyTo', { name: replyTo.authorName })
                  : t('compose.title')}
            </Text>
            <Pressable
              style={[styles.submitButton, (!canSubmit || !canSubmitPoll) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || !canSubmitPoll}
            >
              <Text style={styles.submitText}>{isEditMode ? t('compose.save') : t('compose.submit')}</Text>
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

            {/* Media attachments */}
            {mediaItems.length > 0 && (
              <View style={styles.mediaList}>
                {mediaItems.map((m) => (
                  <View key={m.id} style={styles.mediaItem}>
                    <Ionicons
                      name={m.mediaType === 'image' ? 'image' : m.mediaType === 'video' ? 'videocam' : 'link'}
                      size={16}
                      color="#4F8EF7"
                    />
                    <Text style={styles.mediaItemText} numberOfLines={1}>{m.altText || m.url}</Text>
                    <Pressable onPress={() => removeMedia(m.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Media toolbar */}
            {!isPoll && (
              <View style={styles.mediaToolbar}>
                <Pressable style={styles.mediaButton} onPress={() => setShowLinkInput(!showLinkInput)} hitSlop={8}>
                  <Ionicons name="link" size={18} color="#6B7280" />
                  <Text style={styles.mediaButtonText}>{t('compose.addLink')}</Text>
                </Pressable>
              </View>
            )}

            {/* Link input */}
            {showLinkInput && (
              <View style={styles.linkInputRow}>
                <TextInput
                  style={styles.linkInput}
                  placeholder={t('compose.linkPlaceholder')}
                  placeholderTextColor="#4B5563"
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Pressable
                  style={[styles.linkAddButton, !linkUrl.trim() && styles.submitDisabled]}
                  onPress={addLinkMedia}
                  disabled={!linkUrl.trim()}
                >
                  <Text style={styles.linkAddText}>{t('compose.linkAdd')}</Text>
                </Pressable>
              </View>
            )}

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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8DED1',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#241814',
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
    color: '#241814',
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
    borderColor: '#E8DED1',
    gap: 4,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#988275',
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
    color: '#241814',
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
    borderTopColor: '#E8DED1',
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
    backgroundColor: '#E8DED1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#241814',
    borderWidth: 1,
    borderColor: '#E8DED1',
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
  mediaList: {
    marginTop: 10,
    gap: 6,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8DED1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  mediaItemText: {
    flex: 1,
    fontSize: 13,
    color: '#6D5549',
  },
  mediaToolbar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E8DED1',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaButtonText: {
    fontSize: 13,
    color: '#988275',
    fontWeight: '600',
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#E8DED1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#241814',
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  linkAddButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#241814',
  },
});
