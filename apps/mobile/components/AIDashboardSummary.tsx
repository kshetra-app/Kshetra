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
import { sendAIChat } from '../lib/aiService';
import { useTheme } from '../lib/theme';

interface AIDashboardSummaryProps {
  constituencyName?: string;
  issues?: string[];
}

export default function AIDashboardSummary({ constituencyName, issues }: AIDashboardSummaryProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<string | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState<'issues' | 'trends' | null>(null);

  const fetchIssueSummary = useCallback(async () => {
    if (!constituencyName || !issues || issues.length === 0) return;
    setLoading('issues');

    try {
      const prompt = `Summarize these ${issues.length} civic issues reported in ${constituencyName} constituency in 100 words. Identify patterns, severity, and suggest priorities:\n\n${issues.join('\n')}`;
      const result = await sendAIChat([{ role: 'user', content: prompt }]);
      setSummary(result.response ?? 'Unable to generate summary.');
    } catch {
      setSummary('Failed to generate summary. Check connection.');
    } finally {
      setLoading(null);
    }
  }, [constituencyName, issues]);

  const fetchTrendAnalysis = useCallback(async () => {
    setLoading('trends');
    try {
      const prompt = 'Analyze key election trends across Indian state assemblies in 150 words. Cover anti-incumbency patterns, regional party performance, voter turnout shifts, and coalition dynamics from recent elections (2021-2024).';
      const result = await sendAIChat([{ role: 'user', content: prompt }]);
      setTrendAnalysis(result.response ?? 'Unable to generate analysis.');
    } catch {
      setTrendAnalysis('Failed to connect. Check network.');
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, shadowColor: colors.shadowColor }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.title, { color: colors.text }]}>{t('ai.insights')}</Text>
      </View>

      {/* Issue summary */}
      {constituencyName && issues && issues.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('ai.issueSummary')} — {constituencyName}</Text>
          {summary ? (
            <>
              <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
              <Pressable onPress={() => setSummary(null)} style={styles.resetLink}>
                <Text style={[styles.resetText, { color: colors.primary }]}>{t('ai.regenerate')}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary }, loading === 'issues' && styles.actionButtonDisabled]}
              onPress={fetchIssueSummary}
              disabled={loading === 'issues'}
            >
              {loading === 'issues' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="flash" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.actionButtonText}>
                {loading === 'issues' ? t('ai.analyzing') + '...' : `${t('ai.summarize')} ${issues.length} ${t('ai.issuesLabel')}`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Election trends */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('ai.trendAnalysis')}</Text>
        {trendAnalysis ? (
          <>
            <Text style={[styles.summaryText, { color: colors.text }]}>{trendAnalysis}</Text>
            <Pressable onPress={() => setTrendAnalysis(null)} style={styles.resetLink}>
              <Text style={[styles.resetText, { color: colors.primary }]}>{t('ai.regenerate')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }, loading === 'trends' && styles.actionButtonDisabled]}
            onPress={fetchTrendAnalysis}
            disabled={loading === 'trends'}
          >
            {loading === 'trends' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="trending-up" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.actionButtonText}>
              {loading === 'trends' ? t('ai.analyzing') + '...' : t('ai.analyzeTrends')}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {t('ai.poweredBy')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
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
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
  },
  resetLink: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
