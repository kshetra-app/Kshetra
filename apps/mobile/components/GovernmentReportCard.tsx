/**
 * GovernmentReportCard — Aggregate scorecard for a government's promise delivery.
 * Shows PDI score, status breakdown donut, category distribution, top delivered/broken.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../lib/constants';
import {
  PROMISE_STATUS_CONFIG,
  PROMISE_CATEGORY_CONFIG,
  type GovernmentReportCardData,
  type PromiseStatus,
  type PromiseCategory,
} from '../lib/promiseTypes';

interface GovernmentReportCardProps {
  data: GovernmentReportCardData;
}

export default React.memo(function GovernmentReportCard({ data }: GovernmentReportCardProps) {
  const partyColor = getPartyColor(data.party);

  const pdiColor = data.pdi >= 70 ? '#10B981' : data.pdi >= 40 ? '#F59E0B' : '#EF4444';
  const pdiLabel = data.pdi >= 70 ? 'Good' : data.pdi >= 40 ? 'Average' : 'Poor';

  const statusEntries = useMemo(
    () =>
      (Object.entries(data.statusBreakdown) as [PromiseStatus, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [data.statusBreakdown],
  );

  const categoryEntries = useMemo(
    () =>
      (Object.entries(data.categoryBreakdown) as [PromiseCategory, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [data.categoryBreakdown],
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Government Report Card</Text>
          <View style={styles.headerMeta}>
            <View style={[styles.partyBadge, { backgroundColor: partyColor + '30' }]}>
              <Text style={[styles.partyText, { color: partyColor }]}>{data.party}</Text>
            </View>
            <Text style={styles.metaText}>{data.electionYear} Manifesto</Text>
            <Text style={styles.metaText}>{data.totalPromises} promises tracked</Text>
          </View>
        </View>
      </View>

      {/* PDI Score */}
      <View style={styles.pdiSection}>
        <View style={[styles.pdiCircle, { borderColor: pdiColor }]}>
          <Text style={[styles.pdiScore, { color: pdiColor }]}>{data.pdi}</Text>
          <Text style={styles.pdiLabel}>PDI</Text>
        </View>
        <View style={styles.pdiInfo}>
          <Text style={[styles.pdiRating, { color: pdiColor }]}>{pdiLabel}</Text>
          <Text style={styles.pdiDescription}>
            Promise Delivery Index measures how well the government has fulfilled its election commitments.
            100 = all delivered, 0 = nothing done.
          </Text>
          <Text style={styles.pdiAvg}>
            Avg. delivery: {data.averageDeliveryPercent}%
          </Text>
        </View>
      </View>

      {/* Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Breakdown</Text>
        <View style={styles.statusGrid}>
          {statusEntries.map(([status, count]) => {
            const config = PROMISE_STATUS_CONFIG[status];
            const pct = Math.round((count / data.totalPromises) * 100);
            return (
              <View key={status} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusName}>{config.label}</Text>
                  <Text style={[styles.statusCount, { color: config.color }]}>
                    {count} ({pct}%)
                  </Text>
                </View>
                <View style={styles.statusBarTrack}>
                  <View
                    style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: config.color }]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Category Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Category</Text>
        <View style={styles.categoryGrid}>
          {categoryEntries.map(([cat, count]) => {
            const config = PROMISE_CATEGORY_CONFIG[cat];
            return (
              <View key={cat} style={styles.categoryChip}>
                <Ionicons name={config.icon as any} size={12} color={config.color} />
                <Text style={[styles.categoryName, { color: config.color }]}>{config.label}</Text>
                <Text style={styles.categoryCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top Delivered */}
      {data.topDelivered.length > 0 && (
        <View style={styles.section}>
          <View style={styles.topHeader}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: '#10B981' }]}>Top Delivered</Text>
          </View>
          {data.topDelivered.slice(0, 3).map((p) => (
            <Text key={p.id} style={styles.topItem}>
              {'\u2713'} {p.title}
            </Text>
          ))}
        </View>
      )}

      {/* Top Broken / Stalled */}
      {data.topBroken.length > 0 && (
        <View style={styles.section}>
          <View style={styles.topHeader}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Broken Promises</Text>
          </View>
          {data.topBroken.slice(0, 3).map((p) => (
            <Text key={p.id} style={styles.topItemBroken}>
              {'\u2717'} {p.title}
            </Text>
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Based on publicly verifiable data. Citizens can submit evidence to verify or dispute status.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  partyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  partyText: { fontSize: 12, fontWeight: '700' },
  metaText: { fontSize: 11, color: '#6B7280' },
  // PDI
  pdiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: '#0A0A1A',
    borderRadius: 12,
    padding: 16,
  },
  pdiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdiScore: { fontSize: 28, fontWeight: '900' },
  pdiLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  pdiInfo: { flex: 1 },
  pdiRating: { fontSize: 16, fontWeight: '800' },
  pdiDescription: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginTop: 4 },
  pdiAvg: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', marginTop: 6 },
  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  // Status
  statusGrid: { gap: 6 },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusInfo: { width: 100 },
  statusName: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  statusCount: { fontSize: 12, fontWeight: '800' },
  statusBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusBarFill: { height: '100%', borderRadius: 3 },
  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  categoryName: { fontSize: 10, fontWeight: '700' },
  categoryCount: { fontSize: 10, fontWeight: '800', color: '#9CA3AF' },
  // Top items
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  topItem: { fontSize: 12, color: '#10B981', marginBottom: 4, lineHeight: 18 },
  topItemBroken: { fontSize: 12, color: '#EF4444', marginBottom: 4, lineHeight: 18 },
  disclaimer: {
    fontSize: 10,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
});
