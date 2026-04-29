import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import type { ConstituencySeed } from '@/lib/data';

interface MapSearchProps {
  constituencies: ConstituencySeed[];
  onSelect: (acNo: number, name: string, district: string) => void;
  onClose: () => void;
}

export default function MapSearch({ constituencies, onSelect, onClose }: MapSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return constituencies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.winnerName2023.toLowerCase().includes(q) ||
          c.winner2023.toLowerCase().includes(q) ||
          String(c.acNo).includes(q),
      )
      .slice(0, 15);
  }, [query, constituencies]);

  const handleSelect = useCallback(
    (item: ConstituencySeed) => {
      Keyboard.dismiss();
      onSelect(item.acNo, item.name, item.district);
    },
    [onSelect],
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search constituency, MLA, district..."
          placeholderTextColor="#4B5563"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </Pressable>
        )}
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>

      {results.length > 0 && (
        <View style={styles.resultsList}>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.acNo)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <View
                  style={[
                    styles.partyDot,
                    { backgroundColor: getPartyColor(item.winner2023) },
                  ]}
                />
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultMeta}>
                    AC #{item.acNo} · {item.district} · {item.winnerName2023} ({item.winner2023})
                  </Text>
                </View>
                <Ionicons name="navigate" size={16} color="#4F8EF7" />
              </Pressable>
            )}
          />
        </View>
      )}

      {query.trim().length > 0 && results.length === 0 && (
        <View style={styles.noResults}>
          <Ionicons name="search" size={24} color="#374151" />
          <Text style={styles.noResultsText}>No constituencies found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    zIndex: 100,
    paddingTop: 56,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    height: 48,
  },
  closeButton: {
    marginLeft: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F8EF7',
  },
  resultsList: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    maxHeight: 400,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
    gap: 10,
  },
  partyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
});
