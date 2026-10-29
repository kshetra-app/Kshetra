/**
 * apps/api/src/modules/saasOnboarding/schemas.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Zod validation schemas for partner self-service onboarding, key lifecycle & billing.
 */

import { z } from 'zod';

export const signupBodySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  email: z.string().trim().email('Invalid email address format'),
  organizationName: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters')
    .max(120, 'Organization name must not exceed 120 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens')
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .optional(),
  useCase: z.enum(['media', 'academic', 'civic_tech', 'campaign', 'enterprise', 'individual']).optional(),
});

export const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(2, 'Key name must be at least 2 characters').max(80, 'Key name must not exceed 80 characters'),
  environment: z.enum(['live', 'test']),
  scopes: z.array(z.string()).min(1, 'At least one scope must be requested').optional(),
  applicationId: z.string().uuid('Invalid application ID format').optional(),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().uuid('Invalid API key ID format'),
});

export const checkoutBodySchema = z.object({
  targetTier: z.enum(['pro', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export const verifyPaymentBodySchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required'),
  paymentId: z.string().trim().min(1, 'Payment ID is required'),
  signature: z.string().trim().min(1, 'Cryptographic signature is required'),
  targetTier: z.enum(['pro', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;
export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type VerifyPaymentBody = z.infer<typeof verifyPaymentBodySchema>;
