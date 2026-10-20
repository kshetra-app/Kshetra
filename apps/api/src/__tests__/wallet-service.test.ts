/**
 * Unit Test Suite for Campaign Wallet Service (apps/api/src/services/wallet/walletService.ts)
 * Master Execution Framework — CTO Directive 119
 */

import {
  getPoliticianWallet,
  createWalletRechargeOrder,
  creditWallet,
  deductWalletForService,
  getWalletTransactions,
} from '../services/wallet/walletService';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';

describe('Campaign Wallet Service (walletService.ts)', () => {
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

  describe('Offline / In-memory Fallback Behavior', () => {
    beforeEach(() => {
      setSupabaseConfiguredForTesting(false);
    });

    it('retrieves default or in-memory wallet when database is offline', async () => {
      const wallet = await getPoliticianWallet('pp1');
      expect(wallet).toBeDefined();
      expect(wallet.politicianId).toBe('pp1');
      expect(wallet.currency).toBe('INR');
      expect(wallet.balanceINR).toBeGreaterThanOrEqual(0);

      // New politician creates default entry
      const newWallet = await getPoliticianWallet('pol-new-99');
      expect(newWallet.politicianId).toBe('pol-new-99');
      expect(newWallet.balanceINR).toBe(5000);
    });

    it('validates recharge orders with minimum amounts', async () => {
      await expect(createWalletRechargeOrder('pol-1', 400)).rejects.toThrow('Minimum wallet recharge is ₹500');

      const order = await createWalletRechargeOrder('pol-1', 1500);
      expect(order.orderId).toMatch(/^order_/);
      expect(order.amountINR).toBe(1500);
      expect(order.amountPaise).toBe(150000);
      expect(order.currency).toBe('INR');
      expect(order.description).toContain('₹1,500');
    });

    it('credits wallet balance and records transaction history', async () => {
      const initial = await getPoliticianWallet('pol-credit-test');
      const startBalance = initial.balanceINR;
      const startRecharged = initial.totalRechargedINR;

      const updated = await creditWallet('pol-credit-test', 2000, 'rzp_ref_1001');
      expect(updated.balanceINR).toBe(startBalance + 2000);
      expect(updated.totalRechargedINR).toBe(startRecharged + 2000);

      const txs = await getWalletTransactions('pol-credit-test');
      expect(txs.length).toBeGreaterThan(0);
      expect(txs[0].type).toBe('credit');
      expect(txs[0].amountINR).toBe(2000);
      expect(txs[0].referenceId).toBe('rzp_ref_1001');
    });

    it('deducts wallet balance for services when funds are sufficient', async () => {
      const wallet = await getPoliticianWallet('pol-deduct-test');
      const balance = wallet.balanceINR;

      const updated = await deductWalletForService(
        'pol-deduct-test',
        500,
        'voice_obd',
        'obd_call_101',
        'Voice blast Ward 4'
      );

      expect(updated.balanceINR).toBe(balance - 500);
      expect(updated.totalSpentINR).toBe(500);

      const txs = await getWalletTransactions('pol-deduct-test');
      expect(txs[0].type).toBe('debit');
      expect(txs[0].serviceType).toBe('voice_obd');
      expect(txs[0].amountINR).toBe(500);
    });

    it('rejects service deductions when balance is insufficient', async () => {
      const wallet = await getPoliticianWallet('pol-insufficient-test');
      const hugeAmount = wallet.balanceINR + 50000;

      await expect(
        deductWalletForService('pol-insufficient-test', hugeAmount, 'meta_boost', 'meta_ad_99', 'Ad campaign')
      ).rejects.toThrow(/Insufficient wallet balance/);
    });
  });

  describe('Database-Configured Behavior', () => {
    beforeEach(() => {
      setSupabaseConfiguredForTesting(true);
    });

    it('maps database rows into CampaignWallet models when DB query succeeds', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'campaign_wallets') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'w-db-1',
                    politician_id: 'pol-db',
                    balance_inr: '12500.50',
                    total_recharged_inr: '20000.00',
                    total_spent_inr: '7499.50',
                    currency: 'INR',
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-02-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }) as any);

      const wallet = await getPoliticianWallet('pol-db');
      expect(wallet.id).toBe('w-db-1');
      expect(wallet.politicianId).toBe('pol-db');
      expect(wallet.balanceINR).toBe(12500.5);
      expect(wallet.totalRechargedINR).toBe(20000);
      expect(wallet.totalSpentINR).toBe(7499.5);
    });

    it('maps database transaction history rows correctly', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'wallet_transactions') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: 'tx-db-1',
                      wallet_id: 'w-db-1',
                      politician_id: 'pol-db',
                      type: 'credit',
                      amount_inr: '5000',
                      service_type: 'recharge',
                      reference_id: 'pay_123',
                      description: 'Test recharge',
                      balance_after_inr: '15000',
                      created_at: '2026-02-01T10:00:00Z',
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

      const txs = await getWalletTransactions('pol-db');
      expect(txs.length).toBe(1);
      expect(txs[0].id).toBe('tx-db-1');
      expect(txs[0].amountINR).toBe(5000);
      expect(txs[0].balanceAfterINR).toBe(15000);
    });
  });
});
