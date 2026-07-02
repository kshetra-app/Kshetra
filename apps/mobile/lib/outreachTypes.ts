/**
 * Voter outreach types for the Campaign Manager admin panel.
 *
 * The UI is complete and works against a MockOutreachProvider. Wiring a real
 * provider (MSG91 / Twilio / Exotel) later means implementing `OutreachProvider`
 * and returning it from `getOutreachProvider()` — no UI changes required.
 */

export type OutreachChannel = 'whatsapp' | 'sms' | 'voice';

export type AudienceType =
  | 'all'
  | 'constituency'
  | 'booth'
  | 'volunteers'
  | 'supporters'
  | 'undecided';

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  type: AudienceType;
  /** Estimated reachable contacts in this segment. */
  size: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  /** Body with {variable} placeholders, e.g. "Namaste {name}". */
  body: string;
  variables: string[];
  /** Telecom DLT template id (required for SMS at send time — later). */
  dltTemplateId?: string;
  /** For voice: url/id of the audio message to play. */
  audioNote?: string;
}

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface DeliveryStats {
  audience: number;
  queued: number;
  sent: number;
  delivered: number;
  /** WhatsApp read receipts / SMS N/A / voice answered. */
  read: number;
  failed: number;
}

export interface Broadcast {
  id: string;
  name: string;
  channel: OutreachChannel;
  segmentId: string;
  segmentName: string;
  templateId?: string;
  body: string;
  createdAt: string;
  /** ISO time when scheduled to go out; absent = sent immediately. */
  scheduledAt?: string;
  status: BroadcastStatus;
  stats: DeliveryStats;
}

export interface SendBroadcastInput {
  name: string;
  channel: OutreachChannel;
  segment: AudienceSegment;
  templateId?: string;
  body: string;
  scheduledAt?: string;
}

/** Result returned by a provider after accepting a broadcast for delivery. */
export interface SendResult {
  providerRef: string;
  accepted: number;
  rejected: number;
}

/** Adapter contract every real/mock provider must satisfy. */
export interface OutreachProvider {
  readonly id: string;
  readonly label: string;
  /** Which channels this provider can deliver. */
  readonly channels: OutreachChannel[];
  /** True once credentials/DLT are configured (mock = always ready). */
  isConfigured(): boolean;
  send(input: SendBroadcastInput): Promise<SendResult>;
}

export const CHANNELS: {
  key: OutreachChannel;
  label: string;
  icon: string;
  color: string;
  hint: string;
}[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', hint: 'Rich text, images & buttons. Needs approved template.' },
  { key: 'sms', label: 'SMS', icon: 'chatbox-ellipses', color: '#4F8EF7', hint: 'Plain text. Requires DLT-registered sender & template.' },
  { key: 'voice', label: 'Voice Call', icon: 'call', color: '#F59E0B', hint: 'Automated voice broadcast (OBD) with a recorded message.' },
];

/** Cost heuristic per recipient (in credits) for the estimator. */
export function creditsPerRecipient(channel: OutreachChannel, body: string): number {
  if (channel === 'sms') return Math.max(1, Math.ceil(body.length / 160));
  if (channel === 'whatsapp') return 1;
  return 2; // voice ~ per connected minute
}

/** Extract {placeholders} from a template body. */
export function extractVariables(body: string): string[] {
  const set = new Set<string>();
  const re = /\{(\w+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) set.add(m[1]);
  return [...set];
}
