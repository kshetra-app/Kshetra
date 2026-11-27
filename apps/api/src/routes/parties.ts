import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { supabase } from '../lib/supabase';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { sendApiError } from '../lib/replyHelper';

const root = '/api/v1/parties';
const partyId = { type: 'string', pattern: '^ORG-PARTY-[A-Z0-9_-]+$', maxLength: 100 };
const uuid = { type: 'string', format: 'uuid' };
const partyParam = { type: 'object', required: ['id'], properties: { id: partyId } };
const teamRoles = ['editor', 'approver', 'publisher', 'moderator'];
const reviewRoles = new Set(['admin', 'super_admin', 'compliance_officer']);
const claimFields =
  'id,organization_id,claimant_id,evidence_url,authority_summary,status,review_note,reviewed_at,created_at';

function findContributorStatus(userId: string) {
  return supabase.from('creator_kyc_records').select('status').eq('user_id', userId).maybeSingle();
}

function dbError(
  reply: FastifyReply,
  request: FastifyRequest,
  error: { code?: string; message: string },
) {
  const status =
    { '42501': 403, '23505': 409, '23514': 422, '22023': 422, P0002: 404 }[error.code ?? ''] ?? 503;
  if (status === 503) request.log.error({ code: error.code }, 'Party database operation failed');
  return sendApiError(
    reply,
    request,
    status,
    'PARTY_OPERATION_FAILED',
    status === 503
      ? 'Party information is temporarily unavailable. Please try again.'
      : error.message,
  );
}

async function lookupParty(id: string) {
  return supabase
    .from('political_organizations')
    .select(
      'id,name,short_name,symbol_url,page_id,profile_evidence,provenance_records(metadata),organization_multilingual_names(language_code,name_value,valid_from,valid_to)',
    )
    .eq('id', id)
    .eq('org_type', 'political_party')
    .not('provenance_id', 'is', null)
    .order('is_preferred', { referencedTable: 'organization_multilingual_names', ascending: false })
    .order('is_official', { referencedTable: 'organization_multilingual_names', ascending: false })
    .order('name_value', { referencedTable: 'organization_multilingual_names' })
    .maybeSingle();
}

