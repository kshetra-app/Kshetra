import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Article } from '../lib/journalistTypes';
import { JOURNALIST_TIER_CONFIG, ARTICLE_TYPE_CONFIG, getArticleStatusColor, calculateReadTime } from '../lib/journalistTypes';
import { useTheme } from '../lib/theme';

interface ArticleCardProps {
  article: Article;
  onPress?: () => void;
  onTip?: () => void;
  compact?: boolean;
}

export default function ArticleCard({ article, onPress, onTip, compact }: ArticleCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const typeConfig = ARTICLE_TYPE_CONFIG[article.type];
  const tierConfig = JOURNALIST_TIER_CONFIG[article.authorTier];

  if (compact) {
    return (
      <Pressable style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]} onPress={onPress}>
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
          <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactHeadline, { color: colors.text }]} numberOfLines={2}>{article.headline}</Text>
          <Text style={[styles.compactMeta, { color: colors.textMuted }]}>{article.authorName} · {t('articleCard.minRead', { n: article.readTimeMinutes })}</Text>
        </View>
        {article.coverImageUrl && (
          <Image source={{ uri: article.coverImageUrl }} style={[styles.compactImage, { backgroundColor: colors.surfaceElevated }]} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]} onPress={onPress}>
      {article.coverImageUrl && (
        <Image source={{ uri: article.coverImageUrl }} style={[styles.coverImage, { backgroundColor: colors.surfaceElevated }]} />
      )}
      <View style={styles.content}>
        {/* Type + Breaking badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
            <Text style={[styles.badgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {article.isBreaking && (
            <View style={[styles.typeBadge, { backgroundColor: '#A8201A20' }]}>
              <Ionicons name="flash" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>{t('articleCard.breaking')}</Text>
            </View>
          )}
          {article.isEditorPick && (
            <View style={[styles.typeBadge, { backgroundColor: '#D9770620' }]}>
              <Ionicons name="star" size={12} color="#D97706" />
              <Text style={[styles.badgeText, { color: '#D97706' }]}>{t('articleCard.editorsPick')}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={3}>{article.headline}</Text>
        {article.subheadline && <Text style={[styles.subheadline, { color: colors.textSecondary }]} numberOfLines={2}>{article.subheadline}</Text>}

        {/* Author */}
        <View style={styles.authorRow}>
          <View style={[styles.authorAvatar, { borderColor: tierConfig.color, backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.authorInitial, { color: colors.text }]}>{article.authorName.charAt(0)}</Text>
          </View>
          <View>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: colors.text }]}>{article.authorName}</Text>
              <Ionicons name={tierConfig.icon as any} size={12} color={tierConfig.color} style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.authorMeta, { color: colors.textMuted }]}>{t('articleCard.minRead', { n: article.readTimeMinutes })} · {article.stateCode || 'India'}</Text>
          </View>
        </View>

        {/* Source attribution */}
        {article.sources.length > 0 && (
          <View style={[styles.sourceRow, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="link" size={11} color={colors.textMuted} />
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>{t('articleCard.sourcesCited', { n: article.sources.length })}</Text>
            {article.sources.some((s) => s.verifiedByEditor) && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>{t('articleCard.verified')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{article.views > 1000 ? `${Math.round(article.views / 1000)}K` : article.views}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart" size={14} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{article.reactions.like + article.reactions.insightful}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="share-social" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{article.shares}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{article.comments}</Text>
          </View>
          {onTip && (
            <Pressable style={[styles.tipButton, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder, borderWidth: 1 }]} onPress={onTip}>
              <Ionicons name="gift" size={14} color={colors.gold} />
              <Text style={[styles.tipText, { color: colors.gold }]}>Tip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, marginHorizontal: 16, marginVertical: 8, overflow: 'hidden', borderWidth: 1 },
  coverImage: { width: '100%', height: 180 },
  content: { padding: 16 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  headline: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 4 },
  subheadline: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  authorInitial: { fontSize: 14, fontWeight: '800' },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 13, fontWeight: '700' },
  authorMeta: { fontSize: 11, marginTop: 1 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  sourceText: { fontSize: 11 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 },
  verifiedText: { fontSize: 10, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '600' },
  tipButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tipText: { fontSize: 12, fontWeight: '700' },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginHorizontal: 16, marginVertical: 4, borderWidth: 1 },
  compactContent: { flex: 1 },
  compactHeadline: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  compactMeta: { fontSize: 11, marginTop: 4 },
  compactImage: { width: 60, height: 60, borderRadius: 8 },
});
