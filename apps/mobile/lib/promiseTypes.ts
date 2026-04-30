/**
 * Promise Tracker types — Election promises, manifesto commitments, delivery tracking.
 * Mirrors the Supabase schema from 009_promise_tracker.sql.
 */

export type PromiseStatus =
  | 'promised'
  | 'in_progress'
  | 'partially_delivered'
  | 'delivered'
  | 'broken'
  | 'modified'
  | 'stalled';

export type PromiseCategory =
  | 'infrastructure'
  | 'welfare'
  | 'education'
  | 'healthcare'
  | 'economy'
  | 'governance'
  | 'agriculture'
  | 'environment'
  | 'law_order'
  | 'social_justice';

export type PromiseSource =
  | 'manifesto'
  | 'campaign_speech'
  | 'official_announcement'
  | 'budget'
  | 'press_conference';

export type EvidenceType = 'photo' | 'document' | 'news_link' | 'video';

export interface ElectionPromise {
  id: string;
  stateCode: string;
  constituencyAcNo?: number;
  constituencyName?: string;
  party: string;
  mlaName?: string;
  title: string;
  description: string;
  category: PromiseCategory;
  source: PromiseSource;
  sourceUrl?: string;
  promisedDate: string;
  deadline?: string;
  status: PromiseStatus;
  deliveryPercentage: number;
  electionYear: number;

  // Engagement
  followCount: number;
  verificationCount: number;
  disputeCount: number;

  // Client state
  userFollowing?: boolean;
}

export interface PromiseUpdate {
  id: string;
  promiseId: string;
  fromStatus: PromiseStatus;
  toStatus: PromiseStatus;
  note: string;
  updatedBy?: string;
  updatedByName: string;
  sourceUrl?: string;
  createdAt: string;
}

export interface PromiseEvidence {
  id: string;
  promiseId: string;
  userId: string;
  userName: string;
  evidenceType: EvidenceType;
  url: string;
  caption?: string;
  isSupporting: boolean;
  upvotes: number;
  createdAt: string;
}

/** Promise Delivery Index — computed per party/MLA/government */
export interface PromiseDeliveryIndex {
  entity: string;          // party name or MLA name
  entityType: 'party' | 'mla' | 'government';
  totalPromises: number;
  delivered: number;
  partiallyDelivered: number;
  inProgress: number;
  broken: number;
  stalled: number;
  modified: number;
  score: number;           // 0-100 PDI
}

/** Government Report Card — aggregate */
export interface GovernmentReportCardData {
  stateCode: string;
  party: string;
  electionYear: number;
  totalPromises: number;
  statusBreakdown: Record<PromiseStatus, number>;
  categoryBreakdown: Record<PromiseCategory, number>;
  pdi: number;
  averageDeliveryPercent: number;
  topDelivered: ElectionPromise[];
  topBroken: ElectionPromise[];
}

// ─── CONFIGS ───

export const PROMISE_STATUS_CONFIG: Record<PromiseStatus, { color: string; icon: string; label: string }> = {
  promised: { color: '#6B7280', icon: 'megaphone', label: 'Promised' },
  in_progress: { color: '#3B82F6', icon: 'construct', label: 'In Progress' },
  partially_delivered: { color: '#F59E0B', icon: 'pie-chart', label: 'Partial' },
  delivered: { color: '#10B981', icon: 'checkmark-circle', label: 'Delivered' },
  broken: { color: '#EF4444', icon: 'close-circle', label: 'Broken' },
  modified: { color: '#8B5CF6', icon: 'create', label: 'Modified' },
  stalled: { color: '#F97316', icon: 'pause-circle', label: 'Stalled' },
};

export const PROMISE_CATEGORY_CONFIG: Record<PromiseCategory, { color: string; icon: string; label: string }> = {
  infrastructure: { color: '#F59E0B', icon: 'construct', label: 'Infrastructure' },
  welfare: { color: '#EC4899', icon: 'heart', label: 'Welfare' },
  education: { color: '#8B5CF6', icon: 'school', label: 'Education' },
  healthcare: { color: '#EF4444', icon: 'medkit', label: 'Healthcare' },
  economy: { color: '#10B981', icon: 'cash', label: 'Economy' },
  governance: { color: '#3B82F6', icon: 'shield-checkmark', label: 'Governance' },
  agriculture: { color: '#84CC16', icon: 'leaf', label: 'Agriculture' },
  environment: { color: '#06B6D4', icon: 'earth', label: 'Environment' },
  law_order: { color: '#F97316', icon: 'shield', label: 'Law & Order' },
  social_justice: { color: '#A855F7', icon: 'people', label: 'Social Justice' },
};

export const PROMISE_SOURCE_CONFIG: Record<PromiseSource, { label: string; icon: string }> = {
  manifesto: { label: 'Party Manifesto', icon: 'document-text' },
  campaign_speech: { label: 'Campaign Speech', icon: 'mic' },
  official_announcement: { label: 'Official Announcement', icon: 'megaphone' },
  budget: { label: 'Budget Speech', icon: 'cash' },
  press_conference: { label: 'Press Conference', icon: 'videocam' },
};

// ─── UTILITY FUNCTIONS ───

/** Compute Promise Delivery Index score */
export function computePDI(promises: ElectionPromise[]): number {
  if (promises.length === 0) return 0;

  let score = 0;
  for (const p of promises) {
    switch (p.status) {
      case 'delivered':
        score += 100;
        break;
      case 'partially_delivered':
        score += p.deliveryPercentage;
        break;
      case 'in_progress':
        score += p.deliveryPercentage * 0.5;
        break;
      case 'modified':
        score += 30;
        break;
      case 'broken':
        score += 0;
        break;
      case 'stalled':
        score += 10;
        break;
      case 'promised':
        score += 0;
        break;
    }
  }
  return Math.round(score / promises.length);
}

/** Build a Government Report Card from promises */
export function buildReportCard(
  promises: ElectionPromise[],
  stateCode: string,
  party: string,
  electionYear: number,
): GovernmentReportCardData {
  const statusBreakdown = {} as Record<PromiseStatus, number>;
  const categoryBreakdown = {} as Record<PromiseCategory, number>;
  const statuses: PromiseStatus[] = ['promised', 'in_progress', 'partially_delivered', 'delivered', 'broken', 'modified', 'stalled'];
  const categories: PromiseCategory[] = ['infrastructure', 'welfare', 'education', 'healthcare', 'economy', 'governance', 'agriculture', 'environment', 'law_order', 'social_justice'];

  for (const s of statuses) statusBreakdown[s] = 0;
  for (const c of categories) categoryBreakdown[c] = 0;

  for (const p of promises) {
    statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;
    categoryBreakdown[p.category] = (categoryBreakdown[p.category] ?? 0) + 1;
  }

  const avgDelivery = promises.length > 0
    ? Math.round(promises.reduce((s, p) => s + p.deliveryPercentage, 0) / promises.length)
    : 0;

  return {
    stateCode,
    party,
    electionYear,
    totalPromises: promises.length,
    statusBreakdown,
    categoryBreakdown,
    pdi: computePDI(promises),
    averageDeliveryPercent: avgDelivery,
    topDelivered: promises.filter((p) => p.status === 'delivered').slice(0, 5),
    topBroken: promises.filter((p) => p.status === 'broken').slice(0, 5),
  };
}
