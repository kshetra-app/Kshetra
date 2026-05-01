/**
 * Error Reporting Service
 *
 * Captures errors and sends to a reporting service (Sentry when configured).
 * Falls back to console logging in dev, silent in production.
 *
 * Setup:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Add EXPO_PUBLIC_SENTRY_DSN to .env
 * 3. Add Sentry plugin to app.json
 */

let Sentry: any = null;
let isInitialized = false;

try {
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not installed yet
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialize error reporting.
 * Call once in _layout.tsx.
 */
export function initErrorReporting(): void {
  if (isInitialized) return;

  if (Sentry && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      attachStacktrace: true,
    });
    isInitialized = true;
  }
}

/**
 * Capture an exception.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (__DEV__) {
    console.error('[ERROR]', error.message, context);
  }

  if (Sentry && isInitialized) {
    if (context) {
      Sentry.withScope((scope: any) => {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }
}

/**
 * Capture a message (non-error).
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (__DEV__) {
    console.log(`[${level.toUpperCase()}]`, message);
  }

  if (Sentry && isInitialized) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for error reports.
 */
export function setUser(userId: string | null, email?: string): void {
  if (Sentry && isInitialized) {
    if (userId) {
      Sentry.setUser({ id: userId, email });
    } else {
      Sentry.setUser(null);
    }
  }
}

/**
 * Add breadcrumb for debugging context.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (Sentry && isInitialized) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  }
}

/**
 * Start a performance transaction.
 */
export function startTransaction(name: string, op: string): any {
  if (Sentry && isInitialized) {
    return Sentry.startTransaction({ name, op });
  }
  return null;
}
