import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../stores/activeState';
import type { Post, TrendingHashtag } from '../lib/feedTypes';
import { useTheme } from '../lib/theme';

interface TrendingHashtagsProps {
  posts: Post[];
  onTagPress?: (tag: string) => void;
  maxTags?: number;
}

export default function TrendingHashtags({
  posts,
  onTagPress,
  maxTags = 10,
}: TrendingHashtagsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const stateName = STATES[stateCode]?.name ?? stateCode;
  const trending = useMemo((): TrendingHashtag[] => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (post.hashtags) {
        for (const tag of post.hashtags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, postCount]) => ({ tag, postCount }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, maxTags);
  }, [posts, maxTags]);

  if (trending.length === 0) return null;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{t('feed.trendingIn', { state: stateName })}</Text>
      </View>
      <FlatList
        data={trending}
        keyExtractor={(item) => item.tag}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}
            onPress={() => onTagPress?.(item.tag)}
          >
            <Text style={[styles.tagRank, { color: colors.gold }]}>{index + 1}</Text>
            <View>
              <Text style={[styles.tagName, { color: colors.primary }]}>#{item.tag}</Text>
              <Text style={[styles.tagCount, { color: colors.textMuted }]}>
                {item.postCount} {t('content.sentimentLabels.posts')}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tagRank: {
    fontSize: 16,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  tagName: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagCount: {
    fontSize: 11,
    marginTop: 1,
  },
});
