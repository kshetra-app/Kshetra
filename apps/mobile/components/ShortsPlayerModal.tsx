import { useTranslation as useScreenTranslation } from 'react-i18next';
import { resolveOriginalShortVideo } from '../lib/originalShortVideo';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  StatusBar,
  Animated,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Share,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { PoliticalShort } from '../data/politicalShortsData';
import { formatCount } from '../data/politicalShortsData';
import { usePoliticalShortsStore } from '../stores/politicalShorts';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';
import { useAuthStore } from '../stores/auth';
import { gateContentAction, logContentAction } from '../lib/contentAccountability';
import { addShortComment, fetchShortComments } from '../lib/supabaseDataService';
import { apiClient } from '../lib/api';
import type { ShortCommentDTO } from '../lib/api/endpoints/shorts';

interface ShortsPlayerModalProps {
  visible: boolean;
  shorts: PoliticalShort[];
  initialIndex: number;
  onClose: () => void;
}

export default function ShortsPlayerModal({
  visible,
  shorts,
  initialIndex,
  onClose,
}: ShortsPlayerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // State from stores
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id || 'anon-user';
  const myHome = useMyConstituencyStore((s) => s.home);
  const activeStateCode = useActiveStateStore((s) => s.stateCode);
  const userConstituencyId = myHome ? `${activeStateCode}-AC-${myHome.acNo}` : undefined;

  const approveShort = usePoliticalShortsStore((s) => s.approveShort);
  const flagShort = usePoliticalShortsStore((s) => s.flagShort);
  const incrementViews = usePoliticalShortsStore((s) => s.incrementViews);
  const userApprovals = usePoliticalShortsStore((s) => s.userApprovals);
  const flaggedShorts = usePoliticalShortsStore((s) => s.flaggedShorts);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Render Page
  const renderShort = useCallback(
    ({ item, index }: { item: PoliticalShort; index: number }) => {
      const isActive = index === currentIndex;
      
      const isApproved = (userApprovals[item.id] || []).some((app) => app.userId === userId);
      const isFlagged = (flaggedShorts[item.id] || []).includes(userId);

      return (
        <ShortPageItem
          item={item}
          isActive={isActive}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          userConstituencyId={userConstituencyId}
          isApproved={isApproved}
          isFlagged={isFlagged}
          onApprove={() => approveShort(item.id, userId, userConstituencyId || '')}
          onFlag={() => flagShort(item.id, userId)}
          onClose={onClose}
          incrementViews={() => incrementViews(item.id)}
        />
      );
    },
    [currentIndex, screenWidth, screenHeight, userApprovals, flaggedShorts, userId, userConstituencyId, approveShort, flagShort, incrementViews, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <FlatList
          data={shorts}
          keyExtractor={(item) => item.id}
          renderItem={renderShort}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenHeight,
            offset: screenHeight * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Progress dots at the top */}
        <View style={[styles.progressContainer, { top: insets.top + 48 }]}>
          {shorts.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === currentIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ─── Individual Page Component ──────────────────────────────────────────────
interface ShortPageItemProps {
  item: PoliticalShort;
  isActive: boolean;
  screenWidth: number;
  screenHeight: number;
  userConstituencyId: string | undefined;
  isApproved: boolean;
  isFlagged: boolean;
  onApprove: () => void;
  onFlag: () => void;
  onClose: () => void;
  incrementViews: () => void;
}

function ShortPageItem({
  item,
  isActive,
  screenWidth,
  screenHeight,
  userConstituencyId,
  isApproved,
  isFlagged,
  onApprove,
  onFlag,
  onClose,
  incrementViews,
}: ShortPageItemProps) {
  const { t: translateScreenLabel } = useScreenTranslation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  // Curation popup states
  const [showCurationPrompt, setShowCurationPrompt] = useState(false);
  const [hasCurationPromptShown, setHasCurationPromptShown] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Curation comments list state
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<ShortCommentDTO[]>([]);
  const [commentsTotal, setCommentsTotal] = useState<number | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [commentsLoadMoreError, setCommentsLoadMoreError] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const viewerId = useAuthStore((state) => state.user?.id);
  const commentRequest = useRef(0);
  const writingComment = useRef(false);

  const refreshComments = useCallback(async () => {
    const request = ++commentRequest.current;
    setCommentsLoading(true);
    setCommentsLoadingMore(false);
    setCommentsError(false);
    setCommentsLoadMoreError(false);
    setComments([]);
    setCommentsTotal(null);
    setCommentsOffset(0);
    const result = await fetchShortComments(item.id, { offset: 0, limit: 50, authenticated: Boolean(viewerId) });
    if (request !== commentRequest.current) return;
    if (result) {
      setComments(result.comments);
      setCommentsTotal(result.total);
      setCommentsOffset(result.comments.length);
    } else {
      setCommentsError(true);
      setCommentsTotal(null);
    }
    setCommentsLoading(false);
  }, [item.id, viewerId]);

  const loadMoreComments = useCallback(async () => {
    if (commentsLoading || commentsLoadingMore || writingComment.current || commentsTotal === null || commentsOffset >= commentsTotal) {
      return;
    }
    const request = ++commentRequest.current;
    setCommentsLoadingMore(true);
    setCommentsLoadMoreError(false);
    const result = await fetchShortComments(item.id, { offset: commentsOffset, limit: 50, authenticated: Boolean(viewerId) });
    if (request !== commentRequest.current) return;
    if (result) {
      setComments((current) => {
        const knownIds = new Set(current.map((comment) => comment.id));
        return [...current, ...result.comments.filter((comment) => !knownIds.has(comment.id))];
      });
      setCommentsTotal(result.total);
      setCommentsOffset((offset) => offset + result.comments.length);
    } else {
      setCommentsLoadMoreError(true);
    }
    setCommentsLoadingMore(false);
  }, [commentsLoading, commentsLoadingMore, commentsOffset, commentsTotal, item.id, viewerId]);

  useEffect(() => {
    if (!commentsVisible) return;
    setEditingCommentId(null);
    setCommentText('');
    void refreshComments();
    return () => { commentRequest.current++; };
  }, [commentsVisible, refreshComments]);

  // Curation eligibility check
  const matchesCurationTarget = useMemo(() => {
    if (item.visibilityLevel === 'national') return false;
    if (!userConstituencyId) return false;

    if (item.visibilityLevel === 'constituency') {
      // Must be same constituency
      return userConstituencyId === item.constituencyId;
    }
    if (item.visibilityLevel === 'state') {
      // Must be different constituency in the same state
      return userConstituencyId !== item.constituencyId;
    }
    return false;
  }, [item.visibilityLevel, item.constituencyId, userConstituencyId]);

  // Handle Playback Activation / View logging
  useEffect(() => {
    if (isActive) {
      incrementViews();
      // Reset prompt state when scrolling away and back
      setHasCurationPromptShown(false);
      setShowCurationPrompt(false);
    }
  }, [isActive]);

  // 10-Second Watch Curation Timer
  useEffect(() => {
    if (isActive && matchesCurationTarget && !hasCurationPromptShown && !isApproved && !isFlagged) {
      const timer = setTimeout(() => {
        setShowCurationPrompt(true);
        setHasCurationPromptShown(true);
      }, 10000); // 10 seconds watch time
      return () => clearTimeout(timer);
    }
  }, [isActive, matchesCurationTarget, hasCurationPromptShown, isApproved, isFlagged]);

  const handleApproveAction = useCallback(() => {
    onApprove();
    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setShowCurationPrompt(false);
  }, [onApprove, pulseAnim]);

  const handleFlagAction = useCallback(() => {
    onFlag();
    setShowCurationPrompt(false);
    if (Platform.OS !== 'web') {
      Alert.alert(t('shortsPlayer.alertReportedTitle'), t('shortsPlayer.alertReportedMessage'));
    }
  }, [onFlag]);

  const handleSkipCuration = useCallback(() => {
    setShowCurationPrompt(false);
  }, []);

  const handleNativeShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${item.title}\n\n— via Poligram Shorts`,
      });
    } catch {}
  }, [item.title, item.videoUrl]);

  const handlePostComment = useCallback(async () => {
    const commentBody = commentText.trim();
    if (!commentBody || writingComment.current || commentsLoading || commentsLoadingMore) return;
    if (!gateContentAction('create_comment')) return;

    writingComment.current = true;
    setCommentSubmitting(true);

    try {
      if (editingCommentId) {
        const saved = await apiClient.shorts.editComment(item.id, editingCommentId, commentBody);
        if (!saved.success || saved.comment.id !== editingCommentId) throw new Error(t('postDetail.editCommentFailed'));
        setComments((current) => current.map((comment) => comment.id === editingCommentId ? saved.comment : comment));
        setEditingCommentId(null);
        setCommentText('');
        return;
      }
      await addShortComment(item.id, commentBody);
      setCommentText('');
      await refreshComments();
      try {
        logContentAction('create_comment', {
          type: 'political_short_comment',
          id: item.id,
          body: commentBody,
          screenName: 'shorts_player',
        });
      } catch (error) {
        console.warn('[Shorts] Saved comment could not be recorded in the local accountability log:', error);
      }
    } catch (err) {
      console.warn('[Shorts] Failed to persist comment to database:', err);
      Alert.alert(
        editingCommentId ? t('postDetail.editCommentFailed') : t('postDetail.commentFailed', { defaultValue: 'Comment not sent' }),
        err instanceof Error ? err.message : translateScreenLabel("screenLabels.ShortsPlayerModal.couldNotSaveYourCommentPleaseTry"),
      );
    } finally {
      writingComment.current = false;
      setCommentSubmitting(false);
    }
  }, [commentText, commentsLoading, commentsLoadingMore, editingCommentId, item.id, refreshComments, t]);

  function confirmRemoveComment(commentId: string) {
    Alert.alert(t('postDetail.deleteComment'), t('postDetail.deleteCommentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          if (writingComment.current) return;
          writingComment.current = true;
          setCommentSubmitting(true);
          try {
            const removed = await apiClient.shorts.deleteComment(item.id, commentId);
            if (!removed.success || removed.id !== commentId) throw new Error(t('postDetail.deleteCommentFailed'));
            if (editingCommentId === commentId) { setEditingCommentId(null); setCommentText(''); }
            await refreshComments();
          } catch {
            Alert.alert(t('postDetail.deleteCommentFailed', { defaultValue: 'The comment could not be removed.' }));
          } finally {
            writingComment.current = false;
            setCommentSubmitting(false);
          }
        },
      },
    ]);
  }

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let current = true;
    setVideoError(false);
    setStreamUrl(null);
    setWebViewLoading(true);
    resolveOriginalShortVideo(item.videoUrl).then((url) => {
      if (!current) return;
      if (url) setStreamUrl(url);
      else { setWebViewLoading(false); setVideoError(true); }
    }).catch(() => {
      if (current) { setWebViewLoading(false); setVideoError(true); }
    });
    return () => { current = false; };
  }, [isActive, item.videoUrl, playbackAttempt]);

  const playerHtml = useMemo(() => {
    const safeUrl = (streamUrl ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
      <body style="margin:0;background:black">
      <video src="${safeUrl}" style="width:100vw;height:100vh;object-fit:contain"
        playsinline controls autoplay muted loop
        onloadeddata="window.ReactNativeWebView.postMessage('ready')"
        onerror="window.ReactNativeWebView.postMessage('error')"></video></body>`;
  }, [streamUrl]);

  return (
    <View style={[styles.shortPage, { width: screenWidth, height: screenHeight }]}>
      {isActive && streamUrl && !videoError && (
        <View style={StyleSheet.absoluteFill}>
          <WebView
            key={streamUrl}
            style={{ flex: 1, backgroundColor: '#000' }}
            source={{ html: playerHtml }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
            onMessage={(event) => {
              setWebViewLoading(false);
              if (event.nativeEvent.data === 'error') setVideoError(true);
            }}
            onError={() => { setWebViewLoading(false); setVideoError(true); }}
          />
        </View>
      )}
      {isActive && webViewLoading && !videoError && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
          <ActivityIndicator size="large" color="#4F8EF7" />
        </View>
      )}
      {isActive && videoError && (
        <View style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={{ color: '#FFFFFF' }}>{t('shortsPlayer.videoUnavailable')}</Text>
          <Pressable onPress={() => setPlaybackAttempt((attempt) => attempt + 1)} style={{ padding: 16 }}>
            <Text style={{ color: '#4F8EF7' }}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.brandingRow}>
          <Ionicons name="play-circle" size={18} color="#FF4444" />
          <Text style={styles.brandingText}>{t('shortsPlayer.branding')}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Right sidebar — interaction buttons */}
      <View style={[styles.sidebar, { bottom: 140 + insets.bottom }]}>
        {/* Approve/Promote Button */}
        <Pressable style={styles.sidebarBtn} onPress={handleApproveAction} disabled={isApproved}>
          <Animated.View style={{ transform: [{ scale: isApproved ? pulseAnim : 1 }] }}>
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={30}
              color={isApproved ? '#10B981' : '#FFFFFF'}
            />
          </Animated.View>
          <Text style={styles.sidebarCount}>
            {isApproved ? translateScreenLabel("partyRegistry.claim.approved") : translateScreenLabel("shortsPlayer.approve")}
          </Text>
        </Pressable>

        {/* Comments Button */}
        <Pressable style={styles.sidebarBtn} onPress={() => setCommentsVisible(true)}>
          <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
          <Text style={styles.sidebarCount}>
            {commentsTotal === null ? t('shortsPlayer.comments') : formatCount(commentsTotal)}
          </Text>
        </Pressable>

        {/* Share Button */}
        <Pressable style={styles.sidebarBtn} onPress={handleNativeShare}>
          <Ionicons name="share-social-outline" size={26} color="#FFFFFF" />
          <Text style={styles.sidebarCount}>{t('shortsPlayer.share')}</Text>
        </Pressable>

        {/* Flag Button */}
        <Pressable style={styles.sidebarBtn} onPress={handleFlagAction} disabled={isFlagged}>
          <Ionicons
            name={isFlagged ? 'flag' : 'flag-outline'}
            size={26}
            color={isFlagged ? '#EF4444' : '#FFFFFF'}
          />
          <Text style={[styles.sidebarCount, isFlagged && { color: '#EF4444' }]}>
            {isFlagged ? translateScreenLabel("contentGate.flagged") : translateScreenLabel("common.report")}
          </Text>
        </Pressable>

        {/* Bookmark Button */}
        <Pressable style={styles.sidebarBtn} onPress={() => setSaved(!saved)}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? '#FFD700' : '#FFFFFF'}
          />
          <Text style={styles.sidebarCount}>{saved ? translateScreenLabel("screenLabels.ShortsPlayerModal.saved") : translateScreenLabel("common.save")}</Text>
        </Pressable>
      </View>

      {/* Bottom metadata overlay — minimal & clean */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomGradient} />

        <View style={styles.metaContent}>
          {/* Channel + State */}
          <View style={styles.channelRow}>
            <View style={[styles.channelAvatar, { backgroundColor: item.stateAccent }]}>
              <Text style={styles.channelAvatarText}>
                {item.channelName.charAt(0)}
              </Text>
            </View>
            <Text style={styles.channelName} numberOfLines={1}>{item.channelName}</Text>
            {item.channelVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#4F8EF7" />
            )}
            <View style={[styles.stateBadge, { backgroundColor: item.stateAccent + '30', marginLeft: 8 }]}>
              <Text style={[styles.stateBadgeText, { color: item.stateAccent }]}>
                {item.stateName}
              </Text>
            </View>
          </View>

          {/* Title only — no description */}
          <Text style={styles.shortTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {/* Single hashtag row */}
          <View style={styles.tagsRow}>
            {item.hashtags.slice(0, 3).map((tag) => (
              <Text key={tag} style={styles.hashtagText}>
                #{tag}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Post-Watch Curation Prompt Popup */}
      {showCurationPrompt && (
        <View style={[styles.curationPromptContainer, { bottom: 220 + insets.bottom }]}>
          <View style={styles.curationPromptContent}>
            <View style={styles.curationPromptHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
              <Text style={styles.curationPromptTitle}>{t('shortsPlayer.democraticCuration')}</Text>
            </View>
            <Text style={styles.curationPromptText}>
              {item.visibilityLevel === 'constituency'
                ? translateScreenLabel("screenLabels.ShortsPlayerModal.asAVerifiedConstituentOfValue1Is", { value1: item.stateName })
                : translateScreenLabel("screenLabels.ShortsPlayerModal.helpVerifyThisVideoFromValue1To", { value1: item.stateName })}
            </Text>
            <View style={styles.curationPromptActions}>
              <Pressable style={[styles.promptBtn, styles.promptBtnApprove]} onPress={handleApproveAction}>
                <Ionicons name="thumbs-up" size={16} color="#000000" />
                <Text style={styles.promptBtnApproveText}>{t('shortsPlayer.approve')}</Text>
              </Pressable>
              
              <Pressable style={[styles.promptBtn, styles.promptBtnFlag]} onPress={handleFlagAction}>
                <Ionicons name="flag" size={16} color="#FFFFFF" />
                <Text style={styles.promptBtnFlagText}>{t('shortsPlayer.flagShort')}</Text>
              </Pressable>
              
              <Pressable style={[styles.promptBtn, styles.promptBtnSkip]} onPress={handleSkipCuration}>
                <Text style={styles.promptBtnSkipText}>{t('shortsPlayer.skip')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Persisted comments modal */}
      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.commentsKeyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.commentsSheet}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                {t('shortsPlayer.comments')}{commentsTotal === null ? '' : ` (${formatCount(commentsTotal)})`}
              </Text>
              <Pressable onPress={() => setCommentsVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <FlatList
              style={styles.commentsList}
              keyboardShouldPersistTaps="handled"
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
                    <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                  {viewerId && c.canEdit && (
                    <View style={styles.commentActions}>
                      <Pressable accessibilityRole="button" disabled={commentSubmitting}
                        onPress={() => { setEditingCommentId(c.id); setCommentText(c.text); }}>
                        <Text style={styles.commentsRetry}>{t('common.edit')}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" disabled={commentSubmitting}
                        onPress={() => confirmRemoveComment(c.id)}>
                        <Text style={styles.commentsRetry}>{t('common.delete')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                commentsLoading ? (
                  <ActivityIndicator color="#FFFFFF" style={{ marginTop: 28 }} />
                ) : commentsError ? (
                  <View style={styles.commentsEmpty}>
                    <Text style={styles.commentText}>{translateScreenLabel("screenLabels.ShortsPlayerModal.commentsCouldNotBeLoaded")}</Text>
                    <Pressable onPress={() => void refreshComments()}>
                      <Text style={styles.commentsRetry}>{t('shortsPlayer.retry')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.commentsEmpty}>{t('shortsPlayer.noComments')}</Text>
                )
              }
              ListFooterComponent={
                commentsLoadMoreError || commentsLoadingMore || (commentsTotal !== null && commentsOffset < commentsTotal) ? (
                  <Pressable
                    style={styles.commentsLoadMore}
                    onPress={() => void loadMoreComments()}
                    disabled={commentsLoading || commentsLoadingMore}
                  >
                    {commentsLoadingMore ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.commentsRetry}>
                        {commentsLoadMoreError ? t('shortsPlayer.retry') : t('common.more')}
                      </Text>
                    )}
                  </Pressable>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            {/* Comment Input */}
            {editingCommentId && (
              <View style={[styles.commentActions, { paddingHorizontal: 16 }]}>
                <Text style={styles.commentText}>{t('postDetail.editingComment')}</Text>
                <Pressable accessibilityRole="button" disabled={commentSubmitting}
                  onPress={() => { setEditingCommentId(null); setCommentText(''); }}>
                  <Text style={styles.commentsRetry}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            )}
            <View style={[styles.commentInputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TextInput
                style={styles.commentInput}
                placeholder={t('shortsPlayer.addComment')}
                placeholderTextColor="#6B7280"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <Pressable style={styles.commentPostBtn} accessibilityRole="button"
                accessibilityLabel={editingCommentId ? t('common.save') : t('common.send')}
                onPress={() => void handlePostComment()}
                disabled={commentSubmitting || commentsLoading || commentsLoadingMore || !commentText.trim()}>
                {commentSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  commentActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginVertical: 6 },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  shortPage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },

  // ── Top bar ──────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Sidebar ──────────────────────────────────────────────────
  sidebar: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  sidebarBtn: {
    alignItems: 'center',
    gap: 4,
  },
  sidebarCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Bottom overlay ───────────────────────────────────────────
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 70, // leave space for sidebar
    zIndex: 10,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  metaContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  channelAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shortTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  shortDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hashtagText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '600',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewsText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // ── Progress dots ────────────────────────────────────────────
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 20,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
    borderRadius: 3,
  },

  // ── Curation Prompt Popup ────────────────────────────────────
  curationPromptContainer: {
    position: 'absolute',
    left: 16,
    right: 86, // leave space for sidebar
    zIndex: 30,
    alignItems: 'center',
  },
  curationPromptContent: {
    width: '100%',
    backgroundColor: 'rgba(15, 15, 26, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  curationPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  curationPromptTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  curationPromptText: {
    fontSize: 11,
    color: '#E5E7EB',
    lineHeight: 15,
  },
  curationPromptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  promptBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  promptBtnApprove: {
    backgroundColor: '#F59E0B',
  },
  promptBtnApproveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  promptBtnFlag: {
    backgroundColor: '#EF4444',
  },
  promptBtnFlagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  promptBtnSkip: {
    backgroundColor: '#374151',
  },
  promptBtnSkipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },

  // ── Comments Sheet UI ────────────────────────────────────────
  commentsKeyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsSheet: {
    height: '60%',
    backgroundColor: '#0F0F1A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
    gap: 4,
  },
  commentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 12,
    flexShrink: 1,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  commentTime: {
    fontSize: 10,
    color: '#4B5563',
  },
  commentText: {
    fontSize: 13,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  commentsEmpty: {
    marginTop: 28,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
  },
  commentsRetry: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  commentsLoadMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#111827',
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937',
    gap: 12,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 13,
  },
  commentPostBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
