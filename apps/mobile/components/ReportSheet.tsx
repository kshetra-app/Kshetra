import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportSubmission,
} from '../lib/moderationTypes';
import { gateContentAction, logContentAction } from '../lib/contentAccountability';

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  targetLabel?: string;
}

export default function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setDescription('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!reason) return;
    if (!gateContentAction('submit_report')) return;

    const report: ReportSubmission = {
      targetType,
      targetId,
      reason,
      description: description.trim() || undefined,
    };

    setSubmitting(true);

    // In production: send to API /api/v1/reports
    // For now, simulate success
    logContentAction('submit_report', { type: targetType, id: targetId, body: reason, screenName: 'report' });
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. Our moderators will review this report.',
        [{ text: 'OK', onPress: onClose }],
      );
    }, 500);
  };

  const canSubmit = reason !== null && !submitting;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
          <Text style={styles.headerTitle}>Report {targetType}</Text>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitText}>
              {submitting ? 'Sending...' : 'Submit'}
            </Text>
          </Pressable>
        </View>

        {/* Context */}
        {targetLabel && (
          <View style={styles.contextBadge}>
            <Ionicons name="information-circle" size={14} color="#4F8EF7" />
            <Text style={styles.contextText} numberOfLines={1}>
              Reporting: {targetLabel}
            </Text>
          </View>
        )}

        {/* Reason selection */}
        <Text style={styles.sectionLabel}>Why are you reporting this?</Text>
        <View style={styles.reasonList}>
          {REPORT_REASONS.map((r) => {
            const active = reason === r.key;
            return (
              <Pressable
                key={r.key}
                style={[styles.reasonRow, active && styles.reasonRowActive]}
                onPress={() => setReason(r.key)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={20}
                  color={active ? '#EF4444' : '#6B7280'}
                />
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                  {r.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color="#EF4444" style={styles.checkIcon} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Additional details */}
        <Text style={styles.sectionLabel}>Additional details (optional)</Text>
        <TextInput
          style={styles.descInput}
          placeholder="Provide more context to help our moderators..."
          placeholderTextColor="#4B5563"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={16} color="#4F8EF7" />
          <Text style={styles.infoText}>
            Reports are reviewed by our moderation team within 24 hours. False reports may affect your reputation score.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  reasonList: {
    gap: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  reasonRowActive: {
    backgroundColor: '#EF444410',
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    flex: 1,
  },
  reasonTextActive: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  descInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#1F2937',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#4F8EF710',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    flex: 1,
  },
});
