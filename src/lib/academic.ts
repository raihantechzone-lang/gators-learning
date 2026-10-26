// Shared rules for exam mark sheets and class attendance.

export interface ExamMark {
  id?: string;
  course_id: string;
  exam_name: string;
  profile_id: string;
  score: number;
  max_score: number;
  created_at?: string;
}

export interface AttendanceRow {
  profile_id: string;
  course_id: string;
  lesson_id: string;
  attended_on: string; // YYYY-MM-DD
}

export interface ClassLite {
  id: string;
  course_id: string;
  title: string;
  created_at: string;
  live_url?: string | null;
}

export const todayKey = (now = new Date()) => {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};

// Marks only show inside the course they were uploaded for, and only for approved courses.
export function marksByCourse(marks: ExamMark[], approvedCourseIds: string[]) {
  const out = new Map<string, Map<string, ExamMark>>();
  for (const m of marks) {
    if (!approvedCourseIds.includes(m.course_id)) continue;
    if (!out.has(m.course_id)) out.set(m.course_id, new Map());
    out.get(m.course_id)!.set(m.exam_name, m);
  }
  return out;
}

export const markPercent = (m: Pick<ExamMark, "score" | "max_score">) =>
  m.max_score > 0 ? Math.round((Number(m.score) / Number(m.max_score)) * 100) : 0;

// A class counts once its date has arrived; attended if a row exists for that lesson.
export function attendanceSummary(classes: ClassLite[], rows: AttendanceRow[], now = new Date()) {
  const today = todayKey(now);
  const attended = new Set(rows.map((r) => r.lesson_id));
  const held = classes
    .filter((c) => todayKey(new Date(c.created_at)) <= today)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const list = held.map((c) => ({
    ...c,
    date: todayKey(new Date(c.created_at)),
    present: attended.has(c.id),
    attendedOn: rows.find((r) => r.lesson_id === c.id)?.attended_on ?? null,
  }));
  const present = list.filter((c) => c.present).length;
  const missed = list.filter((c) => !c.present);
  return {
    list,
    total: list.length,
    present,
    missed: missed.length,
    missedLive: missed.filter((c) => !!c.live_url).length,
    percent: list.length ? Math.round((present / list.length) * 100) : 0,
  };
}

export function performanceAdvice(attendancePct: number | null, markPct: number | null) {
  const scores = [attendancePct, markPct].filter((n): n is number => n != null);
  if (!scores.length) return { level: "none" as const, label: "এখনো তথ্য নেই", tips: ["ক্লাসে উপস্থিতি দিন এবং পরীক্ষায় অংশ নিন।"] };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const tips: string[] = [];
  if (attendancePct != null && attendancePct < 75) tips.push("নিয়মিত ক্লাসে উপস্থিত থাকুন; মিস করা ক্লাসের রেকর্ডিং দেখে নিন।");
  if (markPct != null && markPct < 60) tips.push("কম নম্বর পাওয়া বিষয়গুলো আবার রিভিশন দিন এবং নোট তৈরি করুন।");
  if (markPct != null && markPct >= 80) tips.push("দারুণ নম্বর! কঠিন প্রশ্ন অনুশীলন করে আরও এগিয়ে যান।");
  if (attendancePct != null && attendancePct >= 90) tips.push("উপস্থিতি চমৎকার, এভাবেই চালিয়ে যান।");
  if (avg >= 80) return { level: "good" as const, label: "খুব ভালো", tips };
  if (avg >= 60) return { level: "ok" as const, label: "মোটামুটি ভালো", tips: tips.length ? tips : ["একটু বেশি অনুশীলন করলে আরও ভালো হবে।"] };
  return { level: "bad" as const, label: "উন্নতি দরকার", tips };
}
