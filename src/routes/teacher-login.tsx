import { createFileRoute, redirect } from "@tanstack/react-router";
import { teacherMeta } from "@/lib/teachers";
export const Route = createFileRoute("/teacher-login")({
  staticData: { sitemap: false },
  head: () => teacherMeta("Account Login Redirect", "Log in to Gators Learning with your account credentials."),
  beforeLoad: () => { throw redirect({ to: "/auth", search: { mode: "login" }, replace: true }); },
});
