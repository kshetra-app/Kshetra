import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendAIChat } from '../lib/aiService';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';

interface SearchResult {
  acNo: number;
  name: string;
  reason: string;
}

const EXAMPLE_QUERIES = [
  'Which constituency has the highest literacy rate?',
  'BJP strongholds in Telangana',
  'Constituencies where women MLAs won',
  'Closest margins in 2023',
  'AIMIM seats in Hyderabad',
];

interface AISmartSearchProps {
  onSelect?: (acNo: number) => void;
}

export default function AISmartSearch({ onSelect }: AISmartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
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

    try {
      const constituencies = getUnifiedConstituenciesForState(stateCode);
      const acList = constituencies.slice(0, 50).map(c => `#${c.acNo} ${c.name} (${c.winnerParty}, margin: ${c.margin})`).join('\n');

      const prompt = `Given these constituencies in ${stateCode}:\n${acList}\n\nUser query: "${trimmed}"\n\nReturn the top 5 most relevant constituencies as a JSON array with fields: acNo (number), name (string), reason (brief 10-word explanation). Return ONLY valid JSON array, no other text.`;
      const result = await sendAIChat([{ role: 'user', content: prompt }]);

      // Parse JSON from response
      const text = result.response;
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setResults(parsed.slice(0, 5));
      } else {
        setResults([]);
      }
    } catch {
      setError('Search failed. Check your connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [loading, stateCode]);

  const handleSelect = (acNo: number) => {
    if (onSelect) {
      onSelect(acNo);
    } else {
      router.push(`/constituency/${acNo}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color="#8B5CF6" />
        <Text style={styles.title}>AI Search</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Ask in natural language..."
          placeholderTextColor="#4B5563"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          maxLength={200}
        />
        <Pressable
          style={[styles.searchButton, (query.trim().length < 3 || loading) && styles.searchButtonDisabled]}
          onPress={() => search(query)}
          disabled={query.trim().length < 3 || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="search" size={16} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Example queries */}
      {!hasSearched && (
        <View style={styles.examples}>
          <Text style={styles.examplesLabel}>Try:</Text>
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
          <Text style={styles.loadingText}>AI is searching constituencies...</Text>
        </View>
      )}

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Results */}
      {results.length > 0 && !loading && (
        <View style={styles.resultsList}>
          {results.map((r, i) => (
            <Pressable
              key={`${r.acNo}-${i}`}
              style={styles.resultRow}
              onPress={() => handleSelect(r.acNo)}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>
                  <Text style={styles.acNo}>#{r.acNo}</Text> {r.name}
                </Text>
                <Text style={styles.resultReason}>{r.reason}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#4B5563" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty state */}
      {hasSearched && !loading && results.length === 0 && !error && (
        <Text style={styles.emptyText}>No matching constituencies found. Try a different query.</Text>
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
  resultsList: {
    marginTop: 10,
    gap: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  acNo: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  resultReason: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 10,
    textAlign: 'center',
  },
});
