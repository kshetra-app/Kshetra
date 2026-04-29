import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../stores/activeState';
import type { Post, TrendingHashtag } from '../lib/feedTypes';

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color="#F59E0B" />
        <Text style={styles.title}>{t('feed.trendingIn', { state: stateName })}</Text>
      </View>
      <FlatList
        data={trending}
        keyExtractor={(item) => item.tag}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.tagChip}
            onPress={() => onTagPress?.(item.tag)}
          >
            <Text style={styles.tagRank}>{index + 1}</Text>
            <View>
              <Text style={styles.tagName}>#{item.tag}</Text>
              <Text style={styles.tagCount}>
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
    borderBottomColor: '#1F2937',
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
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  tagRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
    width: 20,
    textAlign: 'center',
  },
  tagName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  tagCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
});
