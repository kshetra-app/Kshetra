import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '@/lib/responsive';

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

function formatINR(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
}

export default function FinancialBreakdownCard({ records, compact }: Props) {
  if (records.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No financial data available</Text>
      </View>
    );
  }

  const latest = records[records.length - 1];
  const previous = records.length >= 2 ? records[records.length - 2] : null;
  const isCrorepati = latest.totalAssets >= 1_00_00_000;

  // Compute growth
  let growthPercent: number | null = null;
  if (previous && previous.totalAssets > 0) {
    growthPercent = Math.round(((latest.totalAssets - previous.totalAssets) / previous.totalAssets) * 100);
  }

  // Asset breakdown percentages
  const total = latest.totalAssets || 1;
  const selfMovPct = Math.round((latest.selfMovableAssets / total) * 100);
  const selfImmPct = Math.round((latest.selfImmovableAssets / total) * 100);
  const spousePct = Math.round(((latest.spouseMovableAssets + latest.spouseImmovableAssets) / total) * 100);
  const depPct = Math.round((latest.dependentsAssets / total) * 100);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <View style={styles.compactItem}>
            <Text style={styles.compactValue}>{formatINR(latest.totalAssets)}</Text>
            <Text style={styles.compactLabel}>Assets</Text>
          </View>
          <View style={styles.compactDivider} />
          <View style={styles.compactItem}>
            <Text style={styles.compactValue}>{formatINR(latest.totalLiabilities)}</Text>
            <Text style={styles.compactLabel}>Liabilities</Text>
          </View>
          <View style={styles.compactDivider} />
          <View style={styles.compactItem}>
            <Text style={[styles.compactValue, { color: growthPercent && growthPercent > 500 ? '#EF4444' : '#10B981' }]}>
              {growthPercent !== null ? `${growthPercent > 0 ? '+' : ''}${growthPercent}%` : '—'}
            </Text>
            <Text style={styles.compactLabel}>Growth</Text>
          </View>
        </View>
        {isCrorepati && (
          <View style={styles.crorepatiTag}>
            <Ionicons name="diamond" size={10} color="#F59E0B" />
            <Text style={styles.crorepatiText}>Crorepati</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet" size={18} color="#4F8EF7" />
          <Text style={styles.title}>Financial Disclosure</Text>
        </View>
        <Text style={styles.yearBadge}>{latest.electionYear}</Text>
      </View>

      {/* Total Net Worth */}
      <View style={styles.netWorthRow}>
        <View>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatINR(latest.netWorth)}</Text>
        </View>
        {isCrorepati && (
          <View style={styles.crorepatiChip}>
            <Ionicons name="diamond" size={12} color="#F59E0B" />
            <Text style={styles.crorepatiChipText}>Crorepati</Text>
          </View>
        )}
      </View>

      {/* Asset Breakdown Bars */}
      <View style={styles.breakdownSection}>
        <Text style={styles.breakdownTitle}>Asset Breakdown</Text>
        <View style={styles.stackBar}>
          <View style={[styles.stackSegment, { flex: selfMovPct, backgroundColor: '#4F8EF7' }]} />
          <View style={[styles.stackSegment, { flex: selfImmPct, backgroundColor: '#10B981' }]} />
          <View style={[styles.stackSegment, { flex: spousePct, backgroundColor: '#F59E0B' }]} />
          {depPct > 0 && <View style={[styles.stackSegment, { flex: depPct, backgroundColor: '#8B5CF6' }]} />}
        </View>
        <View style={styles.legendRow}>
          <LegendItem color="#4F8EF7" label="Self Movable" value={formatINR(latest.selfMovableAssets)} />
          <LegendItem color="#10B981" label="Self Immovable" value={formatINR(latest.selfImmovableAssets)} />
        </View>
        <View style={styles.legendRow}>
          <LegendItem color="#F59E0B" label="Spouse" value={formatINR(latest.spouseMovableAssets + latest.spouseImmovableAssets)} />
          {latest.dependentsAssets > 0 && (
            <LegendItem color="#8B5CF6" label="Dependents" value={formatINR(latest.dependentsAssets)} />
          )}
        </View>
      </View>

      {/* Income */}
      {(latest.selfIncome > 0 || latest.spouseIncome > 0) && (
        <View style={styles.incomeSection}>
          <Text style={styles.breakdownTitle}>Declared Income (ITR)</Text>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeValue}>{formatINR(latest.selfIncome)}</Text>
              <Text style={styles.incomeLabel}>Self</Text>
            </View>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeValue}>{formatINR(latest.spouseIncome)}</Text>
              <Text style={styles.incomeLabel}>Spouse</Text>
            </View>
          </View>
        </View>
      )}

      {/* Growth across elections */}
      {records.length >= 2 && (
        <View style={styles.growthSection}>
          <Text style={styles.breakdownTitle}>Wealth Timeline</Text>
          <View style={styles.timelineRow}>
            {records.map((r, idx) => {
              const maxAsset = Math.max(...records.map(x => x.totalAssets));
              const barHeight = Math.max(8, (r.totalAssets / (maxAsset || 1)) * 60);
              return (
                <View key={r.electionYear} style={styles.timelineItem}>
                  <View style={[styles.timelineBar, { height: barHeight, backgroundColor: idx === records.length - 1 ? '#4F8EF7' : '#374151' }]} />
                  <Text style={styles.timelineYear}>{r.electionYear}</Text>
                  <Text style={styles.timelineVal}>{formatINR(r.totalAssets)}</Text>
                </View>
              );
            })}
          </View>
          {growthPercent !== null && (
            <View style={[styles.growthChip, growthPercent > 500 && styles.growthChipDanger]}>
              <Ionicons name={growthPercent > 0 ? 'trending-up' : 'trending-down'} size={12} color={growthPercent > 500 ? '#EF4444' : '#10B981'} />
              <Text style={[styles.growthChipText, growthPercent > 500 && styles.growthChipTextDanger]}>
                {growthPercent > 0 ? '+' : ''}{growthPercent}% since {previous?.electionYear}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Liabilities */}
      <View style={styles.liabilityRow}>
        <Ionicons name="card" size={14} color="#EF4444" />
        <Text style={styles.liabilityLabel}>Total Liabilities:</Text>
        <Text style={styles.liabilityValue}>{formatINR(latest.totalLiabilities)}</Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  emptyText: {
    fontSize: ms(13),
    color: '#6B7280',
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
    color: '#FFFFFF',
  },
  yearBadge: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#9CA3AF',
    backgroundColor: '#1F2937',
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
    backgroundColor: '#0A0A1A',
    borderRadius: 12,
  },
  netWorthLabel: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '500',
  },
  netWorthValue: {
    fontSize: ms(24),
    fontWeight: '800',
    color: '#FFFFFF',
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
    color: '#F59E0B',
  },
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#9CA3AF',
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
    color: '#6B7280',
  },
  legendValue: {
    fontSize: ms(10),
    fontWeight: '600',
    color: '#D1D5DB',
  },
  incomeSection: {
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  incomeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  incomeItem: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  incomeValue: {
    fontSize: ms(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  incomeLabel: {
    fontSize: ms(10),
    color: '#6B7280',
    marginTop: 2,
  },
  growthSection: {
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
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
    color: '#6B7280',
    fontWeight: '600',
  },
  timelineVal: {
    fontSize: ms(8),
    color: '#9CA3AF',
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
    color: '#10B981',
  },
  growthChipTextDanger: {
    color: '#EF4444',
  },
  liabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  liabilityLabel: {
    fontSize: ms(12),
    color: '#9CA3AF',
  },
  liabilityValue: {
    fontSize: ms(13),
    fontWeight: '700',
    color: '#EF4444',
  },
  // Compact mode
  compactContainer: {
    backgroundColor: '#111827',
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
    color: '#FFFFFF',
  },
  compactLabel: {
    fontSize: ms(9),
    color: '#6B7280',
    marginTop: 2,
  },
  compactDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#374151',
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
    color: '#F59E0B',
  },
});
