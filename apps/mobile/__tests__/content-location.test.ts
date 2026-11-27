import * as Location from 'expo-location';
import { captureLocationFingerprint } from '../lib/deviceFingerprint';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

describe('Content receipt location', () => {
  it('skips location when permission has not been granted', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    await expect(captureLocationFingerprint()).resolves.toBeNull();
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('skips location if no recent fix is available without starting a location request', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(null);
    await expect(captureLocationFingerprint()).resolves.toBeNull();
    expect(Location.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});
