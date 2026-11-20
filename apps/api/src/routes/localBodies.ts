import type { FastifyInstance } from 'fastify';
import type { Representative } from '@kshetra/shared';
import { z } from 'zod';
import { sendApiError } from '../lib/replyHelper';
import { supabase } from '../lib/supabase';

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
