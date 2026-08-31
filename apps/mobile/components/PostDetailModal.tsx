import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { useFeedStore } from '../stores/feed';
import { useAuthStore } from '../stores/auth';
import type { Post, Comment } from '../lib/feedTypes';
import PollCard from './PollCard';
import ContentGateActions from './ContentGateActions';
import ReportSheet from './ReportSheet';

interface PostDetailModalProps {
  visible: boolean;
  post: Post | null;
  autoFocusReply?: boolean;
  onClose: () => void;
  onEditPost?: (post: Post) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function PostDetailModal({
  visible,
  post,
  autoFocusReply = false,
  onClose,
  onEditPost,
}: PostDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [commentText, setCommentText] = useState('');
  const [reportVisible, setReportVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anon';

  const commentsMap = useFeedStore((s) => s.comments);
  const addComment = useFeedStore((s) => s.addComment);
  const deleteComment = useFeedStore((s) => s.deleteComment);
  const toggleCommentReaction = useFeedStore((s) => s.toggleCommentReaction);
  const toggleReaction = useFeedStore((s) => s.toggleReaction);
  const votePoll = useFeedStore((s) => s.votePoll);
  const deletePost = useFeedStore((s) => s.deletePost);

  const comments: Comment[] = post ? (commentsMap[post.id] ?? []).filter((c) => !c.isDeleted) : [];

  useEffect(() => {
    if (visible && autoFocusReply) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    }
  }, [visible, autoFocusReply]);

  const handleSendComment = useCallback(() => {
    if (!post || !commentText.trim()) return;
    const authorName = user?.email?.split('@')[0] ?? 'Citizen';
    const newComment: Comment = {
      id: `local-c-${Date.now()}`,
      postId: post.id,
      author: {
        id: userId,
        displayName: authorName,
      },
      content: commentText.trim(),
      reactionCount: 0,
      isDeleted: false,
      language: i18n.language || 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addComment(post.id, newComment);
    setCommentText('');
  }, [post, commentText, user, userId, i18n.language, addComment]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Kshetra App`,
      });
    } catch (_) {}
  }, [post]);

  const handleDeleteSelfPost = useCallback(() => {
    if (!post) return;
    Alert.alert(
      t('postCard.deleteConfirm'),
      t('postCard.deleteConfirmBody'),
      [
        { text: t('postCard.cancel'), style: 'cancel' },
        {
          text: t('postCard.delete'),
          style: 'destructive',
          onPress: () => {
            deletePost(post.id);
            onClose();
          },
        },
      ],
    );
  }, [post, deletePost, t, onClose]);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!post) return;
      Alert.alert(
        t('postDetail.deleteComment'),
        t('postDetail.deleteCommentConfirm'),
        [
          { text: t('postCard.cancel'), style: 'cancel' },
          {
            text: t('postCard.delete'),
            style: 'destructive',
            onPress: () => deleteComment(post.id, commentId),
          },
        ],
      );
    },
    [post, deleteComment, t],
  );

  if (!post) return null;

  const isOwner = post.author.id === userId;
  const isPostReacted = !!post.userReaction;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: colors.background },
          Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 20 },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('postDetail.title')}
          </Text>
          <View style={styles.headerRight}>
            <Pressable onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </Pressable>
            {isOwner ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onEditPost?.(post);
                }}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setReportVisible(true)} hitSlop={8}>
                <Ionicons name="flag-outline" size={19} color={colors.textMuted} />
              </Pressable>
            )}
            {isOwner && (
              <Pressable onPress={handleDeleteSelfPost} hitSlop={8}>
                <Ionicons name="trash-outline" size={19} color="#EF4444" />
              </Pressable>
            )}
          </View>
        </View>

        {/* List: Header component is the full post, rows are comments */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.postBodyContainer}>
              {/* Author & Meta */}
              <View style={styles.authorRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(post.author.displayName || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.authorInfo}>
                  <View style={styles.authorNameRow}>
                    <Text style={[styles.authorName, { color: colors.text }]}>
                      {post.author.displayName}
                    </Text>
                    {post.author.isVerified && (
                      <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    )}
                  </View>
                  <Text style={[styles.postMeta, { color: colors.textMuted }]}>
                    {timeAgo(post.createdAt)}
                    {post.constituencyName ? ` · ${post.constituencyName}` : ''}
                    {post.stateCode ? ` (${post.stateCode})` : ''}
                  </Text>
                </View>
                <View style={[styles.typePill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.typePillText, { color: colors.primary }]}>
                    {post.type.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Main Content */}
              <Text style={[styles.postText, { color: colors.text }]}>{post.content}</Text>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <View style={styles.hashtagRow}>
                  {post.hashtags.map((tag) => (
                    <Text key={tag} style={[styles.hashtag, { color: colors.primary }]}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}

              {/* Poll Card if present */}
              {post.poll && (
                <View style={styles.pollWrapper}>
                  <PollCard
                    poll={post.poll}
                    onVote={(optId) => votePoll(post.id, optId)}
                  />
                </View>
              )}

              {/* Media links if present */}
              {post.media && post.media.length > 0 && (
                <View style={styles.mediaContainer}>
                  {post.media.map((m) => (
                    <View key={m.id} style={[styles.mediaItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="link" size={16} color={colors.primary} />
                      <Text style={[styles.mediaUrl, { color: colors.primary }]} numberOfLines={1}>
                        {m.altText || m.url}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Post Action Metrics Bar */}
              <View style={[styles.metricsBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                <Pressable
                  style={styles.metricItem}
                  onPress={() => toggleReaction(post.id, 'like')}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isPostReacted ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isPostReacted ? '#EF4444' : colors.textMuted}
                  />
                  <Text style={[styles.metricCount, { color: isPostReacted ? '#EF4444' : colors.textSecondary }]}>
                    {post.reactionCount}
                  </Text>
                </Pressable>

                <View style={styles.metricItem}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.metricCount, { color: colors.textSecondary }]}>
                    {post.replyCount} {t('feed.replies')}
                  </Text>
                </View>

                <View style={{ marginLeft: 'auto' }}>
                  <ContentGateActions contentType="post" contentId={post.id} compact />
                </View>
              </View>

              {/* Comments Section Title */}
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsTitle, { color: colors.text }]}>
                  {t('postDetail.comments')} ({comments.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isCommentOwner = item.author.id === userId;
            const isCommentLiked = item.userReaction === 'like';

            return (
              <View style={[styles.commentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.commentAvatarText, { color: colors.primary }]}>
                      {(item.author.displayName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentAuthorInfo}>
                    <View style={styles.commentAuthorRow}>
                      <Text style={[styles.commentAuthorName, { color: colors.text }]}>
                        {item.author.displayName}
                      </Text>
                      {item.author.isVerified && (
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      )}
                    </View>
                    <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.commentActions}>
                    <Pressable
                      style={styles.commentLikeButton}
                      onPress={() => toggleCommentReaction(post.id, item.id, 'like')}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={isCommentLiked ? 'heart' : 'heart-outline'}
                        size={15}
                        color={isCommentLiked ? '#EF4444' : colors.textMuted}
                      />
                      {item.reactionCount > 0 && (
                        <Text
                          style={[
                            styles.commentLikeCount,
                            { color: isCommentLiked ? '#EF4444' : colors.textMuted },
                          ]}
                        >
                          {item.reactionCount}
                        </Text>
                      )}
                    </Pressable>
                    {isCommentOwner && (
                      <Pressable
                        onPress={() => handleDeleteComment(item.id)}
                        hitSlop={6}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                </View>

                <Text style={[styles.commentContent, { color: colors.text }]}>
                  {item.content}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyCommentsText, { color: colors.textSecondary }]}>
                {t('postDetail.noComments')}
              </Text>
            </View>
          }
        />

        {/* Bottom Reply Bar */}
        <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.replyInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder={t('postDetail.replyPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              !commentText.trim() && styles.sendDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Moderation Report Sheet */}
        <ReportSheet
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          targetType="post"
          targetId={post.id}
          targetLabel={post.content.slice(0, 50)}
        />
      </KeyboardAvoidingView>
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
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listContent: {
    paddingBottom: 30,
  },
  postBodyContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  postMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  hashtag: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollWrapper: {
    marginBottom: 14,
  },
  mediaContainer: {
    marginBottom: 14,
    gap: 6,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  mediaUrl: {
    flex: 1,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    gap: 20,
    marginBottom: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentsHeader: {
    marginBottom: 10,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  commentCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 4,
  },
  commentLikeCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 36,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyCommentsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 10,
  },
  replyInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
