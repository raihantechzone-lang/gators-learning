import { createFileRoute } from "@tanstack/react-router";
import enrollHtml from "../html/course-enrollment.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";
import studentRollSource from "../lib/student-roll.js?raw";
import publicExperienceSource from "../lib/public-experience.js?raw";
import bkashLogo from "../assets/bkash-logo.png.asset.json";

const integration = integrationHtml.replace("/* STUDENT_ROLL_HELPER */", studentRollSource.replace("export function", "function"))
  .replace("/* PUBLIC_EXPERIENCE_HELPER */", publicExperienceSource.replaceAll("export function", "function"));

export const Route = createFileRoute("/enroll/$courseId")({
  head: () => ({ meta: [
    { title: "Course Enrollment | Gators Learning" },
    { name: "description", content: "View course lessons, materials and enrollment details on Gators Learning." },
    { property: "og:title", content: "Course Enrollment | Gators Learning" },
    { property: "og:description", content: "View course lessons, materials and enrollment details on Gators Learning." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { courseId } = params;
        const page = enrollHtml
          .replaceAll('__BKASH_LOGO__', bkashLogo.url)
          .replace("</body>", `<script>window.currentCourseId = ${JSON.stringify(courseId).replace(/</g, "\\u003c")};</script>\n${integration}\n</body>`);
        return new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
