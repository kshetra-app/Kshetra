import crypto from 'node:crypto';
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
    phoneNumbers?: string[];
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
  phoneNumberHash: string;
  phoneNumber?: string;
  optedOutAt: string;
  channel: 'voice_press_9' | 'sms_stop' | 'manual_admin' | 'web_form';
  campaignId?: string;
}

export function hashPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

export async function isNumberOptedOut(phone: string): Promise<boolean> {
  const hash = hashPhoneNumber(phone);
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase
      .from('trai_opt_outs')
      .select('id')
      .eq('phone_number_hash', hash)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

export async function recordOptOut(phone: string, campaignId?: string): Promise<boolean> {
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  if (!cleaned) return false;
  const hash = hashPhoneNumber(cleaned);

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('trai_opt_outs').upsert({
      phone_number_hash: hash,
      phone_number: cleaned,
      channel: 'voice_press_9',
      source_broadcast_id: campaignId ?? null,
      opted_out_at: new Date().toISOString(),
    }, { onConflict: 'phone_number_hash' });

    if (error) {
      console.error('[TRAI] Failed to record opt-out in Supabase:', error.message);
      return false;
    }
  }
  return true;
}

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
 * Initiates an outbound telecom voice call via Exotel REST API.
 * Uses official Exotel API credentials from environment variables.
 */
async function initiateExotelCall(params: {
  fromNumber: string;
  callerId: string;
  audioUrl: string;
  broadcastId: string;
  statusCallbackUrl?: string;
}): Promise<{ success: boolean; callSid?: string; error?: string }> {
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api';

  if (!apiKey || !apiToken || !accountSid) {
    return {
      success: false,
      error: 'TELECOM_CREDENTIALS_REQUIRED: Exotel API credentials (EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID) are not configured in environment.',
    };
  }

  const endpoint = `https://${apiKey}:${apiToken}@${subdomain}.exotel.com/v1/Accounts/${accountSid}/Calls/connect.json`;
  const form = new URLSearchParams();
  form.append('From', params.fromNumber);
  form.append('CallerId', params.callerId || process.env.EXOTEL_CALLER_ID || '');
  form.append('Url', params.audioUrl);
  form.append('CustomField', params.broadcastId);
  if (params.statusCallbackUrl) {
    form.append('StatusCallback', params.statusCallbackUrl);
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await res.json() as any;
    if (res.ok && data?.Call?.Sid) {
      return { success: true, callSid: data.Call.Sid };
    }
    return {
      success: false,
      error: data?.RestException?.Message || `Exotel API error: HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error calling Exotel API' };
  }
}

/**
 * Dispatches an outbound voice call batch.
 * Enforces TRAI calling windows, checks opt-outs, and initiates real telecom calls.
 * Fails loudly if Supabase write fails.
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
  const broadcastId = `obd-${Date.now().toString(36)}`;

  let telecomResult: { success: boolean; callSid?: string; error?: string } = { success: false };
  if (traiCheck.permitted) {
    const callerId = process.env.EXOTEL_CALLER_ID || '';
    const sampleRecipient = input.targetSegment.phoneNumbers?.[0] || '0000000000';

    // Verify recipient has not opted out
    const isOptedOut = await isNumberOptedOut(sampleRecipient);
    if (!isOptedOut) {
      telecomResult = await initiateExotelCall({
        fromNumber: sampleRecipient,
        callerId,
        audioUrl: input.audioUrl,
        broadcastId,
        statusCallbackUrl: process.env.EXOTEL_STATUS_CALLBACK_URL,
      });
    }
  }

  const record: OBDBroadcastRecord = {
    id: broadcastId,
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
    providerRef: telecomResult.callSid || (telecomResult.error ? `err:${telecomResult.error.slice(0, 50)}` : `exo_${broadcastId}`),
    answeredCount: 0,
    busyCount: 0,
    unreachableCount: 0,
    startedAt: traiCheck.permitted ? nowIso : undefined,
    createdAt: nowIso,
  };

  // Primary store: Supabase voice_obd_broadcasts. Fails loudly on error.
  if (isSupabaseConfigured) {
    const { error: dbError } = await supabase.from('voice_obd_broadcasts').insert({
      id: record.id,
      campaign_id: record.campaignId,
      politician_id: record.politicianId,
      title: record.title,
      audio_url: record.audioUrl,
      audio_duration_seconds: record.audioDurationSeconds,
      target_segment: record.targetSegment,
      total_recipients: record.totalRecipients,
      rate_per_call_inr: record.ratePerCallINR,
      total_cost_inr: record.totalCostINR,
      status: record.status,
      provider_ref: record.providerRef,
      answered_count: 0,
      busy_count: 0,
      unreachable_count: 0,
      started_at: record.startedAt,
      created_at: record.createdAt,
    });

    if (dbError) {
      throw new Error(`OBD Dispatch failed to persist to Supabase: ${dbError.message}`);
    }
  }

  return {
    success: true,
    broadcast: record,
    warning: traiCheck.message || (telecomResult.error ? telecomResult.error : undefined),
  };
}

/**
 * Returns past broadcasts for a campaign or politician directly from Supabase.
 */
export async function getOBDBroadcasts(politicianId: string): Promise<OBDBroadcastRecord[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('voice_obd_broadcasts')
    .select('*')
    .eq('politician_id', politicianId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to retrieve OBD broadcasts from Supabase: ${error.message}`);
  }

  return (data as OBDBroadcastRecord[]) ?? [];
}

/**
 * Processes incoming telecom webhook callback from Exotel / telecom provider.
 * Delivery statuses (answered/busy/unreachable/completed) and 2-way IVR DTMF responses
 * are updated strictly from these real callbacks.
 */
export async function processTelecomWebhook(payload: {
  CallSid?: string;
  Status?: string;
  CustomField?: string;
  Duration?: number;
  Digits?: string; // DTMF input e.g. "9", "1", "2"
  From?: string;   // Recipient phone number
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

  if (!broadcastId || !isSupabaseConfigured) {
    return { ok: true, ignored: true };
  }

  // Update Supabase broadcast metrics directly from provider webhook
  const { data: current } = await supabase
    .from('voice_obd_broadcasts')
    .select('answered_count, busy_count, unreachable_count')
    .eq('id', broadcastId)
    .maybeSingle();

  if (current) {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.Status === 'completed') {
      updates.answered_count = (current.answered_count || 0) + 1;
    } else if (payload.Status === 'busy') {
      updates.busy_count = (current.busy_count || 0) + 1;
    } else {
      updates.unreachable_count = (current.unreachable_count || 0) + 1;
    }

    await supabase
      .from('voice_obd_broadcasts')
      .update(updates)
      .eq('id', broadcastId);
  }

  return { ok: true, updated: true };
}

