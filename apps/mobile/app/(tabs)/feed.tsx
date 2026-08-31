import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../stores/feed';
import { useAuthStore } from '../../stores/auth';
import { useActiveStateStore } from '../../stores/activeState';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import PostCard from '../../components/PostCard';
import PollCard from '../../components/PollCard';
import { useResponsive } from '../../lib/responsive';
import ComposeSheet from '../../components/ComposeSheet';
import TrendingHashtags from '../../components/TrendingHashtags';
import PostDetailModal from '../../components/PostDetailModal';
import ConstituencySelectorSheet from '../../components/ConstituencySelectorSheet';
import StateSwitcher from '../../components/StateSwitcher';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
  getLocalizedPosts,
  getLocalizedStateName,
  getLocalizedHashtag,
} from '../../lib/seedTranslations';
import type { Post, PostType, FeedScope, SortOrder } from '../../lib/feedTypes';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useContentPromotionStore } from '../../stores/contentPromotion';
import { useTheme } from '../../lib/theme';

const FILTER_TAB_KEYS: { key: PostType | 'all'; tKey: string; icon: string }[] = [
  { key: 'all', tKey: 'feed.filters.all', icon: 'grid' },
  { key: 'discussion', tKey: 'feed.filters.discussion', icon: 'chatbubbles' },
  { key: 'news', tKey: 'feed.filters.news', icon: 'newspaper' },
  { key: 'question', tKey: 'feed.filters.question', icon: 'help-circle' },
  { key: 'poll', tKey: 'feed.filters.poll', icon: 'stats-chart' },
  { key: 'opinion', tKey: 'feed.filters.opinion', icon: 'megaphone' },
  { key: 'alert', tKey: 'feed.filters.alert', icon: 'alert-circle' },
];

const SCOPE_OPTIONS: { key: FeedScope; icon: string; tKey: string }[] = [
  { key: 'constituency', icon: 'location', tKey: 'common.scopes.myConstituency' },
  { key: 'state', icon: 'map', tKey: 'common.scopes.state' },
  { key: 'national', icon: 'globe', tKey: 'common.scopes.national' },
];

const SORT_OPTIONS: { key: SortOrder; icon: string; tKey: string }[] = [
  { key: 'latest', icon: 'time-outline', tKey: 'feed.sort.latest' },
  { key: 'top', icon: 'flame-outline', tKey: 'feed.sort.top' },
  { key: 'discussed', icon: 'chatbubbles-outline', tKey: 'feed.sort.discussed' },
  { key: 'polls', icon: 'stats-chart-outline', tKey: 'feed.sort.polls' },
];

