import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { CourseProgress } from "@/components/lesson/CourseProgress";
import { ArticleLesson } from "@/components/lesson/ArticleLesson";
import { QuizRunner } from "@/components/lesson/QuizRunner";
import { LessonResources } from "@/components/lesson/LessonResources";
import { LessonNotes } from "@/components/lesson/LessonNotes";
import { AttendanceButton } from "@/components/lesson/AttendanceButton";
import { isLiveLinkActive, youtubeId, type Course, type CourseContent } from "@/lib/data";
import { hasCourseAccess, lessonReviewTag, readLocalProgress, type LessonProgressRecord } from "@/lib/student-progress";
import { loadStudentProgress, saveStudentProgress } from "@/lib/progress-sync";
import { toast } from "sonner";
import { loadVisibleLessons, safeWebUrl } from '@/lib/public-experience.js';

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — Gators Learning" },
      { name: "description", content: "Live classes, video lessons, PDF notes and exams for this course." },
      { property: "og:title", content: "Course — Gators Learning" },
      { property: "og:description", content: "Live classes, video lessons, PDF notes and exams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CourseDetailPage,
});

interface Section {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
}
interface RichContent extends CourseContent {
  section_id?: string | null;
  position?: number;
  lesson_type?: string;
  article_html?: string | null;
  video_file_url?: string | null;
  subtitles_url?: string | null;
}
interface InstructorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
}
interface Review {
  id: string;
  profile_id: string;
  rating: number;
  comment: string | null;
  student_name: string | null;
  student_photo: string | null;
  is_approved: boolean;
  created_at: string;
}
interface Assignment {
  id: string;
  content_id: string | null;
  title: string;
  instructions: string | null;
}
interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  body: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
}

