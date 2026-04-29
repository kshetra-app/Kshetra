import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfileStore } from '../stores/userProfile';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { TELANGANA_CONSTITUENCIES } from '../lib/data';
import { ROLE_CONFIG, type UserRole } from '../lib/moderationTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROLE_OPTIONS: { key: UserRole; label: string; desc: string }[] = [
  { key: 'citizen', label: 'Citizen', desc: 'Regular voter and community member' },
  { key: 'journalist', label: 'Journalist', desc: 'Media professional' },
  { key: 'activist', label: 'Activist', desc: 'Social/political activist' },
  { key: 'politician', label: 'Politician', desc: 'Political leader' },
];

const INTEREST_OPTIONS = [
  'Elections', 'Local Governance', 'Infrastructure', 'Education',
  'Healthcare', 'Agriculture', 'Law & Order', 'Environment',
  'Economy', 'Technology', 'Women\'s Issues', 'Youth Politics',
];

type OnboardingStep = 'welcome' | 'name' | 'role' | 'constituency' | 'interests' | 'done';
const STEPS: OnboardingStep[] = ['welcome', 'name', 'role', 'constituency', 'interests', 'done'];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [selectedAcNo, setSelectedAcNo] = useState<number | null>(null);
  const [acSearch, setAcSearch] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const updateProfile = useUserProfileStore((s) => s.updateProfile);
  const setOnboarded = useUserProfileStore((s) => s.setOnboarded);
  const setHome = useMyConstituencyStore((s) => s.setHome);

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
      setCurrentIndex(prev);
    }
  };

  const finish = () => {
    const selected = selectedAcNo
      ? TELANGANA_CONSTITUENCIES.find((c) => c.acNo === selectedAcNo)
      : null;

    updateProfile({
      id: `user-${Date.now()}`,
      displayName: displayName.trim() || 'Anonymous User',
      role,
      interests,
      homeConstituencyAcNo: selectedAcNo,
      homeConstituencyName: selected?.name ?? null,
    });

    if (selected) {
      setHome({ acNo: selected.acNo, name: selected.name, district: selected.district, party: selected.winner2023 });
    }

    setOnboarded(true);
    router.replace('/(tabs)');
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const filteredConstituencies = acSearch.trim()
    ? TELANGANA_CONSTITUENCIES.filter(
        (c) =>
          c.name.toLowerCase().includes(acSearch.toLowerCase()) ||
          c.district.toLowerCase().includes(acSearch.toLowerCase()) ||
          String(c.acNo).includes(acSearch),
      ).slice(0, 8)
    : [];

  const currentStep = STEPS[currentIndex];

  const renderStep = ({ item }: { item: OnboardingStep }) => {
    switch (item) {
      case 'welcome':
        return (
          <View style={styles.step}>
            <View style={styles.logoContainer}>
              <Ionicons name="earth" size={64} color="#4F8EF7" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to</Text>
            <Text style={styles.brandTitle}>KSHETRA</Text>
            <Text style={styles.welcomeSubtitle}>
              India's first constituency intelligence platform.{'\n'}
              Track elections, engage with your community, and stay informed.
            </Text>
          </View>
        );

      case 'name':
        return (
          <View style={styles.step}>
            <Ionicons name="person-circle-outline" size={48} color="#4F8EF7" />
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#4B5563"
              maxLength={50}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        );

      case 'role':
        return (
          <View style={styles.step}>
            <Ionicons name="ribbon-outline" size={48} color="#8B5CF6" />
            <Text style={styles.stepTitle}>I am a...</Text>
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
                    <Ionicons name={config.icon as any} size={22} color={active ? config.color : '#6B7280'} />
                    <Text style={[styles.roleLabel, active && { color: config.color }]}>{opt.label}</Text>
                    <Text style={styles.roleDesc}>{opt.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'constituency':
        return (
          <View style={styles.step}>
            <Ionicons name="location-outline" size={48} color="#10B981" />
            <Text style={styles.stepTitle}>Your Home Constituency</Text>
            <Text style={styles.stepHint}>Search and select (optional)</Text>
            <TextInput
              style={styles.searchInput}
              value={acSearch}
              onChangeText={setAcSearch}
              placeholder="Search by name, district, or AC number..."
              placeholderTextColor="#4B5563"
            />
            {filteredConstituencies.map((c) => {
              const active = selectedAcNo === c.acNo;
              return (
                <Pressable
                  key={c.acNo}
                  style={[styles.acRow, active && styles.acRowActive]}
                  onPress={() => setSelectedAcNo(active ? null : c.acNo)}
                >
                  <Text style={[styles.acText, active && styles.acTextActive]}>
                    #{c.acNo} {c.name}
                  </Text>
                  <Text style={styles.acMeta}>{c.district}</Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                </Pressable>
              );
            })}
            {selectedAcNo && !acSearch && (
              <View style={styles.selectedAc}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.selectedAcText}>
                  Selected: #{selectedAcNo}{' '}
                  {TELANGANA_CONSTITUENCIES.find((c) => c.acNo === selectedAcNo)?.name}
                </Text>
              </View>
            )}
          </View>
        );

      case 'interests':
        return (
          <View style={styles.step}>
            <Ionicons name="heart-outline" size={48} color="#EF4444" />
            <Text style={styles.stepTitle}>What interests you?</Text>
            <Text style={styles.stepHint}>Select topics you care about</Text>
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
        );

      case 'done':
        return (
          <View style={styles.step}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.doneTitle}>You're all set!</Text>
            <Text style={styles.doneSubtitle}>
              Start exploring Telangana's 119 constituencies, engage with your community,
              and stay informed with AI-powered insights.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        renderItem={renderStep}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Navigation */}
      <View style={styles.footer}>
        {currentIndex > 0 && currentStep !== 'done' && (
          <Pressable style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}

        {currentStep === 'welcome' && (
          <Pressable style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        )}

        {currentStep === 'name' && (
          <Pressable
            style={[styles.primaryButton, !displayName.trim() && styles.buttonDisabled]}
            onPress={goNext}
            disabled={!displayName.trim()}
          >
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        )}

        {(currentStep === 'role' || currentStep === 'constituency' || currentStep === 'interests') && (
          <Pressable style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryText}>
              {currentStep === 'constituency' && !selectedAcNo ? 'Skip' : 'Continue'}
            </Text>
          </Pressable>
        )}

        {currentStep === 'done' && (
          <Pressable style={styles.primaryButton} onPress={finish}>
            <Text style={styles.primaryText}>Start Exploring</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1F2937',
  },
  progressDotActive: {
    backgroundColor: '#4F8EF7',
  },
  step: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F8EF720',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4F8EF7',
    letterSpacing: 6,
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#4F8EF740',
    marginTop: 20,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginTop: 12,
  },
  roleCard: {
    width: '47%' as any,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 8,
  },
  acRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    marginBottom: 4,
  },
  acRowActive: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  acText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  acTextActive: {
    color: '#10B981',
  },
  acMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  selectedAc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#10B98120',
    borderRadius: 10,
  },
  selectedAcText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  interestChipActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  interestText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  interestTextActive: {
    color: '#4F8EF7',
    fontWeight: '600',
  },
  doneIcon: {
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  doneSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F8EF7',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginLeft: 'auto',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
