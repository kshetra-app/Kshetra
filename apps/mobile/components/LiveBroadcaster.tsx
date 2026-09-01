/**
 * LiveBroadcaster — publishes the device camera to the self-hosted media plane
 * over WebRTC-WHIP (MediaMTX / OvenMediaEngine). This is the piece that makes the
 * go-live camera feed actually reach the stack.
 *
 * react-native-webrtc is a NATIVE module: it is imported through a guarded require
 * so the JS bundle still builds and the app still runs (with a graceful fallback)
 * even when the module isn't compiled in. Real publishing activates after a native
 * build that includes it (see infra/media/README.md + TROUBLESHOOTING.md §11).
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { negotiateWhip, stopWhip, type MinimalPeer } from '../lib/whipClient';
import { useTranslation } from 'react-i18next';

// ── Guarded native import ────────────────────────────────────────────────────
let RNWebRTC: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNWebRTC = require('react-native-webrtc');
} catch {
  RNWebRTC = null;
}

/** True only when the native WebRTC module is present (dev/native build). */
export function isBroadcastSupported(): boolean {
  return !!(RNWebRTC && RNWebRTC.RTCPeerConnection && RNWebRTC.mediaDevices && RNWebRTC.RTCView);
}

type Status = 'starting' | 'live' | 'error';

interface Props {
  /** WHIP publish endpoint (buildWhipPublishUrl(streamId)). */
  whipUrl: string;
  /** Optional publish token from the control plane. */
  token?: string;
  /** Called when the user ends the broadcast. */
  onStop: () => void;
  streamLabel?: string;
}

export default function LiveBroadcaster({ whipUrl, token, onStop, streamLabel }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('starting');
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const pcRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const resourceRef = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!isBroadcastSupported()) {
      setStatus('error');
      setError(t('lmx.broadcaster.notSupported'));
      return;
    }

    (async () => {
      try {
        const { mediaDevices, RTCPeerConnection } = RNWebRTC;
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'environment' },
        });
        if (!mounted.current) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStreamUrl(stream.toURL());

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;
        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        const session = await negotiateWhip(pc as MinimalPeer, whipUrl, { token });
        resourceRef.current = session.resourceUrl;
        if (mounted.current) setStatus('live');
      } catch (e: any) {
        if (mounted.current) {
          setStatus('error');
          setError(e?.message ?? 'Failed to start the broadcast.');
        }
      }
    })();

    return () => {
      mounted.current = false;
      stopWhip(resourceRef.current, { token });
      try { pcRef.current?.close?.(); } catch {}
      try { streamRef.current?.getTracks?.().forEach((t: any) => t.stop()); } catch {}
    };
  }, [whipUrl, token]);

  const RTCView = RNWebRTC?.RTCView;

  return (
    <View style={styles.container}>
      {streamUrl && RTCView ? (
        <RTCView streamURL={streamUrl} style={styles.preview} objectFit="cover" mirror={false} />
      ) : (
        <View style={[styles.preview, styles.previewEmpty]}>
          <Ionicons name="videocam-off" size={40} color="#4B5563" />
        </View>
      )}

      {/* Status overlay */}
      <View style={styles.topBar}>
        {status === 'live' ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('lmx.broadcaster.live')}</Text>
          </View>
        ) : status === 'starting' ? (
          <View style={styles.liveBadge}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.liveText}>{t('lmx.broadcaster.connecting')}</Text>
          </View>
        ) : (
          <View style={[styles.liveBadge, { backgroundColor: '#7F1D1D' }]}>
            <Ionicons name="warning" size={13} color="#FCA5A5" />
            <Text style={styles.liveText}>{t('lmx.broadcaster.notSupported')}</Text>
          </View>
        )}
        {!!streamLabel && <Text style={styles.streamLabel}>{streamLabel}</Text>}
      </View>

      {status === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            The viewer page will still play the stream via HLS. Rebuild with
            react-native-webrtc to publish live from this device.
          </Text>
        </View>
      )}

      <Pressable style={styles.stopBtn} onPress={onStop}>
        <Ionicons name="stop-circle" size={22} color="#FFFFFF" />
        <Text style={styles.stopText}>{status === 'live' ? t('lmx.broadcaster.endBroadcast') : 'Close'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  preview: { flex: 1 },
  previewEmpty: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A1A' },
  topBar: {
    position: 'absolute', top: 48, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  streamLabel: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  errorBox: {
    position: 'absolute', bottom: 110, left: 16, right: 16,
    backgroundColor: '#111827EE', borderRadius: 12, padding: 14, gap: 6,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '700' },
  errorHint: { color: '#9CA3AF', fontSize: 11, lineHeight: 16 },
  stopBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30,
  },
  stopText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
