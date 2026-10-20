import { SaasRateLimiter, saasRateLimiter } from '../lib/saasRateLimiter';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';

describe('SaasRateLimiter Unit Tests', () => {
  let limiter: SaasRateLimiter;

  beforeEach(() => {
    limiter = new SaasRateLimiter();
    saasRateLimiter.resetForTesting();
  });

  describe('getUtcTimeWindows', () => {
    it('computes correct UTC month start, next month, current hour bucket, and seconds until reset', () => {
      const windows = limiter.getUtcTimeWindows();

      expect(windows.monthStart).toBeInstanceOf(Date);
      expect(windows.nextMonthStart).toBeInstanceOf(Date);
      expect(windows.currentHourBucket).toBeInstanceOf(Date);
      expect(windows.secondsUntilMonthReset).toBeGreaterThan(0);

      // Verify monthStart is on day 1 at 00:00:00.000 UTC
      expect(windows.monthStart.getUTCDate()).toBe(1);
      expect(windows.monthStart.getUTCHours()).toBe(0);
      expect(windows.monthStart.getUTCMinutes()).toBe(0);
      expect(windows.monthStart.getUTCSeconds()).toBe(0);

      // Next month start must be after month start
      expect(windows.nextMonthStart.getTime()).toBeGreaterThan(windows.monthStart.getTime());

      // Hour bucket minutes and seconds must be 0
      expect(windows.currentHourBucket.getUTCMinutes()).toBe(0);
      expect(windows.currentHourBucket.getUTCSeconds()).toBe(0);
    });
  });

  describe('checkMinuteBurst', () => {
    it('allows initial requests within tier limit and decrements tokens', () => {
      const tenant = 'tenant-burst-1';
      const result1 = limiter.checkMinuteBurst(tenant, 'free');

      expect(result1.allowed).toBe(true);
      expect(result1.limit).toBe(SAAS_TIER_LIMITS.free.requestsPerMinute);
      expect(result1.remaining).toBe(SAAS_TIER_LIMITS.free.requestsPerMinute - 1);
    });

    it('falls back to free tier limits when unknown tier is passed', () => {
      const result = limiter.checkMinuteBurst('tenant-unknown', 'non_existent_tier' as any);
      expect(result.limit).toBe(SAAS_TIER_LIMITS.free.requestsPerMinute);
    });

    it('denies requests when burst tokens are exhausted', () => {
      const tenant = 'tenant-burst-exhaust';
      const maxBurst = SAAS_TIER_LIMITS.free.requestsPerMinute;
      const fixedNow = 1700000000000;
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      // Exhaust all tokens
      for (let i = 0; i < maxBurst; i++) {
        const res = limiter.checkMinuteBurst(tenant, 'free');
        expect(res.allowed).toBe(true);
      }

      // Next request must fail
      const denied = limiter.checkMinuteBurst(tenant, 'free');
      expect(denied.allowed).toBe(false);
      expect(denied.remaining).toBe(0);
      expect(denied.resetSeconds).toBeGreaterThanOrEqual(1);

      dateSpy.mockRestore();
    });

    it('refills tokens over time proportionally', () => {
      const tenant = 'tenant-refill';
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      // Exhaust burst tokens
      const maxBurst = SAAS_TIER_LIMITS.free.requestsPerMinute;
      for (let i = 0; i < maxBurst; i++) {
        limiter.checkMinuteBurst(tenant, 'free');
      }

      // Fast forward 30 seconds (half of 60s window)
      dateSpy.mockReturnValue(now + 30_000);

      const afterHalfWindow = limiter.checkMinuteBurst(tenant, 'free');
      expect(afterHalfWindow.allowed).toBe(true);
      // Half refill minus 1 token consumed
      const expectedRefill = Math.floor(maxBurst * 0.5) - 1;
      expect(afterHalfWindow.remaining).toBe(expectedRefill);

      dateSpy.mockRestore();
    });

    it('resetForTesting clears all burst buckets', () => {
      limiter.checkMinuteBurst('tenant-a', 'free');
      limiter.resetForTesting();
      const fresh = limiter.checkMinuteBurst('tenant-a', 'free');
      expect(fresh.remaining).toBe(SAAS_TIER_LIMITS.free.requestsPerMinute - 1);
    });
  });

  describe('getDurableMonthlyUsage', () => {
    it('returns sum of request_count across monthly usage ledger rows', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [
                  { request_count: 10 },
                  { request_count: 25 },
                  { request_count: '15' },
                  { request_count: null },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      const usage = await limiter.getDurableMonthlyUsage('tenant-1', mockClient);
      expect(usage).toBe(50);
    });

    it('returns 0 when data is null or empty', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      const usage = await limiter.getDurableMonthlyUsage('tenant-empty', mockClient);
      expect(usage).toBe(0);
    });

    it('throws error when database query fails', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection terminated unexpectedly' },
              }),
            }),
          }),
        }),
      };

      await expect(
        limiter.getDurableMonthlyUsage('tenant-err', mockClient)
      ).rejects.toThrow('Failed to query durable monthly usage: Connection terminated unexpectedly');
    });
  });

  describe('checkAndRecordDurableUsage', () => {
    describe('Primary Atomic RPC Execution (client.rpc exists)', () => {
      it('returns allowed result when monthly quota is available', async () => {
        const mockClient = {
          rpc: jest.fn().mockResolvedValue({
            data: {
              allowed: true,
              current_monthly_usage: 120,
              monthly_remaining: 880,
              monthly_ceiling: 1000,
            },
            error: null,
          }),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-rpc-1', tier: 'pro', apiKeyId: 'key-123' },
          mockClient
        );

        expect(result.allowed).toBe(true);
        expect(result.currentMonthlyUsage).toBe(120);
        expect(result.monthlyRemaining).toBe(880);
        expect(result.monthlyCeiling).toBe(1000);
        expect(result.reason).toBeUndefined();
        expect(mockClient.rpc).toHaveBeenCalledWith('fn_check_and_increment_saas_quota', {
          p_tenant_id: 'tenant-rpc-1',
          p_api_key_id: 'key-123',
          p_hour_bucket: expect.any(String),
          p_month_start: expect.any(String),
        });
      });

      it('returns rejected result with reason when quota is exceeded', async () => {
        const mockClient = {
          rpc: jest.fn().mockResolvedValue({
            data: {
              allowed: false,
              current_monthly_usage: 1000,
              monthly_remaining: 0,
              monthly_ceiling: 1000,
            },
            error: null,
          }),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-rpc-exceeded', tier: 'pro' },
          mockClient
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('MONTHLY_CEILING_EXCEEDED');
        expect(result.monthlyRemaining).toBe(0);
      });

      it('falls back to tier limit ceiling if RPC returns missing monthly_ceiling', async () => {
        const mockClient = {
          rpc: jest.fn().mockResolvedValue({
            data: {
              allowed: true,
              current_monthly_usage: 5,
              monthly_remaining: 995,
            },
            error: null,
          }),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-no-ceiling', tier: 'free' },
          mockClient
        );

        expect(result.monthlyCeiling).toBe(SAAS_TIER_LIMITS.free.monthlyCeiling);
      });

      it('throws error when RPC invocation fails with error', async () => {
        const mockClient = {
          rpc: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'relation fn_check_and_increment_saas_quota does not exist' },
          }),
        };

        await expect(
          limiter.checkAndRecordDurableUsage(
            { tenantId: 'tenant-rpc-err', tier: 'free' },
            mockClient
          )
        ).rejects.toThrow('Failed to execute atomic quota check and increment');
      });
    });

    describe('Fallback Non-RPC Execution (Test / Legacy environments)', () => {
      it('rejects when current usage already meets or exceeds monthly ceiling', async () => {
        const ceiling = SAAS_TIER_LIMITS.free.monthlyCeiling;
        const mockClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [{ request_count: ceiling }],
                  error: null,
                }),
              }),
            }),
          }),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-fallback-maxed', tier: 'free' },
          mockClient
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('MONTHLY_CEILING_EXCEEDED');
        expect(result.currentMonthlyUsage).toBe(ceiling);
        expect(result.monthlyRemaining).toBe(0);
      });

      it('updates existing bucket row when row exists and quota is available', async () => {
        const updateMock = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

        const mockClient = {
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'saas_usage_ledger') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockResolvedValue({
                      data: [{ request_count: 5 }],
                      error: null,
                    }),
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: { id: 'row-1', request_count: 5 },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
                update: updateMock,
              };
            }
            return {};
          }),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-fallback-update', tier: 'pro', apiKeyId: 'key-abc' },
          mockClient
        );

        expect(result.allowed).toBe(true);
        expect(result.currentMonthlyUsage).toBe(6);
        expect(updateMock).toHaveBeenCalledWith({ request_count: 6 });
      });

      it('throws error if update of existing bucket fails', async () => {
        const mockClient = {
          from: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: [{ request_count: 5 }], error: null }),
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { id: 'row-1', request_count: 5 },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Row lock deadlock' },
              }),
            }),
          })),
        };

        await expect(
          limiter.checkAndRecordDurableUsage(
            { tenantId: 'tenant-update-fail', tier: 'free' },
            mockClient
          )
        ).rejects.toThrow('Failed to update usage ledger: Row lock deadlock');
      });

      it('inserts new bucket row when no row exists and quota is available', async () => {
        const insertMock = jest.fn().mockResolvedValue({ error: null });

        const mockClient = {
          from: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: [], error: null }),
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            insert: insertMock,
          })),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-fallback-insert', tier: 'free' },
          mockClient
        );

        expect(result.allowed).toBe(true);
        expect(result.currentMonthlyUsage).toBe(1);
        expect(insertMock).toHaveBeenCalledWith({
          tenant_id: 'tenant-fallback-insert',
          api_key_id: null,
          hour_bucket: expect.any(String),
          request_count: 1,
          error_count: 0,
        });
      });

      it('retries recursively when unique violation code 23505 occurs during insert race', async () => {
        let insertAttempts = 0;
        const mockClient = {
          from: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: [], error: null }),
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockImplementation(() => {
                      if (insertAttempts === 0) {
                        return Promise.resolve({ data: null, error: null });
                      }
                      return Promise.resolve({
                        data: { id: 'row-race', request_count: 1 },
                        error: null,
                      });
                    }),
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockImplementation(() => {
              insertAttempts++;
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          })),
        };

        const result = await limiter.checkAndRecordDurableUsage(
          { tenantId: 'tenant-race-23505', tier: 'free' },
          mockClient
        );

        expect(result.allowed).toBe(true);
        expect(insertAttempts).toBe(1);
      });

      it('throws error when insert fails with non-23505 error', async () => {
        const mockClient = {
          from: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: [], error: null }),
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({
              error: { code: '42P01', message: 'relation does not exist' },
            }),
          })),
        };

        await expect(
          limiter.checkAndRecordDurableUsage(
            { tenantId: 'tenant-insert-err', tier: 'free' },
            mockClient
          )
        ).rejects.toThrow('Failed to insert usage ledger: relation does not exist');
      });

      it('throws error when maybeSingle query fails with error', async () => {
        const mockClient = {
          from: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: [], error: null }),
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Database query timeout' },
                    }),
                  }),
                }),
              }),
            }),
          })),
        };

        await expect(
          limiter.checkAndRecordDurableUsage(
            { tenantId: 'tenant-find-err', tier: 'free' },
            mockClient
          )
        ).rejects.toThrow('Failed to query existing usage bucket: Database query timeout');
      });
    });
  });
});
