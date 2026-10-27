-- Run once on the existing external backend. No account passwords are created here.
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
DROP POLICY IF EXISTS teachers_public_read ON public.teachers;
CREATE POLICY teachers_public_read ON public.teachers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS teachers_admin_manage ON public.teachers;
CREATE POLICY teachers_admin_manage ON public.teachers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.course_teachers (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, teacher_id)
);
GRANT SELECT ON public.course_teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_teachers TO authenticated;
GRANT ALL ON public.course_teachers TO service_role;
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.teaches_course(target_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.course_teachers ct JOIN public.teachers t ON t.id = ct.teacher_id WHERE ct.course_id = target_course AND t.user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.teaches_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teaches_course(uuid) TO authenticated;
DROP POLICY IF EXISTS course_teachers_public_read ON public.course_teachers;
CREATE POLICY course_teachers_public_read ON public.course_teachers FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published = true));
DROP POLICY IF EXISTS course_teachers_authenticated_read ON public.course_teachers;
CREATE POLICY course_teachers_authenticated_read ON public.course_teachers FOR SELECT TO authenticated USING (public.is_admin() OR public.teaches_course(course_id) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published = true));
DROP POLICY IF EXISTS course_teachers_admin_manage ON public.course_teachers;
CREATE POLICY course_teachers_admin_manage ON public.course_teachers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Atomically replace assignments; only a verified admin can call this.
CREATE OR REPLACE FUNCTION public.set_course_teachers(target_course uuid, teacher_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(teacher_ids) t(id) WHERE NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = t.id)) THEN RAISE EXCEPTION 'Unknown teacher'; END IF;
  DELETE FROM public.course_teachers WHERE course_id = target_course;
  INSERT INTO public.course_teachers(course_id, teacher_id) SELECT target_course, id FROM (SELECT DISTINCT unnest(teacher_ids) AS id) ids;
END $$;
REVOKE ALL ON FUNCTION public.set_course_teachers(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_course_teachers(uuid, uuid[]) TO authenticated;

-- Secure assigned-course content at the database boundary, not just in the page.
-- Replace legacy permissive policies, retaining admin/free/verified-student access.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'course_contents' LOOP
    EXECUTE format('DROP POLICY %I ON public.course_contents', p.policyname);
  END LOOP;
END $$;
GRANT SELECT ON public.course_contents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_contents TO authenticated;
GRANT ALL ON public.course_contents TO service_role;
ALTER TABLE public.course_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_contents_free_read ON public.course_contents FOR SELECT TO anon, authenticated USING (is_free = true);
CREATE POLICY course_contents_student_read ON public.course_contents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.profile_id = auth.uid() AND e.course_id = course_contents.course_id AND (e.payment_status = 'verified' OR (e.status = 'active' AND e.payment_status IS NULL))));
CREATE POLICY course_contents_teacher_manage ON public.course_contents FOR ALL TO authenticated USING (public.teaches_course(course_id)) WITH CHECK (public.teaches_course(course_id));
CREATE POLICY course_contents_admin_manage ON public.course_contents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
COMMIT;