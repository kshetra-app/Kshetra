import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

type Kind = 'post' | 'short';
const kindParam = { type: 'string', enum: ['post', 'short'] };
interface SubmissionMedia {
  id: string;
  media_type: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

async function reviewMediaUrl(media: SubmissionMedia, owner: string): Promise<string | null> {
  if (media.media_type === 'link') {
    try {
      const url = new URL(media.url);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
  if (!['image', 'video'].includes(media.media_type)) return null;
  const [prefix, ...parts] = media.url.split('/');
  if (
    prefix !== owner ||
    !parts.length ||
    !parts.every((s) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(s))
  )
    return null;
  const { data, error } = await supabase.storage.from('post-media').createSignedUrl(media.url, 600);
  return error ? null : (data?.signedUrl ?? null);
}

const queuePath = '/api/v1/admin/content-submissions/:kind';

// Registered inside adminRoutes so its authenticated, server-managed role guard applies.
export async function registerContentReviewRoutes(app: FastifyInstance) {
  app.get<{ Params: { kind: Kind }; Querystring: { limit?: number; offset?: number } }>(
    queuePath,
    {
      schema: {
        params: { type: 'object', properties: { kind: kindParam } },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { limit = 20, offset = 0 } = request.query;
      if (!isSupabaseConfigured)
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'Review storage is unavailable.',
        );
      const posts = request.params.kind === 'post';
      const query = posts
        ? supabase
            .from('posts')
            .select(
              'id,author_id,type,content,state_code,constituency_id,created_at,updated_at,polls(question,poll_options(label,sort_order)),post_hashtags(hashtags(tag)),post_media(id,media_type,url,alt_text,sort_order)',
            )
            .eq('review_status', 'pending')
            .eq('is_deleted', false)
        : supabase
            .from('political_shorts')
            .select('id,uploaded_by,title,description,video_url,state_code,created_at,updated_at')
            .eq('status', 'pending');
      const { data, error } = await query
        .order('created_at')
        .order('id')
        .range(offset, offset + limit);
      if (error || !data) {
        request.log.error({ err: error?.message }, 'Content review queue unavailable');
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'The submission queue could not be loaded.',
        );
      }
      const page = data.slice(0, limit);
      const records = await Promise.all(
        page.map(async (item) => {
          if (!('author_id' in item)) return item;
          const media = (item.post_media ?? []) as SubmissionMedia[];
          return {
            ...item,
            post_media: await Promise.all(
              media.map(async (entry) => ({
                id: entry.id,
                media_type: entry.media_type,
                alt_text: entry.alt_text,
                sort_order: entry.sort_order,
                reviewUrl: await reviewMediaUrl(entry, item.author_id),
              })),
            ),
          };
        }),
      );
      return {
        success: true,
        data: { records, hasMore: data.length > limit },
      };
    },
  );

  app.post<{
    Params: { kind: Kind; id: string };
    Body: { decision: 'approved' | 'rejected'; expectedUpdatedAt: string };
  }>(
    queuePath + '/:id/review',
    {
      schema: {
        params: {
          type: 'object',
          properties: { kind: kindParam, id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['decision', 'expectedUpdatedAt'],
          additionalProperties: false,
          properties: {
            decision: { type: 'string', enum: ['approved', 'rejected'] },
            expectedUpdatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isSupabaseConfigured)
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'Review storage is unavailable.',
        );
      const rpc = request.params.kind === 'post' ? 'review_creator_post' : 'review_creator_short';
      const { data, error } = await supabase.rpc(rpc, {
        p_record_id: request.params.id,
        p_reviewer_user_id: request.adminActor!.id,
        p_decision: request.body.decision,
        p_expected_updated_at: request.body.expectedUpdatedAt,
      });
      if (error?.code === '42501')
        return sendApiError(
          reply,
          request,
          403,
          'FORBIDDEN',
          'A different reviewer must review this submission.',
        );
      if (error?.code === 'P0002')
        return sendApiError(
          reply,
          request,
          409,
          'REVIEW_CONFLICT',
          'This submission has changed or is incomplete. Refresh the queue.',
        );
      const result = Array.isArray(data) ? data[0] : data;
      const expectedStatus =
        request.params.kind === 'short' && request.body.decision === 'rejected'
          ? 'removed'
          : request.body.decision;
      if (error || result?.id !== request.params.id || result.status !== expectedStatus) {
        request.log.error({ err: error?.message }, 'Content review decision not confirmed');
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'The decision could not be confirmed.',
        );
      }
      return { success: true, data: { id: result.id, status: result.status } };
    },
  );
}
