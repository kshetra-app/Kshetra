import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNewsStore } from '../../stores/news';
import { useActiveStateStore } from '../../stores/activeState';
import {
  homeConstituencyBelongsToState,
  useMyConstituencyStore,
} from '../../stores/myConstituency';
import { getUnifiedConstituenciesForState } from '../../lib/stateDataAdapter';
import {
  NEWS_LANGUAGES,
  NEWS_CATEGORIES,
  formatRelativeTime,
  type NewsItem,
} from '../../lib/newsTypes';
import NewsCard from '../../components/NewsCard';
import AdCard from '../../components/AdCard';
import { AD_INSERT_INTERVAL } from '../../lib/adConfig';
import { filterNewsByScope, STATES, type NewsGeographicScope } from '@kshetra/shared';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { tapLight } from '../../lib/haptics';

export default function NewsScreen() {
  const [showDiscoveryHub, setShowDiscoveryHub] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const items = useNewsStore((s) => s.items);
  const generatedAt = useNewsStore((s) => s.generatedAt);
  const loading = useNewsStore((s) => s.loading);
  const loaded = useNewsStore((s) => s.loaded);
  const language = useNewsStore((s) => s.language);
  const category = useNewsStore((s) => s.category);
  const bookmarks = useNewsStore((s) => s.bookmarks);
  const setLanguage = useNewsStore((s) => s.setLanguage);
  const setCategory = useNewsStore((s) => s.setCategory);
  const toggleBookmark = useNewsStore((s) => s.toggleBookmark);
  const refresh = useNewsStore((s) => s.refresh);

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const stateConstituencies = useMemo(
    () => (stateCode === 'IN' ? [] : getUnifiedConstituenciesForState(stateCode)),
    [stateCode],
  );
  const myHomeBelongsToState = useMemo(
    () => homeConstituencyBelongsToState(myHome, stateCode, stateConstituencies),
    [myHome, stateCode, stateConstituencies],
  );
  const userConstituencyId =
    myHomeBelongsToState && myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  const [scope, setScope] = useState<NewsGeographicScope>(
    stateCode === 'IN' ? 'national' : 'state',
  );
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    setScope(stateCode === 'IN' ? 'national' : 'state');
  }, [stateCode]);

  // Revalidate when this tab is opened, when the app resumes, and periodically
  // while visible. Respect the server's refresh interval and avoid duplicate
  // requests from a focus + foreground event firing together.
  const lastAutoRefreshAt = useRef(0);
  const refreshIfStale = useCallback(() => {
    const current = useNewsStore.getState();
    const generatedAtMs = Date.parse(current.generatedAt);
    const maxAgeMs = Math.max(1, current.refreshIntervalMin) * 60_000;
    const now = Date.now();
    const isStale =
      !Number.isFinite(generatedAtMs) ||
      generatedAtMs > now + 5 * 60_000 ||
      now - generatedAtMs >= maxAgeMs;

    if (
      !isStale ||
      current.loading ||
      now - lastAutoRefreshAt.current < 30_000
    ) {
      return;
    }

    lastAutoRefreshAt.current = now;
    void current.refresh();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') refreshIfStale();
      });
      const interval = setInterval(refreshIfStale, 60_000);

      return () => {
        appStateSubscription.remove();
        clearInterval(interval);
      };
    }, [refreshIfStale]),
  );

  // National-only mode locks scope to national.
  useEffect(() => {
    if (stateCode === 'IN' && scope !== 'national') setScope('national');
  }, [stateCode, scope]);

  const filtered = useMemo(() => {
    let list = [...items];

    // Language consumption preference
    if (language) list = list.filter((i) => i.language === language);

    // Geographic tabs use explicit feed metadata; state-labeled stories from
    // national RSS feeds stay out of unrelated local areas.
    list = filterNewsByScope(list, scope, stateCode, userConstituencyId);

    // Category
    if (category === 'video') list = list.filter((i) => !!i.video);
    else if (category !== 'top') list = list.filter((i) => i.category === category);

    // Bookmarks view
    if (showBookmarks) list = list.filter((i) => bookmarks.includes(i.id));

    // Most-local first, then newest.
    const scopeRank = (i: NewsItem) =>
      i.constituencyId === userConstituencyId ? 0 : i.stateCode === stateCode ? 1 : 2;
    return list.sort((a, b) => {
      const r = scopeRank(a) - scopeRank(b);
      if (r !== 0) return r;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [items, language, scope, category, showBookmarks, bookmarks, stateCode, userConstituencyId]);

  const stateName = (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
  const hasContentFilters = language !== null || category !== 'top' || showBookmarks;
  const generatedAtMs = Date.parse(generatedAt);
  const hasFeedSnapshot =
    Number.isFinite(generatedAtMs) && generatedAtMs <= Date.now() + 5 * 60_000;
  const feedUnavailable = loaded && !loading && !hasFeedSnapshot;

  const SCOPES: { key: NewsGeographicScope; label: string; icon: string; disabled: boolean }[] = [
    { key: 'national', label: 'All India', icon: 'globe', disabled: false },
    { key: 'state', label: stateName, icon: 'map', disabled: stateCode === 'IN' },
    {
      key: 'constituency',
      label:
        myHomeBelongsToState && myHome
          ? myHome.name
          : t('common.scopes.myConstituency'),
      icon: 'location',
      disabled: !userConstituencyId,
    },
  ];

  const currentLangLabel = useMemo(() => {
    if (!language) return t('common.allLanguages');
    const match = NEWS_LANGUAGES.find((l) => l.code === language);
    return match ? match.native : language;
  }, [language, t]);

  const currentScopeLabel = useMemo(() => {
    if (scope === 'national') return 'National';
    if (scope === 'state') return stateName;
    return myHomeBelongsToState && myHome
      ? myHome.name
      : t('common.scopes.myConstituency');
  }, [scope, stateName, myHomeBelongsToState, myHome, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sleek, Uncluttered Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('tabs.news', { defaultValue: 'News' })}
          </Text>
          <View style={styles.updatedRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: hasFeedSnapshot ? colors.success : colors.textMuted },
              ]}
            />
            <Text style={[styles.updatedText, { color: colors.textMuted }]}>
              {hasFeedSnapshot
                ? `Updated ${formatRelativeTime(generatedAt)}`
                : loading || !loaded
                  ? t('common.loading')
                  : t('common.newsUnavailable', { defaultValue: 'News is unavailable right now.' })}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Scope Selector Pill */}
          <Pressable
            style={[
              styles.filterPill,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              scope !== 'national' && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
            ]}
            onPress={() => {
              tapLight();
              setShowScopeModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Filter by Scope"
          >
            <Ionicons
              name={scope === 'national' ? 'globe-outline' : scope === 'state' ? 'map-outline' : 'location-outline'}
              size={13}
              color={scope !== 'national' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: scope !== 'national' ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {currentScopeLabel}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
          </Pressable>

          {/* Language Selector Pill */}
          <Pressable
            style={[
              styles.filterPill,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              language !== null && { borderColor: colors.gold || colors.primary, backgroundColor: (colors.gold || '#C5A059') + '18' },
            ]}
            onPress={() => {
              tapLight();
              setShowLanguageModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Filter by Language"
          >
            <Ionicons
              name="language"
              size={13}
              color={language !== null ? (colors.gold || colors.primary) : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: language !== null ? (colors.gold || colors.primary) : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {currentLangLabel}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
          </Pressable>

          {/* Bookmarks Toggle */}
          <Pressable
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              showBookmarks && { backgroundColor: colors.goldLight, borderColor: colors.gold },
            ]}
            onPress={() => {
              tapLight();
              setShowBookmarks((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel="Saved Stories"
          >
            <Ionicons
              name={showBookmarks ? 'bookmark' : 'bookmark-outline'}
              size={17}
              color={showBookmarks ? colors.gold : colors.textMuted}
            />
          </Pressable>

          {/* Discovery / Page Guidance */}
          <Pressable
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
            ]}
            onPress={() => {
              tapLight();
              setShowDiscoveryHub(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="News Guide"
          >
            <Ionicons name="sparkles-outline" size={17} color={colors.gold || colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Single Clean Category Rail (120px+ Reclaimed Real Estate) */}
      <View style={styles.categoryRailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railWrap}
          contentContainerStyle={styles.railContent}
        >
          {NEWS_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={t(['common', 'newsCategories', c.key].join('.'), { defaultValue: c.label })}
              icon={c.icon}
              active={category === c.key}
              onPress={() => {
                tapLight();
                setCategory(c.key);
              }}
            />
          ))}
          {/* Active filter reset pill if custom language or bookmarks active */}
          {(language !== null || showBookmarks) && (
            <Pressable
              style={styles.clearFiltersPill}
              onPress={() => {
                tapLight();
                setLanguage(null);
                setShowBookmarks(false);
              }}
            >
              <Ionicons name="close-circle" size={13} color="#EF4444" />
              <Text style={styles.clearFiltersText}>{t('common.resetFilters')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* News Feed Content - Front & Center Immediately */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => (
          <View>
            <NewsCard
              item={item}
              bookmarked={bookmarks.includes(item.id)}
              onToggleBookmark={() => toggleBookmark(item.id)}
            />
            {(index + 1) % AD_INSERT_INTERVAL === 0 && (
              <AdCard screenName="news" slotIndex={index} />
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !showBookmarks && (loading || !loaded) ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name={showBookmarks ? 'bookmark-outline' : 'newspaper-outline'} size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {showBookmarks
                  ? 'No saved stories yet'
                  : feedUnavailable
                    ? t('common.newsUnavailableDescription', { defaultValue: 'The latest stories could not be loaded. Please try again.' })
                    : hasContentFilters
                    ? 'No stories match these filters'
                    : scope === 'constituency'
                      ? 'No stories are available for this area yet'
                      : scope === 'state'
                        ? `No ${stateName} stories are available right now`
                        : 'No news stories are available right now'}
              </Text>
              {feedUnavailable ? (
                <Pressable
                  style={[styles.resetEmptyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    tapLight();
                    void refresh();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading news"
                >
                  <Text style={[styles.resetEmptyBtnText, { color: colors.primary }]}>{t('common.retry')}</Text>
                </Pressable>
              ) : (hasContentFilters || scope !== 'national') && (
                <Pressable
                  style={[styles.resetEmptyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    tapLight();
                    setLanguage(null);
                    setCategory('top');
                    setShowBookmarks(false);
                    if (scope === 'constituency') setScope('state');
                    else if (scope === 'state') setScope('national');
                  }}
                >
                  <Text style={[styles.resetEmptyBtnText, { color: colors.primary }]}>
                    {scope === 'constituency'
                      ? `Show ${stateName} news`
                      : scope === 'state'
                        ? 'Show All India news'
                        : showBookmarks
                          ? 'Show latest news'
                          : 'Clear filters'}
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
      />

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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Geographic Reach</Text>
              <Pressable onPress={() => setShowScopeModal(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.modalList}>
              {SCOPES.map((s) => {
                const active = scope === s.key;
                return (
                  <Pressable
                    key={s.key}
                    disabled={s.disabled}
                    style={[
                      styles.modalOption,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      s.disabled && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      tapLight();
                      setScope(s.key);
                      setShowScopeModal(false);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Ionicons
                        name={s.icon as any}
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
                        {s.label}
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

      {/* Modal: Language Selector */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLanguageModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select News Language</Text>
              <Pressable onPress={() => setShowLanguageModal(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalList}>
                {/* All Languages Option */}
                <Pressable
                  style={[
                    styles.modalOption,
                    { borderColor: colors.border },
                    language === null && { backgroundColor: (colors.gold || colors.primary) + '15', borderColor: colors.gold || colors.primary },
                  ]}
                  onPress={() => {
                    tapLight();
                    setLanguage(null);
                    setShowLanguageModal(false);
                  }}
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={language === null ? (colors.gold || colors.primary) : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: language === null ? (colors.gold || colors.primary) : colors.text },
                        language === null && { fontWeight: '700' },
                      ]}
                    >
                      All Languages
                    </Text>
                  </View>
                  {language === null && <Ionicons name="checkmark-circle" size={18} color={colors.gold || colors.primary} />}
                </Pressable>

                {NEWS_LANGUAGES.map((l) => {
                  const active = language === l.code;
                  return (
                    <Pressable
                      key={l.code}
                      style={[
                        styles.modalOption,
                        { borderColor: colors.border },
                        active && { backgroundColor: (colors.gold || colors.primary) + '15', borderColor: colors.gold || colors.primary },
                      ]}
                      onPress={() => {
                        tapLight();
                        setLanguage(l.code);
                        setShowLanguageModal(false);
                      }}
                    >
                      <View style={styles.modalOptionLeft}>
                        <Text
                          style={[
                            styles.modalOptionText,
                            { color: active ? (colors.gold || colors.primary) : colors.text },
                            active && { fontWeight: '700' },
                          ]}
                        >
                          {l.native}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 6 }}>
                          ({l.label})
                        </Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={18} color={colors.gold || colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Discovery / Guidance Sheet */}
      <DiscoveryHubSheet
        visible={showDiscoveryHub}
        onClose={() => setShowDiscoveryHub(false)}
        sourceScreen="news"
      />
    </View>
  );
}

function Chip({
  label, active, onPress, icon, disabled,
}: { label: string; active: boolean; onPress: () => void; icon?: string; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
        active && { backgroundColor: colors.primary, borderColor: colors.primary },
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={12}
          color={active ? '#FFF' : disabled ? colors.textMuted : colors.textSecondary}
        />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.chipText,
          { color: colors.textSecondary },
          active && styles.chipTextActive,
          disabled && { color: colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  updatedText: {
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 105,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryRailContainer: {
    paddingVertical: 4,
  },
  railWrap: {
    maxHeight: 38,
  },
  railContent: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 30,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  resetEmptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
  },
  resetEmptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
});
