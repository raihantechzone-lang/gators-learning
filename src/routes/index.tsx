import { createFileRoute } from "@tanstack/react-router";
// The homepage is served exactly as authored (HTML/CSS/JS untouched).
// Only an extra script is appended for auth + database wiring.
import homepageHtml from "../html/homepage.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";
import studentRollSource from "../lib/student-roll.js?raw";
import publicExperienceSource from "../lib/public-experience.js?raw";

const integration = integrationHtml.replace("/* STUDENT_ROLL_HELPER */", studentRollSource.replace("export function", "function"))
  .replace("/* PUBLIC_EXPERIENCE_HELPER */", publicExperienceSource.replaceAll("export async function", "async function").replaceAll("export function", "function"));
const page = homepageHtml.replace("</body>", `${integration}\n</body>`);

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gators Learning | Courses and Online Classes" },
    { name: "description", content: "Explore Gators Learning courses, video lessons and online classes." },
    { property: "og:title", content: "Gators Learning | Courses and Online Classes" },
    { property: "og:description", content: "Explore Gators Learning courses, video lessons and online classes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:image", content: "https://ik.imagekit.io/n7rgjyaxh/20260630_133004_0000.png" },
    { name: "twitter:image", content: "https://ik.imagekit.io/n7rgjyaxh/20260630_133004_0000.png" },
  ] }),
  server: {
    handlers: {
      GET: async () =>
        new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
