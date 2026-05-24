import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LegislatorAttendance } from '../lib/civicMetricsTypes';
import { getAttendanceGrade } from '../lib/civicMetricsTypes';

interface AttendanceCardProps {
  attendance: LegislatorAttendance;
  onPress?: () => void;
}

export default function AttendanceCard({ attendance, onPress }: AttendanceCardProps) {
  const grade = getAttendanceGrade(attendance.attendancePercent);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{attendance.legislatorName}</Text>
          <Text style={styles.meta}>{attendance.party} · AC #{attendance.constituencyAcNo} · {attendance.stateCode}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: grade.color + '20' }]}>
          <Text style={[styles.gradeText, { color: grade.color }]}>{grade.grade}</Text>
          <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
        </View>
      </View>

      {/* Attendance bar */}
      <View style={styles.attendanceSection}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceLabel}>Assembly Attendance</Text>
          <Text style={[styles.attendancePct, { color: grade.color }]}>{attendance.attendancePercent}%</Text>
        </View>
        <View style={styles.attendanceBar}>
          <View style={[styles.attendanceBarFill, { width: `${attendance.attendancePercent}%`, backgroundColor: grade.color }]} />
        </View>
        <Text style={styles.attendanceDetail}>{attendance.attended} / {attendance.totalSessions} sessions ({attendance.sessionYear})</Text>
      </View>

      {/* Performance metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Ionicons name="help-circle" size={14} color="#3B82F6" />
          <Text style={styles.metricValue}>{attendance.questionsAsked}</Text>
          <Text style={styles.metricLabel}>Questions</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="chatbubbles" size={14} color="#8B5CF6" />
          <Text style={styles.metricValue}>{attendance.debatesParticipated}</Text>
          <Text style={styles.metricLabel}>Debates</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="document-text" size={14} color="#F59E0B" />
          <Text style={styles.metricValue}>{attendance.privateMemberBills}</Text>
          <Text style={styles.metricLabel}>Pvt Bills</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="trophy" size={14} color="#10B981" />
          <Text style={styles.metricValue}>#{attendance.ranking}</Text>
          <Text style={styles.metricLabel}>of {attendance.totalLegislators}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameSection: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  meta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  gradeBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gradeText: { fontSize: 18, fontWeight: '900' },
  gradeLabel: { fontSize: 9, fontWeight: '700' },
  attendanceSection: { marginBottom: 12 },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attendanceLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  attendancePct: { fontSize: 14, fontWeight: '800' },
  attendanceBar: { height: 8, backgroundColor: '#1F2937', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  attendanceBarFill: { height: '100%', borderRadius: 4 },
  attendanceDetail: { fontSize: 11, color: '#6B7280' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1F2937' },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  metricLabel: { fontSize: 9, color: '#6B7280', fontWeight: '600' },
});
