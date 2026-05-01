import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Share,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../stores/feed';
import { useAuthStore } from '../../stores/auth';
import { useActiveStateStore } from '../../stores/activeState';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import PostCard from '../../components/PostCard';
import PollCard from '../../components/PollCard';
import ComposeSheet from '../../components/ComposeSheet';
import TrendingHashtags from '../../components/TrendingHashtags';
import type { Post, PostType, PostMedia, FeedScope } from '../../lib/feedTypes';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';

const FILTER_TAB_KEYS: { key: PostType | 'all'; tKey: string; icon: string }[] = [
  { key: 'all', tKey: 'feed.filters.all', icon: 'grid' },
  { key: 'discussion', tKey: 'feed.filters.discussion', icon: 'chatbubbles' },
  { key: 'news', tKey: 'feed.filters.news', icon: 'newspaper' },
  { key: 'question', tKey: 'feed.filters.question', icon: 'help-circle' },
  { key: 'poll', tKey: 'feed.filters.poll', icon: 'stats-chart' },
  { key: 'opinion', tKey: 'feed.filters.opinion', icon: 'megaphone' },
];

const SCOPE_OPTIONS: { key: FeedScope; icon: string; label: string }[] = [
  { key: 'constituency', icon: 'location', label: 'My Constituency' },
  { key: 'state', icon: 'map', label: 'State' },
  { key: 'national', icon: 'globe', label: 'National' },
];

export default function FeedScreen() {
  const { t } = useTranslation();
  const [composeVisible, setComposeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);

  // Raw state selectors — no derived methods (avoids Zustand snapshot loops)
  const allPosts = useFeedStore((s) => s.posts);
  const feedFilter = useFeedStore((s) => s.feedFilter);
  const scopeFilter = useFeedStore((s) => s.scopeFilter);
  const setFilter = useFeedStore((s) => s.setFilter);
  const setScopeFilter = useFeedStore((s) => s.setScopeFilter);
  const addPost = useFeedStore((s) => s.addPost);
  const editPostAction = useFeedStore((s) => s.editPost);
  const deletePost = useFeedStore((s) => s.deletePost);
  const toggleReaction = useFeedStore((s) => s.toggleReaction);
  const votePoll = useFeedStore((s) => s.votePoll);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anon';

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  // Derive filtered posts with useMemo
  const posts = useMemo(() => {
    let filtered = allPosts.filter((p) => !p.isDeleted);

    // Scope filter
    if (scopeFilter === 'constituency' && constituencyId) {
      filtered = filtered.filter((p) => p.constituencyId === constituencyId || (p.isPinned && p.stateCode === stateCode));
    } else if (scopeFilter === 'state') {
      filtered = filtered.filter((p) => p.stateCode === stateCode || p.stateCode === 'NATIONAL');
    }
    // 'national' → show all posts

    // Type filter
    if (feedFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === feedFilter);
    }

    // Sort: pinned first, then by date
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allPosts, scopeFilter, stateCode, constituencyId, feedFilter]);

  // Scope label
  const scopeLabel = useMemo(() => {
    if (scopeFilter === 'constituency' && myHome) return myHome.name;
    if (scopeFilter === 'state') return (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
    return 'All India';
  }, [scopeFilter, stateCode, myHome]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleShare = useCallback(async (post: Post) => {
    try {
      await Share.share({
        message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Kshetra`,
      });
    } catch (_) {}
  }, []);

  const handleEdit = useCallback((post: Post) => {
    setEditingPost(post);
    setComposeVisible(true);
  }, []);

  const handleDelete = useCallback((post: Post) => {
    Alert.alert(
      t('postCard.deleteConfirm'),
      t('postCard.deleteConfirmBody'),
      [
        { text: t('postCard.cancel'), style: 'cancel' },
        { text: t('postCard.delete'), style: 'destructive', onPress: () => deletePost(post.id) },
      ],
    );
  }, [deletePost, t]);

  const handleEditSubmit = useCallback(
    (postId: string, content: string, media?: PostMedia[]) => {
      editPostAction(postId, content);
    },
    [editPostAction],
  );

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const isOwner = item.author.id === userId;
      return (
        <View>
          <PostCard
            post={item}
            isOwner={isOwner}
            onReact={(reaction) => toggleReaction(item.id, reaction)}
            onReply={() => {}}
            onShare={() => handleShare(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
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
      );
    },
    [toggleReaction, votePoll, handleShare, handleEdit, handleDelete, userId],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('feed.title')}</Text>
          <View style={styles.scopeIndicator}>
            <Ionicons name="funnel" size={10} color="#6B7280" />
            <Text style={styles.scopeIndicatorText}>
              {scopeLabel} · {posts.length} post{posts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.composeButton}
          onPress={() => setComposeVisible(true)}
        >
          <Ionicons name="create" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Scope toggle */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeScroll} contentContainerStyle={styles.scopeScrollContent}>
        {SCOPE_OPTIONS.map((opt) => {
          const active = scopeFilter === opt.key;
          const disabled = opt.key === 'constituency' && !myHome;
          return (
            <Pressable
              key={opt.key}
              style={[styles.scopeChip, active && styles.scopeChipActive, disabled && styles.scopeChipDisabled]}
              onPress={() => !disabled && setScopeFilter(opt.key)}
            >
              <Ionicons name={opt.icon as any} size={12} color={active ? '#FFF' : disabled ? '#374151' : '#9CA3AF'} />
              <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive, disabled && { color: '#374151' }]}>
                {opt.key === 'state'
                  ? (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode
                  : opt.key === 'constituency' && myHome
                    ? myHome.name
                    : opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Type filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTER_TAB_KEYS.map((tab) => {
          const active = feedFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={13} color={active ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {t(tab.tKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
              posts={posts}
              onTagPress={(tag) => {}}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#1F2937" />
            <Text style={styles.emptyTitle}>{t('feed.emptyFeed')}</Text>
            <Text style={styles.emptySubtitle}>{t('feed.compose')}</Text>
          </View>
        }
      />

      {/* Compose sheet */}
      {composeVisible && (
        <ComposeSheet
          visible={composeVisible}
          onClose={() => {
            setComposeVisible(false);
            setEditingPost(undefined);
          }}
          onSubmit={(post) => addPost(post)}
          onEditSubmit={handleEditSubmit}
          editPost={editingPost}
        />
      )}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scopeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  scopeIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  composeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  scopeScroll: {
    maxHeight: 36,
    marginBottom: 6,
  },
  scopeScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#111827',
    gap: 4,
  },
  scopeChipActive: {
    backgroundColor: '#4F8EF7',
  },
  scopeChipDisabled: {
    opacity: 0.35,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
  },
  filterScroll: {
    maxHeight: 36,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111827',
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: '#4F8EF7',
  },
  filterLabel: {
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#4B5563',
  },
});
