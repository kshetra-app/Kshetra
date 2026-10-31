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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tapLight } from '../../lib/haptics';
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
import AdCard from '../../components/AdCard';
import { AD_INSERT_INTERVAL } from '../../lib/adConfig';
import ConstituencySelectorSheet from '../../components/ConstituencySelectorSheet';
import StateSwitcher from '../../components/StateSwitcher';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
  getLocalizedPosts,
  getLocalizedStateName,
  getLocalizedHashtag,
} from '../../lib/seedTranslations';
import type { Post, PostType, FeedScope, SortOrder } from '../../lib/feedTypes';
import { rankPostsV1 } from '../../lib/feedRanking';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useContentPromotionStore } from '../../stores/contentPromotion';
import { useTheme } from '../../lib/theme';
import { gateContentAction, logContentAction } from '../../lib/contentAccountability';

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
  { key: 'ranked', icon: 'sparkles-outline', tKey: 'feed.sort.forYou' },
  { key: 'latest', icon: 'time-outline', tKey: 'feed.sort.latest' },
  { key: 'top', icon: 'flame-outline', tKey: 'feed.sort.top' },
  { key: 'discussed', icon: 'chatbubbles-outline', tKey: 'feed.sort.discussed' },
  { key: 'polls', icon: 'stats-chart-outline', tKey: 'feed.sort.polls' },
];

export interface FeedScreenProps {
  hideHeader?: boolean;
}

