import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InvestorDemoMetric } from '../lib/electionLiveTypes';

interface InvestorMetricCardProps {
  metric: InvestorDemoMetric;
}

export default function InvestorMetricCard({ metric }: InvestorMetricCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: metric.color }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: metric.color + '20' }]}>
          <Ionicons name={metric.icon as any} size={18} color={metric.color} />
        </View>
        {metric.changePercent !== undefined && (
          <View style={[styles.changeBadge, { backgroundColor: metric.trend === 'up' ? '#10B98120' : metric.trend === 'down' ? '#EF444420' : '#6B728020' }]}>
            <Ionicons
              name={metric.trend === 'up' ? 'arrow-up' : metric.trend === 'down' ? 'arrow-down' : 'remove'}
              size={10}
              color={metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : '#6B7280'}
            />
            <Text style={[styles.changeText, { color: metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : '#6B7280' }]}>
              {metric.changePercent.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{metric.value}</Text>
      <Text style={styles.label}>{metric.label}</Text>
      <Text style={styles.description}>{metric.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1F2937', borderLeftWidth: 3, width: '48%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  changeText: { fontSize: 10, fontWeight: '700' },
  value: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
  label: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 2 },
  description: { fontSize: 10, color: '#6B7280', lineHeight: 14 },
});
