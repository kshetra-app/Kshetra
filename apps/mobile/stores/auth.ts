import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { bootstrapSupabase, teardownSupabase } from '../lib/supabaseBootstrap';
import { apiClient } from '../lib/api';
import { startProductAnalyticsSession, trackProductEvent } from '../lib/analytics';
import { useNotificationsStore } from './notifications';
import { useContributorVerificationStore, clearLegacyContributorVerificationCache } from './contributorVerification';
import { purgeLegacyKycSubmissions } from '../lib/offlineSync';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    await Promise.all([clearLegacyContributorVerificationCache(), Promise.resolve(purgeLegacyKycSubmissions())]);
    if (!useNotificationsStore.persist.hasHydrated()) {
      await useNotificationsStore.persist.rehydrate();
    }

    if (!isSupabaseConfigured) {
      useContributorVerificationStore.getState().setOwnerUserId(null);
      set({ initialized: true });
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
        initialized: true,
      });
      useNotificationsStore.getState().setOwnerUserId(session?.user.id ?? null);
      useContributorVerificationStore.getState().setOwnerUserId(session?.user.id ?? null);

      // Bootstrap backend connection if session exists
      if (session) {
        bootstrapSupabase();
        startProductAnalyticsSession();
        void trackProductEvent(apiClient, 'app_session_started', { screen: '/app' });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
        useNotificationsStore.getState().setOwnerUserId(session?.user.id ?? null);
        useContributorVerificationStore.getState().setOwnerUserId(session?.user.id ?? null);
        if (session) {
          bootstrapSupabase();
        } else {
          teardownSupabase();
        }
      });
    } catch {
      set({ initialized: true });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ loading: false });
    if (!error) {
      startProductAnalyticsSession();
      void trackProductEvent(apiClient, 'app_session_started', { screen: '/auth/sign-in' });
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    set({ loading: false });
    if (!error && data.session) {
      startProductAnalyticsSession();
      void trackProductEvent(apiClient, 'signup_completed', { screen: '/auth/sign-up' });
    }
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    set({ loading: true });
    teardownSupabase();
    await supabase.auth.signOut();
    set({ session: null, user: null, loading: false });
  },
}));
