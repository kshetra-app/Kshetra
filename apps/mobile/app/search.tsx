import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { globalSearch, getSearchSuggestions, type SearchResult, type SearchResultType } from '../lib/globalSearch';
import { useRecentsStore } from '../stores/recents';
import MLACard from '../components/MLACard';
import MPCard from '../components/MPCard';
import { getMLAProfileForState } from '../lib/stateDataDispatcher';
import { getMPById } from '../lib/data';
import { useTheme } from '../lib/theme';

const TYPE_CONFIG: Record<SearchResultType, { icon: string; color: string; label: string }> = {
  constituency: { icon: 'location', color: '#A8201A', label: 'Constituency' },
  mla: { icon: 'person', color: '#145C68', label: 'MLA' },
  mp: { icon: 'business', color: '#C5A059', label: 'MP' },
  issue: { icon: 'megaphone', color: '#D3453E', label: 'Issue' },
  post: { icon: 'chatbubble', color: '#C5A059', label: 'Post' },
  promise: { icon: 'checkmark-done', color: '#C5A059', label: 'Promise' },
};

export default function GlobalSearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const recents = useRecentsStore((s) => s.recents);
  const clearRecents = useRecentsStore((s) => s.clearRecents);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => globalSearch(query), [query]);
  const suggestions = useMemo(() => getSearchSuggestions(), []);

  const handleSelect = useCallback((item: SearchResult) => {
    Keyboard.dismiss();
    router.push(item.route as any);
  }, [router]);

  const handleSuggestion = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const renderResult = useCallback(({ item }: { item: SearchResult }) => {
    // ── MLA result: render full MLACard ──────────────────────────────
    if (item.type === 'mla' && item.meta?.stateCode && item.meta?.acNo != null) {
      const mlaProfile = getMLAProfileForState(item.meta.stateCode, item.meta.acNo);
      if (mlaProfile) {
        return (
          <Pressable style={styles.cardWrapper} onPress={() => handleSelect(item)}>
            <MLACard profile={mlaProfile} />
            <View style={styles.cardChevron}>
              <Ionicons name="chevron-forward" size={14} color="#4F8EF7" />
            </View>
          </Pressable>
        );
      }
    }

    // ── MP result: render full MPCard ────────────────────────────────
    if (item.type === 'mp' && item.meta?.mpId) {
      const mpProfile = getMPById?.(item.meta.mpId);
      if (mpProfile) {
        return (
          <Pressable style={styles.cardWrapper} onPress={() => handleSelect(item)}>
            <MPCard profile={mpProfile} compact />
            <View style={styles.cardChevron}>
              <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
            </View>
          </Pressable>
        );
      }
    }

    // ── Default: flat row for constituency/issue/post/promise ────────
    const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.constituency;
    return (
      <Pressable style={styles.resultCard} onPress={() => handleSelect(item)}>
        <View style={[styles.resultIcon, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon as any} size={16} color={config.color} />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
          <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </Pressable>
    );
  }, [handleSelect]);

  const showResults = query.trim().length >= 2;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primaryLight, borderColor: colors.goldBorder || colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#4B5563"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#4B5563" />
            </Pressable>
          )}
        </View>
      </View>

      {showResults ? (
        <View style={styles.resultsList}>
          {results.length > 0 ? (
            <>
              <Text style={styles.resultCount}>{t('search.resultCount', { count: results.length })}</Text>
              <FlashList
                data={results}
                renderItem={renderResult}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color="#374151" />
              <Text style={styles.emptyText}>{t('search.noResults')} "{query}"</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.idleContent}>
          {/* Recent searches */}
          {recents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('search.recentSearches')}</Text>
                <Pressable onPress={clearRecents}>
                  <Text style={styles.clearText}>{t('search.clearRecent')}</Text>
                </Pressable>
              </View>
              {recents.slice(0, 5).map((r) => (
                <Pressable
                  key={r.acNo}
                  style={styles.recentRow}
                  onPress={() => router.push(`/constituency/${r.stateCode ? `${r.stateCode}-AC-${r.acNo}` : `TS-AC-${r.acNo}`}` as any)}
                >
                  <Ionicons name="time" size={14} color="#4B5563" />
                  <Text style={styles.recentText}>{r.name}</Text>
                  <Text style={styles.recentMeta}>{r.party}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('ai.suggestions')}</Text>
            <View style={styles.suggestionsWrap}>
              {suggestions.map((s) => (
                <Pressable key={s} style={styles.suggestionChip} onPress={() => handleSuggestion(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Search tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.tryDifferent')}</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>Try searching by:</Text>
              <Text style={styles.tipExample}>• Constituency name: "Jubilee Hills"</Text>
              <Text style={styles.tipExample}>• AC number: "141"</Text>
              <Text style={styles.tipExample}>• MLA name: "Revanth Reddy"</Text>
              <Text style={styles.tipExample}>• Party: "BJP" or "INC"</Text>
              <Text style={styles.tipExample}>• Issue: "Water supply"</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },

  resultsList: { flex: 1, paddingHorizontal: 12 },
  resultCount: { fontSize: 11, fontWeight: '600', marginBottom: 8, marginLeft: 4 },

  // Rich card wrapper (MLA / MP results)
  cardWrapper: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardChevron: {
    position: 'absolute',
    top: 16,
    right: 14,
  },

  // Flat row (other result types)
  resultCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, marginBottom: 4, gap: 10, borderWidth: 1 },
  resultIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  resultSub: { fontSize: 11, marginTop: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },

  idleContent: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  clearText: { fontSize: 12, fontWeight: '600' },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  recentText: { flex: 1, fontSize: 14, fontWeight: '600' },
  recentMeta: { fontSize: 12, fontWeight: '600' },

  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  suggestionText: { fontSize: 12, fontWeight: '600' },

  tipCard: { borderRadius: 10, padding: 12, borderWidth: 1 },
  tipText: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  tipExample: { fontSize: 12, lineHeight: 20 },
});
