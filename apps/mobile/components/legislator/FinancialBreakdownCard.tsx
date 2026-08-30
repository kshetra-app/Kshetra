import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

interface FinancialRecord {
  electionYear: number;
  selfMovableAssets: number;
  selfImmovableAssets: number;
  spouseMovableAssets: number;
  spouseImmovableAssets: number;
  dependentsAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  selfIncome: number;
  spouseIncome: number;
  wealthGrowth?: { percentGrowth: number; annualizedGrowth: number };
}

interface Props {
  records: FinancialRecord[];
  compact?: boolean;
}

function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val) || typeof val !== 'number') return '—';
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function FinancialBreakdownCard({ records, compact }: Props) {
  const { colors } = useTheme();

  if (records.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No financial data available</Text>
      </View>
    );
  }

  const latest = records[records.length - 1];
  const previous = records.length >= 2 ? records[records.length - 2] : null;
  const totalAssets = latest.totalAssets || 0;
  const isCrorepati = totalAssets >= 1_00_00_000;

  // Compute growth
  let growthPercent: number | null = null;
  if (previous && previous.totalAssets > 0) {
    growthPercent = Math.round(((totalAssets - previous.totalAssets) / previous.totalAssets) * 100);
  }

  // Asset breakdown percentages
  const total = totalAssets || 1;
  const selfMov = latest.selfMovableAssets || 0;
  const selfImm = latest.selfImmovableAssets || 0;
  const spouseMov = latest.spouseMovableAssets || 0;
  const spouseImm = latest.spouseImmovableAssets || 0;
  const dep = latest.dependentsAssets || 0;

  const selfMovPct = Math.round((selfMov / total) * 100);
  const selfImmPct = Math.round((selfImm / total) * 100);
  const spousePct = Math.round(((spouseMov + spouseImm) / total) * 100);
  const depPct = Math.round((dep / total) * 100);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <View style={styles.compactRow}>
          <View style={styles.compactItem}>
            <Text style={[styles.compactValue, { color: colors.text }]}>{formatINR(latest.totalAssets)}</Text>
            <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Assets</Text>
          </View>
          <View style={[styles.compactDivider, { backgroundColor: colors.border }]} />
          <View style={styles.compactItem}>
            <Text style={[styles.compactValue, { color: colors.text }]}>{formatINR(latest.totalLiabilities)}</Text>
            <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Liabilities</Text>
          </View>
          <View style={[styles.compactDivider, { backgroundColor: colors.border }]} />
          <View style={styles.compactItem}>
            <Text style={[styles.compactValue, { color: growthPercent && growthPercent > 500 ? colors.danger : colors.success }]}>
              {growthPercent !== null ? `${growthPercent > 0 ? '+' : ''}${growthPercent}%` : '—'}
            </Text>
            <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Growth</Text>
          </View>
        </View>
        {isCrorepati && (
          <View style={styles.crorepatiTag}>
            <Ionicons name="diamond" size={10} color="#D97706" />
            <Text style={styles.crorepatiText}>Crorepati</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Financial Disclosure</Text>
        </View>
        <Text style={[styles.yearBadge, { backgroundColor: colors.surfaceElevated, color: colors.textSecondary }]}>{latest.electionYear}</Text>
      </View>

      {/* Total Net Worth */}
      <View style={[styles.netWorthRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <View>
          <Text style={[styles.netWorthLabel, { color: colors.textMuted }]}>Net Worth</Text>
          <Text style={[styles.netWorthValue, { color: colors.text }]}>{formatINR(latest.netWorth)}</Text>
        </View>
        {isCrorepati && (
          <View style={styles.crorepatiChip}>
            <Ionicons name="diamond" size={12} color="#D97706" />
            <Text style={styles.crorepatiChipText}>Crorepati</Text>
          </View>
        )}
      </View>

      {/* Asset Breakdown Bars */}
      <View style={styles.breakdownSection}>
        <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>Asset Breakdown</Text>
        <View style={[styles.stackBar, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.stackSegment, { flex: Math.max(1, selfMovPct), backgroundColor: colors.teal }]} />
          <View style={[styles.stackSegment, { flex: Math.max(1, selfImmPct), backgroundColor: colors.success }]} />
          <View style={[styles.stackSegment, { flex: Math.max(1, spousePct), backgroundColor: colors.gold }]} />
          {depPct > 0 && <View style={[styles.stackSegment, { flex: depPct, backgroundColor: colors.primary }]} />}
        </View>
        <View style={styles.legendRow}>
          <LegendItem color={colors.teal} label="Self Movable" value={formatINR(selfMov)} textSecondary={colors.textSecondary} textPrimary={colors.text} />
          <LegendItem color={colors.success} label="Self Immovable" value={formatINR(selfImm)} textSecondary={colors.textSecondary} textPrimary={colors.text} />
        </View>
        <View style={styles.legendRow}>
          <LegendItem color={colors.gold} label="Spouse" value={formatINR(spouseMov + spouseImm)} textSecondary={colors.textSecondary} textPrimary={colors.text} />
          {dep > 0 && (
            <LegendItem color={colors.primary} label="Dependents" value={formatINR(dep)} textSecondary={colors.textSecondary} textPrimary={colors.text} />
          )}
        </View>
      </View>

      {/* Income */}
      {(latest.selfIncome > 0 || latest.spouseIncome > 0) && (
        <View style={[styles.incomeSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>Declared Income (ITR)</Text>
          <View style={styles.incomeRow}>
            <View style={[styles.incomeItem, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.incomeValue, { color: colors.text }]}>{formatINR(latest.selfIncome)}</Text>
              <Text style={[styles.incomeLabel, { color: colors.textMuted }]}>Self</Text>
            </View>
            <View style={[styles.incomeItem, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.incomeValue, { color: colors.text }]}>{formatINR(latest.spouseIncome)}</Text>
              <Text style={[styles.incomeLabel, { color: colors.textMuted }]}>Spouse</Text>
            </View>
          </View>
        </View>
      )}

      {/* Growth across elections */}
      {records.length >= 2 && (
        <View style={[styles.growthSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>Wealth Timeline</Text>
          <View style={styles.timelineRow}>
            {records.map((r, idx) => {
              const maxAsset = Math.max(...records.map(x => x.totalAssets || 0));
              const barHeight = Math.max(8, ((r.totalAssets || 0) / (maxAsset || 1)) * 60);
              return (
                <View key={r.electionYear} style={styles.timelineItem}>
                  <View style={[styles.timelineBar, { height: barHeight, backgroundColor: idx === records.length - 1 ? colors.primary : colors.border }]} />
                  <Text style={[styles.timelineYear, { color: colors.textSecondary }]}>{r.electionYear}</Text>
                  <Text style={[styles.timelineVal, { color: colors.textMuted }]}>{formatINR(r.totalAssets)}</Text>
                </View>
              );
            })}
          </View>
          {growthPercent !== null && (
            <View style={[styles.growthChip, growthPercent > 500 && styles.growthChipDanger]}>
              <Ionicons name={growthPercent > 0 ? 'trending-up' : 'trending-down'} size={12} color={growthPercent > 500 ? colors.danger : colors.success} />
              <Text style={[styles.growthChipText, { color: growthPercent > 500 ? colors.danger : colors.success }]}>
                {growthPercent > 0 ? '+' : ''}{growthPercent}% since {previous?.electionYear}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Liabilities */}
      <View style={[styles.liabilityRow, { borderTopColor: colors.border }]}>
        <Ionicons name="card" size={14} color={colors.danger} />
        <Text style={[styles.liabilityLabel, { color: colors.textSecondary }]}>Total Liabilities:</Text>
        <Text style={[styles.liabilityValue, { color: colors.danger }]}>{formatINR(latest.totalLiabilities)}</Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label, value, textSecondary, textPrimary }: { color: string; label: string; value: string; textSecondary?: string; textPrimary?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, textSecondary ? { color: textSecondary } : undefined]}>{label}</Text>
      <Text style={[styles.legendValue, textPrimary ? { color: textPrimary } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  emptyText: {
    fontSize: ms(13),
    textAlign: 'center',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  yearBadge: {
    fontSize: ms(11),
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  netWorthLabel: {
    fontSize: ms(11),
    fontWeight: '500',
  },
  netWorthValue: {
    fontSize: ms(24),
    fontWeight: '800',
  },
  crorepatiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B40',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crorepatiChipText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#D97706',
  },
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: ms(12),
    fontWeight: '600',
    marginBottom: 8,
  },
  stackBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stackSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: ms(10),
  },
  legendValue: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  incomeSection: {
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  incomeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  incomeItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  incomeValue: {
    fontSize: ms(14),
    fontWeight: '700',
  },
  incomeLabel: {
    fontSize: ms(10),
    marginTop: 2,
  },
  growthSection: {
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 90,
    marginBottom: 8,
  },
  timelineItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  timelineBar: {
    width: 20,
    borderRadius: 4,
  },
  timelineYear: {
    fontSize: ms(9),
    fontWeight: '600',
  },
  timelineVal: {
    fontSize: ms(8),
  },
  growthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthChipDanger: {
    backgroundColor: '#EF444415',
  },
  growthChipText: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  growthChipTextDanger: {},
  liabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  liabilityLabel: {
    fontSize: ms(12),
  },
  liabilityValue: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  // Compact mode
  compactContainer: {
    borderRadius: 12,
    padding: 12,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactValue: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: ms(9),
    marginTop: 2,
  },
  compactDivider: {
    width: 1,
    height: 20,
  },
  crorepatiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    marginTop: 8,
  },
  crorepatiText: {
    fontSize: ms(9),
    fontWeight: '700',
  },
});
