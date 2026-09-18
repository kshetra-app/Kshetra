/**
 * Provider Abstraction Types & Interfaces
 * W009-B2: Bounded Provider Abstraction (Razorpay & Voice OBD)
 */

export interface PaymentOrderParams {
  amountINR: number;
  currency?: string;
  politicianId?: string;
  pageId?: string;
  billingCycle?: 'monthly' | 'annual';
  receipt?: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  orderId: string;
  amountINR: number;
  amountPaise: number;
  currency: string;
  key: string;
  isSandbox: boolean;
  billingCycle?: 'monthly' | 'annual';
  description?: string;
  prefill?: {
    name?: string;
    contact?: string;
  };
}

export interface PaymentVerificationInput {
  orderId: string;
  paymentId: string;
  signature?: string;
  sandboxBypass?: boolean;
}

export interface PaymentVerificationResult {
  valid: boolean;
  orderId: string;
  paymentId: string;
  reason?: string;
}

export interface PaymentProvider {
  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPaymentSignature(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
  isConfigured(): boolean;
  getPublicKey(): string;
}

export interface TraiWindowCheckResult {
  permitted: boolean;
  currentISTHour: number;
  message?: string;
}

export interface ObdDispatchParams {
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
    phoneNumbers?: string[];
  };
  ratePerCallINR: number;
}

export interface ObdDispatchResult {
  success: boolean;
  callSid?: string;
  providerRef?: string;
  error?: string;
  warning?: string;
}

export interface ObdDeliveryReport {
  raw: Record<string, any>;
  callSid?: string;
  broadcastId?: string;
  callerPhone?: string;
  status?: 'answered' | 'busy' | 'unreachable' | 'completed' | 'other';
  duration?: number;
  digits?: string;
  isOptOut: boolean;
  isIvrResponse: boolean;
}

export interface VoiceObdProvider {
  isWithinTraiCallingWindow(referenceTime?: Date): TraiWindowCheckResult;
  dispatchBroadcast(params: ObdDispatchParams): Promise<ObdDispatchResult>;
  validateWebhook(request: { headers: Record<string, any>; body: any }): boolean;
  parseDeliveryReport(body: Record<string, any>): ObdDeliveryReport;
}
