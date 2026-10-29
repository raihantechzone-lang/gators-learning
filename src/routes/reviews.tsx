import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ReviewsSection } from "@/components/site/Reviews";

export const Route = createFileRoute("/reviews")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Student Reviews — Gators Learning" },
      { name: "description", content: "Read verified reviews from Gators Learning students and share your own experience." },
      { property: "og:title", content: "Student Reviews — Gators Learning" },
      { property: "og:description", content: "Verified reviews from our admission and IELTS students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://gators-learning.lovable.app/reviews" },
    ],
    links: [{ rel: "canonical", href: "https://gators-learning.lovable.app/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24 sm:pt-32">
        <ReviewsSection pageHeading />
      </main>
      <SiteFooter />
    </div>
  );
}
