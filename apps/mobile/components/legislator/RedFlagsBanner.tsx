import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '@/lib/responsive';

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
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#4F8EF7',
};

export default function RedFlagsBanner({ flags }: Props) {
  if (flags.length === 0) return null;

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const bgColor = criticalCount > 0 ? '#EF444410' : '#F59E0B10';
  const borderColor = criticalCount > 0 ? '#EF444440' : '#F59E0B40';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={16} color={criticalCount > 0 ? '#EF4444' : '#F59E0B'} />
        <Text style={styles.headerText}>{flags.length} Red Flag{flags.length > 1 ? 's' : ''} Detected</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flagsScroll}>
        {flags.map((flag, idx) => {
          const color = SEVERITY_COLOR[flag.severity] || '#6B7280';
          const icon = FLAG_ICON[flag.type] || 'flag';
          return (
            <View key={idx} style={[styles.flagChip, { borderColor: color + '40' }]}>
              <Ionicons name={icon as any} size={12} color={color} />
              <Text style={[styles.flagText, { color }]} numberOfLines={2}>
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
    color: '#FFFFFF',
  },
  flagsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A0A1A',
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
