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
import { useTheme } from '../../lib/theme';

const INTEREST_OPTIONS = [
  'elections', 'civic', 'delimitation', 'promises', 'transparency', 'analytics', 'community', 'news',
] as const;

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
  }, [displayName, bio, interests, updateProfile, router]);

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
  }, [signOut, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar placeholder */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.gold }]}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.avatarHint, { color: colors.textMuted }]}>Tap to change photo</Text>
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Display Name</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            maxLength={30}
          />
        </View>

        {/* Bio */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
        <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12, backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, height: 60, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={120}
          />
        </View>
        <Text style={[styles.charCount, { color: colors.textMuted }]}>{bio.length}/120</Text>

        {/* Interests */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Topics of Interest</Text>
        <View style={styles.interestsGrid}>
          {INTEREST_OPTIONS.map((key) => {
            const active = interests.includes(key);
            return (
              <Pressable
                key={key}
                style={[
                  styles.interestChip,
                  { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => toggleInterest(key)}
              >
                <Text style={[styles.interestText, { color: colors.textSecondary }, active && { color: '#FFFFFF', fontWeight: '700' }]}>
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Account info */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Status</Text>
          <Text style={[styles.infoValue, { color: user ? colors.teal : colors.textMuted }]}>
            {user ? 'Signed In' : 'Guest / Local Profile'}
          </Text>
        </View>
        {user?.email && (
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
          </View>
        )}

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
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarHint: { fontSize: 11, marginTop: 6 },

  label: { fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input: { fontSize: 15, paddingVertical: 14 },
  charCount: { fontSize: 10, textAlign: 'right', marginTop: 2 },

  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  interestChipActive: {},
  interestText: { fontSize: 12, fontWeight: '600' },
  interestTextActive: { fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '700' },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EF444440', marginTop: 24 },
  signOutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
