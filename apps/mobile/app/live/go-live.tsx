import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import { useContributorVerificationStore } from '../../stores/contributorVerification';
import type {
  VisibilityMode,
  IssueCategory,
  DepartmentType,
  AccreditationTier,
} from '../../lib/lmxTypes';
import {
  VISIBILITY_CONFIG,
  ISSUE_CATEGORY_CONFIG,
  DEPARTMENT_CONFIG,
  TIER_CONFIG,
  computeBufferSeconds,
} from '../../lib/lmxTypes';

const CATEGORIES: IssueCategory[] = [
  'emergency',
  'breaking_news',
  'traffic',
  'weather',
  'civic',
  'general',
];

const DEPARTMENTS: DepartmentType[] = [
  'police',
  'fire',
  'hospital',
  'disaster_management',
  'anti_corruption',
  'traffic_police',
  'municipal',
  'collectorate',
];

// Demo reporter identity — in production this comes from the auth/session layer.
const DEMO_REPORTER = { id: 'u-citizen-1', name: 'You (Citizen)', tier: 'citizen' as AccreditationTier };

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const affiliations = useLiveExchangeStore(useShallow((s) => s.getActiveAffiliations(DEMO_REPORTER.id)));
  const startLiveEvent = useLiveExchangeStore((s) => s.startLiveEvent);
  const aiServiceEnabled = useLiveExchangeStore((s) => s.aiServiceEnabled);
  const requestAction = useContributorVerificationStore((s) => s.requestAction);

  // Three orthogonal choices
  const [affiliationId, setAffiliationId] = useState<string | null>(null); // null = Independent
  const [visibility, setVisibility] = useState<VisibilityMode>('public');
  const [alertDepts, setAlertDepts] = useState<DepartmentType[]>([]);

  const [category, setCategory] = useState<IssueCategory>('general');
  const [tags, setTags] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'ready' | 'unavailable'>('detecting');

  // Real device camera capture (expo-image-picker). True live RTMP publish needs
  // the managed media plane; until then this captures a real clip for look-and-feel.
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [captureSeconds, setCaptureSeconds] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const selectedAffiliation = affiliations.find((a) => a.id === affiliationId);
  const tier = DEMO_REPORTER.tier;

  // Capture GPS (optional — flow continues with a default if unavailable).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setGps({ lat: 17.385, lng: 78.4867 });
            setGpsStatus('unavailable');
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ready');
        }
      } catch {
        if (!cancelled) {
          setGps({ lat: 17.385, lng: 78.4867 });
          setGpsStatus('unavailable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasExclusiveOption = affiliations.some((a) => a.exclusivityFlag);

  const bufferSeconds = useMemo(
    () => computeBufferSeconds(tier, alertDepts.length > 0),
    [tier, alertDepts.length],
  );

  const toggleDept = (d: DepartmentType) =>
    setAlertDepts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const canGoLive = gps !== null;

  const captureClip = async () => {
    setCaptureError(null);
    setCapturing(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setCaptureError('Camera permission denied. You can still go live with a demo stream.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setCapturedUri(asset.uri);
        setCaptureSeconds(asset.duration ? Math.round(asset.duration / 1000) : null);
      }
    } catch {
      setCaptureError('Camera unavailable on this device. You can still go live with a demo stream.');
    } finally {
      setCapturing(false);
    }
  };

  const handleGoLive = () => {
    // KYC gate — going live is a high-severity content action.
    const gate = requestAction('go_live');
    if (!gate.allowed) return; // KYC sheet auto-shown by the store.

    const event = startLiveEvent({
      reporterId: DEMO_REPORTER.id,
      reporterName: selectedAffiliation ? DEMO_REPORTER.name : DEMO_REPORTER.name,
      accreditationTier: selectedAffiliation ? 'organization' : tier,
      visibilityMode: visibility,
      alertDepartments: alertDepts,
      affiliationId,
      issueCategory: category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      gpsLat: gps?.lat ?? null,
      gpsLng: gps?.lng ?? null,
      stateCode: 'TS',
      districtName: 'Hyderabad',
      locality: null,
    });

    router.replace(`/live/${event.id}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Go Live</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* GPS status */}
        <View style={styles.gpsBar}>
          <Ionicons
            name={gpsStatus === 'ready' ? 'location' : 'location-outline'}
            size={14}
            color={gpsStatus === 'ready' ? '#10B981' : '#F59E0B'}
          />
          <Text style={styles.gpsText}>
            {gpsStatus === 'detecting'
              ? 'Detecting location…'
              : gpsStatus === 'ready'
                ? `Location locked (${gps?.lat.toFixed(3)}, ${gps?.lng.toFixed(3)})`
                : 'Using approximate location (permission denied)'}
          </Text>
        </View>

        {/* Camera capture */}
        <Section
          title="Camera"
          hint="Record a clip from your device camera. Live RTMP publish activates once the media plane is provisioned."
        >
          {capturedUri ? (
            <View style={styles.captureDone}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.captureDoneText}>Clip captured</Text>
                <Text style={styles.captureMeta}>
                  {captureSeconds != null ? `${captureSeconds}s · ` : ''}ready on device
                </Text>
              </View>
              <Pressable onPress={captureClip} hitSlop={8}>
                <Text style={styles.recapture}>Re-record</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.captureBtn, capturing && { opacity: 0.6 }]}
              onPress={captureClip}
              disabled={capturing}
            >
              <Ionicons name="videocam" size={18} color="#FFFFFF" />
              <Text style={styles.captureBtnText}>
                {capturing ? 'Opening camera…' : 'Record a clip'}
              </Text>
            </Pressable>
          )}
          {!!captureError && (
            <View style={styles.alertNote}>
              <Ionicons name="warning" size={13} color="#F59E0B" />
              <Text style={styles.alertNoteText}>{captureError}</Text>
            </View>
          )}
        </Section>

        {/* 1. Broadcasting as */}
        <Section title="Broadcasting as" hint="Choose an affiliation or stream independently.">
          <OptionRow
            active={affiliationId === null}
            icon="person"
            color="#6B7280"
            label="Independent"
            sub="No branding — neutral Kshetra watermark"
            onPress={() => setAffiliationId(null)}
          />
          {affiliations.map((a) => (
            <OptionRow
              key={a.id}
              active={affiliationId === a.id}
              icon="business"
              color="#4F8EF7"
              label={a.organizationName}
              sub={a.exclusivityFlag ? 'Exclusive contract' : 'Non-exclusive'}
              onPress={() => setAffiliationId(a.id)}
            />
          ))}
        </Section>

        {/* 2. Visibility */}
        <Section title="Visibility" hint="Who else can see this stream. Independent of department alerts.">
          {(Object.keys(VISIBILITY_CONFIG) as VisibilityMode[]).map((v) => {
            const cfg = VISIBILITY_CONFIG[v];
            const disabled = v === 'exclusive_partner' && !hasExclusiveOption;
            return (
              <OptionRow
                key={v}
                active={visibility === v}
                disabled={disabled}
                icon={cfg.icon}
                color={cfg.color}
                label={cfg.label + (disabled ? ' (needs exclusive contract)' : '')}
                sub={cfg.description}
                onPress={() => !disabled && setVisibility(v)}
              />
            );
          })}
        </Section>

        {/* 3. Alert to (departments) */}
        <Section
          title="Alert a government department"
          hint="Optional. Reporter-initiated only — a deliberate choice, never automatic."
        >
          <View style={styles.deptGrid}>
            {DEPARTMENTS.map((d) => {
              const cfg = DEPARTMENT_CONFIG[d];
              const active = alertDepts.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDept(d)}
                  style={[styles.deptChip, active && { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}
                >
                  <Ionicons name={cfg.icon as any} size={16} color={active ? cfg.color : '#9CA3AF'} />
                  <Text style={[styles.deptChipText, active && { color: cfg.color }]}>{cfg.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {alertDepts.length > 0 && (
            <View style={styles.alertNote}>
              <Ionicons name="information-circle" size={13} color="#F59E0B" />
              <Text style={styles.alertNoteText}>
                {alertDepts.length} department(s) will be alerted, resolved to the nearest subscribed
                office by GPS. This is logged against your identity.
              </Text>
            </View>
          )}
        </Section>

        {/* Category + tags */}
        <Section title="Category">
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const cfg = ISSUE_CATEGORY_CONFIG[c];
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.catChip, active && { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}
                >
                  <Ionicons name={cfg.icon as any} size={14} color={active ? cfg.color : '#9CA3AF'} />
                  <Text style={[styles.catChipText, active && { color: cfg.color }]}>{cfg.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tags (comma separated)"
            placeholderTextColor="#4B5563"
            value={tags}
            onChangeText={setTags}
          />
        </Section>

        {/* Moderation preview */}
        <View style={styles.bufferPreview}>
          <Ionicons name="shield-half" size={15} color="#8B5CF6" />
          <Text style={styles.bufferText}>
            Moderation buffer: ~{bufferSeconds}s before public/broadcast fan-out
            {alertDepts.length > 0 ? ' (shorter for department alerts)' : ''}.
            {!aiServiceEnabled && ' AI screening is off — human moderation applies.'}
          </Text>
        </View>
      </ScrollView>

      {/* Go Live button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.goBtn, !canGoLive && styles.goBtnDisabled]}
          disabled={!canGoLive}
          onPress={handleGoLive}
        >
          <Ionicons name="radio" size={20} color="#FFFFFF" />
          <Text style={styles.goBtnText}>
            {canGoLive ? 'Start Broadcasting' : 'Locating…'}
          </Text>
        </Pressable>
        <Text style={styles.footerHint}>
          {VISIBILITY_CONFIG[visibility].shortLabel}
          {selectedAffiliation ? ` · as ${selectedAffiliation.organizationName}` : ' · Independent'}
          {alertDepts.length > 0 ? ` · ${alertDepts.length} dept alert(s)` : ''}
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!hint && <Text style={styles.sectionHint}>{hint}</Text>}
      <View style={{ marginTop: 8, gap: 8 }}>{children}</View>
    </View>
  );
}

function OptionRow({
  active,
  disabled,
  icon,
  color,
  label,
  sub,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  icon: string;
  color: string;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optRow,
        active && { borderColor: color, backgroundColor: color + '14' },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View style={[styles.optIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optLabel}>{label}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={active ? color : '#4B5563'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  gpsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 4, padding: 10,
    backgroundColor: '#111827', borderRadius: 10,
  },
  gpsText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  sectionHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    borderRadius: 12, padding: 12,
  },
  optIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  optLabel: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },
  optSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1D4ED8', paddingVertical: 13, borderRadius: 12,
  },
  captureBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  captureDone: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#10B98155', backgroundColor: '#10B98114',
    borderRadius: 12, padding: 12,
  },
  captureDoneText: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },
  captureMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  recapture: { fontSize: 12, fontWeight: '800', color: '#4F8EF7' },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  deptChipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  alertNote: {
    flexDirection: 'row', gap: 6, marginTop: 10, padding: 10,
    backgroundColor: '#F59E0B14', borderRadius: 10,
  },
  alertNoteText: { flex: 1, fontSize: 11, color: '#FBBF24', lineHeight: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
  },
  catChipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  input: {
    marginTop: 10, backgroundColor: '#111827', borderRadius: 10,
    borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 12, paddingVertical: 10,
    color: '#F9FAFB', fontSize: 14,
  },
  bufferPreview: {
    flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 18, padding: 12,
    backgroundColor: '#8B5CF614', borderRadius: 12,
  },
  bufferText: { flex: 1, fontSize: 12, color: '#C4B5FD', lineHeight: 17 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#0A0A1A',
    borderTopWidth: 0.5, borderTopColor: '#1F2937',
  },
  goBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', paddingVertical: 15, borderRadius: 14,
  },
  goBtnDisabled: { backgroundColor: '#374151' },
  goBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  footerHint: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
