import { API_BASE_URL } from './constants';
import { supabase } from './supabase';
import type { AppFeatureFlags } from '@kshetra/shared';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp?: string;
  uptime?: number;
}

export interface FlagResponse {
  flags: AppFeatureFlags;
  updatedAt?: string;
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
    const data = await res.json();
    return data.flags || data;
  },

  async updateFlags(flags: Partial<AppFeatureFlags>): Promise<{ status: string; flags: AppFeatureFlags; updatedAt?: string }> {
    if (!supabase) {
      throw new Error('Secure admin sign-in is unavailable because this web-admin build has no Supabase authentication configuration.');
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Could not read the admin sign-in session: ${sessionError.message}`);
    if (!session?.access_token) throw new Error('Sign in with an administrator account before publishing feature flags.');

    const res = await fetch(`${API_BASE_URL}/api/v1/config/flags`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(flags),
    });
    if (!res.ok) throw new Error(`Failed to update flags: ${res.status}`);
    const result = await res.json();
    if (result?.status !== 'updated' || !result?.flags) {
      throw new Error('The server did not confirm that the feature flags were updated.');
    }
    return result;
  },

  async getConstituencies(stateCode: string = 'TS') {
    const res = await fetch(`${API_BASE_URL}/api/v1/states/${stateCode}/constituencies`);
    if (!res.ok) throw new Error(`Failed to fetch constituencies: ${res.status}`);
    return res.json();
  },

  async getDelimitationScenarios(stateCode: string = 'TS') {
    const res = await fetch(`${API_BASE_URL}/api/v1/delimitation/scenarios/${stateCode}`);
    if (!res.ok) throw new Error(`Failed to fetch delimitation: ${res.status}`);
    return res.json();
  },

  async moderateContent(action: {
    targetId: string;
    targetType: 'post' | 'comment' | 'stream' | 'representative_edit';
    decision: 'approve' | 'reject' | 'delete' | 'ban_user';
    reason?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/api/v1/live/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) throw new Error(`Moderation action failed: ${res.status}`);
    return res.json();
  },
};
