/**
 * Contributor & Device Verification Routes
 * Fastify route handler for Contributor KYC, Fingerprinting, and Devices
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration)
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

export async function contributorRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/contributor/kyc
   * Submit contributor KYC (Class B Method 32: submitKYC)
   */
  app.post<{
    Body: {
      userId?: string;
      fullLegalName: string;
      phoneNumber: string;
      phoneVerified?: boolean;
      selfieUrl?: string | null;
      selfieHash?: string | null;
      deviceUniqueId?: string | null;
      [key: string]: any;
    };
  }>('/api/v1/contributor/kyc', {
    schema: {
      body: {
        type: 'object',
        required: ['fullLegalName', 'phoneNumber'],
        properties: {
          userId: { type: 'string' },
          fullLegalName: { type: 'string', minLength: 1 },
          phoneNumber: { type: 'string', minLength: 5 },
          phoneVerified: { type: 'boolean' },
          selfieUrl: { type: ['string', 'null'] },
          selfieHash: { type: ['string', 'null'] },
          deviceUniqueId: { type: ['string', 'null'] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || request.body?.userId;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const body = request.body;
    let kycId = `kyc_${Date.now()}`;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('contributor_kyc')
          .insert({
            user_id: userId,
            full_legal_name: body.fullLegalName,
            phone_number: body.phoneNumber,
            phone_verified: body.phoneVerified ?? false,
            selfie_url: body.selfieUrl ?? null,
            selfie_hash: body.selfieHash ?? null,
            device_unique_id: body.deviceUniqueId ?? null,
            status: 'submitted',
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (data?.id) kycId = data.id;
      } catch (err: any) {
        app.log.warn({ err: err?.message, userId }, 'Failed to insert KYC record in DB');
      }
    }

    return reply.status(201).send({
      success: true,
      kycId,
      userId,
      status: 'submitted',
    });
  });

  /**
   * 2. POST /api/v1/contributor/fingerprint
   * Insert Action Fingerprint (Class B Method 33: insertActionFingerprint)
   */
  app.post<{
    Body: {
      userId?: string;
      actionType: string;
      contentType?: string | null;
      contentId?: string | null;
      contentHash?: string | null;
      deviceUniqueId?: string | null;
      [key: string]: any;
    };
  }>('/api/v1/contributor/fingerprint', {
    schema: {
      body: {
        type: 'object',
        required: ['actionType'],
        properties: {
          userId: { type: 'string' },
          actionType: { type: 'string', minLength: 1 },
          contentType: { type: ['string', 'null'] },
          contentId: { type: ['string', 'null'] },
          contentHash: { type: ['string', 'null'] },
          deviceUniqueId: { type: ['string', 'null'] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || request.body?.userId || 'anonymous';
    const body = request.body;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('action_fingerprints')
          .insert({
            user_id: userId,
            action_type: body.actionType,
            content_type: body.contentType ?? null,
            content_id: body.contentId ?? null,
            content_hash: body.contentHash ?? null,
            device_unique_id: body.deviceUniqueId ?? null,
            timestamp: now,
          });
      } catch (err: any) {
        app.log.warn({ err: err?.message, userId }, 'Failed to insert action fingerprint in DB');
      }
    }

    return reply.status(201).send({
      success: true,
      userId,
      actionType: body.actionType,
      recordedAt: now,
    });
  });

  /**
   * 3. POST /api/v1/contributor/devices
   * Upsert Contributor Device (Class B Method 34: upsertContributorDevice)
   */
  app.post<{
    Body: {
      userId?: string;
      deviceUniqueId: string;
      deviceBrand?: string | null;
      deviceModel?: string | null;
      deviceName?: string | null;
      [key: string]: any;
    };
  }>('/api/v1/contributor/devices', {
    schema: {
      body: {
        type: 'object',
        required: ['deviceUniqueId'],
        properties: {
          userId: { type: 'string' },
          deviceUniqueId: { type: 'string', minLength: 1 },
          deviceBrand: { type: ['string', 'null'] },
          deviceModel: { type: ['string', 'null'] },
          deviceName: { type: ['string', 'null'] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || request.body?.userId;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const body = request.body;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('contributor_devices')
          .upsert({
            user_id: userId,
            device_unique_id: body.deviceUniqueId,
            device_brand: body.deviceBrand ?? null,
            device_model: body.deviceModel ?? null,
            device_name: body.deviceName ?? null,
            last_seen_at: now,
          }, { onConflict: 'user_id,device_unique_id' });
      } catch (err: any) {
        app.log.warn({ err: err?.message, userId }, 'Failed to upsert contributor device in DB');
      }
    }

    return reply.send({
      success: true,
      userId,
      deviceUniqueId: body.deviceUniqueId,
      updatedAt: now,
    });
  });
}
