import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import UserProfileScreen from '../app/user/[userId]';

const owner = 'profile-owner';
let mockViewerId: string;
let mockCompose: string | undefined;
const mockListMySubmissions = jest.fn();
const mockHydrateFollowing = jest.fn().mockResolvedValue(true);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ userId: 'profile-owner', compose: mockCompose }),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: jest.fn() }),
  useFocusEffect: (focus: () => void) => require('react').useEffect(focus, [focus]),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `kshetra://${path}` }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../lib/theme', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../lib/supabaseDataService', () => ({
  fetchUserProfile: jest.fn().mockResolvedValue({
    status: 'found', profile: { user_id: 'profile-owner', display_name: 'Test member' },
  }),
  fetchPostsByAuthor: jest.fn().mockResolvedValue({ status: 'loaded', posts: [] }),
}));
jest.mock('../lib/api', () => ({ apiClient: { feed: { listMySubmissions: (...args: unknown[]) => mockListMySubmissions(...args) } } }));
jest.mock('../lib/contentAccountability', () => ({ gateContentAction: jest.fn(), logContentAction: jest.fn() }));
jest.mock('../stores/auth', () => ({
  useAuthStore: Object.assign(
    (select: (state: { user: { id: string } }) => unknown) => select({ user: { id: mockViewerId } }),
    { getState: () => ({ user: { id: mockViewerId } }) },
  ),
}));
jest.mock('../stores/feed', () => ({
  useFeedStore: Object.assign(
    (select: (state: { isFollowing: () => boolean }) => unknown) => select({ isFollowing: () => false }),
    { getState: () => ({ hydrateFollowing: mockHydrateFollowing }) },
  ),
  mapSupabasePost: (post: unknown) => post,
}));
jest.mock('../stores/dmStore', () => ({ useDMStore: {} }));
jest.mock('../components/PostCard', () => () => null);
jest.mock('../components/PostDetailModal', () => () => null);
jest.mock('../components/DiscoveryHubSheet', () => () => null);
jest.mock('../components/ComposeSheet', () => () => {
  const { Text } = require('react-native');
  return <Text>Shared composer</Text>;
});

describe('personal page controls', () => {
  beforeEach(() => {
    mockCompose = undefined;
    mockListMySubmissions.mockReset().mockResolvedValue({
      submissions: [{ id: 'pending-doc', content: 'Awaiting approval', reviewStatus: 'pending' }],
      nextOffset: null,
    });
  });

  it('lets an ordinary member open the shared composer and see their private submission status', async () => {
    mockViewerId = owner;
    render(<UserProfileScreen />);
    await screen.findByText('profile.createPost', {}, { timeout: 10000 });
    expect(screen.queryByText('Awaiting approval')).toBeNull();
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: 'profile.submissions' })); });
    expect(screen.getByText('Awaiting approval')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('profile.createPost'));
    expect(screen.getByText('Shared composer')).toBeOnTheScreen();
  });

  it('shows visitor actions without loading private data or accepting an owner compose link', async () => {
    mockViewerId = 'visitor';
    mockCompose = '1';
    render(<UserProfileScreen />);
    expect(await screen.findByText('common.follow', {}, { timeout: 10000 })).toBeOnTheScreen();
    expect(screen.queryByText('profile.createPost')).toBeNull();
    expect(screen.queryByText('profile.submissions')).toBeNull();
    expect(screen.queryByText('Shared composer')).toBeNull();
    expect(mockListMySubmissions).not.toHaveBeenCalled();
  });
});
