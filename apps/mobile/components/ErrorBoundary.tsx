import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18next from 'i18next';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showLogs: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showLogs: true, // Default to open so user and developer see the real log immediately
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleShareLog = async () => {
    const { error, errorInfo } = this.state;
    const logDetails = [
      `=== KSHETRA RUNTIME ERROR LOG ===`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}`,
      `\n--- JS Stack Trace ---`,
      error?.stack || 'No JS stack available',
      `\n--- Component Stack ---`,
      errorInfo?.componentStack || 'No component stack available',
    ].join('\n');

    try {
      await Share.share({
        message: logDetails,
        title: 'Kshetra Crash Diagnostics',
      });
    } catch {
      Alert.alert('Error Log', logDetails);
    }
  };

  toggleLogs = () => {
    this.setState((prev) => ({ showLogs: !prev.showLogs }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showLogs } = this.state;
      const errorMessage = error?.message || this.props.fallbackMessage || 'An unexpected error occurred.';
      const errorStack = error?.stack || '';
      const componentStack = errorInfo?.componentStack || '';

      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="warning" size={40} color="#EF4444" />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Kshetra encountered an issue while loading this screen.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.retryButton} onPress={this.handleRetry}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>

            <Pressable style={styles.shareButton} onPress={this.handleShareLog}>
              <Ionicons name="share-outline" size={16} color="#4F8EF7" />
              <Text style={styles.shareText}>Copy / Share Log</Text>
            </Pressable>

            <Pressable style={styles.toggleButton} onPress={this.toggleLogs}>
              <Ionicons
                name={showLogs ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9CA3AF"
              />
              <Text style={styles.toggleText}>
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </Text>
            </Pressable>
          </View>

          {/* Real-time Diagnostics / Logs Window */}
          {showLogs && (
            <View style={styles.logWindow}>
              <View style={styles.logHeader}>
                <Ionicons name="terminal-outline" size={16} color="#10B981" />
                <Text style={styles.logTitle}>Crash Diagnostics & Stack Trace</Text>
              </View>
              <ScrollView
                style={styles.logScroll}
                contentContainerStyle={styles.logContent}
                nestedScrollEnabled={true}
              >
                <Text style={styles.errorHighlight} selectable={true}>
                  {error?.name ? `${error.name}: ` : ''}{errorMessage}
                </Text>

                {errorStack ? (
                  <>
                    <Text style={styles.sectionHeader}>JS Stack Trace:</Text>
                    <Text style={styles.stackText} selectable={true}>
                      {errorStack}
                    </Text>
                  </>
                ) : null}

                {componentStack ? (
                  <>
                    <Text style={styles.sectionHeader}>Component Hierarchy:</Text>
                    <Text style={styles.stackText} selectable={true}>
                      {componentStack.trim()}
                    </Text>
                  </>
                ) : null}
              </ScrollView>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F8EF7',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  logWindow: {
    flex: 1,
    backgroundColor: '#030712',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    gap: 6,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
    fontFamily: 'monospace',
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: 12,
  },
  errorHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F87171',
    fontFamily: 'monospace',
    marginBottom: 10,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  stackText: {
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: 'monospace',
    lineHeight: 16,
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
  },
});
