/**
 * RegisterAspirantModal — registration form for the "Become an Aspirant" flow.
 * Collects a public civic profile and creates it via the aspirant store.
 */
import React, { useState, useCallback, useMemo } from 'react';
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

  const handleSubmit = useCallback(() => {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter the name voters will see.');
      return;
    }
    if (!bio.trim()) {
      Alert.alert('Bio required', 'Tell the community what you stand for.');
      return;
    }
    if (!isIndependent && !party.trim()) {
      Alert.alert('Party required', 'Enter your party, or mark yourself as Independent.');
      return;
    }

    registerAsAspirant({
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
      'Welcome, Aspirant!',
      'Your civic profile is live. Complete modules and challenges to grow your Civic Score.',
      [{ text: 'Let\u2019s go', onPress: onClose }],
    );
  }, [displayName, bio, isIndependent, party, registerAsAspirant, kycRecord, stateCode, myHome, constituency, year, isPublic, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>Become an Aspirant</Text>
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
              Create a public civic profile to track your Civic Score, earn badges, and let your
              constituency know you want to lead. You can hide your profile any time.
            </Text>
          </View>

          {/* Display name */}
          <Text style={styles.label}>Public name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name voters will see"
            placeholderTextColor="#4B5563"
            maxLength={50}
          />

          {/* Bio */}
          <Text style={styles.label}>What do you stand for?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="E.g., Teacher and RTI activist focused on school reform and clean water."
            placeholderTextColor="#4B5563"
            multiline
            numberOfLines={3}
            maxLength={180}
          />
          <Text style={styles.charCount}>{bio.length}/180</Text>

          {/* Constituency (from home) */}
          <Text style={styles.label}>Target constituency</Text>
          <TextInput
            style={styles.input}
            value={constituency}
            onChangeText={setConstituency}
            placeholder={myHome ? myHome.name : 'Set your home constituency in Profile'}
            placeholderTextColor="#4B5563"
          />
          <Text style={styles.hint}>State: {stateName}</Text>

          {/* Election year */}
          <Text style={styles.label}>Target election year</Text>
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
          <Text style={styles.label}>Affiliation</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, isIndependent && styles.chipActive]}
              onPress={() => setIsIndependent(true)}
            >
              <Text style={[styles.chipText, isIndependent && styles.chipTextActive]}>Independent</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, !isIndependent && styles.chipActive]}
              onPress={() => setIsIndependent(false)}
            >
              <Text style={[styles.chipText, !isIndependent && styles.chipTextActive]}>Party member</Text>
            </Pressable>
          </View>
          {!isIndependent && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={party}
              onChangeText={setParty}
              placeholder="Party name or abbreviation (e.g., INC, BJP, BRS)"
              placeholderTextColor="#4B5563"
              autoCapitalize="characters"
            />
          )}

          {/* Public toggle */}
          <Pressable style={styles.toggleRow} onPress={() => setIsPublic((v) => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>List me in the Aspirants directory</Text>
              <Text style={styles.toggleSub}>Other citizens can find and endorse you.</Text>
            </View>
            <View style={[styles.switch, isPublic && styles.switchOn]}>
              <View style={[styles.knob, isPublic && styles.knobOn]} />
            </View>
          </Pressable>

          {/* Submit */}
          <Pressable style={styles.submit} onPress={handleSubmit}>
            <Ionicons name="rocket" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>Create my Aspirant profile</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            This profile is for civic engagement on Kshetra and is not a nomination or registration
            with the Election Commission of India. Filing an actual nomination follows the legal
            process covered in the Leadership Academy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
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
  introText: { flex: 1, fontSize: 13, color: '#9CA3AF', lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: '#E5E7EB', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: { height: 84, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#6B7280', textAlign: 'right', marginTop: 4 },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  chipActive: { backgroundColor: '#4F8EF7', borderColor: '#4F8EF7' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  chipTextActive: { color: '#FFFFFF' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  toggleSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
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
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  disclaimer: { fontSize: 11, color: '#4B5563', lineHeight: 17, marginTop: 16, fontStyle: 'italic' },
});
