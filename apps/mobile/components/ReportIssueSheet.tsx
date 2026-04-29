import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IssueCategory, IssueSeverity, CivicIssue } from '../lib/civicTypes';
import { ISSUE_CATEGORY_CONFIG, SEVERITY_CONFIG } from '../lib/civicTypes';
import { useAuthStore } from '../stores/auth';
import { useMyConstituencyStore } from '../stores/myConstituency';

interface ReportIssueSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (issue: CivicIssue) => void;
}

const CATEGORIES = Object.entries(ISSUE_CATEGORY_CONFIG) as [IssueCategory, typeof ISSUE_CATEGORY_CONFIG[IssueCategory]][];
const SEVERITIES = Object.entries(SEVERITY_CONFIG) as [IssueSeverity, typeof SEVERITY_CONFIG[IssueSeverity]][];

export default function ReportIssueSheet({ visible, onClose, onSubmit }: ReportIssueSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('roads');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const titleRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.user);
  const myHome = useMyConstituencyStore((s) => s.home);

  useEffect(() => {
    if (visible) {
      setTimeout(() => titleRef.current?.focus(), 200);
    } else {
      setTitle('');
      setDescription('');
      setCategory('roads');
      setSeverity('medium');
    }
  }, [visible]);

  const canSubmit = title.trim().length >= 5 && title.length <= 200;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString();
    const authorName = user?.email?.split('@')[0] ?? 'Anonymous';

    const newIssue: CivicIssue = {
      id: `issue-local-${Date.now()}`,
      reporterId: user?.id ?? 'anon',
      reporterName: authorName,
      stateCode: 'TS',
      constituencyId: myHome ? `TS-AC-${myHome.acNo}` : undefined,
      constituencyName: myHome?.name,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      severity,
      status: 'open',
      upvoteCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    onSubmit(newIssue);
    onClose();
  };

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
          <Text style={styles.headerTitle}>Report Issue</Text>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Constituency badge */}
          {myHome && (
            <View style={styles.constituencyBadge}>
              <Ionicons name="location" size={14} color="#4F8EF7" />
              <Text style={styles.constituencyBadgeText}>
                Reporting in {myHome.name}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            ref={titleRef}
            style={styles.titleInput}
            placeholder="Brief description of the issue"
            placeholderTextColor="#4B5563"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Text style={styles.charHint}>{title.length}/200</Text>

          {/* Description */}
          <Text style={styles.fieldLabel}>Details</Text>
          <TextInput
            style={styles.descInput}
            placeholder="Provide more context, location details, how long the issue has persisted..."
            placeholderTextColor="#4B5563"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category *</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map(([key, config]) => {
              const active = category === key;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.chip,
                    active && { backgroundColor: config.color + '20', borderColor: config.color + '40' },
                  ]}
                  onPress={() => setCategory(key)}
                >
                  <Ionicons name={config.icon as any} size={14} color={active ? config.color : '#6B7280'} />
                  <Text style={[styles.chipText, active && { color: config.color }]}>{config.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Severity */}
          <Text style={styles.fieldLabel}>Severity</Text>
          <View style={styles.severityRow}>
            {SEVERITIES.map(([key, config]) => {
              const active = severity === key;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.severityChip,
                    active && { backgroundColor: config.color + '20', borderColor: config.color + '40' },
                  ]}
                  onPress={() => setSeverity(key)}
                >
                  <Text style={[styles.severityChipText, active && { color: config.color }]}>
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#10B981',
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
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  constituencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  constituencyBadgeText: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 6,
  },
  titleInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  charHint: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'right',
    marginTop: 2,
  },
  descInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#1F2937',
    lineHeight: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  severityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  severityChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
});
