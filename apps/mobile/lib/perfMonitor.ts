/**
 * Performance Monitor — Lightweight perf tracking for dev builds.
 *
 * Tracks screen render times, computation durations, and cache hit rates.
 * Only logs in __DEV__ mode.
 */

interface PerfEntry {
  label: string;
  durationMs: number;
  timestamp: number;
}

const entries: PerfEntry[] = [];
const MAX_ENTRIES = 200;

/**
 * Start a timer. Returns a stop function that logs the duration.
 */
export function startTimer(label: string): () => number {
  const start = performance.now();
  return () => {
    const duration = Math.round((performance.now() - start) * 100) / 100;
    if (__DEV__) {
      const entry: PerfEntry = { label, durationMs: duration, timestamp: Date.now() };
      entries.push(entry);
      if (entries.length > MAX_ENTRIES) entries.shift();

      const emoji = duration < 16 ? '🟢' : duration < 50 ? '🟡' : '🔴';
      console.log(`${emoji} [PERF] ${label}: ${duration}ms`);
    }
    return duration;
  };
}

/**
 * Measure an async operation.
 */
export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const stop = startTimer(label);
  try {
    return await fn();
  } finally {
    stop();
  }
}

/**
 * Measure a sync computation.
 */
export function measureSync<T>(label: string, fn: () => T): T {
  const stop = startTimer(label);
  try {
    return fn();
  } finally {
    stop();
  }
}

/**
 * Get recent perf entries for debugging.
 */
export function getPerfEntries(): PerfEntry[] {
  return [...entries];
}

/**
 * Get summary stats.
 */
export function getPerfSummary(): {
  total: number;
  avgMs: number;
  slowest: PerfEntry | null;
  fastest: PerfEntry | null;
} {
  if (entries.length === 0) {
    return { total: 0, avgMs: 0, slowest: null, fastest: null };
  }
  const avg = entries.reduce((s, e) => s + e.durationMs, 0) / entries.length;
  const sorted = [...entries].sort((a, b) => b.durationMs - a.durationMs);
  return {
    total: entries.length,
    avgMs: Math.round(avg * 100) / 100,
    slowest: sorted[0],
    fastest: sorted[sorted.length - 1],
  };
}

/**
 * Clear all entries.
 */
export function clearPerfEntries(): void {
  entries.length = 0;
}
