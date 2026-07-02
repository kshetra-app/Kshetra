import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOutreachStore } from '../stores/outreach';
import {
  CHANNELS,
  creditsPerRecipient,
  type OutreachChannel,
  type AudienceSegment,
  type Broadcast,
} from '../lib/outreachTypes';

type SubTab = 'compose' | 'history' | 'templates';

const fmt = (n: number) => n.toLocaleString('en-IN');

const STATUS_META: Record<Broadcast['status'], { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  scheduled: { label: 'Scheduled', color: '#F59E0B' },
  sending: { label: 'Sending', color: '#3B82F6' },
  sent: { label: 'Sent', color: '#10B981' },
  failed: { label: 'Cancelled', color: '#EF4444' },
};

export default function CampaignOutreachPanel() {
  const [subTab, setSubTab] = useState<SubTab>('compose');
  const broadcasts = useOutreachStore((s) => s.broadcasts);

  return (
    <View>
      {/* Sub-tab segmented control */}
      <View style={styles.segment}>
        {(['compose', 'history', 'templates'] as SubTab[]).map((k) => (
          <Pressable
            key={k}
            style={[styles.segmentBtn, subTab === k && styles.segmentBtnActive]}
            onPress={() => setSubTab(k)}
          >
            <Text style={[styles.segmentText, subTab === k && styles.segmentTextActive]}>
              {k === 'compose' ? 'Compose' : k === 'history' ? `History (${broadcasts.length})` : 'Templates'}
            </Text>
          </Pressable>
        ))}
      </View>

      {subTab === 'compose' && <Composer onSent={() => setSubTab('history')} />}
      {subTab === 'history' && <History />}
      {subTab === 'templates' && <Templates />}
    </View>
  );
}

// ── Composer ────────────────────────────────────────────────────────────────

