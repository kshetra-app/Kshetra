import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '@/lib/constants';
import { useFavoritesStore } from '../../stores/favorites';
import { useActiveStateStore } from '../../stores/activeState';
import { getStateData } from '@/lib/stateRegistry';
import StateSwitcher from '../../components/StateSwitcher';
import type { ConstituencySeed } from '@/lib/data';

type SortKey = 'acNo' | 'name' | 'margin_asc' | 'margin_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'acNo', label: 'AC #' },
  { key: 'name', label: 'A–Z' },
  { key: 'margin_asc', label: 'Closest' },
  { key: 'margin_desc', label: 'Biggest' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('acNo');
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const stateData = getStateData(stateCode);
  const allConstituencies = stateData?.constituencies ?? [];

  /** Derive unique parties and districts from data */
  const { parties, districts } = useMemo(() => {
    const pSet = new Set<string>();
    const dSet = new Set<string>();
    for (const c of allConstituencies) {
      pSet.add(c.winner2023);
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
      const q = query.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.winnerName2023.toLowerCase().includes(q) ||
          c.winner2023.toLowerCase().includes(q) ||
          String(c.acNo).includes(q),
      );
    }

    if (partyFilter) {
      results = results.filter((c) => c.winner2023 === partyFilter);
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
        sorted.sort((a, b) => a.margin2023 - b.margin2023);
        break;
      case 'margin_desc':
        sorted.sort((a, b) => b.margin2023 - a.margin2023);
        break;
      default: // acNo
        sorted.sort((a, b) => a.acNo - b.acNo);
    }

    return sorted;
  }, [query, showFavoritesOnly, favoriteIds, allConstituencies, partyFilter, districtFilter, typeFilter, sortKey]);

  const renderItem = useCallback(
    ({ item }: { item: ConstituencySeed }) => (
      <ConstituencyCard item={item} isFav={isFavorite(item.acNo)} onPress={() => router.push(`/constituency/${item.acNo}`)} />
    ),
    [isFavorite, router],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Explore</Text>
              <StateSwitcher />
            </View>
            <Text style={styles.subtitle}>
              {filtered.length} of {allConstituencies.length} constituencies
              {showFavoritesOnly ? ' (favourites)' : ''}
            </Text>
          </View>
          <Pressable
            style={[
              styles.favFilterButton,
              showFavoritesOnly && styles.favFilterActive,
            ]}
            onPress={() => setShowFavoritesOnly((v) => !v)}
          >
            <Ionicons
              name={showFavoritesOnly ? 'heart' : 'heart-outline'}
              size={18}
              color={showFavoritesOnly ? '#EF4444' : '#6B7280'}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#6B7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, district, candidate..."
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons name="options" size={18} color={showFilters ? '#4F8EF7' : '#6B7280'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Sort */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.chip, sortKey === opt.key && styles.chipActive]}
                    onPress={() => setSortKey(opt.key)}
                  >
                    <Text style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Party filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Party</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !partyFilter && styles.chipActive]}
                  onPress={() => setPartyFilter(null)}
                >
                  <Text style={[styles.chipText, !partyFilter && styles.chipTextActive]}>All</Text>
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
            <Text style={styles.filterLabel}>District</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !districtFilter && styles.chipActive]}
                  onPress={() => setDistrictFilter(null)}
                >
                  <Text style={[styles.chipText, !districtFilter && styles.chipTextActive]}>All</Text>
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

          {/* Reservation type filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, !typeFilter && styles.chipActive]}
                onPress={() => setTypeFilter(null)}
              >
                <Text style={[styles.chipText, !typeFilter && styles.chipTextActive]}>All</Text>
              </Pressable>
              {['GEN', 'SC', 'ST'].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, typeFilter === t && styles.chipActive]}
                  onPress={() => setTypeFilter(typeFilter === t ? null : t)}
                >
                  <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeFilterCount > 0 && (
            <Pressable style={styles.clearButton} onPress={clearAllFilters}>
              <Ionicons name="close" size={14} color="#EF4444" />
              <Text style={styles.clearButtonText}>Clear all filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={40} color="#4B5563" />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          estimatedItemSize={88}
          keyExtractor={(item) => String(item.acNo)}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const ConstituencyCard = React.memo(function ConstituencyCard({
  item,
  isFav,
  onPress,
}: {
  item: ConstituencySeed;
  isFav: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.partyBadge,
            { backgroundColor: getPartyColor(item.winner2023) },
          ]}
        >
          <Text style={styles.partyBadgeText}>{item.winner2023}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>
          #{item.acNo} · {item.district} · {item.type}
        </Text>
        <Text style={styles.cardWinner}>
          {item.winnerName2023} · Margin: {item.margin2023.toLocaleString()}
        </Text>
      </View>
      {isFav && (
        <Ionicons name="heart" size={14} color="#EF4444" style={{ marginRight: 6 }} />
      )}
      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favFilterActive: {
    backgroundColor: '#EF444420',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
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
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: '#4F8EF720',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4F8EF7',
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
    color: '#4B5563',
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
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  chipTextActive: {
    color: '#4F8EF7',
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
    color: '#EF4444',
    fontWeight: '600',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    height: 44,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardLeft: {
    marginRight: 12,
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  partyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardWinner: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
