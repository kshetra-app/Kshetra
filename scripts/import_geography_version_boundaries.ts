import crypto from 'node:crypto';
import fs from 'node:fs';
import { Client } from 'pg';

type EntityType = 'STATE' | 'AC' | 'PC' | 'DISTRICT';
type GeoJsonFeature = {
  id?: string | number;
  geometry: Record<string, unknown> | null;
  properties?: Record<string, unknown> | null;
};

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--') || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw new Error(`Invalid argument near ${token}`);
    }
    result[token.slice(2)] = argv[i + 1];
    i += 1;
  }
  return result;
}

function usage(): string {
  return [
    'Usage: npx tsx scripts/import_geography_version_boundaries.ts',
    '  --type STATE|AC|PC|DISTRICT --dataset-version-id ID --geojson FILE --crosswalk FILE',
    '  [--feature-id-property PROPERTY] [--database-url-env DATABASE_URL]',
    'Crosswalk JSON must be an object mapping each exact source feature ID to one canonical code.',
  ].join('\n');
}

function readCrosswalk(filePath: string): Map<string, string> {
  const raw: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Crosswalk must be a JSON object keyed by exact source feature IDs.');
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (!entries.length) throw new Error('Crosswalk is empty.');
  const mapping = new Map<string, string>();
  const usedCanonicalCodes = new Set<string>();
  for (const [sourceFeatureId, canonicalCodeValue] of entries) {
    if (typeof canonicalCodeValue !== 'string' || !canonicalCodeValue.trim()) {
      throw new Error(`Crosswalk value for ${sourceFeatureId} must be a nonempty canonical code.`);
    }
    const canonicalCode = canonicalCodeValue.trim();
    if (usedCanonicalCodes.has(canonicalCode)) {
      throw new Error(
        `Crosswalk maps more than one source feature to canonical code ${canonicalCode}.`,
      );
    }
    usedCanonicalCodes.add(canonicalCode);
    mapping.set(sourceFeatureId, canonicalCode);
  }
  return mapping;
}

function sourceFeatureId(feature: GeoJsonFeature, propertyName: string): string {
  const value = feature.id ?? feature.properties?.[propertyName];
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Feature is missing a stable ID (GeoJSON id or properties.${propertyName}).`);
  }
  const id = String(value).trim();
  if (!id) throw new Error('Feature has an empty source feature ID.');
  return id;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const entityType = args.type as EntityType;
  const supportedTypes: EntityType[] = ['STATE', 'AC', 'PC', 'DISTRICT'];
  if (!supportedTypes.includes(entityType))
    throw new Error(`--type must be one of ${supportedTypes.join(', ')}.`);
  if (!args['dataset-version-id'] || !args.geojson || !args.crosswalk) throw new Error(usage());

  const databaseUrlEnv = args['database-url-env'] ?? 'DATABASE_URL';
  const connectionString = process.env[databaseUrlEnv];
  if (!connectionString)
    throw new Error(`Database connection environment variable ${databaseUrlEnv} is not set.`);

  const sourceBytes = fs.readFileSync(args.geojson);
  const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
  const parsed: unknown = JSON.parse(sourceBytes.toString('utf8'));
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('type' in parsed) ||
    parsed.type !== 'FeatureCollection'
  ) {
    throw new Error('Input must be a GeoJSON FeatureCollection.');
  }
  if (
    'crs' in parsed &&
    JSON.stringify(parsed.crs).match(/(?:EPSG(?::|::|\/|%3A)\s*)?(?!4326)\d{4,}/i)
  ) {
    throw new Error('Input declares a non-4326 CRS. Reproject it to WGS84 before import.');
  }
  const featuresValue = (parsed as { features?: unknown }).features;
  if (!Array.isArray(featuresValue) || featuresValue.length === 0)
    throw new Error('FeatureCollection has no features.');
  const crosswalk = readCrosswalk(args.crosswalk);
  const idProperty = args['feature-id-property'] ?? 'id';
  const sourceIds = new Set<string>();
  const canonicalCodes = new Set<string>();
  const features = featuresValue.map((value, index) => {
    if (!value || typeof value !== 'object' || !('geometry' in value)) {
      throw new Error(`Feature ${index + 1} is not a GeoJSON Feature.`);
    }
    const feature = value as GeoJsonFeature;
    const id = sourceFeatureId(feature, idProperty);
    const canonicalCode = crosswalk.get(id);
    if (!canonicalCode)
      throw new Error(`No exact canonical-code mapping exists for source feature ${id}.`);
    if (sourceIds.has(id)) throw new Error(`Duplicate source feature ID ${id}.`);
    if (canonicalCodes.has(canonicalCode))
      throw new Error(`Duplicate canonical code ${canonicalCode}.`);
    if (!feature.geometry || typeof feature.geometry !== 'object')
      throw new Error(`Feature ${id} has no geometry.`);
    sourceIds.add(id);
    canonicalCodes.add(canonicalCode);
    return { canonicalCode, sourceFeatureId: id, geometry: feature.geometry };
  });

  const unusedMappings = [...crosswalk.keys()].filter((id) => !sourceIds.has(id));
  if (unusedMappings.length)
    throw new Error(
      `Crosswalk has ${unusedMappings.length} source IDs absent from the source file.`,
    );

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const datasetResult = await client.query<{ checksum_sha256: string | null }>(
      'SELECT checksum_sha256 FROM public.dataset_versions WHERE id = $1',
      [args['dataset-version-id']],
    );
    if (datasetResult.rowCount !== 1) throw new Error('Registered dataset version was not found.');
    const registeredSha = datasetResult.rows[0].checksum_sha256?.toLowerCase();
    if (registeredSha !== sourceSha256) {
      throw new Error(
        `Source SHA-256 ${sourceSha256} does not match the registered dataset version checksum.`,
      );
    }
    const result = await client.query<{ report: Record<string, unknown> }>(
      'SELECT public.fn_load_current_geography_boundaries($1, $2, $3, $4::jsonb) AS report',
      [entityType, args['dataset-version-id'], sourceSha256, JSON.stringify(features)],
    );
    process.stdout.write(`${JSON.stringify(result.rows[0].report, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.stderr.write(`${usage()}\n`);
  process.exitCode = 1;
});
