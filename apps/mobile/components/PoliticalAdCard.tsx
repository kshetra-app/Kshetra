import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export interface PoliticalAdItem {
  id: string;
  pageId: string;
  pageName: string;
  pageHandle?: string;
  postId: string;
  postContent?: string;
  mcmcCertificateId: string;
  amountPaid: number;
  targetScope: 'state' | 'constituency';
  targetValue?: string;
  impressions?: number;
}

interface PoliticalAdCardProps {
  ad: PoliticalAdItem;
  onPress?: () => void;
}

/**
 * Lane 2 — Political Ad / Paid Promotion Card
 * 
 * Strict Compliance Requirements:
 * 1. Labeled exactly: "Political Ad · Paid Promotion by [Page name]"
 * 2. Visually distinct from Lane 1 commercial "Sponsored" card
 * 3. Never shares the same component, layout, or wording with Lane 1
 * 4. Displays official MCMC Certificate ID for regulatory compliance
 */
export default function PoliticalAdCard({ ad, onPress }: PoliticalAdCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: '#D97706' }]}>
      {/* Official Political Promotion Header — Distinct Amber Tone */}
      <View style={styles.topBadgeRow}>
        <Ionicons name="shield-checkmark" size={13} color="#B45309" />
        <Text style={styles.mandatoryLabel} numberOfLines={1}>
          Political Ad · Paid Promotion by {ad.pageName}
        </Text>
      </View>

      {/* Page Profile & Transparency Meta */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="flag" size={16} color="#B45309" />
        </View>
        <View style={styles.pageInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.pageName, { color: colors.text }]}>{ad.pageName}</Text>
            {ad.pageHandle && (
              <Text style={[styles.pageHandle, { color: colors.textSecondary }]}>
                @{ad.pageHandle}
              </Text>
            )}
          </View>
          <View style={styles.mcmcRow}>
            <Text style={styles.mcmcBadge}>MCMC: {ad.mcmcCertificateId}</Text>
            <Text style={[styles.scopeBadge, { color: colors.textSecondary }]}>
              Target: {ad.targetScope.toUpperCase()} {ad.targetValue ? `(${ad.targetValue})` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Ad Creative / Post Content */}
      <Pressable style={styles.contentWrap} onPress={onPress}>
        <Text style={[styles.contentText, { color: colors.text }]}>
          {ad.postContent || `Constituency announcement & campaign release from ${ad.pageName}. Tap to view full post and discussions.`}
        </Text>
      </Pressable>

      {/* Footer Transparency Notice */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          Certified under ECI / MCMC Guidelines · Paid ₹{(ad.amountPaid / 100).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    backgroundColor: '#FFFDF5',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    gap: 5,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  mandatoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.2,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pageInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageHandle: {
    fontSize: 12,
  },
  mcmcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  mcmcBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  scopeBadge: {
    fontSize: 10,
  },
  contentWrap: {
    paddingVertical: 6,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  disclaimer: {
    fontSize: 10.5,
    fontStyle: 'italic',
  },
});
