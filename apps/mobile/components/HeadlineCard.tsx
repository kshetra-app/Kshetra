import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { Headline } from '../lib/civicTypes';

const CATEGORY_COLORS: Record<string, string> = {
  politics: '#A8201A',
  governance: '#145C68',
  development: '#2E7D32',
  law_and_order: '#D97706',
  economy: '#C5A059',
  education: '#7C3AED',
  health: '#C0392B',
  environment: '#65A30D',
  opinion: '#EA580C',
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const catColor = CATEGORY_COLORS[headline.category] ?? colors.gold;
  const catLabel = t(`content.headlineCategories.${headline.category}`, headline.category.replace(/_/g, ' '));
  const hlTitle = t(`content.headlines.${headline.id}.title`, headline.title);
  const hlSummary = headline.summary ? t(`content.headlines.${headline.id}.summary`, headline.summary) : undefined;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
      onPress={() => Linking.openURL(headline.sourceUrl).catch(() => {})}
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>{catLabel}</Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(headline.publishedAt)}</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{hlTitle}</Text>

      {hlSummary && (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>{hlSummary}</Text>
      )}

      <View style={styles.sourceRow}>
        <Ionicons name="newspaper-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
        <Text style={[styles.sourceName, { color: colors.textMuted }]}>{headline.sourceName}</Text>
        <Ionicons name="open-outline" size={12} color={colors.primary} style={styles.externalIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
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
