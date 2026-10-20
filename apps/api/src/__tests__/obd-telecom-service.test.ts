/**
 * Unit Test Suite for OBD Telecom Service (apps/api/src/services/outreach/obdTelecomService.ts)
 * Master Execution Framework — CTO Directive 119
 */

import {
  hashPhoneNumber,
  isNumberOptedOut,
  recordOptOut,
  isWithinTraiWindow,
  dispatchOBDBroadcast,
  getOBDBroadcasts,
  processTelecomWebhook,
  type OBDBroadcastInput,
} from '../services/outreach/obdTelecomService';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';

describe('OBD Telecom Service (obdTelecomService.ts)', () => {
  let originalConfigured: boolean;

  beforeAll(() => {
    originalConfigured = isSupabaseConfigured;
  });

  afterAll(() => {
    setSupabaseConfiguredForTesting(originalConfigured);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TRAI Invariants and Phone Hashing', () => {
    it('hashes phone numbers based on cleaned last 10 digits', () => {
      const hash1 = hashPhoneNumber('+91 98480 12345');
      const hash2 = hashPhoneNumber('09848012345');
      const hash3 = hashPhoneNumber('9848012345');

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('computes TRAI legal calling window status accurately', () => {
      const result = isWithinTraiWindow();
      expect(result).toBeDefined();
      expect(typeof result.permitted).toBe('boolean');
      expect(result.currentISTHour).toBeGreaterThanOrEqual(0);
      expect(result.currentISTHour).toBeLessThanOrEqual(23);

      if (result.permitted) {
        expect(result.currentISTHour).toBeGreaterThanOrEqual(9);
        expect(result.currentISTHour).toBeLessThan(20);
        expect(result.message).toBeUndefined();
      } else {
        expect(result.message).toContain('TRAI regulations restrict automated political calls');
      }
    });
  });

  describe('Opt-Out Management', () => {
    it('returns false for isNumberOptedOut when database is unconfigured', async () => {
      setSupabaseConfiguredForTesting(false);
      const optedOut = await isNumberOptedOut('9848012345');
      expect(optedOut).toBe(false);
    });

    it('records and checks opt-outs when database is configured', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'trai_opt_outs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'optout-1' },
                  error: null,
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        return {};
      }) as any);

      const optedOut = await isNumberOptedOut('9848012345');
      expect(optedOut).toBe(true);

      const recorded = await recordOptOut('9848012345', 'camp-1');
      expect(recorded).toBe(true);
    });

    it('returns false when recordOptOut is given empty digits', async () => {
      const recorded = await recordOptOut('---');
      expect(recorded).toBe(false);
    });
  });

  describe('Broadcast Dispatch & Tracking', () => {
    it('dispatches OBD broadcast and creates tracking record in memory or DB', async () => {
      setSupabaseConfiguredForTesting(false);

      const input: OBDBroadcastInput = {
        campaignId: 'camp-test-1',
        politicianId: 'pol-test-1',
        title: 'Ward 5 Water Pipeline Announcement',
        audioUrl: 'https://example.com/audio.mp3',
        targetSegment: {
          type: 'ward',
          wardNo: 5,
          voterCount: 100,
          phoneNumbers: ['9848011111', '9848022222'],
        },
        ratePerCallINR: 0.9,
      };

      const result = await dispatchOBDBroadcast(input);
      expect(result.success).toBe(true);
      expect(result.broadcast).toBeDefined();
      expect(result.broadcast.totalCostINR).toBe(90);
      expect(result.broadcast.totalRecipients).toBe(100);
    });

    it('retrieves broadcasts when database is configured', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'voice_obd_broadcasts') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: 'obd-test-1',
                      politicianId: 'pol-test-1',
                      campaignId: 'camp-1',
                      title: 'Test',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }) as any);

      const broadcasts = await getOBDBroadcasts('pol-test-1');
      expect(broadcasts.length).toBe(1);
      expect(broadcasts[0].id).toBe('obd-test-1');
    });

    it('processes incoming telecom webhooks for opt-out (Press 9) and IVR', async () => {
      const optOutRes = await processTelecomWebhook({
        Digits: '9',
        From: '+919848012345',
        CustomField: 'obd-123',
      });
      expect(optOutRes.ok).toBe(true);
      expect(optOutRes.action).toBe('opt_out_recorded');

      const ivrRes = await processTelecomWebhook({
        Digits: '1',
        CustomField: 'obd-123',
      });
      expect(ivrRes.ok).toBe(true);
      expect(ivrRes.action).toBe('ivr_digit_captured');
    });
  });
});
