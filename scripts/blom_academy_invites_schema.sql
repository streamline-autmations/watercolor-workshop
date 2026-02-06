CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN user_id uuid';
    EXECUTE 'UPDATE public.profiles SET user_id = id WHERE user_id IS NULL';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_profiles_ids() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.id := NEW.user_id;
  END IF;
  IF NEW.user_id IS NULL AND NEW.id IS NOT NULL THEN
    NEW.user_id := NEW.id;
  END IF;
  IF NEW.full_name IS NULL THEN
    NEW.full_name := trim(both ' ' from coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,''));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'tr_sync_profiles_ids'
    ) THEN
      EXECUTE 'CREATE TRIGGER tr_sync_profiles_ids BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_ids()';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.enrollments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrollments' AND policyname='enrollments_select_own') THEN
    EXECUTE 'CREATE POLICY enrollments_select_own ON public.enrollments FOR SELECT USING (user_id = auth.uid())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrollments' AND policyname='enrollments_insert_own') THEN
    EXECUTE 'CREATE POLICY enrollments_insert_own ON public.enrollments FOR INSERT WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.course_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.course_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_invites' AND policyname='course_invites_service_role_all') THEN
    EXECUTE 'CREATE POLICY course_invites_service_role_all ON public.course_invites FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.course_invites_admin AS
SELECT
  ci.*,
  c.slug AS course_slug,
  c.title AS course_title
FROM public.course_invites ci
JOIN public.courses c ON c.id = ci.course_id;

CREATE OR REPLACE FUNCTION public._jwt_role() RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '');
$$;

CREATE OR REPLACE FUNCTION public._is_admin_user(p_user_id uuid) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_user_id OR p.id = p_user_id)
      AND lower(coalesce(p.role,'')) IN ('admin','owner','staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.create_course_invite(
  p_course_id text,
  p_email text,
  p_expires_in_days integer DEFAULT 30
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_token text;
  v_expires_at timestamptz;
BEGIN
  IF p_course_id IS NULL OR length(trim(p_course_id)) = 0 THEN
    RAISE EXCEPTION 'p_course_id is required';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'p_email is required';
  END IF;

  BEGIN
    v_course_id := p_course_id::uuid;
  EXCEPTION WHEN others THEN
    SELECT id INTO v_course_id FROM public.courses WHERE slug = p_course_id;
  END;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + make_interval(days => greatest(1, coalesce(p_expires_in_days, 30)));

  INSERT INTO public.course_invites(course_id, email, token, expires_at, created_by)
  VALUES (v_course_id, lower(trim(p_email)), v_token, v_expires_at, auth.uid());

  RETURN json_build_object('token', v_token, 'course_id', v_course_id, 'expires_at', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_course_invite(
  p_token text,
  p_user_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite record;
  v_course_slug text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'p_token is required';
  END IF;

  v_user_id := coalesce(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.course_invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_invite.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already redeemed';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  INSERT INTO public.enrollments(user_id, course_id)
  VALUES (v_user_id, v_invite.course_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.course_invites
  SET redeemed_at = now(),
      redeemed_by = v_user_id
  WHERE id = v_invite.id;

  SELECT slug INTO v_course_slug FROM public.courses WHERE id = v_invite.course_id;

  RETURN json_build_object('course_id', v_invite.course_id, 'course_slug', v_course_slug);
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_user_by_id(
  p_user_id uuid,
  p_course_slugs text[]
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created int := 0;
  v_rowcount int := 0;
  v_slug text;
  v_course_id uuid;
  v_role text;
  v_caller uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_course_slugs IS NULL OR array_length(p_course_slugs, 1) IS NULL THEN
    RAISE EXCEPTION 'p_course_slugs is required';
  END IF;

  v_role := public._jwt_role();
  v_caller := auth.uid();

  IF v_role <> 'service_role' AND NOT public._is_admin_user(v_caller) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOREACH v_slug IN ARRAY p_course_slugs LOOP
    SELECT id INTO v_course_id FROM public.courses WHERE slug = v_slug;
    IF v_course_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.enrollments(user_id, course_id)
    VALUES (p_user_id, v_course_id)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_created := v_created + v_rowcount;
  END LOOP;

  RETURN json_build_object('success', true, 'enrollments_created', v_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile_simple(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_caller uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  v_role := public._jwt_role();
  v_caller := auth.uid();

  IF v_role <> 'service_role' AND v_caller IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    INSERT INTO public.profiles(user_id, first_name, last_name, phone)
    VALUES (p_user_id, p_first_name, p_last_name, p_phone)
    ON CONFLICT (user_id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          updated_at = now();
  ELSE
    INSERT INTO public.profiles(id, first_name, last_name, phone)
    VALUES (p_user_id, p_first_name, p_last_name, p_phone)
    ON CONFLICT (id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          updated_at = now();
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_invites TO anon, authenticated, service_role;
GRANT SELECT ON public.course_invites_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_course_invite(text, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_course_invite(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enroll_user_by_id(uuid, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_simple(uuid, text, text, text) TO anon, authenticated, service_role;
