/**
 * Aspirant Academy Routes
 * Fastify route handler for Candidate Academy mutations & KYC lifecycle
 * Master Execution Framework — Domain 4 (JOB 046, JOB 047, JOB 050)
 * Ratified under DEC-176 and DEC-177
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';
import { AspirantService } from '../services/aspirantService';
import type {
  AspirantRegistrationRequest,
  AspirantKYCSubmissionRequest,
  QuizSubmissionRequest,
} from '@kshetra/shared';

export async function aspirantRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/aspirant/register — Register candidate profile (JOB 046)
   */
  app.post<{
    Body: {
      userId?: string;
      displayName?: string;
      bio?: string;
      stateCode?: string;
      targetConstituencyAcNo?: number;
      targetConstituencyName?: string;
      targetConstituencyId?: string;
      targetElectionYear?: number;
      partyAffiliation?: string;
      isIndependent?: boolean;
      manifestoUrl?: string;
      visionSummary?: string;
      hasCriminalCases?: boolean;
      criminalCasesDetails?: string;
      handle?: string;
    };
  }>(
    '/api/v1/aspirant/register',
    {
      schema: {
        body: {
          type: ['object', 'null'],
          properties: {
            userId: { type: 'string' },
            displayName: { type: 'string' },
            bio: { type: 'string' },
            stateCode: { type: 'string' },
            targetConstituencyAcNo: { type: 'number' },
            targetConstituencyName: { type: 'string' },
            targetConstituencyId: { type: 'string' },
            targetElectionYear: { type: 'number' },
            partyAffiliation: { type: 'string' },
            isIndependent: { type: 'boolean' },
            manifestoUrl: { type: 'string' },
            visionSummary: { type: 'string', maxLength: 2000 },
            hasCriminalCases: { type: 'boolean' },
            criminalCasesDetails: { type: 'string' },
            handle: { type: 'string' },
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

      const body = request.body || {};
      const regReq: AspirantRegistrationRequest = {
        displayName: body.displayName || 'Aspiring Leader',
        bio: body.bio,
        stateCode: body.stateCode || 'TG',
        targetConstituencyAcNo: body.targetConstituencyAcNo,
        targetConstituencyName: body.targetConstituencyName || body.targetConstituencyId,
        targetElectionYear: body.targetElectionYear,
        partyAffiliation: body.partyAffiliation,
        isIndependent: body.isIndependent,
        manifestoUrl: body.manifestoUrl,
        visionSummary: body.visionSummary,
        hasCriminalCases: body.hasCriminalCases,
        criminalCasesDetails: body.criminalCasesDetails,
        handle: body.handle,
      };

      try {
        const profile = await AspirantService.registerAspirant(auth.userId, regReq);
        return reply.status(201).send({ success: true, profile });
      } catch (err: any) {
        if (err.message === 'HANDLE_ALREADY_TAKEN') {
          return sendApiError(reply, request, 409, 'Conflict', 'Handle is already taken', {
            code: 'HANDLE_CONFLICT',
          });
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 2. POST /api/v1/aspirant/kyc/submit — Submit KYC verification document (JOB 046 - DEC-177 Decision 1)
   */
  app.post<{
    Body: {
      userId?: string;
      documentType: 'voter_id' | 'aadhaar_masked' | 'pan' | 'election_affidavit' | 'party_letter';
      documentHash: string;
      documentUrl?: string;
      statutoryDeclarationAccepted: boolean;
    };
  }>(
    '/api/v1/aspirant/kyc/submit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['documentType', 'documentHash', 'statutoryDeclarationAccepted'],
          properties: {
            userId: { type: 'string' },
            documentType: {
              type: 'string',
              enum: ['voter_id', 'aadhaar_masked', 'pan', 'election_affidavit', 'party_letter'],
            },
            documentHash: { type: 'string', minLength: 16 },
            documentUrl: { type: 'string' },
            statutoryDeclarationAccepted: { type: 'boolean' },
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

      const body = request.body;
      const kycReq: AspirantKYCSubmissionRequest = {
        documentType: body.documentType,
        documentHash: body.documentHash,
        documentUrl: body.documentUrl,
        statutoryDeclarationAccepted: body.statutoryDeclarationAccepted,
      };

      try {
        const kyc = await AspirantService.submitKYC(auth.userId, kycReq);
        return reply.status(201).send({ success: true, kyc });
      } catch (err: any) {
        if (err.message === 'STATUTORY_DECLARATION_REQUIRED') {
          return sendApiError(reply, request, 400, 'Bad Request', 'Statutory declaration must be accepted', {
            code: 'STATUTORY_DECLARATION_REQUIRED',
          });
        }
        if (err.message === 'ASPIRANT_NOT_REGISTERED') {
          return sendApiError(reply, request, 404, 'Not Found', 'Aspirant profile must be registered first', {
            code: 'ASPIRANT_NOT_REGISTERED',
          });
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 3. GET /api/v1/aspirant/kyc/status — Get KYC status for authenticated user (JOB 046)
   */
  app.get(
    '/api/v1/aspirant/kyc/status',
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      try {
        const records = await AspirantService.getKYCStatus(auth.userId);
        return reply.send({ success: true, records });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 4. GET /api/v1/aspirant/profile/:id — Public Aspirant Profile & Aggregated Timeline (JOB 047)
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/aspirant/profile/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const profile = await AspirantService.getPublicProfile(id);
        if (!profile) {
          return sendApiError(reply, request, 404, 'Not Found', 'Aspirant profile not found', {
            code: 'ASPIRANT_NOT_FOUND',
          });
        }
        return reply.send({ success: true, profile });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 5. GET /api/v1/aspirants — Directory of public aspirants (JOB 047)
   */
  app.get<{
    Querystring: { stateCode?: string; constituencyId?: string };
  }>(
    '/api/v1/aspirants',
    async (request, reply) => {
      const { stateCode, constituencyId } = request.query;

      if (isSupabaseConfigured) {
        let query = supabase.from('aspirant_profiles').select('*').eq('is_public', true);
        if (stateCode) query = query.eq('state_code', stateCode);
        if (constituencyId) query = query.eq('target_constituency_ac_no', constituencyId);

        const { data, error } = await query.order('civic_score', { ascending: false });
        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.send({ success: true, aspirants: data || [] });
      }

      return reply.send({ success: true, aspirants: [] });
    },
  );

  /**
   * 6. GET /api/v1/aspirant/modules — List Leadership Academy Modules (JOB 050)
   */
  app.get(
    '/api/v1/aspirant/modules',
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply).catch(() => null);
      const modules = AspirantService.listAcademyModules(auth?.userId);
      return reply.send({ success: true, modules });
    },
  );

  /**
   * 7. GET /api/v1/aspirant/modules/:id — Get Leadership Module Detail & Quiz (JOB 050)
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/aspirant/modules/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply).catch(() => null);
      const { id } = request.params;
      const mod = AspirantService.getAcademyModule(id, auth?.userId);

      if (!mod) {
        return sendApiError(reply, request, 404, 'Not Found', 'Module not found', {
          code: 'MODULE_NOT_FOUND',
        });
      }

      return reply.send({ success: true, module: mod });
    },
  );

  /**
   * 8. POST /api/v1/aspirant/modules/:id/quiz — Submit Quiz with Server-Side Evaluation (JOB 050 - DEC-177 Decision 3)
   */
  app.post<{
    Params: { id: string };
    Body: {
      userId?: string;
      answers: Array<{ questionId: string; selectedIndex: number }>;
    };
  }>(
    '/api/v1/aspirant/modules/:id/quiz',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['answers'],
          properties: {
            userId: { type: 'string' },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                required: ['questionId', 'selectedIndex'],
                properties: {
                  questionId: { type: 'string' },
                  selectedIndex: { type: 'number' },
                },
              },
            },
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

      const { id: moduleId } = request.params;
      const submission: QuizSubmissionRequest = {
        answers: request.body.answers,
      };

      try {
        const result = await AspirantService.submitQuiz(auth.userId, moduleId, submission);
        return reply.send({ success: true, result });
      } catch (err: any) {
        if (err.message === 'MODULE_NOT_FOUND') {
          return sendApiError(reply, request, 404, 'Not Found', 'Module not found', {
            code: 'MODULE_NOT_FOUND',
          });
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 9. POST /api/v1/aspirant/modules/:id/start — Start module (Preserved)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>(
    '/api/v1/aspirant/modules/:id/start',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { userId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { id: moduleId } = request.params;
      if (isSupabaseConfigured) {
        await supabase.from('module_progress').upsert(
          {
            user_id: auth.userId,
            module_id: moduleId,
            started_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,module_id' },
        );
      }

      return reply.send({ success: true, moduleId, userId: auth.userId, started: true });
    },
  );

  /**
   * 10. POST /api/v1/aspirant/modules/:id/complete — Complete module (Class B Method 29: completeModule Preserved)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string; quizScore?: number };
  }>(
    '/api/v1/aspirant/modules/:id/complete',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            quizScore: { type: 'number' },
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
      const { id: moduleId } = request.params;
      const { quizScore } = request.body || {};
      const now = new Date().toISOString();

      if (isSupabaseConfigured) {
        await supabase
          .from('module_progress')
          .update({
            completed: true,
            completed_at: now,
            quiz_score: quizScore ?? null,
          })
          .eq('user_id', userId)
          .eq('module_id', moduleId);

        try {
          await supabase.rpc('increment_aspirant_modules', { p_user_id: userId });
        } catch {
          // best-effort
        }
      }

      return reply.send({
        success: true,
        moduleId,
        userId,
        completedAt: now,
        quizScore: quizScore ?? null,
      });
    },
  );

  /**
   * 11. POST /api/v1/aspirant/challenges/:id/join — Join challenge (Class B Method 30 Preserved)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>(
    '/api/v1/aspirant/challenges/:id/join',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { userId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { id: challengeId } = request.params;
      const now = new Date().toISOString();

      if (isSupabaseConfigured) {
        await supabase
          .from('challenge_participation')
          .insert({ user_id: auth.userId, challenge_id: challengeId });
      }

      return reply.send({
        success: true,
        challengeId,
        userId: auth.userId,
        joinedAt: now,
      });
    },
  );

  /**
   * 12. POST /api/v1/aspirant/:id/endorse — Endorse aspirant (Class B Method 31 Preserved)
   */
  app.post<{
    Params: { id: string };
    Body: { endorserId?: string; message?: string };
  }>(
    '/api/v1/aspirant/:id/endorse',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            endorserId: { type: 'string' },
            message: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.endorserId, 'endorserId')) {
        return;
      }

      const { id: aspirantId } = request.params;
      const { message } = request.body || {};
      const now = new Date().toISOString();

      if (isSupabaseConfigured) {
        await supabase.from('community_endorsements').insert({
          endorser_id: auth.userId,
          aspirant_id: aspirantId,
          message: message ?? null,
          created_at: now,
        });
      }

      return reply.status(201).send({
        success: true,
        aspirantId,
        endorserId: auth.userId,
        endorsedAt: now,
      });
    },
  );
}
