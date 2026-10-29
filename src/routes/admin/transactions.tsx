import { createFileRoute, redirect } from "@tanstack/react-router";
import { teacherMeta } from "@/lib/teachers";
export const Route = createFileRoute("/admin/transactions")({
  staticData: { sitemap: false },
  head: () => teacherMeta("Payment Verification Redirect", "Verify Gators Learning course enrollment payments."),
  beforeLoad: () => { throw redirect({ to: "/admin/course-verification", replace: true }); },
});
