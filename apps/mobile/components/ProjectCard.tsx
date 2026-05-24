import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DevelopmentProject } from '../lib/civicMetricsTypes';
import { PROJECT_CATEGORY_CONFIG, PROJECT_PHASE_CONFIG, formatCrores } from '../lib/civicMetricsTypes';

interface ProjectCardProps {
  project: DevelopmentProject;
  onPress?: () => void;
}

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  const catConfig = PROJECT_CATEGORY_CONFIG[project.category];
  const phaseConfig = PROJECT_PHASE_CONFIG[project.phase];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.catBadge, { backgroundColor: catConfig.color + '15' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: phaseConfig.color + '20' }]}>
          <View style={[styles.phaseDot, { backgroundColor: phaseConfig.color }]} />
          <Text style={[styles.phaseText, { color: phaseConfig.color }]}>{phaseConfig.label}</Text>
        </View>
      </View>

      <Text style={styles.name}>{project.name}</Text>
      <Text style={styles.location}>{project.districtName}, {project.stateCode}{project.constituencyAcNo ? ` · AC #${project.constituencyAcNo}` : ''}</Text>
      <Text style={styles.description} numberOfLines={2}>{project.description}</Text>

      {/* Progress bars */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Physical</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${project.physicalProgress}%`, backgroundColor: '#3B82F6' }]} />
          </View>
          <Text style={styles.progressPct}>{project.physicalProgress}%</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Financial</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${project.financialProgress}%`, backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.progressPct}>{project.financialProgress}%</Text>
        </View>
      </View>

      {/* Cost */}
      <View style={styles.costRow}>
        <View style={styles.costItem}>
          <Text style={styles.costLabel}>Sanctioned</Text>
          <Text style={styles.costValue}>{formatCrores(project.sanctionedCostCrores)}</Text>
        </View>
        {project.revisedCostCrores && (
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Revised</Text>
            <Text style={[styles.costValue, { color: '#F59E0B' }]}>{formatCrores(project.revisedCostCrores)}</Text>
          </View>
        )}
        <View style={styles.costItem}>
          <Text style={styles.costLabel}>Spent</Text>
          <Text style={styles.costValue}>{formatCrores(project.expenditureCrores)}</Text>
        </View>
      </View>

      {/* Delay + Expected */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar" size={12} color="#6B7280" />
          <Text style={styles.footerText}>Due: {project.expectedCompletion}</Text>
        </View>
        {project.delayDays > 0 && (
          <View style={styles.delayBadge}>
            <Ionicons name="warning" size={12} color="#EF4444" />
            <Text style={styles.delayText}>{project.delayDays} days delayed</Text>
          </View>
        )}
      </View>

      {/* Issues */}
      {project.issues.length > 0 && (
        <View style={styles.issuesRow}>
          <Ionicons name="alert-circle" size={12} color="#F59E0B" />
          <Text style={styles.issueText} numberOfLines={1}>{project.issues[0]}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catLabel: { fontSize: 10, fontWeight: '700' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  phaseText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  location: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  description: { fontSize: 13, color: '#9CA3AF', lineHeight: 18, marginBottom: 10 },
  progressSection: { marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  progressLabel: { fontSize: 11, color: '#9CA3AF', width: 56 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', width: 36, textAlign: 'right' },
  costRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, paddingVertical: 8, backgroundColor: '#0D1117', borderRadius: 8 },
  costItem: { alignItems: 'center' },
  costLabel: { fontSize: 10, color: '#6B7280' },
  costValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: '#6B7280' },
  delayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  delayText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  issuesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#F59E0B10', padding: 8, borderRadius: 8 },
  issueText: { fontSize: 11, color: '#F59E0B', flex: 1 },
});
