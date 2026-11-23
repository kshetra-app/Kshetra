import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { searchParties, type RegistryParty } from '../lib/partyRegistry';
import { useTheme } from '../lib/theme';

interface Props {
  onSelect: (party: RegistryParty) => void;
  selectedId?: string;
}

export default function PartyDirectory({ onSelect, selectedId }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [parties, setParties] = useState<RegistryParty[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const language = i18n.language?.split('-')[0] || 'en';

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(false);
    if (offset === 0) {
      setParties([]);
      setNextOffset(null);
    }
    const debounce = setTimeout(() => void searchParties(query.trim(), language, offset)
      .then((result) => {
        if (!current) return;
        setParties((old) => offset === 0 ? result.parties : [...old, ...result.parties]);
        setNextOffset(result.nextOffset);
      })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); }), offset === 0 ? 220 : 0);
    return () => {
      current = false;
      clearTimeout(debounce);
    };
  }, [query, language, offset, retry]);

  return (
    <View style={[styles.directory, { backgroundColor: colors.background }]}>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} accessible={false} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t('partyRegistry.search', { defaultValue: 'Search by name or abbreviation' })}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('partyRegistry.search', { defaultValue: 'Search by name or abbreviation' })}
          value={query}
          onChangeText={(value) => {
            setParties([]);
            setNextOffset(null);
            setLoading(true);
            setOffset(0);
            setQuery(value);
          }}
          maxLength={100}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={parties}
        keyExtractor={(party) => party.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.short_name === (item.local_name ?? item.name)
              ? item.short_name
              : [item.local_name ?? item.name, item.short_name].join(', ')}
            accessibilityState={selectedId ? { selected: selectedId === item.id } : undefined}
            onPress={() => onSelect(item)}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.labels}>
              <Text style={[styles.name, { color: colors.text }]}>{item.local_name ?? item.name}</Text>
              {item.short_name !== (item.local_name ?? item.name) && (
                <Text style={{ color: colors.textMuted }}>{item.short_name}</Text>
              )}
            </View>
            <Ionicons
              name={selectedId === item.id ? 'checkmark-circle' : 'chevron-forward'}
              color={colors.primary}
              size={20}
              accessible={false}
            />
          </Pressable>
        )}
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.footer} color={colors.primary} /> :
          error ? <Pressable style={styles.footer} accessibilityRole="button" onPress={() => setRetry(retry + 1)}>
            <Text style={{ color: colors.primary }}>{t('partyRegistry.retrySearch', { defaultValue: 'Could not load parties. Tap to retry.' })}</Text>
          </Pressable> :
          nextOffset !== null ? <Pressable style={styles.footer} accessibilityRole="button" onPress={() => setOffset(nextOffset)}>
            <Text style={{ color: colors.primary }}>{t('partyRegistry.loadMore', { defaultValue: 'Load more parties' })}</Text>
          </Pressable> :
          !parties.length ? <Text style={[styles.footer, { color: colors.textMuted }]}>{t('partyRegistry.noResults', { defaultValue: 'No parties match your search.' })}</Text> :
          null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  directory: { flex: 1, paddingHorizontal: 16 },
  search: {
    minHeight: 50, borderWidth: 1, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, gap: 8, marginVertical: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  list: { gap: 8, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, gap: 12, minHeight: 58 },
  labels: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '700' },
  footer: { paddingVertical: 16, alignItems: 'center', textAlign: 'center' },
});
