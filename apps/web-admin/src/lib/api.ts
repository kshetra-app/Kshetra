import { API_BASE_URL } from './constants';
import type {
  AppFeatureFlags,
  DelimitationProjectionsDTO,
  ProductDashboardMetricsDTO,
} from '@kshetra/shared';
import { DEFAULT_FEATURE_FLAGS } from '@kshetra/shared';
import { supabase } from './supabase';

async function authenticatedHeaders(): Promise<Record<string, string>> {
  if (!supabase) {
    throw new Error('Secure admin authentication is not configured for this web-admin environment.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('Unable to read the current admin session.');
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in with an authorized account to perform this action.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp?: string;
  uptime?: number;
}

export interface FlagResponse {
  status: string;
  flags: AppFeatureFlags;
  updatedAt?: string;
}

function parseFlags(payload: unknown): AppFeatureFlags {
  const candidate = payload && typeof payload === 'object' && 'flags' in payload
    ? (payload as { flags?: unknown }).flags
    : payload;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('The feature flag API returned an incomplete response.');
  }
  const flags = candidate as Record<string, unknown>;
  const validated: AppFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as Array<keyof AppFeatureFlags>) {
    if (typeof flags[key] !== 'boolean') {
      throw new Error(`The feature flag API returned an invalid value for ${key}.`);
    }
    validated[key] = flags[key];
  }
  return validated;
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Healthcheck failed with status ${res.status}`);
    return res.json();
  },

  async getFlags(): Promise<AppFeatureFlags> {
    const res = await fetch(`${API_BASE_URL}/api/v1/config/flags`);
    if (!res.ok) throw new Error(`Failed to fetch flags: ${res.status}`);
    return parseFlags(await res.json());
  },

  async getProductDashboardMetrics(): Promise<ProductDashboardMetricsDTO> {
    const headers = await authenticatedHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/metrics`, { headers });
    if (!res.ok) throw new Error(`Product analytics unavailable (${res.status})`);
    const body: unknown = await res.json();
    const payload = body && typeof body === 'object' && 'data' in body
      ? (body as { data?: unknown }).data
      : body;
    if (
      !payload || typeof payload !== 'object' ||
      !('activation' in payload) || !('retention' in payload) ||
      !('engagement' in payload) || !('geographyDensity' in payload) ||
      !('revenue' in payload) || !('dataQuality' in payload) ||
      !('generatedAt' in payload)
    ) {
      throw new Error('Product analytics response is incomplete.');
    }
    return payload as ProductDashboardMetricsDTO;
  },

  async updateFlags(flags: Partial<AppFeatureFlags>): Promise<FlagResponse> {
    const headers = await authenticatedHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/config/flags`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(flags),
    });
    if (!res.ok) throw new Error(`Failed to update flags: ${res.status}`);
    const payload: unknown = await res.json();
    if (!payload || typeof payload !== 'object' || !('status' in payload) || payload.status !== 'updated') {
      throw new Error('The API did not confirm that the feature flag update was saved.');
    }
    const parsedFlags = parseFlags(payload);
    return {
      status: 'updated',
      flags: parsedFlags,
      ...('updatedAt' in payload && typeof payload.updatedAt === 'string'
        ? { updatedAt: payload.updatedAt }
        : {}),
    };
  },

  async getConstituencies(stateCode: string = 'TS') {
    const res = await fetch(`${API_BASE_URL}/api/v1/states/${stateCode}/constituencies`);
    if (!res.ok) throw new Error(`Failed to fetch constituencies: ${res.status}`);
    return res.json();
  },

  async getStates() {
    const res = await fetch(`${API_BASE_URL}/api/v1/states`);
    if (!res.ok) throw new Error(`Failed to fetch states: ${res.status}`);
    return res.json();
  },

  async getDelimitationProjections(model: 'constitutional_proportional' | 'expansion_safe'): Promise<DelimitationProjectionsDTO> {
    const res = await fetch(`${API_BASE_URL}/api/v1/delimitation/projections?model=${encodeURIComponent(model)}`);
    if (!res.ok) throw new Error(`Failed to fetch delimitation projections: ${res.status}`);

    const body: unknown = await res.json();
    const result = body && typeof body === 'object' && 'data' in body
      ? (body as { data?: unknown }).data
      : body;
    if (!result || typeof result !== 'object') {
      throw new Error('The delimitation API returned an incomplete projection response.');
    }
    const payload = result as Partial<DelimitationProjectionsDTO>;
    const validProjectionRows = Array.isArray(payload.projections) && payload.projections.every((row) =>
      row && typeof row.stateCode === 'string' && typeof row.stateName === 'string' &&
      typeof row.population === 'number' && typeof row.currentSeats === 'number' &&
      typeof row.projectedSeats === 'number' && typeof row.seatChange === 'number' &&
      typeof row.dataStatus === 'string',
    );
    if (
      !validProjectionRows || !payload.summary || !payload.provenance ||
      !Array.isArray(payload.provenance.inputDatasetVersions)
    ) {
      throw new Error('The delimitation API returned an incomplete projection response.');
    }
    return payload as DelimitationProjectionsDTO;
  },

  async getCivicIssues() {
    const res = await fetch(`${API_BASE_URL}/api/v1/civic/issues?limit=100`);
    if (!res.ok) throw new Error(`Failed to fetch civic issues: ${res.status}`);
    return res.json();
  },

  async updateCivicIssueStatus(id: string, status: string, note?: string) {
    const headers = await authenticatedHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/civic/issues/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error(`Civic issue update failed: ${res.status}`);
    return res.json();
  },

  async getModerationQueue() {
    const headers = await authenticatedHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/moderation/queue`, { headers });
    if (!res.ok) throw new Error(`Moderation queue unavailable: ${res.status}`);
    return res.json();
  },

  async decideModeration(action: {
    reportId: string;
    targetPostId?: string;
    targetCommentId?: string;
    targetUserId?: string;
    actionType: 'dismiss' | 'delete_content' | 'ban';
    reason: string;
  }) {
    const headers = await authenticatedHeaders();
    if (!supabase) {
      throw new Error('Secure admin authentication is not configured for this web-admin environment.');
    }
    const { data } = await supabase.auth.getSession();
    const moderatorId = data.session?.user.id;
    if (!moderatorId) throw new Error('Sign in with an authorized account to perform this action.');
    const res = await fetch(`${API_BASE_URL}/api/v1/moderation/action`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...action, moderatorId }),
    });
    if (!res.ok) throw new Error(`Moderation action failed: ${res.status}`);
    return res.json();
  },

};
