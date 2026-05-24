import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FlywheelStep } from '../lib/electionLiveTypes';

interface FlywheelVisualizationProps {
  steps: FlywheelStep[];
}

export default function FlywheelVisualization({ steps }: FlywheelVisualizationProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>The Kshetra Flywheel</Text>
      <Text style={styles.subtitle}>Self-reinforcing growth engine</Text>

      {steps.map((step, idx) => (
        <View key={step.id} style={styles.stepCard}>
          {/* Connector line */}
          {idx > 0 && <View style={styles.connector} />}
          {idx < steps.length - 1 && idx > 0 && null}

          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: step.color + '20' }]}>
              <Ionicons name={step.icon as any} size={20} color={step.color} />
            </View>
            <View style={styles.stepNumber}>
              <Text style={[styles.stepNumberText, { color: step.color }]}>{idx + 1}</Text>
            </View>
          </View>

          <Text style={[styles.stepLabel, { color: step.color }]}>{step.label}</Text>
          <Text style={styles.stepDesc}>{step.description}</Text>

          {/* Metrics */}
          <View style={styles.metricsRow}>
            {step.metrics.map((m) => (
              <View key={m.label} style={styles.metricPill}>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Ionicons
                  name={m.trend === 'up' ? 'arrow-up' : m.trend === 'down' ? 'arrow-down' : 'remove'}
                  size={10}
                  color={m.trend === 'up' ? '#10B981' : m.trend === 'down' ? '#EF4444' : '#6B7280'}
                />
              </View>
            ))}
          </View>

          {/* Arrow to next */}
          {idx < steps.length - 1 && (
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-down" size={20} color={step.color} />
            </View>
          )}
        </View>
      ))}

      {/* Loop-back arrow */}
      <View style={styles.loopBack}>
        <Ionicons name="refresh" size={24} color="#4F8EF7" />
        <Text style={styles.loopText}>Cycle repeats — each revolution increases network effects</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  stepCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: '#1F2937' },
  connector: { position: 'absolute', top: -8, left: '50%', width: 2, height: 8, backgroundColor: '#1F2937' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '900' },
  stepLabel: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  stepDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, marginBottom: 8 },
  metricsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metricPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0D1117', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  metricValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  metricLabel: { fontSize: 10, color: '#6B7280' },
  arrowContainer: { alignItems: 'center', marginTop: 8 },
  loopBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: 12, backgroundColor: '#4F8EF710', borderRadius: 12 },
  loopText: { fontSize: 12, color: '#4F8EF7', fontWeight: '600', flex: 1 },
});
