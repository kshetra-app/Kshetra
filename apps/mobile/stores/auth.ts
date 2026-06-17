import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { bootstrapSupabase, teardownSupabase } from '../lib/supabaseBootstrap';

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
    if (!isSupabaseConfigured) {
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

      // Bootstrap backend connection if session exists
      if (session) {
        bootstrapSupabase();
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
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
      // Auth state change listener will trigger bootstrap
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    set({ loading: true });
    teardownSupabase();
    await supabase.auth.signOut();
    set({ session: null, user: null, loading: false });
  },
}));
