/**
 * Commercial & Political Advertising Service, Serving Engine, Telemetry & Billing Ledger
 * Master Product Blueprint — Domain 6 (JOB 057, JOB 058, JOB 059, JOB 060, JOB 061)
 * Ratified under DEC-186
 */

import crypto from 'node:crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  PoliticalAdCategory,
  PoliticalAdDTO,
  CreatePoliticalAdInput,
  PoliticalAdTransparencyItemDTO,
  ElectoralWindowState,
  CommercialAdAccountDTO,
  CreateCommercialAccountInput,
  CommercialAdDTO,
  CreateCommercialAdInput,
  AdPlacementSlot,
  AdPricingModel,
  AdPricingConfigDTO,
  ConstituencyEconomicTier,
  AdServeResultDTO,
  AdTelemetryEventInput,
  GstTaxInvoiceDTO,
} from '@kshetra/shared';

// Cryptographic Secret for ViewToken Generation & Verification
const VIEW_TOKEN_SECRET = process.env.AD_VIEW_TOKEN_SECRET || 'poligram-ad-telemetry-secret-key-2026';

// In-Memory Storage for High-Throughput Serving & Standalone Test Resilience
const MEMORY_POLITICAL_ADS: Map<string, PoliticalAdDTO> = new Map();
const MEMORY_COMMERCIAL_ACCOUNTS: Map<string, CommercialAdAccountDTO> = new Map();
const MEMORY_COMMERCIAL_ADS: Map<string, CommercialAdDTO> = new Map();
const MEMORY_PRICING_CONFIGS: Map<string, AdPricingConfigDTO> = new Map();
const MEMORY_TELEMETRY: AdTelemetryEventInput[] = [];
const MEMORY_INVOICES: Map<string, GstTaxInvoiceDTO> = new Map();
const RECENT_CLICKS: Map<string, number> = new Map(); // sessionHash -> lastClickTimestamp (anti-fraud IVT)

