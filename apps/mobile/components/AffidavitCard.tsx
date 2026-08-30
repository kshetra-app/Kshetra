/**
 * AffidavitCard — Compact affidavit summary for constituency detail screen.
 * Shows key transparency metrics: assets, criminal cases, education, red flags.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAffidavitStore } from '../stores/affidavits';
import {
  formatINR,
  EDUCATION_LEVEL_CONFIG,
  RED_FLAG_CONFIG,
  type CandidateAffidavit,
  type AffidavitRedFlag,
} from '../lib/affidavitTypes';

interface AffidavitCardProps {
  stateCode: string;
  acNo: number;
  electionYear: number;
}

export default React.memo(function AffidavitCard({ stateCode, acNo, electionYear }: AffidavitCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const getWinnerAffidavit = useAffidavitStore((s) => s.getWinnerAffidavit);
  const getRedFlags = useAffidavitStore((s) => s.getRedFlags);
  const getWealthGrowth = useAffidavitStore((s) => s.getWealthGrowth);

  const affidavit = useMemo(
    () => getWinnerAffidavit(stateCode, acNo, electionYear),
    [stateCode, acNo, electionYear, getWinnerAffidavit],
  );

  const redFlags = useMemo(
    () => (affidavit ? getRedFlags(affidavit.id) : []),
    [affidavit, getRedFlags],
  );

  const wealthGrowth = useMemo(
    () => (affidavit ? getWealthGrowth(affidavit.candidateName) : []),
    [affidavit, getWealthGrowth],
  );

  if (!affidavit) return null;

  const latestGrowth = wealthGrowth.length > 0 ? wealthGrowth[wealthGrowth.length - 1] : null;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/legislator/MLA_${stateCode}_${electionYear}_${affidavit.constituencyName || 'AC'}_${acNo}` as any)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={18} color="#4F8EF7" />
          <Text style={styles.title}>{t('affidavit.title')}</Text>
        </View>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{affidavit.electionYear}</Text>
        </View>
      </View>

      {/* Candidate info */}
      <Text style={styles.candidateName}>{affidavit.candidateName}</Text>
      <Text style={styles.candidateMeta}>{affidavit.party} · {EDUCATION_LEVEL_CONFIG[affidavit.education].label} · {t('affidavit.age')} {affidavit.age}</Text>

      {/* Key metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Ionicons name="wallet" size={16} color="#10B981" />
          <Text style={styles.metricValue}>{formatINR(affidavit.totalAssets)}</Text>
          <Text style={styles.metricLabel}>{t('affidavit.totalAssets')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="card" size={16} color="#F59E0B" />
          <Text style={styles.metricValue}>{formatINR(affidavit.totalLiabilities)}</Text>
          <Text style={styles.metricLabel}>{t('affidavit.liabilities')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons
            name={affidavit.criminalCases > 0 ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={affidavit.criminalCases > 0 ? '#EF4444' : '#10B981'}
          />
          <Text style={[styles.metricValue, affidavit.criminalCases > 0 && { color: '#EF4444' }]}>
            {affidavit.criminalCases}
          </Text>
          <Text style={styles.metricLabel}>{t('affidavit.cases')}</Text>
        </View>
        {latestGrowth && (
          <View style={styles.metric}>
            <Ionicons name="trending-up" size={16} color="#8B5CF6" />
            <Text style={styles.metricValue}>{latestGrowth.percentGrowth.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>{t('affidavit.growth')}</Text>
          </View>
        )}
      </View>

      {/* Red flags */}
      {redFlags.length > 0 && (
        <View style={styles.redFlagSection}>
          {redFlags.map((flag, idx) => (
            <View key={idx} style={[styles.redFlag, { borderLeftColor: RED_FLAG_CONFIG[flag.type].color }]}>
              <Ionicons
                name={RED_FLAG_CONFIG[flag.type].icon as any}
                size={14}
                color={RED_FLAG_CONFIG[flag.type].color}
              />
              <Text style={styles.redFlagText} numberOfLines={2}>{flag.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* View full X-ray link */}
      <View style={styles.footer}>
        <Text style={styles.footerLink}>{t('affidavit.viewCompleteProfile')}</Text>
        <Ionicons name="chevron-forward" size={14} color="#4F8EF7" />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#241814',
  },
  yearBadge: {
    backgroundColor: '#4F8EF720',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  candidateName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#241814',
    marginBottom: 2,
  },
  candidateMeta: {
    fontSize: 12,
    color: '#6D5549',
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#241814',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#988275',
    fontWeight: '600',
    marginTop: 2,
  },
  redFlagSection: {
    marginTop: 4,
    gap: 6,
  },
  redFlag: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1F293780',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    gap: 8,
  },
  redFlagText: {
    fontSize: 11,
    color: '#6D5549',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8DED1',
    gap: 4,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F8EF7',
  },
});
