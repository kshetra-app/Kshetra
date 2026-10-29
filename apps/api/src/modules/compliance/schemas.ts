/**
 * apps/api/src/modules/compliance/schemas.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Zod validation schemas for Data Principal rights, grievances, and privacy locales.
 */

import { z } from 'zod';

export const dataAccessRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeActivityHistory: z.boolean().default(true),
});

export type DataAccessRequestInput = z.infer<typeof dataAccessRequestSchema>;

export const dataCorrectionRequestSchema = z.object({
  field: z.string().min(1, 'Target field name is required'),
  correctedValue: z.any(),
  supportingEvidenceUrl: z.string().url().optional(),
  reason: z.string().min(5, 'Reason for correction must be provided (min 5 chars)'),
});

export type DataCorrectionRequestInput = z.infer<typeof dataCorrectionRequestSchema>;

export const dataErasureRequestSchema = z.object({
  confirmation: z.literal('DELETE_MY_PERSONAL_DATA', {
    errorMap: () => ({ message: "Must explicitly provide confirmation phrase 'DELETE_MY_PERSONAL_DATA'" }),
  }),
  reason: z.string().max(500).optional(),
});

export type DataErasureRequestInput = z.infer<typeof dataErasureRequestSchema>;

export const grievanceSubmissionSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  contactEmail: z.string().email('Valid contact email is required'),
  category: z.enum([
    'unauthorized_processing',
    'erasure_delay',
    'inaccurate_data',
    'excessive_collection',
    'security_concern',
    'other',
  ]).default('other'),
});

export type GrievanceSubmissionInput = z.infer<typeof grievanceSubmissionSchema>;

export const privacyNoticeQuerySchema = z.object({
  locale: z
    .enum(['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'])
    .default('en'),
});

export type PrivacyNoticeQueryInput = z.infer<typeof privacyNoticeQuerySchema>;

export const breachIncidentReportSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedCategories: z.array(z.string()).min(1),
  estimatedPrincipalsAffected: z.number().int().min(1),
  summary: z.string().min(10),
  rootCauseAnalysis: z.string().optional(),
});

export type BreachIncidentReportInput = z.infer<typeof breachIncidentReportSchema>;
