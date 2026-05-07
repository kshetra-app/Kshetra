import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfileStore } from '../stores/userProfile';
import { ROLE_CONFIG, type UserRole } from '../lib/moderationTypes';

const INTEREST_OPTIONS = [
  'Elections',
  'Local Governance',
  'Infrastructure',
  'Education',
  'Healthcare',
  'Agriculture',
  'Law & Order',
  'Environment',
  'Economy',
  'Technology',
  'Women\'s Issues',
  'Youth Politics',
];

const ROLE_OPTIONS: { key: UserRole; label: string; desc: string }[] = [
  { key: 'citizen', label: 'Citizen', desc: 'Regular voter and community member' },
  { key: 'journalist', label: 'Journalist', desc: 'Media professional covering politics' },
  { key: 'activist', label: 'Activist', desc: 'Social/political activist' },
  { key: 'politician', label: 'Politician', desc: 'Current or aspiring political leader' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useUserProfileStore((s) => s.profile);
  const updateProfile = useUserProfileStore((s) => s.updateProfile);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [role, setRole] = useState<UserRole>(profile?.role ?? 'citizen');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Name Required', 'Please enter your display name.');
      return;
    }

    updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      role,
      interests,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={8}>
              <Text style={styles.saveButton}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color="#4F8EF7" />
          </View>
          <Pressable style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </Pressable>
        </View>

        {/* Display Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#4B5563"
            maxLength={50}
            autoCapitalize="words"
          />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#4B5563"
            maxLength={200}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Role */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>I am a...</Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((opt) => {
              const config = ROLE_CONFIG[opt.key];
              const active = role === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.roleCard, active && { borderColor: config.color, backgroundColor: config.color + '10' }]}
                  onPress={() => setRole(opt.key)}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color={active ? config.color : '#6B7280'}
                  />
                  <Text style={[styles.roleLabel, active && { color: config.color }]}>{opt.label}</Text>
                  <Text style={styles.roleDesc}>{opt.desc}</Text>
                  {active && (
                    <View style={[styles.roleCheck, { backgroundColor: config.color }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Interests</Text>
          <Text style={styles.fieldHint}>Select topics you care about</Text>
          <View style={styles.interestGrid}>
            {INTEREST_OPTIONS.map((interest) => {
              const active = interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  style={[styles.interestChip, active && styles.interestChipActive]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[styles.interestText, active && styles.interestTextActive]}>
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  saveButton: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4F8EF740',
  },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F8EF7',
  },
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'right',
    marginTop: 4,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '47%' as any,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    position: 'relative',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  roleDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 14,
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  interestChipActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  interestText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  interestTextActive: {
    color: '#4F8EF7',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
