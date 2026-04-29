import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Post, ReactionType } from '../lib/feedTypes';

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  discussion: { icon: 'chatbubbles', color: '#6366F1', label: 'Discussion' },
  news: { icon: 'newspaper', color: '#3B82F6', label: 'News' },
  opinion: { icon: 'megaphone', color: '#F59E0B', label: 'Opinion' },
  question: { icon: 'help-circle', color: '#10B981', label: 'Question' },
  alert: { icon: 'alert-circle', color: '#EF4444', label: 'Alert' },
  poll: { icon: 'stats-chart', color: '#8B5CF6', label: 'Poll' },
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
  compact?: boolean;
}

export default function PostCard({
  post,
  onPress,
  onReact,
  onReply,
  onShare,
  compact = false,
}: PostCardProps) {
  const typeInfo = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.discussion;
  const isReacted = !!post.userReaction;

  return (
    <Pressable style={[styles.card, post.isPinned && styles.cardPinned]} onPress={onPress}>
      {/* Pinned indicator */}
      {post.isPinned && (
        <View style={styles.pinnedRow}>
          <Ionicons name="pin" size={12} color="#F59E0B" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {post.author.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author.displayName}
            </Text>
            {post.author.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#4F8EF7" />
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
            {post.constituencyName && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.constituencyText} numberOfLines={1}>
                  {post.constituencyName}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
          <Ionicons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
          {!compact && (
            <Text style={[styles.typeLabel, { color: typeInfo.color }]}>{typeInfo.label}</Text>
          )}
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content} numberOfLines={compact ? 3 : undefined}>
        {post.content}
      </Text>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && !compact && (
        <View style={styles.hashtagRow}>
          {post.hashtags.map((tag) => (
            <Text key={tag} style={styles.hashtag}>#{tag}</Text>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => onReact?.('like')}
          hitSlop={8}
        >
          <Ionicons
            name={isReacted ? 'heart' : 'heart-outline'}
            size={18}
            color={isReacted ? '#EF4444' : '#6B7280'}
          />
          <Text style={[styles.actionText, isReacted && styles.actionTextActive]}>
            {post.reactionCount > 0 ? post.reactionCount : ''}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onReply} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.actionText}>
            {post.replyCount > 0 ? post.replyCount : ''}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onShare} hitSlop={8}>
          <Ionicons name="share-outline" size={16} color="#6B7280" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cardPinned: {
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F8EF7',
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
    color: '#FFFFFF',
    maxWidth: 140,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 12,
    color: '#374151',
    marginHorizontal: 4,
  },
  constituencyText: {
    fontSize: 12,
    color: '#4F8EF7',
    maxWidth: 100,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#D1D5DB',
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
    color: '#4F8EF7',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937',
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
    color: '#6B7280',
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#EF4444',
  },
});
