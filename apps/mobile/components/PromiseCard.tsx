/**
 * PromiseCard — Displays an election promise with status, progress bar, engagement.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '../lib/constants';
import {
  PROMISE_STATUS_CONFIG,
  PROMISE_CATEGORY_CONFIG,
  PROMISE_SOURCE_CONFIG,
  type ElectionPromise,
} from '../lib/promiseTypes';

interface PromiseCardProps {
  promise: ElectionPromise;
  onFollow?: () => void;
  onPress?: () => void;
}

export default React.memo(function PromiseCard({ promise, onFollow, onPress }: PromiseCardProps) {
  const { t } = useTranslation();
  const statusConfig = PROMISE_STATUS_CONFIG[promise.status];
  const categoryConfig = PROMISE_CATEGORY_CONFIG[promise.category];
  const sourceConfig = PROMISE_SOURCE_CONFIG[promise.source];
  const partyColor = getPartyColor(promise.party);

  const isOverdue = promise.deadline && new Date(promise.deadline) < new Date() && promise.status !== 'delivered';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
          <Ionicons name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
          <Text style={[styles.categoryText, { color: categoryConfig.color }]}>{categoryConfig.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Title + Party */}
      <Text style={styles.title} numberOfLines={2}>{promise.title}</Text>
      <View style={styles.metaRow}>
        <View style={[styles.partyBadge, { backgroundColor: partyColor + '20' }]}>
          <Text style={[styles.partyText, { color: partyColor }]}>{promise.party}</Text>
        </View>
        <View style={styles.sourceTag}>
          <Ionicons name={sourceConfig.icon as any} size={10} color="#6B7280" />
          <Text style={styles.sourceText}>{sourceConfig.label}</Text>
        </View>
        <Text style={styles.yearText}>{promise.electionYear}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>{promise.description}</Text>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{t('promiseCard.deliveryProgress')}</Text>
          <Text style={[styles.progressPercent, { color: statusConfig.color }]}>
            {promise.deliveryPercentage}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${promise.deliveryPercentage}%`,
                backgroundColor: statusConfig.color,
              },
            ]}
          />
        </View>
      </View>

      {/* Overdue warning */}
      {isOverdue && (
        <View style={styles.overdueBar}>
          <Ionicons name="time" size={13} color="#EF4444" />
          <Text style={styles.overdueText}>
            {t('promiseCard.deadlinePassed')} {new Date(promise.deadline!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      )}

      {/* Footer: engagement */}
      <View style={styles.footer}>
        <Pressable style={styles.engagementItem} onPress={onFollow}>
          <Ionicons
            name={promise.userFollowing ? 'eye' : 'eye-outline'}
            size={16}
            color={promise.userFollowing ? '#4F8EF7' : '#6B7280'}
          />
          <Text style={[styles.engagementText, promise.userFollowing && { color: '#4F8EF7' }]}>
            {promise.followCount}
          </Text>
        </Pressable>
        <View style={styles.engagementItem}>
          <Ionicons name="checkmark-done" size={16} color="#10B981" />
          <Text style={styles.engagementText}>{promise.verificationCount} {t('promiseCard.verified')}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="flag" size={16} color={promise.disputeCount > 100 ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.engagementText, promise.disputeCount > 100 && { color: '#EF4444' }]}>
            {promise.disputeCount} {t('promiseCard.disputes')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#241814',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partyBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  partyText: { fontSize: 11, fontWeight: '700' },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sourceText: { fontSize: 10, color: '#988275' },
  yearText: { fontSize: 10, color: '#988275', fontWeight: '700' },
  description: {
    fontSize: 12,
    color: '#6D5549',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { fontSize: 11, color: '#988275', fontWeight: '600' },
  progressPercent: { fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8DED1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  overdueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderRadius: 6,
    padding: 6,
    gap: 6,
    marginBottom: 10,
  },
  overdueText: { fontSize: 11, color: '#EF4444', fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E8DED1',
    paddingTop: 10,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 11,
    color: '#988275',
    fontWeight: '600',
  },
});
