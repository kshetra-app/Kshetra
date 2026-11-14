import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
/**
 * Contributor & Device Verification Routes
 * Fastify route handler for Contributor KYC, Fingerprinting, and Devices
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration) / CTO Directive 138
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

const isProductionRuntime = isProductionLikeRuntime();

export async function contributorRoutes(app: FastifyInstance) {
  /**
   * Read only the authenticated user's contributor verification state.
   * Identity documents and forensic fields are intentionally never returned.
   */
  app.get('/api/v1/contributor/kyc/status', async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Database service is not configured',
        {
          code: 'SERVICE_UNAVAILABLE',
        },
      );
    }

    const { data, error } = await supabase
      .from('creator_kyc_records')
      .select('id,user_id,status,verified_at,rejection_reason,created_at,updated_at')
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error) {
      app.log.error(
        { err: error.message, userId: auth.userId },
        'Failed to load contributor verification status',
      );
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Contributor verification status is unavailable',
        {
          code: 'VERIFICATION_UNAVAILABLE',
        },
      );
    }

    return reply.send({ success: true, record: data ? toContributorKycStatus(data) : null });
  });

  /**
   * 1. POST /api/v1/contributor/kyc
   * Submit contributor KYC (Class B Method 32: submitKYC).
   * The record stays pending until an authorized reviewer changes it.
   */
  app.post<{
    Body: {
      userId?: string;
      fullLegalName: string;
      phoneNumber: string;
      selfiePath: string;
      termsAccepted: true;
    };
  }>(
    '/api/v1/contributor/kyc',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['fullLegalName', 'phoneNumber', 'selfiePath', 'termsAccepted'],
          properties: {
            userId: { type: 'string' },
            fullLegalName: { type: 'string', minLength: 2, maxLength: 100 },
            phoneNumber: { type: 'string', minLength: 10, maxLength: 15 },
            selfiePath: { type: 'string', minLength: 1, maxLength: 300 },
            termsAccepted: { const: true },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const userId = auth.userId;
      const body = request.body;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      const pathParts = body.selfiePath.split('/');
      const fileName = pathParts[1];
      if (
        pathParts.length !== 2 ||
        pathParts[0] !== userId ||
        !fileName ||
        !/^kyc-[a-z0-9-]+\.(jpg|jpeg|png)$/i.test(fileName)
      ) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'A valid private selfie upload is required',
          {
            code: 'INVALID_SELFIE_PATH',
          },
        );
      }
      const fullLegalName = body.fullLegalName.trim();
      const phoneNumber = normalizeContributorPhone(body.phoneNumber);
      if (fullLegalName.length < 2 || !phoneNumber) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Enter a valid legal name and Indian mobile number',
          {
            code: 'INVALID_KYC_DETAILS',
          },
        );
      }

      try {
        const { data: existing, error: existingError } = await supabase
          .from('creator_kyc_records')
          .select('id,user_id,status,verified_at,rejection_reason,created_at,updated_at,selfie_url')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing && existing.status !== 'rejected') {
          if (existing.selfie_url !== body.selfiePath) {
            await removeUnlinkedKycSelfie(userId, body.selfiePath);
          }
          return reply.send({
            success: true,
            existing: true,
            record: toContributorKycStatus(existing),
          });
        }

        const { data: files, error: storageError } = await supabase.storage
          .from('kyc-selfies')
          .list(userId, { search: fileName, limit: 100 });
        if (storageError) throw storageError;
        if (!files?.some((file) => file.name === fileName)) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'The uploaded selfie could not be found',
            {
              code: 'SELFIE_UPLOAD_NOT_FOUND',
            },
          );
        }

        if (existing?.status === 'rejected') {
          const { data: resubmittedData, error: resubmissionError } = await supabase.rpc(
            'resubmit_creator_kyc_record',
            {
              p_record_id: existing.id,
              p_user_id: userId,
              p_full_legal_name: fullLegalName,
              p_phone_number: phoneNumber,
              p_selfie_path: body.selfiePath,
            },
          );

          if (resubmissionError) {
            if (resubmissionError.code === 'P0002') {
              const { data: currentRecord, error: currentReadError } = await supabase
                .from('creator_kyc_records')
                .select(
                  'id,user_id,status,verified_at,rejection_reason,created_at,updated_at,selfie_url',
                )
                .eq('user_id', userId)
                .maybeSingle();
              if (!currentReadError && currentRecord) {
                if (currentRecord.selfie_url !== body.selfiePath) {
                  await removeUnlinkedKycSelfie(userId, body.selfiePath);
                }
                if (currentRecord.status === 'rejected') {
                  return sendApiError(
                    reply,
                    request,
                    409,
                    'Conflict',
                    'The verification record changed during resubmission. Please retry.',
                    { code: 'KYC_RESUBMISSION_CONFLICT' },
                  );
                }
                return reply.send({
                  success: true,
                  existing: true,
                  record: toContributorKycStatus(currentRecord),
                });
              }
            }
            throw resubmissionError;
          }

          const resubmitted = Array.isArray(resubmittedData) ? resubmittedData[0] : resubmittedData;
          if (!resubmitted?.id || resubmitted.status !== 'pending') {
            throw new Error('Database did not confirm the contributor resubmission');
          }
          return reply.send({
            success: true,
            existing: false,
            resubmitted: true,
            record: toContributorKycStatus(resubmitted),
          });
        }

        const { data: created, error: insertError } = await supabase
          .from('creator_kyc_records')
          .insert({
            user_id: userId,
            full_legal_name: fullLegalName,
            phone_number: phoneNumber,
            phone_verified: false,
            selfie_url: body.selfiePath,
            status: 'pending',
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
          })
          .select('id,user_id,status,verified_at,rejection_reason,created_at,updated_at')
          .single();

        if (insertError) {
          // A parallel request may have inserted the one-per-user row first.
          if (insertError.code === '23505') {
            const { data: racedRecord, error: raceReadError } = await supabase
              .from('creator_kyc_records')
              .select(
                'id,user_id,status,verified_at,rejection_reason,created_at,updated_at,selfie_url',
              )
              .eq('user_id', userId)
              .maybeSingle();
            if (!raceReadError && racedRecord) {
              if (racedRecord.selfie_url !== body.selfiePath) {
                await removeUnlinkedKycSelfie(userId, body.selfiePath);
              }
              return reply.send({
                success: true,
                existing: true,
                record: toContributorKycStatus(racedRecord),
              });
            }
          }
          throw insertError;
        }

        return reply
          .status(201)
          .send({ success: true, existing: false, record: toContributorKycStatus(created) });
      } catch (err: any) {
        await removeUnlinkedKycSelfie(userId, body.selfiePath);
        app.log.error(
          { err: err?.message, userId },
          'Failed to persist contributor KYC submission',
        );
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Contributor verification could not be saved',
          {
            code: 'VERIFICATION_UNAVAILABLE',
          },
        );
      }
    },
  );

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
  }>(
    '/api/v1/contributor/fingerprint',
    {
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
    },
    async (request, reply) => {
      let resolvedUserId: string;

      // If caller specifies a userId or provides an authorization header, authenticate and enforce no spoofing
      if (request.headers.authorization || request.body?.userId) {
        const auth = await resolveAuthenticatedUser(request, reply);
        if (!auth) return;
        if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
          return;
        }
        resolvedUserId = auth.userId;
      } else if (!isProductionRuntime && (request.headers['x-user-id'] as string)) {
        resolvedUserId = request.headers['x-user-id'] as string;
      } else {
        resolvedUserId = 'anonymous';
      }

      const body = request.body;
      const now = new Date().toISOString();

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        const { error } = await supabase.from('action_fingerprints').insert({
          user_id: resolvedUserId,
          action_type: body.actionType,
          content_type: body.contentType ?? null,
          content_id: body.contentId ?? null,
          content_hash: body.contentHash ?? null,
          device_unique_id: body.deviceUniqueId ?? null,
          timestamp: now,
        });

        if (error) {
          app.log.error(
            { err: error.message, userId: resolvedUserId },
            'Failed to insert action fingerprint in DB',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error recording action fingerprint',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error(
          { err: err?.message, userId: resolvedUserId },
          'Exception inserting action fingerprint in DB',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording action fingerprint',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.status(201).send({
        success: true,
        userId: resolvedUserId,
        actionType: body.actionType,
        recordedAt: now,
      });
    },
  );

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
  }>(
    '/api/v1/contributor/devices',
    {
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
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const userId = auth.userId;
      const body = request.body;
      const now = new Date().toISOString();

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        const { error } = await supabase.from('contributor_devices').upsert(
          {
            user_id: userId,
            device_unique_id: body.deviceUniqueId,
            device_brand: body.deviceBrand ?? null,
            device_model: body.deviceModel ?? null,
            device_name: body.deviceName ?? null,
            last_seen_at: now,
          },
          { onConflict: 'user_id,device_unique_id' },
        );

        if (error) {
          app.log.error(
            { err: error.message, userId },
            'Failed to upsert contributor device in DB',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error recording contributor device',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error(
          { err: err?.message, userId },
          'Exception upserting contributor device in DB',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording contributor device',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.send({
        success: true,
        userId,
        deviceUniqueId: body.deviceUniqueId,
        updatedAt: now,
      });
    },
  );
}

function toContributorKycStatus(record: {
  id: string;
  user_id: string;
  status: string;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: record.id,
    userId: record.user_id,
    status: record.status,
    verifiedAt: record.verified_at,
    rejectionReason: record.rejection_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeContributorPhone(phone: string): string | null {
  const compact = phone.replace(/[+\s-]/g, '');
  const digits = compact.startsWith('91') && compact.length === 12 ? compact.slice(2) : compact;
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `91${digits}`;
}

async function removeUnlinkedKycSelfie(userId: string, path: string): Promise<void> {
  try {
    const { data: record, error } = await supabase
      .from('creator_kyc_records')
      .select('selfie_url')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || record?.selfie_url === path) return;

    const { error: removeError } = await supabase.storage.from('kyc-selfies').remove([path]);
    if (removeError) throw removeError;
  } catch {
    // Cleanup is best-effort; never delete a path while its database reference is unknown.
  }
}
