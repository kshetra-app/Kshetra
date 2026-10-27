/**
 * Notifications API Endpoint
 * Master Execution Framework — Jobs 038-045 / Launch Gate A
 *
 * Target Fastify Routes:
 * - POST   /api/v1/notifications/register-token — Register push token
 * - POST   /api/v1/notifications/send           — Internal dispatch
 * - GET    /api/v1/notifications/preferences    — Get user preferences
 * - PUT    /api/v1/notifications/preferences    — Update preferences
 * - GET    /api/v1/notifications/triggers       — List available triggers
 * - PATCH  /api/v1/notifications/read           — Mark read
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface RegisterTokenDTO {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}

export interface NotificationPreferenceDTO {
  trigger: string;
  label: string;
  description: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface TriggerDTO {
  trigger: string;
  label: string;
  description: string;
  defaultPush: boolean;
  defaultInApp: boolean;
}

export class NotificationsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Register push token with Fastify backend
   */
  async registerToken(
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceName?: string,
  ): Promise<{ success: boolean; data?: any }> {
    if (!token || !platform) {
      throw new ApiValidationError('token and platform are required to register push token');
    }
    const res = await this.client.post<{ success: boolean; data?: any }>(
      '/api/v1/notifications/register-token',
      { token, platform, deviceName },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferenceDTO[]> {
    const res = await this.client.get<{ success: boolean; data: NotificationPreferenceDTO[] }>(
      '/api/v1/notifications/preferences',
      { authPolicy: 'authenticated' },
    );
    return res.data.data;
  }

  /**
   * 3. Update user notification preferences
   */
  async updatePreferences(
    trigger: string,
    pushEnabled: boolean,
    inAppEnabled: boolean,
  ): Promise<{ trigger: string; pushEnabled: boolean; inAppEnabled: boolean }> {
    if (!trigger) {
      throw new ApiValidationError('trigger is required to update notification preferences');
    }
    const res = await this.client.put<{ success: boolean; data: { trigger: string; pushEnabled: boolean; inAppEnabled: boolean } }>(
      '/api/v1/notifications/preferences',
      { trigger, pushEnabled, inAppEnabled },
      { authPolicy: 'authenticated' },
    );
    return res.data.data;
  }

  /**
   * 4. List available trigger types
   */
  async getTriggers(): Promise<TriggerDTO[]> {
    const res = await this.client.get<{ success: boolean; data: TriggerDTO[] }>(
      '/api/v1/notifications/triggers',
      { authPolicy: 'public' },
    );
    return res.data.data;
  }

  /**
   * 5. Mark notification(s) as read
   */
  async markRead(opts: {
    notificationId?: string;
    all?: boolean;
    userId?: string;
  }): Promise<{ success: boolean; data?: any }> {
    const res = await this.client.patch<{ success: boolean; data?: any }>(
      '/api/v1/notifications/read',
      opts,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
