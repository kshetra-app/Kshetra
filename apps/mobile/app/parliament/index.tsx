/**
 * Parliament Screen — Shows Lok Sabha/Rajya Sabha MPs, party strength at centre,
 * and state-wise parliamentary representation.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const router = useRouter();
  const selectedState = useActiveStateStore((s) => s.stateCode);
  const [tab, setTab] = useState<TabType>('overview');

  // getAllianceStrength() returns { NDA: n, INDIA: n, Others: n }
  const allianceMap = useMemo(() => getAllianceStrength(), []);
  const ndaStrength   = { total: allianceMap['NDA'] ?? 0, lokSabha: allianceMap['NDA'] ?? 0, rajyaSabha: 0 };
  const indiaStrength = { total: allianceMap['INDIA'] ?? 0, lokSabha: allianceMap['INDIA'] ?? 0, rajyaSabha: 0 };
  const othersStrength = { total: allianceMap['Others'] ?? 0, lokSabha: allianceMap['Others'] ?? 0, rajyaSabha: 0 };

  // STATE_PARLIAMENTARY_SUMMARIES is a Record<stateCode, {ls, rs, total}>
  const stateSummary = useMemo(() => {
    const rec = STATE_PARLIAMENTARY_SUMMARIES[selectedState];
    if (!rec) return null;
    return {
      stateCode: selectedState,
      stateName: selectedState,
      lokSabhaSeats: rec.ls,
      rajyaSabhaSeats: rec.rs,
      partyWise: [] as { party: string; lokSabha: number; rajyaSabha: number }[],
    };
  }, [selectedState]);

  const stateMPs = useMemo(() => getMPsByState(selectedState), [selectedState]);
  const lokSabhaMPs = useMemo(() => stateMPs.filter((m) => m.house === 'lok_sabha'), [stateMPs]);
  const rajyaSabhaMPs = useMemo(() => stateMPs.filter((m) => m.house === 'rajya_sabha'), [stateMPs]);

  // NATIONAL_PARTY_STRENGTH is Record<party, seats>; convert to sorted array
  const topParties = useMemo(
    () => Object.entries(NATIONAL_PARTY_STRENGTH)
      .map(([party, seats]) => ({ party, lokSabhaSeats: seats, rajyaSabhaSeats: 0, totalSeats: seats }))
      .sort((a, b) => b.totalSeats - a.totalSeats)
      .slice(0, 10),
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
        <Text style={styles.headerTitle}>{t('parliament.screenTitle')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['overview', 'lok_sabha', 'rajya_sabha'] as TabType[]).map((tabKey) => (
          <Pressable
            key={tabKey}
            style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'overview' ? t('parliament.tabOverview') : tabKey === 'lok_sabha' ? t('parliament.tabLokSabha') : t('parliament.tabRajyaSabha')}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
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
