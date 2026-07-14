import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FactCheck } from '../lib/journalistTypes';
import { FACT_CHECK_CONFIG } from '../lib/journalistTypes';

interface FactCheckCardProps {
  factCheck: FactCheck;
  onPress?: () => void;
  compact?: boolean;
}

export default function FactCheckCard({ factCheck, onPress, compact }: FactCheckCardProps) {
  const { t } = useTranslation();
  const verdictConfig = FACT_CHECK_CONFIG[factCheck.verdict];

  if (compact) {
    return (
      <Pressable style={styles.compactCard} onPress={onPress}>
        <View style={[styles.verdictDot, { backgroundColor: verdictConfig.color }]} />
        <Text style={styles.compactClaim} numberOfLines={1}>{factCheck.claimText}</Text>
        <Text style={[styles.compactVerdict, { color: verdictConfig.color }]}>{verdictConfig.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.verdictBanner, { backgroundColor: verdictConfig.color + '15' }]}>
        <Ionicons name={verdictConfig.icon as any} size={20} color={verdictConfig.color} />
        <Text style={[styles.verdictLabel, { color: verdictConfig.color }]}>{verdictConfig.emoji} {verdictConfig.label}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.claimLabel}>{t('factCheckCard.claim')}</Text>
        <Text style={styles.claimText}>"{factCheck.claimText}"</Text>
        <Text style={styles.claimSource}>— {factCheck.claimSource}</Text>
        <View style={styles.divider} />
        <Text style={styles.explanationLabel}>{t('factCheckCard.explanation')}</Text>
        <Text style={styles.explanation}>{factCheck.explanation}</Text>
        {factCheck.evidence.length > 0 && (
          <View style={styles.evidenceRow}>
            <Ionicons name="document-text" size={14} color="#6B7280" />
            <Text style={styles.evidenceText}>{t('factCheckCard.evidenceSources', { n: factCheck.evidence.length })}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937' },
  verdictBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  verdictLabel: { fontSize: 14, fontWeight: '800' },
  content: { padding: 16 },
  claimLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1, marginBottom: 4 },
  claimText: { fontSize: 15, fontWeight: '600', color: '#E5E7EB', fontStyle: 'italic', lineHeight: 22, marginBottom: 4 },
  claimSource: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#1F2937', marginVertical: 12 },
  explanationLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1, marginBottom: 4 },
  explanation: { fontSize: 14, color: '#D1D5DB', lineHeight: 20 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  evidenceText: { fontSize: 12, color: '#6B7280' },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#111827', borderRadius: 10, marginHorizontal: 16, marginVertical: 4, borderWidth: 1, borderColor: '#1F2937' },
  verdictDot: { width: 8, height: 8, borderRadius: 4 },
  compactClaim: { flex: 1, fontSize: 13, color: '#D1D5DB' },
  compactVerdict: { fontSize: 12, fontWeight: '700' },
});
