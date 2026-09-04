import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole, UserVerificationStatus } from '../lib/moderationTypes';

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  verificationStatus: UserVerificationStatus;
  homeConstituencyAcNo: number | null;
  homeConstituencyName: string | null;
  interests: string[];
  joinedAt: string;
  postsCount: number;
  reputation: number;
  followersCount: number;
  followingCount: number;
}

interface UserProfileState {
  profile: UserProfile | null;
  onboarded: boolean;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setOnboarded: (val: boolean) => void;
  clearProfile: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  displayName: '',
  bio: '',
  avatarUrl: null,
  role: 'citizen',
  isVerified: false,
  verificationStatus: 'unverified',
  homeConstituencyAcNo: null,
  homeConstituencyName: null,
  interests: [],
  joinedAt: new Date().toISOString(),
  postsCount: 0,
  reputation: 0,
  followersCount: 0,
  followingCount: 0,
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      profile: null,
      onboarded: false,

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) =>
        set((s) => ({
          profile: s.profile ? { ...s.profile, ...updates } : { ...DEFAULT_PROFILE, ...updates },
        })),

      setOnboarded: (val) => set({ onboarded: val }),

      clearProfile: () => set({ profile: null, onboarded: false }),
    }),
    {
      name: 'kshetra-user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
