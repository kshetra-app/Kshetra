import type { FastifyInstance } from 'fastify';
import type { Representative } from '@kshetra/shared';
import { z } from 'zod';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolveAuthenticatedUser } from '../lib/userAuth';

const state = z.enum(['AP', 'TS']);
const key = z.string().trim().min(1).max(240);
const querySchema = z.discriminatedUnion('view', [
  z.object({ view: z.literal('districts'), state }),
  z.object({ view: z.literal('mandals'), state, district: key }),
  z.object({ view: z.literal('panchayats'), state, district: key, mandal: key }),
  z.object({ view: z.literal('mptc'), state, district: key, mandal: key }),
  z.object({ view: z.literal('zptc'), state, district: key }),
  z.object({ view: z.literal('coverage'), state }),
  z.object({ view: z.literal('representative'), id: key }),
]);
const httpsUrl = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  });
const correctionFields = z.enum(['name', 'party', 'photoUrl', 'phone', 'email']);
const correctionSchema = z.object({
  representativeId: key,
  sourceUrl: httpsUrl,
  citation: z.string().trim().max(500).optional(),
  diff: z
    .partialRecord(
      correctionFields,
      z.object({
        from: z.string().max(2048).nullable(),
        to: z.string().max(2048).nullable(),
      }),
    )
    .refine(
      (diff) =>
        Object.keys(diff).length > 0 &&
        Object.values(diff).every((field) => field && field.from !== field.to),
    ),
  fingerprint: z.record(z.string(), z.unknown()).optional(),
});

interface Panchayat {
  key: string;
  district: string;
  mandal: string | null;
  gramPanchayat: string;
  sarpanch: Representative | null;
  wards: Representative[];
}

function groupPanchayats(rows: Array<Representative & { gpKey: string }>) {
  const groups = new Map<string, Panchayat>();
  for (const { gpKey, ...rep } of rows) {
    if (!rep.gramPanchayat || !rep.district) continue;
    const group = groups.get(gpKey) ?? {
      key: gpKey,
      district: rep.district,
      mandal: rep.mandal ?? null,
      gramPanchayat: rep.gramPanchayat,
      sarpanch: null,
      wards: [],
    };
    if (rep.officeType === 'sarpanch') group.sarpanch = rep;
    else group.wards.push(rep);
    groups.set(gpKey, group);
  }
  return [...groups.values()];
}

export async function localBodyRoutes(app: FastifyInstance) {
  app.post('/api/v1/local-bodies/corrections', { bodyLimit: 16_384 }, async (request, reply) => {
    const user = await resolveAuthenticatedUser(request, reply);
    if (!user) return;
    const parsed = correctionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Invalid correction',
        'Provide a correction and its HTTPS source.',
      );
    }
    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'Unavailable',
        'The correction queue is unavailable.',
      );
    }
    const { data: verification, error: verificationError } = await supabase
      .from('creator_kyc_records')
      .select('status')
      .eq('user_id', user.userId)
      .maybeSingle();
    if (verificationError) {
      return sendApiError(
        reply,
        request,
        503,
        'Unavailable',
        'Could not confirm your contributor status.',
      );
    }
    if (verification?.status !== 'verified') {
      return sendApiError(
        reply,
        request,
        403,
        'Verification required',
        'Complete contributor verification to submit a correction.',
      );
    }
    const { representativeId, sourceUrl, citation, diff, fingerprint } = parsed.data;
    const { data: rep, error: repError } = await supabase
      .from('representatives')
      .select('id,party_official')
      .eq('id', representativeId)
      .maybeSingle();
    if (repError)
      return sendApiError(
        reply,
        request,
        503,
        'Unavailable',
        'Could not find the representative record.',
      );
    if (!rep)
      return sendApiError(reply, request, 404, 'Not Found', 'Representative record unavailable.');
    if (
      (diff.party && !rep.party_official) ||
      (diff.photoUrl?.to && !httpsUrl.safeParse(diff.photoUrl.to).success)
    ) {
      return sendApiError(
        reply,
        request,
        400,
        'Invalid correction',
        'Check the party or portrait correction.',
      );
    }
    const { data, error } = await supabase
      .from('representative_edits')
      .insert({
        representative_id: rep.id,
        editor_user_id: user.userId,
        editor_kyc_verified: true,
        source_type: 'crowdsourced',
        source_url: sourceUrl,
        citation,
        diff,
        digital_fingerprint: fingerprint,
        moderation_status: 'pending',
      })
      .select('id')
      .single();
    if (error || !data) {
      request.log.error({ code: error?.code }, 'Representative correction could not be stored');
      return sendApiError(
        reply,
        request,
        503,
        'Unavailable',
        'Your correction could not be saved.',
      );
    }
    return reply.code(201).send({ success: true, id: data.id });
  });

  app.get('/api/v1/local-bodies', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Invalid local-body selection',
        'Select a supported directory entry.',
      );
    }

    const query = parsed.data;
    const { data, error } = await supabase.rpc('read_local_election_directory', {
      p_view: query.view,
      p_state: 'state' in query ? query.state : null,
      p_district: 'district' in query ? query.district : null,
      p_mandal: 'mandal' in query ? query.mandal : null,
      p_id: 'id' in query ? query.id : null,
    });
    if (error || data === null) {
      request.log.error({ code: error?.code }, 'Local election directory read failed');
      return sendApiError(
        reply,
        request,
        503,
        'Directory unavailable',
        'Local election results could not be loaded.',
      );
    }
    if (query.view === 'panchayats') return { data: groupPanchayats(data) };
    if (query.view === 'representative') return { data: data[0] ?? null };
    return { data };
  });
}
