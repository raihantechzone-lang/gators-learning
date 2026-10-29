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
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Gators Learning | বিশ্ববিদ্যালয় ভর্তি ও IELTS প্রস্তুতি" },
    { name: "description", content: "Gators Learning-এ বিশ্ববিদ্যালয় ভর্তি ও IELTS প্রস্তুতির অনলাইন কোর্স, লাইভ ক্লাস, ভিডিও লেসন, PDF নোট ও পরীক্ষার তথ্য দেখুন।" },
    { property: "og:title", content: "Gators Learning | বিশ্ববিদ্যালয় ভর্তি ও IELTS প্রস্তুতি" },
    { property: "og:description", content: "Gators Learning-এ বিশ্ববিদ্যালয় ভর্তি ও IELTS প্রস্তুতির অনলাইন কোর্স, লাইভ ক্লাস, ভিডিও লেসন, PDF নোট ও পরীক্ষার তথ্য দেখুন।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: "https://ik.imagekit.io/n7rgjyaxh/20260630_133004_0000.png?tr=w-1200,h-630,cm-pad_resize,bg-FFFFFF,f-jpg,q-80" },
    { name: "twitter:image", content: "https://ik.imagekit.io/n7rgjyaxh/20260630_133004_0000.png?tr=w-1200,h-630,cm-pad_resize,bg-FFFFFF,f-jpg,q-80" },
      { property: "og:url", content: "https://gators-learning.lovable.app/" },
  ], links: [{ rel: "canonical", href: "https://gators-learning.lovable.app/" }] }),
  server: {
    handlers: {
      GET: async () =>
        new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
