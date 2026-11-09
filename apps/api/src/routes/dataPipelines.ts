import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  dataIngestionService,
  IngestionPersistenceError,
  IngestionValidationError,
} from '../services/dataIngestionService';
import {
  delimitationSourcePipeline,
  DelimitationPersistenceError,
  DelimitationValidationError,
} from '../services/delimitationSourcePipeline';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { sendApiError } from '../lib/replyHelper';

const urlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  }, 'sourceUri must use HTTP or HTTPS');

const ingestionSchema = z
  .object({
    datasetName: z.string().trim().min(1).max(100),
    sourceUri: urlSchema,
    rawPayload: z.unknown().refine((value) => value !== undefined, 'rawPayload is required'),
    versionTag: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default(() => `v${Date.now()}`),
  })
  .strict();

const geometrySchema = z
  .object({
    type: z.enum(['Polygon', 'MultiPolygon']),
    coordinates: z.unknown(),
  })
  .passthrough();

const delimitationSchema = z
  .object({
    orderNumber: z.string().trim().min(1).max(150),
    gazetteDate: z.string().date(),
    stateCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{2,5}$/),
    boundaries: z
      .array(
        z
          .object({
            constituencyId: z.string().trim().min(1).max(100),
            geojsonGeometry: geometrySchema,
          })
          .strict(),
      )
      .min(1)
      .max(1000),
  })
  .strict();

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const user = await resolveAuthenticatedUser(request, reply);
  if (!user) return false;
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'data_engineer') {
    sendApiError(
      reply,
      request,
      403,
      'Forbidden',
      'Administrator or data engineer role required.',
      { code: 'FORBIDDEN' },
    );
    return false;
  }
  return true;
}

export const dataPipelineRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/pipelines/ingest', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return reply;
    const parsed = ingestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parsed.error.errors[0]?.message || 'Invalid ingestion payload',
        { code: 'VALIDATION_ERROR' },
      );
    }
    try {
      const job = await dataIngestionService.processDataset({
        ...parsed.data,
        versionTag: parsed.data.versionTag,
      });
      if (job.status === 'FAILED') {
        return reply.status(422).send({
          success: false,
          data: job,
          message: 'Dataset was rejected and the failed job was durably recorded.',
        });
      }
      return reply.status(201).send({ success: true, data: job, committedTo: 'durable_staging' });
    } catch (error) {
      if (error instanceof IngestionValidationError) {
        return sendApiError(reply, request, 400, 'Bad Request', error.message, {
          code: 'VALIDATION_ERROR',
        });
      }
      if (error instanceof IngestionPersistenceError) {
        request.log.error({ err: error }, 'Could not durably persist ingestion job');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Ingestion storage is unavailable; no completion was reported.',
          { code: 'INGESTION_STORAGE_UNAVAILABLE' },
        );
      }
      request.log.error({ err: error }, 'Unexpected ingestion pipeline failure');
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        'Ingestion failed before a durable job result was available.',
      );
    }
  });

  app.get('/api/v1/pipelines/status/:jobId', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return reply;
    const { jobId } = request.params as { jobId: string };
    if (!z.string().uuid().safeParse(jobId).success) {
      return sendApiError(reply, request, 400, 'Bad Request', 'jobId must be a UUID.', {
        code: 'VALIDATION_ERROR',
      });
    }
    try {
      const job = await dataIngestionService.getJobStatus(jobId);
      if (!job)
        return sendApiError(
          reply,
          request,
          404,
          'Not Found',
          `Data ingestion job '${jobId}' was not found.`,
          { code: 'JOB_NOT_FOUND' },
        );
      return reply.send({ success: true, data: job });
    } catch (error) {
      request.log.error({ err: error }, 'Could not load persisted ingestion status');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Ingestion status storage is unavailable.',
        { code: 'INGESTION_STORAGE_UNAVAILABLE' },
      );
    }
  });

  app.post('/api/v1/pipelines/delimitation/audit', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return reply;
    const parsed = delimitationSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parsed.error.errors[0]?.message || 'Invalid delimitation payload',
        { code: 'VALIDATION_ERROR' },
      );
    }
    try {
      const report = await delimitationSourcePipeline.processDelimitationRevision(parsed.data);
      return reply.status(201).send({
        success: true,
        data: report,
        geometryEngine: 'PostGIS',
      });
    } catch (error) {
      if (error instanceof DelimitationValidationError) {
        return sendApiError(reply, request, 422, 'Unprocessable Entity', error.message, {
          code: 'DELIMITATION_VALIDATION_FAILED',
        });
      }
      if (error instanceof DelimitationPersistenceError) {
        request.log.error(
          { err: error },
          'Delimitation audit could not complete against canonical PostGIS data',
        );
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Canonical geometry storage is unavailable; no report was persisted.',
          { code: 'SPATIAL_STORAGE_UNAVAILABLE' },
        );
      }
      request.log.error({ err: error }, 'Unexpected PostGIS delimitation failure');
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        'Spatial audit failed before a persisted report was available.',
      );
    }
  });
};
