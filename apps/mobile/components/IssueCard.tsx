import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
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
  onFollow?: () => void;
  onShare?: () => void;
}

export default function IssueCard({ issue, onUpvote, onPress, onFollow, onShare }: IssueCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      {/* Category + Severity header */}
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '18', marginRight: 6 }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.categoryText, { color: catConfig.color }]}>{catLabel}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '18', marginRight: 6 }]}>
          <Text style={[styles.severityText, { color: sevConfig.color }]}>{sevLabel}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '18' }]}>
          <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.color} style={{ marginRight: 3 }} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{issueTitle}</Text>

      {/* Description preview */}
      {issueDesc && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{issueDesc}</Text>
      )}

      {/* Media evidence thumbnails */}
      {issue.mediaUrls && issue.mediaUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
          {issue.mediaUrls.slice(0, 4).map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.mediaThumb} contentFit="cover" />
          ))}
          {issue.mediaUrls.length > 4 && (
            <View style={[styles.mediaMoreBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.mediaMoreText, { color: colors.textMuted }]}>+{issue.mediaUrls.length - 4}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Meta row */}
      <View style={styles.metaRow}>
        {issue.constituencyName && (
          <View style={styles.metaItem}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text style={[styles.metaLocationText, { color: colors.primary }]}>{issue.constituencyName}</Text>
          </View>
        )}
        <Text style={[styles.metaTimeText, { color: colors.textMuted }]}>{timeAgo(issue.createdAt)}</Text>
        <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>
        <Text style={[styles.metaReporterText, { color: colors.textMuted }]}>{issue.reporterName}</Text>
      </View>

      {/* MLA Response indicator */}
      {issue.mlaTagged && (
        <View style={[styles.mlaRow, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
          <Ionicons name="megaphone" size={12} color="#F59E0B" />
          <Text style={styles.mlaText}>
            {issue.mlaResponded ? 'MLA Responded' : 'MLA Tagged — Awaiting Response'}
          </Text>
          {issue.mlaResponded && (
            <Ionicons name="checkmark-circle" size={12} color="#10B981" style={{ marginLeft: 4 }} />
          )}
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable style={styles.upvoteButton} onPress={onUpvote} hitSlop={8}>
          <Ionicons
            name={issue.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
            size={20}
            color={issue.userUpvoted ? '#10B981' : colors.textMuted}
          />
          <Text style={[styles.upvoteText, { color: issue.userUpvoted ? '#10B981' : colors.textSecondary }, { marginLeft: 4 }]}>
            {issue.upvoteCount}
          </Text>
        </Pressable>
        <View style={[styles.commentCount, { marginLeft: 14 }]}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.commentCountText, { color: colors.textSecondary, marginLeft: 4 }]}>{issue.commentCount}</Text>
        </View>
        <Pressable style={[styles.commentCount, { marginLeft: 14 }]} onPress={onFollow} hitSlop={8}>
          <Ionicons
            name={issue.userFollowing ? 'notifications' : 'notifications-outline'}
            size={14}
            color={issue.userFollowing ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.commentCountText, { marginLeft: 4, color: issue.userFollowing ? colors.primary : colors.textSecondary }]}>
            {issue.followCount}
          </Text>
        </Pressable>
        {issue.evidenceCount > 0 && (
          <View style={[styles.commentCount, { marginLeft: 14 }]}>
            <Ionicons name="camera-outline" size={14} color="#F59E0B" />
            <Text style={[styles.commentCountText, { marginLeft: 4, color: '#F59E0B' }]}>{issue.evidenceCount}</Text>
          </View>
        )}
        {issue.disputeCount > 0 && (
          <View style={[styles.commentCount, { marginLeft: 14 }]}>
            <Ionicons name="flag" size={13} color="#EF4444" />
            <Text style={[styles.commentCountText, { marginLeft: 3, color: '#EF4444' }]}>{issue.disputeCount}</Text>
          </View>
        )}
        <Pressable style={[styles.commentCount, { marginLeft: 'auto' }]} onPress={onShare} hitSlop={8}>
          <Ionicons name="share-outline" size={16} color={colors.textMuted} />
        </Pressable>
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
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    gap: 2,
  },
  metaLocationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaTimeText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  metaReporterText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upvoteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCountText: {
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mlaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  mlaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    flex: 1,
  },
});
