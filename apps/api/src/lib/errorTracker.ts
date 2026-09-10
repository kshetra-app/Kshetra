/**
 * Operational Error Tracker & Classification Engine (JOB W004-R1 / Amendment v1.4)
 * 
 * Provides production-grade error categorization and routing:
 * - Structured log events via Fastify/Pino (standard Railway/cloud ingestion destination)
 * - Sentry / external error sink seam (if SENTRY_DSN configured)
 * - Prevents alert fatigue by classifying client 4xx vs operational 5xx incidents
 * - Guarantees error monitoring failures NEVER crash the API
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorCategory =
  | 'CLIENT_VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'DATABASE_FAILURE'
  | 'UPSTREAM_PROVIDER'
  | 'UNHANDLED_SERVER_ERROR';

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isOperationalIncident: boolean;
  statusCode: number;
}

export interface ErrorEventPayload {
  eventId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  message: string;
  requestId: string;
  environment: string;
  url?: string;
  method?: string;
  timestamp: string;
  errorName?: string;
  stackTraceSanitized?: string;
}

/**
 * Classify errors into standard operational buckets.
 * Avoids treating expected 4xx client errors as production incidents.
 */
export function classifyError(error: any, statusCode: number): ClassifiedError {
  const code = error?.code || '';
  const message = (error?.message || '').toLowerCase();

  // Database failure checks
  if (
    statusCode === 503 ||
    code.startsWith('PGRST') ||
    code.startsWith('28') ||
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('timeout')
  ) {
    return {
      category: 'DATABASE_FAILURE',
      severity: 'critical',
      isOperationalIncident: true,
      statusCode: statusCode || 503,
    };
  }

  // Authentication & Authorization
  if (statusCode === 401) {
    return {
      category: 'AUTHENTICATION',
      severity: 'warning',
      isOperationalIncident: false,
      statusCode: 401,
    };
  }
  if (statusCode === 403) {
    return {
      category: 'AUTHORIZATION',
      severity: 'warning',
      isOperationalIncident: false,
      statusCode: 403,
    };
  }

  // Rate Limiting
  if (statusCode === 429) {
    return {
      category: 'RATE_LIMIT',
      severity: 'warning',
      isOperationalIncident: false,
      statusCode: 429,
    };
  }

  // Not Found
  if (statusCode === 404) {
    return {
      category: 'NOT_FOUND',
      severity: 'info',
      isOperationalIncident: false,
      statusCode: 404,
    };
  }

  // Client Validation / Bad Request
  if (statusCode >= 400 && statusCode < 500) {
    return {
      category: 'CLIENT_VALIDATION',
      severity: 'warning',
      isOperationalIncident: false,
      statusCode,
    };
  }

  // Upstream third-party integration failure
  if (message.includes('upstream') || message.includes('provider') || message.includes('gateway')) {
    return {
      category: 'UPSTREAM_PROVIDER',
      severity: 'error',
      isOperationalIncident: true,
      statusCode: statusCode || 502,
    };
  }

  // Unhandled internal server error
  return {
    category: 'UNHANDLED_SERVER_ERROR',
    severity: 'error',
    isOperationalIncident: true,
    statusCode: statusCode || 500,
  };
}

class ErrorTracker {
  private sentryClient: any = null;
  private isSentryInitialized = false;

  constructor() {
    const dsn = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (dsn) {
      try {
        // Attempt dynamic optional require of @sentry/node if installed in environment
        this.sentryClient = require('@sentry/node');
        this.sentryClient.init({
          dsn,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        });
        this.isSentryInitialized = true;
      } catch {
        // Sentry dependency is optional; structured logs serve as canonical sink
      }
    }
  }

  /**
   * Capture and route an error event to structured log outputs and external sinks.
   * Guaranteed never to throw or disrupt request handling.
   */
  captureError(params: {
    error: any;
    statusCode: number;
    requestId: string;
    url?: string;
    method?: string;
    logger?: any;
  }): ErrorEventPayload {
    try {
      const classification = classifyError(params.error, params.statusCode);
      const env = process.env.NODE_ENV || 'development';

      const payload: ErrorEventPayload = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        category: classification.category,
        severity: classification.severity,
        statusCode: classification.statusCode,
        message: params.error?.message || 'Unknown error',
        requestId: params.requestId,
        environment: env,
        url: params.url,
        method: params.method,
        timestamp: new Date().toISOString(),
        errorName: params.error?.name || 'Error',
      };

      // Only include stack trace if not in production or for internal structured log
      if (params.error?.stack && env !== 'production') {
        payload.stackTraceSanitized = params.error.stack;
      }

      // Log event via logger with structured error telemetry tags
      if (params.logger) {
        const logMethod = classification.severity === 'critical' || classification.severity === 'error'
          ? params.logger.error.bind(params.logger)
          : params.logger.warn.bind(params.logger);

        logMethod({
          event: 'APPLICATION_ERROR_EVENT',
          errorCategory: classification.category,
          severity: classification.severity,
          isOperationalIncident: classification.isOperationalIncident,
          requestId: params.requestId,
          statusCode: classification.statusCode,
          environment: env,
          url: params.url,
          method: params.method,
          err: {
            name: params.error?.name,
            message: params.error?.message,
            stack: env !== 'production' ? params.error?.stack : undefined,
          },
          msg: `[${classification.category}] ${params.error?.message || 'Error occurred'}`,
        });
      }

      // Route to Sentry if initialized
      if (this.isSentryInitialized && this.sentryClient && classification.isOperationalIncident) {
        this.sentryClient.withScope((scope: any) => {
          scope.setTag('environment', env);
          scope.setTag('requestId', params.requestId);
          scope.setTag('category', classification.category);
          scope.setExtra('url', params.url);
          scope.setExtra('method', params.method);
          this.sentryClient.captureException(params.error);
        });
      }

      return payload;
    } catch (sinkErr) {
      // Safe fallback: monitoring failure must NEVER break the API
      console.error('[ErrorTracker Fallback Error]', sinkErr);
      return {
        eventId: 'fallback_error',
        category: 'UNHANDLED_SERVER_ERROR',
        severity: 'error',
        statusCode: params.statusCode || 500,
        message: params.error?.message || 'Error occurred',
        requestId: params.requestId,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const errorTracker = new ErrorTracker();
