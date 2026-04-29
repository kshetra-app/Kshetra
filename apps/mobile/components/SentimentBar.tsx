import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ConstituencySentiment } from '../lib/civicTypes';

interface SentimentBarProps {
  item: ConstituencySentiment;
  maxPosts?: number;
}

function scoreToColor(score: number): string {
  if (score >= 0.3) return '#10B981';
  if (score >= 0.1) return '#6EE7B7';
  if (score > -0.1) return '#6B7280';
  if (score > -0.3) return '#F59E0B';
  return '#EF4444';
}

function scoreToEmoji(score: number): string {
  if (score >= 0.3) return 'happy';
  if (score >= 0.1) return 'happy-outline';
  if (score > -0.1) return 'remove-outline';
  if (score > -0.3) return 'sad-outline';
  return 'sad';
}

function scoreToLabel(score: number): string {
  if (score >= 0.3) return 'Positive';
  if (score >= 0.1) return 'Leaning +';
  if (score > -0.1) return 'Neutral';
  if (score > -0.3) return 'Leaning −';
  return 'Negative';
}

export default function SentimentBar({ item, maxPosts = 50 }: SentimentBarProps) {
  const { t } = useTranslation();
  const color = scoreToColor(item.score);
  const icon = scoreToEmoji(item.score);
  const label = scoreToLabel(item.score);
  const barWidth = Math.max(10, (item.totalPosts / maxPosts) * 100);

  const positivePct = item.totalPosts > 0
    ? Math.round((item.positiveCount / item.totalPosts) * 100)
    : 0;
  const negativePct = item.totalPosts > 0
    ? Math.round((item.negativeCount / item.totalPosts) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          <Ionicons name={icon as any} size={16} color={color} style={{ marginRight: 6 }} />
          <Text style={styles.name} numberOfLines={1}>{item.constituencyName}</Text>
        </View>
        <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
      </View>

      {/* Stacked sentiment bar */}
      <View style={styles.barOuter}>
        <View style={[styles.barPositive, { width: `${positivePct}%` }]} />
        <View
          style={[
            styles.barNegative,
            { width: `${negativePct}%` },
          ]}
        />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={[styles.statPositive, { marginRight: 10 }]}>{item.positiveCount} {t('content.sentimentLabels.positive')}</Text>
        <Text style={[styles.statNeutral, { marginRight: 10 }]}>{item.neutralCount} {t('content.sentimentLabels.neutral')}</Text>
        <Text style={[styles.statNegative, { marginRight: 10 }]}>{item.negativeCount} {t('content.sentimentLabels.negative')}</Text>
        <Text style={styles.statTotal}>{item.totalPosts} {t('content.sentimentLabels.posts')}</Text>
      </View>

      {/* Top issues */}
      {item.topIssues.length > 0 && (
        <View style={styles.issuesRow}>
          {item.topIssues.map((issue) => (
            <Text key={issue} style={[styles.issueBadge, { marginRight: 4 }]}>{t(`content.issueCategories.${issue}`, issue.replace('_', ' '))}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  barOuter: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barPositive: {
    height: 6,
    backgroundColor: '#10B981',
  },
  barNegative: {
    height: 6,
    backgroundColor: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statPositive: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  statNeutral: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statNegative: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  statTotal: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    marginLeft: 'auto',
  },
  issuesRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  issueBadge: {
    fontSize: 10,
    color: '#9CA3AF',
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
