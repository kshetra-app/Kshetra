import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../stores/feed';
import { useAuthStore } from '../../stores/auth';
import PostCard from '../../components/PostCard';
import PollCard from '../../components/PollCard';
import ComposeSheet from '../../components/ComposeSheet';
import TrendingHashtags from '../../components/TrendingHashtags';
import type { Post, PostType } from '../../lib/feedTypes';
import { useTranslation } from 'react-i18next';

const FILTER_TAB_KEYS: { key: PostType | 'all'; tKey: string; icon: string }[] = [
  { key: 'all', tKey: 'feed.filters.all', icon: 'grid' },
  { key: 'discussion', tKey: 'feed.filters.discussion', icon: 'chatbubbles' },
  { key: 'news', tKey: 'feed.filters.news', icon: 'newspaper' },
  { key: 'question', tKey: 'feed.filters.question', icon: 'help-circle' },
  { key: 'poll', tKey: 'feed.filters.poll', icon: 'stats-chart' },
  { key: 'opinion', tKey: 'feed.filters.opinion', icon: 'megaphone' },
];

export default function FeedScreen() {
  const { t } = useTranslation();
  const [composeVisible, setComposeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const feedFilter = useFeedStore((s) => s.feedFilter);
  const setFilter = useFeedStore((s) => s.setFilter);
  const getFilteredPosts = useFeedStore((s) => s.getFilteredPosts);
  const addPost = useFeedStore((s) => s.addPost);
  const toggleReaction = useFeedStore((s) => s.toggleReaction);
  const votePoll = useFeedStore((s) => s.votePoll);
  const user = useAuthStore((s) => s.user);

  const posts = getFilteredPosts();
  const allPosts = useFeedStore((s) => s.posts);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay — in production, fetch from Supabase
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleShare = useCallback(async (post: Post) => {
    try {
      await Share.share({
        message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Kshetra`,
      });
    } catch (_) {}
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View>
        <PostCard
          post={item}
          onReact={(reaction) => toggleReaction(item.id, reaction)}
          onReply={() => {
            // TODO: open reply compose
          }}
          onShare={() => handleShare(item)}
        />
        {item.poll && (
          <View style={styles.pollContainer}>
            <PollCard
              poll={item.poll}
              onVote={(optionId) => votePoll(item.id, optionId)}
            />
          </View>
        )}
      </View>
    ),
    [toggleReaction, votePoll, handleShare],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('feed.title')}</Text>
        <Pressable
          style={styles.composeButton}
          onPress={() => {
            if (!user) {
              // Guest mode — still allow composing for demo
            }
            setComposeVisible(true);
          }}
        >
          <Ionicons name="create" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          data={FILTER_TAB_KEYS}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item: tab }) => {
            const active = feedFilter === tab.key;
            return (
              <Pressable
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilter(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {t(tab.tKey)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Posts list */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F8EF7"
            colors={['#4F8EF7']}
          />
        }
        ListHeaderComponent={
          feedFilter === 'all' ? (
            <TrendingHashtags
              posts={allPosts}
              onTagPress={(tag) => {
                // Filter by clicking trending tag — set filter to 'all' and we could add text search later
              }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#1F2937" />
            <Text style={styles.emptyTitle}>{t('feed.emptyFeed')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('feed.compose')}
            </Text>
          </View>
        }
      />

      {/* Compose sheet */}
      <ComposeSheet
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSubmit={(post) => addPost(post)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  composeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111827',
    gap: 5,
  },
  filterTabActive: {
    backgroundColor: '#4F8EF7',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  pollContainer: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
});
