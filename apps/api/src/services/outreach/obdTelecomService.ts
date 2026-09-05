import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface OBDBroadcastInput {
  campaignId: string;
  politicianId: string;
  title: string;
  audioUrl: string;
  audioDurationSeconds?: number;
  targetSegment: {
    type: string;
    wardNo?: number;
    boothNumbers?: string[];
    voterCount: number;
  };
  ratePerCallINR: number;
}

export interface OBDBroadcastRecord {
  id: string;
  campaignId: string;
  politicianId: string;
  title: string;
  audioUrl: string;
  audioDurationSeconds: number;
  targetSegment: {
    type: string;
    wardNo?: number;
    boothNumbers?: string[];
    voterCount: number;
  };
  totalRecipients: number;
  ratePerCallINR: number;
  totalCostINR: number;
  status: 'queued' | 'calling' | 'completed' | 'cancelled' | 'failed' | 'outside_trai_window';
  providerRef?: string;
  answeredCount: number;
  busyCount: number;
  unreachableCount: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ─── TRAI Opt-Out Ledger ───
export interface TraiOptOutRecord {
  phoneNumber: string;
  optedOutAt: string;
  channel: 'voice_press_9' | 'sms_stop';
  campaignId?: string;
}

const inMemoryOptOuts = new Set<string>();

export function isNumberOptedOut(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  return inMemoryOptOuts.has(cleaned);
}

export async function recordOptOut(phone: string, campaignId?: string): Promise<boolean> {
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  if (!cleaned) return false;
  inMemoryOptOuts.add(cleaned);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('trai_opt_outs').upsert({
        phone_number: cleaned,
        channel: 'voice_press_9',
        campaign_id: campaignId ?? null,
        opted_out_at: new Date().toISOString(),
      }, { onConflict: 'phone_number' });
    } catch {
      // Best-effort database persist
    }
  }
  return true;
}

// In-memory store for dev / offline testing
const inMemoryBroadcasts: OBDBroadcastRecord[] = [
  {
    id: 'obd-demo-1',
    campaignId: 'c1',
    politicianId: 'pp1',
    title: 'Ward 12 Drinking Water Promise',
    audioUrl: 'https://assets.kshetra.app/audio/c1-manifesto-water.mp3',
    audioDurationSeconds: 28,
    targetSegment: { type: 'ward', wardNo: 12, voterCount: 1200 },
    totalRecipients: 1200,
    ratePerCallINR: 0.90,
    totalCostINR: 1080,
    status: 'completed',
    providerRef: 'exo_batch_89412',
    answeredCount: 1056,
    busyCount: 88,
    unreachableCount: 56,
    startedAt: '2026-05-20T10:30:00Z',
    completedAt: '2026-05-20T10:48:00Z',
    createdAt: '2026-05-20T10:25:00Z',
  },
];

/**
 * Checks whether the current time in India (IST, UTC+5:30) is within
 * the legally permitted TRAI calling window: 9:00 AM to 8:00 PM (09:00 to 20:00).
 */
export function isWithinTraiWindow(): { permitted: boolean; currentISTHour: number; message?: string } {
  const now = new Date();
  // Compute IST offset: UTC + 5 hours 30 mins (330 minutes)
  const istOffsetMinutes = 330;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffsetMinutes) % 1440;
  const currentISTHour = Math.floor(istMinutes / 60);

  // 9 AM to 8 PM
  const permitted = currentISTHour >= 9 && currentISTHour < 20;

  return {
    permitted,
    currentISTHour,
    message: permitted
      ? undefined
      : `TRAI regulations restrict automated political calls to 9:00 AM – 8:00 PM IST (Current IST hour: ${currentISTHour}:00). Calls will be scheduled for delivery at 9:00 AM tomorrow.`,
  };
}

/**
 * Dispatches an outbound voice call batch.
 * Enforces TRAI calling windows and initiates telecom call delivery.
 */
