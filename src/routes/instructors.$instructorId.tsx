import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { Course } from "@/lib/data";
import { getPublicPageInfo } from '@/lib/page-seo.functions';
import { pageSEO } from '@/lib/page-seo';

export const Route = createFileRoute("/instructors/$instructorId")({
  staticData: { sitemap: false },
  loader: ({ params }) => getPublicPageInfo({ data: { kind: 'instructor', id: params.instructorId } }),
  head: ({ params, loaderData }) => pageSEO('instructor', params.instructorId, loaderData),
  component: InstructorPublicPage,
});

interface PublicInstructor {
  id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  expertise: string | null;
  status: string;
}

function InstructorPublicPage() {
  const { instructorId } = Route.useParams();
  const [profile, setProfile] = useState<PublicInstructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    setProfile(null);
    setCourses([]);
    (async () => {
      try {
      const [{ data: p, error: profileError }, { data: c, error: coursesError }] = await Promise.all([
        supabase.from("instructor_profiles").select("id, display_name, bio, photo_url, expertise, status").eq("id", instructorId).maybeSingle(),
        supabase.from("courses").select("*").eq("instructor_id", instructorId).eq("status", "published").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (profileError || coursesError) throw new Error("Instructor information unavailable");
      setProfile((p as PublicInstructor) ?? null);
      setCourses((c as Course[]) ?? []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instructorId]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {busy ? (
          <section aria-busy="true"><h1 className="text-2xl font-bold text-ink">শিক্ষকের পরিচিতি লোড হচ্ছে…</h1></section>
        ) : failed ? (
          <section role="alert"><h1 className="text-2xl font-bold text-ink">শিক্ষকের তথ্য লোড করা যায়নি</h1><p className="text-ink-muted mt-3">কিছুক্ষণ পর আবার চেষ্টা করুন।</p></section>
        ) : !profile?.display_name?.trim() || profile.status !== "approved" ? (
          <section><h1 className="text-2xl font-bold text-ink">শিক্ষকের পরিচিতি পাওয়া যায়নি</h1><p className="text-ink-muted mt-3">এই লিংকে শিক্ষকের প্রকাশিত পরিচিতি নেই। অন্য কোর্সের শিক্ষকদের দেখতে <Link to="/courses" className="text-brand underline">কোর্স তালিকায় যান</Link>।</p></section>
        ) : (
          <>
            <div className="rounded-2xl bg-background border border-border p-6 flex flex-col sm:flex-row gap-6 items-start mb-10">
              {profile.photo_url && (
                <img
                  src={profile.photo_url}
                  alt={`${profile.display_name} profile photo`}
                  className="h-24 w-24 rounded-2xl object-cover"
                  loading="lazy"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-ink">{profile.display_name}</h1>
                {profile.expertise && <p className="text-sm text-brand font-bold mt-1">{profile.expertise}</p>}
                {profile.bio && <p className="text-sm text-ink-muted mt-3 whitespace-pre-wrap">{profile.bio}</p>}
              </div>
            </div>

            <h2 className="font-bold text-ink mb-4">Courses by this instructor</h2>
            {courses.length === 0 ? (
              <p className="text-sm text-ink-muted">No published courses yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    to="/courses/$courseId"
                    params={{ courseId: c.id }}
                    className="rounded-2xl bg-background border border-border overflow-hidden hover:shadow-md transition"
                  >
                    {c.thumbnail_url && (
                      <img src={c.thumbnail_url} alt={`${c.title} thumbnail`} className="w-full h-40 object-cover" loading="lazy" />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-ink">{c.title}</h3>
                      <p className="text-sm text-ink-muted mt-1">
                        ৳{Number(c.discount_price ?? c.price ?? 0).toFixed(0)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
