import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { SentimentRadarScores } from '@kshetra/shared';

interface Props {
  scores: SentimentRadarScores;
}

interface DimensionConfig {
  key: keyof Omit<SentimentRadarScores, 'overallSentiment'>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const DIMENSIONS: DimensionConfig[] = [
  { key: 'governance', label: 'Governance & Response', icon: 'business', color: '#2563EB' },
  { key: 'infrastructure', label: 'Civic Infrastructure', icon: 'construct', color: '#F59E0B' },
  { key: 'welfare', label: 'Welfare & Direct Schemes', icon: 'heart', color: '#10B981' },
  { key: 'economy', label: 'Economy & Livelihood', icon: 'trending-up', color: '#8B5CF6' },
  { key: 'candidateTrust', label: 'Candidate Trust', icon: 'shield-checkmark', color: '#06B6D4' },
];

export function SentimentRadarChart({ scores }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const localizeDim = (key: string, defaultLabel: string) => {
    switch (key) {
      case 'governance': return t('analytics.governanceResponse', { defaultValue: defaultLabel });
      case 'infrastructure': return t('analytics.civicInfrastructure', { defaultValue: defaultLabel });
      case 'welfare': return t('analytics.welfareSchemes', { defaultValue: defaultLabel });
      case 'economy': return t('analytics.economyLivelihood', { defaultValue: defaultLabel });
      case 'candidateTrust': return t('analytics.candidateTrust', { defaultValue: defaultLabel });
      default: return defaultLabel;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="speedometer" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('analytics.sentimentRadarTitle', { defaultValue: '5-Pillar Sentiment Radar' })}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('analytics.sentimentRadarSubtitle', { defaultValue: 'Real-time ground pulse & satisfaction metrics' })}
            </Text>
          </View>
        </View>

        <View style={[styles.netSentimentPill, { backgroundColor: scores.overallSentiment >= 0 ? '#10B98115' : '#EF444415' }]}>
          <Text style={[styles.netSentimentText, { color: scores.overallSentiment >= 0 ? '#10B981' : '#EF4444' }]}>
            {scores.overallSentiment >= 0 ? `+${scores.overallSentiment}` : scores.overallSentiment} {t('analytics.netMood', { defaultValue: 'Net Mood' })}
          </Text>
        </View>
      </View>

      <View style={styles.dimensionsList}>
        {DIMENSIONS.map((dim) => {
          const val = scores[dim.key];
          return (
            <View key={dim.key} style={styles.dimRow}>
              <View style={styles.dimHeader}>
                <View style={styles.dimLabelGroup}>
                  <Ionicons name={dim.icon} size={14} color={dim.color} />
                  <Text style={[styles.dimLabel, { color: colors.text }]}>{localizeDim(dim.key, dim.label)}</Text>
                </View>
                <Text style={[styles.dimScore, { color: colors.text }]}>{val}%</Text>
              </View>

              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${val}%`, backgroundColor: dim.color }]} />
              </View>
            </View>
          );
        })}
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
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  netSentimentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  netSentimentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dimensionsList: {
    gap: 14,
  },
  dimRow: {
    gap: 6,
  },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dimLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dimScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
