import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';

export default function ConstituencyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const acNo = parseInt(id, 10);
  const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === acNo);

  if (!constituency) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            Constituency #{id} not found
          </Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(constituency.winner2023);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: constituency.name,
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.acNumber}>AC #{constituency.acNo}</Text>
          <Text style={styles.name}>{constituency.name}</Text>
          <Text style={styles.district}>{constituency.district} District</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{constituency.type}</Text>
          </View>
        </View>

        {/* 2023 Result Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2023 Election Result</Text>
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultLeft}>
                <View
                  style={[styles.partyDot, { backgroundColor: partyColor }]}
                />
                <View>
                  <Text style={styles.resultParty}>
                    {constituency.winner2023}
                  </Text>
                  <Text style={styles.resultCandidate}>
                    {constituency.winnerName2023}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRight}>
                <Text style={styles.resultVotes}>
                  {constituency.winnerVotes2023.toLocaleString()}
                </Text>
                <Text style={styles.resultLabel}>votes</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.margin2023.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Margin</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.runnerUp2023}
                </Text>
                <Text style={styles.statLabel}>Runner-up</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(
                    (constituency.margin2023 /
                      constituency.winnerVotes2023) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
                <Text style={styles.statLabel}>Margin %</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Placeholder sections for future */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographics</Text>
          <View style={styles.placeholder}>
            <Ionicons name="people" size={32} color="#4B5563" />
            <Text style={styles.placeholderText}>
              Population, literacy, urban/rural split — coming soon
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historical Trends</Text>
          <View style={styles.placeholder}>
            <Ionicons name="trending-up" size={32} color="#4B5563" />
            <Text style={styles.placeholderText}>
              Election history from 2009–2023 — coming soon
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  acNumber: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  district: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  resultParty: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultCandidate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultVotes: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  placeholder: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
