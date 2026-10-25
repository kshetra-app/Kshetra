/**
 * CLI Runner: Delimitation Watch Engine (Job 023)
 *
 * Runs the Delimitation Watch pipeline against registered sources.
 *
 * Usage:
 *   npx tsx scripts/run-delimitation-watch.ts --source <sourceId> [--replay <snapshotId>]
 */

import {
  DelimitationWatchOrchestrator,
  InMemoryDelimitationWatchRepository,
  PostgresDelimitationWatchRepository,
  SourceRegistry,
} from '../apps/api/src/modules/delimitationWatch';

async function main() {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  const replayIndex = args.indexOf('--replay');

  const sourceId = sourceIndex !== -1 ? args[sourceIndex + 1] : undefined;
  const replaySnapshotId = replayIndex !== -1 ? args[replayIndex + 1] : undefined;

  console.log('[DelimitationWatch] Starting Delimitation Watch CLI...');

  // Use in-memory repo for standalone CLI or connect to Postgres if configured
  const repo = new InMemoryDelimitationWatchRepository();
  const orchestrator = new DelimitationWatchOrchestrator(repo);

  if (replaySnapshotId) {
    console.log(`[DelimitationWatch] Replaying snapshot '${replaySnapshotId}'...`);
    const result = await orchestrator.replaySnapshot(replaySnapshotId);
    console.log('[DelimitationWatch] Replay Complete:', JSON.stringify(result, null, 2));
    process.exit(result.outcome === 'FAILED' ? 1 : 0);
  }

  if (sourceId) {
    console.log(`[DelimitationWatch] Executing pipeline for source '${sourceId}'...`);
    const result = await orchestrator.runPipeline(sourceId);
    console.log('[DelimitationWatch] Run Complete:', JSON.stringify(result, null, 2));
    process.exit(result.outcome === 'FAILED' ? 1 : 0);
  }

  console.log('[DelimitationWatch] No source specified. Use --source <sourceId> or --replay <snapshotId>.');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[DelimitationWatch] Fatal CLI Error:', err);
    process.exit(1);
  });
}