// Initialize Default Pricing Configurations (Ratified DEC-186)
function initDefaultPricing() {
  const configs: Array<Omit<AdPricingConfigDTO, 'id'>> = [
    { pricingModel: 'cpm', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_1_metro', baseRateInr: 150, seasonalMultiplier: 1.0, effectiveRateInr: 150, minBudgetInr: 500, isActive: true },
    { pricingModel: 'cpm', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_2_urban', baseRateInr: 100, seasonalMultiplier: 1.0, effectiveRateInr: 100, minBudgetInr: 500, isActive: true },
    { pricingModel: 'cpm', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_3_rural', baseRateInr: 75, seasonalMultiplier: 1.0, effectiveRateInr: 75, minBudgetInr: 500, isActive: true },
    { pricingModel: 'cpc', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_1_metro', baseRateInr: 5.0, seasonalMultiplier: 1.0, effectiveRateInr: 5.0, minBudgetInr: 500, isActive: true },
    { pricingModel: 'cpc', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_2_urban', baseRateInr: 3.5, seasonalMultiplier: 1.0, effectiveRateInr: 3.5, minBudgetInr: 500, isActive: true },
    { pricingModel: 'cpc', placementSlot: 'feed_inline', adType: 'commercial', tier: 'tier_3_rural', baseRateInr: 2.5, seasonalMultiplier: 1.0, effectiveRateInr: 2.5, minBudgetInr: 500, isActive: true },
    { pricingModel: 'fixed_daily_flight', placementSlot: 'constituency_banner', adType: 'commercial', tier: 'tier_1_metro', baseRateInr: 1500, seasonalMultiplier: 1.0, effectiveRateInr: 1500, minBudgetInr: 1500, isActive: true },
    { pricingModel: 'fixed_daily_flight', placementSlot: 'constituency_banner', adType: 'commercial', tier: 'tier_2_urban', baseRateInr: 1000, seasonalMultiplier: 1.0, effectiveRateInr: 1000, minBudgetInr: 1000, isActive: true },
    { pricingModel: 'fixed_daily_flight', placementSlot: 'constituency_banner', adType: 'commercial', tier: 'tier_3_rural', baseRateInr: 750, seasonalMultiplier: 1.0, effectiveRateInr: 750, minBudgetInr: 750, isActive: true },
    { pricingModel: 'cpm', placementSlot: 'feed_inline', adType: 'political', tier: 'tier_1_metro', baseRateInr: 200, seasonalMultiplier: 1.0, effectiveRateInr: 200, minBudgetInr: 1000, isActive: true },
    { pricingModel: 'fixed_daily_flight', placementSlot: 'constituency_banner', adType: 'political', tier: 'tier_1_metro', baseRateInr: 3000, seasonalMultiplier: 1.0, effectiveRateInr: 3000, minBudgetInr: 3000, isActive: true },
  ];

  for (const c of configs) {
    const key = `${c.pricingModel}_${c.placementSlot}_${c.adType}_${c.tier}`;
    MEMORY_PRICING_CONFIGS.set(key, { ...c, id: key });
  }
}
initDefaultPricing();

export class AdService {
  // Current Electoral Window State across constituencies (default ROUTINE_CIVIC; changes during election notifications)
  private constituencyElectoralState: Map<string, ElectoralWindowState> = new Map();

  /**
   * Set Electoral Window State for a constituency (e.g. when ECI notifies elections)
   */
  setConstituencyElectoralState(constituencyId: string, state: ElectoralWindowState): void {
    this.constituencyElectoralState.set(constituencyId.toUpperCase(), state);
  }

  getConstituencyElectoralState(constituencyId: string): ElectoralWindowState {
    return this.constituencyElectoralState.get(constituencyId.toUpperCase()) || 'ROUTINE_CIVIC';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // JOB 057: POLITICAL ADVERTISING & ADAPTIVE GOVERNANCE MATRIX
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create Political Ad across 6 categories with automatic disclaimer generation
   */
  async createPoliticalAd(input: CreatePoliticalAdInput): Promise<PoliticalAdDTO> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Political ad title is required');
    }
    if (!input.headline || input.headline.trim().length === 0) {
      throw new Error('Political ad headline is required');
    }
    if (!input.targetConstituencyId) {
      throw new Error('Target constituency is required');
    }
    if (!input.sponsorName || input.sponsorName.trim().length === 0) {
      throw new Error('Statutory sponsor name is required under Section 127A RPA 1951');
    }

    const targetAc = input.targetConstituencyId.toUpperCase();
    const electoralState = this.getConstituencyElectoralState(targetAc);
    const adId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Auto-generate statutory disclaimer under Section 127A of the Representation of the People Act, 1951
    let disclaimer = `Political advertisement sponsored by: ${input.sponsorName.trim()}.`;
    if (input.mcmcCertificateId) {
      disclaimer += ` ECI MCMC Certificate: ${input.mcmcCertificateId}.`;
    }

    const ad: PoliticalAdDTO = {
      id: adId,
      campaignId: input.campaignId,
      category: input.category,
      title: input.title.trim(),
      headline: input.headline.trim(),
      bodyText: input.bodyText || '',
      mediaUrl: input.mediaUrl,
      targetScope: input.targetScope || 'constituency',
      targetConstituencyId: targetAc,
      sponsorName: input.sponsorName.trim(),
      disclaimerText: disclaimer,
      electoralWindowState: electoralState,
      mcmcCertificateId: input.mcmcCertificateId,
      mcmcCertificatePdfUrl: input.mcmcCertificatePdfUrl,
      statutoryCandidateId: input.statutoryCandidateId,
      status: 'pending_review',
      pricingModel: input.pricingModel || 'cpm',
      flightStartDate: input.flightStartDate,
      flightEndDate: input.flightEndDate,
      dailyBudgetInr: input.dailyBudgetInr || 500,
      totalBudgetInr: input.totalBudgetInr || 1000,
      spentAmountInr: 0,
      impressionsCount: 0,
      clicksCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    MEMORY_POLITICAL_ADS.set(adId, ad);
    return ad;
  }

  /**
   * Adaptive Governance Review for Political Ads:
   * Fast-Track review during routine periods for greetings/milestones;
   * Strict fail-closed MCMC gate during active MCC.
   */
  async reviewPoliticalAd(
    adId: string,
    decision: 'approved' | 'rejected',
    reviewerId?: string,
  ): Promise<PoliticalAdDTO> {
    const ad = MEMORY_POLITICAL_ADS.get(adId);
    if (!ad) {
      throw new Error(`Political ad ${adId} not found`);
    }

    if (decision === 'rejected') {
      ad.status = 'rejected';
      ad.updatedAt = new Date().toISOString();
      MEMORY_POLITICAL_ADS.set(adId, ad);
      return ad;
    }

    // Adaptive Statutory Verification Gate (Ratified DEC-186)
    const electoralState = this.getConstituencyElectoralState(ad.targetConstituencyId);

    if (electoralState === 'MCC_ACTIVE') {
      // During active elections, ALL political ads require MCMC pre-certification
      if (!ad.mcmcCertificateId || !ad.mcmcCertificatePdfUrl) {
        throw new Error(
          `ECI MCMC Pre-Certification is strictly mandatory for political ads in constituency ${ad.targetConstituencyId} during active Model Code of Conduct (MCC). Please upload certificate and certificate number.`,
        );
      }
    } else {
      // Routine Civic Period:
      // Categories 'election_campaign' and 'rally_meeting' require MCMC or Party Authorization
      if (ad.category === 'election_campaign') {
        if (!ad.mcmcCertificateId) {
          throw new Error('Election campaign vote-solicitation ads require an ECI MCMC pre-certification number.');
        }
      }
      // Categories 'festival_wishes', 'birthday_congratulatory', 'milestone_achievement' pass fast-track
    }

    ad.status = 'active';
    ad.updatedAt = new Date().toISOString();
    MEMORY_POLITICAL_ADS.set(adId, ad);
    return ad;
  }

  /**
   * Public Ad Transparency Ledger (Representation of the People Act 1951, Section 127A)
   */
  async getPublicTransparencyLedger(query?: {
    constituencyId?: string;
    category?: PoliticalAdCategory;
    sponsorName?: string;
  }): Promise<PoliticalAdTransparencyItemDTO[]> {
    let ads = Array.from(MEMORY_POLITICAL_ADS.values());

    if (query?.constituencyId) {
      const match = query.constituencyId.toUpperCase();
      ads = ads.filter((a) => a.targetConstituencyId === match);
    }
    if (query?.category) {
      ads = ads.filter((a) => a.category === query.category);
    }
    if (query?.sponsorName) {
      const term = query.sponsorName.toLowerCase();
      ads = ads.filter((a) => a.sponsorName.toLowerCase().includes(term));
    }

    return ads.map((a) => ({
      id: a.id,
      headline: a.headline,
      bodyText: a.bodyText,
      category: a.category,
      sponsorName: a.sponsorName,
      disclaimerText: a.disclaimerText,
      targetConstituencyId: a.targetConstituencyId,
      flightStartDate: a.flightStartDate,
      flightEndDate: a.flightEndDate,
      totalSpentInr: a.spentAmountInr,
      impressionsCount: a.impressionsCount,
      mcmcCertificateId: a.mcmcCertificateId,
      status: a.status,
      createdAt: a.createdAt,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // JOB 058: COMMERCIAL ADS V1 & SEPARATE ACCOUNT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Onboard a local business merchant account
   */
  async createCommercialAccount(input: CreateCommercialAccountInput): Promise<CommercialAdAccountDTO> {
    if (!input.businessName || input.businessName.trim().length === 0) {
      throw new Error('Business name is required');
    }
    if (!input.contactPhone || input.contactPhone.trim().length === 0) {
      throw new Error('Contact phone is required');
    }
    if (!input.constituencyId) {
      throw new Error('Constituency is required');
    }

    const accountId = crypto.randomUUID();
    const now = new Date().toISOString();

    const account: CommercialAdAccountDTO = {
      id: accountId,
      businessName: input.businessName.trim(),
      tradeName: input.tradeName,
      gstin: input.gstin?.toUpperCase(),
      pan: input.pan?.toUpperCase(),
      businessCategory: input.businessCategory,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      addressStreet: input.addressStreet,
      mandalName: input.mandalName,
      constituencyId: input.constituencyId.toUpperCase(),
      stateCode: input.stateCode,
      walletBalanceInr: 0,
      totalRechargedInr: 0,
      totalSpentInr: 0,
      isVerified: Boolean(input.gstin),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    MEMORY_COMMERCIAL_ACCOUNTS.set(accountId, account);
    return account;
  }

  async getCommercialAccountById(accountId: string): Promise<CommercialAdAccountDTO | null> {
    return MEMORY_COMMERCIAL_ACCOUNTS.get(accountId) || null;
  }

  /**
   * Create a Commercial Ad Creative
   */
  async createCommercialAd(input: CreateCommercialAdInput): Promise<CommercialAdDTO> {
    const account = await this.getCommercialAccountById(input.accountId);
    if (!account) {
      throw new Error(`Commercial account ${input.accountId} not found`);
    }

    if (!input.headline || input.headline.trim().length === 0) {
      throw new Error('Ad headline is required');
    }
    if (!input.ctaTarget) {
      throw new Error('CTA target (URL or phone) is required');
    }

    const adId = crypto.randomUUID();
    const now = new Date().toISOString();

    const ad: CommercialAdDTO = {
      id: adId,
      accountId: input.accountId,
      headline: input.headline.trim(),
      bodyText: input.bodyText || '',
      mediaAssetUrl: input.mediaAssetUrl,
      ctaType: input.ctaType || 'website',
      ctaTarget: input.ctaTarget,
      placementSlot: input.placementSlot || 'feed_inline',
      pricingModel: input.pricingModel || 'cpm',
      targetConstituencyId: input.targetConstituencyId.toUpperCase(),
      startDate: input.startDate,
      endDate: input.endDate,
      dailyBudgetInr: input.dailyBudgetInr || 500,
      totalBudgetInr: input.totalBudgetInr || 1000,
      spentAmountInr: 0,
      impressionsCount: 0,
      clicksCount: 0,
      frequencyCapPerUser24h: 3,
      status: 'active', // Fast automated review for commercial ads
      createdAt: now,
      updatedAt: now,
    };

    MEMORY_COMMERCIAL_ADS.set(adId, ad);
    return ad;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // JOB 058 & 059: DETERMINISTIC AD SERVING ENGINE & TELEMETRY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate Cryptographic Signed ViewToken (Anti-forgery)
   */
  generateViewToken(adId: string, userSessionHash: string): string {
    const timestamp = Date.now();
    const payload = `${adId}:${userSessionHash}:${timestamp}`;
    const signature = crypto.createHmac('sha256', VIEW_TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /**
   * Verify ViewToken
   */
  verifyViewToken(viewToken: string): { valid: boolean; adId?: string; userSessionHash?: string } {
    try {
      const decoded = Buffer.from(viewToken, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return { valid: false };

      const [adId, sessionHash, timestampStr, signature] = parts;
      const expectedPayload = `${adId}:${sessionHash}:${timestampStr}`;
      const expectedSignature = crypto.createHmac('sha256', VIEW_TOKEN_SECRET).update(expectedPayload).digest('hex').slice(0, 16);

      if (signature !== expectedSignature) return { valid: false };

      // Expire view tokens older than 15 minutes
      const age = Date.now() - parseInt(timestampStr, 10);
      if (age > 900000) return { valid: false };

      return { valid: true, adId, userSessionHash: sessionHash };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Deterministic Ad Serving Engine
   * Matches user constituency, placement slot, active flight dates, and available budget
   */
  async serveAd(
    constituencyId: string,
    placementSlot: AdPlacementSlot,
    userSessionHash: string,
  ): Promise<AdServeResultDTO | null> {
    const targetAc = constituencyId.toUpperCase();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Check Commercial Ads first
    const commercialCandidates = Array.from(MEMORY_COMMERCIAL_ADS.values()).filter(
      (a) =>
        a.targetConstituencyId === targetAc &&
        a.placementSlot === placementSlot &&
        a.status === 'active' &&
        a.startDate <= today &&
        a.endDate >= today &&
        a.spentAmountInr < a.totalBudgetInr,
    );

    if (commercialCandidates.length > 0) {
      // Prioritize fixed daily flight banner takeovers, then CPM/CPC
      const selected = commercialCandidates.sort((a, b) => {
        if (a.pricingModel === 'fixed_daily_flight') return -1;
        if (b.pricingModel === 'fixed_daily_flight') return 1;
        return (b.totalBudgetInr - b.spentAmountInr) - (a.totalBudgetInr - a.spentAmountInr);
      })[0];

      const viewToken = this.generateViewToken(selected.id, userSessionHash);
      return {
        adId: selected.id,
        adType: 'commercial',
        placementSlot: selected.placementSlot,
        pricingModel: selected.pricingModel,
        headline: selected.headline,
        bodyText: selected.bodyText,
        mediaUrl: selected.mediaAssetUrl,
        ctaType: selected.ctaType,
        ctaTarget: selected.ctaTarget,
        viewToken,
      };
    }

    // 2. Check Political Ads
    const politicalCandidates = Array.from(MEMORY_POLITICAL_ADS.values()).filter(
      (a) =>
        a.targetConstituencyId === targetAc &&
        a.status === 'active' &&
        a.flightStartDate <= today &&
        a.flightEndDate >= today &&
        a.spentAmountInr < a.totalBudgetInr,
    );

    if (politicalCandidates.length > 0) {
      const selected = politicalCandidates[0];
      const viewToken = this.generateViewToken(selected.id, userSessionHash);
      return {
        adId: selected.id,
        adType: 'political',
        placementSlot,
        pricingModel: selected.pricingModel,
        headline: selected.headline,
        bodyText: selected.bodyText,
        mediaUrl: selected.mediaUrl,
        sponsorName: selected.sponsorName,
        disclaimerText: selected.disclaimerText,
        viewToken,
      };
    }

    return null;
  }

  /**
   * JOB 059: Record Ad Impression & Telemetry
   */
  async recordImpression(input: AdTelemetryEventInput): Promise<{ recorded: boolean; effectiveDebitInr: number }> {
    const verification = this.verifyViewToken(input.viewToken);
    if (!verification.valid || verification.adId !== input.adId) {
      throw new Error('Invalid or forged viewToken for ad impression');
    }

    MEMORY_TELEMETRY.push(input);
    let debitInr = 0;

    if (input.adType === 'commercial') {
      const ad = MEMORY_COMMERCIAL_ADS.get(input.adId);
      if (ad) {
        ad.impressionsCount += 1;
        if (ad.pricingModel === 'cpm') {
          // Dynamic micropayment debit: e.g. ₹150 CPM = ₹0.15 per impression
          const rate = 150 / 1000;
          ad.spentAmountInr += rate;
          debitInr = rate;
          // Deduct from merchant wallet
          const account = MEMORY_COMMERCIAL_ACCOUNTS.get(ad.accountId);
          if (account && account.walletBalanceInr >= rate) {
            account.walletBalanceInr -= rate;
            account.totalSpentInr += rate;
          }
        }
      }
    } else {
      const ad = MEMORY_POLITICAL_ADS.get(input.adId);
      if (ad) {
        ad.impressionsCount += 1;
        if (ad.pricingModel === 'cpm') {
          const rate = 200 / 1000;
          ad.spentAmountInr += rate;
          debitInr = rate;
        }
      }
    }

    return { recorded: true, effectiveDebitInr: debitInr };
  }

  /**
   * JOB 059: Record Ad Click with Anti-Fraud IVT Filter
   */
  async recordClick(input: AdTelemetryEventInput): Promise<{ recorded: boolean; ivtFiltered: boolean; effectiveDebitInr: number }> {
    const verification = this.verifyViewToken(input.viewToken);
    if (!verification.valid || verification.adId !== input.adId) {
      throw new Error('Invalid or forged viewToken for ad click');
    }

    // Anti-Fraud Invalid Traffic (IVT) Filter: Deduplicate repeat clicks within 5 seconds
    const now = Date.now();
    const lastClick = RECENT_CLICKS.get(input.userSessionHash) || 0;
    if (now - lastClick < 5000) {
      // Filter out as invalid repeat click
      return { recorded: false, ivtFiltered: true, effectiveDebitInr: 0 };
    }
    RECENT_CLICKS.set(input.userSessionHash, now);

    MEMORY_TELEMETRY.push(input);
    let debitInr = 0;

    if (input.adType === 'commercial') {
      const ad = MEMORY_COMMERCIAL_ADS.get(input.adId);
      if (ad) {
        ad.clicksCount += 1;
        if (ad.pricingModel === 'cpc') {
          const cpcRate = 5.0; // ₹5 per verified click
          ad.spentAmountInr += cpcRate;
          debitInr = cpcRate;
          const account = MEMORY_COMMERCIAL_ACCOUNTS.get(ad.accountId);
          if (account && account.walletBalanceInr >= cpcRate) {
            account.walletBalanceInr -= cpcRate;
            account.totalSpentInr += cpcRate;
          }
        }
      }
    } else {
      const ad = MEMORY_POLITICAL_ADS.get(input.adId);
      if (ad) {
        ad.clicksCount += 1;
      }
    }

    return { recorded: true, ivtFiltered: false, effectiveDebitInr: debitInr };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // JOB 060: HYBRID AD BILLING, INVOICING & FINANCIAL LEDGER
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Recharge Wallet (Prepaid Credit)
   */
  async rechargeCommercialWallet(accountId: string, amountInr: number): Promise<CommercialAdAccountDTO> {
    if (amountInr <= 0) {
      throw new Error('Recharge amount must be positive');
    }
    const account = await this.getCommercialAccountById(accountId);
    if (!account) {
      throw new Error(`Commercial account ${accountId} not found`);
    }

    account.walletBalanceInr += amountInr;
    account.totalRechargedInr += amountInr;
    account.updatedAt = new Date().toISOString();
    MEMORY_COMMERCIAL_ACCOUNTS.set(accountId, account);

    // Generate statutory GST tax invoice for the recharge
    await this.generateGstInvoice({
      accountType: 'commercial',
      accountId,
      taxableAmountInr: amountInr,
      billedEntityName: account.businessName,
      billedEntityGstin: account.gstin,
    });

    return account;
  }

  /**
   * Generate GST Tax Invoice (18% GST: 9% CGST + 9% SGST / SAC 998311)
   */
  async generateGstInvoice(params: {
    accountType: 'political' | 'commercial';
    accountId: string;
    taxableAmountInr: number;
    billedEntityName: string;
    billedEntityGstin?: string;
  }): Promise<GstTaxInvoiceDTO> {
    const invoiceNumber = `INV-POLIGRAM-${Date.now().toString().slice(-6)}`;
    const cgst = Math.round(params.taxableAmountInr * 0.09 * 100) / 100;
    const sgst = Math.round(params.taxableAmountInr * 0.09 * 100) / 100;
    const total = Math.round((params.taxableAmountInr + cgst + sgst) * 100) / 100;

    const invoice: GstTaxInvoiceDTO = {
      id: crypto.randomUUID(),
      invoiceNumber,
      accountType: params.accountType,
      accountId: params.accountId,
      billedEntityName: params.billedEntityName,
      billedEntityGstin: params.billedEntityGstin,
      hsnSacCode: '998311',
      taxableAmountInr: params.taxableAmountInr,
      cgstInr: cgst,
      sgstInr: sgst,
      igstInr: 0,
      totalAmountInr: total,
      status: 'paid',
      issuedAt: new Date().toISOString(),
    };

    MEMORY_INVOICES.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Get Invoices for an account
   */
  async getInvoices(accountId: string): Promise<GstTaxInvoiceDTO[]> {
    return Array.from(MEMORY_INVOICES.values()).filter((i) => i.accountId === accountId);
  }

  /**
   * Admin: Get or Update Pricing Configurations
   */
  async listPricingConfigs(): Promise<AdPricingConfigDTO[]> {
    return Array.from(MEMORY_PRICING_CONFIGS.values());
  }

  async updatePricingConfig(
    key: string,
    update: { baseRateInr?: number; seasonalMultiplier?: number; isActive?: boolean },
  ): Promise<AdPricingConfigDTO> {
    const config = MEMORY_PRICING_CONFIGS.get(key);
    if (!config) {
      throw new Error(`Pricing configuration ${key} not found`);
    }

    if (update.baseRateInr !== undefined) config.baseRateInr = update.baseRateInr;
    if (update.seasonalMultiplier !== undefined) config.seasonalMultiplier = update.seasonalMultiplier;
    if (update.isActive !== undefined) config.isActive = update.isActive;

    config.effectiveRateInr = config.baseRateInr * config.seasonalMultiplier;
    MEMORY_PRICING_CONFIGS.set(key, config);
    return config;
  }

  /**
   * Clear in-memory caches (for test isolation)
   */
  clearCaches(): void {
    MEMORY_POLITICAL_ADS.clear();
    MEMORY_COMMERCIAL_ACCOUNTS.clear();
    MEMORY_COMMERCIAL_ADS.clear();
    MEMORY_TELEMETRY.length = 0;
    MEMORY_INVOICES.clear();
    RECENT_CLICKS.clear();
    initDefaultPricing();
  }
}

export const adService = new AdService();
