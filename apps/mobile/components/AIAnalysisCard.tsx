import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConstituencyAnalysis } from '../lib/aiService';
import { useTheme } from '../lib/theme';

interface AIAnalysisCardProps {
  acNo: number;
  constituencyName: string;
  stateCode?: string;
}

export default function AIAnalysisCard({ acNo, constituencyName, stateCode = 'TS' }: AIAnalysisCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (loading || analysis) return;
    setLoading(true);
    setError(false);

    try {
      const result = await getConstituencyAnalysis(constituencyName, acNo, stateCode);
      setAnalysis(result || 'No analysis available.');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [acNo, constituencyName, loading, analysis]);

  if (analysis) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, shadowColor: colors.shadowColor }]}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{t('ai.analysis')}</Text>
          <Pressable
            style={styles.refreshButton}
            onPress={() => { setAnalysis(null); setError(false); }}
          >
            <Ionicons name="refresh" size={14} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.analysisText, { color: colors.text }]}>{analysis}</Text>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          {t('ai.disclaimer')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, shadowColor: colors.shadowColor }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>AI Analysis</Text>
      </View>

      {error && (
        <Text style={styles.errorText}>
          {t('ai.errorText')}
        </Text>
      )}

      <Pressable
        style={[styles.generateButton, { backgroundColor: colors.primary }, loading && styles.generateButtonDisabled]}
        onPress={fetchAnalysis}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.generateText}>{t('ai.analyzing')} {constituencyName}...</Text>
          </>
        ) : (
          <>
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.generateText}>
              {t('ai.generate')} {constituencyName}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 10,
    marginTop: 10,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
