import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendAIChat } from '../lib/aiService';

interface AIDashboardSummaryProps {
  constituencyName?: string;
  issues?: string[];
}

export default function AIDashboardSummary({ constituencyName, issues }: AIDashboardSummaryProps) {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
        <Text style={styles.title}>AI Insights</Text>
      </View>

      {/* Issue summary */}
      {constituencyName && issues && issues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Summary — {constituencyName}</Text>
          {summary ? (
            <>
              <Text style={styles.summaryText}>{summary}</Text>
              <Pressable onPress={() => setSummary(null)} style={styles.resetLink}>
                <Text style={styles.resetText}>Regenerate</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.actionButton, loading === 'issues' && styles.actionButtonDisabled]}
              onPress={fetchIssueSummary}
              disabled={loading === 'issues'}
            >
              {loading === 'issues' ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Ionicons name="flash" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.actionButtonText}>
                {loading === 'issues' ? 'Analyzing...' : `Summarize ${issues.length} issues`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Election trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Election Trend Analysis</Text>
        {trendAnalysis ? (
          <>
            <Text style={styles.summaryText}>{trendAnalysis}</Text>
            <Pressable onPress={() => setTrendAnalysis(null)} style={styles.resetLink}>
              <Text style={styles.resetText}>Regenerate</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.actionButton, loading === 'trends' && styles.actionButtonDisabled]}
            onPress={fetchTrendAnalysis}
            disabled={loading === 'trends'}
          >
            {loading === 'trends' ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : (
              <Ionicons name="trending-up" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.actionButtonText}>
              {loading === 'trends' ? 'Analyzing 3 elections...' : 'Analyze election trends'}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Powered by KSHETRA AI • Groq LLM
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  resetLink: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  resetText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B10',
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  disclaimer: {
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
