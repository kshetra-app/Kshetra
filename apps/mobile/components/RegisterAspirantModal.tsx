/**
 * RegisterAspirantModal — registration form for the "Become an Aspirant" flow.
 * Collects a public civic profile and creates it via the aspirant store.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspirantStore } from '../stores/aspirant';
import { useActiveStateStore } from '../stores/activeState';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import { STATES } from '@kshetra/shared';

interface RegisterAspirantModalProps {
  visible: boolean;
  onClose: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const ELECTION_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3, CURRENT_YEAR + 4];

export default function RegisterAspirantModal({ visible, onClose }: RegisterAspirantModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const registerAsAspirant = useAspirantStore((s: any) => s.registerAsAspirant);
  const stateCode = useActiveStateStore((s: any) => s.stateCode) as string;
  const myHome = useMyConstituencyStore((s: any) => s.home) as
    | { acNo: number; name: string; district?: string }
    | null;
  const kycRecord = useContributorVerificationStore((s: any) => s.kycRecord);

  const stateName = useMemo(
    () => (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode,
    [stateCode],
  );

  const [displayName, setDisplayName] = useState(kycRecord?.fullLegalName ?? '');
  const [bio, setBio] = useState('');
  const [constituency, setConstituency] = useState(myHome?.name ?? '');
  const [year, setYear] = useState<number>(ELECTION_YEARS[1]);
  const [isIndependent, setIsIndependent] = useState(true);
  const [party, setParty] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!displayName.trim()) {
      Alert.alert(t('aspirantReg.nameRequired'), t('aspirantReg.nameRequiredMsg'));
      return;
    }
    if (!bio.trim()) {
      Alert.alert(t('aspirantReg.bioRequired'), t('aspirantReg.bioRequiredMsg'));
      return;
    }
    if (!isIndependent && !party.trim()) {
      Alert.alert(t('aspirantReg.partyRequired'), t('aspirantReg.partyRequiredMsg'));
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAsAspirant({
        userId: kycRecord?.userId ?? `me-${Date.now()}`,
        displayName: displayName.trim(),
        bio: bio.trim(),
        stateCode,
        targetConstituencyAcNo: myHome?.acNo,
        targetConstituencyName: constituency.trim() || undefined,
        targetElectionYear: year,
        isIndependent,
        partyAffiliation: isIndependent ? undefined : party.trim(),
        isPublic,
      });

      Alert.alert(
        t('aspirantReg.successTitle', { defaultValue: t('aspirantReg.welcomeTitle') }),
        t('aspirantReg.successMsg', { defaultValue: t('aspirantReg.welcomeMsg') }),
        [{ text: t('aspirantReg.letsGo'), onPress: onClose }],
      );
    } catch (err) {
      Alert.alert(
        t('aspirantReg.errorTitle', { defaultValue: 'Could not create profile' }),
        t('aspirantReg.errorMsg', { defaultValue: 'Something went wrong. Please try again.' }),
      );
      // do not call onClose — let the user retry with the form still open
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, bio, isIndependent, party, registerAsAspirant, kycRecord, stateCode, myHome, constituency, year, isPublic, onClose, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>{t('aspirantReg.title')}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: Math.max(insets.bottom, 16) + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introBox}>
            <Ionicons name="rocket" size={20} color="#06B6D4" />
            <Text style={styles.introText}>
              {t('aspirantReg.introText')}
            </Text>
          </View>

          {/* Display name */}
          <Text style={styles.label}>{t('aspirantReg.publicName')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('aspirantReg.namePlaceholder')}
            placeholderTextColor="#4B5563"
            maxLength={50}
          />

          {/* Bio */}
          <Text style={styles.label}>{t('aspirantReg.standFor')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('aspirantReg.bioPlaceholder')}
            placeholderTextColor="#4B5563"
            multiline
            numberOfLines={3}
            maxLength={180}
          />
          <Text style={styles.charCount}>{bio.length}/180</Text>

          {/* Constituency (from home) */}
          <Text style={styles.label}>{t('aspirantReg.targetConstituency')}</Text>
          <TextInput
            style={styles.input}
            value={constituency}
            onChangeText={setConstituency}
            placeholder={myHome ? myHome.name : 'Set your home constituency in Profile'}
            placeholderTextColor="#4B5563"
          />
          <Text style={styles.hint}>{t('aspirantReg.stateLabel')}: {stateName}</Text>

          {/* Election year */}
          <Text style={styles.label}>{t('aspirantReg.targetYear')}</Text>
          <View style={styles.chipRow}>
            {ELECTION_YEARS.map((y) => (
              <Pressable
                key={y}
                style={[styles.chip, year === y && styles.chipActive]}
                onPress={() => setYear(y)}
              >
                <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
              </Pressable>
            ))}
          </View>

          {/* Independent / party */}
          <Text style={styles.label}>{t('aspirantReg.affiliation')}</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, isIndependent && styles.chipActive]}
              onPress={() => setIsIndependent(true)}
            >
              <Text style={[styles.chipText, isIndependent && styles.chipTextActive]}>{t('politicianPortal.independent')}</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, !isIndependent && styles.chipActive]}
              onPress={() => setIsIndependent(false)}
            >
              <Text style={[styles.chipText, !isIndependent && styles.chipTextActive]}>{t('aspirantReg.partyMember')}</Text>
            </Pressable>
          </View>
          {!isIndependent && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={party}
              onChangeText={setParty}
              placeholder={t('aspirantReg.partyPlaceholder')}
              placeholderTextColor="#4B5563"
              autoCapitalize="characters"
            />
          )}

          {/* Public toggle */}
          <Pressable style={styles.toggleRow} onPress={() => setIsPublic((v) => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{t('aspirantReg.listInDirectory')}</Text>
              <Text style={styles.toggleSub}>{t('aspirantReg.listInDirectoryDesc')}</Text>
            </View>
            <View style={[styles.switch, isPublic && styles.switchOn]}>
              <View style={[styles.knob, isPublic && styles.knobOn]} />
            </View>
          </Pressable>

          {/* Submit */}
          <Pressable
            style={[styles.submit, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>{t('aspirantReg.createProfile')}</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            {t('aspirantReg.disclaimer')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DED1',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#241814' },
  introBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#06B6D415',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#06B6D433',
    marginBottom: 20,
  },
  introText: { flex: 1, fontSize: 13, color: '#6D5549', lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: '#241814', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DED1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#241814',
    fontSize: 14,
  },
  textArea: { height: 84, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#988275', textAlign: 'right', marginTop: 4 },
  hint: { fontSize: 11, color: '#988275', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  chipActive: { backgroundColor: '#4F8EF7', borderColor: '#4F8EF7' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#6D5549' },
  chipTextActive: { color: '#241814' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#241814' },
  toggleSub: { fontSize: 11, color: '#988275', marginTop: 2 },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: '#10B981' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  knobOn: { alignSelf: 'flex-end' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 26,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: '#241814' },
  disclaimer: { fontSize: 11, color: '#4B5563', lineHeight: 17, marginTop: 16, fontStyle: 'italic' },
});
