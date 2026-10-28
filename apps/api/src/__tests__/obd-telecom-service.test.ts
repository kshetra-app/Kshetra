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

    it('accurately distinguishes permitted vs restricted hours under fixed timestamps', () => {
      // 12:00 PM IST is 06:30 AM UTC
      jest.useFakeTimers();
      try {
        jest.setSystemTime(new Date('2026-10-20T06:30:00.000Z'));
        const daytime = isWithinTraiWindow();
        expect(daytime.permitted).toBe(true);
        expect(daytime.currentISTHour).toBe(12);
        expect(daytime.message).toBeUndefined();

        // 10:30 PM IST is 17:00 UTC
        jest.setSystemTime(new Date('2026-10-20T17:00:00.000Z'));
        const nighttime = isWithinTraiWindow();
        expect(nighttime.permitted).toBe(false);
        expect(nighttime.currentISTHour).toBe(22);
        expect(nighttime.message).toContain('TRAI regulations restrict automated political calls');
      } finally {
        jest.useRealTimers();
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

    it('returns false when isNumberOptedOut throws or returns error', async () => {
      setSupabaseConfiguredForTesting(true);

      // Throws error
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Network error');
      });
      const resThrow = await isNumberOptedOut('9848012345');
      expect(resThrow).toBe(false);

      // Returns DB error
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      } as any);
      const resErr = await isNumberOptedOut('9848012345');
      expect(resErr).toBe(false);

      // Returns null data
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      } as any);
      const resNull = await isNumberOptedOut('9848012345');
      expect(resNull).toBe(false);
    });

    it('returns false when recordOptOut encounters Supabase upsert error', async () => {
      setSupabaseConfiguredForTesting(true);
      const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.spyOn(supabase, 'from').mockReturnValue({
        upsert: async () => ({ error: { message: 'Unique constraint error' } }),
      } as any);

      const success = await recordOptOut('9848012345', 'camp-1');
      expect(success).toBe(false);
      expect(spyConsole).toHaveBeenCalled();
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

    it('handles telecom credential checks and Exotel call responses during permitted TRAI window', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-20T06:30:00.000Z')); // 12:00 IST -> permitted: true
      const origApiKey = process.env.EXOTEL_API_KEY;
      const origApiToken = process.env.EXOTEL_API_TOKEN;
      const origAccountSid = process.env.EXOTEL_ACCOUNT_SID;
      const origCallerId = process.env.EXOTEL_CALLER_ID;
      const origCallback = process.env.EXOTEL_STATUS_CALLBACK_URL;
      const origFetch = global.fetch;

      try {
        setSupabaseConfiguredForTesting(false);

        // 1. Missing credentials -> warning with TELECOM_CREDENTIALS_REQUIRED
        delete process.env.EXOTEL_API_KEY;
        delete process.env.EXOTEL_API_TOKEN;
        delete process.env.EXOTEL_ACCOUNT_SID;

        const baseInput: OBDBroadcastInput = {
          campaignId: 'camp-1',
          politicianId: 'pol-1',
          title: 'Test Call',
          audioUrl: 'https://example.com/audio.mp3',
          targetSegment: {
            type: 'ward',
            voterCount: 10,
            phoneNumbers: ['9848012345'],
          },
          ratePerCallINR: 1.0,
        };

        const resNoCreds = await dispatchOBDBroadcast(baseInput);
        expect(resNoCreds.success).toBe(true);
        expect(resNoCreds.warning).toContain('TELECOM_CREDENTIALS_REQUIRED');
        expect(resNoCreds.broadcast.providerRef).toContain('err:TELECOM_CREDENTIALS_REQUIRED');

        // Configure credentials
        process.env.EXOTEL_API_KEY = 'test_exo_key';
        process.env.EXOTEL_API_TOKEN = 'test_exo_token';
        process.env.EXOTEL_ACCOUNT_SID = 'test_exo_sid';
        process.env.EXOTEL_CALLER_ID = '08012345678';
        process.env.EXOTEL_STATUS_CALLBACK_URL = 'https://api.kshetra.org/api/v1/telecom/callback';

        // 2. Opted out recipient -> Exotel call skipped
        setSupabaseConfiguredForTesting(true);
        jest.spyOn(supabase, 'from').mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'optout-1' }, error: null }),
            }),
          }),
          insert: async () => ({ error: null }),
        } as any);

        const resOptedOut = await dispatchOBDBroadcast(baseInput);
        expect(resOptedOut.success).toBe(true);
        expect(resOptedOut.broadcast.providerRef).toMatch(/^exo_obd-/);

        // 3. Not opted out, Exotel returns successful Call Sid
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'trai_opt_outs') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            };
          }
          return {
            insert: async () => ({ error: null }),
          };
        }) as any);

        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Call: { Sid: 'sid_exotel_success_999' } }),
        }) as any;

        const resSuccess = await dispatchOBDBroadcast(baseInput);
        expect(resSuccess.success).toBe(true);
        expect(resSuccess.broadcast.providerRef).toBe('sid_exotel_success_999');

        // 4. Not opted out, Exotel returns error payload with RestException
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ RestException: { Message: 'Invalid CallerId configured' } }),
        }) as any;

        const resExoErr = await dispatchOBDBroadcast(baseInput);
        expect(resExoErr.success).toBe(true);
        expect(resExoErr.warning).toBe('Invalid CallerId configured');
        expect(resExoErr.broadcast.providerRef).toContain('err:Invalid CallerId configured');

        // 5. Not opted out, Exotel fetch throws network exception
        global.fetch = jest.fn().mockRejectedValueOnce(new Error('DNS resolution failed')) as any;

        const resNetworkErr = await dispatchOBDBroadcast(baseInput);
        expect(resNetworkErr.success).toBe(true);
        expect(resNetworkErr.warning).toBe('DNS resolution failed');

        // 6. Target segment with empty phone numbers falls back to '0000000000'
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Call: { Sid: 'sid_fallback_number' } }),
        }) as any;

        const resEmptyPhones = await dispatchOBDBroadcast({
          ...baseInput,
          targetSegment: { type: 'booth', voterCount: 5 },
        });
        expect(resEmptyPhones.success).toBe(true);
        expect(resEmptyPhones.broadcast.providerRef).toBe('sid_fallback_number');
      } finally {
        jest.useRealTimers();
        global.fetch = origFetch;
        if (origApiKey) process.env.EXOTEL_API_KEY = origApiKey;
        else delete process.env.EXOTEL_API_KEY;
        if (origApiToken) process.env.EXOTEL_API_TOKEN = origApiToken;
        else delete process.env.EXOTEL_API_TOKEN;
        if (origAccountSid) process.env.EXOTEL_ACCOUNT_SID = origAccountSid;
        else delete process.env.EXOTEL_ACCOUNT_SID;
        if (origCallerId) process.env.EXOTEL_CALLER_ID = origCallerId;
        else delete process.env.EXOTEL_CALLER_ID;
        if (origCallback) process.env.EXOTEL_STATUS_CALLBACK_URL = origCallback;
        else delete process.env.EXOTEL_STATUS_CALLBACK_URL;
      }
    });

    it('throws error when database persistence fails in dispatchOBDBroadcast', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'trai_opt_outs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          insert: async () => ({
            error: { message: 'Disk quota exceeded on voice_obd_broadcasts' },
          }),
        };
      }) as any);

      await expect(
        dispatchOBDBroadcast({
          campaignId: 'c1',
          politicianId: 'p1',
          title: 'Failing DB Insert',
          audioUrl: 'https://example.com/audio.mp3',
          targetSegment: { type: 'ward', voterCount: 10 },
          ratePerCallINR: 1.0,
        }),
      ).rejects.toThrow(
        'OBD Dispatch failed to persist to Supabase: Disk quota exceeded on voice_obd_broadcasts',
      );
    });

    it('returns empty array when getOBDBroadcasts is called with unconfigured database', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await getOBDBroadcasts('pol-1');
      expect(res).toEqual([]);
    });

    it('throws error when getOBDBroadcasts encounters database error', async () => {
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: { message: 'Query failed' } }),
          }),
        }),
      } as any);

      await expect(getOBDBroadcasts('pol-1')).rejects.toThrow(
        'Failed to retrieve OBD broadcasts from Supabase: Query failed',
      );
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

    it('processes status callbacks in processTelecomWebhook (completed, busy, unreachable, and not found)', async () => {
      // 1. Ignored when no broadcastId
      const ignoredNoId = await processTelecomWebhook({ Status: 'completed' });
      expect(ignoredNoId).toEqual({ ok: true, ignored: true });

      // 2. Ignored when unconfigured
      setSupabaseConfiguredForTesting(false);
      const ignoredUnconf = await processTelecomWebhook({
        CustomField: 'obd-123',
        Status: 'completed',
      });
      expect(ignoredUnconf).toEqual({ ok: true, ignored: true });

      // 3. Database configured: completed status
      setSupabaseConfiguredForTesting(true);
      let updatedData: any = null;

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { answered_count: 5, busy_count: 2, unreachable_count: 1 },
                error: null,
              }),
            }),
          }),
          update: (payload: any) => ({
            eq: async (col: string, val: any) => {
              updatedData = payload;
              return { error: null };
            },
          }),
        } as any;
      }) as any);

      const resCompleted = await processTelecomWebhook({
        CustomField: 'obd-123',
        Status: 'completed',
      });
      expect(resCompleted).toEqual({ ok: true, updated: true });
      expect(updatedData.answered_count).toBe(6);

      // 4. Busy status
      const resBusy = await processTelecomWebhook({ CustomField: 'obd-123', Status: 'busy' });
      expect(resBusy).toEqual({ ok: true, updated: true });
      expect(updatedData.busy_count).toBe(3);

      // 5. Unreachable status (failed / no-answer)
      const resUnreachable = await processTelecomWebhook({
        CustomField: 'obd-123',
        Status: 'no-answer',
      });
      expect(resUnreachable).toEqual({ ok: true, updated: true });
      expect(updatedData.unreachable_count).toBe(2);

      // 6. Record not found in database
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      } as any);
      const resNotFound = await processTelecomWebhook({
        CustomField: 'obd-nonexistent',
        Status: 'completed',
      });
      expect(resNotFound).toEqual({ ok: true, updated: true });
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
