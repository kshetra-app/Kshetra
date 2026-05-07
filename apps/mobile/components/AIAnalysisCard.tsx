import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConstituencyAnalysis } from '../lib/aiService';

interface AIAnalysisCardProps {
  acNo: number;
  constituencyName: string;
  stateCode?: string;
}

export default function AIAnalysisCard({ acNo, constituencyName, stateCode = 'TS' }: AIAnalysisCardProps) {
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={16} color="#4F8EF7" />
          <Text style={styles.title}>AI Analysis</Text>
          <Pressable
            style={styles.refreshButton}
            onPress={() => { setAnalysis(null); setError(false); }}
          >
            <Ionicons name="refresh" size={14} color="#6B7280" />
          </Pressable>
        </View>
        <Text style={styles.analysisText}>{analysis}</Text>
        <Text style={styles.disclaimer}>
          AI-generated • Based on available election and demographic data
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color="#4F8EF7" />
        <Text style={styles.title}>AI Analysis</Text>
      </View>

      {error && (
        <Text style={styles.errorText}>
          Unable to generate analysis. Check your connection and API server.
        </Text>
      )}

      <Pressable
        style={[styles.generateButton, loading && styles.generateButtonDisabled]}
        onPress={fetchAnalysis}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#4F8EF7" />
            <Text style={styles.generateText}>Analyzing {constituencyName}...</Text>
          </>
        ) : (
          <>
            <Ionicons name="flash" size={16} color="#4F8EF7" />
            <Text style={styles.generateText}>
              Generate AI analysis for {constituencyName}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F8EF720',
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
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  analysisText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 10,
    color: '#4B5563',
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
    backgroundColor: '#4F8EF710',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F8EF7',
  },
});
