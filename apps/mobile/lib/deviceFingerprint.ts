/**
 * Device Fingerprint Capture
 *
 * Collects device, network, location, and app information for
 * Content Creator Accountability (CCA). Used for:
 *   1. KYC registration (one-time)
 *   2. Per-action forensic stamps (every content action)
 *
 * Privacy notes:
 *   - IMEI is NOT accessible on modern Android (API 29+) / iOS
 *   - Uses androidId / identifierForVendor as legal device identifier
 *   - Location requires user permission (gracefully degrades if denied)
 *   - Public IP fetched via lightweight API call
 *
 * Required packages (must be installed):
 *   - expo-device (brand, model, OS details, memory)
 *   - expo-application (app version, build, bundle ID, androidId)
 *   - expo-location (already installed)
 *   - expo-constants (already installed)
 *   - @react-native-community/netinfo (already installed via expo)
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import type {
  DeviceFingerprint,
  NetworkFingerprint,
  LocationFingerprint,
  AppFingerprint,
  ForensicSnapshot,
} from './contentAccountabilityTypes';

// ─── Session ID (generated once per app launch) ─────────────────────────────

let _sessionId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
  return _sessionId;
}

export function resetSessionId(): void {
  _sessionId = null;
}

// ─── Device Info ────────────────────────────────────────────────────────────

export async function captureDeviceFingerprint(): Promise<DeviceFingerprint> {
  try {
    // Try to use expo-device if available
    const Device = await importExpoDevice();

    return {
      brand: Device?.brand ?? null,
      model: Device?.modelName ?? null,
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      osVersion: String(Platform.Version),
      deviceUniqueId: await getDeviceUniqueId(),
      deviceName: Device?.deviceName ?? null,
      totalMemoryMb: Device?.totalMemory
        ? Math.round(Device.totalMemory / (1024 * 1024))
        : null,
    };
  } catch {
    // Fallback if expo-device not installed
    return {
      brand: null,
      model: null,
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      osVersion: String(Platform.Version),
      deviceUniqueId: await getDeviceUniqueId(),
      deviceName: Constants.deviceName ?? null,
      totalMemoryMb: null,
    };
  }
}

async function importExpoDevice(): Promise<any | null> {
  try {
    return await import('expo-device');
  } catch {
    return null;
  }
}

async function getDeviceUniqueId(): Promise<string | null> {
  try {
    const Application = await import('expo-application');
    if (Platform.OS === 'android') {
      return Application.getAndroidId();
    }
    if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync();
    }
    return null;
  } catch {
    // expo-application not installed — generate a persistent fallback ID
    return null;
  }
}

// ─── Network Info ───────────────────────────────────────────────────────────

export async function captureNetworkFingerprint(): Promise<NetworkFingerprint> {
  const result: NetworkFingerprint = {
    publicIp: null,
    localIp: null,
    networkType: 'unknown',
    carrierName: null,
    wifiSsid: null,
    isConnected: true,
  };

  // Get public IP via lightweight API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      result.publicIp = data.ip ?? null;
    }
  } catch {
    // Public IP fetch failed — not critical
  }

  // Try NetInfo for connection type and carrier
  try {
    const NetInfo = await import('@react-native-community/netinfo');
    const state = await NetInfo.default.fetch();
    result.isConnected = state.isConnected ?? true;

    if (state.type === 'wifi') {
      result.networkType = 'wifi';
      // WiFi details may require ACCESS_FINE_LOCATION permission
      if (state.details && 'ssid' in state.details) {
        result.wifiSsid = (state.details as any).ssid ?? null;
      }
      if (state.details && 'ipAddress' in state.details) {
        result.localIp = (state.details as any).ipAddress ?? null;
      }
    } else if (state.type === 'cellular') {
      result.networkType = 'cellular';
      if (state.details && 'carrier' in state.details) {
        result.carrierName = (state.details as any).carrier ?? null;
      }
    } else if (state.type === 'ethernet') {
      result.networkType = 'ethernet';
    }
  } catch {
    // NetInfo not available
  }

  return result;
}

// ─── Location ───────────────────────────────────────────────────────────────

export async function captureLocationFingerprint(): Promise<LocationFingerprint | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const fingerprint: LocationFingerprint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
      altitude: location.coords.altitude,
      address: null,
      capturedAt: new Date(location.timestamp).toISOString(),
    };

    // Try reverse geocoding for human-readable address
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (address) {
        const parts = [
          address.name,
          address.street,
          address.city ?? address.subregion,
          address.region,
          address.postalCode,
        ].filter(Boolean);
        fingerprint.address = parts.join(', ');
      }
    } catch {
      // Reverse geocoding failed — not critical
    }

    return fingerprint;
  } catch {
    return null;
  }
}

// ─── App Info ───────────────────────────────────────────────────────────────

export async function captureAppFingerprint(): Promise<AppFingerprint> {
  let version = '0.1.0';
  let build: string | null = null;
  let bundleId: string | null = null;

  try {
    const Application = await import('expo-application');
    version = Application.nativeApplicationVersion ?? version;
    build = Application.nativeBuildVersion ?? null;
    bundleId = Application.applicationId ?? null;
  } catch {
    // expo-application not installed — use Constants fallback
    version = Constants.expoConfig?.version ?? version;
  }

  return {
    version,
    build,
    bundleId,
    sessionId: getSessionId(),
  };
}

// ─── Full Forensic Snapshot ─────────────────────────────────────────────────

/**
 * Capture a complete forensic snapshot of the device, network, location, and app.
 * This is called before every gated content action.
 *
 * Performance: ~1-3 seconds due to IP lookup + location. Network and location
 * captures are parallel for speed.
 */
export async function captureForensicSnapshot(): Promise<ForensicSnapshot> {
  const [device, network, location, app] = await Promise.all([
    captureDeviceFingerprint(),
    captureNetworkFingerprint(),
    captureLocationFingerprint(),
    captureAppFingerprint(),
  ]);

  return {
    device,
    network,
    location,
    app,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Lightweight version — skips location and public IP for low-severity actions.
 * Used for poll votes, reactions, follows where full forensics would add latency.
 */
export async function captureLightSnapshot(): Promise<ForensicSnapshot> {
  const [device, app] = await Promise.all([
    captureDeviceFingerprint(),
    captureAppFingerprint(),
  ]);

  return {
    device,
    network: {
      publicIp: null,
      localIp: null,
      networkType: 'unknown',
      carrierName: null,
      wifiSsid: null,
      isConnected: true,
    },
    location: null,
    app,
    capturedAt: new Date().toISOString(),
  };
}
