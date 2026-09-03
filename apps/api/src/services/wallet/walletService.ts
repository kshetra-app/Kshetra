import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface WalletTransaction {
  id: string;
  walletId: string;
  politicianId: string;
  type: 'credit' | 'debit';
  amountINR: number;
  serviceType: 'recharge' | 'voice_obd' | 'meta_boost' | 'refund';
  referenceId: string;
  description: string;
  balanceAfterINR: number;
  createdAt: string;
}

export interface CampaignWallet {
  id: string;
  politicianId: string;
  balanceINR: number;
  totalRechargedINR: number;
  totalSpentINR: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory wallets for offline / dev mode
const inMemoryWallets: Record<string, CampaignWallet> = {
  pp1: {
    id: 'w-pp1',
    politicianId: 'pp1',
    balanceINR: 5000,
    totalRechargedINR: 10000,
    totalSpentINR: 5000,
    currency: 'INR',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
  },
};

const inMemoryTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    walletId: 'w-pp1',
    politicianId: 'pp1',
    type: 'credit',
    amountINR: 10000,
    serviceType: 'recharge',
    referenceId: 'pay_rzp_mock_12345',
    description: 'Wallet Recharge via UPI / Razorpay',
    balanceAfterINR: 10000,
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'tx-2',
    walletId: 'w-pp1',
    politicianId: 'pp1',
    type: 'debit',
    amountINR: 1080,
    serviceType: 'voice_obd',
    referenceId: 'obd-demo-1',
    description: 'Voice Call Blast: Ward 12 (1,200 voters @ ₹0.90)',
    balanceAfterINR: 8920,
    createdAt: '2026-05-20T10:30:00Z',
  },
];

/**
 * Retrieves the politician's active campaign wallet balance.
 */
export async function getPoliticianWallet(politicianId: string): Promise<CampaignWallet> {
  const pId = politicianId || 'pp1';

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('campaign_wallets')
        .select('*')
        .eq('politician_id', pId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          politicianId: data.politician_id,
          balanceINR: Number(data.balance_inr),
          totalRechargedINR: Number(data.total_recharged_inr),
          totalSpentINR: Number(data.total_spent_inr),
          currency: data.currency || 'INR',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {}
  }

  if (!inMemoryWallets[pId]) {
    inMemoryWallets[pId] = {
      id: `w-${pId}`,
      politicianId: pId,
      balanceINR: 5000,
      totalRechargedINR: 5000,
      totalSpentINR: 0,
      currency: 'INR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return inMemoryWallets[pId];
}

/**
 * Creates a payment order for topping up the campaign wallet.
 */
export async function createWalletRechargeOrder(politicianId: string, amountINR: number) {
  if (amountINR < 500) {
    throw new Error('Minimum wallet recharge is ₹500');
  }

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    orderId,
    amountINR,
    amountPaise: amountINR * 100,
    currency: 'INR',
    razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholderKey123',
    description: `Kshetra Campaign Wallet Recharge: ₹${amountINR.toLocaleString('en-IN')}`,
    prefill: {
      name: 'Campaign Manager',
      contact: '9848012345',
    },
  };
}

/**
 * Verifies payment confirmation and credits the wallet balance.
 */
export async function creditWallet(
  politicianId: string,
  amountINR: number,
  paymentReference: string,
): Promise<CampaignWallet> {
  const wallet = await getPoliticianWallet(politicianId);
  const newBalance = wallet.balanceINR + amountINR;
  const newRecharged = wallet.totalRechargedINR + amountINR;
  const nowIso = new Date().toISOString();

  wallet.balanceINR = newBalance;
  wallet.totalRechargedINR = newRecharged;
  wallet.updatedAt = nowIso;

  const tx: WalletTransaction = {
    id: `tx-${Date.now().toString(36)}`,
    walletId: wallet.id,
    politicianId,
    type: 'credit',
    amountINR,
    serviceType: 'recharge',
    referenceId: paymentReference,
    description: `Recharge via Razorpay/UPI (₹${amountINR.toLocaleString('en-IN')})`,
    balanceAfterINR: newBalance,
    createdAt: nowIso,
  };

  inMemoryTransactions.unshift(tx);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('campaign_wallets')
        .upsert({
          politician_id: politicianId,
          balance_inr: newBalance,
          total_recharged_inr: newRecharged,
          updated_at: nowIso,
        });

      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        politician_id: politicianId,
        type: 'credit',
        amount_inr: amountINR,
        service_type: 'recharge',
        reference_id: paymentReference,
        description: tx.description,
        balance_after_inr: newBalance,
      });
    } catch {}
  }

  return wallet;
}

/**
 * Deducts funds from the wallet for a campaign service (e.g. Voice OBD or Meta Boost).
 * Throws an error if balance is insufficient.
 */
export async function deductWalletForService(
  politicianId: string,
  amountINR: number,
  serviceType: 'voice_obd' | 'meta_boost',
  referenceId: string,
  description: string,
): Promise<CampaignWallet> {
  const wallet = await getPoliticianWallet(politicianId);

  if (wallet.balanceINR < amountINR) {
    const deficit = amountINR - wallet.balanceINR;
    throw new Error(
      `Insufficient wallet balance. Available: ₹${wallet.balanceINR.toLocaleString('en-IN')}, Required: ₹${amountINR.toLocaleString('en-IN')}. Please top-up ₹${deficit.toLocaleString('en-IN')} to proceed.`,
    );
  }

  const newBalance = wallet.balanceINR - amountINR;
  const newSpent = wallet.totalSpentINR + amountINR;
  const nowIso = new Date().toISOString();

  wallet.balanceINR = newBalance;
  wallet.totalSpentINR = newSpent;
  wallet.updatedAt = nowIso;

  const tx: WalletTransaction = {
    id: `tx-${Date.now().toString(36)}`,
    walletId: wallet.id,
    politicianId,
    type: 'debit',
    amountINR,
    serviceType,
    referenceId,
    description,
    balanceAfterINR: newBalance,
    createdAt: nowIso,
  };

  inMemoryTransactions.unshift(tx);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('campaign_wallets')
        .update({
          balance_inr: newBalance,
          total_spent_inr: newSpent,
          updated_at: nowIso,
        })
        .eq('politician_id', politicianId);

      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        politician_id: politicianId,
        type: 'debit',
        amount_inr: amountINR,
        service_type: serviceType,
        reference_id: referenceId,
        description,
        balance_after_inr: newBalance,
      });
    } catch {}
  }

  return wallet;
}

/**
 * Returns past wallet transaction history.
 */
export async function getWalletTransactions(politicianId: string): Promise<WalletTransaction[]> {
  const pId = politicianId || 'pp1';

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('politician_id', pId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          walletId: d.wallet_id,
          politicianId: d.politician_id,
          type: d.type,
          amountINR: Number(d.amount_inr),
          serviceType: d.service_type,
          referenceId: d.reference_id,
          description: d.description,
          balanceAfterINR: Number(d.balance_after_inr),
          createdAt: d.created_at,
        }));
      }
    } catch {}
  }

  return inMemoryTransactions.filter((tx) => tx.politicianId === pId || !pId);
}
