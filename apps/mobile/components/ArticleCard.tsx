import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Article } from '../lib/journalistTypes';
import { JOURNALIST_TIER_CONFIG, ARTICLE_TYPE_CONFIG, getArticleStatusColor, calculateReadTime } from '../lib/journalistTypes';

interface ArticleCardProps {
  article: Article;
  onPress?: () => void;
  onTip?: () => void;
  compact?: boolean;
}

export default function ArticleCard({ article, onPress, onTip, compact }: ArticleCardProps) {
  const { t } = useTranslation();
  const typeConfig = ARTICLE_TYPE_CONFIG[article.type];
  const tierConfig = JOURNALIST_TIER_CONFIG[article.authorTier];

  if (compact) {
    return (
      <Pressable style={styles.compactCard} onPress={onPress}>
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
          <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactHeadline} numberOfLines={2}>{article.headline}</Text>
          <Text style={styles.compactMeta}>{article.authorName} · {t('articleCard.minRead', { n: article.readTimeMinutes })}</Text>
        </View>
        {article.coverImageUrl && (
          <Image source={{ uri: article.coverImageUrl }} style={styles.compactImage} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {article.coverImageUrl && (
        <Image source={{ uri: article.coverImageUrl }} style={styles.coverImage} />
      )}
      <View style={styles.content}>
        {/* Type + Breaking badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
            <Text style={[styles.badgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {article.isBreaking && (
            <View style={[styles.typeBadge, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="flash" size={12} color="#EF4444" />
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>{t('articleCard.breaking')}</Text>
            </View>
          )}
          {article.isEditorPick && (
            <View style={[styles.typeBadge, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{t('articleCard.editorsPick')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.headline} numberOfLines={3}>{article.headline}</Text>
        {article.subheadline && <Text style={styles.subheadline} numberOfLines={2}>{article.subheadline}</Text>}

        {/* Author */}
        <View style={styles.authorRow}>
          <View style={[styles.authorAvatar, { borderColor: tierConfig.color }]}>
            <Text style={styles.authorInitial}>{article.authorName.charAt(0)}</Text>
          </View>
          <View>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{article.authorName}</Text>
              <Ionicons name={tierConfig.icon as any} size={12} color={tierConfig.color} style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.authorMeta}>{t('articleCard.minRead', { n: article.readTimeMinutes })} · {article.stateCode || 'India'}</Text>
          </View>
        </View>

        {/* Source attribution */}
        {article.sources.length > 0 && (
          <View style={styles.sourceRow}>
            <Ionicons name="link" size={11} color="#6B7280" />
            <Text style={styles.sourceText}>{t('articleCard.sourcesCited', { n: article.sources.length })}</Text>
            {article.sources.some((s) => s.verifiedByEditor) && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={10} color="#10B981" />
                <Text style={styles.verifiedText}>{t('articleCard.verified')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye" size={14} color="#6B7280" />
            <Text style={styles.statText}>{article.views > 1000 ? `${Math.round(article.views / 1000)}K` : article.views}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart" size={14} color="#6B7280" />
            <Text style={styles.statText}>{article.reactions.like + article.reactions.insightful}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="share-social" size={14} color="#6B7280" />
            <Text style={styles.statText}>{article.shares}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={14} color="#6B7280" />
            <Text style={styles.statText}>{article.comments}</Text>
          </View>
          {onTip && (
            <Pressable style={styles.tipButton} onPress={onTip}>
              <Ionicons name="gift" size={14} color="#F59E0B" />
              <Text style={styles.tipText}>Tip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937' },
  coverImage: { width: '100%', height: 180, backgroundColor: '#1F2937' },
  content: { padding: 16 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  headline: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', lineHeight: 24, marginBottom: 4 },
  subheadline: { fontSize: 14, color: '#9CA3AF', lineHeight: 20, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  authorInitial: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 13, fontWeight: '700', color: '#E5E7EB' },
  authorMeta: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#1F293740', borderRadius: 8 },
  sourceText: { fontSize: 11, color: '#6B7280' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 },
  verifiedText: { fontSize: 10, color: '#10B981', fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tipButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: '#F59E0B15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tipText: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#111827', borderRadius: 12, marginHorizontal: 16, marginVertical: 4, borderWidth: 1, borderColor: '#1F2937' },
  compactContent: { flex: 1 },
  compactHeadline: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 },
  compactMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  compactImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#1F2937' },
});
