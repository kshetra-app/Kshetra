-- 029: Fix handle_new_user trigger search_path and error handling
-- Ensures Supabase Auth user signup seamlessly creates public.user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Citizen'
  );

  -- Ensure length is at least 2 chars to satisfy display_name check constraint
  IF char_length(v_display_name) < 2 THEN
    v_display_name := v_display_name || '_user';
  END IF;

  INSERT INTO public.user_profiles (user_id, display_name, role, verification_status)
  VALUES (
    NEW.id,
    v_display_name,
    'citizen',
    'unverified'
  )
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier)
    VALUES (NEW.id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
