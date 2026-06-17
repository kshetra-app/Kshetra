import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '@/lib/responsive';

interface Props {
  questionsAsked: number;
  debatesParticipated: number;
  privateMemberBills: number;
  attendancePercent: number;
  performanceScore?: number;
  mpladsUtilized?: number;
}

function CircularProgress({ value, max, color, size = 52 }: { value: number; max: number; color: string; size?: number }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: '#1F2937' }} />
      {/* Progress arc (simplified — using border trick) */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 4, borderColor: color,
        borderRightColor: pct < 75 ? 'transparent' : color,
        borderBottomColor: pct < 50 ? 'transparent' : color,
        borderLeftColor: pct < 25 ? 'transparent' : color,
        transform: [{ rotate: '-90deg' }],
      }} />
      <Text style={{ fontSize: ms(12), fontWeight: '800', color: '#FFFFFF' }}>{pct}%</Text>
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
  const hasData = questionsAsked > 0 || debatesParticipated > 0 || attendancePercent > 0;

  if (!hasData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="bar-chart" size={18} color="#8B5CF6" />
          <Text style={styles.title}>Legislative Performance</Text>
        </View>
        <Text style={styles.emptyText}>Coming soon</Text>
      </View>
    );
  }

  const attendColor = attendancePercent >= 75 ? '#10B981' : attendancePercent >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={18} color="#8B5CF6" />
        <Text style={styles.title}>Legislative Performance</Text>
        {performanceScore != null && performanceScore > 0 && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{performanceScore.toFixed(0)}/100</Text>
          </View>
        )}
      </View>

      {/* Attendance - prominent */}
      <View style={styles.attendanceRow}>
        <CircularProgress value={attendancePercent} max={100} color={attendColor} size={56} />
        <View style={styles.attendanceInfo}>
          <Text style={styles.attendanceLabel}>Session Attendance</Text>
          <Text style={[styles.attendanceValue, { color: attendColor }]}>{attendancePercent}%</Text>
          <Text style={styles.attendanceHint}>
            {attendancePercent >= 75 ? 'Above average' : attendancePercent >= 50 ? 'Average' : 'Below average'}
          </Text>
        </View>
      </View>

      {/* Activity metrics */}
      <View style={styles.metricsGrid}>
        <MetricItem icon="help-circle" color="#4F8EF7" value={questionsAsked} label="Questions" />
        <MetricItem icon="chatbubbles" color="#10B981" value={debatesParticipated} label="Debates" />
        <MetricItem icon="document-text" color="#F59E0B" value={privateMemberBills} label="Bills" />
        {mpladsUtilized != null && (
          <MetricItem icon="construct" color="#8B5CF6" value={`${mpladsUtilized}%`} label="MPLADS" />
        )}
      </View>
    </View>
  );
}

function MetricItem({ icon, color, value, label }: { icon: string; color: string; value: number | string; label: string }) {
  return (
    <View style={styles.metricItem}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
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
    color: '#FFFFFF',
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#8B5CF6',
  },
  emptyText: {
    fontSize: ms(12),
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0A0A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceLabel: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '500',
  },
  attendanceValue: {
    fontSize: ms(22),
    fontWeight: '800',
  },
  attendanceHint: {
    fontSize: ms(10),
    color: '#9CA3AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0A0A1A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
  },
  metricValue: {
    fontSize: ms(16),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: ms(9),
    color: '#6B7280',
    fontWeight: '500',
  },
});
