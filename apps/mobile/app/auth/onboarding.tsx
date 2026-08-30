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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserProfileStore } from '../../stores/userProfile';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../lib/theme';

const INTERESTS = [
  { key: 'elections', icon: 'podium', label: 'Elections' },
  { key: 'civic', icon: 'megaphone', label: 'Civic Issues' },
  { key: 'delimitation', icon: 'map', label: 'Delimitation' },
  { key: 'promises', icon: 'checkmark-done', label: 'Promise Tracker' },
  { key: 'transparency', icon: 'eye', label: 'Transparency' },
  { key: 'analytics', icon: 'stats-chart', label: 'Analytics' },
  { key: 'community', icon: 'people', label: 'Community' },
  { key: 'news', icon: 'newspaper', label: 'Political News' },
] as const;

type Step = 'welcome' | 'profile' | 'interests' | 'constituency' | 'done';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { updateProfile, setOnboarded } = useUserProfileStore();
  const setHome = useMyConstituencyStore((s) => s.setHome);

  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [constituencySearch, setConstituencySearch] = useState('');

  const toggleInterest = useCallback((key: string) => {
    setSelectedInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleComplete = useCallback(() => {
    updateProfile({
      id: user?.id ?? `local-${Date.now()}`,
      displayName: displayName.trim() || 'Kshetra User',
      bio: bio.trim(),
      interests: selectedInterests,
      joinedAt: new Date().toISOString(),
    });
    setOnboarded(true);
    router.replace('/(tabs)/dashboard' as any);
  }, [displayName, bio, selectedInterests, user]);

  const renderWelcome = () => (
    <View style={styles.stepContent}>
      <Text style={styles.brand}>KSHETRA</Text>
      <Text style={styles.welcomeTitle}>Your Constituency, Your Power</Text>
      <Text style={styles.welcomeDesc}>
        Track your MLA, monitor civic issues, explore election analytics, and stay informed about delimitation — all in one place.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: 'map', text: 'Interactive constituency maps' },
          { icon: 'bar-chart', text: 'Election analytics & projections' },
          { icon: 'megaphone', text: 'Report & track civic issues' },
          { icon: 'flask', text: 'Delimitation simulator' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={f.icon as any} size={18} color="#4F8EF7" />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.primaryBtn} onPress={() => setStep('profile')}>
        <Text style={styles.primaryBtnText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
      <Pressable style={styles.skipBtn} onPress={handleComplete}>
        <Text style={styles.skipBtnText}>Skip for now</Text>
      </Pressable>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Profile</Text>
      <Text style={styles.stepDesc}>How should we address you?</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="person" size={16} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder="Display Name"
          placeholderTextColor="#4B5563"
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={30}
        />
      </View>
      <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
        <Ionicons name="chatbubble" size={16} color="#6B7280" style={{ marginTop: 2 }} />
        <TextInput
          style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
          placeholder="Short bio (optional)"
          placeholderTextColor="#4B5563"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={120}
        />
      </View>
      <Pressable style={styles.primaryBtn} onPress={() => setStep('interests')}>
        <Text style={styles.primaryBtnText}>Next</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  const renderInterests = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepDesc}>Select topics to personalize your feed</Text>
      <View style={styles.interestsGrid}>
        {INTERESTS.map((item) => {
          const active = selectedInterests.includes(item.key);
          return (
            <Pressable
              key={item.key}
              style={[styles.interestChip, active && styles.interestChipActive]}
              onPress={() => toggleInterest(item.key)}
            >
              <Ionicons name={item.icon as any} size={16} color={active ? '#4F8EF7' : '#6B7280'} />
              <Text style={[styles.interestText, active && styles.interestTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.primaryBtn} onPress={() => setStep('done')}>
        <Text style={styles.primaryBtnText}>
          {selectedInterests.length > 0 ? `Continue (${selectedInterests.length} selected)` : 'Skip'}
        </Text>
      </Pressable>
    </View>
  );

  const renderDone = () => (
    <View style={styles.stepContent}>
      <Ionicons name="checkmark-circle" size={64} color="#10B981" />
      <Text style={styles.stepTitle}>You're All Set!</Text>
      <Text style={styles.stepDesc}>
        {displayName ? `Welcome, ${displayName}!` : 'Welcome to Kshetra!'}{'\n'}
        Your personalized experience is ready.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={handleComplete}>
        <Text style={styles.primaryBtnText}>Enter Kshetra</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  // Progress
  const steps: Step[] = ['welcome', 'profile', 'interests', 'done'];
  const currentIdx = steps.indexOf(step);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Progress dots */}
      {step !== 'welcome' && (
        <View style={styles.progressRow}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.progressDot, i <= currentIdx && styles.progressDotActive]} />
          ))}
        </View>
      )}

      {/* Back */}
      {currentIdx > 0 && (
        <Pressable style={styles.backBtn} onPress={() => setStep(steps[currentIdx - 1])}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'welcome' && renderWelcome()}
        {step === 'profile' && renderProfile()}
        {step === 'interests' && renderInterests()}
        {step === 'done' && renderDone()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 12 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  progressDotActive: { width: 20 },
  backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  stepContent: { alignItems: 'center', gap: 12 },
  brand: { fontSize: 36, fontWeight: '900', letterSpacing: 8 },
  welcomeTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  welcomeDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  featureList: { width: '100%', gap: 10, marginTop: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, borderWidth: 1 },
  featureText: { fontSize: 14, fontWeight: '600' },

  stepTitle: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  stepDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, width: '100%', gap: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },

  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  interestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  interestChipActive: {},
  interestText: { fontSize: 13, fontWeight: '600' },
  interestTextActive: { fontWeight: '700' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, width: '100%', marginTop: 12 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  skipBtn: { paddingVertical: 10 },
  skipBtnText: { fontSize: 14, fontWeight: '600' },
});
