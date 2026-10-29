import { createFileRoute } from "@tanstack/react-router";
import enrollHtml from "../html/course-enrollment.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";
import studentRollSource from "../lib/student-roll.js?raw";
import publicExperienceSource from "../lib/public-experience.js?raw";
import videoControlsSource from "../lib/video-controls.js?raw";
import bkashLogo from "../assets/bkash-logo.png.asset.json";
import { getPublicPageInfo } from '@/lib/page-seo.functions';
import { enrollmentSEOHTML, pageSEO } from '@/lib/page-seo';

const integration = integrationHtml.replace("/* STUDENT_ROLL_HELPER */", studentRollSource.replace("export function", "function"))
  .replace("/* PUBLIC_EXPERIENCE_HELPER */", publicExperienceSource.replaceAll("export async function", "async function").replaceAll("export function", "function"));

export const Route = createFileRoute("/enroll/$courseId")({
  staticData: { sitemap: true },
  loader: ({ params }) => getPublicPageInfo({ data: { kind: 'enrollment', id: params.courseId } }),
  head: ({ params, loaderData }) => pageSEO('enrollment', params.courseId, loaderData),
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { courseId } = params;
        const { readPublicPageInfo } = await import('@/lib/page-seo.server');
        const info = await readPublicPageInfo('enrollment', courseId);
        const page = enrollmentSEOHTML(enrollHtml, courseId, info)
          .replaceAll('__BKASH_LOGO__', bkashLogo.url)
          .replace('/* VIDEO_CONTROLS_HELPER */', videoControlsSource.replaceAll('export async function', 'async function').replaceAll('export function', 'function').replaceAll('export const', 'const'))
          .replace("</body>", `<script>window.currentCourseId = ${JSON.stringify(courseId).replace(/</g, "\\u003c")};</script>\n${integration}\n</body>`);
        return new Response(page, {
          status: info.state === 'unavailable' ? 503 : info.state === 'missing' ? 404 : 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
