-- The Live API owns state transitions and approval. Keep reads under existing RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.live_events FROM anon, authenticated;
