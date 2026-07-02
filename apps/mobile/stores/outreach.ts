import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import { SEED_SEGMENTS, SEED_TEMPLATES, SEED_BROADCASTS } from '../data/outreachSeed';
import { getOutreachProvider } from '../lib/outreachProvider';
import { extractVariables } from '../lib/outreachTypes';
import type {
  AudienceSegment,
  MessageTemplate,
  Broadcast,
  SendBroadcastInput,
  OutreachChannel,
} from '../lib/outreachTypes';

interface OutreachState {
  segments: AudienceSegment[];
  templates: MessageTemplate[];
  broadcasts: Broadcast[];

  addTemplate: (t: Omit<MessageTemplate, 'id' | 'variables'>) => void;
  deleteTemplate: (id: string) => void;

  /** Create + (mock) dispatch a broadcast. Returns the new broadcast id. */
  createBroadcast: (input: SendBroadcastInput) => Promise<string>;
  cancelBroadcast: (id: string) => void;
}

function emptyStats(audience: number) {
  return { audience, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
}

export const useOutreachStore = create<OutreachState>()(
  persist(
    (set, get) => ({
      segments: SEED_SEGMENTS,
      templates: SEED_TEMPLATES,
      broadcasts: SEED_BROADCASTS,

      addTemplate: (t) =>
        set((s) => ({
          templates: [
            { ...t, id: `tpl-${Date.now().toString(36)}`, variables: extractVariables(t.body) },
            ...s.templates,
          ],
        })),

      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      cancelBroadcast: (id) =>
        set((s) => ({
          broadcasts: s.broadcasts.map((b) =>
            b.id === id && b.status === 'scheduled' ? { ...b, status: 'failed' } : b,
          ),
        })),

      createBroadcast: async (input) => {
        const id = `bc-${Date.now().toString(36)}`;
        const isScheduled = !!input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now();
        const broadcast: Broadcast = {
          id,
          name: input.name,
          channel: input.channel,
          segmentId: input.segment.id,
          segmentName: input.segment.name,
          templateId: input.templateId,
          body: input.body,
          createdAt: new Date().toISOString(),
          scheduledAt: input.scheduledAt,
          status: isScheduled ? 'scheduled' : 'sending',
          stats: emptyStats(input.segment.size),
        };
        set((s) => ({ broadcasts: [broadcast, ...s.broadcasts] }));

        if (isScheduled) return id;

        // Hand off to the (mock) provider, then simulate delivery progression.
        try {
          const provider = getOutreachProvider();
          const res = await provider.send(input);
          const accepted = res.accepted;
          const failedBase = res.rejected;
          patch(set, id, { queued: accepted, failed: failedBase });

          const channel = input.channel;
          runDeliverySimulation(set, id, accepted, failedBase, channel);
        } catch {
          set((s) => ({
            broadcasts: s.broadcasts.map((b) => (b.id === id ? { ...b, status: 'failed' } : b)),
          }));
        }
        return id;
      },
    }),
    {
      name: 'kshetra-outreach',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ templates: s.templates, broadcasts: s.broadcasts }),
    },
  ),
);

// ── delivery simulation helpers ────────────────────────────────────────────

type SetFn = (fn: (s: OutreachState) => Partial<OutreachState>) => void;

function patch(set: SetFn, id: string, statsPatch: Partial<Broadcast['stats']>, status?: Broadcast['status']) {
  set((s) => ({
    broadcasts: s.broadcasts.map((b) =>
      b.id === id
        ? { ...b, status: status ?? b.status, stats: { ...b.stats, ...statsPatch } }
        : b,
    ),
  }));
}

function runDeliverySimulation(
  set: SetFn,
  id: string,
  accepted: number,
  failedBase: number,
  channel: OutreachChannel,
) {
  const steps = 4;
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    const frac = step / steps;
    const sent = Math.round(accepted * frac);
    const delivered = Math.round(sent * 0.965);
    const read = channel === 'whatsapp' ? Math.round(delivered * 0.6 * frac) : channel === 'voice' ? Math.round(delivered * 0.7) : 0;
    if (step >= steps) {
      patch(set, id, { sent, delivered, read, failed: failedBase }, 'sent');
      clearInterval(timer);
    } else {
      patch(set, id, { sent, delivered, read }, 'sending');
    }
  }, 700);
}
