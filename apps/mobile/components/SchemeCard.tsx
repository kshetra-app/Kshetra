import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { GovernmentScheme } from '../lib/civicMetricsTypes';
import { SCHEME_CATEGORY_CONFIG, formatCrores } from '../lib/civicMetricsTypes';

interface SchemeCardProps {
  scheme: GovernmentScheme;
  onPress?: () => void;
}

export default function SchemeCard({ scheme, onPress }: SchemeCardProps) {
  const { t } = useTranslation();
  const catConfig = SCHEME_CATEGORY_CONFIG[scheme.category];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.catBadge, { backgroundColor: catConfig.color + '15' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: scheme.level === 'central' ? '#3B82F620' : '#F59E0B20' }]}>
          <Text style={[styles.levelText, { color: scheme.level === 'central' ? '#3B82F6' : '#F59E0B' }]}>{scheme.level === 'central' ? t('civicMetrics.centralScheme') : scheme.stateCode || t('civicMetrics.stateScheme')}</Text>
        </View>
      </View>

      <Text style={styles.name}>{scheme.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{scheme.description}</Text>

      {/* Coverage */}
      <View style={styles.coverageSection}>
        <View style={styles.coverageHeader}>
          <Text style={styles.coverageLabel}>{t('civicMetrics.coverage')}</Text>
          <Text style={[styles.coveragePct, { color: scheme.coveragePercent >= 80 ? '#10B981' : '#F59E0B' }]}>{scheme.coveragePercent}%</Text>
        </View>
        <View style={styles.coverageBar}>
          <View style={[styles.coverageBarFill, { width: `${scheme.coveragePercent}%`, backgroundColor: scheme.coveragePercent >= 80 ? '#10B981' : '#F59E0B' }]} />
        </View>
        <Text style={styles.coverageDetail}>
          {(scheme.beneficiariesActual / 1000000).toFixed(1)}M / {(scheme.beneficiariesTarget / 1000000).toFixed(1)}M {t('civicMetrics.beneficiaries')}
        </Text>
      </View>

      {/* Budget + Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="wallet" size={12} color="#6B7280" />
          <Text style={styles.metaText}>{t('civicMetrics.tabs.budget')}: {formatCrores(scheme.budgetCrores)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="business" size={12} color="#6B7280" />
          <Text style={styles.metaText}>{scheme.ministry}</Text>
        </View>
      </View>

      {scheme.applicationUrl && (
        <View style={styles.applyRow}>
          <Ionicons name="open" size={12} color="#4F8EF7" />
          <Text style={styles.applyText}>{t('civicMetrics.applyOnline')}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catLabel: { fontSize: 10, fontWeight: '700' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  description: { fontSize: 13, color: '#9CA3AF', lineHeight: 18, marginBottom: 10 },
  coverageSection: { marginBottom: 10 },
  coverageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  coverageLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  coveragePct: { fontSize: 14, fontWeight: '800' },
  coverageBar: { height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  coverageBarFill: { height: '100%', borderRadius: 3 },
  coverageDetail: { fontSize: 11, color: '#6B7280' },
  metaRow: { flexDirection: 'row', gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#6B7280' },
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#4F8EF710', padding: 8, borderRadius: 8 },
  applyText: { fontSize: 12, fontWeight: '700', color: '#4F8EF7' },
});
