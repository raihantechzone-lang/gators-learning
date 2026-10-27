import { createFileRoute, redirect } from "@tanstack/react-router";
import { teacherMeta } from "@/lib/teachers";
export const Route = createFileRoute("/admin/settings")({
  head: () => teacherMeta("Admin Settings Redirect", "Return to the Gators Learning admin dashboard."),
  beforeLoad: () => { throw redirect({ to: "/admin", replace: true }); },
});
