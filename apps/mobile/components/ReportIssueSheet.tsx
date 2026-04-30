import { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { IssueCategory, IssueSeverity, CivicIssue } from '../lib/civicTypes';
import { ISSUE_CATEGORY_CONFIG, SEVERITY_CONFIG } from '../lib/civicTypes';
import { useAuthStore } from '../stores/auth';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';

const MAX_MEDIA = 5;

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
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const titleRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.user);
  const myHome = useMyConstituencyStore((s) => s.home);
  const stateCode = useActiveStateStore((s) => s.stateCode);

  useEffect(() => {
    if (visible) {
      setTimeout(() => titleRef.current?.focus(), 200);
    } else {
      setTitle('');
      setDescription('');
      setCategory('roads');
      setSeverity('medium');
      setMediaUris([]);
    }
  }, [visible]);

  const pickFromGallery = useCallback(async () => {
    if (mediaUris.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} photos.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to add evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - mediaUris.length,
    });
    if (!result.canceled && result.assets.length > 0) {
      setMediaUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_MEDIA));
    }
  }, [mediaUris]);

  const takePhoto = useCallback(async () => {
    if (mediaUris.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} photos.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to capture evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setMediaUris((prev) => [...prev, result.assets[0].uri].slice(0, MAX_MEDIA));
    }
  }, [mediaUris]);

  const removeMedia = useCallback((index: number) => {
    setMediaUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canSubmit = title.trim().length >= 5 && title.length <= 200;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString();
    const authorName = user?.email?.split('@')[0] ?? 'Anonymous';

    const newIssue: CivicIssue = {
      id: `issue-local-${Date.now()}`,
      reporterId: user?.id ?? 'anon',
      reporterName: authorName,
      stateCode,
      constituencyId: myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined,
      constituencyName: myHome?.name,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      severity,
      status: 'open',
      upvoteCount: 0,
      commentCount: 0,
      mediaUrls: mediaUris.length > 0 ? mediaUris : undefined,
      evidenceCount: mediaUris.length > 0 ? mediaUris.length : undefined,
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

          {/* Media Evidence */}
          <Text style={styles.fieldLabel}>Evidence (photos)</Text>
          <View style={styles.mediaRow}>
            {mediaUris.map((uri, idx) => (
              <View key={uri} style={styles.mediaThumbnailWrap}>
                <Image source={{ uri }} style={styles.mediaThumbnail} contentFit="cover" />
                <Pressable style={styles.mediaRemove} onPress={() => removeMedia(idx)} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))}
            {mediaUris.length < MAX_MEDIA && (
              <>
                <Pressable style={styles.mediaAddButton} onPress={pickFromGallery}>
                  <Ionicons name="images" size={22} color="#4F8EF7" />
                  <Text style={styles.mediaAddText}>Gallery</Text>
                </Pressable>
                <Pressable style={styles.mediaAddButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={22} color="#10B981" />
                  <Text style={styles.mediaAddText}>Camera</Text>
                </Pressable>
              </>
            )}
          </View>
          {mediaUris.length > 0 && (
            <Text style={styles.charHint}>{mediaUris.length}/{MAX_MEDIA} photos added</Text>
          )}

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
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbnailWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  mediaRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0A0A1A99',
    borderRadius: 10,
  },
  mediaAddButton: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#374151',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  mediaAddText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
});
