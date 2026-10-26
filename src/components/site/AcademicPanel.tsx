import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { attendanceSummary, markPercent, marksByCourse, performanceAdvice, type AttendanceRow, type ClassLite, type ExamMark } from "@/lib/academic";

const chartConfig = {
  attendance: { label: "উপস্থিতি %", color: "var(--brand)" },
  marks: { label: "নম্বর %", color: "var(--ink)" },
} satisfies ChartConfig;

export function AcademicPanel({ mode, userId, courses, lessons }: {
  mode: "results" | "attendance";
  userId: string;
  courses: { id: string; title: string }[]; // approved courses only
  lessons: ClassLite[];
}) {
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [error, setError] = useState("");
  const ids = courses.map((c) => c.id);
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    const load = async () => {
      const [m, a] = await Promise.all([
        supabase.from("exam_marks").select("*").eq("profile_id", userId).in("course_id", ids),
        supabase.from("class_attendance").select("profile_id, course_id, lesson_id, attended_on").eq("profile_id", userId).in("course_id", ids),
      ]);
      if (cancelled) return;
      setError(m.error?.message || a.error?.message || "");
      setMarks((m.data ?? []) as ExamMark[]);
      setRows((a.data ?? []) as AttendanceRow[]);
    };
    load();
    const t = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener("focus", load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  const grouped = useMemo(() => marksByCourse(marks, ids), [marks, key]);
  const perCourse = courses.map((c) => {
    const att = attendanceSummary(lessons.filter((l) => l.course_id === c.id), rows.filter((r) => r.course_id === c.id));
    const exams = [...(grouped.get(c.id)?.values() ?? [])];
    const markAvg = exams.length ? Math.round(exams.reduce((s, m) => s + markPercent(m), 0) / exams.length) : null;
    return { course: c, att, exams, markAvg };
  });
  const withClasses = perCourse.filter((p) => p.att.total > 0);
  const attPct = withClasses.length ? Math.round(withClasses.reduce((s, p) => s + p.att.percent, 0) / withClasses.length) : null;
  const marked = perCourse.filter((p) => p.markAvg != null);
  const markPct = marked.length ? Math.round(marked.reduce((s, p) => s + (p.markAvg ?? 0), 0) / marked.length) : null;
  const advice = performanceAdvice(attPct, markPct);
  const chartData = perCourse.map((p) => ({ name: p.course.title.slice(0, 14), attendance: p.att.percent, marks: p.markAvg ?? 0 }));

  if (!courses.length) return <p className="text-ink-muted">অনুমোদিত কোনো কোর্স নেই। এনরোল করা কোর্সের তথ্য এখানে দেখাবে।</p>;

  return (
    <div className="space-y-6">
      {error && <p className="text-destructive text-sm">তথ্য লোড করা যায়নি: {error}</p>}

      <div className="bg-background p-5 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-ink">আমার অবস্থা বিশ্লেষণ</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${advice.level === "good" ? "bg-brand-soft text-brand" : advice.level === "bad" ? "bg-destructive/10 text-destructive" : "bg-muted text-ink"}`}>{advice.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl bg-muted"><p className="text-2xl font-black text-ink">{attPct ?? "-"}{attPct != null && "%"}</p><p className="text-xs text-ink-muted">গড় উপস্থিতি</p></div>
          <div className="p-3 rounded-xl bg-muted"><p className="text-2xl font-black text-ink">{markPct ?? "-"}{markPct != null && "%"}</p><p className="text-xs text-ink-muted">গড় নম্বর</p></div>
        </div>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={[0, 100]} width={30} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="attendance" fill="var(--color-attendance)" radius={4} />
            <Bar dataKey="marks" fill="var(--color-marks)" radius={4} />
          </BarChart>
        </ChartContainer>
        <div>
          <p className="text-sm font-bold text-ink mb-1">পরামর্শ</p>
          <ul className="list-disc pl-5 text-sm text-ink-muted space-y-1">{advice.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>

      {perCourse.map(({ course, att, exams }) => (
        <div key={course.id} className="bg-background p-5 rounded-2xl border border-border shadow-sm">
          <h4 className="font-bold text-ink mb-3">{course.title}</h4>
          {mode === "results" ? (
            exams.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-ink-muted text-xs"><th className="py-1">পরীক্ষা</th><th>নম্বর</th><th>%</th></tr></thead>
                <tbody>{exams.map((m) => <tr key={m.exam_name} className="border-t border-border"><td className="py-2 font-bold text-ink">{m.exam_name}</td><td>{m.score}/{m.max_score}</td><td className="font-bold text-brand">{markPercent(m)}%</td></tr>)}</tbody>
              </table>
            ) : <p className="text-sm text-ink-muted">এই কোর্সে এখনো কোনো ফলাফল প্রকাশ হয়নি।</p>
          ) : (
            <>
              <p className="text-sm text-ink-muted mb-3">উপস্থিত {att.present}/{att.total} · মিস {att.missed} · লাইভ ক্লাস মিস {att.missedLive} · {att.percent}%</p>
              {att.list.length ? (
                <ul className="space-y-1.5">
                  {[...att.list].reverse().map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm border-t border-border pt-1.5">
                      <span className="truncate text-ink">{c.date} · {c.title}</span>
                      <span className={`shrink-0 font-bold ${c.present ? "text-brand" : "text-destructive"}`}>{c.present ? "✓ Present" : "✗ Missed"}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-muted">এখনো কোনো ক্লাস হয়নি।</p>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
