-- External database only. Run this entire file in the database SQL editor.
-- Lesson comments publish immediately; homepage reviews still require approval.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_valid_lesson_comment(review_course uuid, review_comment text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT review_course IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.course_contents lesson
   WHERE lesson.course_id = review_course
     AND left(coalesce(review_comment, ''), 46) = '[lesson:' || lesson.id::text || '] '
     AND length(btrim(substring(review_comment FROM 47))) > 0
 );
$$;
REVOKE ALL ON FUNCTION public.is_valid_lesson_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_lesson_comment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_lesson_comment_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE admin_user boolean := false;
BEGIN
 IF to_regprocedure('public.teacher_is_admin()') IS NOT NULL THEN
   EXECUTE 'SELECT public.teacher_is_admin()' INTO admin_user;
 ELSE
   admin_user := public.is_admin();
 END IF;
 IF coalesce(admin_user, false) THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NEW.profile_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Invalid review owner';
 END IF;
 IF TG_OP = 'UPDATE' THEN
   IF NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.course_id IS DISTINCT FROM OLD.course_id THEN
     RAISE EXCEPTION 'Review ownership cannot change';
   END IF;
 END IF;
 IF NEW.rating IS NULL OR NEW.rating NOT BETWEEN 1 AND 5
    OR length(coalesce(NEW.comment, '')) NOT BETWEEN 1 AND 10000 THEN
   RAISE EXCEPTION 'Invalid review';
 END IF;
 IF NEW.course_id IS NOT NULL THEN
   IF NOT public.is_valid_lesson_comment(NEW.course_id, NEW.comment) THEN
     RAISE EXCEPTION 'Invalid lesson comment';
   END IF;
   NEW.is_approved := true;
 ELSIF coalesce(NEW.is_approved, false) THEN
   RAISE EXCEPTION 'Review approval requires administrator';
 ELSE
   NEW.is_approved := false;
 END IF;
 RETURN NEW;
END;
$$;

-- Replace the conflicting known guards, without touching other table policies.
DROP TRIGGER IF EXISTS guard_review_approval ON public.reviews;
DROP TRIGGER IF EXISTS security_review_guard ON public.reviews;
DROP TRIGGER IF EXISTS zz_auto_approve_lesson_comment ON public.reviews;
DROP TRIGGER IF EXISTS zz_publish_lesson_comment ON public.reviews;
CREATE TRIGGER zz_publish_lesson_comment BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.publish_lesson_comment_guard();

GRANT SELECT, INSERT ON public.reviews TO authenticated;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_comment_insert ON public.reviews;
CREATE POLICY lesson_comment_insert ON public.reviews FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid() AND is_approved = true
 AND public.is_valid_lesson_comment(course_id, comment));
DROP POLICY IF EXISTS lesson_comment_read ON public.reviews;
CREATE POLICY lesson_comment_read ON public.reviews FOR SELECT TO authenticated
USING (is_approved = true AND public.is_valid_lesson_comment(course_id, comment));
COMMIT;