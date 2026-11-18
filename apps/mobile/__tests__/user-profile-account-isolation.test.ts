jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { selectUserProfileForAccount, useUserProfileStore } from '../stores/userProfile';

describe('user profile account isolation', () => {
  beforeEach(() => {
    useUserProfileStore.getState().clearProfile();
  });

  it('does not expose a previous account profile to a guest or a different account', () => {
    const profile = {
      id: 'account-a',
      displayName: 'Account A',
      bio: '',
      avatarUrl: null,
      role: 'citizen' as const,
      isVerified: false,
      verificationStatus: 'unverified' as const,
      homeConstituencyAcNo: null,
      homeConstituencyName: null,
      interests: [],
      joinedAt: '2026-01-01T00:00:00.000Z',
      postsCount: 0,
      reputation: 0,
      followersCount: 0,
      followingCount: 0,
    };

    expect(selectUserProfileForAccount(profile, null)).toBeNull();
    expect(selectUserProfileForAccount(profile, 'account-b')).toBeNull();
    expect(selectUserProfileForAccount(profile, 'account-a')).toEqual(profile);
  });

  it('clears persisted account profile data on sign-out cleanup', () => {
    useUserProfileStore.getState().setProfile({
      id: 'account-a',
      displayName: 'Account A',
      bio: '',
      avatarUrl: null,
      role: 'citizen',
      isVerified: false,
      verificationStatus: 'unverified',
      homeConstituencyAcNo: null,
      homeConstituencyName: null,
      interests: [],
      joinedAt: '2026-01-01T00:00:00.000Z',
      postsCount: 0,
      reputation: 0,
      followersCount: 0,
      followingCount: 0,
    });

    useUserProfileStore.getState().clearProfile();

    expect(useUserProfileStore.getState().profile).toBeNull();
    expect(useUserProfileStore.getState().onboarded).toBe(false);
  });
});
