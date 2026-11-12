import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('bill public opinion migration', () => {
  it('passes isolated PostgreSQL migration and security checks', () => {
    const repositoryRoot = path.resolve(__dirname, '../../../../');
    const verificationScript = path.join(
      repositoryRoot,
      'scripts',
      'verify_bill_opinion_migration.mjs',
    );
    const output = execFileSync(process.execPath, [verificationScript], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect(output).toContain(
      'PASS: migration repeatability, vote idempotency, counts, and role permissions',
    );
  }, 35_000);
});
