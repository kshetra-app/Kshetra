import type { FeedScope } from './feedTypes';

export function getFeedReadScope(scope: FeedScope, stateCode: string, constituencyId?: string) {
  return {
    stateCode: scope === 'national' ? 'IN' : stateCode,
    constituencyId: scope === 'constituency' && stateCode !== 'IN' ? constituencyId ?? null : null,
  };
}
