import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CivicIssue } from '../lib/civicTypes';
import {
  ISSUE_CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '../lib/civicTypes';

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

interface IssueCardProps {
  issue: CivicIssue;
  onUpvote?: () => void;
  onPress?: () => void;
}

export default function IssueCard({ issue, onUpvote, onPress }: IssueCardProps) {
  const catConfig = ISSUE_CATEGORY_CONFIG[issue.category];
  const sevConfig = SEVERITY_CONFIG[issue.severity];
  const statusConfig = STATUS_CONFIG[issue.status];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Category + Severity header */}
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.categoryText, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '20' }]}>
          <Text style={[styles.severityText, { color: sevConfig.color }]}>{sevConfig.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{issue.title}</Text>

      {/* Description preview */}
      {issue.description && (
        <Text style={styles.description} numberOfLines={2}>{issue.description}</Text>
      )}

      {/* Meta row */}
      <View style={styles.metaRow}>
        {issue.constituencyName && (
          <View style={styles.metaItem}>
            <Ionicons name="location" size={12} color="#4F8EF7" />
            <Text style={styles.metaLocationText}>{issue.constituencyName}</Text>
          </View>
        )}
        <Text style={styles.metaTimeText}>{timeAgo(issue.createdAt)}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaReporterText}>{issue.reporterName}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.upvoteButton} onPress={onUpvote} hitSlop={8}>
          <Ionicons
            name={issue.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
            size={20}
            color={issue.userUpvoted ? '#10B981' : '#6B7280'}
          />
          <Text style={[styles.upvoteText, issue.userUpvoted && styles.upvoteTextActive]}>
            {issue.upvoteCount}
          </Text>
        </Pressable>
        <View style={styles.commentCount}>
          <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
          <Text style={styles.commentCountText}>{issue.commentCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 4,
  },
  metaLocationText: {
    fontSize: 12,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  metaTimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 12,
    color: '#374151',
  },
  metaReporterText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937',
    paddingTop: 10,
    gap: 16,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upvoteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  upvoteTextActive: {
    color: '#10B981',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentCountText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
