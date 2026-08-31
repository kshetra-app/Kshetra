import React, { useState, useRef, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { PostType, Post, PostMedia, FeedScope } from '../lib/feedTypes';
import { useAuthStore } from '../stores/auth';
import { useActiveStateStore } from '../stores/activeState';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useFeedStore } from '../stores/feed';
import { STATES } from '@kshetra/shared';
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
  { key: 'discussion', icon: 'chatbubbles', tKey: 'postCard.discussion', color: '#145C68' },
  { key: 'news', icon: 'newspaper', tKey: 'postCard.news', color: '#A8201A' },
  { key: 'opinion', icon: 'megaphone', tKey: 'postCard.opinion', color: '#D97706' },
  { key: 'question', icon: 'help-circle', tKey: 'postCard.question', color: '#B45309' },
  { key: 'poll', icon: 'stats-chart', tKey: 'postCard.poll', color: '#C5A059' },
  { key: 'alert', icon: 'alert-circle', tKey: 'postCard.alert', color: '#C0392B' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
];

const MAX_CONTENT_LENGTH = 2000;
const MAX_POLL_OPTIONS = 4;

export default function ComposeSheet({
  visible,
  onClose,
  onSubmit,
  onEditSubmit,
  editPost,
  replyTo,
}: ComposeSheetProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [targetScope, setTargetScope] = useState<FeedScope>('state');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.user);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const stateName = (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
  const myHome = useMyConstituencyStore((s) => s.home);
  const selectedConstituency = useFeedStore((s) => s.selectedConstituency);

  const activeConstituency = selectedConstituency
    ? { acNo: parseInt(selectedConstituency.id.split('-AC-')[1] || '0', 10), name: selectedConstituency.name }
    : myHome;

  const isEditMode = !!editPost;

  useEffect(() => {
    if (visible) {
      if (editPost) {
        setContent(editPost.content);
        setPostType(editPost.type);
        setMediaItems(editPost.media ?? []);
        setLanguage(editPost.language ?? (i18n.language || 'en'));
      } else {
        setLanguage(i18n.language || 'en');
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setContent('');
      setPostType('discussion');
      setPollOptions(['', '']);
      setMediaItems([]);
      setShowLinkInput(false);
      setLinkUrl('');
      setShowLangPicker(false);
    }
  }, [visible, editPost, i18n.language]);

  const canSubmit = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH;
  const isPoll = postType === 'poll';
  const validPollOptions = pollOptions.filter((o) => o.trim().length > 0);
  const canSubmitPoll = isPoll ? validPollOptions.length >= 2 : true;

  const addLinkMedia = () => {
    const url = linkUrl.trim();
    if (!url) return;
    setMediaItems((prev) => [
      ...prev,
      {
        id: `media-${Date.now()}`,
        mediaType: 'link',
        url,
        altText: url.replace(/https?:\/\//, '').slice(0, 40),
      },
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
      logContentAction('edit_post', {
        type: 'post',
        id: editPost.id,
        body: content.trim(),
        screenName: 'compose',
      });
      onClose();
      return;
    }

    if (!gateContentAction('create_post')) return;

    const now = new Date().toISOString();
    const authorName = user?.email?.split('@')[0] ?? 'Citizen';
    const hashtags = content.match(/#(\w+)/g)?.map((h) => h.slice(1).toLowerCase()) ?? [];

    // Dynamically resolve target state and constituency based on user scope choice
    let targetState = stateCode === 'IN' ? 'NATIONAL' : stateCode;
    let constituencyId: string | undefined = undefined;
    let constituencyName: string | undefined = undefined;

    if (targetScope === 'national') {
      targetState = 'NATIONAL';
    } else if (targetScope === 'constituency' && activeConstituency) {
      constituencyId = `${targetState}-AC-${activeConstituency.acNo}`;
      constituencyName = activeConstituency.name;
    }

    const newPost: Post = {
      id: `local-${Date.now()}`,
      author: {
        id: user?.id ?? 'anon',
        displayName: authorName,
      },
      stateCode: targetState,
      constituencyId,
      constituencyName,
      content: content.trim(),
      type: isPoll ? 'poll' : postType,
      parentId: replyTo?.postId,
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isDeleted: false,
      language,
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
    logContentAction('create_post', {
      type: 'post',
      id: newPost.id,
      body: newPost.content,
      screenName: 'compose',
    });

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

  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background },
          Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 20 },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditMode
                ? t('compose.editTitle')
                : replyTo
                  ? t('compose.replyTo', { name: replyTo.authorName })
                  : t('compose.title')}
            </Text>
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!canSubmit || !canSubmitPoll) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || !canSubmitPoll}
            >
              <Text style={styles.submitText}>
                {isEditMode ? t('compose.save') : t('compose.submit')}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Scope / Visibility Selection */}
            {!replyTo && (
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {t('compose.selectScope')}
                </Text>
                <View style={styles.scopeOptions}>
                  <Pressable
                    style={[
                      styles.scopeChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      targetScope === 'national' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setTargetScope('national')}
                  >
                    <Ionicons
                      name="globe"
                      size={12}
                      color={targetScope === 'national' ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.scopeChipText,
                        { color: colors.textSecondary },
                        targetScope === 'national' && styles.scopeChipTextActive,
                      ]}
                    >
                      {t('common.scopes.national')}
                    </Text>
                  </Pressable>

                  {stateCode !== 'IN' && (
                    <Pressable
                      style={[
                        styles.scopeChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        targetScope === 'state' && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTargetScope('state')}
                    >
                      <Ionicons
                        name="map"
                        size={12}
                        color={targetScope === 'state' ? '#FFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.scopeChipText,
                          { color: colors.textSecondary },
                          targetScope === 'state' && styles.scopeChipTextActive,
                        ]}
                      >
                        {stateName}
                      </Text>
                    </Pressable>
                  )}

                  {activeConstituency && stateCode !== 'IN' && (
                    <Pressable
                      style={[
                        styles.scopeChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        targetScope === 'constituency' && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTargetScope('constituency')}
                    >
                      <Ionicons
                        name="location"
                        size={12}
                        color={targetScope === 'constituency' ? '#FFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.scopeChipText,
                          { color: colors.textSecondary },
                          targetScope === 'constituency' && styles.scopeChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {activeConstituency.name}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Language Selector */}
            <View style={styles.langSelectorRow}>
              <Pressable
                style={[styles.langTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowLangPicker(!showLangPicker)}
              >
                <Ionicons name="language" size={14} color={colors.primary} />
                <Text style={[styles.langTriggerText, { color: colors.text }]}>
                  {currentLangLabel}
                </Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Language dropdown modal list */}
            {showLangPicker && (
              <View style={[styles.langList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    style={[
                      styles.langOption,
                      language === l.code && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      setLanguage(l.code);
                      setShowLangPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        { color: colors.text },
                        language === l.code && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {l.label}
                    </Text>
                    {language === l.code && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Post Type selector */}
            {!replyTo && (
              <View style={styles.typeRow}>
                {POST_TYPES.map((pt) => {
                  const active = postType === pt.key;
                  return (
                    <Pressable
                      key={pt.key}
                      style={[
                        styles.typeChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        active && { backgroundColor: pt.color + '20', borderColor: pt.color },
                      ]}
                      onPress={() => setPostType(pt.key)}
                    >
                      <Ionicons
                        name={pt.icon as any}
                        size={13}
                        color={active ? pt.color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: colors.textSecondary },
                          active && { color: pt.color, fontWeight: '700' },
                        ]}
                      >
                        {t(pt.tKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Content input */}
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder={
                isPoll
                  ? t('compose.pollPlaceholder')
                  : replyTo
                    ? t('compose.replyPlaceholder')
                    : targetScope === 'constituency' && activeConstituency
                      ? t('compose.constituencyPlaceholder')
                      : t('compose.placeholder')
              }
              placeholderTextColor={colors.textMuted}
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
                { color: colors.textMuted },
                content.length > MAX_CONTENT_LENGTH * 0.9 && styles.charCountWarn,
              ]}
            >
              {content.length}/{MAX_CONTENT_LENGTH}
            </Text>

            {/* Media attachments */}
            {mediaItems.length > 0 && (
              <View style={styles.mediaList}>
                {mediaItems.map((m) => (
                  <View
                    key={m.id}
                    style={[styles.mediaItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Ionicons name="link" size={16} color={colors.primary} />
                    <Text style={[styles.mediaItemText, { color: colors.text }]} numberOfLines={1}>
                      {m.altText || m.url}
                    </Text>
                    <Pressable onPress={() => removeMedia(m.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Media toolbar */}
            {!isPoll && (
              <View style={[styles.mediaToolbar, { borderTopColor: colors.border }]}>
                <Pressable
                  style={styles.mediaButton}
                  onPress={() => setShowLinkInput(!showLinkInput)}
                  hitSlop={8}
                >
                  <Ionicons name="link" size={18} color={colors.primary} />
                  <Text style={[styles.mediaButtonText, { color: colors.textSecondary }]}>
                    {t('compose.addLink')}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Link input */}
            {showLinkInput && (
              <View style={styles.linkInputRow}>
                <TextInput
                  style={[styles.linkInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder={t('compose.linkPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Pressable
                  style={[styles.linkAddButton, { backgroundColor: colors.primary }, !linkUrl.trim() && styles.submitDisabled]}
                  onPress={addLinkMedia}
                  disabled={!linkUrl.trim()}
                >
                  <Text style={styles.linkAddText}>{t('compose.linkAdd')}</Text>
                </Pressable>
              </View>
            )}

            {/* Poll options builder */}
            {isPoll && (
              <View style={[styles.pollSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.pollSectionTitle, { color: colors.gold || colors.primary }]}>
                  {t('compose.pollOptions')}
                </Text>
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={styles.pollOptionRow}>
                    <TextInput
                      style={[styles.pollOptionInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor={colors.textMuted}
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
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
                {pollOptions.length < MAX_POLL_OPTIONS && (
                  <Pressable
                    style={styles.addOptionButton}
                    onPress={() => setPollOptions([...pollOptions, ''])}
                  >
                    <Ionicons name="add-circle" size={18} color={colors.primary} />
                    <Text style={[styles.addOptionText, { color: colors.primary }]}>
                      {t('compose.addOption')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  submitButton: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
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
  sectionRow: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scopeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  langSelectorRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  langTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  langTriggerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langList: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  langOptionText: {
    fontSize: 13,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 140,
    marginTop: 12,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarn: {
    color: '#EF4444',
  },
  pollSection: {
    marginTop: 16,
    borderTopWidth: 0.5,
    paddingTop: 14,
  },
  pollSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mediaList: {
    marginTop: 10,
    gap: 6,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  mediaItemText: {
    flex: 1,
    fontSize: 13,
  },
  mediaToolbar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaButtonText: {
    fontSize: 13,
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  linkAddButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
