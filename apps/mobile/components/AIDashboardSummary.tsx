import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../lib/constants';

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
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/summarize-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constituencyName, issues }),
      });
      const data = await res.json();
      setSummary(data.summary ?? 'Unable to generate summary.');
    } catch {
      setSummary('Failed to generate summary. Check API connection.');
    } finally {
      setLoading(null);
    }
  }, [constituencyName, issues]);

  const fetchTrendAnalysis = useCallback(async () => {
    setLoading('trends');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/analyze/trends`);
      const data = await res.json();
      setTrendAnalysis(data.analysis ?? 'Unable to generate analysis.');
    } catch {
      setTrendAnalysis('Failed to connect. Check API server.');
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color="#F59E0B" />
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
                <Ionicons name="flash" size={14} color="#F59E0B" />
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
              <Ionicons name="trending-up" size={14} color="#F59E0B" />
            )}
            <Text style={styles.actionButtonText}>
              {loading === 'trends' ? 'Analyzing 3 elections...' : 'Analyze election trends'}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Powered by KSHETRA AI • Requires API server connection
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
    gap: 6,
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
    gap: 6,
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
