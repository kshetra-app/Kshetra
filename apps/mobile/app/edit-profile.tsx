import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { selectUserProfileForAccount, useUserProfileStore } from '../stores/userProfile';
import { useAuthStore } from '../stores/auth';
import { fetchUserProfile, updateUserProfile } from '../lib/supabaseDataService';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { PROFILE_PHOTO_MAX_BYTES, removeReplacedProfilePhoto, uploadProfilePhoto } from '../lib/profilePhoto';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import DiscoveryHubSheet from '../components/DiscoveryHubSheet';

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

export default function EditProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  return <EditProfile key={userId} userId={userId} />;
}

function EditProfile({ userId }: { userId?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useUserProfileStore((s) => selectUserProfileForAccount(s.profile, userId ?? null));
  const updateProfile = useUserProfileStore((s) => s.updateProfile);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const draftUpload = useRef<{ uri: string; url: string } | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoadState('loading');
    void fetchUserProfile(userId).then((result) => {
      if (!active) return;
      if (result.status !== 'found') {
        setLoadState('error');
        return;
      }
      const row = result.profile;
      const avatar = typeof row.avatar_url === 'string' ? row.avatar_url : null;
      setDisplayName(typeof row.display_name === 'string' ? row.display_name : '');
      setBio(typeof row.bio === 'string' ? row.bio : '');
      setPhoto(avatar);
      setSavedPhoto(avatar);
      setLoadState('ready');
    });
    return () => { active = false; };
  }, [userId, retry]);

  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > PROFILE_PHOTO_MAX_BYTES || (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType))) {
        Alert.alert(t('editProfile.photoRequirements'));
        return;
      }
      setSelectedPhoto(asset);
      setPhoto(asset.uri);
    } catch {
      Alert.alert(t('editProfile.photoUnavailable'));
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleSave = useCallback(async () => {
    if (!userId || loadState !== 'ready' || saving.current) return;
    if (!displayName.trim()) {
      Alert.alert(t('editProfile.nameRequired', { defaultValue: 'Required' }), t('editProfile.nameRequiredMsg', { defaultValue: 'Please enter a display name' }));
      return;
    }
    saving.current = true;
    setIsSaving(true);
    try {
      let avatarUrl = photo;
      if (selectedPhoto) {
        try {
          if (draftUpload.current?.uri !== selectedPhoto.uri) {
            const url = await uploadProfilePhoto(userId, selectedPhoto.uri, selectedPhoto.mimeType);
            draftUpload.current = { uri: selectedPhoto.uri, url };
          }
          avatarUrl = draftUpload.current.url;
        } catch {
          Alert.alert(t('editProfile.photoUploadFailed'));
          return;
        }
      }
      if (useAuthStore.getState().user?.id !== userId) return;
      const updated = await updateUserProfile(userId, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        ...(avatarUrl !== savedPhoto ? { avatarUrl } : {}),
      });
      if (!updated) {
        Alert.alert(t('editProfile.saveFailed'));
        return;
      }
      if (useAuthStore.getState().user?.id !== userId) return;
      updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
        interests,
      });
      if (savedPhoto && savedPhoto !== avatarUrl) void removeReplacedProfilePhoto(userId, savedPhoto).catch(() => {});
      router.back();
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }, [displayName, bio, interests, userId, loadState, photo, selectedPhoto, savedPhoto, updateProfile, router, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('editProfile.title', { defaultValue: 'Edit Profile' }),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('discovery.screenHelp', { defaultValue: 'Page guidance' })}
                onPress={() => setHelpVisible(true)}
                hitSlop={8}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={handleSave} hitSlop={8} disabled={isSaving || loadState !== 'ready'} style={{ opacity: isSaving || loadState !== 'ready' ? 0.5 : 1 }}>
                <Text style={[styles.saveButton, { color: colors.primary }]}>
                  {isSaving ? t('common.loading') : t('common.save')}
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {!userId || loadState !== 'ready' ? (
        <View style={styles.avatarSection}>
          {userId && loadState === 'loading' ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Text style={{ color: colors.text, textAlign: 'center' }}>{t(userId ? 'profile.unavailable' : 'auth.signInToSync')}</Text>
              <Pressable accessibilityRole="button" style={styles.changePhotoButton} onPress={() => userId ? setRetry((value) => value + 1) : router.replace('/auth/sign-in')}>
                <Text style={styles.changePhotoText}>{t(userId ? 'common.retry' : 'auth.signIn')}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            {photo ? <Image source={photo} style={styles.avatarPhoto} contentFit="cover" /> : <Ionicons name="person" size={40} color={colors.primary} />}
          </View>
          <Pressable accessibilityRole="button" style={styles.changePhotoButton} onPress={() => void choosePhoto()} disabled={isSaving}>
            <Text style={styles.changePhotoText}>{t('editProfile.changePhoto', { defaultValue: 'Change Photo' })}</Text>
          </Pressable>
          {!!photo && (
            <Pressable accessibilityRole="button" style={styles.changePhotoButton} disabled={isSaving} onPress={() => { setSelectedPhoto(null); setPhoto(null); }}>
              <Text style={styles.changePhotoText}>{t('editProfile.removePhoto')}</Text>
            </Pressable>
          )}
        </View>

        {/* Display Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('editProfile.displayName', { defaultValue: 'Display Name' })}</Text>
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
          <Text style={styles.fieldLabel}>{t('editProfile.bio', { defaultValue: 'Bio' })}</Text>
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

        {/* Interests */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('editProfile.interests', { defaultValue: 'Interests' })}</Text>
          <Text style={styles.fieldHint}>{t('editProfile.selectInterests', { defaultValue: 'Select topics you care about' })}</Text>
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
      </ScrollView>}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="edit-profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  saveButton: {
    fontSize: 15,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  avatarPhoto: { width: '100%', height: '100%', borderRadius: 50 },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8DED1',
    position: 'relative',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#241814',
    marginTop: 8,
  },
  roleDesc: {
    fontSize: 11,
    color: '#6D5549',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  interestChipActive: {
    backgroundColor: '#FBE8E7',
    borderColor: '#A8201A',
  },
  interestText: {
    fontSize: 13,
    color: '#6D5549',
    fontWeight: '500',
  },
  interestTextActive: {
    color: '#A8201A',
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});
