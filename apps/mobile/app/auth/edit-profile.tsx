import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserProfileStore } from '../../stores/userProfile';
import { useAuthStore } from '../../stores/auth';

const INTEREST_OPTIONS = [
  'elections', 'civic', 'delimitation', 'promises', 'transparency', 'analytics', 'community', 'news',
] as const;

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useUserProfileStore((s) => s.profile);
  const updateProfile = useUserProfileStore((s) => s.updateProfile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  const toggleInterest = useCallback((key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleSave = useCallback(() => {
    updateProfile({
      displayName: displayName.trim() || 'Kshetra User',
      bio: bio.trim(),
      interests,
    });
    router.back();
  }, [displayName, bio, interests]);

  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.back();
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar placeholder */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="#4F8EF7" />
          </View>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Name */}
        <Text style={styles.label}>Display Name</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#4B5563"
            maxLength={30}
          />
        </View>

        {/* Bio */}
        <Text style={styles.label}>Bio</Text>
        <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor="#4B5563"
            multiline
            maxLength={120}
          />
        </View>
        <Text style={styles.charCount}>{bio.length}/120</Text>

        {/* Interests */}
        <Text style={styles.label}>Interests</Text>
        <View style={styles.interestsGrid}>
          {INTEREST_OPTIONS.map((key) => {
            const active = interests.includes(key);
            return (
              <Pressable
                key={key}
                style={[styles.interestChip, active && styles.interestChipActive]}
                onPress={() => toggleInterest(key)}
              >
                <Text style={[styles.interestText, active && styles.interestTextActive]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Account info */}
        <Text style={[styles.label, { marginTop: 24 }]}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email ?? 'Not signed in'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{profile?.role ?? 'citizen'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reputation</Text>
          <Text style={styles.infoValue}>{profile?.reputation ?? 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined</Text>
          <Text style={styles.infoValue}>
            {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : '-'}
          </Text>
        </View>

        {/* Sign out */}
        {user && (
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out" size={18} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#4F8EF7', borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4F8EF7' },
  avatarHint: { fontSize: 11, color: '#6B7280', marginTop: 6 },

  label: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 16, marginBottom: 6 },
  inputWrap: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 14 },
  input: { fontSize: 15, color: '#FFFFFF', paddingVertical: 14 },
  charCount: { fontSize: 10, color: '#6B7280', textAlign: 'right', marginTop: 2 },

  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  interestChipActive: { borderColor: '#4F8EF7', backgroundColor: '#4F8EF715' },
  interestText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  interestTextActive: { color: '#4F8EF7', fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  infoLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EF444440', marginTop: 24 },
  signOutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
