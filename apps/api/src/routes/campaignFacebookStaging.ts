import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  FACEBOOK_STAGING_CALLBACK,
  FACEBOOK_STAGING_MESSAGE,
  FacebookConnectionError,
  FacebookRequestRejected,
  connectFacebookStagingPage,
  facebookAuthorizationUrl,
  facebookLoginState,
  findFacebookStagingPermalink,
  getFacebookStagingConfig,
  hashFacebookLoginState,
  openFacebookToken,
  publishFacebookStagingTest,
  sealFacebookToken,
} from '../providers/facebookStagingProvider';

const path = '/api/v1/campaign/campaigns/:campaignId/facebook';
const campaignSchema = {
  params: {
    type: 'object',
    required: ['campaignId'],
    properties: { campaignId: { type: 'string', format: 'uuid' } },
  },
};
type CampaignParams = { Params: { campaignId: string } };
type OwnerCheck = (campaignId: string, userId: string) => Promise<boolean>;
const receiptFields = 'status,provider_post_id,permalink_url,requested_at,published_at';
const clearAuthorization = {
  oauth_state_hash: null,
  oauth_actor_id: null,
  oauth_expires_at: null,
  oauth_claimed_at: null,
};
const clearConnection = {
  page_id: null,
  page_name: null,
  sealed_page_token: null,
  connected_at: null,
};

function failure(reply: FastifyReply, request: FastifyRequest, status: number, message: string) {
  return sendApiError(reply, request, status, 'FACEBOOK_STAGING', message);
}

function browserResult(reply: FastifyReply, status: number, message: string) {
  return reply
    .header('Cache-Control', 'no-store')
    .header('Referrer-Policy', 'no-referrer')
    .type('text/plain; charset=utf-8')
    .code(status)
    .send(message + ' Return to Campaign Manager and refresh the Facebook tab.');
}

