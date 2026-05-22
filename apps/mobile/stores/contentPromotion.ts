import { create } from 'zustand';
import type {
  ContentVisibility,
  ContentVouch,
  ContentFlag,
  ContentAlert,
  PromotionDecision,
  ConstituencyModerator,
  PromotableContentType,
  RiskTier,
  VisibilityLevel,
  ReviewStatus,
  FlagReason,
  AlertCategory,
} from '../lib/contentPromotionTypes';
import {
  getRiskTier,
  getReviewParameters,
  calculateVouchWeight,
  calculateFlagWeight,
  checkPromotionEligibility,
  shouldAutoRestrict,
  RISK_TIER_CONFIG,
} from '../lib/contentPromotionTypes';

// ─── State Interface ────────────────────────────────────────────────────────

interface ContentPromotionState {
  // Content visibility records
  visibilityRecords: ContentVisibility[];
  vouches: ContentVouch[];
  flags: ContentFlag[];
  alerts: ContentAlert[];
  decisions: PromotionDecision[];
  moderators: ConstituencyModerator[];

  // Queries
  getVisibility: (contentType: PromotableContentType, contentId: string) => ContentVisibility | undefined;
  getVouchesForContent: (visibilityId: string) => ContentVouch[];
  getFlagsForContent: (visibilityId: string) => ContentFlag[];
  getAlertsForContent: (visibilityId: string) => ContentAlert[];
  hasUserVouched: (visibilityId: string, userId: string) => boolean;
  hasUserFlagged: (visibilityId: string, userId: string) => boolean;
  getModeratorQueue: (constituencyId?: string) => ContentVisibility[];
  getPromotableContent: () => ContentVisibility[];
  isModerator: (userId: string, constituencyId: string) => boolean;
  getContentVisibilityLevel: (contentType: PromotableContentType, contentId: string) => VisibilityLevel;

  // Actions
  registerContent: (params: {
    contentType: PromotableContentType;
    contentId: string;
    authorId: string;
    constituencyId: string | null;
    stateCode: string | null;
    postType?: string;
    authorRole: string;
    authorReputation: number;
    isAuthorVerified: boolean;
  }) => void;

  vouchContent: (params: {
    contentType: PromotableContentType;
    contentId: string;
    userId: string;
    userRole: string;
    userReputation: number;
  }) => void;

  flagContent: (params: {
    contentType: PromotableContentType;
    contentId: string;
    userId: string;
    userReputation: number;
    reason: FlagReason;
    description?: string;
  }) => void;

  alertContent: (params: {
    contentType: PromotableContentType;
    contentId: string;
    userId: string;
    severity: 'medium' | 'high' | 'critical';
    reason: string;
    category: AlertCategory;
  }) => void;

  // Moderator actions
  promoteContent: (visibilityId: string, moderatorId: string, targetLevel: VisibilityLevel) => void;
  restrictContent: (visibilityId: string, moderatorId: string, reason: string) => void;
  resolveFlag: (flagId: string, moderatorId: string, resolution: 'upheld' | 'dismissed' | 'partial') => void;
  acknowledgeAlert: (alertId: string, moderatorId: string, action: string) => void;

