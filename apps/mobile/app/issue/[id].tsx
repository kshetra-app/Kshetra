import { useTranslation as useScreenTranslation } from 'react-i18next';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCivicStore } from '../../stores/civic';
import { useAuthStore } from '../../stores/auth';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';
import {
  ISSUE_CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '../../lib/civicTypes';
import type { IssueComment, IssueStatusChange } from '../../lib/civicTypes';

import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { gateContentAction, logContentAction } from '../../lib/contentAccountability';

function isVideoUri(uri: string): boolean {
  return /\.(mp4|mov|m4v|webm|avi|mkv|3gp)(\?.*)?$/i.test(uri) || uri.includes('video');
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IssueDetailScreen() {
  const { t: translateScreenLabel } = useScreenTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const issues = useCivicStore((s) => s.issues);
  const loadIssueDetails = useCivicStore((s) => s.loadIssueDetails);
  const loadIssueComments = useCivicStore((s) => s.loadIssueComments);
  const editIssueComment = useCivicStore((s) => s.editIssueComment);
  const deleteIssueComment = useCivicStore((s) => s.deleteIssueComment);
  const commentPage = useCivicStore((s) => s.commentPages[id ?? '']);
  const viewerId = useAuthStore((s) => s.user?.id);
  const allComments = useCivicStore((s) => s.comments);
  const allHistory = useCivicStore((s) => s.statusHistory);
  const toggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const toggleFollow = useCivicStore((s) => s.toggleFollow);
  const tagMLA = useCivicStore((s) => s.tagMLA);
  const disputeResolution = useCivicStore((s) => s.disputeResolution);
  const addComment = useCivicStore((s) => s.addComment);
  const updateStatus = useCivicStore((s) => s.updateIssueStatus);
  const shareIssue = useCivicStore((s) => s.shareIssue);

  const issue = useMemo(() => issues.find((i) => i.id === id), [issues, id]);
  const comments = useMemo(
    () => allComments.filter((comment) => comment.issueId === id),
    [allComments, id],
  );
  const statusHistory = useMemo(
    () => allHistory.filter((h) => h.issueId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [allHistory, id],
  );

  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsTop = useRef(0);
  const commentInputRef = useRef<TextInput>(null);
  const commentWriteInProgress = useRef(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [loadState, setLoadState] = useState<{ id: string; status: 'loading' | 'loaded' | 'missing' | 'error' }>();
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!id) return;
    let current = true;
    setLoadState({ id, status: 'loading' });
    loadIssueDetails(id)
      .then((found) => { if (current) setLoadState({ id, status: found ? 'loaded' : 'missing' }); })
      .catch(() => { if (current) setLoadState({ id, status: 'error' }); });
    return () => { current = false; };
  }, [id, loadIssueDetails, reload, viewerId]));

  useFocusEffect(useCallback(() => {
    if (id) void loadIssueComments(id);
  }, [id, loadIssueComments]));

  useEffect(() => {
    setEditingCommentId(null);
    setCommentText('');
    setCommentError(null);
  }, [id, viewerId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/dashboard');
  };

  const status = loadState?.id === id ? loadState.status : 'loading';
  if (!issue || status !== 'loaded') {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: t('issueDetail.title', { defaultValue: 'Issue detail' }), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />
        {status === 'loading' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />}
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{status === 'loading' ? t('common.loading') : status === 'error'
          ? t('issueDetail.loadFailed', { defaultValue: 'This issue could not be loaded.' })
          : t('issueDetail.notFound', { defaultValue: 'Issue not found' })}</Text>
        {status === 'error' && <Pressable onPress={() => setReload((n) => n + 1)}><Text style={{ color: colors.primary }}>{t('common.retry', { defaultValue: 'Retry' })}</Text></Pressable>}
        <Pressable style={[styles.backButton, { backgroundColor: colors.surfaceElevated }]} onPress={goBack}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const catConfig = ISSUE_CATEGORY_CONFIG[issue.category];
  const sevConfig = SEVERITY_CONFIG[issue.severity];
  const authorityAcknowledged = statusHistory.some((entry) =>
    entry.actorRole === 'authority' && entry.toStatus === 'acknowledged');
  const statusConfig = issue.status === 'acknowledged' && !authorityAcknowledged
    ? { ...STATUS_CONFIG.acknowledged, label: t('issueDetail.legacyAcknowledgment', { defaultValue: 'Acknowledgment on record' }) }
    : STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.open;

  const handleShare = async () => {
    const text = shareIssue(issue.id);
    try {
      await Share.share({ message: text });
    } catch (_) {}
  };

  const handleTagMLA = () => {
    if (issue.mlaTagged) {
      Alert.alert(t('issueDetail.flagged', { defaultValue: 'Flagged in Poligram' }), t('issueDetail.flagAlreadyRecorded', { defaultValue: 'This issue is already flagged for representative attention.' }));
      return;
    }
    if (!gateContentAction('tag_mla')) return;
    Alert.alert(
      t('issueDetail.flagForRepresentative', { defaultValue: 'Flag issue' }),
      translateScreenLabel("screenLabels.issue.flagValue1ForRepresentativeAttentionInPoligram", { value1: issue.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('issueDetail.flagForRepresentative', { defaultValue: 'Flag issue' }),
          onPress: async () => {
            if (!await tagMLA(issue.id)) {
              Alert.alert(t('common.error'), t('issueDetail.actionFailed', { defaultValue: 'The change could not be saved. Please try again.' }));
              return;
            }
            logContentAction('tag_mla', {
              type: 'civic_issue',
              id: issue.id,
              body: issue.title,
              screenName: 'issue_detail',
            });
          },
        },
      ],
    );
  };

  const handleDispute = () => {
    if (issue.userDisputed) {
      Alert.alert(translateScreenLabel("screenLabels.issue.alreadyDisputed"), translateScreenLabel("screenLabels.issue.youHaveAlreadyDisputedThisResolution"));
      return;
    }
    if (!gateContentAction('dispute_resolution')) return;
    Alert.alert(
      translateScreenLabel("issueDetail.disputeResolution"),
      translateScreenLabel("screenLabels.issue.doYouBelieveThisIssueHasNot"),
      [
        { text: translateScreenLabel("common.cancel"), style: 'cancel' },
        {
          text: translateScreenLabel("screenLabels.issue.dispute"),
          style: 'destructive',
          onPress: async () => {
            if (!await disputeResolution(issue.id, 'Resolution not satisfactory')) {
              Alert.alert(t('common.error'), t('issueDetail.actionFailed', { defaultValue: 'The change could not be saved. Please try again.' }));
              return;
            }
            logContentAction('dispute_resolution', {
              type: 'civic_issue',
              id: issue.id,
              body: 'Resolution not satisfactory',
              screenName: 'issue_detail',
            });
          },
        },
      ],
    );
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentWriteInProgress.current || commentPage?.loading) return;
    if (!gateContentAction('create_comment')) return;
    commentWriteInProgress.current = true;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const commentContent = commentText.trim();
      if (editingCommentId) {
        if (!await editIssueComment(issue.id, editingCommentId, commentContent)) throw new Error('Comment edit failed');
        setEditingCommentId(null);
      } else {
        await addComment(issue.id, commentContent, 'You');
        void logContentAction('create_comment', {
          type: 'civic_issue_comment',
          id: issue.id,
          body: commentContent,
          screenName: 'issue_detail',
        });
        scrollViewRef.current?.scrollTo({ y: commentsTop.current, animated: true });
      }
      setCommentText('');
      Keyboard.dismiss();
    } catch {
      setCommentError(editingCommentId
        ? t('postDetail.editCommentFailed')
        : t('postDetail.commentFailed', { defaultValue: 'Comment not sent' }));
    } finally {
      commentWriteInProgress.current = false;
      setSubmittingComment(false);
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    Alert.alert(t('postDetail.deleteComment'), t('postDetail.deleteCommentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        if (commentWriteInProgress.current) return;
        commentWriteInProgress.current = true;
        setSubmittingComment(true);
        setCommentError(null);
        try {
          if (!await deleteIssueComment(issue.id, commentId)) {
            setCommentError(t('postDetail.deleteCommentFailed', { defaultValue: 'The comment could not be removed.' }));
            return;
          }
          if (editingCommentId === commentId) {
            setEditingCommentId(null);
            setCommentText('');
            Keyboard.dismiss();
          }
        } finally {
          commentWriteInProgress.current = false;
          setSubmittingComment(false);
        }
      } },
    ]);
  };

  const mediaUrls = issue.mediaUrls ?? [];
  const displayMedia = showAllMedia ? mediaUrls : mediaUrls.slice(0, 6);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
              style={{ padding: 4 }}
              onPress={() => setHelpVisible(true)}
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header Badges ── */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: catConfig.color + '20' }]}>
            <Ionicons name={catConfig.icon as any} size={13} color={catConfig.color} />
            <Text style={[styles.badgeText, { color: catConfig.color }]}>{catConfig.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sevConfig.color + '20' }]}>
            <Text style={[styles.badgeText, { color: sevConfig.color }]}>{sevConfig.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          {issue.isVerifiedReport && (
            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={[styles.badgeText, { color: '#10B981' }]}>{t('issueDetail.verified', { defaultValue: 'Verified' })}</Text>
            </View>
          )}
        </View>

        {/* ── Title + Description ── */}
        <Text style={styles.title}>{issue.title}</Text>
        {issue.description && <Text style={styles.description}>{issue.description}</Text>}

        {/* ── Meta ── */}
        <View style={styles.metaRow}>
          {issue.constituencyName && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={13} color="#4F8EF7" />
              <Text style={styles.metaLocation}>{issue.constituencyName}</Text>
            </View>
          )}
          <Text style={styles.metaGray}>{timeAgo(issue.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaGray}>{translateScreenLabel("screenLabels.issue.byValue1", { value1: issue.reporterName })}</Text>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up-circle" size={16} color="#10B981" />
            <Text style={styles.statValue}>{issue.upvoteCount}</Text>
            <Text style={styles.statLabel}>{t('issueDetail.upvotes', { defaultValue: 'Upvotes' })}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={16} color="#3B82F6" />
            <Text style={styles.statValue}>{issue.commentCount}</Text>
            <Text style={styles.statLabel}>{t('issueDetail.comments', { defaultValue: 'Comments' })}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#8B5CF6" />
            <Text style={styles.statValue}>{issue.followCount}</Text>
            <Text style={styles.statLabel}>{t('common.following')}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="camera" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>{issue.evidenceCount}</Text>
            <Text style={styles.statLabel}>{t('issueDetail.evidence', { defaultValue: 'Evidence' })}</Text>
          </View>
        </View>

        {/* ── Action Buttons (Disciplined Flex 1: Zero Overflow) ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, issue.userUpvoted && styles.actionBtnActive]}
            onPress={async () => {
              if (!gateContentAction('upvote_issue')) return;
              if (!await toggleUpvote(issue.id)) {
                Alert.alert(t('common.error'), t('issueDetail.actionFailed', { defaultValue: 'The change could not be saved. Please try again.' }));
                return;
              }
              logContentAction('upvote_issue', {
                type: 'civic_issue',
                id: issue.id,
                body: 'upvote',
                screenName: 'issue_detail',
              });
            }}
          >
            <Ionicons name={issue.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'} size={18} color={issue.userUpvoted ? '#059669' : '#64748B'} />
            <Text style={[styles.actionBtnText, issue.userUpvoted && { color: '#059669' }]}>
              {t('issueDetail.upvote', { defaultValue: 'Upvote' })}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, issue.userFollowing && styles.actionBtnActive]}
            onPress={async () => {
              if (!gateContentAction('follow_issue')) return;
              if (!await toggleFollow(issue.id)) {
                Alert.alert(t('common.error'), t('issueDetail.actionFailed', { defaultValue: 'The change could not be saved. Please try again.' }));
                return;
              }
              logContentAction('follow_issue', {
                type: 'civic_issue',
                id: issue.id,
                body: 'follow',
                screenName: 'issue_detail',
              });
            }}
          >
            <Ionicons name={issue.userFollowing ? 'notifications' : 'notifications-outline'} size={18} color={issue.userFollowing ? '#002B7F' : '#64748B'} />
            <Text style={[styles.actionBtnText, issue.userFollowing && { color: '#002B7F' }]}>
              {issue.userFollowing ? t('common.following', { defaultValue: 'Following' }) : t('common.follow', { defaultValue: 'Follow' })}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#64748B" />
            <Text style={styles.actionBtnText}>
              {t('common.share', { defaultValue: 'Share' })}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, issue.mlaTagged && styles.actionBtnActive]}
            onPress={handleTagMLA}
          >
            <Ionicons name="megaphone" size={18} color={issue.mlaTagged ? '#D97706' : '#64748B'} />
            <Text style={[styles.actionBtnText, issue.mlaTagged && { color: '#D97706' }]}>
              {issue.mlaTagged ? t('issueDetail.flagged', { defaultValue: 'Flagged in Poligram' }) : t('issueDetail.flagForRepresentative', { defaultValue: 'Flag issue' })}
            </Text>
          </Pressable>
        </View>

        {issue.viewerCanAcknowledge && issue.status === 'open' && (
          <Pressable accessibilityRole="button" style={styles.actionBtn} onPress={() => {
            Alert.alert(
              t('issueDetail.acknowledge', { defaultValue: 'Acknowledge as the verified authority' }),
              t('issueDetail.acknowledgeConfirm', { defaultValue: 'Record that your office has received this report?' }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.confirm'), onPress: async () => {
                  if (!await updateStatus(issue.id, 'acknowledged')) {
                    Alert.alert(t('common.error'), t('issueDetail.actionFailed', { defaultValue: 'The change could not be saved. Please try again.' }));
                  }
                } },
              ],
            );
          }}>
            <Text style={styles.actionBtnText}>{t('issueDetail.acknowledge', { defaultValue: 'Acknowledge as the verified authority' })}</Text>
          </Pressable>
        )}

        {/* ── Resolution Note ── */}
        {(issue.status === 'resolved' || issue.status === 'closed') && issue.resolutionNote && (
          <View style={styles.resolutionSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.sectionTitle}>{translateScreenLabel("issueDetail.resolution")}</Text>
            </View>
            <View style={styles.resolutionCard}>
              <Text style={styles.resolutionText}>{issue.resolutionNote}</Text>
              {issue.resolvedAt && (
                <Text style={styles.resolutionDate}>{translateScreenLabel("screenLabels.issue.resolvedValue1", { value1: formatDate(issue.resolvedAt) })}</Text>
              )}
            </View>
            {issue.status === 'resolved' && (
              <Pressable
                style={[styles.disputeBtn, issue.userDisputed && styles.disputeBtnDisabled]}
                onPress={handleDispute}
                disabled={issue.userDisputed}
              >
                <Ionicons name="flag" size={16} color={issue.userDisputed ? '#6B7280' : '#EF4444'} />
                <Text style={[styles.disputeBtnText, issue.userDisputed && { color: '#6B7280' }]}>
                  {issue.userDisputed ? translateScreenLabel("issueDetail.disputeFiled") : translateScreenLabel("issueDetail.disputeResolution")}
                </Text>
                {issue.disputeCount > 0 && (
                  <Text style={styles.disputeCount}>{issue.disputeCount}/5</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* ── Reopened Notice ── */}
        {issue.status === 'reopened' && (
          <View style={styles.reopenedBanner}>
            <Ionicons name="refresh-circle" size={18} color="#EF4444" />
            <Text style={styles.reopenedText}>{translateScreenLabel("screenLabels.issue.reopenedValue1CitizensDisputedTheResolution", { value1: issue.disputeCount })}</Text>
          </View>
        )}

        {/* ── Media Evidence Gallery ── */}
        {mediaUrls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>{translateScreenLabel("screenLabels.issue.evidenceValue1", { value1: mediaUrls.length })}</Text>
            </View>
            <View style={styles.mediaGrid}>
              {displayMedia.map((url, idx) => {
                const isVideo = isVideoUri(url);
                return (
                  <Pressable
                    key={`${url}-${idx}`}
                    style={styles.mediaGridItemWrap}
                    onPress={() => {
                      try {
                        Linking.openURL(url);
                      } catch (_) {}
                    }}
                    hitSlop={4}
                  >
                    <Image source={{ uri: url }} style={styles.mediaGridItem} contentFit="cover" />
                    {isVideo && (
                      <View style={styles.videoBadgeOverlay}>
                        <Ionicons name="play-circle" size={26} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {mediaUrls.length > 6 && !showAllMedia && (
              <Pressable style={styles.showMoreBtn} onPress={() => setShowAllMedia(true)}>
                <Text style={styles.showMoreText}>{translateScreenLabel("screenLabels.issue.showAllValue1MediaFiles", { value1: mediaUrls.length })}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Status Timeline ── */}
        {statusHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch" size={16} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>{translateScreenLabel("screenLabels.issue.statusTimeline")}</Text>
            </View>
            <View style={styles.timeline}>
              {statusHistory.map((entry, idx) => {
                const toConfig = STATUS_CONFIG[entry.toStatus] ?? { color: colors.textSecondary, label: entry.toStatus };
                const isLast = idx === statusHistory.length - 1;
                return (
                  <View key={entry.id} style={styles.timelineItem}>
                    <View style={styles.timelineDotCol}>
                      <View style={[styles.timelineDot, { backgroundColor: toConfig.color }]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={[styles.timelineStatus, { color: toConfig.color }]}>{toConfig.label}</Text>
                        <Text style={styles.timelineTime}>{formatDate(entry.createdAt)}</Text>
                      </View>
                      <Text style={styles.timelineActor}>
                        {entry.changedByName ?? t('issueDetail.actorUnrecorded', { defaultValue: 'Actor not recorded' })}
                        {entry.actorRole === 'authority' ? ' · ' + t('issueDetail.verifiedAuthority', { defaultValue: 'Verified authority' })
                          : ['admin', 'moderator', 'super_admin', 'compliance_officer'].includes(entry.actorRole ?? '')
                            ? ' · ' + t('issueDetail.poligramStaff', { defaultValue: 'Poligram staff' }) : ''}
                      </Text>
                      {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Comments ── */}
        <View style={styles.section} onLayout={(event) => { commentsTop.current = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles" size={16} color="#3B82F6" />
            <Text style={styles.sectionTitle}>{t('postDetail.comments')} ({issue.commentCount})</Text>
          </View>

          {comments.length === 0 && (!IS_LIVE_ENVIRONMENT || (commentPage && !commentPage.loading && !commentPage.error)) && (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={32} color="#374151" />
              <Text style={styles.emptyCommentsText}>{t('postDetail.noComments')}</Text>
            </View>
          )}
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              disabled={submittingComment || commentPage?.loading}
              onEdit={viewerId === comment.userId && !comment.isOfficial ? () => {
                setEditingCommentId(comment.id);
                setCommentText(comment.body);
                setCommentError(null);
                commentInputRef.current?.focus();
              } : undefined}
              onRemove={viewerId === comment.userId && !comment.isOfficial ? () => confirmDeleteComment(comment.id) : undefined}
            />
          ))}
          {commentPage?.loading ? <ActivityIndicator color={colors.primary} /> : (commentPage?.next || commentPage?.error) && (
            <Pressable accessibilityRole="button" disabled={submittingComment}
              style={styles.commentControl}
              onPress={() => void loadIssueComments(issue.id, Boolean(commentPage.next))}>
              <Text style={{ color: colors.primary }}>
                {t(commentPage.error ? 'postDetail.retryComments' : 'postDetail.olderComments')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Comment Error Inline ── */}
      {commentError ? (
        <View style={styles.commentErrorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.commentErrorText}>{commentError}</Text>
        </View>
      ) : null}

      {editingCommentId && (
        <View style={[styles.commentActions, { paddingHorizontal: 12, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.text }}>{t('postDetail.editingComment')}</Text>
          <Pressable accessibilityRole="button" disabled={submittingComment} onPress={() => {
            setEditingCommentId(null);
            setCommentText('');
            setCommentError(null);
            Keyboard.dismiss();
          }}><Text style={{ color: colors.primary }}>{t('common.cancel')}</Text></Pressable>
        </View>
      )}
      {/* ── Comment Input ── */}
      <View
        style={[
          styles.commentInputBar,
          {
            paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 10),
            backgroundColor: colors.surface || '#FFFFFF',
            borderTopColor: colors.border || '#E8DED1',
          },
        ]}
      >
        <TextInput
          ref={commentInputRef}
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.background || '#FAF6EE',
              color: colors.text || '#241814',
              borderColor: colors.border || '#E8DED1',
            },
          ]}
          placeholder={t('postDetail.replyPlaceholder')}
          placeholderTextColor="#6B7280"
          value={commentText}
          onChangeText={(text) => {
            setCommentText(text);
            if (commentError) setCommentError(null);
          }}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, (!commentText.trim() || submittingComment) && styles.sendBtnDisabled]}
          onPress={handleSubmitComment}
          accessibilityRole="button"
          accessibilityLabel={t(editingCommentId ? 'common.save' : 'common.send')}
          disabled={!commentText.trim() || submittingComment || commentPage?.loading}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="send" size={18} color={commentText.trim() ? '#3B82F6' : '#374151'} />
          )}
        </Pressable>
      </View>
      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="issue"
      />
    </KeyboardAvoidingView>
  );
}

// ─── Comment Card sub-component ───

function CommentCard({ comment, disabled, onEdit, onRemove }: {
  comment: IssueComment;
  disabled?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const { t: translateScreenLabel } = useScreenTranslation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.commentCard, comment.isOfficial && styles.commentCardOfficial]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>{comment.userName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.commentNameRow}>
            <Text style={styles.commentName}>{comment.userName}</Text>
            {comment.isOfficial && (
              <View style={styles.officialBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#3B82F6" />
                <Text style={styles.officialBadgeText}>{translateScreenLabel("screenLabels.issue.official")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
      </View>
      <Text style={styles.commentBody}>{comment.body}</Text>
      {comment.imageUrl && (
        <Image source={{ uri: comment.imageUrl }} style={styles.commentImage} contentFit="cover" />
      )}
      {onEdit && onRemove && (
        <View style={styles.commentActions}>
          <Pressable accessibilityRole="button" disabled={disabled} style={styles.commentControl} onPress={onEdit}>
            <Text style={{ color: colors.primary }}>{t('postDetail.editComment')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} style={styles.commentControl} onPress={onRemove}>
            <Text style={{ color: colors.primary }}>{t('postDetail.deleteComment')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scroll: { flex: 1 },
  errorContainer: { flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: '#9CA3AF', fontSize: 16 },
  backButton: { backgroundColor: '#1F2937', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  backButtonText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Title
  title: { fontSize: 20, fontWeight: '800', color: '#241814', lineHeight: 26, paddingHorizontal: 16, marginTop: 12 },
  description: { fontSize: 14, color: '#6D5549', lineHeight: 20, paddingHorizontal: 16, marginTop: 8 },

  // Meta
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 10, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaLocation: { fontSize: 12, color: '#A8201A', fontWeight: '600' },
  metaGray: { fontSize: 12, color: '#8E7B6F' },
  metaDot: { fontSize: 12, color: '#8E7B6F' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 14, marginTop: 12, marginHorizontal: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8DED1', borderRadius: 12 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#241814' },
  statLabel: { fontSize: 10, color: '#8E7B6F', fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', paddingHorizontal: 6, paddingVertical: 10, marginTop: 8, marginHorizontal: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, gap: 4 },
  actionBtn: { flexGrow: 1, flexBasis: 72, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8 },
  actionBtnActive: { backgroundColor: '#EEF2FF' },
  actionBtnText: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },

  // MLA section
  mlaSection: { marginTop: 16, paddingHorizontal: 16 },
  mlaResponseCard: { backgroundColor: '#F9F4E8', borderWidth: 1, borderColor: '#D8BC7E', borderRadius: 12, padding: 14, marginTop: 8 },
  mlaResponseText: { fontSize: 13, color: '#241814', lineHeight: 19 },
  mlaWaitingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9F4E8', borderRadius: 12, padding: 14, marginTop: 8 },
  mlaWaitingText: { fontSize: 13, color: '#C5A059', fontWeight: '700' },

  // Resolution
  resolutionSection: { marginTop: 16, paddingHorizontal: 16 },
  resolutionCard: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 12, padding: 14, marginTop: 8 },
  resolutionText: { fontSize: 13, color: '#166534', lineHeight: 19 },
  resolutionDate: { fontSize: 11, color: '#8E7B6F', marginTop: 8 },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F5EFE4', borderRadius: 10 },
  disputeBtnDisabled: { opacity: 0.5 },
  disputeBtnText: { fontSize: 13, fontWeight: '600', color: '#A8201A' },
  disputeCount: { fontSize: 11, color: '#8E7B6F', marginLeft: 'auto' },

  // Reopened
  reopenedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginHorizontal: 16, backgroundColor: '#FBE8E7', borderWidth: 1, borderColor: '#A8201A40', borderRadius: 12, padding: 12 },
  reopenedText: { flex: 1, fontSize: 13, color: '#A8201A', fontWeight: '600' },

  // Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#241814' },

  // Media grid
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaGridItemWrap: { width: '31%' as any, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaGridItem: { width: '100%', height: '100%', borderRadius: 10 },
  videoBadgeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  showMoreBtn: { marginTop: 8, alignSelf: 'center' },
  showMoreText: { fontSize: 13, color: '#A8201A', fontWeight: '600' },

  // Timeline
  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineDotCol: { alignItems: 'center', width: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E8DED1', marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineStatus: { fontSize: 13, fontWeight: '700' },
  timelineTime: { fontSize: 10, color: '#8E7B6F' },
  timelineActor: { fontSize: 11, color: '#6D5549', marginTop: 2 },
  timelineNote: { fontSize: 12, color: '#241814', marginTop: 4, lineHeight: 17, backgroundColor: '#F5EFE4', padding: 8, borderRadius: 8 },

  // Comments
  emptyComments: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyCommentsText: { fontSize: 13, color: '#8E7B6F' },
  commentCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8DED1', borderRadius: 12, padding: 12, marginBottom: 8 },
  commentCardOfficial: { borderWidth: 1, borderColor: '#D8BC7E' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5EFE4', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: '#6D5549' },
  commentNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 13, fontWeight: '600', color: '#241814', flexShrink: 1 },
  commentActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  commentControl: { minHeight: 44, justifyContent: 'center', paddingVertical: 6 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FBE8E7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  officialBadgeText: { fontSize: 9, fontWeight: '700', color: '#A8201A' },
  commentTime: { fontSize: 10, color: '#8E7B6F' },
  commentBody: { fontSize: 13, color: '#6D5549', lineHeight: 18 },
  commentImage: { width: '100%' as any, height: 160, borderRadius: 8, marginTop: 8 },

  // Comment input
  commentErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#FEF2F2', borderTopWidth: 1, borderTopColor: '#FCA5A5' },
  commentErrorText: { fontSize: 12, color: '#EF4444', fontWeight: '500' },
  commentInputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8DED1' },
  commentInput: { flex: 1, backgroundColor: '#FAF6EE', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#241814', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#E8DED1' },
  sendBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
