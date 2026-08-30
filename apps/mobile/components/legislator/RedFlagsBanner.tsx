import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

interface RedFlag {
  type: string;
  severity: string;
  description: string;
  value?: string;
}

interface Props {
  flags: RedFlag[];
}

const FLAG_ICON: Record<string, string> = {
  serious_criminal_cases: 'alert-circle',
  high_wealth_growth: 'trending-up',
  crorepati_with_low_education: 'school',
  multiple_cases: 'documents',
  zero_liability_anomaly: 'help-circle',
  party_hopping: 'swap-horizontal',
  low_attendance: 'time',
  charges_framed: 'hammer',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#A8201A',
  warning: '#D97706',
  info: '#145C68',
};

export default function RedFlagsBanner({ flags }: Props) {
  const { colors } = useTheme();
  if (flags.length === 0) return null;

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const bgColor = criticalCount > 0 ? '#A8201A10' : '#D9770610';
  const borderColor = criticalCount > 0 ? '#A8201A30' : '#D9770630';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={16} color={criticalCount > 0 ? colors.danger : '#D97706'} />
        <Text style={[styles.headerText, { color: colors.text }]}>{flags.length} Red Flag{flags.length > 1 ? 's' : ''} Detected</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flagsScroll}>
        {flags.map((flag, idx) => {
          const color = SEVERITY_COLOR[flag.severity] || colors.textMuted;
          const icon = FLAG_ICON[flag.type] || 'flag';
          return (
            <View key={idx} style={[styles.flagChip, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
              <Ionicons name={icon as any} size={12} color={color} />
              <Text style={[styles.flagText, { color: colors.text }]} numberOfLines={2}>
                {flag.description}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: ms(12),
    fontWeight: '700',
  },
  flagsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 200,
  },
  flagText: {
    fontSize: ms(10),
    fontWeight: '600',
    flexShrink: 1,
  },
});
