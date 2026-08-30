import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

interface Props {
  questionsAsked: number;
  debatesParticipated: number;
  privateMemberBills: number;
  attendancePercent: number;
  performanceScore?: number;
  mpladsUtilized?: number;
}

function CircularProgress({ value, max, color, size = 52, trackColor, textColor }: { value: number; max: number; color: string; size?: number; trackColor?: string; textColor?: string }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: trackColor || '#E8DED1' }} />
      {/* Progress arc */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 4, borderColor: color,
        borderRightColor: pct < 75 ? 'transparent' : color,
        borderBottomColor: pct < 50 ? 'transparent' : color,
        borderLeftColor: pct < 25 ? 'transparent' : color,
        transform: [{ rotate: '-90deg' }],
      }} />
      <Text style={{ fontSize: ms(12), fontWeight: '800', color: textColor || '#241814' }}>{pct}%</Text>
    </View>
  );
}

export default function PerformanceCard({
  questionsAsked,
  debatesParticipated,
  privateMemberBills,
  attendancePercent,
  performanceScore,
  mpladsUtilized,
}: Props) {
  const { colors } = useTheme();
  const hasData = questionsAsked > 0 || debatesParticipated > 0 || attendancePercent > 0;

  if (!hasData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <View style={styles.header}>
          <Ionicons name="bar-chart" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Legislative Performance</Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Coming soon</Text>
      </View>
    );
  }

  const attendColor = attendancePercent >= 75 ? colors.success : attendancePercent >= 50 ? colors.warning : colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Legislative Performance</Text>
        {performanceScore != null && performanceScore > 0 && (
          <View style={[styles.scoreBadge, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder, borderWidth: 1 }]}>
            <Text style={[styles.scoreText, { color: colors.gold }]}>{performanceScore.toFixed(0)}/100</Text>
          </View>
        )}
      </View>

      {/* Attendance - prominent */}
      <View style={[styles.attendanceRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <CircularProgress value={attendancePercent} max={100} color={attendColor} size={56} trackColor={colors.border} textColor={colors.text} />
        <View style={styles.attendanceInfo}>
          <Text style={[styles.attendanceLabel, { color: colors.textMuted }]}>Session Attendance</Text>
          <Text style={[styles.attendanceValue, { color: attendColor }]}>{attendancePercent}%</Text>
          <Text style={[styles.attendanceHint, { color: colors.textSecondary }]}>
            {attendancePercent >= 75 ? 'Above average' : attendancePercent >= 50 ? 'Average' : 'Below average'}
          </Text>
        </View>
      </View>

      {/* Activity metrics */}
      <View style={styles.metricsGrid}>
        <MetricItem icon="help-circle" color={colors.teal} value={questionsAsked} label="Questions" surface={colors.surfaceElevated} textColor={colors.text} textMuted={colors.textMuted} border={colors.border} />
        <MetricItem icon="chatbubbles" color={colors.success} value={debatesParticipated} label="Debates" surface={colors.surfaceElevated} textColor={colors.text} textMuted={colors.textMuted} border={colors.border} />
        <MetricItem icon="document-text" color={colors.gold} value={privateMemberBills} label="Bills" surface={colors.surfaceElevated} textColor={colors.text} textMuted={colors.textMuted} border={colors.border} />
        {mpladsUtilized != null && (
          <MetricItem icon="construct" color={colors.primary} value={`${mpladsUtilized}%`} label="MPLADS" surface={colors.surfaceElevated} textColor={colors.text} textMuted={colors.textMuted} border={colors.border} />
        )}
      </View>
    </View>
  );
}

function MetricItem({ icon, color, value, label, surface, textColor, textMuted, border }: { icon: string; color: string; value: number | string; label: string; surface?: string; textColor?: string; textMuted?: string; border?: string }) {
  return (
    <View style={[styles.metricItem, { backgroundColor: surface || '#FAF6EE', borderColor: border || '#E8DED1', borderWidth: 1 }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.metricValue, { color: textColor || '#241814' }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: textMuted || '#988275' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: ms(15),
    fontWeight: '700',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: ms(10),
    fontWeight: '700',
  },
  emptyText: {
    fontSize: ms(12),
    textAlign: 'center',
    paddingVertical: 12,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceLabel: {
    fontSize: ms(11),
    fontWeight: '500',
  },
  attendanceValue: {
    fontSize: ms(22),
    fontWeight: '800',
  },
  attendanceHint: {
    fontSize: ms(10),
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
  },
  metricValue: {
    fontSize: ms(16),
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: ms(9),
    fontWeight: '500',
  },
});
