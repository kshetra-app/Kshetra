import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useCivicStore } from '../../stores/civic';
import {
  ISSUE_CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '../../lib/civicTypes';
import type { IssueComment, IssueStatusChange } from '../../lib/civicTypes';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const issue = useCivicStore((s) => s.getIssueById(id));
  const comments = useCivicStore((s) => s.getCommentsForIssue(id));
  const statusHistory = useCivicStore((s) => s.getStatusHistoryForIssue(id));
  const toggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const toggleFollow = useCivicStore((s) => s.toggleFollow);
  const tagMLA = useCivicStore((s) => s.tagMLA);
  const disputeResolution = useCivicStore((s) => s.disputeResolution);
  const addComment = useCivicStore((s) => s.addComment);
  const shareIssue = useCivicStore((s) => s.shareIssue);

  const [commentText, setCommentText] = useState('');
  const [showAllMedia, setShowAllMedia] = useState(false);

  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Issue Not Found' }} />
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Issue not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const catConfig = ISSUE_CATEGORY_CONFIG[issue.category];
  const sevConfig = SEVERITY_CONFIG[issue.severity];
  const statusConfig = STATUS_CONFIG[issue.status];

  const handleShare = async () => {
    const text = shareIssue(issue.id);
    try {
      await Share.share({ message: text });
    } catch (_) {}
  };

  const handleTagMLA = () => {
    if (issue.mlaTagged) {
      Alert.alert('Already Tagged', 'MLA has already been tagged on this issue.');
      return;
    }
    Alert.alert(
      'Tag MLA',
      `This will send a notification to your constituency MLA about "${issue.title}". Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Tag MLA', onPress: () => tagMLA(issue.id) },
      ],
    );
  };

  const handleDispute = () => {
    if (issue.userDisputed) {
      Alert.alert('Already Disputed', 'You have already disputed this resolution.');
      return;
    }
    Alert.alert(
      'Dispute Resolution',
      'Do you believe this issue has NOT been properly resolved? Your dispute will be recorded. If 5+ citizens dispute, the issue will be automatically reopened.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispute',
          style: 'destructive',
          onPress: () => disputeResolution(issue.id, 'Resolution not satisfactory'),
        },
      ],
    );
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addComment(issue.id, commentText.trim(), 'You');
    setCommentText('');
  };

  const mediaUrls = issue.mediaUrls ?? [];
  const displayMedia = showAllMedia ? mediaUrls : mediaUrls.slice(0, 6);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#030712' },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.badgeText, { color: '#10B981' }]}>Verified</Text>
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
          <Text style={styles.metaGray}>by {issue.reporterName}</Text>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up-circle" size={16} color="#10B981" />
            <Text style={styles.statValue}>{issue.upvoteCount}</Text>
            <Text style={styles.statLabel}>Upvotes</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={16} color="#3B82F6" />
            <Text style={styles.statValue}>{issue.commentCount}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#8B5CF6" />
            <Text style={styles.statValue}>{issue.followCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="camera" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>{issue.evidenceCount}</Text>
            <Text style={styles.statLabel}>Evidence</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, issue.userUpvoted && styles.actionBtnActive]}
            onPress={() => toggleUpvote(issue.id)}
          >
            <Ionicons name={issue.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'} size={20} color={issue.userUpvoted ? '#10B981' : '#9CA3AF'} />
            <Text style={[styles.actionBtnText, issue.userUpvoted && { color: '#10B981' }]}>Upvote</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, issue.userFollowing && styles.actionBtnActive]}
            onPress={() => toggleFollow(issue.id)}
          >
            <Ionicons name={issue.userFollowing ? 'notifications' : 'notifications-outline'} size={18} color={issue.userFollowing ? '#3B82F6' : '#9CA3AF'} />
            <Text style={[styles.actionBtnText, issue.userFollowing && { color: '#3B82F6' }]}>
              {issue.userFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#9CA3AF" />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, issue.mlaTagged && styles.actionBtnActive]}
            onPress={handleTagMLA}
          >
            <Ionicons name="megaphone" size={18} color={issue.mlaTagged ? '#F59E0B' : '#9CA3AF'} />
            <Text style={[styles.actionBtnText, issue.mlaTagged && { color: '#F59E0B' }]}>
              {issue.mlaTagged ? 'MLA Tagged' : 'Tag MLA'}
            </Text>
          </Pressable>
        </View>

        {/* ── MLA Response ── */}
        {issue.mlaTagged && (
          <View style={styles.mlaSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>MLA Response</Text>
              {issue.mlaResponded && (
                <View style={[styles.badge, { backgroundColor: '#10B98120', marginLeft: 8 }]}>
                  <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                  <Text style={[styles.badgeText, { color: '#10B981', fontSize: 10 }]}>Responded</Text>
                </View>
              )}
            </View>
            {issue.mlaResponded && issue.mlaResponseNote ? (
              <View style={styles.mlaResponseCard}>
                <Text style={styles.mlaResponseText}>{issue.mlaResponseNote}</Text>
              </View>
            ) : (
              <View style={styles.mlaWaitingCard}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={styles.mlaWaitingText}>Awaiting response from MLA...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Resolution Note ── */}
        {(issue.status === 'resolved' || issue.status === 'closed') && issue.resolutionNote && (
          <View style={styles.resolutionSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.sectionTitle}>Resolution</Text>
            </View>
            <View style={styles.resolutionCard}>
              <Text style={styles.resolutionText}>{issue.resolutionNote}</Text>
              {issue.resolvedAt && (
                <Text style={styles.resolutionDate}>Resolved {formatDate(issue.resolvedAt)}</Text>
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
                  {issue.userDisputed ? 'Dispute Filed' : 'Dispute Resolution'}
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
            <Text style={styles.reopenedText}>
              Reopened — {issue.disputeCount} citizens disputed the resolution
            </Text>
          </View>
        )}

        {/* ── Media Evidence Gallery ── */}
        {mediaUrls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Evidence ({mediaUrls.length})</Text>
            </View>
            <View style={styles.mediaGrid}>
              {displayMedia.map((url, idx) => (
                <Image key={`${url}-${idx}`} source={{ uri: url }} style={styles.mediaGridItem} contentFit="cover" />
              ))}
            </View>
            {mediaUrls.length > 6 && !showAllMedia && (
              <Pressable style={styles.showMoreBtn} onPress={() => setShowAllMedia(true)}>
                <Text style={styles.showMoreText}>Show all {mediaUrls.length} photos</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Status Timeline ── */}
        {statusHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch" size={16} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Status Timeline</Text>
            </View>
            <View style={styles.timeline}>
              {statusHistory.map((entry, idx) => {
                const toConfig = STATUS_CONFIG[entry.toStatus];
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
                      {entry.changedByName && (
                        <Text style={styles.timelineActor}>by {entry.changedByName}</Text>
                      )}
                      {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Comments ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles" size={16} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          </View>

          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={32} color="#374151" />
              <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
            </View>
          ) : (
            comments.map((cmt) => (
              <CommentCard key={cmt.id} comment={cmt} />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Comment Input ── */}
      <View style={styles.commentInputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#6B7280"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={18} color={commentText.trim() ? '#3B82F6' : '#374151'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Comment Card sub-component ───

function CommentCard({ comment }: { comment: IssueComment }) {
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
                <Text style={styles.officialBadgeText}>Official</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', lineHeight: 26, paddingHorizontal: 16, marginTop: 12 },
  description: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, paddingHorizontal: 16, marginTop: 8 },

  // Meta
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 10, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaLocation: { fontSize: 12, color: '#4F8EF7', fontWeight: '600' },
  metaGray: { fontSize: 12, color: '#6B7280' },
  metaDot: { fontSize: 12, color: '#374151' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 14, marginTop: 12, marginHorizontal: 16, backgroundColor: '#111827', borderRadius: 12 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 12, marginTop: 8, marginHorizontal: 16, backgroundColor: '#111827', borderRadius: 12 },
  actionBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  actionBtnActive: { backgroundColor: '#1F293780' },
  actionBtnText: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },

  // MLA section
  mlaSection: { marginTop: 16, paddingHorizontal: 16 },
  mlaResponseCard: { backgroundColor: '#1C1917', borderWidth: 1, borderColor: '#F59E0B40', borderRadius: 12, padding: 14, marginTop: 8 },
  mlaResponseText: { fontSize: 13, color: '#FEF3C7', lineHeight: 19 },
  mlaWaitingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1C1917', borderRadius: 12, padding: 14, marginTop: 8 },
  mlaWaitingText: { fontSize: 13, color: '#F59E0B' },

  // Resolution
  resolutionSection: { marginTop: 16, paddingHorizontal: 16 },
  resolutionCard: { backgroundColor: '#052E16', borderWidth: 1, borderColor: '#10B98140', borderRadius: 12, padding: 14, marginTop: 8 },
  resolutionText: { fontSize: 13, color: '#BBF7D0', lineHeight: 19 },
  resolutionDate: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#1F2937', borderRadius: 10 },
  disputeBtnDisabled: { opacity: 0.5 },
  disputeBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  disputeCount: { fontSize: 11, color: '#6B7280', marginLeft: 'auto' },

  // Reopened
  reopenedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginHorizontal: 16, backgroundColor: '#7F1D1D40', borderWidth: 1, borderColor: '#EF444440', borderRadius: 12, padding: 12 },
  reopenedText: { flex: 1, fontSize: 13, color: '#FCA5A5', fontWeight: '600' },

  // Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Media grid
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaGridItem: { width: '31%' as any, aspectRatio: 1, borderRadius: 10 },
  showMoreBtn: { marginTop: 8, alignSelf: 'center' },
  showMoreText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },

  // Timeline
  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineDotCol: { alignItems: 'center', width: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#374151', marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineStatus: { fontSize: 13, fontWeight: '700' },
  timelineTime: { fontSize: 10, color: '#6B7280' },
  timelineActor: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  timelineNote: { fontSize: 12, color: '#D1D5DB', marginTop: 4, lineHeight: 17, backgroundColor: '#1F2937', padding: 8, borderRadius: 8 },

  // Comments
  emptyComments: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyCommentsText: { fontSize: 13, color: '#6B7280' },
  commentCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 8 },
  commentCardOfficial: { borderWidth: 1, borderColor: '#3B82F640' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#3B82F620', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  officialBadgeText: { fontSize: 9, fontWeight: '700', color: '#3B82F6' },
  commentTime: { fontSize: 10, color: '#6B7280' },
  commentBody: { fontSize: 13, color: '#D1D5DB', lineHeight: 18 },
  commentImage: { width: '100%' as any, height: 160, borderRadius: 8, marginTop: 8 },

  // Comment input
  commentInputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#111827', borderTopWidth: 0.5, borderTopColor: '#1F2937' },
  commentInput: { flex: 1, backgroundColor: '#1F2937', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#FFFFFF', fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
