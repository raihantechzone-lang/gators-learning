import { useMemo } from "react";
import { Flame, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { courseProgress, type LessonProgressRecord } from "@/lib/student-progress";

interface ContentLite {
  id: string;
  section_id?: string | null;
}
interface SectionLite {
  id: string;
  title: string;
}

const bn = (n: number) => n.toLocaleString("bn-BD");

export function CourseProgress({
  records,
  contents,
}: {
  records: LessonProgressRecord[];
  contents: ContentLite[];
  sections: SectionLite[];
}) {
  const { user } = useAuth();
  const overallPct = useMemo(() => courseProgress(contents.map((c) => c.id), records), [contents, records]);
  const done = useMemo(() => {
    const ids = new Set(contents.map((c) => c.id));
    return new Set(records.filter((r) => r.completed && ids.has(r.lesson_id)).map((r) => r.lesson_id)).size;
  }, [contents, records]);

  if (!user) return null;

  const total = contents.length;
  const left = Math.max(0, total - done);
  const r = 34;
  const circ = 2 * Math.PI * r;
  const message =
    total === 0 ? "লেসন যোগ হলে অগ্রগতি দেখাবে" :
    left === 0 ? "অভিনন্দন! সব ক্লাস সম্পন্ন" :
    overallPct >= 50 ? "দারুণ চলছে, চালিয়ে যাও!" :
    done > 0 ? "ভালো শুরু, থেমো না!" : "প্রথম ক্লাস দিয়ে শুরু করো";

  return (
    <div className="p-4 rounded-2xl bg-background border border-border shadow-sm font-bengali">
      <p className="text-sm font-bold text-ink mb-3">তোমার অগ্রগতি</p>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`${overallPct}% সম্পন্ন`}>
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
            <circle
              cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
              className="stroke-brand transition-all duration-700"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - overallPct / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-brand">{bn(overallPct)}%</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-ink">{bn(done)}/{bn(total)} ক্লাস সম্পন্ন</p>
          <p className="text-xs text-ink-muted">{left === 0 && total > 0 ? "সব শেষ!" : `আর ${bn(left)}টি ক্লাস বাকি`}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-soft text-brand px-3 py-2 text-xs font-bold">
        {left === 0 && total > 0 ? <Trophy size={14} /> : <Flame size={14} />}
        {message}
      </div>
    </div>
  );
}
