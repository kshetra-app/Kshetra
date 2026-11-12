-- Civic community groups: make production writes durable, atomic, and role-safe.
-- Apply after 075_civic_platform_hardening.sql.

ALTER TABLE public.community_groups
  ADD COLUMN IF NOT EXISTS mandal TEXT,
  ADD COLUMN IF NOT EXISTS ward TEXT;

-- 075 initialized groups at 1 and then incremented when it inserted the admin,
-- so its count can be wrong. Reconcile counts from the membership rows first.
ALTER TABLE public.community_groups
  ALTER COLUMN member_count SET DEFAULT 0;

UPDATE public.community_groups AS groups
SET member_count = (
  SELECT count(*)::INTEGER
  FROM public.community_group_memberships AS memberships
  WHERE memberships.group_id = groups.id
);

CREATE OR REPLACE FUNCTION public.fn_sync_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_groups
    SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_groups
    SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Auth users create community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Creator update community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Public read community groups" ON public.community_groups;
CREATE POLICY "Public read community groups"
  ON public.community_groups FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read group memberships" ON public.community_group_memberships;
DROP POLICY IF EXISTS "Auth users manage own membership" ON public.community_group_memberships;
DROP POLICY IF EXISTS "Users read own community memberships" ON public.community_group_memberships;
DROP POLICY IF EXISTS "Users join community groups as members" ON public.community_group_memberships;
DROP POLICY IF EXISTS "Users leave community groups as members" ON public.community_group_memberships;

CREATE POLICY "Users read own community memberships"
  ON public.community_group_memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- Membership mutations go through the authenticated API and atomic RPCs only.

CREATE OR REPLACE FUNCTION public.create_civic_community_group(
  p_name TEXT,
  p_slug TEXT,
  p_constituency_id TEXT,
  p_description TEXT,
  p_category TEXT,
  p_mandal TEXT,
  p_ward TEXT,
  p_created_by UUID
)
RETURNS SETOF public.community_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_group public.community_groups;
BEGIN
  INSERT INTO public.community_groups (
    name, slug, constituency_id, description, category,
    mandal, ward, created_by, member_count, is_active
  ) VALUES (
    p_name, p_slug, p_constituency_id, p_description, p_category,
    p_mandal, p_ward, p_created_by, 0, TRUE
  ) RETURNING * INTO created_group;

  INSERT INTO public.community_group_memberships (group_id, user_id, role)
  VALUES (created_group.id, p_created_by, 'admin');

  SELECT * INTO created_group
  FROM public.community_groups
  WHERE id = created_group.id;

  RETURN NEXT created_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_civic_community_group(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_member_count INTEGER;
BEGIN
  PERFORM 1 FROM public.community_groups
  WHERE id = p_group_id AND is_active = TRUE
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  INSERT INTO public.community_group_memberships (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  SELECT member_count INTO current_member_count
  FROM public.community_groups WHERE id = p_group_id;
  RETURN current_member_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_civic_community_member_role(
  p_group_id UUID,
  p_target_user_id UUID,
  p_new_role TEXT,
  p_actor_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT;
  target_role TEXT;
  admin_count INTEGER;
BEGIN
  IF p_new_role NOT IN ('admin', 'moderator', 'member') THEN
    RAISE EXCEPTION 'INVALID_GROUP_ROLE';
  END IF;

  PERFORM 1 FROM public.community_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  SELECT role INTO actor_role
  FROM public.community_group_memberships
  WHERE group_id = p_group_id AND user_id = p_actor_user_id
  FOR UPDATE;
  IF actor_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT role INTO target_role
  FROM public.community_group_memberships
  WHERE group_id = p_group_id AND user_id = p_target_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF target_role = 'admin' AND p_new_role <> 'admin' THEN
    SELECT count(*)::INTEGER INTO admin_count
    FROM public.community_group_memberships
    WHERE group_id = p_group_id AND role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_GROUP_ADMIN';
    END IF;
  END IF;

  UPDATE public.community_group_memberships
  SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_target_user_id;
  RETURN p_new_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_civic_community_group(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role TEXT;
  admin_count INTEGER;
  current_member_count INTEGER;
BEGIN
  PERFORM 1 FROM public.community_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  SELECT role INTO current_role
  FROM public.community_group_memberships
  WHERE group_id = p_group_id AND user_id = p_user_id
  FOR UPDATE;

  IF current_role = 'admin' THEN
    SELECT count(*)::INTEGER INTO admin_count
    FROM public.community_group_memberships
    WHERE group_id = p_group_id AND role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_GROUP_ADMIN';
    END IF;
  END IF;

  DELETE FROM public.community_group_memberships
  WHERE group_id = p_group_id AND user_id = p_user_id;

  SELECT member_count INTO current_member_count
  FROM public.community_groups WHERE id = p_group_id;
  RETURN current_member_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_civic_community_group(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_civic_community_group(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_civic_community_member_role(UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_civic_community_group(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_civic_community_group(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_civic_community_group(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_civic_community_member_role(UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_civic_community_group(UUID, UUID) TO service_role;
