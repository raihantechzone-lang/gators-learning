import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayKey } from "@/lib/academic";
import { toast } from "sonner";

// One "I'm here" per student per class; the class date is the day it's marked.
export function AttendanceButton({ userId, courseId, lessonId }: { userId: string; courseId: string; lessonId: string }) {
  const [markedOn, setMarkedOn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  useEffect(() => {
    let cancelled = false;
    setMarkedOn(null);
    supabase.from("class_attendance").select("attended_on").eq("profile_id", userId).eq("lesson_id", lessonId).limit(1)
      .then(({ data }) => { if (!cancelled) setMarkedOn((data?.[0] as any)?.attended_on ?? null); });
    return () => { cancelled = true; };
  }, [userId, lessonId]);

  const mark = async () => {
    setBusy(true);
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
        <button onClick={mark} disabled={busy} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-50">
          {busy ? "..." : "I'm here · Present"}
        </button>
      )}
    </div>
  );
}
