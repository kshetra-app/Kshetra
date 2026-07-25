import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveExchangeStore } from '../../stores/liveExchange';

/**
 * Recipient-side distribution config (doc Section 7a). Fastest-to-ship pieces:
 *   1. YouTube/RTMP relay — paste a stream key; the hub adds it as one more
 *      output branch on the already-branded, already-moderated feed.
 *   2. Embeddable player — copy-paste <iframe> pointing at the HLS/WebRTC feed.
 *   3. SRT endpoint — provisioned per partner for professional playout.
 * All reuse the protocol-agnostic distribution layer; no new client software.
 */
export default function DistributionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const events = useLiveExchangeStore((s) => s.getLiveTabFeed());
  const addDistribution = useLiveExchangeStore((s) => s.addDistribution);

  const [selectedId, setSelectedId] = useState<string>(events[0]?.id ?? '');
  const [relayKey, setRelayKey] = useState('');
  const [relaySaved, setRelaySaved] = useState(false);

  const selected = events.find((e) => e.id === selectedId);

  const hlsUrl = selected?.mediaPlaybackHls ?? 'https://cdn.kshetra.in/live/STREAM/index.m3u8';

  const embedSnippet = useMemo(
    () =>
      `<iframe\n  src="https://embed.kshetra.in/player?src=${encodeURIComponent(hlsUrl)}"\n  width="640" height="360"\n  frameborder="0"\n  allow="autoplay; fullscreen; picture-in-picture"\n  allowfullscreen>\n</iframe>`,
    [hlsUrl],
  );

  const srtEndpoint = selected
    ? `srt://ingest-ap-south-1.kshetra.in:8890?streamid=partner/${selected.streamId}`
    : 'srt://ingest-ap-south-1.kshetra.in:8890?streamid=partner/<stream_id>';

  const copy = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      /* share sheet dismissed — no-op */
    }
  };

  const saveRelay = () => {
    if (!selected || !relayKey.trim()) return;
    addDistribution({
      liveEventId: selected.id,
      organizationId: selected.affiliationId ?? null,
      protocol: 'rtmp',
      destinationUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: relayKey.trim(),
      branded: true,
      brandKitId: selected.activeBrandKitId ?? null,
      active: true,
      health: 'unknown',
    });
    setRelaySaved(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Distribution</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Feed picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedRow}>
          {events.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => { setSelectedId(e.id); setRelaySaved(false); }}
              style={[styles.feedChip, selectedId === e.id && styles.feedChipActive]}
            >
              <Text style={[styles.feedChipText, selectedId === e.id && styles.feedChipTextActive]} numberOfLines={1}>
                {e.streamId} · {e.reporterName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 1. YouTube / RTMP relay */}
        <Card icon="logo-youtube" color="#EF4444" title="YouTube / Digital Relay"
          hint="Paste your platform's RTMP stream key. We push the branded, moderated feed straight to it — no client software.">
          <TextInput
            style={styles.input}
            placeholder="Stream key (from your Go Live screen)"
            placeholderTextColor="#4B5563"
            value={relayKey}
            onChangeText={(t) => { setRelayKey(t); setRelaySaved(false); }}
            autoCapitalize="none"
          />
          <Pressable style={[styles.btn, relaySaved && styles.btnDone]} onPress={saveRelay}>
            <Ionicons name={relaySaved ? 'checkmark' : 'add-circle'} size={16} color="#FFFFFF" />
            <Text style={styles.btnText}>{relaySaved ? 'Relay added' : 'Add relay output'}</Text>
          </Pressable>
        </Card>

        {/* 2. Embeddable player */}
        <Card icon="code-slash" color="#14B8A6" title="Embeddable Player"
          hint="Copy-paste into any website. Points at the HLS/WebRTC feed — no relay, no key.">
          <View style={styles.codeBox}>
            <Text style={styles.code}>{embedSnippet}</Text>
          </View>
          <Pressable style={styles.copyBtn} onPress={() => copy(embedSnippet)}>
            <Ionicons name="copy" size={15} color="#14B8A6" />
            <Text style={styles.copyText}>Copy snippet</Text>
          </Pressable>
        </Card>

        {/* 3. SRT endpoint */}
        <Card icon="git-network" color="#4F8EF7" title="SRT Endpoint (broadcasters)"
          hint="Enter into your playout/receive device. Encrypted, packet-loss resilient — most TV stations ingest this.">
          <View style={styles.codeBox}>
            <Text style={styles.code}>{srtEndpoint}</Text>
          </View>
          <Pressable style={styles.copyBtn} onPress={() => copy(srtEndpoint)}>
            <Ionicons name="copy" size={15} color="#4F8EF7" />
            <Text style={[styles.copyText, { color: '#4F8EF7' }]}>Copy endpoint</Text>
          </Pressable>
        </Card>

        {/* 4. Universal web receiver */}
        <Card icon="tv" color="#F59E0B" title="Universal Web Receiver"
          hint="One HTML5 page for Windows kiosks, Android smart TVs, and touchscreens. Log in, pick a feed, present full-screen.">
          <View style={styles.codeBox}>
            <Text style={styles.code}>https://receiver.kshetra.in</Text>
          </View>
          <Text style={styles.note}>
            Ships as a separate lightweight build (apps/web-receiver). Native Windows +
            Android TV wrappers are Phase 2 polish on the same page.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function Card({
  icon,
  color,
  title,
  hint,
  children,
}: {
  icon: string;
  color: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardHint}>{hint}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  feedRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  feedChip: {
    maxWidth: 220, borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
  },
  feedChipActive: { backgroundColor: '#4F8EF722', borderColor: '#4F8EF7' },
  feedChipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  feedChipTextActive: { color: '#4F8EF7' },
  card: { marginHorizontal: 16, marginTop: 14, backgroundColor: '#111827', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#1F2937' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  cardHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, lineHeight: 17 },
  input: {
    backgroundColor: '#0A0A1A', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937',
    paddingHorizontal: 12, paddingVertical: 10, color: '#F9FAFB', fontSize: 13,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EF4444', paddingVertical: 11, borderRadius: 10, marginTop: 10,
  },
  btnDone: { backgroundColor: '#10B981' },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  codeBox: { backgroundColor: '#0A0A1A', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', padding: 12 },
  code: { fontSize: 11, color: '#93C5FD', fontFamily: 'monospace', lineHeight: 16 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  copyText: { fontSize: 12, color: '#14B8A6', fontWeight: '700' },
  note: { fontSize: 11, color: '#6B7280', marginTop: 10, lineHeight: 16 },
});
