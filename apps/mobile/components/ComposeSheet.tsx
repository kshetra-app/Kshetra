import AttachmentToolbar from './AttachmentToolbar';
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { validWebLink } from '../lib/feedAttachments';
import { uploadOriginalShortVideo } from '../lib/originalShortVideo';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { PostType, Post, PostMedia, FeedScope } from '../lib/feedTypes';
import { useAuthStore } from '../stores/auth';
import { useActiveStateStore } from '../stores/activeState';
import { resolveConstituencyForState, useMyConstituencyStore } from '../stores/myConstituency';
import { useFeedStore } from '../stores/feed';
import type { PostSubmissionOutcome } from '../stores/feed';
import { uuid } from 'expo-modules-core';
import { uploadShort } from '../lib/supabaseDataService';
import { CONTENT_LIMITS, exceedsFeedMediaLimit, STATES } from '@kshetra/shared';
import { gateContentAction, logContentAction } from '../lib/contentAccountability';
import { useContentPromotionStore } from '../stores/contentPromotion';
import { useUserProfileStore } from '../stores/userProfile';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';

interface ComposeSheetProps {
  publishingPage?: { id: string; name: string };
  visible: boolean;
  onClose: () => void;
  initialKind?: 'post' | 'short';
  onSubmit?: (post: Post) => Promise<PostSubmissionOutcome>;
  onEditSubmit?: (postId: string, content: string) => Promise<boolean | 'pending'>;
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

const { feedMedia, pollOptions: MAX_POLL_OPTIONS, short: shortLimits } = CONTENT_LIMITS;

export default function ComposeSheet({
  visible,
  onClose,
  initialKind = 'post',
  publishingPage,
  onSubmit = (post) => useFeedStore.getState().addPost(post),
  onEditSubmit,
  editPost,
  replyTo,
}: ComposeSheetProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const [kind, setKind] = useState(initialKind);
  const [shortTitle, setShortTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [shortVideo, setShortVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [shortTerms, setShortTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const shortRetry = useRef<{draft:string; id:string} | null>(null);
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

  const stateConstituencies = useMemo(
    () => (stateCode === 'IN' ? [] : getUnifiedConstituenciesForState(stateCode)),
    [stateCode],
  );
  const activeConstituency = useMemo(
    () => resolveConstituencyForState(stateCode, selectedConstituency, myHome, stateConstituencies),
    [stateCode, selectedConstituency, myHome, stateConstituencies],
  );
  const isShort = !editPost && !replyTo && kind === 'short';
  const effectiveTargetScope: FeedScope =
    stateCode === 'IN'
      ? 'national'
      : targetScope === 'constituency' && !activeConstituency
        ? 'state'
        : targetScope;

  useEffect(() => {
    if (targetScope !== effectiveTargetScope) setTargetScope(effectiveTargetScope);
  }, [effectiveTargetScope, targetScope]);

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
      setKind(initialKind);
      setShortTitle('');
      setShortDescription('');
      setShortVideo(null);
      setShortTerms(false);
      shortRetry.current = null;
      setContent('');
      setPostType('discussion');
      setPollOptions(['', '']);
      setMediaItems([]);
      setShowLinkInput(false);
      setLinkUrl('');
      setShowLangPicker(false);
    }
  }, [visible, editPost, i18n.language, initialKind]);

  const MAX_CONTENT_LENGTH = CONTENT_LIMITS.post[postType];
  const canSubmit = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH;
  const isPoll = postType === 'poll';
  const validPollOptions = pollOptions.filter((o) => o.trim().length > 0);
  const canSubmitPoll = isPoll ? validPollOptions.length >= 2 && new Set(validPollOptions.map((option) => option.trim().toLocaleLowerCase())).size === validPollOptions.length : true;

  const addAttachments = (incoming: PostMedia[]) => {
    const next = [...mediaItems, ...incoming];
    if (exceedsFeedMediaLimit(next)) {
      Alert.alert(t('common.limitReached'), t('compose.attachmentLimit', { defaultValue: 'Attach up to four items: three photos, one video and one link.' }));
      return false;
    }
    setMediaItems(next);
    return true;
  };

  const pickShortVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset || (asset.fileSize ?? 0) > shortLimits.maxBytes ||
        (asset.duration ?? 0) > shortLimits.maxSeconds * 1000 ||
        (asset.mimeType && asset.mimeType !== 'video/mp4')) {
      Alert.alert(t('common.error'), t('uploadShort.deviceVideoLimits', { defaultValue: 'Choose an H.264 MP4 video up to 60 seconds and 25 MB.' }));
      return;
    }
    setShortVideo(asset);
  };

  const pickMedia = async () => {
    if (mediaItems.length >= feedMedia.total) {
      Alert.alert(t('common.limitReached', { defaultValue: 'Limit reached' }), 'Attach up to four items: three photos, one video and one link.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('reportIssueSheet.permissionNeeded', { defaultValue: 'Permission needed' }),
        t('reportIssueSheet.permissionMsg', { defaultValue: 'Media library access is required to select photos or videos.' })
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: feedMedia.total - mediaItems.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newItems: PostMedia[] = result.assets.map((asset) => {
        const isVideo = asset.type === 'video' || /\.(mp4|mov|m4v|webm|avi|mkv|3gp)(\?.*)?$/i.test(asset.uri);
        return {
          id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          mediaType: isVideo ? 'video' : 'image',
          mimeType: asset.mimeType ?? undefined,
          url: asset.uri,
          thumbnailUrl: asset.uri,
          altText: asset.fileName || (isVideo ? 'Attached video' : 'Attached photo'),
        };
      });
      addAttachments(newItems);
    }
  };

  const takeCameraMedia = async (mode: 'image' | 'video' = 'image') => {
    if (mediaItems.length >= feedMedia.total) {
      Alert.alert(t('common.limitReached', { defaultValue: 'Limit reached' }), 'Attach up to four items: three photos, one video and one link.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('reportIssueSheet.permissionNeeded', { defaultValue: 'Permission needed' }),
        t('reportIssueSheet.permissionMsg', { defaultValue: 'Camera permission is required to capture media.' })
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: mode === 'video' ? ['videos'] : ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = mode === 'video' || asset.type === 'video';
      const newItem: PostMedia = {
        id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        mediaType: isVideo ? 'video' : 'image',
        mimeType: asset.mimeType ?? undefined,
        url: asset.uri,
        thumbnailUrl: asset.uri,
        altText: asset.fileName || (isVideo ? 'Attached video' : 'Attached photo'),
      };
      addAttachments([newItem]);
    }
  };

  const addLinkMedia = () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (!validWebLink(url)) {
      Alert.alert(t('compose.addLink'), t('compose.linkHelp', { defaultValue: 'Enter a complete http or https link.' }));
      return;
    }
    if (!addAttachments([
      {
        id: `media-${Date.now()}`,
        mediaType: 'link',
        url,
        altText: url.replace(/https?:\/\//, '').slice(0, 40),
      },
    ])) return;
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  };

  const submitForm = async () => {
    if (isShort) {
      if (!gateContentAction('create_post')) return;
      if (stateCode === 'IN' || !user?.id || !shortVideo || !shortTerms || !shortTitle.trim()) return;
      const short = {
        publisherPageId: publishingPage?.id,
        title: shortTitle.trim(),
        description: shortDescription.trim(),
        rightsConfirmed: shortTerms,
        language: language.split('-')[0],
        stateCode, stateName,
        constituencyId: effectiveTargetScope === 'constituency' && activeConstituency
          ? `${stateCode}-AC-${activeConstituency.acNo}` : undefined,
        hashtags: shortDescription.match(/#[^\s#]+/gu)?.map((tag) => tag.slice(1)) ?? [],
      };
      const draft = JSON.stringify([user.id, shortVideo.uri, short]);
      if (shortRetry.current?.draft !== draft) shortRetry.current = {draft, id:uuid.v4()};
      let videoPath: string;
      try {
        videoPath = await uploadOriginalShortVideo(shortVideo.uri, user.id, shortRetry.current.id);
      } catch (error) {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('feed.createPostFailedBody'));
        return;
      }
      const result = await uploadShort({ ...short, id: shortRetry.current.id, videoPath });
      if (!result.success || !result.id) {
        Alert.alert(t('common.error'), result.error ?? t('feed.createPostFailedBody'));
        return;
      }
      logContentAction('create_post', {type:'short', id:result.id, body:short.title, screenName:'compose'});
      Alert.alert(t('common.done'), t('uploadShort.alertSuccessMessage'));
      onClose();
      return;
    }
    if (!canSubmit || !canSubmitPoll) return;

    if (isEditMode && editPost) {
      if (!gateContentAction('edit_post')) return;
      const saved = await onEditSubmit?.(editPost.id, content.trim());
      if (!saved) {
        Alert.alert(t('feed.editFailed', { defaultValue: 'Could not save this edit. Check your connection and try again.' }));
        return;
      }
      if (saved === 'pending') Alert.alert(t('feed.postReviewPending'));
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

    if (effectiveTargetScope === 'national') {
      targetState = 'NATIONAL';
    } else if (effectiveTargetScope === 'constituency' && activeConstituency) {
      constituencyId = `${targetState}-AC-${activeConstituency.acNo}`;
      constituencyName = activeConstituency.name;
    }

    const clientToken = `client_post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newPost: Post = {
      publisherPageId: publishingPage?.id,
      id: clientToken,
      clientToken,
      syncStatus: 'SYNCING',
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
            id: `poll_client_${Date.now()}`,
            question: content.trim(),
            options: validPollOptions.map((label, idx) => ({
              id: `opt_client_${Date.now()}_${idx}`,
              label,
              voteCount: 0,
              sortOrder: idx,
            })),
            totalVotes: 0,
            isClosed: false,
          }
        : undefined,
    };

    const submission = await onSubmit(newPost);
    if (submission === 'failed') {
      Alert.alert(
        t('feed.createPostFailed', { defaultValue: 'Could not publish this post' }),
        useFeedStore.getState().lastError || t('feed.createPostFailedBody', { defaultValue: 'Check your connection and try again.' }),
      );
      return;
    }
    if (submission === 'pending') {
      Alert.alert(t('feed.postReviewPending'));
    } else if (submission === 'rejected') {
      Alert.alert(t('feed.postReviewRejected'));
    } else if (submission === 'queued') {
      Alert.alert(
        t('feed.postQueuedTitle'),
        t('feed.postQueuedBody'),
      );
    } else if (submission === 'local') {
      Alert.alert(
        t('feed.postLocalTitle', { defaultValue: 'Local preview only' }),
        t('feed.postLocalBody', { defaultValue: 'This post is stored only in the development preview and was not published.' }),
      );
    }

    if (!IS_LIVE_ENVIRONMENT && (submission === 'synced' || submission === 'local')) {
      const profile = useUserProfileStore.getState().profile;
      const persistedPost = useFeedStore.getState().posts.find((item) =>
        item.clientToken === newPost.clientToken || item.id === newPost.id,
      );
      useContentPromotionStore.getState().registerContent({
        contentType: postType === 'news' ? 'news' : postType === 'opinion' ? 'opinion' : 'post',
        contentId: persistedPost?.id ?? newPost.id,
        authorId: user?.id ?? 'anon',
        constituencyId: newPost.constituencyId ?? null,
        stateCode: newPost.stateCode ?? null,
        postType,
        authorRole: profile?.role ?? 'citizen',
        authorReputation: profile?.reputation ?? 0,
        isAuthorVerified: profile?.isVerified ?? false,
      });
    }

    onClose();
  };

  const canSubmitForm = isShort ? !!(stateCode !== 'IN' && shortTitle.trim() && shortVideo && shortTerms) : canSubmit && canSubmitPoll;
  const handleSubmit = async () => {
    if (saveLock.current || !canSubmitForm) return;
    saveLock.current = true;
    setSaving(true);
    try {
      await submitForm();
    } catch {
      Alert.alert(t('common.error'), t('feed.createPostFailedBody'));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  return (
    <Modal visible={visible} onRequestClose={() => {if (!saveLock.current) onClose();}} animationType="slide" statusBarTranslucent>
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
            <Pressable disabled={saving} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditMode
                ? t('compose.editTitle')
                : replyTo
                  ? t('compose.replyTo', { name: replyTo.authorName })
                  : isShort ? t('uploadShort.title') : t('compose.title')}
            </Text>
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (saving || !canSubmitForm) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={saving || !canSubmitForm}
            >
              <Text style={styles.submitText}>
                {isEditMode ? t('compose.save') : isShort ? t('common.submit') : t('compose.submit')}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {publishingPage && (
              <Text style={{ color: colors.primary, fontWeight: '700', margin: 16 }}>
                {t('partyRegistry.publishingAs', { defaultValue: 'Publishing as {{page}}', page: publishingPage.name })}
              </Text>
            )}
            {!replyTo && !isEditMode && (
              <View style={styles.typeRow}>
                {(['post','short'] as const).map((value) => (
                  <Pressable key={value} disabled={saving} accessibilityRole="button"
                    accessibilityState={{selected:kind === value}}
                    onPress={() => setKind(value)} style={[styles.typeChip,{borderColor: colors.border, backgroundColor:kind === value ? colors.primary : colors.surface}]}>
                    <Text style={[styles.typeChipText,{color:kind === value ? '#fff' : colors.text}]}>{t(value === 'post' ? 'tabs.feed' : 'tabs.shorts')}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.sectionRow}>
              <Pressable onPress={() => setShowLangPicker((open) => !open)} accessibilityRole="button"
                style={[styles.scopeChip, { borderColor: colors.border }]}>
                <Ionicons name="language" size={16} color={colors.primary} />
                <Text style={{ color: colors.text }}>{currentLangLabel}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
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

            {isShort ? (
              <View style={styles.shortFields}>
                {stateCode === 'IN' ? <Text style={{ color: colors.textSecondary }}>{t('uploadShort.chooseState', { defaultValue: 'Select a state to publish a Short.' })}</Text> :
                  <View style={styles.scopeOptions}>
                    <Pressable onPress={() => setTargetScope('state')} accessibilityRole="button"
                      accessibilityState={{ selected: effectiveTargetScope !== 'constituency' }}
                      style={[styles.scopeChip, { borderColor: effectiveTargetScope !== 'constituency' ? colors.primary : colors.border }]}>
                      <Text style={{ color: colors.text }}>{stateName}</Text>
                    </Pressable>
                    {activeConstituency && <Pressable onPress={() => setTargetScope('constituency')} accessibilityRole="button"
                      accessibilityState={{ selected: effectiveTargetScope === 'constituency' }}
                      style={[styles.scopeChip, { borderColor: effectiveTargetScope === 'constituency' ? colors.primary : colors.border }]}>
                      <Text style={{ color: colors.text }}>{activeConstituency.name}</Text>
                    </Pressable>}
                  </View>}

                <Text style={{color:colors.text}}>{t('uploadShort.inputTitle')}</Text>
                <TextInput accessibilityLabel={t('uploadShort.inputTitle')} style={[styles.shortInput,{color:colors.text,borderColor:colors.border}]} value={shortTitle} onChangeText={setShortTitle} maxLength={shortLimits.title} />
                <Text style={{color:colors.text}}>{t('uploadShort.inputDescription')}</Text>
                <TextInput accessibilityLabel={t('uploadShort.inputDescription')} style={[styles.shortInput,{color:colors.text,borderColor:colors.border}]} value={shortDescription} onChangeText={setShortDescription} multiline maxLength={shortLimits.description} />
                <Text style={{color: colors.textMuted}}>{shortDescription.length}/{shortLimits.description}</Text>
                <Pressable onPress={pickShortVideo} accessibilityRole="button" style={[styles.shortInput, {borderColor: colors.border}]}>
                  <Text style={{color: colors.primary}}>{shortVideo ? t('uploadShort.changeDeviceVideo', {defaultValue: 'Change selected video'}) : t('uploadShort.chooseDeviceVideo', {defaultValue: 'Choose video from device'})}</Text>
                  {shortVideo && <Text numberOfLines={1} style={{color: colors.textSecondary}}>{shortVideo.fileName || 'MP4'}</Text>}
                </Pressable>
                <Text style={{color: colors.textMuted}}>{t('uploadShort.deviceVideoLimits', {defaultValue: 'Choose an H.264 MP4 video up to 60 seconds and 25 MB.'})}</Text>
                <Pressable accessibilityRole="checkbox" accessibilityState={{checked:shortTerms}} style={styles.shortAgreement} onPress={() => setShortTerms(!shortTerms)}>
                  <Ionicons name={shortTerms ? "checkbox" : "square-outline"} size={22} color={colors.primary}/>
                  <Text style={{color:colors.text,flex:1}}>{t('uploadShort.confirmRights')}</Text>
                </Pressable>
              </View>
            ) : (<>
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
                      effectiveTargetScope === 'national' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setTargetScope('national')}
                  >
                    <Ionicons
                      name="globe"
                      size={12}
                      color={effectiveTargetScope === 'national' ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.scopeChipText,
                        { color: colors.textSecondary },
                        effectiveTargetScope === 'national' && styles.scopeChipTextActive,
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
                        effectiveTargetScope === 'state' && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTargetScope('state')}
                    >
                      <Ionicons
                        name="map"
                        size={12}
                        color={effectiveTargetScope === 'state' ? '#FFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.scopeChipText,
                          { color: colors.textSecondary },
                          effectiveTargetScope === 'state' && styles.scopeChipTextActive,
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
                        effectiveTargetScope === 'constituency' && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTargetScope('constituency')}
                    >
                      <Ionicons
                        name="location"
                        size={12}
                        color={effectiveTargetScope === 'constituency' ? '#FFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.scopeChipText,
                          { color: colors.textSecondary },
                          effectiveTargetScope === 'constituency' && styles.scopeChipTextActive,
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
                  : effectiveTargetScope === 'constituency' && activeConstituency
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
                {/* Visual attachments (images / videos) */}
                {mediaItems.some((m) => m.mediaType === 'image' || m.mediaType === 'video') && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaThumbScroll}>
                    <View style={styles.mediaThumbRow}>
                      {mediaItems.map((m) => {
                        if (m.mediaType === 'link') return null;
                        return (
                          <View key={m.id} style={styles.mediaThumbCard}>
                            <Image source={{ uri: m.url }} style={styles.mediaThumbImage} contentFit="cover" />
                            {m.mediaType === 'video' && (
                              <View style={styles.videoBadge}>
                                <Ionicons name="videocam" size={12} color="#FFFFFF" />
                              </View>
                            )}
                            {!isEditMode && (
                              <Pressable style={styles.mediaThumbRemove} onPress={() => removeMedia(m.id)} hitSlop={6}>
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* Link attachments */}
                {mediaItems.map((m) => {
                  if (m.mediaType !== 'link') return null;
                  return (
                    <View
                      key={m.id}
                      style={[styles.mediaItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Ionicons name="link" size={16} color={colors.primary} />
                      <Text style={[styles.mediaItemText, { color: colors.text }]} numberOfLines={1}>
                        {m.altText || m.url}
                      </Text>
                      {!isEditMode && (
                        <Pressable onPress={() => removeMedia(m.id)} hitSlop={8}>
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {!isEditMode && mediaItems.length < feedMedia.total && (
              <AttachmentToolbar gallery={pickMedia} photo={() => takeCameraMedia('image')}
                video={() => takeCameraMedia('video')} link={() => setShowLinkInput(!showLinkInput)} />
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
                  maxLength={2048}
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
                      maxLength={CONTENT_LIMITS.pollOption}
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

            </>)}
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
  shortFields:{gap:10,marginTop:16},
  shortInput:{borderWidth:1,borderRadius:10,paddingHorizontal:14,paddingVertical:10,fontSize:16},
  shortAgreement:{flexDirection:'row',alignItems:'center',gap:8,minHeight:44},
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
  mediaThumbScroll: {
    marginBottom: 6,
  },
  mediaThumbRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaThumbCard: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaThumbImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: '#0A0A1ACC',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaThumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0A0A1A99',
    borderRadius: 10,
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
