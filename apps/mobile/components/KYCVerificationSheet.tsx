import { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import { useAuthStore } from '../stores/auth';
import { submitKYC } from '../lib/contentAccountability';
import {
  isValidIndianPhone,
  getKYCCompleteness,
  KYC_STATUS_CONFIG,
} from '../lib/contentAccountabilityTypes';

export default function KYCVerificationSheet() {
  const visible = useContributorVerificationStore((s) => s.showKYCSheet);
  const kycLoading = useContributorVerificationStore((s) => s.kycLoading);
  const setShowKYCSheet = useContributorVerificationStore((s) => s.setShowKYCSheet);
  const kycRecord = useContributorVerificationStore((s) => s.kycRecord);
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState<'info' | 'selfie' | 'terms' | 'done'>('info');

  useEffect(() => {
    if (!visible) {
      setStep('info');
    }
  }, [visible]);

  const completeness = getKYCCompleteness({
    fullLegalName: fullName,
    phoneNumber: phone,
    selfieUri,
    termsAccepted,
  });

  const takeSelfie = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Camera access is required for identity verification. Please grant camera permission in your device settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelfieUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = async () => {
    if (completeness.percent < 100) {
      Alert.alert('Incomplete', `Please complete: ${completeness.missing.join(', ')}`);
      return;
    }

    const userId = user?.id ?? 'anon';
    const success = await submitKYC(userId, {
      fullLegalName: fullName,
      phoneNumber: phone,
      selfieUri,
    });

    if (success) {
      setStep('done');
      setTimeout(() => setShowKYCSheet(false), 1500);
    }
  };

  const onClose = () => {
    if (!kycLoading) {
      setShowKYCSheet(false);
    }
  };

  // If already verified, show status
  if (kycRecord?.status === 'verified') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} disabled={kycLoading}>
            <Ionicons name="close" size={24} color={kycLoading ? '#374151' : '#9CA3AF'} />
          </Pressable>
          <Text style={styles.headerTitle}>Contributor Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        {step === 'done' ? (
          <View style={styles.doneContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#10B981" />
            <Text style={styles.doneTitle}>Verified!</Text>
            <Text style={styles.doneSubtitle}>
              You can now post, comment, and contribute to the platform.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Why we need this */}
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={20} color="#4F8EF7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Why is this needed?</Text>
                <Text style={styles.infoText}>
                  To maintain platform credibility and prevent misuse, we verify the identity of all content creators. Your details are encrypted, stored securely, and only accessed during legal investigations.
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${completeness.percent}%` }]} />
              </View>
              <Text style={styles.progressText}>{completeness.percent}%</Text>
            </View>

            {/* Step 1: Personal Info */}
            {(step === 'info' || step === 'selfie' || step === 'terms') && (
              <>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <Text style={styles.fieldLabel}>Full Legal Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="As per government ID (Aadhaar / PAN / Voter ID)"
                  placeholderTextColor="#4B5563"
                  value={fullName}
                  onChangeText={setFullName}
                  maxLength={100}
                  autoCapitalize="words"
                  editable={step === 'info'}
                />

                <Text style={styles.fieldLabel}>Phone Number *</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#4B5563"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                    keyboardType="phone-pad"
                    editable={step === 'info'}
                  />
                </View>
                {phone.length > 0 && !isValidIndianPhone(phone) && (
                  <Text style={styles.errorText}>Enter a valid 10-digit Indian mobile number</Text>
                )}

                {step === 'info' && (
                  <Pressable
                    style={[
                      styles.nextButton,
                      (!fullName.trim() || !isValidIndianPhone(phone)) && styles.buttonDisabled,
                    ]}
                    onPress={() => setStep('selfie')}
                    disabled={!fullName.trim() || !isValidIndianPhone(phone)}
                  >
                    <Text style={styles.nextButtonText}>Next: Selfie Verification</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </>
            )}

            {/* Step 2: Selfie */}
            {(step === 'selfie' || step === 'terms') && (
              <>
                <Text style={styles.sectionTitle}>Selfie Verification</Text>
                <Text style={styles.fieldHint}>
                  Take a clear front-facing photo for identity verification. This helps us trace accountability in case of misuse.
                </Text>

                {selfieUri ? (
                  <View style={styles.selfiePreview}>
                    <Image source={{ uri: selfieUri }} style={styles.selfieImage} contentFit="cover" />
                    <Pressable
                      style={styles.retakeButton}
                      onPress={takeSelfie}
                    >
                      <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                      <Text style={styles.retakeText}>Retake</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.selfieButton} onPress={takeSelfie}>
                    <Ionicons name="camera" size={32} color="#4F8EF7" />
                    <Text style={styles.selfieButtonText}>Take Selfie</Text>
                    <Text style={styles.selfieButtonHint}>Front camera • Clear face</Text>
                  </Pressable>
                )}

                {step === 'selfie' && (
                  <View style={styles.buttonRow}>
                    <Pressable style={styles.backButton} onPress={() => setStep('info')}>
                      <Ionicons name="arrow-back" size={16} color="#9CA3AF" />
                      <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.nextButton, !selfieUri && styles.buttonDisabled]}
                      onPress={() => setStep('terms')}
                      disabled={!selfieUri}
                    >
                      <Text style={styles.nextButtonText}>Next: Terms</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {/* Step 3: Terms & Submit */}
            {step === 'terms' && (
              <>
                <Text style={styles.sectionTitle}>Accountability Agreement</Text>

                <View style={styles.termsBox}>
                  <Text style={styles.termsText}>
                    By proceeding, I acknowledge and agree that:
                  </Text>
                  <Text style={styles.termsBullet}>
                    {'\u2022'} My identity (name, phone, photo) will be recorded and securely stored.
                  </Text>
                  <Text style={styles.termsBullet}>
                    {'\u2022'} My device information, IP address, and location will be captured with every content action I perform.
                  </Text>
                  <Text style={styles.termsBullet}>
                    {'\u2022'} This data may be shared with law enforcement agencies if my content is found to violate Indian law (IT Act 2000, IPC, etc.).
                  </Text>
                  <Text style={styles.termsBullet}>
                    {'\u2022'} I am solely responsible for all content I post, and I will not post defamatory, fake, or illegal content.
                  </Text>
                  <Text style={styles.termsBullet}>
                    {'\u2022'} False or misleading verification details may result in permanent ban and legal action.
                  </Text>
                </View>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                >
                  <Ionicons
                    name={termsAccepted ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={termsAccepted ? '#10B981' : '#6B7280'}
                  />
                  <Text style={styles.checkboxText}>
                    I have read and agree to the above terms of accountability
                  </Text>
                </Pressable>

                <View style={styles.captureNotice}>
                  <Ionicons name="finger-print" size={16} color="#F59E0B" />
                  <Text style={styles.captureNoticeText}>
                    Your device info, network details, and location will be captured now.
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable style={styles.backButton} onPress={() => setStep('selfie')}>
                    <Ionicons name="arrow-back" size={16} color="#9CA3AF" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.submitButton,
                      (!termsAccepted || kycLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!termsAccepted || kycLoading}
                  >
                    {kycLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>Verify & Continue</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        )}
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
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#4F8EF710',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4F8EF720',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F8EF7',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    width: 36,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  selfieButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4F8EF730',
    borderStyle: 'dashed',
    gap: 6,
  },
  selfieButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  selfieButtonHint: {
    fontSize: 11,
    color: '#6B7280',
  },
  selfiePreview: {
    alignItems: 'center',
    gap: 8,
  },
  selfieImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  termsBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 6,
  },
  termsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  termsBullet: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    paddingLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
  },
  checkboxText: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
    fontWeight: '600',
  },
  captureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F59E0B10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B20',
  },
  captureNoticeText: {
    fontSize: 11,
    color: '#F59E0B',
    flex: 1,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F8EF7',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  doneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
  },
  doneSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
