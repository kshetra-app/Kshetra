import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { Post, ReactionType } from '../lib/feedTypes';
import ContentGateActions from './ContentGateActions';

const TYPE_CONFIG: Record<string, { icon: string; color: string; tKey: string }> = {
  discussion: { icon: 'chatbubbles', color: '#145C68', tKey: 'postCard.discussion' },
  news: { icon: 'newspaper', color: '#A8201A', tKey: 'postCard.news' },
  opinion: { icon: 'megaphone', color: '#D97706', tKey: 'postCard.opinion' },
  question: { icon: 'help-circle', color: '#B45309', tKey: 'postCard.question' },
  alert: { icon: 'alert-circle', color: '#C0392B', tKey: 'postCard.alert' },
  poll: { icon: 'stats-chart', color: '#C5A059', tKey: 'postCard.poll' },
};

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

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReact?: (reaction: ReactionType) => void;
  onReply?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
  compact?: boolean;
}

export default function PostCard({
  post,
  onPress,
  onReact,
  onReply,
  onShare,
  onEdit,
  onDelete,
  isOwner = false,
  compact = false,
}: PostCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const typeInfo = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.discussion;
  const isReacted = !!post.userReaction;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        post.isPinned && styles.cardPinned,
      ]}
      onPress={onPress}
    >
      {/* Pinned indicator */}
      {post.isPinned && (
        <View style={styles.pinnedRow}>
          <Ionicons name="pin" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={styles.pinnedText}>{t('feed.pinned')}</Text>
        </View>
      )}

      {/* Header: Author + Meta + Type badge */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(post.author.displayName || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
              {post.author.displayName}
            </Text>
            {post.author.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(post.createdAt)}</Text>
            {post.constituencyName && (
              <>
                <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.constituencyText, { color: colors.primary }]} numberOfLines={1}>
                  {post.constituencyName}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '18' }]}>
          <Ionicons name={typeInfo.icon as any} size={11} color={typeInfo.color} />
          <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
            {t(typeInfo.tKey, post.type)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text
        style={[styles.content, { color: colors.text }]}
        numberOfLines={compact ? 3 : undefined}
      >
        {post.content}
      </Text>

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

      {/* Actions footer */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => onReact?.('like')}
          hitSlop={8}
        >
          <Ionicons
            name={isReacted ? 'heart' : 'heart-outline'}
            size={18}
            color={isReacted ? '#EF4444' : colors.textMuted}
          />
          <Text style={[styles.actionText, { color: isReacted ? '#EF4444' : colors.textSecondary }]}>
            {post.reactionCount}
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onReply}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.replyCount}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onShare}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={17} color={colors.textMuted} />
        </Pressable>

        <View style={{ marginLeft: 'auto' }}>
          <ContentGateActions
            contentType="post"
            contentId={post.id}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPinned: {
    borderWidth: 1.5,
    borderColor: '#F59E0B60',
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 140,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 2,
  },
  timeText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  constituencyText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 110,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  hashtag: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
