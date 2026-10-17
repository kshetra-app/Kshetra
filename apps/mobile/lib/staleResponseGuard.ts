/**
 * Stale Response Guard
 * Master Execution Framework — W021.5 / Directive 083
 *
 * Prevents out-of-order resolution of asynchronous requests from
 * overwriting newer selections when users rapidly change constituencies,
 * search queries, or profile views.
 */

export interface RequestToken<TKey = string> {
  seq: number;
  key: TKey;
  isStale: () => boolean;
}

export class SequenceGuard<TKey = string> {
  private currentSequence = 0;
  private currentKey: TKey | null = null;

  /**
   * Starts a new request for the given key and returns a token with `isStale()` checker.
   */
  startRequest(key: TKey): RequestToken<TKey> {
    this.currentSequence += 1;
    this.currentKey = key;
    const requestSeq = this.currentSequence;
    const requestKey = key;

    return {
      seq: requestSeq,
      key: requestKey,
      isStale: () => requestSeq !== this.currentSequence || this.currentKey !== requestKey,
    };
  }

  /**
   * Checks whether a sequence token is still the active/latest request.
   */
  isLatest(token: { seq: number; key: TKey }): boolean {
    return token.seq === this.currentSequence && token.key === this.currentKey;
  }

  /**
   * Resets active state, invalidating all in-flight requests.
   */
  reset(): void {
    this.currentSequence += 1;
    this.currentKey = null;
  }
}
