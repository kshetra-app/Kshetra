import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RevenueFlowData } from '../lib/campaignTypes';
import { formatBudget, AD_FORMAT_CONFIG } from '../lib/campaignTypes';

interface RevenueCardProps {
  data: RevenueFlowData;
}

export default function RevenueCard({ data }: RevenueCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revenue Dashboard</Text>

      {/* Key Metrics */}
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Ionicons name="cash" size={20} color="#10B981" />
          <Text style={styles.kpiValue}>{formatBudget(data.totalRevenue)}</Text>
          <Text style={styles.kpiLabel}>Total Revenue</Text>
        </View>
        <View style={styles.kpi}>
          <Ionicons name="trending-up" size={20} color="#3B82F6" />
          <Text style={styles.kpiValue}>{formatBudget(data.mrr)}</Text>
          <Text style={styles.kpiLabel}>MRR</Text>
        </View>
        <View style={styles.kpi}>
          <Ionicons name="rocket" size={20} color="#F59E0B" />
          <Text style={styles.kpiValue}>{formatBudget(data.projectedMRR)}</Text>
          <Text style={styles.kpiLabel}>Projected MRR</Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{data.totalCampaigns}</Text>
          <Text style={styles.summaryLabel}>Campaigns</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{data.totalAds}</Text>
          <Text style={styles.summaryLabel}>Ads</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{data.activePoliticians}</Text>
          <Text style={styles.summaryLabel}>Politicians</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{data.avgROI}%</Text>
          <Text style={styles.summaryLabel}>Avg ROI</Text>
        </View>
      </View>

      {/* Revenue by Format */}
      <Text style={styles.sectionTitle}>Revenue by Format</Text>
      {data.revenueByFormat.slice(0, 4).map((item) => {
        const config = AD_FORMAT_CONFIG[item.format as keyof typeof AD_FORMAT_CONFIG];
        const pct = data.totalRevenue > 0 ? Math.round((item.revenue / data.totalRevenue) * 100) : 0;
        return (
          <View key={item.format} style={styles.formatRow}>
            <Ionicons name={(config?.icon || 'ellipsis-horizontal') as any} size={14} color="#6B7280" />
            <Text style={styles.formatName}>{config?.label || item.format}</Text>
            <View style={styles.formatBar}>
              <View style={[styles.formatBarFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.formatAmount}>{formatBudget(item.revenue)}</Text>
          </View>
        );
      })}

      {/* Monthly Trend */}
      <Text style={styles.sectionTitle}>Monthly Growth</Text>
      <View style={styles.monthRow}>
        {data.revenueByMonth.slice(-4).map((m) => (
          <View key={m.month} style={styles.monthItem}>
            <View style={[styles.monthBar, { height: Math.max(8, (m.revenue / data.projectedMRR) * 60) }]} />
            <Text style={styles.monthLabel}>{m.month.slice(5)}</Text>
            <Text style={styles.monthValue}>{formatBudget(m.revenue)}</Text>
          </View>
        ))}
      </View>

      {/* Unit Economics */}
      <View style={styles.unitEcon}>
        <Text style={styles.sectionTitle}>Unit Economics</Text>
        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Cost/Promoted Post: {formatBudget(data.unitEconomics.costPerPromotedPost)}</Text>
          <Text style={styles.unitLabel}>Avg Politicians/State: {data.unitEconomics.avgPoliticiansPerState}</Text>
        </View>
        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Active States: {data.unitEconomics.statesActive}</Text>
          <Text style={styles.unitLabel}>Monthly/State: {formatBudget(data.unitEconomics.monthlyRevenuePerState)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#E8DED1' },
  title: { fontSize: 18, fontWeight: '900', color: '#241814', marginBottom: 14 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, paddingVertical: 10, backgroundColor: '#F5EFE4', borderRadius: 12 },
  kpi: { alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900', color: '#241814' },
  kpiLabel: { fontSize: 10, color: '#988275', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#241814' },
  summaryLabel: { fontSize: 9, color: '#988275', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6D5549', marginBottom: 8, marginTop: 4 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  formatName: { fontSize: 11, color: '#6D5549', width: 80 },
  formatBar: { flex: 1, height: 6, backgroundColor: '#E8DED1', borderRadius: 3, overflow: 'hidden' },
  formatBarFill: { height: '100%', backgroundColor: '#4F8EF7', borderRadius: 3 },
  formatAmount: { fontSize: 11, fontWeight: '700', color: '#241814', width: 50, textAlign: 'right' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 12, paddingVertical: 8 },
  monthItem: { alignItems: 'center', gap: 4 },
  monthBar: { width: 24, backgroundColor: '#4F8EF740', borderRadius: 4 },
  monthLabel: { fontSize: 10, color: '#988275' },
  monthValue: { fontSize: 10, fontWeight: '700', color: '#241814' },
  unitEcon: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  unitLabel: { fontSize: 11, color: '#988275' },
});