export const partyRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { q?: string; language?: string; offset?: number } }>(
    root,
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', maxLength: 100 },
            language: { type: 'string', pattern: '^[a-z]{2,3}$' },
            offset: { type: 'integer', minimum: 0, maximum: 10000 },
          },
        },
      },
    },
    async (request, reply) => {
      const { q = '', language = 'en', offset = 0 } = request.query;
      const { data, error } = await supabase.rpc('search_party_registry', {
        p_query: q,
        p_language: language,
        p_offset: offset,
      });
      if (error) return dbError(reply, request, error);
      return { parties: data.slice(0, 30), nextOffset: data.length > 30 ? offset + 30 : null };
    },
  );

  app.get<{ Params: { id: string } }>(
    root + '/:id',
    { schema: { params: partyParam } },
    async (request, reply) => {
      const { data, error } = await lookupParty(request.params.id);
      if (error) return dbError(reply, request, error);
      if (!data) return sendApiError(reply, request, 404, 'PARTY_NOT_FOUND', 'Party not found.');
      const {
        page_id: linkedPage,
        profile_evidence: profileEvidence,
        provenance_records: provenance,
        organization_multilingual_names: names,
        ...party
      } = data;
      const { data: verification, error: claimError } = linkedPage
        ? await supabase
            .from('party_page_claims')
            .select('reviewed_at')
            .eq('organization_id', party.id)
            .eq('status', 'approved')
            .maybeSingle()
        : { data: null, error: null };
      if (claimError) return dbError(reply, request, claimError);
      let sourceUrl =
        (provenance as { metadata?: { sourceUrl?: string } } | null)?.metadata?.sourceUrl ?? null;
      if (!sourceUrl) {
        const { data: citation, error: citationError } = await supabase
          .from('organization_aliases')
          .select('source_url')
          .eq('organization_id', party.id)
          .eq('confidence', 'VERIFIED')
          .not('source_url', 'is', null)
          .order('valid_from', { ascending: false })
          .order('source_url')
          .limit(1)
          .maybeSingle();
        if (citationError)
          request.log.warn({ code: citationError.code }, 'Party citation lookup unavailable');
        sourceUrl = citation?.source_url ?? null;
      }
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...party,
        page_id: verification ? linkedPage : null,
        verifiedAt: verification?.reviewed_at ?? null,
        sourceUrl,
        profileEvidence: profileEvidence ?? [],
        names: names
          .filter((name) => name.valid_from <= today && (!name.valid_to || name.valid_to >= today))
          .map(({ language_code, name_value }) => ({ language_code, name_value })),
      };
    },
  );

  app.get(root + '/me', async (request, reply) => {
    const actor = await resolveAuthenticatedUser(request, reply);
    if (!actor) return;
    reply.header('Cache-Control', 'private, no-store');
    const [declaration, claims, contributor] = await Promise.all([
      supabase
        .from('user_party_declarations')
        .select('organization_id,is_public')
        .eq('user_id', actor.userId)
        .maybeSingle(),
      supabase
        .from('party_page_claims')
        .select('id,organization_id,status,reviewed_at')
        .eq('claimant_id', actor.userId)
        .order('created_at', { ascending: false }),
      findContributorStatus(actor.userId),
    ]);
    if (declaration.error) return dbError(reply, request, declaration.error);
    if (claims.error) return dbError(reply, request, claims.error);
    if (contributor.error) return dbError(reply, request, contributor.error);
    return {
      accountId: actor.userId,
      canReviewClaims: reviewRoles.has(actor.role),
      contributorStatus: contributor.data?.status ?? null,
      declaration: declaration.data,
      claims: claims.data,
    };
  });

  app.get<{ Params: { id: string } }>(
    root + '/:id/publishing-access',
    { schema: { params: partyParam } },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      const party = await lookupParty(request.params.id);
      if (party.error) return dbError(reply, request, party.error);
      if (!party.data?.page_id) return { canPublish: false };
      const { data, error } = await supabase.rpc('can_publish_for_party_page', {
        p_page: party.data.page_id,
        p_actor: actor.userId,
      });
      if (error) return dbError(reply, request, error);
      return reply.header('Cache-Control', 'private, no-store').send({ canPublish: data === true });
    },
  );

  app.put<{ Body: { partyId: string; public: boolean } }>(
    root + '/me/declaration',
    {
      schema: {
        body: {
          type: 'object',
          required: ['partyId', 'public'],
          properties: { partyId, public: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      const party = await lookupParty(request.body.partyId);
      if (party.error) return dbError(reply, request, party.error);
      if (!party.data)
        return sendApiError(reply, request, 404, 'PARTY_NOT_FOUND', 'Party not found.');
      const { data, error } = await supabase
        .from('user_party_declarations')
        .upsert(
          {
            user_id: actor.userId,
            organization_id: request.body.partyId,
            is_public: request.body.public,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('organization_id,is_public')
        .single();
      if (error) return dbError(reply, request, error);
      return { declaration: data };
    },
  );

  app.delete(root + '/me/declaration', async (request, reply) => {
    const actor = await resolveAuthenticatedUser(request, reply);
    if (!actor) return;
    const { error } = await supabase
      .from('user_party_declarations')
      .delete()
      .eq('user_id', actor.userId);
    if (error) return dbError(reply, request, error);
    return { declaration: null };
  });

  app.get<{ Params: { userId: string } }>(
    root + '/public-declarations/:userId',
    { schema: { params: { type: 'object', properties: { userId: uuid }, required: ['userId'] } } },
    async (request, reply) => {
      const { data, error } = await supabase
        .from('user_party_declarations')
        .select('organization_id,political_organizations(name,short_name)')
        .eq('user_id', request.params.userId)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return dbError(reply, request, error);
      return reply.header('Cache-Control', 'no-store').send({ declaration: data });
    },
  );

  app.post<{ Params: { id: string }; Body: { evidenceUrl: string; summary: string } }>(
    root + '/:id/claims',
    {
      schema: {
        params: partyParam,
        body: {
          type: 'object',
          required: ['evidenceUrl', 'summary'],
          properties: {
            evidenceUrl: { type: 'string', maxLength: 2000 },
            summary: { type: 'string', minLength: 20, maxLength: 1200 },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      const { evidenceUrl, summary } = request.body;
      const url = URL.canParse(evidenceUrl.trim()) ? new URL(evidenceUrl.trim()) : null;
      if (
        url?.protocol !== 'https:' ||
        url.username ||
        url.password ||
        summary.trim().length < 20
      ) {
        return sendApiError(
          reply,
          request,
          422,
          'EVIDENCE_REQUIRED',
          'Provide an HTTPS evidence link and describe your authority to represent the party.',
        );
      }
      const party = await lookupParty(request.params.id);
      if (party.error) return dbError(reply, request, party.error);
      if (!party.data)
        return sendApiError(reply, request, 404, 'PARTY_NOT_FOUND', 'Party not found.');
      const contributor = await findContributorStatus(actor.userId);
      if (contributor.error) return dbError(reply, request, contributor.error);
      if (contributor.data?.status !== 'verified') {
        return sendApiError(
          reply,
          request,
          403,
          'CONTRIBUTOR_VERIFICATION_REQUIRED',
          'Complete contributor verification before applying for official Page access.',
        );
      }
      const { data, error } = await supabase
        .from('party_page_claims')
        .insert({
          organization_id: party.data.id,
          claimant_id: actor.userId,
          evidence_url: url.href,
          authority_summary: summary.trim(),
        })
        .select('id,status')
        .single();
      if (error) return dbError(reply, request, error);
      return reply.code(201).send(data);
    },
  );

  app.get<{ Querystring: { offset?: number } }>(
    root + '/admin/claims',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: { offset: { type: 'integer', minimum: 0, maximum: 10000 } },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      if (!reviewRoles.has(actor.role))
        return sendApiError(
          reply,
          request,
          403,
          'FORBIDDEN',
          'Party verification permission required.',
        );
      const offset = request.query.offset ?? 0;
      const { data, error } = await supabase
        .from('party_page_claims')
        .select(claimFields + ',political_organizations(name)')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .order('id')
        .range(offset, offset + 30);
      if (error) return dbError(reply, request, error);
      return reply.header('Cache-Control', 'private, no-store').send({
        claims: data.slice(0, 30),
        nextOffset: data.length > 30 ? offset + 30 : null,
      });
    },
  );

  app.post<{ Params: { claimId: string }; Body: { decision: string; note: string } }>(
    root + '/admin/claims/:claimId',
    {
      schema: {
        params: { type: 'object', required: ['claimId'], properties: { claimId: uuid } },
        body: {
          type: 'object',
          required: ['decision', 'note'],
          properties: {
            decision: { type: 'string', enum: ['approved', 'rejected', 'revoked'] },
            note: { type: 'string', minLength: 20, maxLength: 1600 },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      if (!reviewRoles.has(actor.role))
        return sendApiError(
          reply,
          request,
          403,
          'FORBIDDEN',
          'Party verification permission required.',
        );
      const { data, error } = await supabase.rpc('review_party_page_claim', {
        p_claim: request.params.claimId,
        p_reviewer: actor.userId,
        p_decision: request.body.decision,
        p_note: request.body.note,
      });
      if (error) return dbError(reply, request, error);
      return { pageId: data };
    },
  );

  app.get<{ Params: { id: string } }>(
    root + '/:id/team',
    { schema: { params: partyParam } },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      const { data: claim, error } = await supabase
        .from('party_page_claims')
        .select('claimant_id,political_organizations!inner(page_id)')
        .eq('organization_id', request.params.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (error) return dbError(reply, request, error);
      if (!claim || claim.claimant_id !== actor.userId) {
        return sendApiError(
          reply,
          request,
          403,
          'FORBIDDEN',
          'Verified Page owner permission required.',
        );
      }
      const organization = claim.political_organizations as unknown as { page_id: string };
      const { data, error: teamError } = await supabase
        .from('party_page_team')
        .select('user_id,role')
        .eq('page_id', organization.page_id)
        .order('created_at');
      if (teamError) return dbError(reply, request, teamError);
      return reply.header('Cache-Control', 'private, no-store').send({ team: data });
    },
  );

  app.put<{ Params: { id: string; userId: string }; Body: { role: string | null } }>(
    root + '/:id/team/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: { id: partyId, userId: uuid },
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: { role: { enum: [...teamRoles, null] } },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveAuthenticatedUser(request, reply);
      if (!actor) return;
      const { error } = await supabase.rpc('set_party_page_team_role', {
        p_org: request.params.id,
        p_actor: actor.userId,
        p_member: request.params.userId,
        p_role: request.body.role,
      });
      if (error) return dbError(reply, request, error);
      return { success: true };
    },
  );
};
