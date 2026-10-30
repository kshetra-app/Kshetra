import type { FastifyPluginAsync } from 'fastify';
import { dataIngestionService } from '../services/dataIngestionService';
import { delimitationSourcePipeline } from '../services/delimitationSourcePipeline';
import { sendApiError } from '../lib/replyHelper';

export const dataPipelineRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Dispatches an 8-stage data ingestion pipeline job (JOB 075).
   */
  app.post('/api/v1/pipelines/ingest', async (request, reply) => {
    const body = request.body as any;

    if (!body || !body.datasetName || !body.sourceUri) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'datasetName and sourceUri are required.');
    }

    const job = await dataIngestionService.processDataset({
      datasetName: body.datasetName,
      sourceUri: body.sourceUri,
      rawPayload: body.rawPayload,
      versionTag: body.versionTag || `v${Date.now()}`,
    });

    return reply.send({ success: true, data: job });
  });

  /**
   * Retrieves status and stage counters for a specific data ingestion job.
   */
  app.get('/api/v1/pipelines/status/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    const job = await dataIngestionService.getJobStatus(jobId);
    if (!job) {
      return sendApiError(reply, request, 404, 'JOB_NOT_FOUND', `Data ingestion job '${jobId}' was not found.`);
    }

    return reply.send({ success: true, data: job });
  });

  /**
   * Executes Delimitation spatial topological audit & calculates geographic impact deltas (JOB 076).
   */
  app.post('/api/v1/pipelines/delimitation/audit', async (request, reply) => {
    const body = request.body as any;

    if (!body || !body.orderNumber || !body.stateCode || !Array.isArray(body.boundaries)) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'orderNumber, stateCode, and boundaries array are required.');
    }

    const report = await delimitationSourcePipeline.processDelimitationRevision(body);
    return reply.send({ success: true, data: report });
  });
};
