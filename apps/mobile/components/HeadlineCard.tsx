import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Headline } from '../lib/civicTypes';

const CATEGORY_COLORS: Record<string, string> = {
  politics: '#EF4444',
  governance: '#4F8EF7',
  development: '#10B981',
  law_and_order: '#F59E0B',
  economy: '#8B5CF6',
  education: '#3B82F6',
  health: '#EC4899',
  environment: '#84CC16',
  opinion: '#F97316',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface HeadlineCardProps {
  headline: Headline;
}

export default function HeadlineCard({ headline }: HeadlineCardProps) {
  const catColor = CATEGORY_COLORS[headline.category] ?? '#6B7280';
  const catLabel = headline.category.replace(/_/g, ' ');

  return (
    <Pressable
      style={styles.card}
      onPress={() => Linking.openURL(headline.sourceUrl).catch(() => {})}
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>{catLabel}</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(headline.publishedAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={3}>{headline.title}</Text>

      {headline.summary && (
        <Text style={styles.summary} numberOfLines={2}>{headline.summary}</Text>
      )}

      <View style={styles.sourceRow}>
        <Ionicons name="newspaper-outline" size={12} color="#6B7280" />
        <Text style={styles.sourceName}>{headline.sourceName}</Text>
        <Ionicons name="open-outline" size={12} color="#4F8EF7" style={styles.externalIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  externalIcon: {
    marginLeft: 'auto',
  },
});
