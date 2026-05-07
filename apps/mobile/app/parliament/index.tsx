/**
 * Parliament Screen — Shows Lok Sabha/Rajya Sabha MPs, party strength at centre,
 * and state-wise parliamentary representation.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '@/lib/constants';
import { useResponsive } from '../../lib/responsive';
import {
  NATIONAL_PARTY_STRENGTH,
  STATE_PARLIAMENTARY_SUMMARIES,
  getMPsByState,
  getAllianceStrength,
} from '@/lib/data';
import MPCard from '@/components/MPCard';
import { useActiveStateStore } from '../../stores/activeState';

type TabType = 'overview' | 'lok_sabha' | 'rajya_sabha';

export default function ParliamentScreen() {
  const router = useRouter();
  const selectedState = useActiveStateStore((s) => s.stateCode);
  const [tab, setTab] = useState<TabType>('overview');

  const ndaStrength = useMemo(() => getAllianceStrength('NDA'), []);
  const indiaStrength = useMemo(() => getAllianceStrength('INDIA'), []);
  const othersStrength = useMemo(() => getAllianceStrength('Others'), []);

  const stateSummary = useMemo(
    () => STATE_PARLIAMENTARY_SUMMARIES.find((s) => s.stateCode === selectedState),
    [selectedState],
  );

  const stateMPs = useMemo(() => getMPsByState(selectedState), [selectedState]);
  const lokSabhaMPs = useMemo(() => stateMPs.filter((m) => m.house === 'lok_sabha'), [stateMPs]);
  const rajyaSabhaMPs = useMemo(() => stateMPs.filter((m) => m.house === 'rajya_sabha'), [stateMPs]);

  const topParties = useMemo(
    () => [...NATIONAL_PARTY_STRENGTH].sort((a, b) => b.totalSeats - a.totalSeats).slice(0, 10),
    [],
  );

  const { insets } = useResponsive();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Parliament</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['overview', 'lok_sabha', 'rajya_sabha'] as TabType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? 'Overview' : t === 'lok_sabha' ? 'Lok Sabha' : 'Rajya Sabha'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'overview' && (
          <>
            {/* Alliance Strength */}
            <Text style={styles.sectionTitle}>Alliance Strength at Centre</Text>
            <View style={styles.allianceRow}>
              <View style={[styles.allianceCard, { borderLeftColor: '#F97316' }]}>
                <Text style={styles.allianceName}>NDA</Text>
                <Text style={styles.allianceSeats}>{ndaStrength.total}</Text>
                <Text style={styles.allianceSub}>LS: {ndaStrength.lokSabha} · RS: {ndaStrength.rajyaSabha}</Text>
              </View>
              <View style={[styles.allianceCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.allianceName}>I.N.D.I.A</Text>
                <Text style={styles.allianceSeats}>{indiaStrength.total}</Text>
                <Text style={styles.allianceSub}>LS: {indiaStrength.lokSabha} · RS: {indiaStrength.rajyaSabha}</Text>
              </View>
              <View style={[styles.allianceCard, { borderLeftColor: '#6B7280' }]}>
                <Text style={styles.allianceName}>Others</Text>
                <Text style={styles.allianceSeats}>{othersStrength.total}</Text>
                <Text style={styles.allianceSub}>LS: {othersStrength.lokSabha} · RS: {othersStrength.rajyaSabha}</Text>
              </View>
            </View>

            {/* Top Parties */}
            <Text style={styles.sectionTitle}>Top Parties in Parliament</Text>
            {topParties.map((p) => (
              <View key={p.party} style={styles.partyRow}>
                <View style={[styles.partyDot, { backgroundColor: getPartyColor(p.party) }]} />
                <Text style={styles.partyName}>{p.party}</Text>
                <View style={styles.partyCounts}>
                  <Text style={styles.partyLS}>LS: {p.lokSabhaSeats}</Text>
                  <Text style={styles.partyRS}>RS: {p.rajyaSabhaSeats}</Text>
                  <Text style={styles.partyTotal}>{p.totalSeats}</Text>
                </View>
              </View>
            ))}

            {/* State Summary */}
            {stateSummary && (
              <>
                <Text style={styles.sectionTitle}>{stateSummary.stateName} — Parliament Seats</Text>
                <View style={styles.stateSummaryCard}>
                  <View style={styles.stateSummaryRow}>
                    <View style={styles.stateSumItem}>
                      <Text style={styles.stateSumVal}>{stateSummary.lokSabhaSeats}</Text>
                      <Text style={styles.stateSumLabel}>Lok Sabha</Text>
                    </View>
                    <View style={styles.stateSumItem}>
                      <Text style={styles.stateSumVal}>{stateSummary.rajyaSabhaSeats}</Text>
                      <Text style={styles.stateSumLabel}>Rajya Sabha</Text>
                    </View>
                    <View style={styles.stateSumItem}>
                      <Text style={styles.stateSumVal}>{stateSummary.lokSabhaSeats + stateSummary.rajyaSabhaSeats}</Text>
                      <Text style={styles.stateSumLabel}>Total MPs</Text>
                    </View>
                  </View>
                  {stateSummary.partyWise.map((pw) => (
                    <View key={pw.party} style={styles.statePartyRow}>
                      <View style={[styles.partyDot, { backgroundColor: getPartyColor(pw.party) }]} />
                      <Text style={styles.statePartyName}>{pw.party}</Text>
                      <Text style={styles.statePartyCount}>LS: {pw.lokSabha} · RS: {pw.rajyaSabha}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === 'lok_sabha' && (
          <>
            <Text style={styles.sectionTitle}>
              Lok Sabha MPs — {stateSummary?.stateName ?? selectedState} ({lokSabhaMPs.length})
            </Text>
            {lokSabhaMPs.length === 0 ? (
              <Text style={styles.emptyText}>MP data for this state coming soon.</Text>
            ) : (
              lokSabhaMPs.map((mp) => (
                <View key={mp.id} style={{ marginBottom: 10 }}>
                  <MPCard profile={mp} />
                </View>
              ))
            )}
          </>
        )}

        {tab === 'rajya_sabha' && (
          <>
            <Text style={styles.sectionTitle}>
              Rajya Sabha MPs — {stateSummary?.stateName ?? selectedState} ({rajyaSabhaMPs.length})
            </Text>
            {rajyaSabhaMPs.length === 0 ? (
              <Text style={styles.emptyText}>Rajya Sabha MP data coming soon.</Text>
            ) : (
              rajyaSabhaMPs.map((mp) => (
                <View key={mp.id} style={{ marginBottom: 10 }}>
                  <MPCard profile={mp} />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F2937',
  },
  tabBtnActive: {
    backgroundColor: '#4F8EF7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 10,
  },
  allianceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  allianceCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  allianceName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  allianceSeats: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  allianceSub: {
    fontSize: 10,
    color: '#6B7280',
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  partyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  partyCounts: {
    flexDirection: 'row',
    gap: 10,
  },
  partyLS: {
    fontSize: 11,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  partyRS: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  partyTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 30,
    textAlign: 'right',
  },
  stateSummaryCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
  },
  stateSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  stateSumItem: {
    alignItems: 'center',
  },
  stateSumVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stateSumLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  statePartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F293750',
  },
  statePartyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  statePartyCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
});
