-- RLS callers need EXECUTE even when the helper is SECURITY DEFINER.
-- These grants allow evaluating existing policies; they do not assign admin roles
-- or change table privileges, policy predicates, or anonymous access.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;