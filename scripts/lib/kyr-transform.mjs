/**
 * Shared TSEC-KYR → representative transform
 * ═══════════════════════════════════════════════════════════════════════════
 * Single source of truth for turning the hardened scraper output
 *   scrapers/output/local-body/<STATE>-<YEAR>-<OFFICE>-kyr.json
 * into normalized representative records. Consumed by BOTH:
 *   • scripts/import-local-body-reps.mjs  (→ Supabase `representatives`)
 *   • scripts/build-seed-db.mjs           (→ bundled offline `seed-data.db`)
 * so the winners-only filter, jurisdiction-id scheme and party rules stay in
 * lock-step across the online and offline paths.
 *
 * ZERO-FABRICATION: only ELECTED candidates become representatives. Losers
 * (Result Status "--") are dropped — the scraper JSON retains them for audit.
 */

export const slug = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Gram-panchayat tier polls (sarpanch + GP ward member) are conducted on a
 * non-party basis in Telangana and Andhra Pradesh — ballots carry no party
 * symbol. MPTC/ZPTC polls ARE party-based. So GP-tier party affiliation is
 * de-facto only.
 */
export function isPartyOfficial(stateCode, officeType) {
  const gpTier = officeType === 'sarpanch' || officeType === 'gp_ward_member';
  if ((stateCode === 'AP' || stateCode === 'TS') && gpTier) return false;
  return true;
}

/**
 * Transform a parsed KYR dataset into normalized rep objects.
 * @param {{ stateCode?: string, year: number|string, sourceUrl?: string, records: any[] }} data
 * @returns {Array<object>} normalized reps (see fields below)
 */
export function buildRepsFromKYR(data) {
  const stateCode = data.stateCode || 'TS';
  const year = Number(data.year);
  const reps = [];
  const seen = new Map(); // base jurisdiction id → occurrences (disambiguate collisions)

  for (const r of data.records ?? []) {
    if (!r.name) continue;
    if (!r.elected) continue; // winners only

    const district = r.district ?? null;
    // The section label captured by the parser is the most reliable jurisdiction
    // name (GP for sarpanch/ward, territorial constituency for MPTC/ZPTC).
    const gpName = r.gram_panchayat || r.constituency || null;
    const gpKey = `${stateCode}-GP-${slug(district)}-${slug(r.mandal)}-${slug(gpName)}`;
    const mandalKey = `${stateCode}-MP-${slug(district)}-${slug(r.mandal)}`;
    const mptcName = r.constituency || r.mandal || null;

    let jurisdictionId;
    switch (r.office_type) {
      case 'sarpanch': jurisdictionId = gpKey; break;
      case 'gp_ward_member': jurisdictionId = `${gpKey}-W${r.ward_no ?? ''}`; break;
      case 'mptc_member': jurisdictionId = `${mandalKey}-MPTC-${slug(mptcName)}`; break;
      case 'zptc_member': jurisdictionId = `${stateCode}-ZP-${slug(district)}-ZPTC-${slug(r.constituency)}`; break;
      default: jurisdictionId = gpKey;
    }
    // The district-level Sarpanch report omits mandal, so two GPs of the same
    // name in different mandals share a base id. Append a deterministic suffix
    // (report order is stable) so no elected winner is silently overwritten.
    const n = seen.get(jurisdictionId) ?? 0;
    seen.set(jurisdictionId, n + 1);
    if (n > 0) jurisdictionId = `${jurisdictionId}-${n + 1}`;

    const gender = r.gender
      ? (/^f/i.test(r.gender) ? 'F' : /^m/i.test(r.gender) ? 'M' : null)
      : null;

    reps.push({
      id: `${stateCode}-REP-${r.office_type}-${jurisdictionId}-${year}`,
      officeType: r.office_type,
      jurisdictionType: r.jurisdiction_type,
      jurisdictionId,
      stateCode,
      district,
      mandal: r.mandal ?? null,
      gramPanchayat: r.office_type === 'sarpanch' || r.office_type === 'gp_ward_member' ? gpName : null,
      wardNo: r.office_type === 'gp_ward_member' && r.ward_no != null ? String(r.ward_no) : null,
      constituency: r.constituency ?? null,
      name: r.name,
      party: r.party ?? null,
      partyOfficial: isPartyOfficial(stateCode, r.office_type),
      gender,
      reservation: r.reservation ?? null,
      votes: r.votes ?? null,
      resultStatus: r.result_status ?? null,
      electionYear: year,
      sourceUrl: r.source_url || data.sourceUrl || null,
    });
  }

  // De-duplicate by id (last write wins — ids are already collision-safe).
  const byId = new Map();
  for (const rep of reps) byId.set(rep.id, rep);
  return [...byId.values()];
}
