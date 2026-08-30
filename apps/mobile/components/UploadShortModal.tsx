import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';
import { usePoliticalShortsStore } from '../stores/politicalShorts';
import { STATES } from '@kshetra/shared';

interface UploadShortModalProps {
  visible: boolean;
  onClose: () => void;
}

// Preset real political YouTube video links for easy testing
const DEMO_VIDEO_PRESETS = [
  {
    label: 'Hyderabad Musi River Debate (Telugu News)',
    url: 'https://www.youtube.com/embed/FwVq8NqM_B8',
  },
  {
    label: 'Karnataka 5 Guarantee Schemes Discussion',
    url: 'https://www.youtube.com/embed/P6i2nQzWc94',
  },
  {
    label: 'Amaravati Capital Construction Progress',
    url: 'https://www.youtube.com/embed/d3_1y0H3Xrs',
  },
];

export default function UploadShortModal({ visible, onClose }: UploadShortModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Stores
  const kycRecord = useContributorVerificationStore((s) => s.kycRecord);
  const isVerified = kycRecord?.status === 'verified';
  const setShowKYCSheet = useContributorVerificationStore((s) => s.setShowKYCSheet);
  
  const myHome = useMyConstituencyStore((s) => s.home);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const addShort = usePoliticalShortsStore((s) => s.addShort);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [hashtagsStr, setHashtagsStr] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Derive State Name
  const stateName = useMemo(() => {
    return (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
  }, [stateCode]);

  const handleStartKYC = useCallback(() => {
    onClose();
    // Delay slightly to allow keyboard/modal to dismiss fully
    setTimeout(() => {
      setShowKYCSheet(true);
    }, 300);
  }, [onClose, setShowKYCSheet]);

  const handlePresetSelect = useCallback((url: string) => {
    setVideoUrl(url);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      Alert.alert(t('uploadShort.alertErrorTitle'), t('uploadShort.alertTitleRequired'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('uploadShort.alertErrorTitle'), t('uploadShort.alertDescriptionRequired'));
      return;
    }
    if (!videoUrl.trim() || !videoUrl.startsWith('http')) {
      Alert.alert(t('uploadShort.alertErrorTitle'), t('uploadShort.alertVideoUrlRequired'));
      return;
    }
    if (!acceptedTerms) {
      Alert.alert(t('uploadShort.alertErrorTitle'), t('uploadShort.alertTermsRequired'));
      return;
    }
    if (!myHome) {
      Alert.alert(t('uploadShort.alertErrorTitle'), t('uploadShort.alertConstituencyRequired'));
      return;
    }

    setLoading(true);

    // Simulate video compression & upload network latency
    setTimeout(() => {
      const parsedTags = hashtagsStr
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter((tag) => tag.length > 0);

      // Add default state tag
      if (!parsedTags.includes(stateName)) {
        parsedTags.push(stateName);
      }

      addShort({
        title,
        description,
        channelName: kycRecord?.fullLegalName || 'Verified Contributor',
        channelVerified: true,
        stateCode,
        stateName,
        constituencyId: `${stateCode}-AC-${myHome.acNo}`,
        districtName: myHome.district,
        hashtags: parsedTags,
        duration: 45, // default mockup duration
        videoUrl,
        gradientColors: ['#0F2027', '#203A43'], // fallback gradient
        stateAccent: '#4F8EF7',
        uploadedBy: kycRecord?.userId || 'user-id',
      });

      setLoading(false);
      Alert.alert(t('uploadShort.alertSuccessTitle'), t('uploadShort.alertSuccessMessage'), [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setTitle('');
            setDescription('');
            setVideoUrl('');
            setHashtagsStr('');
            setAcceptedTerms(false);
            onClose();
          },
        },
      ]);
    }, 1500);
  }, [title, description, videoUrl, hashtagsStr, acceptedTerms, myHome, stateCode, stateName, kycRecord, addShort, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Unverified State */}
        {!isVerified ? (
          <View style={[styles.kycGateContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.kycGateHeader}>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.kycGateContent}>
              <View style={styles.shieldIconContainer}>
                <Ionicons name="shield-checkmark" size={60} color="#F59E0B" />
              </View>
              
              <Text style={styles.kycGateTitle}>{t('uploadShort.creatorVerification')}</Text>
              
              <Text style={styles.kycGateText}>
                To ensure content integrity, avoid legal hassles, and build community trust, Kshetra enforces strict Content Creator Accountability (CCA) norms.
              </Text>
              
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Ionicons name="finger-print" size={18} color="#F59E0B" style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{t('uploadShort.verifyBullet1')}</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Ionicons name="phone-portrait" size={18} color="#F59E0B" style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{t('uploadShort.verifyBullet2')}</Text>
                </View>
                <View style={styles.bulletItem}>
                  <Ionicons name="lock-closed" size={18} color="#F59E0B" style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{t('uploadShort.verifyBullet3')}</Text>
                </View>
              </View>

              <Pressable style={styles.kycButton} onPress={handleStartKYC}>
                <Text style={styles.kycButtonText}>{t('uploadShort.startVerification')}</Text>
              </Pressable>

              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>{t('uploadShort.maybeLater')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Verified Upload State */
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('uploadShort.title')}</Text>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Target Location Binding Banner */}
              <View style={styles.bindingBanner}>
                <Ionicons name="location" size={18} color="#4F8EF7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bindingTitle}>{t('uploadShort.constituencyLocked')}</Text>
                  <Text style={styles.bindingText}>
                    Uploading to: <Text style={styles.bindingHighlight}>{myHome ? `${myHome.name} (${stateName})` : 'No home constituency set'}</Text>
                  </Text>
                  <Text style={styles.bindingNotice}>
                    To prevent astroturfing, you can only upload shorts to your verified constituency.
                  </Text>
                </View>
                <Ionicons name="lock-closed" size={14} color="#6B7280" />
              </View>

              {/* Title input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('uploadShort.inputTitle')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g., Reality check on local infrastructure"
                  placeholderTextColor="#4B5563"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                />
                <Text style={styles.charCount}>{title.length}/80</Text>
              </View>

              {/* Description input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('uploadShort.inputDescription')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Explain the political context or civic issue..."
                  placeholderTextColor="#4B5563"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.charCount}>{description.length}/200</Text>
              </View>

              {/* Video URL input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('uploadShort.youtubeUrl')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g., https://www.youtube.com/embed/..."
                  placeholderTextColor="#4B5563"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Presets for easy demo/testing */}
              <View style={styles.presetsContainer}>
                <Text style={styles.presetsLabel}>{t('uploadShort.presets')}</Text>
                {DEMO_VIDEO_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.url}
                    style={[styles.presetItem, videoUrl === preset.url && styles.presetItemActive]}
                    onPress={() => handlePresetSelect(preset.url)}
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={16}
                      color={videoUrl === preset.url ? '#4F8EF7' : '#9CA3AF'}
                    />
                    <Text style={[styles.presetText, videoUrl === preset.url && styles.presetTextActive]} numberOfLines={1}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Hashtags input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('uploadShort.hashtags')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g., MusiCleanup, HydMetro"
                  placeholderTextColor="#4B5563"
                  value={hashtagsStr}
                  onChangeText={setHashtagsStr}
                />
              </View>

              {/* Accountability Sign-off Checkbox */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I certify that this political content is accurate and does not violate the platform rules. I agree that my device fingerprint, IP, and location are signed with this action for forensic content accountability.
                </Text>
              </Pressable>

              {/* Submit Button */}
              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>{t('uploadShort.uploadButton')}</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8DED1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#241814',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },

  // ── Target Binding Banner ────────────────────────────────────
  bindingBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED1',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  bindingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F8EF7',
    marginBottom: 2,
  },
  bindingText: {
    fontSize: 12,
    color: '#6D5549',
  },
  bindingHighlight: {
    fontWeight: '800',
    color: '#241814',
  },
  bindingNotice: {
    fontSize: 11,
    color: '#6D5549',
    marginTop: 4,
    lineHeight: 14,
  },

  // ── Input Elements ───────────────────────────────────────────
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D5549',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#241814',
    fontSize: 14,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#988275',
    marginTop: -4,
  },

  // ── Demo Presets ─────────────────────────────────────────────
  presetsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5549',
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E8DED1',
  },
  presetItemActive: {
    backgroundColor: 'rgba(79, 142, 247, 0.15)',
    borderWidth: 0.5,
    borderColor: '#4F8EF7',
  },
  presetText: {
    flex: 1,
    fontSize: 12,
    color: '#6D5549',
  },
  presetTextActive: {
    color: '#241814',
    fontWeight: '700',
  },

  // ── Agreement check ──────────────────────────────────────────
  checkboxRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#4F8EF7',
    borderColor: '#4F8EF7',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: '#6D5549',
    lineHeight: 16,
  },

  // ── Submit button ────────────────────────────────────────────
  submitButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#241814',
  },

  // ── KYC Gate UI ──────────────────────────────────────────────
  kycGateContainer: {
    flex: 1,
    backgroundColor: '#0A0A15',
    paddingHorizontal: 24,
  },
  kycGateHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  kycGateContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  kycGateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#241814',
    marginBottom: 10,
    textAlign: 'center',
  },
  kycGateText: {
    fontSize: 14,
    color: '#6D5549',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  bulletList: {
    width: '100%',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E8DED1',
    marginBottom: 30,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletIcon: {
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#241814',
    lineHeight: 16,
  },
  kycButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#988275',
    fontWeight: '700',
  },
});
