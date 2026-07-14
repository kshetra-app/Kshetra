/**
 * Local-Body Representatives — Seed Registry (Telangana + Andhra Pradesh launch)
 * ═══════════════════════════════════════════════════════════════════════════
 * ZERO-FABRICATION POLICY
 * -----------------------------------------------------------------------------
 * This file holds ONLY representative records that have been verified against
 * an official / authoritative source (TSEC, APSEC, Lok Dhaba / data.opencity.in,
 * Wikipedia with citation, ECI/MyNeta affidavits). Every entry MUST carry a
 * real `sourceUrl` and `dataStatus: 'verified'`.
 *
 * DO NOT add synthesized/placeholder holders. Seats without a verified holder
 * are simply omitted here — the app renders an explicit "Data pending" state
 * for those (see apps/mobile/components/DataPendingCard.tsx).
 *
 * Populated in bulk by the ingestion pipeline:
 *   scrapers/local-body-scraper.js  →  scrapers/output/representatives/*.json
 *   scripts/import-local-body-reps.mjs  →  Supabase `representatives` table
 *
 * The arrays below are the curated, hand-verified subset that ships in-app
 * ahead of the full DB-backed ingestion.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { Representative } from '@kshetra/shared';
import { GENERATED_LOCAL_BODY_REPRESENTATIVES } from './local-body-representatives.generated';

/**
 * Verified Telangana local-body representatives.
 * Source cohort: 2020 GHMC / ULB + 2019 rural (terms expiring ~2026).
 * Add entries here only with a real, citable `sourceUrl`.
 */
export const TELANGANA_REPRESENTATIVES: Representative[] = [];

/**
 * Verified Andhra Pradesh local-body representatives.
 * Source cohort: 2021 panchayat / MPTC / ZPTC + urban.
 * NOTE: AP gram-panchayat polls are officially non-party — set
 * `partyOfficial: false` and treat any party as de-facto/unofficial.
 */
export const ANDHRA_PRADESH_REPRESENTATIVES: Representative[] = [];

/**
 * All shipped, verified local-body representatives.
 *
 * Hand-curated arrays first, then the bulk auto-generated set from the TSEC-KYR
 * scraper (see scripts/generate-local-body-seed.mjs). Generated ids are
 * collision-safe, so curated entries take precedence only if intentionally
 * given the same id.
 */
export const ALL_LOCAL_BODY_REPRESENTATIVES: Representative[] = [
  ...TELANGANA_REPRESENTATIVES,
  ...ANDHRA_PRADESH_REPRESENTATIVES,
  ...GENERATED_LOCAL_BODY_REPRESENTATIVES,
];
