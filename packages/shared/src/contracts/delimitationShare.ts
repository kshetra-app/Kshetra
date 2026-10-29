/**
 * Delimitation Share Cards & Public Web Links Contracts (JOB 022)
 *
 * Authority: Master Product Blueprint & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
 */

export interface CreateShareCardRequest {
  pinCode: string;
  stateCode: string;
  constituencyName: string;
  acNo: number;
  impactType?: string;
  headline?: string;
  summary?: string;
  domain?: 'poligram.in' | 'panin.in' | string;
}

export interface ShareCardSnapshotDTO {
  shareId: string;
  pinCode: string;
  stateCode: string;
  constituencyName: string;
  acNo: number;
  impactType: string;
  headline: string;
  summary: string;
  ogImageUrl: string;
  canonicalShareUrl: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ShareCardMeta {
  title: string;
  description: string;
  ogImage: string;
  ogUrl: string;
  twitterCard: 'summary_large_image' | 'summary';
}
