import type { TriviaItem } from '../../../data/seed/telangana-trivia';
import { useTriviaHistoryStore } from '../stores/triviaHistory';

/**
 * Get a fresh set of trivia items, prioritizing unseen ones.
 * 
 * Algorithm:
 * 1. Separate items into "unseen" and "seen" pools
 * 2. If enough unseen items exist, pick randomly from unseen pool
 * 3. If unseen pool is exhausted, pick from the OLDEST-seen items (LRU)
 * 4. Mark selected items as seen
 * 
 * This ensures:
 * - First-time users see all unique trivia before any repeats
 * - Returning users see fresh content first
 * - When all trivia is exhausted, the oldest-seen items resurface (feels fresh)
 */
export function selectFreshTrivia(
  allItems: TriviaItem[],
  count: number,
): TriviaItem[] {
  const store = useTriviaHistoryStore.getState();
  const seenIds = store.getSeenIds();
  
  const unseen = allItems.filter((t) => !seenIds.has(t.id));
  const seen = allItems.filter((t) => seenIds.has(t.id));
  
  // Sort seen items by oldest-shown-first (LRU)
  seen.sort((a, b) => (store.seenIds[a.id] || 0) - (store.seenIds[b.id] || 0));
  
  // Build candidate pool: unseen first, then oldest-seen
  const pool = [...unseen, ...seen];
  
  // Shuffle the unseen portion only (to keep variety)
  const unseenCount = Math.min(unseen.length, pool.length);
  for (let i = unseenCount - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Pick `count` items
  const selected = pool.slice(0, Math.min(count, pool.length));
  
  // Mark as seen
  if (selected.length > 0) {
    store.markBatchSeen(selected.map((t) => t.id));
  }
  
  return selected;
}

/**
 * Get fresh trivia for a specific context (constituency, party, etc.)
 * Same algorithm as selectFreshTrivia but operates on filtered items.
 */
export function selectFreshTriviaForContext(
  allItems: TriviaItem[],
  count: number,
  filter: (item: TriviaItem) => boolean,
): TriviaItem[] {
  const filtered = allItems.filter(filter);
  return selectFreshTrivia(filtered, count);
}
