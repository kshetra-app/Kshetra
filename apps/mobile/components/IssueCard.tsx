import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const catConfig = ISSUE_CATEGORY_CONFIG[issue.category];
  const sevConfig = SEVERITY_CONFIG[issue.severity];
  const statusConfig = STATUS_CONFIG[issue.status];

  // Translated content (falls back to original English)
  const catLabel = t(`content.issueCategories.${issue.category}`, catConfig.label);
  const sevLabel = t(`content.issueSeverity.${issue.severity}`, sevConfig.label);
  const statusLabel = t(`content.issueStatus.${issue.status}`, statusConfig.label);
  const issueTitle = t(`content.issues.${issue.id}.title`, issue.title);
  const issueDesc = issue.description ? t(`content.issues.${issue.id}.description`, issue.description) : undefined;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Category + Severity header */}
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20', marginRight: 6 }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.categoryText, { color: catConfig.color }]}>{catLabel}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '20', marginRight: 6 }]}>
          <Text style={[styles.severityText, { color: sevConfig.color }]}>{sevLabel}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.color} style={{ marginRight: 3 }} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{issueTitle}</Text>

      {/* Description preview */}
      {issueDesc && (
        <Text style={styles.description} numberOfLines={2}>{issueDesc}</Text>
      )}

      {/* Media evidence thumbnails */}
      {issue.mediaUrls && issue.mediaUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
          {issue.mediaUrls.slice(0, 4).map((url, idx) => (
            <Image key={url} source={{ uri: url }} style={styles.mediaThumb} contentFit="cover" />
          ))}
          {issue.mediaUrls.length > 4 && (
            <View style={styles.mediaMoreBadge}>
              <Text style={styles.mediaMoreText}>+{issue.mediaUrls.length - 4}</Text>
            </View>
          )}
        </ScrollView>
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
          <Text style={[styles.upvoteText, issue.userUpvoted && styles.upvoteTextActive, { marginLeft: 4 }]}>
            {issue.upvoteCount}
          </Text>
        </Pressable>
        <View style={[styles.commentCount, { marginLeft: 16 }]}>
          <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
          <Text style={[styles.commentCountText, { marginLeft: 4 }]}>{issue.commentCount}</Text>
        </View>
        {(issue.evidenceCount ?? 0) > 0 && (
          <View style={[styles.commentCount, { marginLeft: 16 }]}>
            <Ionicons name="camera-outline" size={14} color="#F59E0B" />
            <Text style={[styles.commentCountText, { marginLeft: 4, color: '#F59E0B' }]}>{issue.evidenceCount}</Text>
          </View>
        )}
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
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  commentCountText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  mediaStrip: {
    marginBottom: 10,
    marginTop: 4,
  },
  mediaThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 6,
  },
  mediaMoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});
