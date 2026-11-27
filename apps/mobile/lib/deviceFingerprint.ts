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
 *   - Uses an app-scoped native identifier or a locally generated installation ID
 *   - Location requires user permission (gracefully degrades if denied)
 *   - Public IP fetched via lightweight API call
 *
 * Required packages (must be installed):
 *   - expo-location (already installed)
 *   - expo-constants (already installed)
 *
 * Optional packages (gracefully degrades if not installed/linked):
 *   - expo-device (brand, model, OS details, memory)
 *   - expo-application (app version, build, bundle ID, androidId)
 *   - @react-native-community/netinfo (connection type, carrier)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
let installationId: Promise<string | null> | undefined;
const installationIdKey = 'poligram-forensics-installation-id';

function getInstallationId(): Promise<string | null> {
  installationId ??= (async () => {
    const existing = await AsyncStorage.getItem(installationIdKey);
    if (existing) return existing;
    // This value correlates records from one installation. It grants no access.
    const id = `install_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(installationIdKey, id);
    return id;
  })().catch(() => {
    installationId = undefined;
    return null;
  });
  return installationId;
}

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
  return _sessionId;
}

export function resetSessionId(): void {
  _sessionId = null;
}

// ─── Safe Dynamic Import Helpers ────────────────────────────────────────────
// Metro bundler resolves dynamic imports at build time. If the native module
// is not linked (not in app.json plugins, or not in package.json dependencies),
// the import may succeed (JS shim exists) but accessing native bridge properties
// will throw a fatal native error. We wrap EVERY access in its own try/catch.

async function safeImport(moduleName: string): Promise<any | null> {
  try {
    switch (moduleName) {
      case 'expo-device': return await import('expo-device');
      case 'expo-application': return await import('expo-application');
      case '@react-native-community/netinfo': return await import('@react-native-community/netinfo');
      default: return null;
    }
  } catch {
    return null;
  }
}

// ─── Device Info ────────────────────────────────────────────────────────────

export async function captureDeviceFingerprint(): Promise<DeviceFingerprint> {
  // Start with a safe fallback
  const android = Platform.OS === 'android' ? Platform.constants : null;
  const fingerprint: DeviceFingerprint = {
    brand: android?.Brand ?? null,
    model: android?.Model ?? null,
    os: Platform.OS === 'ios' ? 'iOS' : 'Android',
    osVersion: String(Platform.Version),
    deviceUniqueId: null,
    deviceName: null,
    totalMemoryMb: null,
  };

  // Try expo-device for brand/model/memory (non-critical)
  try {
    const Device = await safeImport('expo-device');
    if (Device) {
      fingerprint.brand = Device.brand ?? fingerprint.brand;
      fingerprint.model = Device.modelName ?? fingerprint.model;
      fingerprint.deviceName = Device.deviceName ?? null;
      fingerprint.totalMemoryMb = Device.totalMemory
        ? Math.round(Device.totalMemory / (1024 * 1024))
        : null;
    }
  } catch {
    // expo-device not available or native module not linked — continue
  }

  // Fallback deviceName from Constants
  if (!fingerprint.deviceName) {
    try {
      fingerprint.deviceName = Constants.deviceName ?? null;
    } catch {
      // ignore
    }
  }

  // Try to get unique device ID (non-critical)
  fingerprint.deviceUniqueId = (await getDeviceUniqueId()) ?? (await getInstallationId());

  return fingerprint;
}

async function getDeviceUniqueId(): Promise<string | null> {
  try {
    const Application = await safeImport('expo-application');
    if (!Application) return null;

    if (Platform.OS === 'android') {
      // getAndroidId() is synchronous and accesses a native property.
      // If the native module is not linked, this will throw.
      try {
        return Application.getAndroidId();
      } catch {
        return null;
      }
    }
    if (Platform.OS === 'ios') {
      try {
        return await Application.getIosIdForVendorAsync();
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    // expo-application not installed — return null
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

  // Get public IP via lightweight API (non-critical)
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

  // Try NetInfo for connection type and carrier (non-critical)
  try {
    const NetInfo = await safeImport('@react-native-community/netinfo');
    if (NetInfo) {
      const fetchFn = NetInfo.default?.fetch ?? NetInfo.fetch;
      if (typeof fetchFn === 'function') {
        const state = await fetchFn();
        result.isConnected = state.isConnected ?? true;

        if (state.type === 'wifi') {
          result.networkType = 'wifi';
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
      }
    }
  } catch {
    // NetInfo not available — continue with defaults
  }

  return result;
}

// ─── Location ───────────────────────────────────────────────────────────────

export async function captureLocationFingerprint(): Promise<LocationFingerprint | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // A content receipt must never open an OS location or accuracy prompt.
    // Record a recent location only when the user has already allowed access.
    const location = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (!location) return null;

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

  // Try expo-application for native app info
  try {
    const Application = await safeImport('expo-application');
    if (Application) {
      // Each access wrapped individually — native module might not be linked
      try { version = Application.nativeApplicationVersion ?? version; } catch { /* ignore */ }
      try { build = Application.nativeBuildVersion ?? null; } catch { /* ignore */ }
      try { bundleId = Application.applicationId ?? null; } catch { /* ignore */ }
    }
  } catch {
    // Fall through to Constants fallback
  }

  // Fallback to Constants
  if (version === '0.1.0') {
    try {
      version = Constants.expoConfig?.version ?? version;
    } catch {
      // ignore
    }
  }

  if (!build) {
    const configBuild = Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;
    build = configBuild == null ? null : String(configBuild);
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
 *
 * Safety: This function NEVER throws. If any capture fails, it returns
 * safe defaults. A failed snapshot must NOT block KYC or content actions.
 */
export async function captureForensicSnapshot(): Promise<ForensicSnapshot> {
  // Run all captures in parallel, each with its own error isolation
  const [device, network, location, app] = await Promise.all([
    captureDeviceFingerprint().catch((): DeviceFingerprint => ({
      brand: null,
      model: null,
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      osVersion: String(Platform.Version),
      deviceUniqueId: null,
      deviceName: null,
      totalMemoryMb: null,
    })),
    captureNetworkFingerprint().catch((): NetworkFingerprint => ({
      publicIp: null,
      localIp: null,
      networkType: 'unknown',
      carrierName: null,
      wifiSsid: null,
      isConnected: true,
    })),
    captureLocationFingerprint().catch(() => null),
    captureAppFingerprint().catch((): AppFingerprint => ({
      version: Constants.expoConfig?.version ?? '0.1.0',
      build: null,
      bundleId: null,
      sessionId: getSessionId(),
    })),
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
    captureDeviceFingerprint().catch((): DeviceFingerprint => ({
      brand: null,
      model: null,
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      osVersion: String(Platform.Version),
      deviceUniqueId: null,
      deviceName: null,
      totalMemoryMb: null,
    })),
    captureAppFingerprint().catch((): AppFingerprint => ({
      version: Constants.expoConfig?.version ?? '0.1.0',
      build: null,
      bundleId: null,
      sessionId: getSessionId(),
    })),
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
