import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { sendApiError } from '../lib/replyHelper';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  FacebookRequestRejected,
  findFacebookStagingPermalink,
  getFacebookStagingConfig,
  getFacebookVideoPublication,
  openFacebookToken,
  publishFacebookPageContent,
  type FacebookStagingConfig,
} from '../providers/facebookStagingProvider';

const publications = 'campaign_facebook_test_publications';
const fields =
  'id,client_request_id,message,media_type,publish_at,status,provider_post_id,permalink_url,published_at';
const queuedFields =
  'id,client_request_id,message,media_type,publish_at,status,provider_post_id,permalink_url,published_at,campaign_id,submitted_by,page_id,media_path,claimed_at';
const path = '/api/v1/campaign/campaigns/:campaignId/facebook/publications';
const maxScheduleMs = 30 * 24 * 60 * 60 * 1000;
const maxVideoProcessingMs = 24 * 60 * 60 * 1000;

type ContentType = 'image' | 'video';
type CampaignParams = { Params: { campaignId: string } };
type Submission = {
  requestId: string;
  message: string;
  publishAt?: string;
  attachment?: { path: string; type: ContentType };
};
type QueuedPublication = {
  id: string;
  client_request_id: string;
  campaign_id: string | null;
  submitted_by: string | null;
  page_id: string;
  media_type: ContentType | null;
  media_path: string | null;
  message: string;
  publish_at: string;
  claimed_at: string | null;
  provider_post_id: string | null;
};
type ResolveOwner = (
  request: FastifyRequest<CampaignParams>,
  reply: FastifyReply,
) => Promise<{ userId: string } | null>;
type CheckOwner = (campaignId: string, userId: string) => Promise<boolean>;

const campaignParams = {
  type: 'object',
  required: ['campaignId'],
  properties: { campaignId: { type: 'string', format: 'uuid' } },
};
const submissionBody = {
  type: 'object',
  additionalProperties: false,
  required: ['requestId', 'message'],
  properties: {
    requestId: { type: 'string', format: 'uuid' },
    message: { type: 'string', maxLength: 5000 },
    publishAt: { type: 'string', format: 'date-time' },
    attachment: {
      type: 'object',
      additionalProperties: false,
      required: ['path', 'type'],
      properties: {
        path: { type: 'string', maxLength: 140 },
        type: { type: 'string', enum: ['image', 'video'] },
      },
    },
  },
};
const mediaExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
} as const;
type MediaMime = keyof typeof mediaExtensions;

function configIfEnabled() {
  return isSupabaseConfigured && process.env.FACEBOOK_CAMPAIGN_PUBLISHING_ENABLED === 'true'
    ? getFacebookStagingConfig()
    : null;
}

function error(reply: FastifyReply, request: FastifyRequest, status: number, message: string) {
  return sendApiError(reply, request, status, 'FACEBOOK_PUBLICATION', message);
}

async function signAttachment(actorId: string, requestId: string, path: string, type: ContentType) {
  const name = path.slice(actorId.length + 1);
  if (
    !path.startsWith(actorId + '/') ||
    !Object.values(mediaExtensions).some((ext) => name === 'facebook-' + requestId + '.' + ext)
  )
    return null;
  const bucket = supabase.storage.from('post-media');
  const { data, error } = await bucket.info(path);
  if (error || !data) return null;
  const contentType = data.contentType;
  const allowed = type === 'image' ? ['image/jpeg', 'image/png'] : ['video/mp4'];
  const maxBytes = type === 'image' ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!allowed.some((mime) => mime === contentType) || !data.size || data.size > maxBytes)
    return null;
  const signed = await bucket.createSignedUrl(path, 15 * 60);
  return signed.error ? null : (signed.data?.signedUrl ?? null);
}

async function connectionFor(config: FacebookStagingConfig, campaignId: string) {
  const record = await supabase
    .from('campaign_facebook_connections')
    .select('page_id,sealed_page_token')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (record.error) throw new Error('Could not read Facebook connection.');
  return record.data?.page_id === config.pageId
    ? (record.data.sealed_page_token as string | null)
    : null;
}

async function updatePublication(id: string, status: string, changes: Record<string, unknown>) {
  const result = await supabase
    .from(publications)
    .update(changes)
    .eq('id', id)
    .eq('status', status);
  if (result.error) throw new Error('Could not persist Facebook publication state.');
}

