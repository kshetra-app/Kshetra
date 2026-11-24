import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { getEnvironmentConfig } from '@kshetra/shared';

export const FACEBOOK_STAGING_CALLBACK = '/api/v1/campaign/facebook/callback';
export const FACEBOOK_STAGING_MESSAGE =
  'Poligram Staging test. This post verifies the Campaign Manager connection to this Facebook Page.';

const graphVersion = 'v27.0';
const graphHost = 'https://graph.facebook.com';
const numericId = /^\d{1,32}$/;
const definitiveRejectionCodes = new Set([10, 100, 190, 200]);
const staging = getEnvironmentConfig('staging');

export interface FacebookStagingConfig {
  appId: string;
  appSecret: string;
  loginConfigId: string;
  pageId: string;
  credentialKey: Buffer;
  redirectUri: string;
}

export function getFacebookStagingConfig(): FacebookStagingConfig | null {
  const {
    SUPABASE_URL,
    FACEBOOK_APP_ID: appId,
    FACEBOOK_APP_SECRET: appSecret,
    FACEBOOK_LOGIN_CONFIG_ID: loginConfigId,
    FACEBOOK_STAGING_PAGE_ID: pageId,
    FACEBOOK_CREDENTIAL_KEY: key,
  } = process.env;
  if (
    SUPABASE_URL?.trim().replace(/\/+$/, '') !== staging.supabaseUrl ||
    !appId ||
    !numericId.test(appId) ||
    !loginConfigId ||
    !numericId.test(loginConfigId) ||
    !pageId ||
    !numericId.test(pageId) ||
    !appSecret ||
    appSecret.trim() !== appSecret ||
    !key ||
    !/^[a-f0-9]{64}$/i.test(key)
  )
    return null;
  return {
    appId,
    appSecret,
    loginConfigId,
    pageId,
    credentialKey: Buffer.from(key, 'hex'),
    redirectUri: staging.apiBaseUrl + FACEBOOK_STAGING_CALLBACK,
  };
}

export function facebookLoginState() {
  return randomBytes(32).toString('base64url');
}

export function hashFacebookLoginState(state: string) {
  return createHash('sha256').update(state).digest('hex');
}

export function facebookAuthorizationUrl(config: FacebookStagingConfig, state: string): string {
  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: config.appId,
    config_id: config.loginConfigId,
    redirect_uri: config.redirectUri,
    state,
    response_type: 'code',
    override_default_response_type: 'true',
  }).toString();
  return url.toString();
}

export function sealFacebookToken(
  config: FacebookStagingConfig,
  campaignId: string,
  token: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.credentialKey, iv);
  cipher.setAAD(Buffer.from(`${config.appId}:${campaignId}:${config.pageId}`));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function openFacebookToken(
  config: FacebookStagingConfig,
  campaignId: string,
  sealed: string,
) {
  const parts = sealed.split('.');
  if (parts.length !== 3) throw new Error('Invalid Facebook credential');
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64url'));
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid Facebook credential');
  const decipher = createDecipheriv('aes-256-gcm', config.credentialKey, iv);
  decipher.setAAD(Buffer.from(`${config.appId}:${campaignId}:${config.pageId}`));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

class FacebookGraphError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly graphCode: number | undefined,
    readonly graphSubcode: number | undefined,
  ) {
    super('Facebook did not confirm the request.');
  }
}

export class FacebookRequestRejected extends FacebookGraphError {
  get expiredAuthorization() {
    return this.graphCode === 190;
  }
}

type FacebookConnectionStep =
  | 'exchange_code'
  | 'extend_user_token'
  | 'list_pages'
  | 'page_identity'
  | 'page_not_granted'
  | 'page_publish_task_missing';

export class FacebookConnectionError extends Error {
  readonly graphError: FacebookGraphError | undefined;

  constructor(
    readonly step: FacebookConnectionStep,
    error?: unknown,
  ) {
    super('The selected test Page did not grant publishing access.');
    this.graphError = error instanceof FacebookGraphError ? error : undefined;
  }
}

function graphUrl(path: string) {
  return new URL(`/${graphVersion}/${path}`, graphHost);
}

async function graph<T>(
  url: URL,
  config: FacebookStagingConfig,
  token?: string,
  body?: URLSearchParams,
): Promise<T> {
  if (token) {
    url.searchParams.set(
      'appsecret_proof',
      createHmac('sha256', config.appSecret).update(token).digest('hex'),
    );
  }
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json();
  if (!response.ok || result?.error) {
    const code = Number.isInteger(result?.error?.code) ? (result.error.code as number) : undefined;
    const subcode = Number.isInteger(result?.error?.error_subcode)
      ? (result.error.error_subcode as number)
      : undefined;
    const rejected =
      response.status >= 400 &&
      response.status < 500 &&
      code !== undefined &&
      definitiveRejectionCodes.has(code) &&
      result.error.is_transient !== true;
    const Failure = rejected ? FacebookRequestRejected : FacebookGraphError;
    throw new Failure(response.status, code, subcode);
  }
  return result as T;
}

