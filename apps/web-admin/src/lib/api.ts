import { API_BASE_URL } from './constants';
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

  async updateFlags(flags: Partial<AppFeatureFlags>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/config/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flags }),
    });
    if (!res.ok) throw new Error(`Failed to update flags: ${res.status}`);
    return res.json();
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
