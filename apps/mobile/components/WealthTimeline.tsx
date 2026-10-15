/**
 * WealthTimeline — Visualizes a candidate's asset growth across elections.
 * Bar chart showing total assets per election year with growth percentage.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CandidateAffidavit, WealthGrowth } from '../lib/affidavitTypes';
import { formatINR } from '../lib/affidavitTypes';

interface WealthTimelineProps {
  affidavits: CandidateAffidavit[];
  growths: WealthGrowth[];
}

export default React.memo(function WealthTimeline({ affidavits, growths }: WealthTimelineProps) {
  const { t } = useTranslation();
  if (affidavits.length === 0) return null;

  const sorted = [...affidavits].sort((a, b) => a.electionYear - b.electionYear);
  const validAssets = sorted.map((a) => a.totalAssets).filter((v): v is number => v != null);
  const maxAssets = validAssets.length > 0 ? Math.max(...validAssets, 1) : 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={16} color="#8B5CF6" />
        <Text style={styles.title}>{t('wealthTimeline.title')}</Text>
      </View>

      <View style={styles.chart}>
        {sorted.map((a, idx) => {
          const isDisclosed = a.totalAssets != null;
          const isGenuineZero = isDisclosed && a.totalAssets === 0;
          const isPositive = isDisclosed && a.totalAssets! > 0;
          const barHeight = isPositive
            ? Math.max((a.totalAssets! / maxAssets) * 120, 8)
            : 2;
          const growth = growths.find((g) => g.toYear === a.electionYear);

          // All 4 core components must be disclosed for stacked breakdown
          const hasCompleteComponents = isPositive &&
            a.selfMovableAssets != null &&
            a.selfImmovableAssets != null &&
            a.spouseMovableAssets != null &&
            a.spouseImmovableAssets != null;

          const selfPortion = hasCompleteComponents
            ? (a.selfMovableAssets! + a.selfImmovableAssets!)
            : 0;
          const spousePortion = hasCompleteComponents
            ? (a.spouseMovableAssets! + a.spouseImmovableAssets!)
            : 0;

          return (
            <View key={a.electionYear} style={styles.barGroup}>
              {/* Growth arrow */}
              {growth && growth.percentGrowth != null && (
                <View style={[styles.growthBadge, growth.percentGrowth > 500 && styles.growthBadgeDanger]}>
                  <Ionicons
                    name={growth.percentGrowth >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={growth.percentGrowth > 500 ? '#EF4444' : '#10B981'}
                  />
                  <Text
                    style={[styles.growthText, growth.percentGrowth > 500 && { color: '#EF4444' }]}
                  >
                    {growth.percentGrowth.toFixed(0)}%
                  </Text>
                </View>
              )}

              {/* Bar */}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight },
                    !isDisclosed && styles.barUndisclosed,
                    isGenuineZero && styles.barZero,
                  ]}
                >
                  {hasCompleteComponents ? (
                    <>
                      <View style={[styles.barFillSelf, { height: (barHeight * selfPortion) / a.totalAssets! }]} />
                      <View style={[styles.barFillSpouse, { height: (barHeight * spousePortion) / a.totalAssets! }]} />
                    </>
                  ) : isPositive ? (
                    <View style={[styles.barFillSolid, { height: barHeight }]} />
                  ) : null}
                </View>
              </View>

              {/* Amount */}
              <Text style={styles.barAmount}>{formatINR(a.totalAssets)}</Text>

              {/* Year */}
              <Text style={styles.barYear}>{a.electionYear}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4F8EF7' }]} />
          <Text style={styles.legendText}>{t('wealthTimeline.self')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.legendText}>{t('wealthTimeline.spouse')}</Text>
        </View>
      </View>

      {/* Summary */}
      {growths.length > 0 && (
        <View style={styles.summary}>
          {sorted[0].totalAssets != null && sorted[sorted.length - 1].totalAssets != null ? (
            <Text style={styles.summaryText}>
              {t('wealthTimeline.totalGrowth')} {formatINR(sorted[0].totalAssets)} ({sorted[0].electionYear}) →{' '}
              {formatINR(sorted[sorted.length - 1].totalAssets)} ({sorted[sorted.length - 1].electionYear})
            </Text>
          ) : (
            <Text style={styles.summaryText}>
              {t('wealthTimeline.totalGrowth')} Growth timeline contains undisclosed observations
            </Text>
          )}
          {growths[growths.length - 1].annualizedGrowth != null && (
            <Text style={styles.summaryAnnualized}>
              {t('wealthTimeline.annualized')} {growths[growths.length - 1].annualizedGrowth!.toFixed(1)}% {t('wealthTimeline.perYear')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#241814',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginBottom: 12,
    minHeight: 160,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
    gap: 2,
  },
  growthBadgeDanger: {
    backgroundColor: '#EF444420',
  },
  growthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  barWrapper: {
    justifyContent: 'flex-end',
    height: 120,
  },
  bar: {
    width: 32,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E8DED1',
  },
  barUndisclosed: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderStyle: 'dashed',
  },
  barZero: {
    backgroundColor: '#94A3B8',
  },
  barFillSolid: {
    backgroundColor: '#4F8EF7',
    width: '100%',
  },
  barFillSelf: {
    backgroundColor: '#4F8EF7',
    width: '100%',
  },
  barFillSpouse: {
    backgroundColor: '#8B5CF6',
    width: '100%',
  },
  barAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5549',
    marginTop: 6,
  },
  barYear: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D5549',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6D5549',
  },
  summary: {
    backgroundColor: '#E8DED1',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#6D5549',
    fontWeight: '600',
  },
  summaryAnnualized: {
    fontSize: 11,
    color: '#6D5549',
    marginTop: 2,
  },
});
