import { useState } from 'react';
import { Alert, Linking, View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { GovernmentScheme } from '../lib/civicMetricsTypes';
import { SCHEME_CATEGORY_CONFIG, formatCrores } from '../lib/civicMetricsTypes';
import CivicVerificationDate from './CivicVerificationDate';

interface SchemeCardProps {
  scheme: GovernmentScheme;
  onPress?: () => void;
}

export default function SchemeCard({ scheme, onPress }: SchemeCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const catConfig = SCHEME_CATEGORY_CONFIG[scheme.category];
  const unavailable = t('common.dataUnavailable');
  const coveragePercent = typeof scheme.coveragePercent === 'number' ? scheme.coveragePercent : null;
  const hasBeneficiaryCounts = scheme.beneficiariesActual !== null && scheme.beneficiariesTarget !== null;
  const links = [
    ...(scheme.applicationUrl ? [{ title: t('civicMetrics.applyOnline'), url: scheme.applicationUrl }] : []),
    ...scheme.documents,
  ].filter((link, index, all) =>
    link.url.startsWith('https://') && all.findIndex((item) => item.url === link.url) === index,
  );

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress ?? (() => setExpanded((value) => !value))}
        style={styles.titleButton}
      >
        <Text style={styles.name}>{scheme.name}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6D5549" />
      </Pressable>
      <View style={styles.header}>
        <View style={[styles.catBadge, { backgroundColor: catConfig.color + '15' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: scheme.level === 'central' ? '#3B82F620' : '#F59E0B20' }]}>
          <Text style={[styles.levelText, { color: scheme.level === 'central' ? '#3B82F6' : '#F59E0B' }]}>{scheme.level === 'central' ? t('civicMetrics.centralScheme') : scheme.stateCode || t('civicMetrics.stateScheme')}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>{scheme.description}</Text>

      {/* Coverage */}
      {(coveragePercent !== null || hasBeneficiaryCounts) && <View style={styles.coverageSection}>
        <View style={styles.coverageHeader}>
          <Text style={styles.coverageLabel}>{t('civicMetrics.coverage')}</Text>
          <Text style={[styles.coveragePct, { color: coveragePercent !== null && coveragePercent >= 80 ? '#10B981' : '#F59E0B' }]}>
            {coveragePercent !== null ? `${coveragePercent}%` : unavailable}
          </Text>
        </View>
        {coveragePercent !== null && (
          <View style={styles.coverageBar}>
            <View style={[styles.coverageBarFill, { width: `${coveragePercent}%`, backgroundColor: coveragePercent >= 80 ? '#10B981' : '#F59E0B' }]} />
          </View>
        )}
        <Text style={styles.coverageDetail}>
          {hasBeneficiaryCounts
            ? `${(scheme.beneficiariesActual! / 1000000).toFixed(1)}M / ${(scheme.beneficiariesTarget! / 1000000).toFixed(1)}M ${t('civicMetrics.beneficiaries')}`
            : unavailable}
        </Text>
      </View>}

      {/* Budget + Meta */}
      <View style={styles.metaRow}>
        {scheme.budgetCrores !== null && <View style={styles.metaItem}>
          <Ionicons name="wallet" size={12} color="#6B7280" />
          <Text style={styles.metaText}>
            {t('civicMetrics.tabs.budget')}: {formatCrores(scheme.budgetCrores)}
          </Text>
        </View>}
        <View style={styles.metaItem}>
          <Ionicons name="business" size={12} color="#6B7280" />
          <Text style={styles.metaText}>{scheme.ministry}</Text>
        </View>
      </View>

      <CivicVerificationDate date={scheme.sourceVerifiedOn} />
      {expanded && (
        <>
          {scheme.eligibility && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>{t('civicMetrics.schemeEligibility', { defaultValue: 'Eligibility' })}</Text>
              <Text style={styles.description}>{scheme.eligibility}</Text>
            </View>
          )}
          {scheme.benefits && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>{t('civicMetrics.schemeBenefits', { defaultValue: 'Benefits' })}</Text>
              <Text style={styles.description}>{scheme.benefits}</Text>
            </View>
          )}
          {links.map(({ title, url }) => (
            <Pressable
              key={url}
              accessibilityRole="link"
              style={styles.applyRow}
              onPress={() => void Linking.openURL(url).catch(() => Alert.alert(t('common.error')))}
            >
              <Ionicons name="open-outline" size={14} color="#245FB6" />
              <Text style={styles.applyText}>{title}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catLabel: { fontSize: 10, fontWeight: '700' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 10, fontWeight: '700' },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: '#241814' },
  description: { fontSize: 13, color: '#6D5549', lineHeight: 18, marginBottom: 10 },
  coverageSection: { marginBottom: 10 },
  coverageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  coverageLabel: { fontSize: 11, color: '#6D5549', fontWeight: '600' },
  coveragePct: { fontSize: 14, fontWeight: '800' },
  coverageBar: { height: 6, backgroundColor: '#E8DED1', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  coverageBarFill: { height: '100%', borderRadius: 3 },
  coverageDetail: { fontSize: 11, color: '#988275' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  metaText: { flexShrink: 1, fontSize: 11, color: '#6D5549' },
  detailBlock: { marginTop: 10 },
  detailLabel: { color: '#241814', fontWeight: '700', marginBottom: 3 },
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 44, backgroundColor: '#4F8EF710', padding: 8, borderRadius: 8 },
  applyText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#245FB6' },
});
