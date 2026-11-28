import React from 'react';
import { Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SMS from 'expo-sms';
import InviteScreen from '../app/invite';
import WelcomeScreen from '../app/welcome';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockUser: { id: string } | null;

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('expo-sms', () => ({ isAvailableAsync: jest.fn(), sendSMSAsync: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../lib/constants', () => ({ API_BASE_URL: 'https://stage.example.org' }));
jest.mock('../lib/environment', () => ({ IS_STAGING: true }));
jest.mock('../lib/theme', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../stores/auth', () => ({
  useAuthStore: (select: (state: { user: typeof mockUser }) => unknown) =>
    select({ user: mockUser }),
}));

const stagingInvite = 'invite.testMessage\nhttps://stage.example.org/join';

beforeEach(() => {
  jest.resetAllMocks();
  mockUser = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('opens a native draft with the previewed link and leaves recipient selection to the phone', async () => {
  jest.mocked(SMS.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(SMS.sendSMSAsync).mockResolvedValue({ result: 'unknown' });

  render(<InviteScreen />);
  expect(screen.getByText(stagingInvite)).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'invite.textContact' }));
  });

  expect(SMS.sendSMSAsync).toHaveBeenCalledWith([], stagingInvite);
  expect(screen.getByTestId('invite-text-contact')).toBeEnabled();
}, 20_000);

it('keeps sharing available if the phone has no text messaging', async () => {
  jest.mocked(SMS.isAvailableAsync).mockResolvedValue(false);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
  render(<InviteScreen />);

  fireEvent.press(screen.getByRole('button', { name: 'invite.textContact' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('invite.smsUnavailable');
  expect(SMS.sendSMSAsync).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('button', { name: 'invite.share' }));
  await waitFor(() => expect(share).toHaveBeenCalledWith({ message: stagingInvite }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

it('takes signed-out invitees into the existing signup or sign-in flow', () => {
  render(<WelcomeScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'auth.signUp' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/auth/sign-in', params: { mode: 'signup' } });
  fireEvent.press(screen.getByRole('button', { name: 'auth.signIn' }));
  expect(mockPush).toHaveBeenCalledWith('/auth/sign-in');
});

it('lets an existing member open Community without signing in again', () => {
  mockUser = { id: 'member' };
  render(<WelcomeScreen />);
  expect(screen.queryByRole('button', { name: 'auth.signIn' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'invite.explore' }));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/community');
});