type Tab = "overview" | "resources" | "notes" | "reviews" | "certificate";

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user, profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [contents, setContents] = useState<RichContent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [pending, setPending] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<{ rating: number; comment: string } | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [assignBody, setAssignBody] = useState("");
  const [assignFileUrl, setAssignFileUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: c }, { data: list }, { data: secs }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        loadVisibleLessons(supabase, courseId),
        supabase.from("course_sections").select("*").eq("course_id", courseId).order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      setCourse((c as Course) ?? null);
      const items = (list as RichContent[]) ?? [];
      setContents(items);
      setSections((secs as Section[]) ?? []);
      setActiveId((prev) => prev ?? items[0]?.id ?? null);
      if ((c as any)?.instructor_id) {
        const { data: instr } = await supabase
          .from("instructor_profiles")
          .select("id, display_name, bio, photo_url")
          .eq("id", (c as any).instructor_id)
          .maybeSingle();
        if (!cancelled) setInstructor((instr as InstructorProfile) ?? null);
      }
    };
    load();
    const contentTimer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    const channel = supabase
      .channel(`course-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_contents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "course_sections" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(contentTimer);
      window.removeEventListener("focus", load);
      supabase.removeChannel(channel);
    };
  }, [courseId, user?.id]);

  useEffect(() => {
    if (!user) {
      setEnrolled(false);
      setPending(false);
      return;
    }
    const load = async () => {
      // Pending payments and active enrollments both live in the enrollments table.
      // A student may have several rows for one course (old duplicates); any approved row unlocks it.
      const { data: rows } = await supabase
        .from("enrollments")
        .select("id, status, payment_status, certificate_url")
        .eq("profile_id", user.id)
        .eq("course_id", courseId);
      const list = rows ?? [];
      const ok = list.some(hasCourseAccess);
      setEnrolled(ok);
      setPending(!ok && list.some((en) => en.status === "pending" || en.payment_status === "pending"));
      setCertificateUrl(list.find((en) => en.certificate_url)?.certificate_url ?? null);
    };
    load();
    const refreshTimer = window.setInterval(load, 15000);
    window.addEventListener('focus', load);
    const channel = supabase
      .channel(`enroll-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments" }, () => load())
      .subscribe();
    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener('focus', load);
      supabase.removeChannel(channel);
    };
  }, [user, courseId]);

  const [progressRecords, setProgressRecords] = useState<LessonProgressRecord[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const syncWarning = useRef(false);
  useEffect(() => {
    setProgressLoaded(false);
    if (!user) { setProgressRecords([]); setProgressLoaded(true); return; }
    let cancelled = false;
    const local = () => setProgressRecords(readLocalProgress(user.id).filter((r) => r.course_id === courseId));
    local();
    const load = async () => {
      try {
        const records = await loadStudentProgress(user.id, courseId);
        if (!cancelled) setProgressRecords(records);
      } catch {
        if (!cancelled && !syncWarning.current) { syncWarning.current = true; toast.error("অগ্রগতি সিঙ্ক হয়নি; আপাতত এই ব্রাউজারে রাখা হচ্ছে।"); }
      } finally { if (!cancelled) setProgressLoaded(true); }
    };
    load();
    window.addEventListener("gl-progress", local);
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    const timer = window.setInterval(load, 30000);
    const channel = supabase.channel(`progress-${user.id}-${courseId}`).on("postgres_changes", { event: "*", schema: "public", table: "lesson_progress", filter: `profile_id=eq.${user.id}` }, load).subscribe();
    return () => { cancelled = true; clearInterval(timer); supabase.removeChannel(channel); window.removeEventListener("gl-progress", local); window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, [user, courseId]);
  const completedIds = useMemo(() => new Set(progressRecords.filter((r) => r.completed).map((r) => r.lesson_id)), [progressRecords]);
  const courseComplete = contents.length > 0 && contents.every((c) => completedIds.has(c.id));
  const certificateEnabled = !!(course as any)?.certificate_enabled;

  const active = contents.find((c) => c.id === activeId) ?? null;
  const canWatch = enrolled || active?.is_free;

  const activeRecord = progressRecords.find((r) => r.lesson_id === active?.id);
  // Resume position is read once per lesson so live progress saves do not restart the video.
  const progressRow = useMemo(
    () => ({ last_position_seconds: activeRecord && !activeRecord.completed ? activeRecord.last_position_seconds : 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.id, user?.id, progressLoaded],
  );

  // Assignment lesson type: load assignment + own submission.
  useEffect(() => {
    if (!active || active.lesson_type !== "assignment") {
      setAssignment(null);
      setSubmission(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("assignments")
      .select("id, content_id, title, instructions")
      .eq("content_id", active.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        const a = (data as Assignment) ?? null;
        setAssignment(a);
        if (a && user) {
          const { data: sub } = await supabase
            .from("assignment_submissions")
            .select("id, assignment_id, body, file_url, grade, feedback, status")
            .eq("assignment_id", a.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!cancelled) {
            setSubmission((sub as AssignmentSubmission) ?? null);
            setAssignBody((sub as any)?.body ?? "");
            setAssignFileUrl((sub as any)?.file_url ?? "");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.lesson_type, user]);

  // Reviews belong to the lesson currently open.
  const [reviewTick, setReviewTick] = useState(0);
  const activeLessonId = activeId;
  useEffect(() => {
    if (!activeLessonId) { setReviews([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, profile_id, rating, comment, is_approved, created_at")
        .eq("course_id", courseId)
        .like("comment", `${lessonReviewTag(activeLessonId ?? "")}%`)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const names = await supabase.rpc('public_reviewer_names');
      const byId = new Map((names.data || []).map((p: any) => [p.id, p.full_name]));
      const formatted = (data || []).map((r: any) => ({
        ...r,
        comment: String(r.comment ?? "").slice(lessonReviewTag(activeLessonId ?? "").length),
        student_name: byId.get(r.profile_id) || "Student",
        student_photo: null
      }));
      setReviews(formatted as Review[]);
      if (user && !cancelled) setMyReview((r) => r ?? { rating: 5, comment: "" });
    };
    load();
    const channel = supabase
      .channel(`reviews-${courseId}-${activeLessonId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [courseId, user, activeLessonId, reviewTick]);

  const toggleComplete = async (contentId: string, next: boolean) => {
    if (!user) return;
    const old = readLocalProgress(user.id).find((r) => r.lesson_id === contentId);
    await saveStudentProgress(user.id, {
      lesson_id: contentId, course_id: courseId, completed: next,
      progress_percent: next ? 100 : 0,
      last_position_seconds: next ? old?.last_position_seconds ?? 0 : 0,
      duration_seconds: old?.duration_seconds ?? 0,
    }).catch(() => { if (!syncWarning.current) { syncWarning.current = true; toast.error("অগ্রগতি সিঙ্ক হয়নি; আপাতত এই ব্রাউজারে রাখা হচ্ছে।"); } });
  };

  const lastSave = useRef(0);
  // Live playback position for the notes timestamp, updated on every progress tick.
  const [liveTime, setLiveTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; key: number } | null>(null);
  useEffect(() => { setLiveTime(0); setSeekRequest(null); }, [active?.id]);
  const handleProgress = async (seconds: number, duration: number) => {
    if (!active || !(duration > 0)) return;
    setLiveTime(seconds);
    if (!user) return;
    if (Date.now() - lastSave.current < 3000) return;
    lastSave.current = Date.now();
    const old = readLocalProgress(user.id).find((r) => r.lesson_id === active.id);
    await saveStudentProgress(user.id, {
      lesson_id: active.id, course_id: courseId,
      completed: !!old?.completed || seconds / duration >= 0.95,
      progress_percent: Math.round((seconds / duration) * 100),
      last_position_seconds: Math.floor(seconds),
      duration_seconds: Math.floor(duration),
    }).catch(() => { if (!syncWarning.current) { syncWarning.current = true; toast.error("অগ্রগতি সিঙ্ক হয়নি; আপাতত এই ব্রাউজারে রাখা হচ্ছে।"); } });
  };

  const handleEnded = async () => {
    if (active) await toggleComplete(active.id, true);
  };

  const submitReview = async () => {
    if (!user || !myReview || !active) return;
    if (!myReview.comment.trim()) { toast.error("কমেন্ট লিখুন।"); return; }
    const payload = {
      profile_id: user.id,
      course_id: courseId,
      rating: 5,
      // The reviews table has no lesson column, so the lesson is tagged in the comment.
      comment: lessonReviewTag(active.id) + myReview.comment.trim(),
      is_approved: true,
    };
    const { error } = await supabase.from("reviews").insert(payload);
    if (error) { toast.error("কমেন্ট সেভ হয়নি: " + error.message); return; }
    toast.success("কমেন্ট যোগ হয়েছে");
    setMyReview({ rating: 5, comment: "" });
    setReviewTick((n) => n + 1);
  };

  const submitAssignment = async () => {
    if (!user || !assignment) return;
    const payload = {
      assignment_id: assignment.id,
      user_id: user.id,
      body: assignBody,
      file_url: assignFileUrl || null,
      status: "submitted",
    };
    if (submission) {
      await supabase.from("assignment_submissions").update(payload).eq("id", submission.id);
    } else {
      const { data } = await supabase.from("assignment_submissions").insert(payload).select().maybeSingle();
      setSubmission((data as AssignmentSubmission) ?? null);
    }
  };

  const vid = youtubeId(active?.youtube_url);

  const grouped = useMemo(() => {
    if (sections.length === 0) return null;
    return sections.map((s) => ({
      section: s,
      items: contents.filter((c) => c.section_id === s.id),
    }));
  }, [sections, contents]);
  const ungrouped = useMemo(() => contents.filter((c) => !c.section_id), [contents]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink mb-1">{course?.title ?? "Course"}</h1>
        <p className="text-sm text-ink-muted mb-8">{course?.category}</p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {active && canWatch && active.lesson_type === "text" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <ArticleLesson html={active.article_html} />
              </div>
            ) : active && canWatch && active.lesson_type === "quiz" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <QuizRunner contentId={active.id} />
              </div>
            ) : active && canWatch && active.lesson_type === "assignment" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-ink">{assignment?.title ?? active.title}</h2>
                {assignment?.instructions && <p className="text-sm text-ink-muted">{assignment.instructions}</p>}
                {submission?.status === "graded" ? (
                  <div className="p-3 rounded-xl bg-brand-soft text-brand text-sm">
                    <p className="font-bold">Grade: {submission.grade}</p>
                    {submission.feedback && <p>{submission.feedback}</p>}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={assignBody}
                      onChange={(e) => setAssignBody(e.target.value)}
                      placeholder="Write your submission..."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-ink min-h-[100px]"
                    />
                    <input
                      value={assignFileUrl}
                      onChange={(e) => setAssignFileUrl(e.target.value)}
                      placeholder="File URL (optional)"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-ink"
                    />
                    <button onClick={submitAssignment} className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                      {submission ? "Update submission" : "Submit"}
                    </button>
                  </>
                )}
              </div>
            ) : active && canWatch ? (
              <VideoPlayer
                readyToPlay={progressLoaded}
                youtubeId={vid ?? undefined}
                thumbnail={active.thumbnail_url || course?.thumbnail_url || undefined}
                videoUrl={active.video_file_url ?? undefined}
                title={active.title}
                startSeconds={progressRow?.last_position_seconds ?? 0}
                subtitlesUrl={active.subtitles_url ?? undefined}
                watermark={user?.email ?? undefined}
                onProgress={handleProgress}
                onEnded={handleEnded}
                seekRequest={seekRequest}
              />
            ) : (
              <div className="aspect-video rounded-2xl bg-ink/90 flex flex-col items-center justify-center text-background text-center px-6">
                <span className="text-4xl mb-3">{pending ? "⏳" : "🔒"}</span>
                <p className="font-bold">
                  {contents.length === 0
                    ? "No lessons added yet."
                    : pending
                      ? "Payment verification pending"
                      : "Enroll in this course to unlock the lessons."}
                </p>
                {pending ? (
                  <p className="text-sm mt-2 font-bengali text-background/80">
                    ১ ঘণ্টার মধ্যে পেমেন্ট কনফার্ম হলে কোর্সটি আনলক হয়ে যাবে।
                  </p>
                ) : (
                  <Link
                    to="/enroll/$courseId"
                    reloadDocument
                    params={{ courseId }}
                    className="mt-4 px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm"
                  >
                    Enroll now
                  </Link>
                )}
              </div>
            )}

            {active && enrolled && (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <h2 className="font-bold text-ink mb-4">{active.title}</h2>
                <div className="flex flex-wrap gap-3">
                  {isLiveLinkActive(active) && (
                    <a
                      href={safeWebUrl(active.live_url) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-destructive text-background text-sm font-bold"
                    >
                      🔴 Join live class
                    </a>
                  )}
                  {active.pdf_url && (
                    <a
                      href={safeWebUrl(active.pdf_url) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl border-2 border-border text-sm font-bold"
                    >
                      📄 PDF notes
                    </a>
                  )}
                  {active.exam_link && (
                    <a
                      href={safeWebUrl(active.exam_link) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
                    >
                      📝 Take exam
                    </a>
                  )}
                </div>
                {active.live_url && !active.youtube_url && !active.video_file_url && !isLiveLinkActive(active) && (
                  <p className="text-xs text-ink-muted mt-4 font-bengali">
                    লাইভ ক্লাসের লিংকটির মেয়াদ শেষ হয়ে গেছে (২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে মুছে যায়)।
                  </p>
                )}
              </div>
            )}

            {active && user && enrolled && <AttendanceButton key={active.id} userId={user.id} courseId={courseId} lessonId={active.id} lesson={active} />}
            {active && (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-3">
                  {(["overview", "resources", "notes", "reviews", ...(enrolled && certificateEnabled ? ["certificate"] : [])] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${
                        tab === t ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-muted"
                      }`}
                    >
                      {!enrolled && (t === "resources" || t === "notes")
                        ? `🔒 ${t}`
                        : t === "reviews"
                          ? "comments"
                          : t === "certificate"
                            ? `${certificateUrl ? "🎓" : "🔒"} certificate`
                            : t}
                    </button>
                  ))}
                </div>

                {tab === "overview" && (
                  <div className="space-y-3">
                    <p className="text-sm text-ink-muted">{course?.details}</p>
                    {instructor && (
                      <div className="flex items-center gap-3 pt-3 border-t border-border">
                        {instructor.photo_url && (
                          <img src={instructor.photo_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                        )}
                        <div>
                          <p className="font-bold text-ink text-sm">{instructor.display_name ?? "Instructor"}</p>
                          <p className="text-xs text-ink-muted">{instructor.bio}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!enrolled && (tab === "resources" || tab === "notes") && (
                  <p className="text-sm text-ink-muted font-bengali">🔒 কোর্সে এনরোল করলে এটি আনলক হবে।</p>
                )}

                {enrolled && tab === "resources" && <LessonResources contentId={active.id} pdfUrl={active.pdf_url} />}

                {enrolled && tab === "notes" && (
                  <LessonNotes
                    courseId={courseId}
                    contentId={active.id}
                    currentTime={Math.max(liveTime, progressRow?.last_position_seconds ?? 0)}
                    onSeek={(sec) => { setLiveTime(sec); setSeekRequest({ seconds: sec, key: Date.now() }); }}
                  />
                )}

                {tab === "reviews" && (
                  <div className="space-y-4">
                    {user && myReview && (
                      <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-2">
                        <textarea
                          value={myReview.comment}
                          onChange={(e) => setMyReview((r) => (r ? { ...r, comment: e.target.value } : r))}
                          placeholder="এই ভিডিও নিয়ে কমেন্ট লিখুন..."
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
                        />
                        <button onClick={submitReview} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                          Post comment
                        </button>
                      </div>
                    )}
                    <ul className="space-y-3">
                      {reviews.map((r) => (
                        <li key={r.id} className="p-3 rounded-xl bg-surface-alt border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            {r.student_photo && <img src={r.student_photo} className="h-6 w-6 rounded-full object-cover" alt="" />}
                            <span className="text-xs font-bold text-ink">{r.student_name}</span>
                          </div>
                          <p className="text-sm text-ink-muted">{r.comment}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {enrolled && tab === "certificate" && (
                  <div className="p-6 rounded-xl bg-surface-alt border border-border text-center space-y-3">
                    {certificateUrl ? (
                      <>
                        <p className="text-3xl">🎓</p>
                        <p className="font-bold text-ink">Congratulations! Your certificate is ready.</p>
                        <a
                          href={certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-6 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
                        >
                          View / Download Certificate
                        </a>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl">🔒</p>
                        <p className="font-bold text-ink">Certificate coming soon</p>
                        <p className="text-sm text-ink-muted">
                          {courseComplete
                            ? "You have completed the course. The admin has not issued your certificate yet — please wait a little longer."
                            : "It is not time yet. Complete 100% of the course lessons to unlock your certificate."}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-2xl bg-background border border-border p-4 shadow-sm h-fit">
            <CourseProgress records={progressRecords} contents={contents} sections={sections} />
            <h2 className="font-bold text-ink px-2 py-2">Lessons ({contents.length})</h2>
            {grouped ? (
              <div className="space-y-4">
                {grouped.map(({ section, items }) => (
                  <div key={section.id}>
                    <p className="px-2 text-xs font-bold uppercase text-ink-muted mb-1">{section.title}</p>
                    <LessonList
                      items={items}
                      activeId={activeId}
                      setActiveId={setActiveId}
                      completedIds={completedIds}
                      user={!!user}
                      onToggle={toggleComplete}
                      offset={0}
                    />
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <LessonList
                    items={ungrouped}
                    activeId={activeId}
                    setActiveId={setActiveId}
                    completedIds={completedIds}
                    user={!!user}
                    onToggle={toggleComplete}
                    offset={0}
                  />
                )}
              </div>
            ) : (
              <LessonList
                items={contents}
                activeId={activeId}
                setActiveId={setActiveId}
                completedIds={completedIds}
                user={!!user}
                onToggle={toggleComplete}
                offset={0}
              />
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
      {course && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              name: course.title,
              description: course.details ?? undefined,
              provider: { "@type": "Organization", name: "Gators Learning" },
              image: course.thumbnail_url ?? undefined,
            }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'),
          }}
        />
      )}
    </div>
  );
}

function LessonList({
  items,
  activeId,
  setActiveId,
  completedIds,
  user,
  onToggle,
  offset,
}: {
  items: RichContent[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  completedIds: Set<string>;
  user: boolean;
  onToggle: (id: string, next: boolean) => void;
  offset: number;
}) {
  return (
    <ul className="space-y-1">
      {items.map((c, i) => (
        <li key={c.id} className="flex items-center gap-1">
          {user && (
            <input
              type="checkbox"
              checked={completedIds.has(c.id)}
              onChange={(e) => onToggle(c.id, e.target.checked)}
              className="ml-1 shrink-0"
              aria-label="Mark complete"
            />
          )}
          <button
            onClick={() => setActiveId(c.id)}
            className={`flex-1 text-left px-3 py-3 rounded-xl text-sm font-semibold transition ${
              c.id === activeId ? "bg-brand-soft text-brand" : "hover:bg-muted text-ink"
            }`}
          >
            <span className="text-ink-muted mr-2">{String(offset + i + 1).padStart(2, "0")}</span>
            {c.title}
            {isLiveLinkActive(c) && <span className="ml-2 text-xs text-destructive font-bold">LIVE</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