  // System actions
  runAutoPromotion: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useContentPromotionStore = create<ContentPromotionState>()((set, get) => ({
  visibilityRecords: [],
  vouches: [],
  flags: [],
  alerts: [],
  decisions: [],
  moderators: [],

  // ─── Queries ────────────────────────────────────────────────────────

  getVisibility: (contentType, contentId) => {
    return get().visibilityRecords.find(
      (r) => r.contentType === contentType && r.contentId === contentId,
    );
  },

  getVouchesForContent: (visibilityId) => {
    return get().vouches.filter((v) => v.contentVisibilityId === visibilityId);
  },

  getFlagsForContent: (visibilityId) => {
    return get().flags.filter((f) => f.contentVisibilityId === visibilityId);
  },

  getAlertsForContent: (visibilityId) => {
    return get().alerts.filter((a) => a.contentVisibilityId === visibilityId);
  },

  hasUserVouched: (visibilityId, userId) => {
    return get().vouches.some(
      (v) => v.contentVisibilityId === visibilityId && v.userId === userId,
    );
  },

  hasUserFlagged: (visibilityId, userId) => {
    return get().flags.some(
      (f) => f.contentVisibilityId === visibilityId && f.userId === userId,
    );
  },

  getModeratorQueue: (constituencyId) => {
    return get().visibilityRecords.filter((r) => {
      const isInQueue = r.reviewStatus === 'held' || r.reviewStatus === 'appealed' || r.alertCount > 0;
      if (constituencyId) return isInQueue && r.constituencyId === constituencyId;
      return isInQueue;
    });
  },

  getPromotableContent: () => {
    return get().visibilityRecords.filter((r) => {
      const eligibility = checkPromotionEligibility(r);
      return eligibility.eligible;
    });
  },

  isModerator: (userId, constituencyId) => {
    return get().moderators.some(
      (m) => m.userId === userId && m.constituencyId === constituencyId && m.isActive,
    );
  },

  getContentVisibilityLevel: (contentType, contentId) => {
    const record = get().visibilityRecords.find(
      (r) => r.contentType === contentType && r.contentId === contentId,
    );
    return record?.visibilityLevel ?? 'constituency';
  },

  // ─── Actions ────────────────────────────────────────────────────────

  registerContent: (params) => {
    const riskTier = getRiskTier(params.contentType, params.postType);
    const reviewParams = getReviewParameters(
      params.authorRole,
      params.authorReputation,
      params.isAuthorVerified,
      riskTier,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + reviewParams.reviewHours * 60 * 60 * 1000);

    // Low-risk content from trusted authors: skip pipeline
    if (riskTier === 'low' && reviewParams.reviewHours === 0) {
      return; // No visibility record needed, content is free
    }

    const record: ContentVisibility = {
      id: `cv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentType: params.contentType,
      contentId: params.contentId,
      authorId: params.authorId,
      constituencyId: params.constituencyId,
      stateCode: params.stateCode,
      riskTier,
      visibilityLevel: reviewParams.reviewHours === 0 ? 'state' : 'constituency',
      reviewStatus: reviewParams.reviewHours === 0 ? 'promoted' : 'open',
      vouchCount: 0,
      flagCount: 0,
      alertCount: 0,
      promotionScore: 0,
      vouchThreshold: reviewParams.vouchThreshold,
      flagThreshold: reviewParams.flagThreshold,
      reviewHours: reviewParams.reviewHours,
      reviewStartedAt: now.toISOString(),
      reviewExpiresAt: expiresAt.toISOString(),
      promotedAt: reviewParams.reviewHours === 0 ? now.toISOString() : null,
      restrictedAt: null,
      clearedAt: null,
      createdAt: now.toISOString(),
    };

    set((s) => ({ visibilityRecords: [...s.visibilityRecords, record] }));
  },

  vouchContent: (params) => {
    const record = get().visibilityRecords.find(
      (r) => r.contentType === params.contentType && r.contentId === params.contentId,
    );
    if (!record) return;

    // Check if already vouched
    if (get().hasUserVouched(record.id, params.userId)) return;

    const weight = calculateVouchWeight(params.userRole, params.userReputation);

    const vouch: ContentVouch = {
      id: `vouch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentVisibilityId: record.id,
      userId: params.userId,
      weight,
      userReputation: params.userReputation,
      userRole: params.userRole,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      vouches: [...s.vouches, vouch],
      visibilityRecords: s.visibilityRecords.map((r) =>
        r.id === record.id
          ? {
              ...r,
              vouchCount: r.vouchCount + 1,
              promotionScore: r.promotionScore + weight,
            }
          : r,
      ),
    }));

    // Check if auto-promotion criteria met
    const updated = get().visibilityRecords.find((r) => r.id === record.id);
    if (updated) {
      const eligibility = checkPromotionEligibility(updated);
      if (eligibility.eligible && eligibility.targetLevel) {
        get().promoteContent(record.id, 'system', eligibility.targetLevel);
      }
    }
  },

  flagContent: (params) => {
    const record = get().visibilityRecords.find(
      (r) => r.contentType === params.contentType && r.contentId === params.contentId,
    );
    if (!record) return;

    // Check if already flagged
    if (get().hasUserFlagged(record.id, params.userId)) return;

    const weight = calculateFlagWeight(params.userReputation);

    const flag: ContentFlag = {
      id: `flag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentVisibilityId: record.id,
      userId: params.userId,
      reason: params.reason,
      description: params.description ?? null,
      evidenceUrl: null,
      weight,
      userReputation: params.userReputation,
      resolved: false,
      resolvedBy: null,
      resolution: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      flags: [...s.flags, flag],
      visibilityRecords: s.visibilityRecords.map((r) =>
        r.id === record.id
          ? {
              ...r,
              flagCount: r.flagCount + 1,
              promotionScore: r.promotionScore - (weight * 2),
              // Auto-hold if threshold reached
              reviewStatus: (r.flagCount + 1) >= r.flagThreshold ? 'held' : r.reviewStatus,
            }
          : r,
      ),
    }));

    // Check if should auto-restrict
    const updated = get().visibilityRecords.find((r) => r.id === record.id);
    if (updated && shouldAutoRestrict(updated)) {
      get().restrictContent(record.id, 'system', 'Auto-restricted: too many flags');
    }
  },

  alertContent: (params) => {
    const record = get().visibilityRecords.find(
      (r) => r.contentType === params.contentType && r.contentId === params.contentId,
    );
    if (!record) return;

    const alert: ContentAlert = {
      id: `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentVisibilityId: record.id,
      userId: params.userId,
      severity: params.severity,
      reason: params.reason,
      category: params.category,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      actionTaken: null,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      alerts: [...s.alerts, alert],
      visibilityRecords: s.visibilityRecords.map((r) =>
        r.id === record.id
          ? {
              ...r,
              alertCount: r.alertCount + 1,
              reviewStatus: 'held' as ReviewStatus,
            }
          : r,
      ),
    }));
  },

  // ─── Moderator Actions ──────────────────────────────────────────────

  promoteContent: (visibilityId, moderatorId, targetLevel) => {
    const record = get().visibilityRecords.find((r) => r.id === visibilityId);
    if (!record) return;

    const decision: PromotionDecision = {
      id: `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentVisibilityId: visibilityId,
      decision: moderatorId === 'system' ? 'auto_promoted' : 'manually_promoted',
      decidedBy: moderatorId === 'system' ? 'system' : 'constituency_moderator',
      moderatorId: moderatorId === 'system' ? null : moderatorId,
      fromLevel: record.visibilityLevel,
      toLevel: targetLevel,
      reason: null,
      vouchCountAtDecision: record.vouchCount,
      flagCountAtDecision: record.flagCount,
      scoreAtDecision: record.promotionScore,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      decisions: [...s.decisions, decision],
      visibilityRecords: s.visibilityRecords.map((r) =>
        r.id === visibilityId
          ? {
              ...r,
              visibilityLevel: targetLevel,
              reviewStatus: 'promoted' as ReviewStatus,
              promotedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  restrictContent: (visibilityId, moderatorId, reason) => {
    const record = get().visibilityRecords.find((r) => r.id === visibilityId);
    if (!record) return;

    const decision: PromotionDecision = {
      id: `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      contentVisibilityId: visibilityId,
      decision: moderatorId === 'system' ? 'auto_restricted' : 'manually_restricted',
      decidedBy: moderatorId === 'system' ? 'system' : 'constituency_moderator',
      moderatorId: moderatorId === 'system' ? null : moderatorId,
      fromLevel: record.visibilityLevel,
      toLevel: 'restricted',
      reason,
      vouchCountAtDecision: record.vouchCount,
      flagCountAtDecision: record.flagCount,
      scoreAtDecision: record.promotionScore,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      decisions: [...s.decisions, decision],
      visibilityRecords: s.visibilityRecords.map((r) =>
        r.id === visibilityId
          ? {
              ...r,
              visibilityLevel: 'restricted' as VisibilityLevel,
              reviewStatus: 'restricted' as ReviewStatus,
              restrictedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  resolveFlag: (flagId, moderatorId, resolution) => {
    set((s) => ({
      flags: s.flags.map((f) =>
        f.id === flagId
          ? {
              ...f,
              resolved: true,
              resolvedBy: moderatorId,
              resolution,
              resolvedAt: new Date().toISOString(),
            }
          : f,
      ),
    }));
  },

  acknowledgeAlert: (alertId, moderatorId, action) => {
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              acknowledged: true,
              acknowledgedBy: moderatorId,
              acknowledgedAt: new Date().toISOString(),
              actionTaken: action,
            }
          : a,
      ),
    }));
  },

  // ─── System Auto-Promotion Check ───────────────────────────────────

  runAutoPromotion: () => {
    const { visibilityRecords } = get();
    const now = new Date().getTime();

    visibilityRecords.forEach((record) => {
      if (record.reviewStatus !== 'open') return;

      const expires = new Date(record.reviewExpiresAt).getTime();
      if (now < expires) return; // Review window still open

      const eligibility = checkPromotionEligibility(record);
      if (eligibility.eligible && eligibility.targetLevel) {
        get().promoteContent(record.id, 'system', eligibility.targetLevel);
      } else {
        // Review expired without promotion — mark as expired
        set((s) => ({
          visibilityRecords: s.visibilityRecords.map((r) =>
            r.id === record.id
              ? { ...r, reviewStatus: 'expired' as ReviewStatus }
              : r,
          ),
        }));
      }
    });
  },
}));
