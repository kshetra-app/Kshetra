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
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { PoliticalShort } from '../data/politicalShortsData';
import { formatCount, formatDuration } from '../data/politicalShortsData';
import { usePoliticalShortsStore } from '../stores/politicalShorts';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';
import { useContributorVerificationStore } from '../stores/contributorVerification';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // State from stores
  const kycRecord = useContributorVerificationStore((s) => s.kycRecord);
  const userId = kycRecord?.userId || 'anon-user';
  const myHome = useMyConstituencyStore((s) => s.home);
  const activeStateCode = useActiveStateStore((s) => s.stateCode);
  const userConstituencyId = myHome ? `${activeStateCode}-AC-${myHome.acNo}` : undefined;

  const approveShort = usePoliticalShortsStore((s) => s.approveShort);
  const flagShort = usePoliticalShortsStore((s) => s.flagShort);
  const incrementViews = usePoliticalShortsStore((s) => s.incrementViews);
  const userApprovals = usePoliticalShortsStore((s) => s.userApprovals);
  const flaggedShorts = usePoliticalShortsStore((s) => s.flaggedShorts);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
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
          userId={userId}
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
  userId: string;
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
  userId,
  userConstituencyId,
  isApproved,
  isFlagged,
  onApprove,
  onFlag,
  onClose,
  incrementViews,
}: ShortPageItemProps) {
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
  const [comments, setComments] = useState([
    { id: '1', author: 'Ramesh G.', text: 'Very detailed report on this issue.', likes: 12, time: '2h ago' },
    { id: '2', author: 'Sowmya K.', text: 'The constituency needs immediate action on this.', likes: 8, time: '5h ago' },
    { id: '3', author: 'Anil Reddy', text: 'This was discussed in the assembly too.', likes: 4, time: '1d ago' },
  ]);

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
    Platform.OS !== 'web' ? Alert.alert(t('shortsPlayer.alertReportedTitle'), t('shortsPlayer.alertReportedMessage')) : null;
  }, [onFlag]);

  const handleSkipCuration = useCallback(() => {
    setShowCurationPrompt(false);
  }, []);

  const handleNativeShare = useCallback(() => {
    Platform.OS !== 'web' ? Alert.alert(t('shortsPlayer.alertShareTitle'), t('shortsPlayer.alertShareMessage', { title: item.title })) : null;
  }, [item.title]);

  const handlePostComment = useCallback(() => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      {
        id: Date.now().toString(),
        author: 'You (Verified)',
        text: commentText,
        likes: 0,
        time: 'Just now',
      },
      ...prev,
    ]);
    setCommentText('');
  }, [commentText]);

  // Formatted labels
  const visibilityBadgeLabel = useMemo(() => {
    if (item.visibilityLevel === 'constituency') return 'Constituency Phase';
    if (item.visibilityLevel === 'state') return 'State Phase';
    return 'National Vetted';
  }, [item.visibilityLevel]);

  const visibilityBadgeColor = useMemo(() => {
    if (item.visibilityLevel === 'constituency') return '#F59E0B'; // Orange
    if (item.visibilityLevel === 'state') return '#4F8EF7'; // Blue
    return '#10B981'; // Green
  }, [item.visibilityLevel]);

  const videoId = item.videoUrl.split('/').pop() || '';

  // YouTube IFrame Player API — loaded via HTML to bypass WebView detection.
  // baseUrl is a neutral third-party origin (NOT youtube.com) so YouTube
  // doesn't interpret this as a self-embed attempt (Error 152).
  const playerHtml = useMemo(() => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden}html,body{width:100%;height:100%;background:#000}#player{position:absolute;top:0;left:0;width:100%;height:100%}</style>
</head><body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src="https://www.youtube.com/iframe_api";
document.head.appendChild(tag);
var player;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    width:'100%',height:'100%',
    videoId:'${videoId}',
    playerVars:{playsinline:1,autoplay:1,controls:1,rel:0,modestbranding:1,fs:0,iv_load_policy:3,loop:1,playlist:'${videoId}'},
    events:{
      onReady:function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));},
      onError:function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',code:e.data}));}
    }
  });
}
</script>
</body></html>`, [videoId]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') { setVideoError(true); setWebViewLoading(false); }
      if (data.type === 'ready') setWebViewLoading(false);
    } catch {}
  }, []);

  const handleRetry = useCallback(() => {
    setVideoError(false);
    setWebViewLoading(true);
  }, []);

  return (
    <View style={[styles.shortPage, { width: screenWidth, height: screenHeight }]}>
      {/* YouTube IFrame API Player via HTML — proven approach (same as react-native-youtube-iframe) */}
      {isActive && !videoError && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' }}>
          <WebView
            key={videoId}
            style={{ flex: 1, backgroundColor: '#000' }}
            source={{ html: playerHtml, baseUrl: 'https://lonelycpp.github.io' }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={false}
            mixedContentMode="always"
            cacheEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => {/* wait for onReady postMessage instead */}}
            onError={() => { setWebViewLoading(false); setVideoError(true); }}
            onMessage={handleWebViewMessage}
          />
          {webViewLoading && (
            <View style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
              <ActivityIndicator size="large" color="#4F8EF7" />
            </View>
          )}
        </View>
      )}

      {/* Error fallback — open externally */}
      {videoError && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>{t('shortsPlayer.videoUnavailable')}</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
            {t('shortsPlayer.videoUnavailableDesc')}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
            style={{ backgroundColor: '#FF0000', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="logo-youtube" size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{t('shortsPlayer.openYouTube')}</Text>
          </Pressable>
          <Pressable onPress={handleRetry} style={{ marginTop: 14, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text style={{ color: '#4F8EF7', fontWeight: '700', fontSize: 13 }}>{t('shortsPlayer.retry')}</Text>
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
            {isApproved ? 'Approved' : 'Approve'}
          </Text>
        </Pressable>

        {/* Comments Button */}
        <Pressable style={styles.sidebarBtn} onPress={() => setCommentsVisible(true)}>
          <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
          <Text style={styles.sidebarCount}>{formatCount(item.commentCount + (comments.length - 3))}</Text>
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
            {isFlagged ? 'Flagged' : 'Report'}
          </Text>
        </Pressable>

        {/* Bookmark Button */}
        <Pressable style={styles.sidebarBtn} onPress={() => setSaved(!saved)}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? '#FFD700' : '#FFFFFF'}
          />
          <Text style={styles.sidebarCount}>{saved ? 'Saved' : 'Save'}</Text>
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
                ? `As a verified constituent of ${item.stateName}, is this video relevant and constructive for your constituency?`
                : `Help verify this video from ${item.stateName} to promote it to National level.`}
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

      {/* Mock Comments Modal Bottom Sheet */}
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
              <Text style={styles.commentsTitle}>{t('shortsPlayer.comments')} ({comments.length})</Text>
              <Pressable onPress={() => setCommentsVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <FlatList
              style={styles.commentsList}
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentTime}>{c.time}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                  <View style={styles.commentLikeRow}>
                    <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.commentLikeCount}>{c.likes}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TextInput
                style={styles.commentInput}
                placeholder={t('shortsPlayer.addComment')}
                placeholderTextColor="#6B7280"
                value={commentText}
                onChangeText={setCommentText}
              />
              <Pressable style={styles.commentPostBtn} onPress={handlePostComment}>
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 12,
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
  commentLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  commentLikeCount: {
    fontSize: 11,
    color: '#6B7280',
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
    height: 40,
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
