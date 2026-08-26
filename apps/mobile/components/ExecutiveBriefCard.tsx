import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import type { ExecutiveBriefing } from '@kshetra/shared';

interface Props {
  briefing: ExecutiveBriefing;
  onExport?: () => void;
}

export function ExecutiveBriefCard({ briefing, onExport }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.aiBadge, { backgroundColor: '#8B5CF615' }]}>
            <Ionicons name="sparkles" size={14} color="#8B5CF6" />
            <Text style={[styles.aiBadgeText, { color: '#8B5CF6' }]}>EXECUTIVE AI BRIEF</Text>
          </View>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {new Date(briefing.generatedAt).toLocaleDateString()}
          </Text>
        </View>

        {onExport && (
          <TouchableOpacity onPress={onExport} style={styles.exportBtn}>
            <Ionicons name="share-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Headline */}
      <Text style={[styles.headline, { color: colors.text }]}>{briefing.headline}</Text>

      {/* Key Takeaways */}
      <View style={[styles.sectionBlock, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STRATEGIC TAKEAWAYS</Text>
        {briefing.keyTakeaways.map((takeaway, idx) => (
          <View key={idx} style={styles.takeawayRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.checkIcon} />
            <Text style={[styles.takeawayText, { color: colors.text }]}>{takeaway}</Text>
          </View>
        ))}
      </View>

      {/* Actionable Recommendations */}
      <View style={[styles.sectionBlock, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: '#1E40AF' }]}>RECOMMENDED COUNTER-ACTIONS</Text>
        {briefing.strategicRecommendations.map((rec, idx) => (
          <View key={idx} style={styles.recRow}>
            <Text style={[styles.recNumber, { color: '#2563EB' }]}>{idx + 1}.</Text>
            <Text style={[styles.recText, { color: '#1E293B' }]}>{rec}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 11,
  },
  exportBtn: {
    padding: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
  },
  sectionBlock: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  checkIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  takeawayText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recNumber: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 6,
    marginTop: 1,
  },
  recText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
