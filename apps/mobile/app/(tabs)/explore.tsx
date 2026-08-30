import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '../../lib/constants';
import CandidateAvatar from '../../components/CandidateAvatar';
import { useFavoritesStore } from '../../stores/favorites';
import { useActiveStateStore } from '../../stores/activeState';
import StateSwitcher from '../../components/StateSwitcher';
import AISmartSearch from '../../components/AISmartSearch';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '../../lib/stateDataAdapter';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../lib/responsive';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import { useAffidavitStore } from '../../stores/affidavits';
import ChiefMinisterBadge from '../../components/ChiefMinisterBadge';
import { useTheme } from '../../lib/theme';

type SortKey = 'acNo' | 'name' | 'margin_asc' | 'margin_desc';

const SORT_OPTION_KEYS: { key: SortKey; tKey: string }[] = [
  { key: 'acNo', tKey: 'explore.sort.acNo' },
  { key: 'name', tKey: 'explore.sort.name' },
  { key: 'margin_asc', tKey: 'explore.sort.marginAsc' },
  { key: 'margin_desc', tKey: 'explore.sort.marginDesc' },
];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('acNo');
  const [photoViewer, setPhotoViewer] = useState<{ uri: string | null; name: string; party: string } | null>(null);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const allConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );

  /** Reset filters and search when switching state to avoid phantom empty results */
  useEffect(() => {
    setPartyFilter(null);
    setDistrictFilter(null);
    setTypeFilter(null);
    setQuery('');
    setShowFavoritesOnly(false);
  }, [stateCode]);

  /** Derive unique parties and districts from data */
  const { parties, districts } = useMemo(() => {
    const pSet = new Set<string>();
    const dSet = new Set<string>();
    for (const c of allConstituencies) {
      pSet.add(c.winnerParty);
      dSet.add(c.district);
    }
    return {
      parties: [...pSet].sort(),
      districts: [...dSet].sort(),
    };
  }, [allConstituencies]);

  const activeFilterCount = [partyFilter, districtFilter, typeFilter].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setPartyFilter(null);
    setDistrictFilter(null);
    setTypeFilter(null);
    setSortKey('acNo');
  }, []);

  const filtered = useMemo(() => {
    let results = allConstituencies;

    if (showFavoritesOnly) {
      results = results.filter((c) => favoriteIds.includes(c.acNo));
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.winnerName.toLowerCase().includes(q) ||
          c.winnerParty.toLowerCase().includes(q) ||
          (c.runnerUp && c.runnerUp.toLowerCase().includes(q)) ||
          c.type.toLowerCase() === q ||
          String(c.acNo) === q ||
          String(c.acNo).includes(q),
      );
    }

    if (partyFilter) {
      results = results.filter((c) => c.winnerParty === partyFilter);
    }
    if (districtFilter) {
      results = results.filter((c) => c.district === districtFilter);
    }
    if (typeFilter) {
      results = results.filter((c) => c.type === typeFilter);
    }

    // Sort
    const sorted = [...results];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'margin_asc':
        sorted.sort((a, b) => a.margin - b.margin);
        break;
      case 'margin_desc':
        sorted.sort((a, b) => b.margin - a.margin);
        break;
      default: // acNo
        sorted.sort((a, b) => a.acNo - b.acNo);
    }

    return sorted;
  }, [query, showFavoritesOnly, favoriteIds, allConstituencies, partyFilter, districtFilter, typeFilter, sortKey]);

  const renderItem = useCallback(
    ({ item }: { item: UnifiedConstituency }) => (
      <ConstituencyCard
        item={item}
        isFav={isFavorite(item.acNo)}
        onPress={() => router.push(`/constituency/${item.stateCode}-AC-${item.acNo}` as any)}
        onAvatarPress={(uri, name, party) => setPhotoViewer({ uri, name, party })}
        onToggleFav={() => toggleFavorite(item.acNo)}
      />
    ),
    [isFavorite, toggleFavorite, router],
  );

  const { insets, contentPaddingBottom } = useResponsive();

  const renderHeaderControls = () => (
    <View>
      <ChiefMinisterBadge stateCode={stateCode} />

      {/* Quick Nav — Parliament, AI Chat, Delimitation */}
      <View style={styles.quickNavRow}>
        <Pressable
          style={[styles.quickNavBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => router.push('/parliament' as any)}
        >
          <Ionicons name="business" size={20} color={colors.teal} />
          <Text style={[styles.quickNavText, { color: colors.text }]} numberOfLines={2}>
            {t('exploreExtended.mpsParliament', { defaultValue: 'Parliament & MPs' })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.quickNavBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => router.push('/ai-chat' as any)}
        >
          <Ionicons name="sparkles" size={20} color={colors.gold} />
          <Text style={[styles.quickNavText, { color: colors.text }]} numberOfLines={2}>
            {t('exploreExtended.aiChat', { defaultValue: 'AI Chat' })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.quickNavBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => router.push('/delimitation' as any)}
        >
          <Ionicons name="resize" size={20} color={colors.primary} />
          <Text style={[styles.quickNavText, { color: colors.text, fontSize: 10.5 }]} numberOfLines={1}>
            {t('exploreExtended.delimitation', { defaultValue: 'Delimitation' })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.quickNavBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => router.push('/local-bodies' as any)}
        >
          <Ionicons name="home" size={20} color={colors.gold} />
          <Text style={[styles.quickNavText, { color: colors.text }]} numberOfLines={2}>
            {t('exploreExtended.localBodies', { defaultValue: 'Local Bodies' })}
          </Text>
        </Pressable>
      </View>

      {/* AI Smart Search toggle */}
      <View style={styles.aiSearchToggleRow}>
        <Pressable
          style={[
            styles.aiSearchToggle,
            { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
            showAISearch && { backgroundColor: colors.goldLight, borderColor: colors.gold },
          ]}
          onPress={() => setShowAISearch((v) => !v)}
        >
          <Ionicons name="sparkles" size={14} color={showAISearch ? colors.gold : colors.textMuted} />
          <Text
            style={[
              styles.aiSearchToggleText,
              { color: colors.textSecondary },
              showAISearch && { color: colors.gold, fontWeight: '700' },
            ]}
          >
            {t('explore.aiSearch')}
          </Text>
        </Pressable>
      </View>

      {showAISearch && (
        <View style={styles.aiSearchContainer}>
          <AISmartSearch onSelect={(acNo) => router.push(`/constituency/${stateCode}-AC-${acNo}` as any)} />
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('explore.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[
            styles.filterToggle,
            { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
            showFilters && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons name="options" size={18} color={showFilters ? colors.primary : colors.textMuted} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Sort */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('explore.sortBy')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SORT_OPTION_KEYS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.chip, sortKey === opt.key && styles.chipActive]}
                    onPress={() => setSortKey(opt.key)}
                  >
                    <Text style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
                      {t(opt.tKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Party filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('explore.party')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !partyFilter && styles.chipActive]}
                  onPress={() => setPartyFilter(null)}
                >
                  <Text style={[styles.chipText, !partyFilter && styles.chipTextActive]}>{t('common.all')}</Text>
                </Pressable>
                {parties.map((p) => (
                  <Pressable
                    key={p}
                    style={[
                      styles.chip,
                      partyFilter === p && { backgroundColor: getPartyColor(p) + '30', borderColor: getPartyColor(p) },
                    ]}
                    onPress={() => setPartyFilter(partyFilter === p ? null : p)}
                  >
                    <View style={[styles.partyDot, { backgroundColor: getPartyColor(p) }]} />
                    <Text style={[styles.chipText, partyFilter === p && { color: getPartyColor(p) }]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* District filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('explore.district')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !districtFilter && styles.chipActive]}
                  onPress={() => setDistrictFilter(null)}
                >
                  <Text style={[styles.chipText, !districtFilter && styles.chipTextActive]}>{t('common.all')}</Text>
                </Pressable>
                {districts.map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.chip, districtFilter === d && styles.chipActive]}
                    onPress={() => setDistrictFilter(districtFilter === d ? null : d)}
                  >
                    <Text style={[styles.chipText, districtFilter === d && styles.chipTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Type filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('explore.type')}</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, !typeFilter && styles.chipActive]}
                onPress={() => setTypeFilter(null)}
              >
                <Text style={[styles.chipText, !typeFilter && styles.chipTextActive]}>{t('common.all')}</Text>
              </Pressable>
              {['GEN', 'SC', 'ST'].map((tp) => (
                <Pressable
                  key={tp}
                  style={[styles.chip, typeFilter === tp && styles.chipActive]}
                  onPress={() => setTypeFilter(typeFilter === tp ? null : tp)}
                >
                  <Text style={[styles.chipText, typeFilter === tp && styles.chipTextActive]}>{tp}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeFilterCount > 0 && (
            <Pressable style={styles.clearButton} onPress={clearAllFilters}>
              <Ionicons name="close" size={14} color="#EF4444" />
              <Text style={styles.clearButtonText}>{t('explore.clearFilters')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>{t('explore.title')}</Text>
              <StateSwitcher />
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {filtered.length} / {allConstituencies.length} {t('explore.constituencies')}
              {showFavoritesOnly ? ` (${t('explore.favoritesOnly')})` : ''}
            </Text>
          </View>
          <Pressable
            style={[
              styles.favFilterButton,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
              showFavoritesOnly && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => setShowFavoritesOnly((v) => !v)}
          >
            <Ionicons
              name={showFavoritesOnly ? 'heart' : 'heart-outline'}
              size={18}
              color={showFavoritesOnly ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {stateCode === 'IN' ? (
        <ScrollView contentContainerStyle={styles.scrollHeaderOnly}>
          {renderHeaderControls()}
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder || colors.border }]}>
              <Ionicons name="map" size={38} color={colors.gold} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('exploreExtended.selectAState')}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('exploreExtended.pleaseSelectState')}
            </Text>
          </View>
        </ScrollView>
      ) : filtered.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollHeaderOnly}>
          {renderHeaderControls()}
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={34} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('common.noResults')}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('explore.noResultsHint')}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlashList
          key={stateCode}
          data={filtered}
          extraData={{ stateCode, favoriteIds, showAISearch, showFilters, query, sortKey, partyFilter, districtFilter, typeFilter }}
          renderItem={renderItem}
          keyExtractor={(item) => `${stateCode}-${item.acNo}`}
          ListHeaderComponent={renderHeaderControls}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(contentPaddingBottom, 110) },
          ]}
        />
      )}

      <PhotoViewerModal
        visible={!!photoViewer}
        imageUri={photoViewer?.uri ?? null}
        name={photoViewer?.name ?? ''}
        party={photoViewer?.party ?? ''}
        onClose={() => setPhotoViewer(null)}
      />
    </View>
  );
}