export function registerCampaignFacebookStaging(app: FastifyInstance, isOwner: OwnerCheck) {
  async function owner(request: FastifyRequest<CampaignParams>, reply: FastifyReply) {
    reply.header('Cache-Control', 'private, no-store');
    const actor = await resolveAuthenticatedUser(request, reply);
    if (!actor) return null;
    try {
      if (await isOwner(request.params.campaignId, actor.userId)) return actor;
      failure(
        reply,
        request,
        403,
        'The campaign owner can manage Facebook publishing for this campaign.',
      );
    } catch {
      failure(reply, request, 503, 'Campaign ownership could not be verified.');
    }
    return null;
  }

  app.get<CampaignParams>(path, { schema: campaignSchema }, async (request, reply) => {
    if (!(await owner(request, reply))) return;
    const config = getFacebookStagingConfig();
    if (!config || !isSupabaseConfigured) return { available: false };
    const { campaignId } = request.params;
    const [connection, receipt] = await Promise.all([
      supabase
        .from('campaign_facebook_connections')
        .select('page_id,page_name,connected_at')
        .eq('campaign_id', campaignId)
        .maybeSingle(),
      supabase
        .from('campaign_facebook_test_publications')
        .select(receiptFields)
        .eq('campaign_id', campaignId)
        .eq('page_id', config.pageId)
        .maybeSingle(),
    ]);
    if (connection.error || receipt.error) {
      return failure(reply, request, 503, 'Facebook publishing status could not be loaded.');
    }
    const page = connection.data?.page_id === config.pageId ? connection.data : null;
    const post = receipt.data;
    const stale = post?.status === 'sending' && Date.now() - Date.parse(post.requested_at) > 60_000;
    return {
      available: true,
      page,
      receipt: post && { ...post, status: stale ? 'verifying' : post.status },
      testMessage: FACEBOOK_STAGING_MESSAGE,
    };
  });

  app.post<CampaignParams>(
    path + '/connect',
    { schema: campaignSchema },
    async (request, reply) => {
      const actor = await owner(request, reply);
      if (!actor) return;
      const config = getFacebookStagingConfig();
      if (!config || !isSupabaseConfigured) {
        return failure(
          reply,
          request,
          503,
          'Facebook publishing has not been configured on Staging.',
        );
      }
      const state = facebookLoginState();
      const { error } = await supabase.from('campaign_facebook_connections').upsert(
        {
          campaign_id: request.params.campaignId,
          oauth_state_hash: hashFacebookLoginState(state),
          oauth_actor_id: actor.userId,
          oauth_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
          oauth_claimed_at: null,
        },
        { onConflict: 'campaign_id' },
      );
      if (error) return failure(reply, request, 503, 'Could not start Facebook authorization.');
      return { authorizationUrl: facebookAuthorizationUrl(config, state) };
    },
  );

  app.get<{ Querystring: { state?: string; code?: string } }>(
    FACEBOOK_STAGING_CALLBACK,
    { logLevel: 'silent' },
    async (request, reply) => {
      const config = getFacebookStagingConfig();
      const { state, code } = request.query;
      if (!config || !isSupabaseConfigured)
        return browserResult(reply, 503, 'Facebook setup is unavailable.');
      if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state)) {
        return browserResult(reply, 400, 'The authorization session expired.');
      }

      const stateHash = hashFacebookLoginState(state);
      let campaignId: string | undefined;
      let step = 'claim_authorization';
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('campaign_facebook_connections')
          .update({ oauth_claimed_at: now })
          .eq('oauth_state_hash', stateHash)
          .gt('oauth_expires_at', now)
          .is('oauth_claimed_at', null)
          .select('campaign_id,oauth_actor_id')
          .maybeSingle();
        if (error) throw error;
        if (!data)
          return browserResult(
            reply,
            400,
            'This authorization session expired or was already used.',
          );
        campaignId = data.campaign_id;
        if (!data.oauth_actor_id || !(await isOwner(data.campaign_id, data.oauth_actor_id))) {
          return browserResult(reply, 403, 'Campaign ownership could not be verified.');
        }
        if (typeof code !== 'string' || !code || code.length > 4096) {
          return browserResult(reply, 400, 'Facebook authorization was not completed.');
        }

        step = 'connect_page';
        const page = await connectFacebookStagingPage(config, code);
        step = 'save_connection';
        const saved = await supabase
          .from('campaign_facebook_connections')
          .update({
            ...clearAuthorization,
            page_id: config.pageId,
            page_name: page.name,
            sealed_page_token: sealFacebookToken(config, data.campaign_id, page.token),
            connected_at: new Date().toISOString(),
          })
          .eq('campaign_id', data.campaign_id)
          .eq('oauth_state_hash', stateHash)
          .select('campaign_id')
          .maybeSingle();
        if (saved.error) throw saved.error;
        if (!saved.data)
          return browserResult(reply, 409, 'This connection request was cancelled or replaced.');
        return browserResult(reply, 200, 'The Poligram Staging Facebook Page is connected.');
      } catch (error) {
        const failure = error instanceof FacebookConnectionError ? error : undefined;
        app.log.warn(
          {
            step: failure?.step ?? step,
            httpStatus: failure?.graphError?.httpStatus,
            graphCode: failure?.graphError?.graphCode,
            graphSubcode: failure?.graphError?.graphSubcode,
          },
          'Facebook Staging connection failed',
        );
        return browserResult(
          reply,
          422,
          'Could not authorize the configured Facebook Page. Check that you selected the test Page and granted publishing access.',
        );
      } finally {
        if (campaignId) {
          await supabase
            .from('campaign_facebook_connections')
            .update(clearAuthorization)
            .eq('campaign_id', campaignId)
            .eq('oauth_state_hash', stateHash);
        }
      }
    },
  );

  app.delete<CampaignParams>(
    path + '/connection',
    { schema: campaignSchema },
    async (request, reply) => {
      if (!(await owner(request, reply))) return;
      if (!getFacebookStagingConfig())
        return failure(reply, request, 503, 'Facebook setup is unavailable.');
      const { error } = await supabase
        .from('campaign_facebook_connections')
        .delete()
        .eq('campaign_id', request.params.campaignId);
      if (error) return failure(reply, request, 503, 'Could not disconnect the Facebook Page.');
      return { disconnected: true };
    },
  );

  app.post<CampaignParams>(
    path + '/test-post',
    { schema: campaignSchema },
    async (request, reply) => {
      const actor = await owner(request, reply);
      if (!actor) return;
      const config = getFacebookStagingConfig();
      if (!config || !isSupabaseConfigured)
        return failure(reply, request, 503, 'Facebook setup is unavailable.');
      const { campaignId } = request.params;
      const connection = await supabase
        .from('campaign_facebook_connections')
        .select('page_id,sealed_page_token')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (connection.error)
        return failure(reply, request, 503, 'Could not check the Facebook connection.');
      if (connection.data?.page_id !== config.pageId || !connection.data.sealed_page_token) {
        return failure(reply, request, 409, 'Connect the Poligram Staging Facebook Page first.');
      }

      const sealed = connection.data.sealed_page_token;
      let token;
      try {
        token = openFacebookToken(config, campaignId, sealed);
      } catch {
        return failure(reply, request, 409, 'Reconnect the Facebook Page before publishing.');
      }

      const now = new Date().toISOString();
      const attempt = await supabase.from('campaign_facebook_test_publications').insert({
        page_id: config.pageId,
        campaign_id: campaignId,
        submitted_by: actor.userId,
        status: 'sending',
        requested_at: now,
      });
      if (attempt.error?.code === '23505') {
        const existing = await supabase
          .from('campaign_facebook_test_publications')
          .select(receiptFields)
          .eq('page_id', config.pageId)
          .eq('campaign_id', campaignId)
          .maybeSingle();
        if (existing.error)
          return failure(reply, request, 503, 'Could not read the existing test receipt.');
        if (existing.data?.status === 'published') return { receipt: existing.data };
        if (existing.data?.status !== 'rejected') {
          return failure(
            reply,
            request,
            409,
            'A test publication already exists or is awaiting confirmation.',
          );
        }
        const retry = await supabase
          .from('campaign_facebook_test_publications')
          .update({ status: 'sending', submitted_by: actor.userId, requested_at: now })
          .eq('campaign_id', campaignId)
          .eq('page_id', config.pageId)
          .eq('status', 'rejected')
          .select('page_id')
          .maybeSingle();
        if (retry.error || !retry.data)
          return failure(reply, request, 409, 'A test publication is already in progress.');
      } else if (attempt.error) {
        return failure(reply, request, 503, 'Could not reserve the test publication.');
      }

      let postId: string;
      try {
        postId = await publishFacebookStagingTest(config, token);
      } catch (error) {
        const rejected = error instanceof FacebookRequestRejected;
        await supabase
          .from('campaign_facebook_test_publications')
          .update({ status: rejected ? 'rejected' : 'verifying' })
          .eq('page_id', config.pageId)
          .eq('campaign_id', campaignId)
          .eq('requested_at', now);
        if (rejected && error.expiredAuthorization) {
          await supabase
            .from('campaign_facebook_connections')
            .update(clearConnection)
            .eq('campaign_id', campaignId)
            .eq('sealed_page_token', sealed);
          return failure(
            reply,
            request,
            409,
            'Facebook authorization expired. Reconnect the Page and try again.',
          );
        }
        return failure(
          reply,
          request,
          rejected ? 422 : 502,
          rejected
            ? 'Facebook declined the test post. Check the Page connection and permissions.'
            : 'Facebook did not confirm whether the test post was published. Check the Page before taking further action.',
        );
      }

      const saved = await supabase
        .from('campaign_facebook_test_publications')
        .update({
          status: 'published',
          provider_post_id: postId,
          published_at: new Date().toISOString(),
        })
        .eq('page_id', config.pageId)
        .eq('campaign_id', campaignId)
        .eq('requested_at', now)
        .select(receiptFields)
        .single();
      if (saved.error) {
        return failure(
          reply,
          request,
          503,
          'Facebook accepted the test post, but the receipt could not be stored. Check the Page for the post.',
        );
      }
      const permalink = await findFacebookStagingPermalink(config, token, postId);
      if (permalink) {
        await supabase
          .from('campaign_facebook_test_publications')
          .update({ permalink_url: permalink })
          .eq('provider_post_id', postId)
          .eq('campaign_id', campaignId);
      }
      return { receipt: { ...saved.data, permalink_url: permalink } };
    },
  );
}