export async function connectFacebookStagingPage(config: FacebookStagingConfig, code: string) {
  async function request<T>(step: FacebookConnectionStep, url: URL, token?: string) {
    try {
      return await graph<T>(url, config, token);
    } catch (error) {
      throw new FacebookConnectionError(step, error);
    }
  }

  const exchange = graphUrl('oauth/access_token');
  exchange.search = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  }).toString();
  const { access_token: shortToken } = await request<{ access_token?: string }>(
    'exchange_code',
    exchange,
  );
  if (!shortToken) throw new FacebookConnectionError('exchange_code');

  const extension = graphUrl('oauth/access_token');
  extension.search = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortToken,
  }).toString();
  const { access_token: userToken } = await request<{ access_token?: string }>(
    'extend_user_token',
    extension,
  );
  if (!userToken) throw new FacebookConnectionError('extend_user_token');

  const accounts = graphUrl('me/accounts');
  accounts.searchParams.set('fields', 'id,name,access_token,tasks');
  accounts.searchParams.set('limit', '100');
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    if (after) accounts.searchParams.set('after', after);
    const result = await request<{
      data?: { id: string; name: string; access_token?: string; tasks?: string[] }[];
      paging?: { next?: string; cursors?: { after?: string } };
    }>('list_pages', accounts, userToken);
    const target = result.data?.find((entry) => entry.id === config.pageId);
    if (target) {
      if (!target.name || !target.access_token)
        throw new FacebookConnectionError('page_not_granted');
      if (
        !target.tasks?.some(
          (task) => task === 'CREATE_CONTENT' || task === 'PROFILE_PLUS_CREATE_CONTENT',
        )
      ) {
        throw new FacebookConnectionError('page_publish_task_missing');
      }
      const identity = graphUrl('me');
      identity.searchParams.set('fields', 'id');
      const { id } = await request<{ id?: string }>('page_identity', identity, target.access_token);
      if (id !== config.pageId) throw new FacebookConnectionError('page_identity');
      return { name: target.name, token: target.access_token };
    }
    after = result.paging?.next ? result.paging.cursors?.after : undefined;
    if (!after) break;
  }
  throw new FacebookConnectionError('page_not_granted');
}

export async function publishFacebookStagingTest(config: FacebookStagingConfig, token: string) {
  return publishFacebookPageContent(config, token, { message: FACEBOOK_STAGING_MESSAGE });
}

type FacebookPageContent = {
  message: string;
  media?: { type: 'image' | 'video'; signedUrl: string };
};

export async function publishFacebookPageContent(
  config: FacebookStagingConfig,
  token: string,
  { message, media }: FacebookPageContent,
) {
  const edge = media?.type === 'image' ? 'photos' : media?.type === 'video' ? 'videos' : 'feed';
  const body = new URLSearchParams();
  if (media?.type === 'image') {
    body.set('url', media.signedUrl);
    body.set('caption', message);
  } else if (media?.type === 'video') {
    body.set('file_url', media.signedUrl);
    body.set('description', message);
    body.set('published', 'true');
  } else {
    body.set('message', message);
  }

  const receipt = await graph<{ id?: string; post_id?: string }>(
    graphUrl(`${config.pageId}/${edge}`),
    config,
    token,
    body,
  );
  const id = edge === 'photos' ? receipt.post_id : receipt.id;
  if (typeof id !== 'string' || !/^\d+(?:_\d+)?$/.test(id)) {
    throw new Error('Facebook did not return a usable post receipt.');
  }
  return id;
}

export async function getFacebookVideoPublication(
  config: FacebookStagingConfig,
  token: string,
  id: string,
) {
  const url = graphUrl(id);
  url.searchParams.set('fields', 'id,status,published');
  const video = await graph<{
    id?: string;
    published?: boolean;
    status?: { video_status?: string; publishing_phase?: { status?: string } };
  }>(url, config, token);
  if (video.id !== id) throw new Error('Facebook returned a different video.');
  const state = video.status;
  if (state?.video_status === 'error' || state?.publishing_phase?.status === 'error') {
    return 'rejected';
  }
  return state?.video_status === 'ready' && video.published === true ? 'published' : 'processing';
}

export async function findFacebookStagingPermalink(
  config: FacebookStagingConfig,
  token: string,
  id: string,
) {
  const url = graphUrl(id);
  url.searchParams.set('fields', 'id,permalink_url');
  try {
    const post = await graph<{ id?: string; permalink_url?: string }>(url, config, token);
    if (post.id !== id || !post.permalink_url) return null;
    const permalink = new URL(post.permalink_url);
    if (
      permalink.protocol === 'https:' &&
      ['www.facebook.com', 'facebook.com'].includes(permalink.hostname)
    ) {
      return permalink.href;
    }
  } catch {
    // Facebook already acknowledged the post. A permalink lookup cannot trigger another publish.
  }
  return null;
}
