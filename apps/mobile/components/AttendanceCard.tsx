import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { LegislatorAttendance } from '../lib/civicMetricsTypes';
import { getAttendanceGrade } from '../lib/civicMetricsTypes';

interface AttendanceCardProps {
  attendance: LegislatorAttendance;
  onPress?: () => void;
}

export default function AttendanceCard({ attendance, onPress }: AttendanceCardProps) {
  const { t } = useTranslation();
  const grade = attendance.attendancePercent === null
    ? {
        grade: '—',
        color: '#6B7280',
        label: t('common.unavailable', { defaultValue: 'Unavailable' }),
      }
    : getAttendanceGrade(attendance.attendancePercent);
  const attendanceDetail =
    attendance.attended !== null && attendance.totalSessions !== null
      ? `${attendance.attended} / ${attendance.totalSessions} ${t('civicMetrics.sessions')} (${attendance.sessionYear})`
      : t('common.unavailable', { defaultValue: 'Unavailable' });
  const legislatorLocation = [
    attendance.constituencyAcNo != null ? `AC #${attendance.constituencyAcNo}` : null,
    attendance.stateCode,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{attendance.legislatorName}</Text>
          <Text style={styles.meta}>{[attendance.party, legislatorLocation].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: grade.color + '20' }]}>
          <Text style={[styles.gradeText, { color: grade.color }]}>{grade.grade}</Text>
          <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
        </View>
      </View>

      {/* Attendance bar */}
      <View style={styles.attendanceSection}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceLabel}>{t('civicMetrics.assemblyAttendance')}</Text>
          <Text style={[styles.attendancePct, { color: grade.color }]}>
            {attendance.attendancePercent === null ? '—' : `${attendance.attendancePercent}%`}
          </Text>
        </View>
        <View style={styles.attendanceBar}>
          {attendance.attendancePercent !== null && (
            <View style={[styles.attendanceBarFill, { width: `${Math.max(0, Math.min(100, attendance.attendancePercent))}%`, backgroundColor: grade.color }]} />
          )}
        </View>
        <Text style={styles.attendanceDetail}>{attendanceDetail}</Text>
      </View>

      {/* Performance metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Ionicons name="help-circle" size={14} color="#3B82F6" />
          <Text style={styles.metricValue}>{attendance.questionsAsked ?? '—'}</Text>
          <Text style={styles.metricLabel}>{t('civicMetrics.questionsRaised')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="chatbubbles" size={14} color="#8B5CF6" />
          <Text style={styles.metricValue}>{attendance.debatesParticipated ?? '—'}</Text>
          <Text style={styles.metricLabel}>{t('civicMetrics.debatesParticipated')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="document-text" size={14} color="#F59E0B" />
          <Text style={styles.metricValue}>{attendance.privateMemberBills ?? '—'}</Text>
          <Text style={styles.metricLabel}>{t('civicMetrics.privateBills')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="trophy" size={14} color="#10B981" />
          <Text style={styles.metricValue}>{attendance.ranking == null ? '—' : `#${attendance.ranking}`}</Text>
          <Text style={styles.metricLabel}>{attendance.totalLegislators == null ? t('common.unavailable', { defaultValue: 'Unavailable' }) : `of ${attendance.totalLegislators}`}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameSection: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#241814' },
  meta: { fontSize: 11, color: '#988275', marginTop: 2 },
  gradeBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gradeText: { fontSize: 18, fontWeight: '900' },
  gradeLabel: { fontSize: 9, fontWeight: '700' },
  attendanceSection: { marginBottom: 12 },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attendanceLabel: { fontSize: 11, color: '#6D5549', fontWeight: '600' },
  attendancePct: { fontSize: 14, fontWeight: '800' },
  attendanceBar: { height: 8, backgroundColor: '#E8DED1', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  attendanceBarFill: { height: '100%', borderRadius: 4 },
  attendanceDetail: { fontSize: 11, color: '#988275' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 15, fontWeight: '800', color: '#241814' },
  metricLabel: { fontSize: 9, color: '#988275', fontWeight: '600' },
});
