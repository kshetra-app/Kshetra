/**
 * Mobile Telemetry & Structured Logging Seam (JOB W004 / DEC-020)
 * 
 * Provides client-side structured event logging, breadcrumb collection,
 * and correlation header generation for outgoing API requests.
 * Zero external native dependencies; maintains strict <= 30MB app budget.
 */

export type TelemetryLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TelemetryBreadcrumb {
  timestamp: string;
  category: 'navigation' | 'network' | 'user_action' | 'lifecycle' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface TelemetryLogEntry {
  level: TelemetryLogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  timestamp: string;
}

class MobileTelemetry {
  private breadcrumbs: TelemetryBreadcrumb[] = [];
  private readonly maxBreadcrumbs = 50;

  /**
   * Generates a random standard UUID v4 string without external libraries.
   */
  generateRequestId(): string {
    // RFC4122 v4 compliant UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Attaches standard tracing and correlation headers to an outgoing HTTP request.
   */
  getTracingHeaders(customRequestId?: string): Record<string, string> {
    const requestId = customRequestId || this.generateRequestId();
    return {
      'x-request-id': requestId,
      'x-client-platform': 'mobile-react-native',
      'x-client-version': '0.1.0',
    };
  }

  /**
   * Records a user/lifecycle breadcrumb for post-mortem diagnostics.
   */
  addBreadcrumb(breadcrumb: Omit<TelemetryBreadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    });

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  getBreadcrumbs(): readonly TelemetryBreadcrumb[] {
    return this.breadcrumbs;
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
    this.addBreadcrumb({
      category: 'error',
      message,
      data: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  private log(level: TelemetryLogLevel, message: string, context?: Record<string, unknown>, error?: unknown): void {
    const entry: TelemetryLogEntry = {
      level,
      message,
      context,
      error,
      timestamp: new Date().toISOString(),
    };

    if (__DEV__) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, message, context || '', error || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, context || '');
      } else {
        console.log(prefix, message, context || '');
      }
    }
  }
}

export const telemetry = new MobileTelemetry();
