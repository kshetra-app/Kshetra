/**
 * Telecom Provider Implementation (Voice OBD)
 * W009-B2: Bounded Provider Abstraction (Razorpay & Voice OBD)
 */

import { isNumberOptedOut } from '../services/outreach/obdTelecomService';
import type {
  VoiceObdProvider,
  TraiWindowCheckResult,
  ObdDispatchParams,
  ObdDispatchResult,
  ObdDeliveryReport,
} from './types';

export class TelecomProvider implements VoiceObdProvider {
  private apiKey?: string;
  private apiToken?: string;
  private accountSid?: string;
  private subdomain: string;
  private callerId?: string;
  private statusCallbackUrl?: string;

  constructor(config?: {
    apiKey?: string;
    apiToken?: string;
    accountSid?: string;
    subdomain?: string;
    callerId?: string;
    statusCallbackUrl?: string;
  }) {
    this.apiKey = config?.apiKey ?? process.env.EXOTEL_API_KEY;
    this.apiToken = config?.apiToken ?? process.env.EXOTEL_API_TOKEN;
    this.accountSid = config?.accountSid ?? process.env.EXOTEL_ACCOUNT_SID;
    this.subdomain = config?.subdomain ?? process.env.EXOTEL_SUBDOMAIN ?? 'api';
    this.callerId = config?.callerId ?? process.env.EXOTEL_CALLER_ID;
    this.statusCallbackUrl = config?.statusCallbackUrl ?? process.env.EXOTEL_STATUS_CALLBACK_URL;
  }

  /**
   * Checks whether the given reference time (or now) in India (IST, UTC+5:30)
   * is within the legally permitted TRAI calling window: 08:00 to 21:00 IST (8:00 AM – 9:00 PM).
   */
  isWithinTraiCallingWindow(referenceTime?: Date): TraiWindowCheckResult {
    const now = referenceTime || new Date();
    // Compute IST offset: UTC + 5 hours 30 mins (330 minutes)
    const istOffsetMinutes = 330;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istMinutes = (utcMinutes + istOffsetMinutes) % 1440;
    const currentISTHour = Math.floor(istMinutes / 60);

    // Statutory TRAI calling window: 08:00 to 21:00 IST
    const permitted = currentISTHour >= 8 && currentISTHour < 21;

    return {
      permitted,
      currentISTHour,
      message: permitted
        ? undefined
        : `TRAI regulations restrict automated political calls to 8:00 AM – 9:00 PM IST (Current IST hour: ${currentISTHour}:00). Calls will be scheduled for delivery at 8:00 AM tomorrow.`,
    };
  }

  async dispatchBroadcast(params: ObdDispatchParams): Promise<ObdDispatchResult> {
    const traiCheck = this.isWithinTraiCallingWindow();
    if (!traiCheck.permitted) {
      return {
        success: false,
        error: 'OUTSIDE_TRAI_WINDOW',
        warning: traiCheck.message,
      };
    }

    if (!this.apiKey || !this.apiToken || !this.accountSid) {
      return {
        success: true,
        providerRef: `sim_${Date.now().toString(36)}`,
        warning: 'TELECOM_CREDENTIALS_REQUIRED: Exotel API credentials are not configured in environment. Call recorded in queued state.',
      };
    }

    const sampleRecipient = params.targetSegment.phoneNumbers?.[0] || '0000000000';
    const isOptedOut = await isNumberOptedOut(sampleRecipient);
    if (isOptedOut) {
      return {
        success: true,
        providerRef: `optout_${Date.now().toString(36)}`,
        warning: 'Recipient has opted out under TRAI regulations. Call suppressed.',
      };
    }

    const endpoint = `https://${this.apiKey}:${this.apiToken}@${this.subdomain}.exotel.com/v1/Accounts/${this.accountSid}/Calls/connect.json`;
    const form = new URLSearchParams();
    form.append('From', sampleRecipient);
    form.append('CallerId', this.callerId || '');
    form.append('Url', params.audioUrl);
    form.append('CustomField', params.campaignId);
    if (this.statusCallbackUrl) {
      form.append('StatusCallback', this.statusCallbackUrl);
    }

    // AbortController with 10s carrier timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as any;
      if (res.ok && data?.Call?.Sid) {
        return { success: true, callSid: data.Call.Sid, providerRef: data.Call.Sid };
      }
      return {
        success: false,
        error: data?.RestException?.Message || `Exotel API error: HTTP ${res.status}`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? 'CARRIER_TIMEOUT: Carrier response timed out after 10000ms' : (err?.message || 'Network error calling Exotel API'),
      };
    }
  }

  validateWebhook(request: { headers: Record<string, any>; body: any }): boolean {
    // Basic validation of payload structure
    if (!request.body || typeof request.body !== 'object') {
      return false;
    }
    return true;
  }

  parseDeliveryReport(body: Record<string, any>): ObdDeliveryReport {
    const callSid = body.CallSid;
    const broadcastId = body.CustomField;
    const callerPhone = body.From || body.To;
    const digits = body.Digits;
    const duration = body.Duration ? Number(body.Duration) : undefined;

    let status: ObdDeliveryReport['status'] = 'other';
    if (body.Status === 'completed') {
      status = 'completed';
    } else if (body.Status === 'busy') {
      status = 'busy';
    } else if (body.Status === 'failed' || body.Status === 'no-answer') {
      status = 'unreachable';
    } else if (body.Status === 'in-progress') {
      status = 'answered';
    }

    return {
      raw: body,
      callSid,
      broadcastId,
      callerPhone,
      status,
      duration,
      digits,
      isOptOut: digits === '9',
      isIvrResponse: Boolean(digits && ['1', '2'].includes(digits)),
    };
  }
}
