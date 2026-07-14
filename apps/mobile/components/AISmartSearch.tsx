import { useState, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { sendAIChat } from '../lib/aiService';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';

const EXAMPLE_QUERIES = [
  'Who is the current CM of Telangana?',
  'BJP strongholds in Telangana',
  'Which party won the most seats in 2023?',
  'Closest margins in the last election',
  'AIMIM seats in Hyderabad',
];

interface AISmartSearchProps {
  onSelect?: (acNo: number) => void;
}

export default function AISmartSearch({ onSelect }: AISmartSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const stateCode = useActiveStateStore((s) => s.stateCode);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3 || loading) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setAiResponse('');

    try {
      const constituencies = getUnifiedConstituenciesForState(stateCode);
      const topConstituencies = constituencies.slice(0, 30).map(c =>
        `#${c.acNo} ${c.name}: ${c.winnerName} (${c.winnerParty}), margin ${c.margin}`
      ).join('\n');

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
  }, [loading, stateCode]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color="#8B5CF6" />
        <Text style={styles.title}>{t('ai.smartSearch')}</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('ai.searchPlaceholder')}
          placeholderTextColor="#4B5563"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          maxLength={300}
        />
        <Pressable
          style={[styles.searchButton, (query.trim().length < 3 || loading) && styles.searchButtonDisabled]}
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
          <Text style={styles.examplesLabel}>{t('ai.tryAsking')}:</Text>
          {EXAMPLE_QUERIES.map((eq, i) => (
            <Pressable
              key={i}
              style={styles.exampleChip}
              onPress={() => { setQuery(eq); search(eq); }}
            >
              <Ionicons name="chatbubble-outline" size={11} color="#8B5CF6" />
              <Text style={styles.exampleText} numberOfLines={1}>{eq}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.loadingText}>{t('ai.thinkingSearch')}</Text>
        </View>
      )}

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* AI Response */}
      {aiResponse.length > 0 && !loading && (
        <ScrollView style={styles.responseContainer} nestedScrollEnabled>
          <Text style={styles.responseText}>{aiResponse}</Text>
        </ScrollView>
      )}

      {/* Empty state */}
      {hasSearched && !loading && !aiResponse && !error && (
        <Text style={styles.emptyText}>{t('ai.noResponse')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B5CF620',
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
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.4,
  },
  examples: {
    marginTop: 10,
    gap: 4,
  },
  examplesLabel: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  exampleText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    color: '#6B7280',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  responseContainer: {
    marginTop: 12,
    maxHeight: 250,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
  },
  responseText: {
    fontSize: 13,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 10,
    textAlign: 'center',
  },
});
