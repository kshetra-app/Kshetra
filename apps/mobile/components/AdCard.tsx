import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { isAdExcludedScreen, IS_AD_NETWORK_CONFIGURED } from '../lib/adConfig';

interface AdCardProps {
  screenName?: string;
  slotIndex?: number;
}

/**
 * Lane 1 — General Commercial Ad Card Shell
 * 
 * Visually matches feed post card design with a permanent, non-removable "Sponsored" label.
 * Strictly excluded from rendering on civic-issue reporting, delimitation tracker, and moderation queue.
 * 
 * Per Phase 4 instructions:
 * // TODO: pending Google/Meta ad credentials — do not mock
 * // The component renders nothing in this slot until real credentials are wired in later.
 */
export default function AdCard({ screenName, slotIndex }: AdCardProps) {
  const { colors } = useTheme();

  // Strict exclusion enforcement: ads must never appear on excluded screens
  if (isAdExcludedScreen(screenName)) {
    return null;
  }

  // TODO: pending Google/Meta ad credentials — do not mock
  // Renders nothing in this slot until real ad network credentials are wired in.
  if (!IS_AD_NETWORK_CONFIGURED) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Permanent Non-removable Sponsored Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="megaphone" size={16} color="#6B7280" />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.sponsorName, { color: colors.text }]}>Featured Partner</Text>
            {/* Permanent Sponsored Badge — cannot be removed or hidden by any configuration */}
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Sponsored</Text>
            </View>
          </View>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>Commercial Promotion</Text>
        </View>
      </View>

      {/* Content Body Shell */}
      <View style={styles.content}>
        <Text style={[styles.bodyText, { color: colors.text }]}>
          {/* Ad creative payload renders here once real SDK is connected */}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sponsorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sponsoredBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    marginTop: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
