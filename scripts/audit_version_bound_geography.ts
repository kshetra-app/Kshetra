import { Client } from 'pg';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is required for the nationwide PostGIS audit.');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<{ report: Record<string, any> }>(
      'SELECT public.fn_certify_current_geography_topology() AS report',
    );
    const report = result.rows[0]?.report;
    if (!report || typeof report.auditId !== 'string' || typeof report.certified !== 'boolean') {
      throw new Error('PostGIS returned an invalid topology audit report.');
    }
    const persisted = await client.query<{
      is_certified_100_percent: boolean;
      audit_report: Record<string, any>;
    }>(
      `SELECT is_certified_100_percent,audit_report
       FROM public.spatial_topology_certification_ledger WHERE id=$1`,
      [report.auditId],
    );
    if (
      persisted.rowCount !== 1 ||
      persisted.rows[0].is_certified_100_percent !== report.certified ||
      persisted.rows[0].audit_report?.auditId !== report.auditId
    ) {
      throw new Error('The topology audit report was not persisted atomically.');
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.certified) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