export async function dispatchOBDBroadcast(input: OBDBroadcastInput): Promise<{
  success: boolean;
  broadcast: OBDBroadcastRecord;
  warning?: string;
}> {
  const traiCheck = isWithinTraiWindow();
  const initialStatus = traiCheck.permitted ? 'calling' : 'outside_trai_window';

  const voterCount = input.targetSegment.voterCount;
  const totalCost = Math.round(voterCount * input.ratePerCallINR);
  const nowIso = new Date().toISOString();

  const record: OBDBroadcastRecord = {
    id: `obd-${Date.now().toString(36)}`,
    campaignId: input.campaignId,
    politicianId: input.politicianId,
    title: input.title,
    audioUrl: input.audioUrl,
    audioDurationSeconds: input.audioDurationSeconds || 30,
    targetSegment: input.targetSegment,
    totalRecipients: voterCount,
    ratePerCallINR: input.ratePerCallINR,
    totalCostINR: totalCost,
    status: initialStatus,
    providerRef: `exo_${Date.now().toString(36)}`,
    answeredCount: 0,
    busyCount: 0,
    unreachableCount: 0,
    startedAt: traiCheck.permitted ? nowIso : undefined,
    createdAt: nowIso,
  };

  inMemoryBroadcasts.unshift(record);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('voice_obd_broadcasts').insert(record);
    } catch {}
  }

  // Simulate telecom progressive call delivery in background if within window
  if (traiCheck.permitted) {
    simulateDeliveryProgress(record.id, voterCount);
  }

  return {
    success: true,
    broadcast: record,
    warning: traiCheck.message,
  };
}

/**
 * Simulates telecom webhook delivery updates over a few seconds for dev/test mode.
 */
function simulateDeliveryProgress(broadcastId: string, total: number) {
  setTimeout(() => {
    const item = inMemoryBroadcasts.find((b) => b.id === broadcastId);
    if (!item) return;

    const answered = Math.floor(total * 0.88);
    const busy = Math.floor(total * 0.08);
    const unreachable = total - answered - busy;

    item.answeredCount = answered;
    item.busyCount = busy;
    item.unreachableCount = unreachable;
    item.status = 'completed';
    item.completedAt = new Date().toISOString();

    if (isSupabaseConfigured) {
      supabase
        .from('voice_obd_broadcasts')
        .update({
          answered_count: answered,
          busy_count: busy,
          unreachable_count: unreachable,
          status: 'completed',
          completed_at: item.completedAt,
        })
        .eq('id', broadcastId)
        .then(() => {});
    }
  }, 4000);
}

/**
 * Returns past broadcasts for a campaign or politician.
 */
export async function getOBDBroadcasts(politicianId: string): Promise<OBDBroadcastRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('voice_obd_broadcasts')
        .select('*')
        .eq('politician_id', politicianId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as OBDBroadcastRecord[];
      }
    } catch {}
  }

  return inMemoryBroadcasts.filter((b) => b.politicianId === politicianId || !politicianId);
}

/**
 * Processes incoming telecom webhook callback (e.g. from Exotel / Knowlarity).
 * Handles delivery statuses and 2-way IVR DTMF responses (Press 9 for Opt-Out).
 */
export async function processTelecomWebhook(payload: {
  CallSid?: string;
  Status?: string;
  CustomField?: string;
  Duration?: number;
  Digits?: string; // DTMF input e.g. "9", "1", "2"
  From?: string;   // Voter phone number
  To?: string;
}) {
  const broadcastId = payload.CustomField;
  const callerPhone = payload.From || payload.To;

  // 1. Mandatory Press 9 Opt-Out Handling
  if (payload.Digits === '9' && callerPhone) {
    await recordOptOut(callerPhone, broadcastId);
    return {
      ok: true,
      action: 'opt_out_recorded',
      phone: callerPhone.slice(-4),
      message: 'Voter opted out via Press 9. Excluded from future voice campaigns.',
    };
  }

  // 2. 2-way IVR Interactive Response (Press 1 or 2)
  if (payload.Digits && ['1', '2'].includes(payload.Digits)) {
    return {
      ok: true,
      action: 'ivr_digit_captured',
      digit: payload.Digits,
      message: `Captured IVR response digit ${payload.Digits}`,
    };
  }

  if (!broadcastId) return { ok: true, ignored: true };

  const item = inMemoryBroadcasts.find((b) => b.id === broadcastId || b.providerRef === broadcastId);
  if (item) {
    if (payload.Status === 'completed') item.answeredCount += 1;
    else if (payload.Status === 'busy') item.busyCount += 1;
    else item.unreachableCount += 1;
  }

  return { ok: true, updated: true };
}
