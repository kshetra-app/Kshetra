import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { fetchStatePodiumSummary, type HistoricalPodiumSummaryRecord } from '../../lib/historicalPodiumStore';
import { getLocalizedStateName } from '../../lib/stateTranslations';
import { useTheme } from '../../lib/theme';

export default function ElectionResultsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const activeState = useActiveStateStore((s) => s.stateCode);
  const [stateCode, setStateCode] = useState(activeState === 'IN' ? '' : activeState);
  const [choosing, setChoosing] = useState(!stateCode);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [result, setResult] = useState<{ state: string; records: HistoricalPodiumSummaryRecord[] }>();
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  const stateName = (code: string) => getLocalizedStateName(code, i18n.language) || STATES[code]?.name || code;

  useFocusEffect(useCallback(() => {
    if (!stateCode) return;
    let current = true;
    setFailed(false);
    fetchStatePodiumSummary(stateCode, { strict: true }).then(
      (records) => { if (current) setResult({ state: stateCode, records }); },
      () => { if (current) setFailed(true); },
    );
    return () => { current = false; };
  }, [stateCode, retry]));

  const currentRecords = result?.state === stateCode ? result.records : null;
  const years = useMemo(() => [...new Set((currentRecords ?? []).flatMap((record) => record.history.map((entry) => entry.year)))].sort((a, b) => b - a), [currentRecords]);
  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (currentRecords ?? []).flatMap(({ acNo, history }) => {
      const matching = year ? history.filter((entry) => entry.year === year) : history.slice(0, 1);
      return matching.filter((entry) => !search || entry.constituencyName.toLowerCase().includes(search))
        .map((entry, index) => ({ resultKey: `${acNo}/${entry.year}/${index}`, acNo, ...entry }));
    });
  }, [currentRecords, query, year]);
  const title = t('more.tiles.electionResults', { defaultValue: 'Election Results' });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title }} />
      <View style={styles.controls}>
        <Pressable accessibilityRole="link" onPress={() => {
          void Linking.openURL('https://results.eci.gov.in/').catch(() => Alert.alert(t('common.error')));
        }}>
          <Text style={[styles.link, { color: colors.primary }]}>{t('electionArchive.officialResults', { defaultValue: 'Election Commission results and counting updates' })} ↗</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setChoosing(!choosing)}>
          <Text style={[styles.link, { color: colors.primary }]}>{stateCode ? stateName(stateCode) : t('electionArchive.selectState', { defaultValue: 'Select a state or union territory' })} ▾</Text>
        </Pressable>
        {!choosing && Boolean(stateCode) && (
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={query} onChangeText={setQuery} placeholderTextColor={colors.textMuted}
            placeholder={t('electionArchive.search', { defaultValue: 'Search assembly constituencies' })} />
        )}
        {!choosing && Boolean(years.length) && <View style={styles.years}>
          {[null, ...years].map((value) => <Pressable key={value ?? 'latest'}
            accessibilityRole="button" accessibilityState={{ selected: value === year }}
            style={[styles.year, { borderColor: value === year ? colors.primary : colors.border }]}
            onPress={() => setYear(value)}>
            <Text style={{ color: value === year ? colors.primary : colors.text }}>
              {value ?? t('electionArchive.latest', { defaultValue: 'Latest recorded' })}
            </Text>
          </Pressable>)}
        </View>}
      </View>
      {choosing ? (
        <FlatList keyboardShouldPersistTaps="handled" data={Object.keys(STATES).filter((code) => code !== 'IN').sort((a, b) => stateName(a).localeCompare(stateName(b)))}
          keyExtractor={(code) => code} renderItem={({ item }) => (
            <Pressable accessibilityRole="button" style={[styles.row, { borderColor: colors.border }]} onPress={() => {
              setQuery(''); setYear(null); setFailed(false); setStateCode(item); setChoosing(false);
            }}>
              <Text style={[styles.link, { color: colors.text }]}>{stateName(item)}</Text>
            </Pressable>
          )} />
      ) : failed ? (
        <Pressable style={styles.controls} onPress={() => { setFailed(false); setRetry((n) => n + 1); }}>
          <Text style={{ color: colors.primary }}>{t('electionArchive.retry', { defaultValue: 'Could not load the archive. Tap to retry.' })}</Text>
        </Pressable>
      ) : currentRecords === null ? <ActivityIndicator color={colors.primary} /> : (
        <FlatList keyboardShouldPersistTaps="handled" data={rows} keyExtractor={(item) => item.resultKey}
          ListEmptyComponent={<Text style={[styles.controls, { color: colors.textSecondary }]}>
            {t('electionArchive.noMatches', { defaultValue: 'No matching assembly results in the archive. Open the Election Commission link above for official coverage.' })}
          </Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" style={[styles.row, { borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/constituency/[id]', params: {
                id: `${stateCode}-AC-${item.acNo}`, view: 'archived-election',
                year: String(item.year), recordedName: item.constituencyName,
                contestType: item.electionType === 'BYPOLL' ? 'by-election' : 'general',
              } })}>
              <Text style={[styles.link, { color: colors.text }]}>{item.constituencyName}</Text>
              <Text style={{ color: colors.textSecondary }}>{item.year} · {item.electionType === 'BYPOLL' ? t('electionArchive.byElection', { defaultValue: 'By-election' }) + ' · ' : ''}{item.winnerName} · {item.winnerParty}</Text>
              {item.margin != null && <Text style={{ color: colors.textSecondary }}>{t('electionArchive.margin', { defaultValue: 'Margin {{votes}} votes', votes: item.margin.toLocaleString(i18n.language) })}</Text>}
            </Pressable>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: { padding: 16, gap: 12 },
  link: { fontWeight: '700', fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12 },
  years: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  year: { borderWidth: 1, borderRadius: 12, padding: 8 },
  row: { padding: 16, gap: 5, borderBottomWidth: StyleSheet.hairlineWidth },
});
