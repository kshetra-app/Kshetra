import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FactCheck } from '../lib/journalistTypes';
import { FACT_CHECK_CONFIG } from '../lib/journalistTypes';
import { useTheme } from '../lib/theme';

interface FactCheckCardProps {
  factCheck: FactCheck;
  onPress?: () => void;
  compact?: boolean;
}

export default function FactCheckCard({ factCheck, onPress, compact }: FactCheckCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const verdictConfig = FACT_CHECK_CONFIG[factCheck.verdict];

  if (compact) {
    return (
      <Pressable style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]} onPress={onPress}>
        <View style={[styles.verdictDot, { backgroundColor: verdictConfig.color }]} />
        <Text style={[styles.compactClaim, { color: colors.text }]} numberOfLines={1}>{factCheck.claimText}</Text>
        <Text style={[styles.compactVerdict, { color: verdictConfig.color }]}>{verdictConfig.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]} onPress={onPress}>
      <View style={[styles.verdictBanner, { backgroundColor: verdictConfig.color + '15' }]}>
        <Ionicons name={verdictConfig.icon as any} size={20} color={verdictConfig.color} />
        <Text style={[styles.verdictLabel, { color: verdictConfig.color }]}>{verdictConfig.emoji} {verdictConfig.label}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.claimLabel, { color: colors.textMuted }]}>{t('factCheckCard.claim')}</Text>
        <Text style={[styles.claimText, { color: colors.text }]}>"{factCheck.claimText}"</Text>
        <Text style={[styles.claimSource, { color: colors.textSecondary }]}>— {factCheck.claimSource}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.explanationLabel, { color: colors.textMuted }]}>{t('factCheckCard.explanation')}</Text>
        <Text style={[styles.explanation, { color: colors.textSecondary }]}>{factCheck.explanation}</Text>
        {factCheck.evidence.length > 0 && (
          <View style={styles.evidenceRow}>
            <Ionicons name="document-text" size={14} color={colors.textMuted} />
            <Text style={[styles.evidenceText, { color: colors.textMuted }]}>{t('factCheckCard.evidenceSources', { n: factCheck.evidence.length })}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, marginHorizontal: 16, marginVertical: 8, overflow: 'hidden', borderWidth: 1 },
  verdictBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  verdictLabel: { fontSize: 14, fontWeight: '800' },
  content: { padding: 16 },
  claimLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  claimText: { fontSize: 15, fontWeight: '600', fontStyle: 'italic', lineHeight: 22, marginBottom: 4 },
  claimSource: { fontSize: 12, marginBottom: 12 },
  divider: { height: 1, marginVertical: 12 },
  explanationLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  explanation: { fontSize: 14, lineHeight: 20 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  evidenceText: { fontSize: 12 },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginHorizontal: 16, marginVertical: 4, borderWidth: 1 },
  verdictDot: { width: 8, height: 8, borderRadius: 4 },
  compactClaim: { flex: 1, fontSize: 13 },
  compactVerdict: { fontSize: 12, fontWeight: '700' },
});
