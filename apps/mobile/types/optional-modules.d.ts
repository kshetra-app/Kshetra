/**
 * Ambient type declarations for optional native packages.
 * These packages are loaded dynamically with try-catch in deviceFingerprint.ts.
 * If not installed, the code gracefully degrades — these stubs just silence TS errors.
 */

declare module 'expo-device' {
  export const brand: string | null;
  export const modelName: string | null;
  export const deviceName: string | null;
  export const totalMemory: number | null;
  export const osInternalBuildId: string | null;
  export const deviceYearClass: number | null;
  export const isDevice: boolean;
}

declare module 'expo-application' {
  export const nativeApplicationVersion: string | null;
  export const nativeBuildVersion: string | null;
  export const applicationId: string | null;
  export function getAndroidId(): string | null;
  export function getIosIdForVendorAsync(): Promise<string | null>;
}

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    details: Record<string, unknown> | null;
  }
  const NetInfo: {
    fetch(): Promise<NetInfoState>;
    addEventListener(listener: (state: NetInfoState) => void): () => void;
  };
  export default NetInfo;
}
