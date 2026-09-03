export interface CampaignWallet {
  id: string;
  politicianId: string;
  balanceINR: number;
  totalRechargedINR: number;
  totalSpentINR: number;
  currency: string;
  updatedAt: string;
}

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

export interface OBDBroadcastJob {
  id: string;
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

export interface TraiWindowStatus {
  permitted: boolean;
  currentISTHour: number;
  message?: string;
}
