export type NewsGeographicScope = 'national' | 'state' | 'constituency';

export interface NewsGeography {
  scope: NewsGeographicScope;
  stateCode?: string;
  stateCodes?: readonly string[];
  constituencyId?: string;
}

/**
 * Apply the same explicit geography rules in every client and API route.
 * National feeds can contain state-specific stories, so they must not be
 * treated as relevant to every state's local feed.
 */
export function filterNewsByScope<T extends NewsGeography>(
  items: readonly T[],
  scope: NewsGeographicScope,
  stateCode?: string,
  constituencyId?: string,
): T[] {
  if (scope === 'national') return items.filter((item) => item.scope === 'national');

  const matchesState = (item: T) =>
    Boolean(stateCode) &&
    item.scope === 'state' &&
    (item.stateCode === stateCode || item.stateCodes?.includes(stateCode!) === true);
  if (scope === 'state') {
    return items.filter(matchesState);
  }

  return items.filter(
    (item) =>
      matchesState(item) ||
      (Boolean(constituencyId) &&
        item.scope === 'constituency' &&
        item.constituencyId === constituencyId),
  );
}
