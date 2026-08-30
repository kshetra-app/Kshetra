import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { StateBudgetSummary } from '../lib/civicMetricsTypes';
import { BUDGET_CATEGORY_CONFIG, getUtilizationColor, formatCrores } from '../lib/civicMetricsTypes';

interface BudgetCardProps {
  summary: StateBudgetSummary;
  onPress?: () => void;
}

export default function BudgetCard({ summary, onPress }: BudgetCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('civicMetrics.stateBudget')} {summary.fiscalYear}</Text>
          <Text style={styles.subtitle}>{summary.stateCode} · {t('civicMetrics.totalBudget')}: {formatCrores(summary.totalBudgetCrores)}</Text>
        </View>
        <View style={[styles.utilizationBadge, { backgroundColor: getUtilizationColor(summary.overallUtilization) + '20' }]}>
          <Text style={[styles.utilizationText, { color: getUtilizationColor(summary.overallUtilization) }]}>{summary.overallUtilization}%</Text>
          <Text style={styles.utilizationLabel}>{t('civicMetrics.utilized')}</Text>
        </View>
      </View>

      {/* Category breakdown */}
      {summary.categoryBreakdown.slice(0, 5).map((cat) => {
        const config = BUDGET_CATEGORY_CONFIG[cat.category as keyof typeof BUDGET_CATEGORY_CONFIG];
        return (
          <View key={cat.category} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Ionicons name={(config?.icon || 'ellipsis-horizontal') as any} size={14} color={config?.color || '#6B7280'} />
              <Text style={styles.categoryName}>{config?.label || cat.category}</Text>
            </View>
            <View style={styles.categoryBar}>
              <View style={[styles.categoryBarFill, { width: `${cat.utilization}%`, backgroundColor: getUtilizationColor(cat.utilization) }]} />
            </View>
            <Text style={styles.categoryAmount}>{formatCrores(cat.allocated)}</Text>
          </View>
        );
      })}

      {/* Fiscal indicators */}
      <View style={styles.fiscalRow}>
        <View style={styles.fiscal}>
          <Text style={styles.fiscalLabel}>{t('civicMetrics.fiscalDeficit')}</Text>
          <Text style={[styles.fiscalValue, { color: '#EF4444' }]}>{formatCrores(summary.fiscalDeficitCrores)}</Text>
        </View>
        <View style={styles.fiscal}>
          <Text style={styles.fiscalLabel}>{t('civicMetrics.revenueDeficit')}</Text>
          <Text style={[styles.fiscalValue, { color: '#F59E0B' }]}>{formatCrores(summary.revenueDeficitCrores)}</Text>
        </View>
        <View style={styles.fiscal}>
          <Text style={styles.fiscalLabel}>{t('civicMetrics.debtGDP')}</Text>
          <Text style={[styles.fiscalValue, { color: summary.debtToGDPRatio > 25 ? '#EF4444' : '#10B981' }]}>{summary.debtToGDPRatio}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#241814' },
  subtitle: { fontSize: 12, color: '#988275', marginTop: 2 },
  utilizationBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  utilizationText: { fontSize: 18, fontWeight: '900' },
  utilizationLabel: { fontSize: 9, color: '#988275' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 110 },
  categoryName: { fontSize: 11, color: '#6D5549', fontWeight: '600' },
  categoryBar: { flex: 1, height: 6, backgroundColor: '#E8DED1', borderRadius: 3, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 3 },
  categoryAmount: { fontSize: 11, color: '#988275', fontWeight: '600', width: 50, textAlign: 'right' },
  fiscalRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  fiscal: { alignItems: 'center' },
  fiscalLabel: { fontSize: 10, color: '#988275', fontWeight: '600' },
  fiscalValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
});