export default function FeedScreen({ hideHeader = false }: FeedScreenProps = {}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [composeVisible, setComposeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [constituencySheetVisible, setConstituencySheetVisible] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [autoFocusReply, setAutoFocusReply] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

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
    let sorted: Post[];
    if (sortBy === 'ranked') {
      sorted = rankPostsV1(filtered, {
        constituencyId: effectiveConstituencyId,
        stateCode,
      });
    } else {
      sorted = filtered.sort((a, b) => {
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
    }

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
        message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Poligram`,
      });
    } catch (_) {}
  }, []);

  const handleEdit = useCallback((post: Post) => {
    setEditingPost(post);
    setComposeVisible(true);
  }, []);

  const handleDelete = useCallback(
    (post: Post) => {
      if (!gateContentAction('delete_post')) return;
      Alert.alert(
        t('postCard.deleteConfirm'),
        t('postCard.deleteConfirmBody'),
        [
          { text: t('postCard.cancel'), style: 'cancel' },
          {
            text: t('postCard.delete'),
            style: 'destructive',
            onPress: () => {
              deletePost(post.id);
              logContentAction('delete_post', {
                type: 'post',
                id: post.id,
                screenName: 'feed',
              });
            },
          },
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

  const router = useRouter();
  const { insets } = useResponsive();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Standalone Title (only when not embedded in Community tab) */}
      {!hideHeader && (
        <View style={[styles.standaloneHeader, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('feed.title')}
          </Text>
        </View>
      )}

      {/* Unified Compact Control Strip (Replaces 2 stacked headers & rails) */}
      <View
        style={[
          styles.compactControlStrip,
          {
            paddingTop: hideHeader ? 6 : 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Left: Scope Selector Pill */}
        <Pressable
          style={[
            styles.scopePill,
            { backgroundColor: colors.background, borderColor: colors.goldBorder || colors.border },
            scopeFilter !== 'national' && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
          ]}
          onPress={() => {
            tapLight();
            if (scopeFilter === 'constituency' && !effectiveConstituencyId) {
              setConstituencySheetVisible(true);
            } else {
              setShowScopeModal(true);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Feed Scope"
        >
          <Ionicons
            name={scopeFilter === 'national' ? 'globe-outline' : scopeFilter === 'state' ? 'map-outline' : 'location-outline'}
            size={13}
            color={scopeFilter !== 'national' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.scopePillText,
              { color: scopeFilter !== 'national' ? colors.primary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {scopeLabel}
          </Text>
          <Ionicons name="chevron-down" size={10} color={colors.textMuted} />
        </Pressable>

        {/* Right: Actions (State Switcher, Sort, Verified, Search, Pages) */}
        <View style={styles.stripActions}>
          <StateSwitcher />

          {/* Sort Selector Pill */}
          <Pressable
            style={[
              styles.sortPill,
              { backgroundColor: colors.background, borderColor: colors.border },
              sortBy !== 'ranked' && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
            ]}
            onPress={() => {
              tapLight();
              setShowSortModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Sort Discussions"
          >
            <Ionicons
              name={
                sortBy === 'ranked'
                  ? 'sparkles-outline'
                  : sortBy === 'latest'
                  ? 'time-outline'
                  : sortBy === 'top'
                  ? 'flame-outline'
                  : sortBy === 'polls'
                  ? 'stats-chart-outline'
                  : 'chatbubbles-outline'
              }
              size={13}
              color={sortBy !== 'ranked' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.sortPillText,
                { color: sortBy !== 'ranked' ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {t(SORT_OPTIONS.find((s) => s.key === sortBy)?.tKey ?? 'feed.sort.forYou')}
            </Text>
            <Ionicons name="chevron-down" size={10} color={colors.textMuted} />
          </Pressable>

          {/* Verified Authors Toggle */}
          <Pressable
            style={[
              styles.iconBtnSmall,
              { backgroundColor: colors.background, borderColor: colors.border },
              verifiedOnly && { borderColor: '#10B981', backgroundColor: '#10B98120' },
            ]}
            onPress={() => {
              tapLight();
              setVerifiedOnly(!verifiedOnly);
            }}
            accessibilityRole="button"
            accessibilityLabel="Verified Authors Only"
          >
            <Ionicons
              name={verifiedOnly ? 'checkmark-circle' : 'shield-checkmark-outline'}
              size={15}
              color={verifiedOnly ? '#10B981' : colors.textMuted}
            />
          </Pressable>

          {/* Search Toggle */}
          <Pressable
            style={[
              styles.iconBtnSmall,
              { backgroundColor: colors.background, borderColor: colors.border },
              (searchOpen || searchQuery.length > 0) && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => {
              tapLight();
              setSearchOpen(!searchOpen);
            }}
            accessibilityRole="button"
            accessibilityLabel="Search Feed"
          >
            <Ionicons
              name={searchOpen ? 'close' : 'search'}
              size={15}
              color={searchOpen || searchQuery.length > 0 ? colors.primary : colors.textMuted}
            />
          </Pressable>

          {/* Pages & Leaders Shortcut */}
          <Pressable
            style={[
              styles.iconBtnSmall,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            onPress={() => {
              tapLight();
              router.push('/pages' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Pages & Leaders"
          >
            <Ionicons name="people-outline" size={15} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Expandable Live Search Bar */}
      {searchOpen && (
        <View style={[styles.searchBarRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={15} color={colors.textMuted} />
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
              <Ionicons name="close-circle" size={15} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Single Clean Post Type Category Rail */}
      <View style={styles.categoryRailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
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
                onPress={() => {
                  tapLight();
                  setFilter(tab.key);
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={12}
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
        renderItem={({ item, index }) => {
          const isOwner = item.author.id === userId;
          return (
            <View>
              <PostCard
                post={item}
                isOwner={isOwner}
                onPress={() => handleCardPress(item)}
                onReact={(reaction) => {
                  if (!gateContentAction('react_post')) return;
                  toggleReaction(item.id, reaction);
                  logContentAction('react_post', {
                    type: 'post',
                    id: item.id,
                    body: reaction,
                    screenName: 'feed',
                  });
                }}
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
                    onVote={(optionId) => {
                      if (!gateContentAction('vote_poll')) return;
                      votePoll(item.id, optionId);
                      logContentAction('vote_poll', {
                        type: 'poll',
                        id: item.id,
                        body: optionId,
                        screenName: 'feed',
                      });
                    }}
                  />
                </View>
              )}
              {(index + 1) % AD_INSERT_INTERVAL === 0 && (
                <AdCard screenName="feed" slotIndex={index} />
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

      {/* Floating Action Button (FAB) for Compose */}
      <Pressable
        style={[
          styles.composeFab,
          { backgroundColor: colors.primary },
        ]}
        onPress={() => {
          tapLight();
          setEditingPost(undefined);
          setComposeVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Create Post"
      >
        <Ionicons name="create" size={22} color="#FFFFFF" />
      </Pressable>

      {/* Modal: Scope Selector */}
      <Modal
        visible={showScopeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScopeModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowScopeModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Geographic Scope</Text>
              <Pressable onPress={() => setShowScopeModal(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.modalList}>
              {SCOPE_OPTIONS.map((opt) => {
                const active = scopeFilter === opt.key;
                const disabled = stateCode === 'IN' && (opt.key === 'state' || opt.key === 'constituency');
                let label = t(opt.tKey);
                if (opt.key === 'state') label = stateName;
                if (opt.key === 'constituency' && effectiveConstituencyName) label = effectiveConstituencyName;

                return (
                  <Pressable
                    key={opt.key}
                    disabled={disabled}
                    style={[
                      styles.modalOption,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      disabled && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      tapLight();
                      setShowScopeModal(false);
                      handleScopePress(opt.key);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: active ? colors.primary : colors.text },
                          active && { fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Sort Selector */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sort Discussions By</Text>
              <Pressable onPress={() => setShowSortModal(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.modalList}>
              {SORT_OPTIONS.map((s) => {
                const isSelected = sortBy === s.key;
                return (
                  <Pressable
                    key={s.key}
                    style={[
                      styles.modalOption,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      tapLight();
                      setSortBy(s.key);
                      setShowSortModal(false);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Ionicons
                        name={s.icon as any}
                        size={18}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: isSelected ? colors.primary : colors.text },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {t(s.tKey)}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  standaloneHeader: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
  },
  compactControlStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 135,
  },
  scopePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryRailContainer: {
    paddingVertical: 4,
  },
  composeFab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 90,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalList: {
    gap: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
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
