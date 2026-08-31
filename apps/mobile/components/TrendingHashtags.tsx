import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../stores/activeState';
import type { Post, TrendingHashtag } from '../lib/feedTypes';
import { useTheme } from '../lib/theme';

interface TrendingHashtagsProps {
  posts: Post[];
  activeTag?: string | null;
  onTagPress?: (tag: string) => void;
  onClearTag?: () => void;
  maxTags?: number;
}

export default function TrendingHashtags({
  posts,
  activeTag,
  onTagPress,
  onClearTag,
  maxTags = 10,
}: TrendingHashtagsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const stateName = (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;

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

  if (trending.length === 0 && !activeTag) return null;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          {stateCode === 'IN'
            ? t('feed.trending')
            : t('feed.trendingIn', { state: stateName })}
        </Text>

        {activeTag && (
          <Pressable
            style={[styles.activeFilterChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={onClearTag}
            hitSlop={6}
          >
            <Text style={[styles.activeFilterText, { color: colors.primary }]}>
              #{activeTag}
            </Text>
            <Ionicons name="close-circle" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={trending}
        keyExtractor={(item) => item.tag}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isActive = item.tag === activeTag;
          return (
            <Pressable
              style={[
                styles.tagChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onTagPress?.(item.tag)}
            >
              <Text
                style={[
                  styles.tagRank,
                  { color: colors.gold || colors.primary },
                  isActive && { color: '#FFFFFF' },
                ]}
              >
                {index + 1}
              </Text>
              <View>
                <Text
                  style={[
                    styles.tagName,
                    { color: colors.primary },
                    isActive && { color: '#FFFFFF' },
                  ]}
                >
                  #{item.tag}
                </Text>
                <Text
                  style={[
                    styles.tagCount,
                    { color: colors.textMuted },
                    isActive && { color: '#FFFFFF99' },
                  ]}
                >
                  {item.postCount} {t('common.posts', 'posts')}
                </Text>
              </View>
            </Pressable>
          );
        }}
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
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 11,
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
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    elevation: 1,
  },
  tagRank: {
    fontSize: 15,
    fontWeight: '800',
    width: 18,
    textAlign: 'center',
  },
  tagName: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagCount: {
    fontSize: 10,
    marginTop: 1,
  },
});
