/**
 * apps/api/src/services/politicalEntityService.ts
 *
 * Milestone W018 — Canonical Political Entity Service
 *
 * Implements authoritative operations across canonical political entities:
 * - Deterministic identity resolution & linkage management
 * - Multi-table search across canonical persons and political organizations
 * - Timeline aggregation (roles, tenures, candidacies, linkages)
 * - Office holding and current legislator rosters
 * - Regulated identity claim management (KYC/service_role bounded)
 */
import { supabase } from '../lib/supabase';
import type {
  CanonicalPerson,
  PoliticalOrganization,
  PersonRole,
  Candidacy,
  ElectedTenure,
  PersonIdentityLinkage,
  PoliticalCareerTimeline,
  IdentityMatchMethod,
} from '@kshetra/shared';

export interface SearchEntitiesOptions {
  q?: string;
  type?: 'person' | 'organization';
  state?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

export interface LegislatorRosterItem {
  tenure: ElectedTenure;
  person: CanonicalPerson;
  organization?: PoliticalOrganization | null;
}

function mapDbCanonicalPerson(row: any): CanonicalPerson {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    aliases: row.aliases || [],
    gender: row.gender ?? undefined,
    dob: row.dob ?? null,
    dobEstimated: Boolean(row.dob_estimated),
    photoUrl: row.photo_url ?? null,
    epicHash: row.epic_hash ?? null,
    eciCandidateId: row.eci_candidate_id ?? null,
    sansadMemberId: row.sansad_member_id ?? null,
    primaryUserId: row.primary_user_id ?? null,
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbPoliticalOrganization(row: any): PoliticalOrganization {
  return {
    id: row.id,
    orgType: row.org_type,
    name: row.name,
    shortName: row.short_name,
    ecPartyCode: row.ec_party_code ?? null,
    recognitionLevel: row.recognition_level ?? null,
    headquartersState: row.headquarters_state ?? null,
    symbolUrl: row.symbol_url ?? null,
    brandColors: row.brand_colors || {},
    pageId: row.page_id ?? null,
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbPersonRole(row: any): PersonRole {
  return {
    id: row.id,
    personId: row.person_id,
    roleType: row.role_type,
    organizationId: row.organization_id ?? null,
    validFrom: row.valid_from,
    validTo: row.valid_to ?? null,
    isCurrent: Boolean(row.is_current),
    roleMetadata: row.role_metadata || {},
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbCandidacy(row: any): Candidacy {
  return {
    id: row.id,
    personId: row.person_id,
    electionYear: Number(row.election_year),
    electionType: row.election_type,
    constituencyType: row.constituency_type,
    constituencyId: row.constituency_id,
    partyId: row.party_id ?? null,
    isIndependent: Boolean(row.is_independent),
    result: row.result,
    votesReceived: Number(row.votes_received || 0),
    voteShare: Number(row.vote_share || 0),
    rank: Number(row.rank || 0),
    affidavitId: row.affidavit_id ?? null,
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbElectedTenure(row: any): ElectedTenure {
  return {
    id: row.id,
    personId: row.person_id,
    officeType: row.office_type,
    jurisdictionType: row.jurisdiction_type,
    jurisdictionId: row.jurisdiction_id,
    constituencyVersionId: row.constituency_version_id ?? null,
    termStart: row.term_start,
    termEnd: row.term_end ?? null,
    isCurrent: Boolean(row.is_current),
    partyAtElection: row.party_at_election ?? null,
    currentParty: row.current_party ?? null,
    defectionDate: row.defection_date ?? null,
    candidacyId: row.candidacy_id ?? null,
    dataStatus: row.data_status,
    provenanceId: row.provenance_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbPersonIdentityLinkage(row: any): PersonIdentityLinkage {
  return {
    id: row.id,
    personId: row.person_id,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    matchMethod: row.match_method,
    confidence: Number(row.confidence),
    curatedBy: row.curated_by,
    curatedAt: row.curated_at,
    isActive: Boolean(row.is_active),
    provenanceId: row.provenance_id ?? null,
    createdAt: row.created_at,
  };
}

export class PoliticalEntityService {
  /**
   * Search canonical persons and/or political organizations with filters.
   */
  async searchEntities(options: SearchEntitiesOptions = {}): Promise<{
    persons: CanonicalPerson[];
    organizations: PoliticalOrganization[];
    total: number;
  }> {
    const { q, type, state, role, limit = 20, offset = 0 } = options;
    const boundedLimit = Math.min(Math.max(limit, 1), 100);
    const boundedOffset = Math.max(offset, 0);

    const resultPersons: CanonicalPerson[] = [];
    const resultOrgs: PoliticalOrganization[] = [];

    // Search persons if type is not strictly 'organization'
    if (type !== 'organization') {
      let personQuery = supabase.from('canonical_persons').select('*');

      if (q && q.trim()) {
        const queryTerm = `%${q.trim()}%`;
        personQuery = personQuery.or(`canonical_name.ilike.${queryTerm},aliases.cs.{${q.trim()}}`);
      }

      if (role) {
        // Find person IDs matching the specified role
        const { data: roleMatches } = await supabase
          .from('person_roles')
          .select('person_id')
          .eq('role_type', role)
          .eq('is_current', true);

        if (roleMatches && roleMatches.length > 0) {
          const personIds = Array.from(new Set(roleMatches.map((r) => r.person_id)));
          personQuery = personQuery.in('id', personIds);
        } else {
          // No person has this role
          personQuery = personQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
        }
      }

      personQuery = personQuery.range(boundedOffset, boundedOffset + boundedLimit - 1);
      const { data: persons, error: personError } = await personQuery;

      if (personError) {
        throw new Error(`PERSON_SEARCH_ERROR: ${personError.message}`);
      }

      if (persons) {
        resultPersons.push(...persons.map(mapDbCanonicalPerson));
      }
    }

    // Search organizations if type is not strictly 'person'
    if (type !== 'person') {
      let orgQuery = supabase.from('political_organizations').select('*');

      if (q && q.trim()) {
        const queryTerm = `%${q.trim()}%`;
        orgQuery = orgQuery.or(`name.ilike.${queryTerm},short_name.ilike.${queryTerm}`);
      }

      if (state) {
        orgQuery = orgQuery.eq('headquarters_state', state);
      }

      orgQuery = orgQuery.range(boundedOffset, boundedOffset + boundedLimit - 1);
      const { data: orgs, error: orgError } = await orgQuery;

      if (orgError) {
        throw new Error(`ORGANIZATION_SEARCH_ERROR: ${orgError.message}`);
      }

      if (orgs) {
        resultOrgs.push(...orgs.map(mapDbPoliticalOrganization));
      }
    }

    return {
      persons: resultPersons,
      organizations: resultOrgs,
      total: resultPersons.length + resultOrgs.length,
    };
  }

  /**
   * Get a canonical person by UUID.
   */
  async getPersonById(personId: string): Promise<CanonicalPerson> {
    const { data, error } = await supabase
      .from('canonical_persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    if (!data) {
      const err = new Error(`PERSON_NOT_FOUND: Canonical person with ID ${personId} does not exist.`);
      (err as any).statusCode = 404;
      (err as any).code = 'PERSON_NOT_FOUND';
      throw err;
    }

    return mapDbCanonicalPerson(data);
  }

  /**
   * Get a complete aggregated career timeline for a canonical person.
   */
  async getPersonCareerTimeline(personId: string): Promise<PoliticalCareerTimeline> {
    const person = await this.getPersonById(personId);

    const [rolesRes, tenuresRes, candidaciesRes, linkagesRes] = await Promise.all([
      supabase.from('person_roles').select('*').eq('person_id', personId).order('valid_from', { ascending: false }),
      supabase.from('elected_tenures').select('*').eq('person_id', personId).order('term_start', { ascending: false }),
      supabase.from('candidacies').select('*').eq('person_id', personId).order('election_year', { ascending: false }),
      supabase.from('person_identity_linkages').select('*').eq('person_id', personId).eq('is_active', true),
    ]);

    if (rolesRes.error) throw new Error(`TIMELINE_ROLES_ERROR: ${rolesRes.error.message}`);
    if (tenuresRes.error) throw new Error(`TIMELINE_TENURES_ERROR: ${tenuresRes.error.message}`);
    if (candidaciesRes.error) throw new Error(`TIMELINE_CANDIDACIES_ERROR: ${candidaciesRes.error.message}`);
    if (linkagesRes.error) throw new Error(`TIMELINE_LINKAGES_ERROR: ${linkagesRes.error.message}`);

    return {
      person,
      activeRoles: (rolesRes.data || []).map(mapDbPersonRole),
      tenures: (tenuresRes.data || []).map(mapDbElectedTenure),
      candidacies: (candidaciesRes.data || []).map(mapDbCandidacy),
      linkages: (linkagesRes.data || []).map(mapDbPersonIdentityLinkage),
    };
  }

  /**
   * Get a political organization by ID (e.g. 'ORG-PARTY-INC').
   */
  async getOrganizationById(orgId: string): Promise<PoliticalOrganization> {
    const { data, error } = await supabase
      .from('political_organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    if (!data) {
      const err = new Error(`ORGANIZATION_NOT_FOUND: Political organization ${orgId} does not exist.`);
      (err as any).statusCode = 404;
      (err as any).code = 'ORGANIZATION_NOT_FOUND';
      throw err;
    }

    return mapDbPoliticalOrganization(data);
  }

  /**
   * List currently elected legislators (MLAs, MPs) with office tenures.
   */
  async listCurrentLegislators(options: {
    state?: string;
    house?: 'assembly' | 'parliament';
    currentOnly?: boolean;
  } = {}): Promise<{ legislators: LegislatorRosterItem[]; total: number }> {
    const { state, house, currentOnly = true } = options;

    let query = supabase.from('elected_tenures').select('*');

    if (currentOnly) {
      query = query.eq('is_current', true);
    }

    if (house === 'assembly') {
      query = query.in('office_type', ['mla', 'mlc']);
    } else if (house === 'parliament') {
      query = query.in('office_type', ['mp_lok_sabha', 'mp_rajya_sabha']);
    }

    const { data: tenures, error: tenureErr } = await query;
    if (tenureErr) {
      throw new Error(`LEGISLATOR_QUERY_ERROR: ${tenureErr.message}`);
    }

    if (!tenures || tenures.length === 0) {
      return { legislators: [], total: 0 };
    }

    // Collect unique person IDs and party IDs
    const personIds = Array.from(new Set(tenures.map((t) => t.person_id)));
    const partyIds = Array.from(new Set(tenures.map((t) => t.current_party || t.party_at_election).filter(Boolean)));

    const [personsRes, orgsRes] = await Promise.all([
      supabase.from('canonical_persons').select('*').in('id', personIds),
      partyIds.length > 0 ? supabase.from('political_organizations').select('*').in('id', partyIds) : Promise.resolve({ data: [] }),
    ]);

    const personMap = new Map<string, CanonicalPerson>();
    for (const p of personsRes.data || []) {
      personMap.set(p.id, mapDbCanonicalPerson(p));
    }

    const orgMap = new Map<string, PoliticalOrganization>();
    for (const o of orgsRes.data || []) {
      orgMap.set(o.id, mapDbPoliticalOrganization(o));
    }

    const roster: LegislatorRosterItem[] = [];
    for (const t of tenures) {
      const person = personMap.get(t.person_id);
      if (!person) continue;

      const partyId = t.current_party || t.party_at_election;
      const organization = partyId ? orgMap.get(partyId) || null : null;

      // Optional state filter based on organization headquarters or jurisdiction prefix
      if (state) {
        const matchesState =
          (organization?.headquartersState && organization.headquartersState.toUpperCase() === state.toUpperCase()) ||
          t.jurisdiction_id.toUpperCase().startsWith(state.toUpperCase());
        if (!matchesState) continue;
      }

      roster.push({
        tenure: mapDbElectedTenure(t),
        person,
        organization,
      });
    }

    return { legislators: roster, total: roster.length };
  }

  /**
   * Submit or bind an identity claim connecting a mobile auth user to a canonical person.
   * Standard authenticated users get a 'pending_review' claim record.
   * Service role callers can directly bind the verified account.
   */
  async claimPersonIdentity(
    personId: string,
    userId: string,
    claimData: { verificationType: string; evidenceUrl?: string; notes?: string },
    isServiceRole: boolean
  ): Promise<{ status: 'approved' | 'pending_review'; personId: string; userId: string; message: string }> {
    const person = await this.getPersonById(personId);

    // If already bound to another user, conflict fail-closed
    if (person.primaryUserId && person.primaryUserId !== userId) {
      const err = new Error('IDENTITY_ALREADY_CLAIMED: This canonical person is already claimed by another account.');
      (err as any).statusCode = 409;
      (err as any).code = 'IDENTITY_ALREADY_CLAIMED';
      throw err;
    }

    if (isServiceRole) {
      // Direct binding authorized
      const { error } = await supabase
        .from('canonical_persons')
        .update({
          primary_user_id: userId,
          data_status: 'VERIFIED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', personId);

      if (error) {
        throw new Error(`CLAIM_BIND_ERROR: ${error.message}`);
      }

      return {
        status: 'approved',
        personId,
        userId,
        message: 'Identity claim verified and bound to canonical person.',
      };
    }

    // Standard user — fail-closed security boundary: queue for Trust & Safety review
    const pendingClaim = {
      userId,
      verificationType: claimData.verificationType,
      evidenceUrl: claimData.evidenceUrl ?? null,
      notes: claimData.notes ?? null,
      submittedAt: new Date().toISOString(),
      status: 'pending_review',
    };

    const currentMetadata = person.metadata || {};
    const existingClaims = Array.isArray((currentMetadata as any).pendingClaims)
      ? (currentMetadata as any).pendingClaims
      : [];

    const { error: updateErr } = await supabase
      .from('canonical_persons')
      .update({
        metadata: {
          ...currentMetadata,
          pendingClaims: [...existingClaims, pendingClaim],
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', personId);

    if (updateErr) {
      throw new Error(`CLAIM_SUBMISSION_ERROR: ${updateErr.message}`);
    }

    return {
      status: 'pending_review',
      personId,
      userId,
      message: 'Identity claim submitted. Trust & Safety review is required before verification is granted.',
    };
  }

  /**
   * Resolve an external or legacy record ID to its canonical person UUID.
   */
  async resolveCanonicalPerson(sourceSystem: string, sourceRecordId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('fn_resolve_canonical_person', {
      p_source_system: sourceSystem,
      p_source_record_id: sourceRecordId,
    });

    if (error) {
      // Fallback query if RPC fails in non-RPC test environments
      const { data: row } = await supabase
        .from('person_identity_linkages')
        .select('person_id')
        .eq('source_system', sourceSystem)
        .eq('source_record_id', sourceRecordId)
        .eq('is_active', true)
        .maybeSingle();

      return row?.person_id ?? null;
    }

    return data || null;
  }

  /**
   * Link an external record ID to a canonical person.
   */
  async linkPersonIdentity(params: {
    personId: string;
    sourceSystem: string;
    sourceRecordId: string;
    matchMethod: IdentityMatchMethod;
    confidence?: number;
    curatedBy?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('fn_link_person_identity', {
      p_person_id: params.personId,
      p_source_system: params.sourceSystem,
      p_source_record_id: params.sourceRecordId,
      p_match_method: params.matchMethod,
      p_confidence: params.confidence ?? 1.0,
      p_curated_by: params.curatedBy ?? 'system',
    });

    if (error) {
      // Fallback direct upsert
      const { data: upsertData, error: upsertErr } = await supabase
        .from('person_identity_linkages')
        .upsert(
          {
            person_id: params.personId,
            source_system: params.sourceSystem,
            source_record_id: params.sourceRecordId,
            match_method: params.matchMethod,
            confidence: params.confidence ?? 1.0,
            curated_by: params.curatedBy ?? 'system',
            is_active: true,
          },
          { onConflict: 'source_system,source_record_id' }
        )
        .select('id')
        .single();

      if (upsertErr) {
        throw new Error(`LINK_IDENTITY_ERROR: ${upsertErr.message}`);
      }

      return upsertData.id;
    }

    return data;
  }
}

export const politicalEntityService = new PoliticalEntityService();
