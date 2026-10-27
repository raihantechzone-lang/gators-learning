import { createFileRoute } from "@tanstack/react-router";
import { teacherMeta } from '@/lib/teachers';

export const Route = createFileRoute("/details/$courseId")({
  head: () => teacherMeta('Course Enrollment Redirect', 'Continue to Gators Learning course enrollment.'),
  server: {
    handlers: {
      GET: async ({ params }) => new Response(null, {
        status: 301,
        headers: { location: `/enroll/${encodeURIComponent(params.courseId)}` },
      }),
    },
  },
});
