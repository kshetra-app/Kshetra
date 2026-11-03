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

function formatTimeAgo(dateStr: string, t: any): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('common.justNow', { defaultValue: 'Just now' });
  if (mins < 60) return `${mins}${t('common.minutesShort', { defaultValue: 'm' })} ${t('common.ago', { defaultValue: 'ago' })}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t('common.hoursShort', { defaultValue: 'h' })} ${t('common.ago', { defaultValue: 'ago' })}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}${t('common.daysShort', { defaultValue: 'd' })} ${t('common.ago', { defaultValue: 'ago' })}`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  const scopeConfig = headline.scope === 'constituency'
    ? { icon: 'location', color: '#2563EB', bg: '#2563EB18', label: t('common.scopes.constituency', { defaultValue: 'Constituency' }) }
    : headline.scope === 'district'
    ? { icon: 'business', color: '#7C3AED', bg: '#7C3AED18', label: t('common.scopes.district', { defaultValue: 'District' }) }
    : headline.scope === 'state'
    ? { icon: 'globe', color: '#059669', bg: '#05966918', label: t('common.scopes.state', { defaultValue: 'State' }) }
    : null;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
      onPress={() => {
        if (headline.sourceUrl) {
          Linking.openURL(headline.sourceUrl).catch(() => {});
        }
      }}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          {scopeConfig && (
            <View style={[styles.scopeBadge, { backgroundColor: scopeConfig.bg }]}>
              <Ionicons name={scopeConfig.icon as any} size={11} color={scopeConfig.color} style={{ marginRight: 3 }} />
              <Text style={[styles.scopeText, { color: scopeConfig.color }]}>{scopeConfig.label}</Text>
            </View>
          )}
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>{catLabel}</Text>
          </View>
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTimeAgo(headline.publishedAt, t)}</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{hlTitle}</Text>

      {hlSummary && (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>{hlSummary}</Text>
      )}

      <View style={styles.sourceRow}>
        <Ionicons name="newspaper-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
        <Text style={[styles.sourceName, { color: colors.textMuted }]}>{headline.sourceName}</Text>
        <Ionicons name="open-outline" size={13} color={colors.primary} style={styles.externalIcon} />
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
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeText: {
    fontSize: 10,
    fontWeight: '700',
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
    lineHeight: 21,
    marginBottom: 6,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '600',
  },
  externalIcon: {
    marginLeft: 'auto',
  },
});
