/**
 * CandidateXRay — Full transparency screen for a candidate's affidavit data.
 * Shows assets breakdown, criminal cases, education, wealth timeline, red flags.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAffidavitStore } from '../../stores/affidavits';
import WealthTimeline from '../../components/WealthTimeline';
import {
  formatINR,
  EDUCATION_LEVEL_CONFIG,
  RED_FLAG_CONFIG,
  type CandidateAffidavit,
} from '../../lib/affidavitTypes';
import { getPartyColor } from '../../lib/constants';

export default function CandidateXRayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const affidavits = useAffidavitStore((s) => s.affidavits);
  const getRedFlags = useAffidavitStore((s) => s.getRedFlags);
  const getWealthGrowth = useAffidavitStore((s) => s.getWealthGrowth);

  const affidavit = useMemo(() => affidavits.find((a) => a.id === id) ?? null, [affidavits, id]);

  const candidateAffidavits = useMemo(
    () =>
      affidavit
        ? affidavits
            .filter((a) => a.candidateName === affidavit.candidateName)
            .sort((a, b) => a.electionYear - b.electionYear)
        : [],
    [affidavit, affidavits],
  );

  const redFlags = useMemo(() => (affidavit ? getRedFlags(affidavit.id) : []), [affidavit, getRedFlags]);
  const growths = useMemo(
    () => (affidavit ? getWealthGrowth(affidavit.candidateName) : []),
    [affidavit, getWealthGrowth],
  );

  if (!affidavit) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Candidate X-Ray' }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Affidavit not found</Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(affidavit.party);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Candidate X-Ray',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.partyStrip, { backgroundColor: partyColor }]} />
          <Text style={styles.candidateName}>{affidavit.candidateName}</Text>
          <View style={styles.heroMeta}>
            <View style={[styles.partyBadge, { backgroundColor: partyColor + '30' }]}>
              <Text style={[styles.partyText, { color: partyColor }]}>{affidavit.party}</Text>
            </View>
            <Text style={styles.metaText}>
              AC #{affidavit.acNo} · {affidavit.constituencyName}
            </Text>
          </View>
          <View style={styles.heroDetails}>
            <Text style={styles.detailItem}>
              <Ionicons name="school" size={13} color="#9CA3AF" />{' '}
              {EDUCATION_LEVEL_CONFIG[affidavit.education].label}
            </Text>
            <Text style={styles.detailItem}>
              <Ionicons name="briefcase" size={13} color="#9CA3AF" />{' '}
              {affidavit.profession}
            </Text>
            <Text style={styles.detailItem}>
              <Ionicons name="person" size={13} color="#9CA3AF" />{' '}
              Age {affidavit.age}
            </Text>
          </View>
        </View>

        {/* Red Flags Banner */}
        {redFlags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={18} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                Red Flags ({redFlags.length})
              </Text>
            </View>
            {redFlags.map((flag, idx) => (
              <View
                key={idx}
                style={[
                  styles.redFlagCard,
                  { borderLeftColor: RED_FLAG_CONFIG[flag.type].color },
                ]}
              >
                <Ionicons
                  name={RED_FLAG_CONFIG[flag.type].icon as any}
                  size={16}
                  color={RED_FLAG_CONFIG[flag.type].color}
                />
                <View style={styles.redFlagContent}>
                  <Text style={styles.redFlagLabel}>{RED_FLAG_CONFIG[flag.type].label}</Text>
                  <Text style={styles.redFlagDesc}>{flag.description}</Text>
                </View>
                <View style={[styles.severityBadge, flag.severity === 'critical' && styles.severityCritical]}>
                  <Text style={[styles.severityText, flag.severity === 'critical' && { color: '#EF4444' }]}>
                    {flag.severity}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Assets Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Assets Breakdown</Text>
          </View>
          <View style={styles.assetsCard}>
            <View style={styles.assetRow}>
              <Text style={styles.assetLabel}>Self — Movable</Text>
              <Text style={styles.assetValue}>{formatINR(affidavit.selfMovableAssets)}</Text>
            </View>
            <View style={styles.assetRow}>
              <Text style={styles.assetLabel}>Self — Immovable</Text>
              <Text style={styles.assetValue}>{formatINR(affidavit.selfImmovableAssets)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.assetRow}>
              <Text style={styles.assetLabel}>Spouse — Movable</Text>
              <Text style={styles.assetValue}>{formatINR(affidavit.spouseMovableAssets)}</Text>
            </View>
            <View style={styles.assetRow}>
              <Text style={styles.assetLabel}>Spouse — Immovable</Text>
              <Text style={styles.assetValue}>{formatINR(affidavit.spouseImmovableAssets)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.assetRow}>
              <Text style={[styles.assetLabel, styles.totalLabel]}>Total Assets</Text>
              <Text style={[styles.assetValue, styles.totalValue]}>{formatINR(affidavit.totalAssets)}</Text>
            </View>
            <View style={styles.assetRow}>
              <Text style={styles.assetLabel}>Total Liabilities</Text>
              <Text style={[styles.assetValue, { color: '#F59E0B' }]}>{formatINR(affidavit.totalLiabilities)}</Text>
            </View>
            <View style={styles.assetRow}>
              <Text style={[styles.assetLabel, styles.totalLabel]}>Net Worth</Text>
              <Text style={[styles.assetValue, styles.totalValue]}>
                {formatINR(affidavit.totalAssets - affidavit.totalLiabilities)}
              </Text>
            </View>
          </View>
        </View>

        {/* Income */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Declared Income</Text>
          </View>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeValue}>{formatINR(affidavit.selfIncome)}</Text>
              <Text style={styles.incomeLabel}>Self (Annual)</Text>
            </View>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeValue}>{formatINR(affidavit.spouseIncome)}</Text>
              <Text style={styles.incomeLabel}>Spouse (Annual)</Text>
            </View>
            <View style={styles.incomeItem}>
              <Text style={[styles.incomeValue, { color: '#10B981' }]}>
                {formatINR(affidavit.selfIncome + affidavit.spouseIncome)}
              </Text>
              <Text style={styles.incomeLabel}>Total Annual</Text>
            </View>
          </View>
        </View>

        {/* Criminal Record */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name={affidavit.criminalCases > 0 ? 'alert-circle' : 'checkmark-circle'}
              size={18}
              color={affidavit.criminalCases > 0 ? '#EF4444' : '#10B981'}
            />
            <Text style={styles.sectionTitle}>Criminal Record</Text>
          </View>

          <View style={styles.criminalSummary}>
            <View style={[styles.criminalStat, affidavit.criminalCases > 0 && styles.criminalStatDanger]}>
              <Text style={styles.criminalStatValue}>{affidavit.criminalCases}</Text>
              <Text style={styles.criminalStatLabel}>Total Cases</Text>
            </View>
            <View style={[styles.criminalStat, affidavit.seriousCriminalCases > 0 && styles.criminalStatCritical]}>
              <Text style={styles.criminalStatValue}>{affidavit.seriousCriminalCases}</Text>
              <Text style={styles.criminalStatLabel}>Serious (5yr+)</Text>
            </View>
          </View>

          {affidavit.caseDetails && affidavit.caseDetails.length > 0 && (
            <View style={styles.caseList}>
              {affidavit.caseDetails.map((c, idx) => (
                <View key={idx} style={styles.caseCard}>
                  <View style={styles.caseHeader}>
                    <Text style={styles.caseNo}>{c.caseNo}</Text>
                    <View style={[styles.caseBadge, c.status === 'convicted' && styles.caseBadgeConvicted]}>
                      <Text style={styles.caseBadgeText}>{c.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.caseCourt}>{c.court}</Text>
                  <Text style={styles.caseDesc}>{c.description}</Text>
                  <View style={styles.ipcRow}>
                    {c.ipcSections.map((s) => (
                      <View key={s} style={styles.ipcBadge}>
                        <Text style={styles.ipcText}>IPC {s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {affidavit.criminalCases === 0 && (
            <View style={styles.cleanRecord}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.cleanRecordText}>No criminal cases declared</Text>
            </View>
          )}
        </View>

        {/* Wealth Timeline */}
        {candidateAffidavits.length > 1 && (
          <View style={styles.section}>
            <WealthTimeline affidavits={candidateAffidavits} growths={growths} />
          </View>
        )}

        {/* Source */}
        {affidavit.sourceUrl && (
          <Pressable
            style={styles.sourceButton}
            onPress={() => Linking.openURL(affidavit.sourceUrl!)}
          >
            <Ionicons name="open-outline" size={16} color="#4F8EF7" />
            <Text style={styles.sourceText}>View Original Affidavit on MyNeta</Text>
          </Pressable>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Data sourced from candidate self-declarations filed with the Election Commission of India.
          Figures are approximations from MyNeta/ADR summaries. Always verify with official records.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#EF4444', marginTop: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  partyStrip: { height: 4, borderRadius: 2, marginBottom: 12 },
  candidateName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  partyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  partyText: { fontSize: 13, fontWeight: '700' },
  metaText: { fontSize: 13, color: '#9CA3AF' },
  heroDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  detailItem: { fontSize: 13, color: '#9CA3AF' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  // Red flags
  redFlagCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    gap: 10,
    marginBottom: 8,
  },
  redFlagContent: { flex: 1 },
  redFlagLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  redFlagDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: 16 },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F59E0B20',
  },
  severityCritical: { backgroundColor: '#EF444420' },
  severityText: { fontSize: 10, fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase' },
  // Assets
  assetsCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16 },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  assetLabel: { fontSize: 13, color: '#9CA3AF' },
  assetValue: { fontSize: 14, fontWeight: '700', color: '#D1D5DB' },
  totalLabel: { fontWeight: '700', color: '#FFFFFF' },
  totalValue: { color: '#10B981', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#1F2937', marginVertical: 4 },
  // Income
  incomeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  incomeItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 3,
  },
  incomeValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  incomeLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 4 },
  // Criminal
  criminalSummary: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  criminalStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
  },
  criminalStatDanger: { borderWidth: 1, borderColor: '#EF444440' },
  criminalStatCritical: { borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#EF444410' },
  criminalStatValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  criminalStatLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 4 },
  caseList: { gap: 8 },
  caseCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  caseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseNo: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  caseBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  caseBadgeConvicted: { backgroundColor: '#EF444420' },
  caseBadgeText: { fontSize: 10, fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase' },
  caseCourt: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  caseDesc: { fontSize: 12, color: '#D1D5DB', marginTop: 4, lineHeight: 18 },
  ipcRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  ipcBadge: { backgroundColor: '#EF444415', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ipcText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  cleanRecord: { alignItems: 'center', paddingVertical: 20 },
  cleanRecordText: { fontSize: 14, color: '#10B981', fontWeight: '700', marginTop: 8 },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F8EF720',
    gap: 8,
  },
  sourceText: { fontSize: 14, fontWeight: '700', color: '#4F8EF7' },
  disclaimer: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    lineHeight: 16,
  },
});