export default function FeedScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [composeVisible, setComposeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [constituencySheetVisible, setConstituencySheetVisible] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [autoFocusReply, setAutoFocusReply] = useState(false);

  // Store selectors
  const allPosts = useFeedStore((s) => s.posts);
  const feedFilter = useFeedStore((s) => s.feedFilter);
  const scopeFilter = useFeedStore((s) => s.scopeFilter);
  const selectedConstituency = useFeedStore((s) => s.selectedConstituency);
  const selectedHashtag = useFeedStore((s) => s.selectedHashtag);
  const searchQuery = useFeedStore((s) => s.searchQuery);
  const sortBy = useFeedStore((s) => s.sortBy);
  const verifiedOnly = useFeedStore((s) => s.verifiedOnly);

  const setFilter = useFeedStore((s) => s.setFilter);
  const setScopeFilter = useFeedStore((s) => s.setScopeFilter);
  const setSelectedConstituency = useFeedStore((s) => s.setSelectedConstituency);
  const setHashtagFilter = useFeedStore((s) => s.setHashtagFilter);
  const setSearchQuery = useFeedStore((s) => s.setSearchQuery);
  const setSortBy = useFeedStore((s) => s.setSortBy);
  const setVerifiedOnly = useFeedStore((s) => s.setVerifiedOnly);
  const clearAllFilters = useFeedStore((s) => s.clearAllFilters);

  const addPost = useFeedStore((s) => s.addPost);
  const editPostAction = useFeedStore((s) => s.editPost);
  const deletePost = useFeedStore((s) => s.deletePost);
  const toggleReaction = useFeedStore((s) => s.toggleReaction);
  const votePoll = useFeedStore((s) => s.votePoll);
  const refreshFeed = useFeedStore((s) => s.refreshFeed);

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anon';

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const rawStateName = (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
  const stateName = getLocalizedStateName(stateCode, i18n.language, rawStateName);
  const myHome = useMyConstituencyStore((s) => s.home);

  const effectiveConstituencyId = selectedConstituency
    ? selectedConstituency.id
    : myHome
      ? `${stateCode}-AC-${myHome.acNo}`
      : undefined;

  const effectiveConstituencyName = selectedConstituency
    ? selectedConstituency.name
    : myHome?.name;

  const getContentVisibilityLevel = useContentPromotionStore((s) => s.getContentVisibilityLevel);

  useEffect(() => {
    if (stateCode === 'IN') {
      if (scopeFilter === 'state' || scopeFilter === 'constituency') {
        setScopeFilter('national');
      }
    }
  }, [stateCode, scopeFilter, setScopeFilter]);

  // Derive filtered and sorted posts
  const posts = useMemo(() => {
    let filtered = allPosts.filter((p) => !p.isDeleted);

    const promoLevel = (p: Post) => {
      if (p.id.startsWith('seed-') || p.isPinned) return null;
      return getContentVisibilityLevel(
        p.type === 'news' ? 'news' : p.type === 'opinion' ? 'opinion' : 'post',
        p.id,
      );
    };

    // 1. Scope Filter
    if (scopeFilter === 'constituency') {
      if (effectiveConstituencyId) {
        filtered = filtered.filter(
          (p) => p.constituencyId === effectiveConstituencyId && promoLevel(p) !== 'restricted',
        );
      } else {
        filtered = [];
      }
    } else if (scopeFilter === 'state') {
      filtered = filtered.filter(
        (p) => p.stateCode === stateCode && promoLevel(p) !== 'restricted',
      );
    } else {
      filtered = filtered.filter((p) => {
        if (p.stateCode === 'NATIONAL') return true;
        return promoLevel(p) === 'national';
      });
    }

    // 2. Post Type Filter
    if (feedFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === feedFilter);
    }

    // 3. Hashtag Filter
    if (selectedHashtag) {
      const normalizedTag = selectedHashtag.toLowerCase();
      filtered = filtered.filter((p) =>
        p.hashtags?.some((h) => h.toLowerCase() === normalizedTag),
      );
    }

    // 4. Verified Authors Only
    if (verifiedOnly) {
      filtered = filtered.filter((p) => p.author.isVerified);
    }

    // 5. Keyword Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.author.displayName.toLowerCase().includes(q) ||
          (p.constituencyName && p.constituencyName.toLowerCase().includes(q)) ||
          p.hashtags?.some((h) => h.toLowerCase().includes(q)),
      );
    }

    // 6. Sorting
    const sorted = filtered.sort((a, b) => {
      // Pinned posts always remain at the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'top') {
        return b.reactionCount - a.reactionCount;
      }
      if (sortBy === 'discussed') {
        return b.replyCount - a.replyCount;
      }
      if (sortBy === 'polls') {
        const votesA = a.poll?.totalVotes ?? 0;
        const votesB = b.poll?.totalVotes ?? 0;
        return votesB - votesA;
      }
      // Default: latest timestamp
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return getLocalizedPosts(sorted, i18n.language);
  }, [
    allPosts,
    scopeFilter,
    stateCode,
    effectiveConstituencyId,
    feedFilter,
    selectedHashtag,
    verifiedOnly,
    searchQuery,
    sortBy,
    getContentVisibilityLevel,
    i18n.language,
  ]);

  // Scope label in header
  const scopeLabel = useMemo(() => {
    if (scopeFilter === 'constituency') {
      return effectiveConstituencyName || t('feed.selectConstituency');
    }
    if (scopeFilter === 'state') return stateName;
    return t('common.scopes.allIndia');
  }, [scopeFilter, effectiveConstituencyName, stateName, t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFeed(stateCode);
    setRefreshing(false);
  }, [refreshFeed, stateCode]);

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

  const handleDelete = useCallback(
    (post: Post) => {
      Alert.alert(
        t('postCard.deleteConfirm'),
        t('postCard.deleteConfirmBody'),
        [
          { text: t('postCard.cancel'), style: 'cancel' },
          { text: t('postCard.delete'), style: 'destructive', onPress: () => deletePost(post.id) },
        ],
      );
    },
    [deletePost, t],
  );

  const handleEditSubmit = useCallback(
    (postId: string, content: string) => {
      editPostAction(postId, content);
    },
    [editPostAction],
  );

  const handleScopePress = (key: FeedScope) => {
    if (key === 'constituency') {
      setScopeFilter('constituency');
      if (!effectiveConstituencyId) {
        setConstituencySheetVisible(true);
      }
    } else {
      setScopeFilter(key);
    }
  };

  const handleCardPress = useCallback((post: Post) => {
    setDetailPost(post);
    setAutoFocusReply(false);
  }, []);

  const handleReplyPress = useCallback((post: Post) => {
    setDetailPost(post);
    setAutoFocusReply(true);
  }, []);

  const hasActiveCustomFilters =
    searchQuery.trim().length > 0 ||
    selectedHashtag !== null ||
    verifiedOnly ||
    feedFilter !== 'all';

  const { insets } = useResponsive();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('feed.title')}
          </Text>
          <View style={styles.scopeIndicator}>
            <Ionicons name="funnel" size={10} color={colors.textMuted} />
            <Text style={[styles.scopeIndicatorText, { color: colors.textMuted }]} numberOfLines={1}>
              {scopeLabel} · {posts.length} {posts.length !== 1 ? t('common.posts') : t('common.post')}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <StateSwitcher />
          <Pressable
            style={[
              styles.headerIconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              searchOpen && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={() => setSearchOpen(!searchOpen)}
            hitSlop={6}
          >
            <Ionicons
              name={searchOpen ? 'close' : 'search'}
              size={18}
              color={searchOpen ? colors.primary : colors.text}
            />
          </Pressable>
          <Pressable
            style={[styles.composeButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setEditingPost(undefined);
              setComposeVisible(true);
            }}
          >
            <Ionicons name="create" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Expandable Live Search Bar */}
      {searchOpen && (
        <View style={[styles.searchBarRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('feed.searchPlaceholder', 'Search discussions, news, #tags...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Geographic Scope Menu */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scopeScroll}
        contentContainerStyle={styles.scopeScrollContent}
      >
        {SCOPE_OPTIONS.map((opt) => {
          const active = scopeFilter === opt.key;
          const isConstituency = opt.key === 'constituency';
          const disabled = stateCode === 'IN' && (opt.key === 'state' || opt.key === 'constituency');

          let label = t(opt.tKey);
          if (opt.key === 'state') label = stateName;
          if (isConstituency && effectiveConstituencyName) label = effectiveConstituencyName;

          return (
            <Pressable
              key={opt.key}
              style={[
                styles.scopeChip,
                { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
                disabled && styles.scopeChipDisabled,
              ]}
              onPress={() => !disabled && handleScopePress(opt.key)}
            >
              <Ionicons
                name={opt.icon as any}
                size={12}
                color={active ? '#FFF' : disabled ? colors.textMuted : colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  styles.scopeChipText,
                  { color: colors.textSecondary },
                  active && styles.scopeChipTextActive,
                  disabled && { color: colors.textMuted },
                ]}
              >
                {label}
              </Text>
              {isConstituency && active && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setConstituencySheetVisible(true);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Post Type Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_TAB_KEYS.map((tab) => {
          const active = feedFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.filterTab,
                { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setFilter(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={active ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  styles.filterLabel,
                  { color: colors.textSecondary },
                  active && styles.filterLabelActive,
                ]}
              >
                {t(tab.tKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sort & Secondary Sub-menu Bar */}
      <View style={[styles.subMenuBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subMenuContent}
        >
          {SORT_OPTIONS.map((s) => {
            const isSelected = sortBy === s.key;
            return (
              <Pressable
                key={s.key}
                style={[
                  styles.sortChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setSortBy(s.key)}
              >
                <Ionicons
                  name={s.icon as any}
                  size={12}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.sortChipText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {t(s.tKey)}
                </Text>
              </Pressable>
            );
          })}

          {/* Verified Authors Only Toggle */}
          <Pressable
            style={[
              styles.sortChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              verifiedOnly && { borderColor: '#10B981', backgroundColor: '#10B98115' },
            ]}
            onPress={() => setVerifiedOnly(!verifiedOnly)}
          >
            <Ionicons
              name={verifiedOnly ? 'checkmark-circle' : 'shield-checkmark-outline'}
              size={12}
              color={verifiedOnly ? '#10B981' : colors.textMuted}
            />
            <Text
              style={[
                styles.sortChipText,
                { color: verifiedOnly ? '#10B981' : colors.textSecondary },
              ]}
            >
              {t('feed.sort.verifiedOnly', 'Verified Only')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Active Custom Filter Feedback Banner */}
      {hasActiveCustomFilters && (
        <View style={[styles.activeFilterBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.activeFilterBannerText, { color: colors.textMuted }]}>
            {t('feed.activeFilters', 'Active Filters')}:
          </Text>
          {selectedHashtag && (
            <Pressable
              style={[styles.filterPill, { backgroundColor: colors.primaryLight }]}
              onPress={() => setHashtagFilter(null)}
            >
              <Text style={[styles.filterPillText, { color: colors.primary }]}>
                #{selectedHashtag}
              </Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {searchQuery.trim().length > 0 && (
            <Pressable
              style={[styles.filterPill, { backgroundColor: colors.primaryLight }]}
              onPress={() => setSearchQuery('')}
            >
              <Text style={[styles.filterPillText, { color: colors.primary }]} numberOfLines={1}>
                "{searchQuery}"
              </Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={clearAllFilters} style={styles.clearAllBtn} hitSlop={6}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              {t('feed.clearFilter', 'Clear All')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Posts list */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwner = item.author.id === userId;
          return (
            <View>
              <PostCard
                post={item}
                isOwner={isOwner}
                onPress={() => handleCardPress(item)}
                onReact={(reaction) => toggleReaction(item.id, reaction)}
                onReply={() => handleReplyPress(item)}
                onShare={() => handleShare(item)}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item)}
                onTagPress={(tag) => setHashtagFilter(tag)}
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
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          feedFilter === 'all' && !selectedHashtag ? (
            <TrendingHashtags
              posts={posts}
              activeTag={selectedHashtag}
              onTagPress={(tag) => setHashtagFilter(tag)}
              onClearTag={() => setHashtagFilter(null)}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasActiveCustomFilters ? t('feed.noResults') : t('feed.emptyFeed')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {hasActiveCustomFilters
                ? t('feed.noResultsSubtitle', 'Try adjusting your filters or search query.')
                : t('feed.compose')}
            </Text>
            {hasActiveCustomFilters && (
              <Pressable
                style={[styles.emptyClearBtn, { backgroundColor: colors.primary }]}
                onPress={clearAllFilters}
              >
                <Text style={styles.emptyClearBtnText}>{t('feed.clearFilter', 'Reset Filters')}</Text>
              </Pressable>
            )}
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

      {/* Post Detail & Discussion Modal */}
      {detailPost && (
        <PostDetailModal
          visible={!!detailPost}
          post={detailPost}
          autoFocusReply={autoFocusReply}
          onClose={() => {
            setDetailPost(null);
            setAutoFocusReply(false);
          }}
          onEditPost={handleEdit}
        />
      )}

      {/* Constituency Selector Sheet */}
      <ConstituencySelectorSheet
        visible={constituencySheetVisible}
        stateCode={stateCode}
        stateName={stateName}
        selectedAcNo={
          selectedConstituency
            ? parseInt(selectedConstituency.id.split('-AC-')[1] || '0', 10)
            : myHome?.acNo
        }
        onClose={() => setConstituencySheetVisible(false)}
        onSelect={(c) => {
          setSelectedConstituency({ id: c.id, name: c.name });
          setScopeFilter('constituency');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  scopeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  scopeIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  composeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  scopeScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 46,
    marginBottom: 4,
    zIndex: 5,
  },
  scopeScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  scopeChipDisabled: {
    opacity: 0.35,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    borderBottomWidth: 0.5,
    zIndex: 5,
  },
  filterContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    gap: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  subMenuBar: {
    borderBottomWidth: 0.5,
    paddingVertical: 6,
  },
  subMenuContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  activeFilterBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 120,
  },
  clearAllBtn: {
    marginLeft: 'auto',
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 100,
  },
  pollContainer: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
  },
  emptyClearBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
