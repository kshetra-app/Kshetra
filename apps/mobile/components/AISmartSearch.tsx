import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendAIChat } from '../lib/aiService';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '../lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';
import { useTheme } from '../lib/theme';

function getExampleQueries(stateCode: string): string[] {
  switch (stateCode) {
    case 'TS':
      return [
        'Who is the current CM of Telangana?',
        'BJP strongholds in Telangana',
        'Which party won the most seats in 2023?',
        'Closest margins in the last election',
        'AIMIM seats in Hyderabad',
      ];
    case 'AP':
      return [
        'Who is the current CM of Andhra Pradesh?',
        'TDP vs YSRCP seat tally in 2024',
        'Closest election margins in AP',
        'Jana Sena key winning constituencies',
      ];
    case 'KA':
      return [
        'Current government and CM in Karnataka',
        'INC vs BJP seats in Karnataka 2023',
        'High margin victories in Bengaluru',
        'Key coastal Karnataka constituencies',
      ];
    case 'MH':
      return [
        'Mahayuti vs MVA seat breakdown',
        'Top battleground seats in Mumbai',
        'Narrowest margins in Maharashtra',
      ];
    default:
      return [
        'Who is the current Chief Minister?',
        `Key strongholds in ${stateCode}`,
        'Which party won the most seats?',
        'Closest margins in the last election',
      ];
  }
}

interface AISmartSearchProps {
  onSelect?: (acNo: number) => void;
}

export default function AISmartSearch({ onSelect }: AISmartSearchProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const stateCode = useActiveStateStore((s) => s.stateCode);

  // Reset state when user switches active state
  React.useEffect(() => {
    setQuery('');
    setAiResponse('');
    setError('');
    setHasSearched(false);
  }, [stateCode]);

  const exampleQueries = useMemo(() => getExampleQueries(stateCode), [stateCode]);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3 || loading) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setAiResponse('');

    try {
      const result = await sendAIChat(
        [{ role: 'user', content: trimmed }],
        { stateCode },
      );

      setAiResponse(result.response);
    } catch {
      setError(t('ai.searchFailed'));
    } finally {
      setLoading(false);
    }
  }, [loading, stateCode, t]);

  // Extract mentioned constituencies in the AI response for quick jump
  const mentionedConstituencies = useMemo(() => {
    if (!aiResponse || !onSelect || stateCode === 'IN') return [];
    try {
      const all = getUnifiedConstituenciesForState(stateCode);
      const textLower = aiResponse.toLowerCase();
      const matched: UnifiedConstituency[] = [];

      for (const c of all) {
        if (
          (c.name.length >= 4 && textLower.includes(c.name.toLowerCase())) ||
          textLower.includes(`ac #${c.acNo}`) ||
          textLower.includes(`ac#${c.acNo}`) ||
          textLower.includes(`#${c.acNo}`)
        ) {
          matched.push(c);
        }
        if (matched.length >= 4) break;
      }
      return matched;
    } catch {
      return [];
    }
  }, [aiResponse, onSelect, stateCode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text }]}>{t('ai.smartSearch')}</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={t('ai.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          maxLength={300}
        />
        <Pressable
          style={[
            styles.searchButton,
            { backgroundColor: colors.gold },
            (query.trim().length < 3 || loading) && styles.searchButtonDisabled,
          ]}
          onPress={() => search(query)}
          disabled={query.trim().length < 3 || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Example queries */}
      {!hasSearched && (
        <View style={styles.examples}>
          <Text style={[styles.examplesLabel, { color: colors.textMuted }]}>{t('ai.tryAsking')}:</Text>
          {exampleQueries.map((eq, i) => (
            <Pressable
              key={i}
              style={[
                styles.exampleChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                setQuery(eq);
                search(eq);
              }}
            >
              <Ionicons name="chatbubble-outline" size={11} color={colors.gold} />
              <Text style={[styles.exampleText, { color: colors.textSecondary }]} numberOfLines={1}>
                {eq}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('ai.thinkingSearch')}</Text>
        </View>
      )}

      {/* Error */}
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

      {/* AI Response */}
      {aiResponse.length > 0 && !loading && (
        <View style={[styles.responseContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ScrollView style={styles.responseScroll} nestedScrollEnabled>
            <Text style={[styles.responseText, { color: colors.text }]}>{aiResponse}</Text>
          </ScrollView>

          {/* Quick jumps to mentioned constituencies */}
          {mentionedConstituencies.length > 0 && onSelect && (
            <View style={[styles.mentionedContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.mentionedLabel, { color: colors.textMuted }]}>
                {t('explore.jumpTo', { defaultValue: 'Jump to' })}:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mentionedRow}>
                {mentionedConstituencies.map((c) => (
                  <Pressable
                    key={c.acNo}
                    style={[
                      styles.mentionedChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.goldBorder || colors.border,
                      },
                    ]}
                    onPress={() => onSelect(c.acNo)}
                  >
                    <Text style={[styles.mentionedChipText, { color: colors.text }]}>
                      #{c.acNo} {c.name}
                    </Text>
                    <Ionicons name="arrow-forward" size={10} color={colors.gold} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Empty state */}
      {hasSearched && !loading && !aiResponse && !error && (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('ai.noResponse')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.4,
  },
  examples: {
    marginTop: 10,
    gap: 5,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 12,
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  responseContainer: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  responseScroll: {
    maxHeight: 220,
  },
  responseText: {
    fontSize: 13,
    lineHeight: 20,
  },
  mentionedContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  mentionedLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  mentionedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mentionedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  mentionedChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});
