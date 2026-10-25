#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/072_w021_5_affidavit_truth_hardening.sql'), 'utf8');

test('Migration 072 executes and preserves explicit zeros while normalizing source-less defaults', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TYPE public.data_status_enum AS ENUM ('OFFICIAL','DERIVED','VERIFIED','ESTIMATE','SCENARIO','INFERRED','UNVERIFIED','UNKNOWN');
      CREATE TABLE public.constituencies (id TEXT PRIMARY KEY);
      CREATE TABLE public.provenance_records (id UUID PRIMARY KEY);
      INSERT INTO public.constituencies(id) VALUES ('TS-AC-001');
      INSERT INTO public.provenance_records(id) VALUES ('11111111-1111-4111-8111-111111111111');
      CREATE TABLE public.candidate_affidavit_disclosures (
        id UUID PRIMARY KEY,
        constituency_id TEXT NOT NULL,
        criminal_cases_count INTEGER NOT NULL DEFAULT 0 CHECK (criminal_cases_count >= 0),
        serious_ipc_count INTEGER NOT NULL DEFAULT 0 CHECK (serious_ipc_count >= 0),
        convictions_count INTEGER NOT NULL DEFAULT 0 CHECK (convictions_count >= 0),
        charges_framed_count INTEGER NOT NULL DEFAULT 0 CHECK (charges_framed_count >= 0),
        data_status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
        provenance_id UUID REFERENCES public.provenance_records(id),
        source_affidavit_url TEXT,
        source_eci_affidavit_id TEXT,
        source_hash TEXT
      );
      INSERT INTO public.candidate_affidavit_disclosures
        (id,constituency_id,criminal_cases_count,serious_ipc_count,convictions_count,charges_framed_count,data_status)
      VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TS-AC-001',0,0,0,0,'OFFICIAL'),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','TS-AC-001',0,0,0,0,'OFFICIAL'),
        ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','TS-AC-001',3,0,0,0,'OFFICIAL');
      UPDATE public.candidate_affidavit_disclosures
      SET provenance_id='11111111-1111-4111-8111-111111111111',
          source_affidavit_url='https://affidavit.eci.gov.in/example',
          source_hash=repeat('a',64)
      WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    `);

    await db.exec(migration);

    const rows = (await db.query(`
      SELECT id::text, criminal_cases_count, serious_ipc_count, convictions_count,
             charges_framed_count, data_status::text
      FROM public.candidate_affidavit_disclosures ORDER BY id
    `)).rows;

    assert.equal(rows[0].data_status, 'UNKNOWN');
    assert.equal(rows[0].criminal_cases_count, null);
    assert.equal(rows[0].serious_ipc_count, null);
    assert.equal(rows[1].data_status, 'OFFICIAL');
    assert.equal(rows[1].criminal_cases_count, 0, 'source-backed explicit zero must be preserved');
    assert.equal(rows[2].data_status, 'UNKNOWN');
    assert.equal(rows[2].criminal_cases_count, 3, 'nonzero source-less value is preserved but not certified');
    assert.equal(rows[2].serious_ipc_count, null);

    const columns = (await db.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='candidate_affidavit_disclosures'
        AND column_name IN ('criminal_cases_count','serious_ipc_count','convictions_count','charges_framed_count','data_status')
    `)).rows;
    for (const col of columns) {
      assert.equal(col.column_default, null, col.column_name + ' must have no default');
      if (col.column_name !== 'data_status') assert.equal(col.is_nullable, 'YES', col.column_name + ' must be nullable');
    }

    const fk = (await db.query(`
      SELECT confdeltype FROM pg_constraint
      WHERE conrelid='public.candidate_affidavit_disclosures'::regclass
        AND conname='fk_affidavit_disclosures_constituency'
    `)).rows;
    assert.equal(fk.length, 1);
    assert.equal(fk[0].confdeltype, 'r', 'constituency FK must use ON DELETE RESTRICT');

    await assert.rejects(
      db.exec(`
        INSERT INTO public.candidate_affidavit_disclosures
          (id,constituency_id,data_status)
        VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','NOT-A-REAL-AC','UNKNOWN')
      `),
      /fk_affidavit_disclosures_constituency|foreign key/i
    );

    await assert.rejects(
      db.exec(`
        INSERT INTO public.candidate_affidavit_disclosures
          (id,constituency_id,data_status)
        VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','TS-AC-001','OFFICIAL')
      `),
      /chk_affidavit_official_requires_source|check constraint/i
    );
  } finally {
    await db.close();
  }
});
