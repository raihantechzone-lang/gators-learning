-- Updated setup: teachers use admin-issued names/passwords through managed Auth.
-- Run on the connected external backend. Do not put passwords into SQL.
BEGIN;
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  photo_url text,
  title text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS login_name text;
CREATE UNIQUE INDEX IF NOT EXISTS teachers_login_name_unique ON public.teachers(login_name) WHERE login_name IS NOT NULL;
DROP POLICY IF EXISTS teachers_public_read ON public.teachers;
CREATE POLICY teachers_public_read ON public.teachers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS teachers_admin_manage ON public.teachers;
CREATE POLICY teachers_admin_manage ON public.teachers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only admins can bind accounts. This reads managed Auth identities but NEVER writes them.
CREATE OR REPLACE FUNCTION public.teacher_login_exists(login_name_input text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN EXISTS (SELECT 1 FROM public.teachers WHERE login_name = login_name_input);
END $$;
REVOKE ALL ON FUNCTION public.teacher_login_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_login_exists(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_teacher_account(
  account_id uuid, login_name_input text, teacher_name text,
  teacher_photo text DEFAULT NULL, teacher_title text DEFAULT NULL, teacher_bio text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE normalized_name text; expected_email text; result_id uuid;
BEGIN
  IF public.is_admin() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Admin access required'; END IF;
  normalized_name := lower(regexp_replace(trim(normalize(teacher_name, NFC)), '\s+', ' ', 'g'));
  IF length(normalized_name) < 2 OR length(normalized_name) > 80 OR login_name_input <> normalized_name THEN
    RAISE EXCEPTION 'Invalid teacher name';
  END IF;
  IF length(coalesce(teacher_bio, '')) > 10000 OR length(coalesce(teacher_title, '')) > 500 OR length(coalesce(teacher_photo, '')) > 2048 THEN
    RAISE EXCEPTION 'Teacher profile is too long';
  END IF;
  expected_email := encode(digest(convert_to(normalized_name, 'UTF8'), 'sha256'), 'hex') || '@teachers.gators.invalid';
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = account_id AND email = expected_email AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirmed teacher login account required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.teachers WHERE login_name = normalized_name OR user_id = account_id) THEN
    RAISE EXCEPTION 'Teacher name or account already exists';
  END IF;
  INSERT INTO public.teachers(user_id, login_name, display_name, photo_url, title, bio)
  VALUES (account_id, normalized_name, trim(teacher_name), teacher_photo, teacher_title, teacher_bio)
  RETURNING id INTO result_id;
  RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.register_teacher_account(uuid,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_teacher_account(uuid,text,text,text,text,text) TO authenticated;


COMMIT;
