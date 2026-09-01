/**
 * CivicBadgeGrid — Displays earned and locked badges in a grid layout.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BADGE_CONFIG, type BadgeType, type CivicBadge } from '../lib/aspirantTypes';

interface CivicBadgeGridProps {
  earned: CivicBadge[];
  compact?: boolean;
}

const ALL_BADGE_TYPES: BadgeType[] = Object.keys(BADGE_CONFIG) as BadgeType[];

export default React.memo(function CivicBadgeGrid({ earned, compact }: CivicBadgeGridProps) {
  const { t } = useTranslation();
  const earnedSet = new Set(earned.map((b) => b.type));

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {earned.slice(0, 6).map((b) => {
          const config = BADGE_CONFIG[b.type];
          return (
            <View key={b.type} style={[styles.compactBadge, { backgroundColor: config.color + '20' }]}>
              <Ionicons name={config.icon as any} size={16} color={config.color} />
            </View>
          );
        })}
        {earned.length > 6 && (
          <Text style={styles.moreText}>+{earned.length - 6}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {ALL_BADGE_TYPES.map((type) => {
        const config = BADGE_CONFIG[type];
        const isEarned = earnedSet.has(type);
        return (
          <View
            key={type}
            style={[
              styles.badge,
              isEarned ? { backgroundColor: config.color + '15', borderColor: config.color + '40' } : styles.lockedBadge,
            ]}
          >
            <Ionicons
              name={config.icon as any}
              size={22}
              color={isEarned ? config.color : '#374151'}
            />
            <Text style={[styles.badgeLabel, isEarned && { color: '#FFFFFF' }]} numberOfLines={1}>
              {t(`leadershipAcademy.badges.${type}`, { defaultValue: config.label })}
            </Text>
            {!isEarned && (
              <Ionicons name="lock-closed" size={10} color="#374151" style={styles.lockIcon} />
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: '30%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  lockedBadge: {
    backgroundColor: '#111827',
    opacity: 0.5,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  compactBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
});
