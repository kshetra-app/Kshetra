import React, { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }

    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setChecking(false);
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(error ? null : data.session);
        setChecking(false);
      }
    }).catch(() => {
      if (active) {
        setSession(null);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-[#0b1020] grid place-items-center text-slate-300">Checking admin session…</div>;
  }
  if (!supabase) {
    return <div role="alert" className="min-h-screen bg-[#0b1020] grid place-items-center px-4 text-center text-amber-200">Secure administrator sign-in is not configured for this environment.</div>;
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setError('Secure administrator sign-in is not configured for this environment.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } catch {
      setError('Administrator sign-in could not be completed. Check the connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1020] grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Poligram Admin</h1>
          <p className="text-sm text-slate-400 mt-2">Sign in with your Supabase account. The API checks administrator permissions for protected actions.</p>
        </div>
        <label className="block text-sm text-slate-300">Email
          <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
        </label>
        <label className="block text-sm text-slate-300">Password
          <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
