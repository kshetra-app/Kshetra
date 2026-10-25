import { View, Text, StyleSheet } from 'react-native';
import { displayFactValue, type ProvenancedFact } from '../lib/dataTruth';

interface FactValueProps {
  label: string;
  fact: ProvenancedFact<string | number>;
}

/** Data-truth-aware display: a missing fact is never rendered as the number zero. */
export default function FactValue({ label, fact }: FactValueProps) {
  const provenance = fact.provenance;
  const sourceLabel = provenance.source?.name ?? 'Source not available';
  return (
    <View style={styles.container} accessibilityLabel={`${label}: ${displayFactValue(fact.value)}; status ${provenance.valueStatus}`}>
      <View style={styles.heading}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.status}>{provenance.valueStatus}</Text>
      </View>
      <Text style={styles.value}>{displayFactValue(fact.value)}</Text>
      <Text style={styles.meta}>{sourceLabel}</Text>
      <Text style={styles.meta}>
        {provenance.retrievedAt ? `Retrieved ${provenance.retrievedAt}` : 'Retrieval date not available'}
        {provenance.version ? ` · Version ${provenance.version}` : ' · Version not available'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 3, paddingVertical: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  status: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  value: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 10, opacity: 0.72 },
});