async function publishOne(
  config: FacebookStagingConfig,
  row: QueuedPublication,
  isOwner: CheckOwner,
) {
  const now = new Date().toISOString();
  const claim = await supabase
    .from(publications)
    .update({ status: 'sending', claimed_at: now })
    .eq('id', row.id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle();
  if (claim.error) throw new Error('Could not claim Facebook publication.');
  if (!claim.data) return;

  let externalWriteStarted = false;
  try {
    if (
      !row.campaign_id ||
      !row.submitted_by ||
      row.page_id !== config.pageId ||
      !(await isOwner(row.campaign_id, row.submitted_by))
    ) {
      await updatePublication(row.id, 'sending', { status: 'rejected' });
      return;
    }
    const sealed = await connectionFor(config, row.campaign_id);
    const signedUrl =
      row.media_path && row.media_type
        ? await signAttachment(
            row.submitted_by,
            row.client_request_id,
            row.media_path,
            row.media_type,
          )
        : null;
    if (!sealed || (row.media_type && !signedUrl)) {
      await updatePublication(row.id, 'sending', { status: 'rejected' });
      return;
    }
    const token = openFacebookToken(config, row.campaign_id, sealed);
    externalWriteStarted = true;
    const providerPostId = await publishFacebookPageContent(config, token, {
      message: row.message,
      media: signedUrl && row.media_type ? { type: row.media_type, signedUrl } : undefined,
    });
    if (row.media_type === 'video') {
      await updatePublication(row.id, 'sending', {
        status: 'processing',
        provider_post_id: providerPostId,
        next_check_at: now,
      });
      return;
    }
    await updatePublication(row.id, 'sending', {
      status: 'published',
      provider_post_id: providerPostId,
      published_at: new Date().toISOString(),
    });
    const link = await findFacebookStagingPermalink(config, token, providerPostId);
    if (link) await updatePublication(row.id, 'published', { permalink_url: link });
  } catch (failure) {
    await updatePublication(row.id, 'sending', {
      status:
        externalWriteStarted && !(failure instanceof FacebookRequestRejected)
          ? 'verifying'
          : 'rejected',
    });
  }
}

async function checkVideo(config: FacebookStagingConfig, row: QueuedPublication) {
  if (
    !row.campaign_id ||
    !row.provider_post_id ||
    row.page_id !== config.pageId ||
    !row.claimed_at ||
    Date.now() - Date.parse(row.claimed_at) > maxVideoProcessingMs
  ) {
    await updatePublication(row.id, 'processing', { status: 'verifying', next_check_at: null });
    return;
  }
  try {
    const sealed = await connectionFor(config, row.campaign_id);
    if (sealed) {
      const token = openFacebookToken(config, row.campaign_id, sealed);
      const state = await getFacebookVideoPublication(config, token, row.provider_post_id);
      if (state === 'published') {
        const link = await findFacebookStagingPermalink(config, token, row.provider_post_id);
        await updatePublication(row.id, 'processing', {
          status: 'published',
          next_check_at: null,
          published_at: new Date().toISOString(),
          permalink_url: link,
        });
        return;
      }
      if (state === 'rejected') {
        await updatePublication(row.id, 'processing', {
          status: 'rejected',
          next_check_at: null,
          provider_post_id: null,
        });
        return;
      }
    }
  } catch {
    // Read-only provider failures can be checked again. Never resubmit a video upload.
  }
  await updatePublication(row.id, 'processing', {
    next_check_at: new Date(Date.now() + 30_000).toISOString(),
  });
}

export function registerCampaignFacebookPublications(
  app: FastifyInstance,
  resolveOwner: ResolveOwner,
  isOwner: CheckOwner,
) {
  app.get<CampaignParams>(path, { schema: { params: campaignParams } }, async (request, reply) => {
    if (!(await resolveOwner(request, reply))) return;
    if (!configIfEnabled()) return { available: false };
    const result = await supabase
      .from(publications)
      .select(fields)
      .eq('campaign_id', request.params.campaignId)
      .not('client_request_id', 'is', null)
      .order('requested_at', { ascending: false })
      .limit(30);
    if (result.error) return error(reply, request, 503, 'Could not load Facebook publications.');
    return { available: true, publications: result.data, requestId: randomUUID() };
  });

  app.post<CampaignParams & { Body: { requestId: string; contentType: MediaMime } }>(
    path + '/attachment',
    {
      schema: {
        params: campaignParams,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['requestId', 'contentType'],
          properties: {
            requestId: { type: 'string', format: 'uuid' },
            contentType: { type: 'string', enum: Object.keys(mediaExtensions) },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = await resolveOwner(request, reply);
      if (!actor) return;
      const config = configIfEnabled();
      if (!config)
        return error(reply, request, 503, 'Facebook campaign publishing is unavailable.');
      try {
        if (!(await connectionFor(config, request.params.campaignId))) {
          return error(reply, request, 409, 'Connect the Facebook Page first.');
        }
        const { requestId, contentType } = request.body;
        const key = actor.userId + '/facebook-' + requestId + '.' + mediaExtensions[contentType];
        const { data, error: failed } = await supabase.storage
          .from('post-media')
          .createSignedUploadUrl(key);
        if (failed || !data)
          return error(reply, request, 503, 'Could not prepare the attachment upload.');
        return { path: key, token: data.token };
      } catch {
        return error(reply, request, 503, 'Could not prepare the attachment upload.');
      }
    },
  );

  app.post<CampaignParams & { Body: Submission }>(
    path,
    { schema: { params: campaignParams, body: submissionBody } },
    async (request, reply) => {
      const actor = await resolveOwner(request, reply);
      if (!actor) return;
      const config = configIfEnabled();
      if (!config)
        return error(reply, request, 503, 'Facebook campaign publishing is unavailable.');
      const { campaignId } = request.params;
      const { requestId, attachment, publishAt } = request.body;
      const message = request.body.message.trim();
      if (!message && !attachment)
        return error(reply, request, 400, 'Write a message or attach media.');
      const already = await supabase
        .from(publications)
        .select(queuedFields)
        .eq('campaign_id', campaignId)
        .eq('client_request_id', requestId)
        .maybeSingle();
      if (already.error)
        return error(reply, request, 503, 'Could not check the publication request.');
      if (already.data) {
        if (
          already.data.message !== message ||
          already.data.media_path !== (attachment?.path ?? null) ||
          already.data.media_type !== (attachment?.type ?? null) ||
          (publishAt && Date.parse(already.data.publish_at) !== Date.parse(publishAt))
        ) {
          return error(
            reply,
            request,
            409,
            'This request has already been used for another publication.',
          );
        }
        return { publicationId: already.data.id };
      }
      const when = publishAt ? Date.parse(publishAt) : Date.now();
      const now = Date.now();
      if (publishAt && (when <= now || when > now + maxScheduleMs)) {
        return error(reply, request, 400, 'Choose a future time within 30 days.');
      }
      try {
        if (!(await connectionFor(config, campaignId)))
          return error(reply, request, 409, 'Connect the Facebook Page first.');
        if (
          attachment &&
          !(await signAttachment(actor.userId, requestId, attachment.path, attachment.type))
        ) {
          return error(
            reply,
            request,
            400,
            'Attach an uploaded JPEG, PNG, or MP4 from this account.',
          );
        }
        const created = await supabase
          .from(publications)
          .insert({
            campaign_id: campaignId,
            page_id: config.pageId,
            submitted_by: actor.userId,
            client_request_id: requestId,
            status: 'scheduled',
            message,
            publish_at: new Date(when).toISOString(),
            media_path: attachment?.path ?? null,
            media_type: attachment?.type ?? null,
          })
          .select('id')
          .single();
        if (created.error?.code === '23505') {
          return error(
            reply,
            request,
            409,
            'This publication request is already queued. Refresh the list.',
          );
        }
        if (created.error) return error(reply, request, 503, 'Could not save the publication.');
        return reply.code(202).send({ publicationId: created.data.id });
      } catch {
        return error(reply, request, 503, 'Could not check the Facebook Page or attachment.');
      }
    },
  );

  app.delete<CampaignParams & { Params: { campaignId: string; id: string } }>(
    path + '/:id',
    {
      schema: {
        params: {
          ...campaignParams,
          required: ['campaignId', 'id'],
          properties: { ...campaignParams.properties, id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      if (!(await resolveOwner(request, reply))) return;
      if (!configIfEnabled())
        return error(reply, request, 503, 'Facebook campaign publishing is unavailable.');
      const saved = await supabase
        .from(publications)
        .update({ status: 'cancelled' })
        .eq('campaign_id', request.params.campaignId)
        .eq('id', request.params.id)
        .eq('status', 'scheduled')
        .select('id')
        .maybeSingle();
      if (saved.error) return error(reply, request, 503, 'Could not cancel the publication.');
      if (!saved.data)
        return error(reply, request, 409, 'Only a queued publication can be cancelled.');
      return { cancelled: true };
    },
  );

  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  app.addHook('onReady', async () => {
    const config = configIfEnabled();
    if (!config) return;
    timer = setInterval(() => {
      if (running) return;
      running = (async () => {
        const now = new Date().toISOString();
        const stale = await supabase
          .from(publications)
          .update({ status: 'verifying' })
          .eq('status', 'sending')
          .lt('claimed_at', new Date(Date.now() - 2 * 60_000).toISOString());
        if (stale.error) throw new Error('Could not reconcile incomplete Facebook requests.');
        const [due, videos] = await Promise.all([
          supabase
            .from(publications)
            .select(queuedFields)
            .eq('status', 'scheduled')
            .lte('publish_at', now)
            .order('publish_at')
            .limit(4),
          supabase
            .from(publications)
            .select(queuedFields)
            .eq('status', 'processing')
            .lte('next_check_at', now)
            .order('next_check_at')
            .limit(4),
        ]);
        if (due.error || videos.error) throw new Error('Could not load due Facebook publications.');
        const worked = await Promise.allSettled([
          ...due.data.map((row) => publishOne(config, row as QueuedPublication, isOwner)),
          ...videos.data.map((row) => checkVideo(config, row as QueuedPublication)),
        ]);
        if (worked.some((result) => result.status === 'rejected'))
          throw new Error('A publication state update failed.');
      })()
        .catch(() => {
          app.log.warn('Facebook campaign publishing queue encountered an error');
        })
        .finally(() => {
          running = undefined;
        });
    }, 5000);
    timer.unref();
  });
  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer);
    await running;
  });
}
