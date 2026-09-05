import { useState, useEffect, useCallback } from 'react';

export interface PageEntitlement {
  pageId: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
  features: string[];
}

const DEFAULT_FREE_ENTITLEMENT: PageEntitlement = {
  pageId: '',
  isPro: false,
  plan: 'free',
  expiresAt: null,
  features: ['basic_profile', 'public_feed', 'community_endorsements'],
};

const PRO_FEATURES = [
  'basic_profile',
  'public_feed',
  'community_endorsements',
  'advanced_demographics',
  'ward_sentiment_heatmaps',
  'unlimited_surveys',
  'priority_feed_distribution',
  'ai_campaign_copy_unlimited',
];

/**
 * Mobile hook to check Page Pro entitlement without exposing in-app purchases.
 * App Store guideline compliant: No payment buttons or subscription checkout exists in mobile.
 */
export function usePageEntitlement(pageId?: string) {
  const [entitlement, setEntitlement] = useState<PageEntitlement>({
    ...DEFAULT_FREE_ENTITLEMENT,
    pageId: pageId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    setError(null);
    try {
      // In mobile, we check the production API or local fallback
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
      const res = await fetch(`${apiUrl}/api/v1/pages/${pageId}/entitlement`);
      if (res.ok) {
        const data = await res.json();
        setEntitlement({
          pageId,
          isPro: !!data.isPro,
          plan: data.plan || 'free',
          expiresAt: data.expiresAt || null,
          features: data.isPro ? PRO_FEATURES : DEFAULT_FREE_ENTITLEMENT.features,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to check entitlement');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  return {
    entitlement,
    isPro: entitlement.isPro,
    features: entitlement.features,
    hasFeature: (featureName: string) => entitlement.features.includes(featureName),
    loading,
    error,
    refetch: fetchEntitlement,
  };
}
