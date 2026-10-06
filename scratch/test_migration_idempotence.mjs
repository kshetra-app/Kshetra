import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('1. Creating test DB: test_idempotence');
try {
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS test_idempotence;"');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "CREATE DATABASE test_idempotence;"');

  console.log('2. Applying schema prerequisites into test_idempotence');
  const prereq = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TYPE public.data_status_enum AS ENUM ('OFFICIAL', 'PROVISIONAL', 'DEPRECATED');
    CREATE TABLE public.states (code TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE public.provenance_records (id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE public.political_organizations (
      id TEXT PRIMARY KEY,
      name TEXT,
      short_name TEXT,
      ec_party_code TEXT,
      recognition_level TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE public.organization_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      relationship_type TEXT
    );
  `;
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_idempotence', { input: prereq });

  const migSql = fs.readFileSync('supabase/migrations/064_political_organization_governance_remediation.sql', 'utf8');

  console.log('3. First execution of Migration 064');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_idempotence', { input: migSql });
  console.log('First execution: SUCCESS');

  // Dump schema after 1st execution
  const schema1 = execSync('docker exec -i supabase_db_Kshetra pg_dump -U postgres -d test_idempotence --schema-only --no-owner --no-comments', { encoding: 'utf8' });

  console.log('4. Second execution of Migration 064');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_idempotence', { input: migSql });
  console.log('Second execution: SUCCESS');

  // Dump schema after 2nd execution
  const schema2 = execSync('docker exec -i supabase_db_Kshetra pg_dump -U postgres -d test_idempotence --schema-only --no-owner --no-comments', { encoding: 'utf8' });

  const cleanSchema = (s) => s.replace(/\\(restrict|unrestrict)\s+[A-Za-z0-9]+\n?/g, '');
  const clean1 = cleanSchema(schema1);
  const clean2 = cleanSchema(schema2);

  fs.writeFileSync('scratch/dump1.sql', clean1);
  fs.writeFileSync('scratch/dump2.sql', clean2);

  if (clean1 === clean2) {
    console.log('PROVEN: Schema DDL after 1st and 2nd executions is 100% byte-for-byte identical!');
  } else {
    console.log('Diffing lines:');
    const lines1 = clean1.split('\n');
    const lines2 = clean2.split('\n');
    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
      if (lines1[i] !== lines2[i]) {
        console.log(`Line ${i}: \n  D1: ${lines1[i]}\n  D2: ${lines2[i]}`);
      }
    }
  }

} finally {
  console.log('5. Dropping test DB');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS test_idempotence;"');
}
