import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/details/$courseId")({
  server: {
    handlers: {
      GET: async ({ params }) => new Response(null, {
        status: 301,
        headers: { location: `/enroll/${encodeURIComponent(params.courseId)}` },
      }),
    },
  },
});
