/**
 * Telecom Provider Implementation (Voice OBD)
 * W009-B2: Bounded Provider Abstraction (Razorpay & Voice OBD)
 */

import { isNumberOptedOut, isWithinTraiWindow } from '../services/outreach/obdTelecomService';
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
   * Checks the application's configured political voice dispatch window in IST.
   * This is an operational gate, not a determination of current legal requirements.
   */
  isWithinTraiCallingWindow(referenceTime?: Date): TraiWindowCheckResult {
    return isWithinTraiWindow(referenceTime);
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
        success: false,
        error:
          'TELECOM_CREDENTIALS_REQUIRED: Exotel API credentials are not configured. No call was sent.',
      };
    }

    const recipients = params.targetSegment.phoneNumbers || [];
    if (params.targetSegment.voterCount !== 1 || recipients.length !== 1) {
      return {
        success: false,
        error: 'SINGLE_RECIPIENT_REQUIRED: This provider operation can dispatch exactly one explicit recipient.',
      };
    }

    const sampleRecipient = recipients[0].trim();
    if (!/^\+?\d{10,15}$/.test(sampleRecipient)) {
      return {
        success: false,
        error: 'INVALID_RECIPIENT: Provide one valid phone number in international or local digits format.',
      };
    }

    let isOptedOut: boolean;
    try {
      isOptedOut = await isNumberOptedOut(sampleRecipient);
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'OPTOUT_CHECK_UNAVAILABLE: Unable to verify recipient consent.',
      };
    }
    if (isOptedOut) {
      return {
        success: false,
        error: 'RECIPIENT_OPTED_OUT: Recipient has opted out. No call was sent.',
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
      const data = (await res.json()) as any;
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
        error: isTimeout
          ? 'CARRIER_TIMEOUT: Carrier response timed out after 10000ms'
          : err?.message || 'Network error calling Exotel API',
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
