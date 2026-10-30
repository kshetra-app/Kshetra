/**
 * Shared Contracts: Domain 6 — Political Finance, Campaigns, Advertising & Monetization
 * Master Product Blueprint — Jobs 054–061 (Ratified DEC-186)
 */

export type CampaignRole =
  | 'campaign_manager'
  | 'content_creator'
  | 'field_director'
  | 'finance_officer'
  | 'analyst';

export type PoliticalCampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

export interface PoliticalCampaignDTO {
  id: string;
  candidateId?: string;
  organizationId?: string;
  title: string;
  description: string;
  stateCode: string;
  targetConstituencyId: string;
  status: PoliticalCampaignStatus;
  startDate: string;
  endDate: string;
  totalBudgetInr: number;
  spentBudgetInr: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoliticalCampaignInput {
  title: string;
  description?: string;
  stateCode: string;
  targetConstituencyId: string;
  startDate: string;
  endDate: string;
  totalBudgetInr?: number;
  candidateId?: string;
  organizationId?: string;
}

export interface CampaignMemberDTO {
  id: string;
  campaignId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  role: CampaignRole;
  permissions: string[];
  status: 'invited' | 'active' | 'suspended' | 'revoked';
  createdAt: string;
}

export type ContentModality =
  | 'post'
  | 'short'
  | 'event'
  | 'rally'
  | 'broadcast_announcement';

export type ContentWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED';

export interface PoliticalCampaignContentDTO {
  id: string;
  campaignId: string;
  modality: ContentModality;
  title: string;
  bodyText: string;
  mediaUrls: string[];
  scheduledAt?: string;
  eventLocation?: string;
  targetConstituencyId: string;
  workflowStatus: ContentWorkflowStatus;
  createdBy: string;
  createdByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PoliticalAdCategory =
  | 'festival_wishes'
  | 'birthday_congratulatory'
  | 'milestone_achievement'
  | 'rally_meeting'
  | 'election_campaign'
  | 'issue_advocacy';

export type ElectoralWindowState = 'ROUTINE_CIVIC' | 'MCC_ACTIVE';

export type AdPricingModel = 'cpm' | 'cpc' | 'fixed_daily_flight';

export type PoliticalAdStatus =
  | 'pending_review'
  | 'approved'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected';

export interface PoliticalAdDTO {
  id: string;
  campaignId?: string;
  category: PoliticalAdCategory;
  title: string;
  headline: string;
  bodyText: string;
  mediaUrl?: string;
  targetScope: 'constituency' | 'district' | 'state';
  targetConstituencyId: string;
  sponsorName: string;
  disclaimerText: string;
  electoralWindowState: ElectoralWindowState;
  mcmcCertificateId?: string;
  mcmcCertificatePdfUrl?: string;
  statutoryCandidateId?: string;
  status: PoliticalAdStatus;
  pricingModel: AdPricingModel;
  flightStartDate: string;
  flightEndDate: string;
  dailyBudgetInr: number;
  totalBudgetInr: number;
  spentAmountInr: number;
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoliticalAdInput {
  campaignId?: string;
  category: PoliticalAdCategory;
  title: string;
  headline: string;
  bodyText: string;
  mediaUrl?: string;
  targetScope?: 'constituency' | 'district' | 'state';
  targetConstituencyId: string;
  sponsorName: string;
  mcmcCertificateId?: string;
  mcmcCertificatePdfUrl?: string;
  statutoryCandidateId?: string;
  pricingModel?: AdPricingModel;
  flightStartDate: string;
  flightEndDate: string;
  dailyBudgetInr?: number;
  totalBudgetInr?: number;
}

export interface PoliticalAdTransparencyItemDTO {
  id: string;
  headline: string;
  bodyText: string;
  category: PoliticalAdCategory;
  sponsorName: string;
  disclaimerText: string;
  targetConstituencyId: string;
  flightStartDate: string;
  flightEndDate: string;
  totalSpentInr: number;
  impressionsCount: number;
  mcmcCertificateId?: string;
  status: PoliticalAdStatus;
  createdAt: string;
}

export type CommercialBusinessCategory =
  | 'retail'
  | 'dining'
  | 'healthcare'
  | 'education'
  | 'services'
  | 'real_estate'
  | 'other';

export interface CommercialAdAccountDTO {
  id: string;
  businessName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  businessCategory: CommercialBusinessCategory;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressStreet: string;
  mandalName?: string;
  constituencyId: string;
  stateCode: string;
  walletBalanceInr: number;
  totalRechargedInr: number;
  totalSpentInr: number;
  isVerified: boolean;
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommercialAccountInput {
  businessName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  businessCategory: CommercialBusinessCategory;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressStreet: string;
  mandalName?: string;
  constituencyId: string;
  stateCode: string;
}

export type AdPlacementSlot =
  | 'feed_inline'
  | 'shorts_interstitial'
  | 'constituency_banner';

export interface CommercialAdDTO {
  id: string;
  accountId: string;
  headline: string;
  bodyText: string;
  mediaAssetUrl?: string;
  ctaType: 'website' | 'phone' | 'whatsapp' | 'directions';
  ctaTarget: string;
  placementSlot: AdPlacementSlot;
  pricingModel: AdPricingModel;
  targetConstituencyId: string;
  startDate: string;
  endDate: string;
  dailyBudgetInr: number;
  totalBudgetInr: number;
  spentAmountInr: number;
  impressionsCount: number;
  clicksCount: number;
  frequencyCapPerUser24h: number;
  status: 'draft' | 'review' | 'active' | 'paused' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommercialAdInput {
  accountId: string;
  headline: string;
  bodyText: string;
  mediaAssetUrl?: string;
  ctaType?: 'website' | 'phone' | 'whatsapp' | 'directions';
  ctaTarget: string;
  placementSlot?: AdPlacementSlot;
  pricingModel?: AdPricingModel;
  targetConstituencyId: string;
  startDate: string;
  endDate: string;
  dailyBudgetInr?: number;
  totalBudgetInr?: number;
}

export type ConstituencyEconomicTier =
  | 'tier_1_metro'
  | 'tier_2_urban'
  | 'tier_3_rural';

export interface AdPricingConfigDTO {
  id: string;
  pricingModel: AdPricingModel;
  placementSlot: AdPlacementSlot;
  adType: 'political' | 'commercial';
  tier: ConstituencyEconomicTier;
  baseRateInr: number;
  seasonalMultiplier: number;
  effectiveRateInr: number;
  minBudgetInr: number;
  isActive: boolean;
  notes?: string;
}

export interface AdServeResultDTO {
  adId: string;
  adType: 'political' | 'commercial';
  placementSlot: AdPlacementSlot;
  pricingModel: AdPricingModel;
  headline: string;
  bodyText: string;
  mediaUrl?: string;
  ctaType?: string;
  ctaTarget?: string;
  disclaimerText?: string;
  sponsorName?: string;
  viewToken: string;
}

export interface AdTelemetryEventInput {
  adId: string;
  adType: 'political' | 'commercial';
  eventType: 'impression' | 'click';
  targetConstituencyId: string;
  viewToken: string;
  userSessionHash: string;
}

export interface GstTaxInvoiceDTO {
  id: string;
  invoiceNumber: string;
  accountType: 'political' | 'commercial';
  accountId: string;
  billedEntityName: string;
  billedEntityGstin?: string;
  hsnSacCode: string;
  taxableAmountInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalAmountInr: number;
  status: 'issued' | 'paid' | 'cancelled';
  issuedAt: string;
}
