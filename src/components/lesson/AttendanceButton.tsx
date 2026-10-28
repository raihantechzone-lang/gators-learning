import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bangladeshDay } from "@/lib/management-rules";
import { toast } from "sonner";
import { isLessonLive } from '@/lib/public-experience.js';
import { Button } from '@/components/ui/button';

// One "I'm here" per student per class; the class date is the day it's marked.
export function AttendanceButton({ userId, courseId, lessonId, lesson }: { userId: string; courseId: string; lessonId: string; lesson: { live_url?: string | null; live_expires_at?: string | null; youtube_url?: string | null; video_file_url?: string | null } }) {
  const [markedOn, setMarkedOn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = bangladeshDay();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const live = isLessonLive(lesson, now);

  useEffect(() => {
    let cancelled = false;
    setMarkedOn(null);
    supabase.from("class_attendance").select("attended_on").eq("profile_id", userId).eq("lesson_id", lessonId).limit(1)
      .then(({ data }) => { if (!cancelled) setMarkedOn((data?.[0] as any)?.attended_on ?? null); });
    return () => { cancelled = true; };
  }, [userId, lessonId]);

  const mark = async () => {
    if (!isLessonLive(lesson)) return;
    setBusy(true);
    const current = await supabase.from('course_contents').select('live_url,live_expires_at,youtube_url,video_file_url').eq('id', lessonId).eq('course_id', courseId).single();
    if (current.error || !isLessonLive(current.data)) {
      setBusy(false); setNow(Date.now());
      toast.error('Attendance is available only during an active live class.'); return;
    }
    const { error } = await supabase.from("class_attendance").insert({ profile_id: userId, course_id: courseId, lesson_id: lessonId, attended_on: today });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) { toast.error("হাজিরা দেওয়া যায়নি: " + error.message); return; }
    setMarkedOn(today);
    toast.success("আজকের হাজিরা দেওয়া হয়েছে ✅");
  };

  return (
    <div className="mb-4 p-4 rounded-2xl bg-background border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-ink">ক্লাস হাজিরা</p>
        <p className="text-xs text-ink-muted">আজকের তারিখ: {today}</p>
      </div>
      {markedOn ? (
        <span className="px-4 py-2 rounded-xl bg-brand-soft text-brand text-sm font-bold">✓ Present ({markedOn})</span>
      ) : (
        <Button onClick={mark} disabled={busy || !live}>
          {busy ? "..." : live ? "I'm here · Present" : "Live class only"}
        </Button>
      )}
    </div>
  );
}