function Composer({ onSent }: { onSent: () => void }) {
  const segments = useOutreachStore((s) => s.segments);
  const templates = useOutreachStore((s) => s.templates);
  const createBroadcast = useOutreachStore((s) => s.createBroadcast);

  const [channel, setChannel] = useState<OutreachChannel>('whatsapp');
  const [segment, setSegment] = useState<AudienceSegment>(segments[0]);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState<'now' | '1h' | '3h' | 'tomorrow'>('now');
  const [sending, setSending] = useState(false);

  const channelTemplates = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);
  const activeChannel = CHANNELS.find((c) => c.key === channel)!;

  const perRecipient = creditsPerRecipient(channel, body || ' ');
  const estCredits = perRecipient * segment.size;
  const smsSegments = channel === 'sms' ? Math.max(1, Math.ceil((body.length || 1) / 160)) : 0;

  const variables = channelTemplates.find((t) => t.id === templateId)?.variables ?? [];

  const insertVar = (v: string) => setBody((b) => `${b}{${v}}`);

  const scheduledAt = () => {
    const d = new Date();
    if (schedule === '1h') d.setHours(d.getHours() + 1);
    else if (schedule === '3h') d.setHours(d.getHours() + 3);
    else if (schedule === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else return undefined;
    return d.toISOString();
  };

  const canSend = body.trim().length > 0 && !!segment && !sending;

  const doSend = () => {
    const finalName = name.trim() || `${activeChannel.label} to ${segment.name}`;
    const when = scheduledAt();
    Alert.alert(
      when ? 'Schedule broadcast?' : 'Send broadcast?',
      `${activeChannel.label} · ${fmt(segment.size)} recipients\n\nNote: This is a simulation — no real messages are sent. Live sending will require provider credentials${channel === 'sms' ? ' and DLT approval' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: when ? 'Schedule' : 'Send now',
          onPress: async () => {
            setSending(true);
            await createBroadcast({ name: finalName, channel, segment, templateId, body, scheduledAt: when });
            setSending(false);
            setBody(''); setName(''); setTemplateId(undefined);
            onSent();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.pad}>
      {/* Compliance banner */}
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
        <Text style={styles.noticeText}>
          Simulation mode. Real delivery needs provider setup{channel === 'sms' ? ' + DLT-registered templates' : ''}. Only message opted-in contacts.
        </Text>
      </View>

      {/* Channel */}
      <Text style={styles.label}>Channel</Text>
      <View style={styles.channelRow}>
        {CHANNELS.map((c) => {
          const active = channel === c.key;
          return (
            <Pressable
              key={c.key}
              style={[styles.channelCard, active && { borderColor: c.color, backgroundColor: c.color + '15' }]}
              onPress={() => { setChannel(c.key); setTemplateId(undefined); }}
            >
              <Ionicons name={c.icon as any} size={22} color={active ? c.color : '#9CA3AF'} />
              <Text style={[styles.channelLabel, active && { color: c.color }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{activeChannel.hint}</Text>

      {/* Audience */}
      <Text style={styles.label}>Audience</Text>
      {segments.map((s) => {
        const active = segment.id === s.id;
        return (
          <Pressable key={s.id} style={[styles.segCard, active && styles.segCardActive]} onPress={() => setSegment(s)}>
            <View style={styles.radioOuter}>{active && <View style={styles.radioInner} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.segName}>{s.name}</Text>
              <Text style={styles.segDesc}>{s.description}</Text>
            </View>
            <Text style={styles.segSize}>{fmt(s.size)}</Text>
          </Pressable>
        );
      })}

      {/* Templates */}
      {channelTemplates.length > 0 && (
        <>
          <Text style={styles.label}>Template</Text>
          <View style={styles.tplRow}>
            {channelTemplates.map((t) => {
              const active = templateId === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.tplChip, active && styles.tplChipActive]}
                  onPress={() => { setTemplateId(t.id); setBody(t.body); }}
                >
                  <Text style={[styles.tplChipText, active && { color: '#FFF' }]}>{t.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Message */}
      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.textArea}
        value={body}
        onChangeText={(t) => setBody(t)}
        placeholder={channel === 'voice' ? 'Describe the recorded voice message…' : 'Type your message. Use {name}, {booth} for personalisation.'}
        placeholderTextColor="#4B5563"
        multiline
      />
      {variables.length > 0 && (
        <View style={styles.varRow}>
          {variables.map((v) => (
            <Pressable key={v} style={styles.varChip} onPress={() => insertVar(v)}>
              <Text style={styles.varChipText}>{'{'}{v}{'}'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.counter}>
        {body.length} chars{channel === 'sms' ? ` · ${smsSegments} SMS segment${smsSegments > 1 ? 's' : ''}` : ''}
      </Text>

      {/* Campaign name */}
      <Text style={styles.label}>Broadcast name (optional)</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={`${activeChannel.label} to ${segment.name}`}
        placeholderTextColor="#4B5563"
      />

      {/* Schedule */}
      <Text style={styles.label}>Delivery</Text>
      <View style={styles.tplRow}>
        {([['now', 'Send now'], ['1h', 'In 1 hour'], ['3h', 'In 3 hours'], ['tomorrow', 'Tomorrow 9 AM']] as const).map(([k, lbl]) => (
          <Pressable key={k} style={[styles.tplChip, schedule === k && styles.tplChipActive]} onPress={() => setSchedule(k)}>
            <Text style={[styles.tplChipText, schedule === k && { color: '#FFF' }]}>{lbl}</Text>
          </Pressable>
        ))}
      </View>

      {/* Estimate */}
      <View style={styles.estimate}>
        <View style={styles.estItem}>
          <Text style={styles.estValue}>{fmt(segment.size)}</Text>
          <Text style={styles.estLabel}>Recipients</Text>
        </View>
        <View style={styles.estDivider} />
        <View style={styles.estItem}>
          <Text style={styles.estValue}>{fmt(estCredits)}</Text>
          <Text style={styles.estLabel}>Est. credits</Text>
        </View>
        <View style={styles.estDivider} />
        <View style={styles.estItem}>
          <Text style={[styles.estValue, { color: activeChannel.color }]}>{activeChannel.label}</Text>
          <Text style={styles.estLabel}>Channel</Text>
        </View>
      </View>

      <Pressable style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} disabled={!canSend} onPress={doSend}>
        {sending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name={schedule === 'now' ? 'send' : 'time'} size={18} color="#FFF" />
            <Text style={styles.sendBtnText}>{schedule === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// ── History ───────────────────────────────────────────────────────────────

function History() {
  const broadcasts = useOutreachStore((s) => s.broadcasts);
  const cancelBroadcast = useOutreachStore((s) => s.cancelBroadcast);

  if (broadcasts.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="paper-plane-outline" size={44} color="#1F2937" />
        <Text style={styles.emptyText}>No broadcasts yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.pad}>
      {broadcasts.map((b) => {
        const meta = STATUS_META[b.status];
        const chan = CHANNELS.find((c) => c.key === b.channel)!;
        const pct = (n: number) => (b.stats.audience ? Math.round((n / b.stats.audience) * 100) : 0);
        return (
          <View key={b.id} style={styles.bcCard}>
            <View style={styles.bcHead}>
              <View style={[styles.bcIcon, { backgroundColor: chan.color + '20' }]}>
                <Ionicons name={chan.icon as any} size={16} color={chan.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bcName} numberOfLines={1}>{b.name}</Text>
                <Text style={styles.bcMeta}>{chan.label} · {b.segmentName} · {fmt(b.stats.audience)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.color + '20' }]}>
                {b.status === 'sending' && <ActivityIndicator size="small" color={meta.color} />}
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            {b.status === 'scheduled' && b.scheduledAt && (
              <View style={styles.scheduledRow}>
                <Ionicons name="time-outline" size={13} color="#F59E0B" />
                <Text style={styles.scheduledText}>
                  Goes out {new Date(b.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Pressable style={styles.cancelBtn} onPress={() => cancelBroadcast(b.id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {(b.status === 'sending' || b.status === 'sent') && (
              <>
                {/* delivery progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressSeg, { flex: b.stats.delivered, backgroundColor: '#10B981' }]} />
                  <View style={[styles.progressSeg, { flex: Math.max(0, b.stats.sent - b.stats.delivered), backgroundColor: '#3B82F6' }]} />
                  <View style={[styles.progressSeg, { flex: b.stats.failed, backgroundColor: '#EF4444' }]} />
                  <View style={[styles.progressSeg, { flex: Math.max(0, b.stats.audience - b.stats.sent - b.stats.failed), backgroundColor: '#1F2937' }]} />
                </View>
                <View style={styles.statRow}>
                  <Stat label="Sent" value={`${fmt(b.stats.sent)}`} sub={`${pct(b.stats.sent)}%`} color="#3B82F6" />
                  <Stat label="Delivered" value={`${fmt(b.stats.delivered)}`} sub={`${pct(b.stats.delivered)}%`} color="#10B981" />
                  {b.channel === 'whatsapp' && <Stat label="Read" value={`${fmt(b.stats.read)}`} sub={`${pct(b.stats.read)}%`} color="#8B5CF6" />}
                  {b.channel === 'voice' && <Stat label="Answered" value={`${fmt(b.stats.read)}`} sub={`${pct(b.stats.read)}%`} color="#8B5CF6" />}
                  <Stat label="Failed" value={`${fmt(b.stats.failed)}`} sub={`${pct(b.stats.failed)}%`} color="#EF4444" />
                </View>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

// ── Templates ───────────────────────────────────────────────────────────────

function Templates() {
  const templates = useOutreachStore((s) => s.templates);
  const addTemplate = useOutreachStore((s) => s.addTemplate);
  const deleteTemplate = useOutreachStore((s) => s.deleteTemplate);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<OutreachChannel>('whatsapp');
  const [body, setBody] = useState('');

  const save = () => {
    if (!name.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Give the template a name and a message body.');
      return;
    }
    addTemplate({ name: name.trim(), channel, body: body.trim() });
    setName(''); setBody(''); setAdding(false);
  };

  return (
    <View style={styles.pad}>
      <Pressable style={styles.addBtn} onPress={() => setAdding((v) => !v)}>
        <Ionicons name={adding ? 'close' : 'add'} size={18} color="#4F8EF7" />
        <Text style={styles.addBtnText}>{adding ? 'Close' : 'New template'}</Text>
      </Pressable>

      {adding && (
        <View style={styles.addForm}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Template name" placeholderTextColor="#4B5563" />
          <View style={[styles.channelRow, { marginVertical: 8 }]}>
            {CHANNELS.map((c) => (
              <Pressable
                key={c.key}
                style={[styles.channelCard, channel === c.key && { borderColor: c.color, backgroundColor: c.color + '15' }]}
                onPress={() => setChannel(c.key)}
              >
                <Ionicons name={c.icon as any} size={18} color={channel === c.key ? c.color : '#9CA3AF'} />
                <Text style={[styles.channelLabel, channel === c.key && { color: c.color }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.textArea} value={body} onChangeText={setBody} placeholder="Body with {name}, {booth}…" placeholderTextColor="#4B5563" multiline />
          <Pressable style={styles.sendBtn} onPress={save}>
            <Ionicons name="save" size={16} color="#FFF" />
            <Text style={styles.sendBtnText}>Save template</Text>
          </Pressable>
        </View>
      )}

      {templates.map((t) => {
        const chan = CHANNELS.find((c) => c.key === t.channel)!;
        return (
          <View key={t.id} style={styles.tplCard}>
            <View style={styles.bcHead}>
              <View style={[styles.bcIcon, { backgroundColor: chan.color + '20' }]}>
                <Ionicons name={chan.icon as any} size={15} color={chan.color} />
              </View>
              <Text style={[styles.bcName, { flex: 1 }]}>{t.name}</Text>
              <Pressable hitSlop={8} onPress={() => deleteTemplate(t.id)}>
                <Ionicons name="trash-outline" size={16} color="#6B7280" />
              </Pressable>
            </View>
            <Text style={styles.tplBody}>{t.body}</Text>
            {t.variables.length > 0 && (
              <View style={styles.varRow}>
                {t.variables.map((v) => (
                  <View key={v} style={styles.varChip}><Text style={styles.varChipText}>{'{'}{v}{'}'}</Text></View>
                ))}
              </View>
            )}
            {t.dltTemplateId && <Text style={styles.dlt}>DLT: {t.dltTemplateId}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 12 },
  segment: { flexDirection: 'row', margin: 16, marginBottom: 0, backgroundColor: '#111827', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#4F8EF7' },
  segmentText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  segmentTextActive: { color: '#FFFFFF' },

  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#F59E0B12', borderWidth: 1, borderColor: '#F59E0B30', borderRadius: 12, padding: 10, marginBottom: 6 },
  noticeText: { flex: 1, fontSize: 11, color: '#D1D5DB', lineHeight: 15 },

  label: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 6 },

  channelRow: { flexDirection: 'row', gap: 8 },
  channelCard: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#1F2937', backgroundColor: '#111827' },
  channelLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },

  segCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827', marginBottom: 8 },
  segCardActive: { borderColor: '#4F8EF7', backgroundColor: '#4F8EF710' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4F8EF7', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F8EF7' },
  segName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  segDesc: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  segSize: { fontSize: 13, fontWeight: '800', color: '#4F8EF7' },

  tplRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tplChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  tplChipActive: { backgroundColor: '#4F8EF7', borderColor: '#4F8EF7' },
  tplChipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },

  textArea: { minHeight: 110, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', padding: 12, color: '#FFFFFF', fontSize: 14, textAlignVertical: 'top' },
  input: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', padding: 12, color: '#FFFFFF', fontSize: 14 },
  varRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  varChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#4F8EF720' },
  varChipText: { fontSize: 11, fontWeight: '700', color: '#4F8EF7' },
  counter: { fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'right' },

  estimate: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', padding: 14, marginTop: 16 },
  estItem: { flex: 1, alignItems: 'center' },
  estValue: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  estLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  estDivider: { width: 1, height: 30, backgroundColor: '#1F2937' },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F8EF7', borderRadius: 14, paddingVertical: 15, marginTop: 16 },
  sendBtnDisabled: { backgroundColor: '#1F2937' },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  bcCard: { backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1F2937', padding: 14, marginBottom: 10 },
  bcHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bcIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  bcName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  bcMeta: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },

  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  scheduledText: { flex: 1, fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#EF444420' },
  cancelText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },

  progressTrack: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12, backgroundColor: '#1F2937' },
  progressSeg: { height: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  statSub: { fontSize: 9, color: '#6B7280' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#4F8EF740', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#4F8EF7' },
  addForm: { backgroundColor: '#0D1424', borderRadius: 12, padding: 12, marginBottom: 14, gap: 4 },
  tplCard: { backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1F2937', padding: 14, marginBottom: 10 },
  tplBody: { fontSize: 12, color: '#D1D5DB', lineHeight: 17, marginTop: 10 },
  dlt: { fontSize: 10, color: '#6B7280', marginTop: 8, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#374151' },
});
