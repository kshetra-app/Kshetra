/**
 * Screen Resilience Contracts (JOB 073)
 *
 * Universal 5-state UX resilience standard across Poligram primary screens:
 * - loading: skeleton shimmer layout (mirrors target view geometry).
 * - empty: high-empathy Indian civic illustration with clear explanation and primary CTA.
 * - error: humanized message with technical correlation ID and recovery CTA.
 * - retry: interactive retry with cooldown timer preventing server thundering herds.
 * - offline: top amber banner indicating cached offline mode with persistent local actions.
 * - ready: standard operational content view.
 */

export type ScreenUIState = 'loading' | 'empty' | 'error' | 'retry' | 'offline' | 'ready';

export interface ScreenStateConfig {
  currentState: ScreenUIState;
  loadingMessageKey?: string;
  emptyTitleKey?: string;
  emptyDescriptionKey?: string;
  emptyActionLabelKey?: string;
  onEmptyAction?: () => void;
  errorMessage?: string;
  errorCode?: string;
  correlationId?: string;
  onRetry?: () => void | Promise<void>;
  retryCooldownSeconds?: number;
  isOfflineCached?: boolean;
}

export type SkeletonVariant =
  | 'feed'
  | 'issue-list'
  | 'issue-detail'
  | 'candidate-profile'
  | 'map-card'
  | 'shorts'
  | 'community-grid';

export interface SkeletonProps {
  variant: SkeletonVariant;
  count?: number;
}
