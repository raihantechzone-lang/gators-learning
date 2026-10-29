-- Gators Learning: targeted refund repair for the existing EXTERNAL database.
-- Does not replace policies or change enrollment status constraints.
BEGIN;
CREATE OR REPLACE FUNCTION public.course_access_allowed(target_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.enrollments e
  WHERE e.profile_id=auth.uid() AND e.course_id=target_course
  AND lower(btrim(coalesce(e.status::text,''))) NOT IN ('refunded','cancelled','canceled','revoked','expired')
  AND lower(btrim(coalesce(e.payment_status::text,''))) NOT IN ('refunded','cancelled','canceled','revoked','expired')
  AND (e.payment_status::text='verified' OR (e.status::text='active' AND e.payment_status IS NULL))
 )
$$;
REVOKE ALL ON FUNCTION public.course_access_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_access_allowed(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.approve_course_refund(request_id uuid,note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text='admin'
 ) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF note IS NULL OR length(note)>10000 THEN RAISE EXCEPTION 'Invalid refund note'; END IF;
 SELECT * INTO r FROM public.refund_requests WHERE id=request_id FOR UPDATE;
 IF NOT FOUND OR r.status::text<>'pending' THEN RAISE EXCEPTION 'Pending refund not found'; END IF;
 IF r.course_id IS NULL THEN RAISE EXCEPTION 'Refund course required'; END IF;
 -- Revoke every duplicate enrollment atomically. Pending is an existing valid
 -- payment value; do not write refunded to the constrained enrollment status.
 UPDATE public.enrollments SET payment_status='pending',certificate_url=NULL
 WHERE profile_id=r.user_id AND course_id=r.course_id;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected=0 THEN RAISE EXCEPTION 'Refund enrollment not found'; END IF;
 UPDATE public.refund_requests SET status='approved',admin_note=note,processed_at=now()
 WHERE id=request_id;
 IF r.invoice_id IS NOT NULL AND to_regclass('public.invoices') IS NOT NULL THEN
  EXECUTE 'UPDATE public.invoices SET status=''refunded'' WHERE id=$1' USING r.invoice_id;
 END IF;
END
$$;
REVOKE ALL ON FUNCTION public.approve_course_refund(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_course_refund(uuid,text) TO authenticated;
COMMIT;
-- Existing visible_course_lessons and paid-lesson policies must call
-- course_access_allowed. This repair intentionally leaves unrelated policies intact.