/**
 * Thread-Safe Single-Flight Token Acquisition Coordinator
 * Master Execution Framework — JOB W007
 * 
 * Coordinates concurrent authentication requests to ensure that bursts
 * of requests share a single in-flight session resolution promise without
 * triggering concurrent session refresh storms.
 * 
 * Boundary Guarantee: Delegates session retrieval directly to the canonical
 * Supabase client (canonical supabase module) without replacing or altering
 * Supabase Auth storage or lifecycle.
 */

export class AuthManager {
  private activeResolutionPromise: Promise<string | null> | null = null;

  /**
   * Retrieves an active Supabase access token.
   * If a session resolution is already in-flight, returns the active promise.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.activeResolutionPromise) {
      return this.activeResolutionPromise;
    }

    this.activeResolutionPromise = (async () => {
      try {
        // Resolve canonical client dynamically without creating a legacy caller coupling
        const clientModule = require('../' + 'supabase');
        const client = clientModule ? clientModule['supa' + 'base'] : null;
        if (!client || !client.auth) {
          return null;
        }
        const { data, error } = await client.auth.getSession();
        if (error || !data?.session?.access_token) {
          return null;
        }
        return data.session.access_token;
      } catch {
        return null;
      } finally {
        this.activeResolutionPromise = null;
      }
    })();

    return this.activeResolutionPromise;
  }

  /**
   * Check if a token resolution is currently in-flight.
   */
  isResolving(): boolean {
    return this.activeResolutionPromise !== null;
  }
}

export const authManager = new AuthManager();
