/**
 * POLIGRAM / KSHETRA PLATFORM CONTRACTS
 * Domain 8: AI Governance, Grounded News Intelligence & Cost Control (JOB 067–JOB 071)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

export type AIProviderType = 'gemini' | 'openai' | 'custom' | 'offline_heuristic';

export interface AIProviderConfig {
  name: AIProviderType;
  enabled: boolean;
  priority: number;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  headerName?: string;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  tenantId?: string;
  userId?: string;
  operation?: string;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProviderType;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  costInr: number;
  latencyMs: number;
  degradedOffline: boolean;
}

export interface NewsSummaryRequest {
  canonicalUrl: string;
  title: string;
  content: string;
  tenantId?: string;
  userId?: string;
}

export interface NewsSummaryRecord {
  id: string;
  contentSha256: string;
  canonicalUrl: string;
  title: string;
  summary3Bullet: [string, string, string];
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  keyEntities: string[];
  providerUsed: string;
  tokensUsed: number;
  estimatedCostUsd: number;
  hitCount: number;
  cacheHit: boolean;
  latencyMs: number;
  createdAt: string;
}

export type CivicTaxonomyCategory =
  | 'ROADS_TRAFFIC'
  | 'WATER_SUPPLY'
  | 'DRAINAGE_SEWERAGE'
  | 'SOLID_WASTE_SANITATION'
  | 'ELECTRICITY_LIGHTING'
  | 'PUBLIC_HEALTH_VECTOR'
  | 'ENVIRONMENT_TREES'
  | 'PUBLIC_INFRASTRUCTURE_PARKS';

export type CivicUrgencyLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';

export interface CivicClassificationRequest {
  description: string;
  stateCode?: string;
  acNo?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  tenantId?: string;
}

export interface CivicClassificationResult {
  category: CivicTaxonomyCategory;
  subcategory: string;
  department: string;
  urgency: CivicUrgencyLevel;
  confidence: number;
  deterministic: boolean;
  matchedRule?: string;
  aiFallbackUsed: boolean;
  providerUsed?: string;
  provisionalOffline?: boolean;
}

export interface AskPoligramRequest {
  query: string;
  stateCode?: string;
  acNo?: number;
  tenantId?: string;
  userId?: string;
}

export interface AskPoligramCitation {
  sourceTitle: string;
  documentType: 'ECI_FORM_20' | 'DELIMITATION_ORDER' | 'ELECTED_TENURE_REGISTER' | 'CIVIC_ISSUE_DATABASE';
  referenceId: string;
  url?: string;
  publicationYear?: number;
}

export interface AskPoligramResponse {
  answer: string;
  query: string;
  groundedContextSummary: string;
  citations: AskPoligramCitation[];
  deflectedInjection: boolean;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface TenantAIBudget {
  tenantId: string;
  tier: string;
  dailyTokenBudget: number;
  dailySpendLimitUsd: number;
  currentDayTokens: number;
  currentDaySpendUsd: number;
  circuitBreakerTripped: boolean;
  resetAt: string;
}

export interface AICostReport {
  tenantId: string;
  period: 'day' | 'week' | 'month';
  totalRequests: number;
  cacheHits: number;
  cacheHitRatio: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostInr: number;
  costByOperation: Record<string, { requests: number; tokens: number; costUsd: number }>;
  costByProvider: Record<string, { requests: number; tokens: number; costUsd: number }>;
  circuitBreakerTripped: boolean;
}
