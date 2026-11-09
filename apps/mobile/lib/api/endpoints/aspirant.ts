/**
 * Aspirant Academy API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - POST /api/v1/aspirant/register
 * - POST /api/v1/aspirant/modules/:id/start
 * - POST /api/v1/aspirant/modules/:id/complete
 * - POST /api/v1/aspirant/challenges/:id/join
 * - POST /api/v1/aspirant/:id/endorse
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';
import { BADGE_CONFIG, type BadgeType, type ChallengeParticipation, type CivicBadge, type CommunityChallenge, type LeadershipModule } from '../../aspirantTypes';
import { authManager } from '../authManager';

export interface RegisterAspirantRequestDTO {
  displayName?: string;
  bio?: string;
  stateCode?: string;
  targetConstituencyAcNo?: number;
  targetConstituencyName?: string;
  targetElectionYear?: number;
  targetConstituencyId?: string;
  partyAffiliation?: string;
  isIndependent?: boolean;
  manifestoUrl?: string;
  visionSummary?: string;
  userId?: string;
}

export class AspirantEndpoint {
  constructor(private readonly client: ApiClient) {}

  async listModules(): Promise<{ success: boolean; modules: LeadershipModule[] }> {
    const token = await authManager.getAccessToken().catch(() => null);
    const res = await this.client.get<{ success: boolean; modules: LeadershipModule[] }>(
      '/api/v1/aspirant/modules',
      { authPolicy: 'public', headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    return res.data;
  }

  async listChallenges(stateCode?: string): Promise<{
    success: boolean;
    challenges: CommunityChallenge[];
    participation: ChallengeParticipation[];
  }> {
    const token = await authManager.getAccessToken().catch(() => null);
    const query: Record<string, string> = {};
    if (stateCode) query.stateCode = stateCode;
    const res = await this.client.get<{
      success: boolean;
      challenges: CommunityChallenge[];
      participation: ChallengeParticipation[];
    }>('/api/v1/aspirant/challenges', {
      authPolicy: 'public',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      query,
    });
    return res.data;
  }

  async listBadges(): Promise<{ success: boolean; badges: CivicBadge[] }> {
    const res = await this.client.get<{ success: boolean; badges: Array<{ badgeType: string; earnedAt: string }> }>(
      '/api/v1/aspirant/badges',
      { authPolicy: 'authenticated' },
    );
    const badges = (res.data.badges ?? []).flatMap(({ badgeType, earnedAt }) =>
      Object.prototype.hasOwnProperty.call(BADGE_CONFIG, badgeType)
        ? [{ type: badgeType as BadgeType, earnedAt }]
        : [],
    );
    return { ...res.data, badges };
  }

  /**
   * 1. Register candidate profile
   */
  async register(
    userIdOrPayload: string | RegisterAspirantRequestDTO,
    maybePayload?: RegisterAspirantRequestDTO,
  ): Promise<{ success: boolean; profile?: any }> {
    const payload = typeof userIdOrPayload === 'string'
      ? { ...maybePayload, userId: userIdOrPayload }
      : userIdOrPayload;

    const res = await this.client.post<{ success: boolean; profile?: any }>(
      '/api/v1/aspirant/register',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  async getMyProfile(): Promise<{ success: boolean; profile?: any | null }> {
    const res = await this.client.get<{ success: boolean; profile?: any | null }>(
      '/api/v1/aspirant/me',
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Start module
   */
  async startModule(moduleId: string, userId?: string): Promise<{ success: boolean; moduleId: string; started: boolean }> {
    if (!moduleId) {
      throw new ApiValidationError('Invalid start module: moduleId is required');
    }
    const res = await this.client.post<{ success: boolean; moduleId: string; started: boolean }>(
      `/api/v1/aspirant/modules/${encodeURIComponent(moduleId)}/start`,
      { userId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Complete module
   */
  async completeModule(moduleId: string, quizScore?: number, userId?: string): Promise<{ success: boolean; moduleId: string }> {
    if (!moduleId) {
      throw new ApiValidationError('Invalid complete module: moduleId is required');
    }
    const res = await this.client.post<{ success: boolean; moduleId: string }>(
      `/api/v1/aspirant/modules/${encodeURIComponent(moduleId)}/complete`,
      { quizScore, userId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 4. Join challenge
   */
  async joinChallenge(challengeId: string, userId?: string): Promise<{ success: boolean; challengeId: string }> {
    if (!challengeId) {
      throw new ApiValidationError('Invalid join challenge: challengeId is required');
    }
    const res = await this.client.post<{ success: boolean; challengeId: string }>(
      `/api/v1/aspirant/challenges/${encodeURIComponent(challengeId)}/join`,
      { userId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 5. Endorse candidate
   */
  async endorseAspirant(aspirantId: string, message?: string, endorserId?: string): Promise<{ success: boolean; aspirantId: string }> {
    if (!aspirantId) {
      throw new ApiValidationError('Invalid endorse aspirant: aspirantId is required');
    }
    const res = await this.client.post<{ success: boolean; aspirantId: string }>(
      `/api/v1/aspirant/${encodeURIComponent(aspirantId)}/endorse`,
      { message, endorserId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 6. Submit KYC verification document (JOB 046)
   */
  async submitKYC(payload: {
    documentType: string;
    documentHash: string;
    documentUrl?: string;
    statutoryDeclarationAccepted: boolean;
  }): Promise<{ success: boolean; kyc?: any }> {
    const res = await this.client.post<{ success: boolean; kyc?: any }>(
      '/api/v1/aspirant/kyc/submit',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 7. Get KYC status (JOB 046)
   */
  async getKYCStatus(): Promise<{ success: boolean; records?: any[] }> {
    const res = await this.client.get<{ success: boolean; records?: any[] }>(
      '/api/v1/aspirant/kyc/status',
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 8. Get public profile & aggregated timeline (JOB 047)
   */
  async getPublicProfile(idOrHandle: string): Promise<{ success: boolean; profile?: any }> {
    const res = await this.client.get<{ success: boolean; profile?: any }>(
      `/api/v1/aspirant/profile/${encodeURIComponent(idOrHandle)}`,
      { authPolicy: 'public' },
    );
    return res.data;
  }

  /**
   * 9. Submit quiz answers for evaluation and certification (JOB 050 - Decision 3)
   */
  async submitQuiz(
    moduleId: string,
    answers: Array<{ questionId: string; selectedIndex: number }>,
    userId?: string,
  ): Promise<{ success: boolean; result?: any }> {
    const res = await this.client.post<{ success: boolean; result?: any }>(
      `/api/v1/aspirant/modules/${encodeURIComponent(moduleId)}/quiz`,
      { answers, userId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
