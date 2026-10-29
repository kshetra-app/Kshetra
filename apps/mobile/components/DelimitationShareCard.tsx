/**
 * Delimitation Share Card Component (JOB 022)
 *
 * Authority: Master Product Blueprint & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
 *
 * Provides a mobile preview card and triggers native OS sharing (Share.share)
 * with verified public web URLs (poligram.in / panin.in) and DPDP Act 2023 zero-PII privacy.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CitizenImpact } from '../lib/delimitationTypes';
import {
  IMPACT_SEVERITY_CONFIG,
  BOUNDARY_CHANGE_CONFIG,
  buildCitizenImpactSummary,
} from '../lib/delimitationTypes';
import { useTheme } from '../lib/theme';

export interface DelimitationShareCardProps {
  impact: CitizenImpact;
  domain?: 'poligram.in' | 'panin.in';
  onShareComplete?: (shareUrl: string) => void;
}

export function DelimitationShareCard({
  impact,
  domain = 'poligram.in',
  onShareComplete,
}: DelimitationShareCardProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);

  const severityConfig = IMPACT_SEVERITY_CONFIG[impact.impactSeverity] || {
    label: 'Standard',
    color: '#3B82F6',
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const host = domain === 'panin.in' ? 'https://panin.in' : 'https://poligram.in';
      const shareId = `share_${(impact.stateCode || 'ts').toLowerCase()}_${impact.currentAcNo}_${impact.pinCode}`;
      const shareUrl = `${host}/share/delimitation/${shareId}`;

      const shareTitle = `${impact.currentAcName} Delimitation Assessment`;
      const shareMessage = `I just checked my delimitation impact for ${impact.currentAcName} (AC #${impact.currentAcNo}, PIN ${impact.pinCode}) on Poligram! See what happens under constitutional seat rebalancing: ${shareUrl}`;

      const result = await Share.share(
        {
          title: shareTitle,
          message: shareMessage,
          url: shareUrl,
        },
        {
          dialogTitle: 'Share Delimitation Impact',
        },
      );

      if (result.action === Share.sharedAction) {
        onShareComplete?.(shareUrl);
      }
    } catch (err) {
      console.warn('Share card invocation error:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header Banner */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              CONSTITUTIONAL ASSESSMENT
            </Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '20' }]}>
            <Text style={[styles.severityText, { color: severityConfig.color }]}>
              {severityConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Headline */}
      <Text style={[styles.title, { color: colors.text }]}>
        {impact.currentAcName} (AC #{impact.currentAcNo})
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Postal Code {impact.pinCode} · {impact.districtName || impact.stateCode}
      </Text>

      {/* Comparison Grid */}
      <View style={[styles.summaryBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: colors.textMuted }]}>CURRENT</Text>
          <Text style={[styles.colVal, { color: colors.text }]}>{impact.currentAcName}</Text>
          <Text style={[styles.colSub, { color: colors.textSecondary }]}>
            {impact.currentReservation || 'GEN'}
          </Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />

        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: colors.textMuted }]}>PROPOSED</Text>
          <Text style={[styles.colVal, { color: colors.text }]}>
            {impact.proposedAcName || impact.currentAcName}
          </Text>
          <Text style={[styles.colSub, { color: colors.textSecondary }]}>
            {impact.proposedReservation || impact.currentReservation || 'GEN'}
          </Text>
        </View>
      </View>

      {/* Summary Narrative */}
      <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
        {buildCitizenImpactSummary(impact)}
      </Text>

      {/* Privacy Notice */}
      <View style={styles.privacyRow}>
        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
        <Text style={styles.privacyText}>
          DPDP Act 2023 Compliant · Zero Voter Tracking
        </Text>
      </View>

      {/* Share Action Button */}
      <Pressable
        style={[styles.shareBtn, { backgroundColor: colors.primary }]}
        onPress={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="share-social" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share My Impact Card</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  col: {
    flex: 1,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  colVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  colSub: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  privacyText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