const ConstituencyCard = React.memo(function ConstituencyCard({
  item,
  isFav,
  onPress,
  onAvatarPress,
  onToggleFav,
}: {
  item: UnifiedConstituency;
  isFav: boolean;
  onPress: () => void;
  onAvatarPress?: (uri: string | null, name: string, party: string) => void;
  onToggleFav?: () => void;
}) {
  const partyColor = getPartyColor(item.winnerParty);
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Rich data badges from affidavit store
  const winnerAffidavit = useAffidavitStore.getState().getWinnerAffidavit(item.stateCode || 'TS', item.acNo, item.electionYear || 2023);
  const totalAssets = winnerAffidavit?.totalAssets;
  const criminalCases = winnerAffidavit?.criminalCases;
  const isCrorepati = totalAssets != null && totalAssets >= 1_00_00_000;

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]} onPress={onPress}>
      <View style={styles.cardLeft}>
        <CandidateAvatar
          key={`${item.stateCode || ''}-${item.winnerName}`}
          name={item.winnerName}
          party={item.winnerParty}
          size={48}
          onPress={onAvatarPress ? (uri) => { onAvatarPress(uri, item.winnerName, item.winnerParty); } : undefined}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
          #{item.acNo} · {item.district} · {item.type}
        </Text>
        <View style={styles.cardWinnerRow}>
          <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
            <Text style={styles.partyBadgeText}>{item.winnerParty}</Text>
          </View>
          <Text style={[styles.cardWinner, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.winnerName} · {item.margin.toLocaleString()}
          </Text>
        </View>
        {/* Transparency badges row */}
        {(isCrorepati || (criminalCases != null && criminalCases > 0)) && (
          <View style={styles.cardBadgeRow}>
            {isCrorepati && (
              <View style={[styles.cardCrorepatiBadge, { backgroundColor: colors.goldLight }]}>
                <Ionicons name="diamond" size={9} color={colors.gold} />
                <Text style={[styles.cardCrorepatiText, { color: colors.gold }]}>{t('exploreExtended.crorepati')}</Text>
              </View>
            )}
            {criminalCases != null && criminalCases > 0 && (
              <View style={[styles.cardCriminalBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="alert-circle" size={9} color={colors.danger} />
                <Text style={[styles.cardCriminalText, { color: colors.danger }]}>{criminalCases} {criminalCases > 1 ? t('exploreExtended.cases') : t('exploreExtended.case')}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Pressable
        hitSlop={10}
        onPress={(e) => {
          e.stopPropagation?.();
          onToggleFav?.();
        }}
        style={styles.cardFavButton}
        accessibilityLabel={isFav ? t('explore.removeFavorite', { defaultValue: 'Remove favorite' }) : t('explore.addFavorite', { defaultValue: 'Add favorite' })}
      >
        <Ionicons
          name={isFav ? 'heart' : 'heart-outline'}
          size={18}
          color={isFav ? colors.primary : colors.textMuted}
        />
      </Pressable>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollHeaderOnly: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favFilterActive: {
    backgroundColor: '#FBE8E7',
    borderColor: '#A8201A',
  },
  quickNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 68,
    borderWidth: 1,
    borderColor: '#D8BC7E',
  },
  quickNavText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#241814',
    textAlign: 'center',
    lineHeight: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#241814',
  },
  subtitle: {
    fontSize: 13,
    color: '#6D5549',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#D8BC7E',
  },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: '#FBE8E7',
    borderColor: '#A8201A',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#A8201A',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filtersPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5549',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8DED1',
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#FBE8E7',
    borderColor: '#A8201A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D5549',
  },
  chipTextActive: {
    color: '#A8201A',
    fontWeight: '700',
  },
  partyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#A8201A',
    fontWeight: '600',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#241814',
    height: 44,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#241814',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#6D5549',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  cardLeft: {
    marginRight: 12,
  },
  candidateAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#F5EFE4',
  },
  candidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  partyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#241814',
  },
  cardMeta: {
    fontSize: 12,
    color: '#6D5549',
    marginTop: 2,
  },
  cardWinner: {
    fontSize: 11,
    color: '#8E7B6F',
    flex: 1,
  },
  aiSearchToggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  aiSearchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
  },
  aiSearchToggleActive: {
    backgroundColor: '#F9F4E8',
    borderColor: '#C5A059',
  },
  aiSearchToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D5549',
  },
  aiSearchToggleTextActive: {
    color: '#C5A059',
    fontWeight: '700',
  },
  aiSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  cardCrorepatiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardCrorepatiText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  cardCriminalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF444410',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardCriminalText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  cardFavButton: {
    padding: 6,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
