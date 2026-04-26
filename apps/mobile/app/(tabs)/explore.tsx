import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '@/lib/constants';

import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../../data/seed/telangana-constituencies';

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return TELANGANA_CONSTITUENCIES;
    const q = query.toLowerCase();
    return TELANGANA_CONSTITUENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.winnerName2023.toLowerCase().includes(q) ||
        c.winner2023.toLowerCase().includes(q) ||
        String(c.acNo).includes(q),
    );
  }, [query]);

  const renderItem = ({ item }: { item: ConstituencySeed }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/constituency/${item.acNo}`)}
    >
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
      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>
          {filtered.length} of 119 constituencies
        </Text>
      </View>

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

      <FlashList
        data={filtered}
        renderItem={renderItem}
        estimatedItemSize={88}
        keyExtractor={(item) => String(item.acNo)}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
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
