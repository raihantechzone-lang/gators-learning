import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { attendanceSummary, performanceAdvice, type AttendanceRow, type ClassLite } from "@/lib/academic";
import { resultSheetKey, readResultSheets, type ResultSheet } from '@/lib/result-sheets';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';

const chartConfig = {
  attendance: { label: "উপস্থিতি %", color: "var(--brand)" },
} satisfies ChartConfig;

export function AcademicPanel({ mode, userId, courses, lessons }: {
  mode: "results" | "attendance";
  userId: string;
  courses: { id: string; title: string }[]; // approved courses only
  lessons: ClassLite[];
}) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [sheets, setSheets] = useState<Record<string, ResultSheet[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ids = courses.map((c) => c.id);
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    const load = async () => {
      if (mode === 'results') {
        const { data, error: sheetError } = await supabase.from('settings').select('setting_key,setting_value').in('setting_key', ids.map(resultSheetKey));
        if (cancelled) return;
        setError(sheetError?.message || '');
        setSheets(Object.fromEntries(courses.map(c => [c.id, readResultSheets(data?.find(row => row.setting_key === resultSheetKey(c.id))?.setting_value)])));
        setLoading(false);
        return;
      }
      const a = await supabase.from("class_attendance").select("profile_id, course_id, lesson_id, attended_on").eq("profile_id", userId).in("course_id", ids);
      if (cancelled) return;
      setError(a.error?.message || "");
      setRows((a.data ?? []) as AttendanceRow[]);
    };
    load();
    const t = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener("focus", load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, mode]);

  const perCourse = courses.map((c) => {
    const att = attendanceSummary(lessons.filter((l) => l.course_id === c.id), rows.filter((r) => r.course_id === c.id));
    return { course: c, att };
  });
  const withClasses = perCourse.filter((p) => p.att.total > 0);
  const attPct = withClasses.length ? Math.round(withClasses.reduce((s, p) => s + p.att.percent, 0) / withClasses.length) : null;
  const advice = performanceAdvice(attPct, null);
  const chartData = perCourse.map((p) => ({ name: p.course.title.slice(0, 14), attendance: p.att.percent }));

  if (!courses.length) return <p className="text-ink-muted">অনুমোদিত কোনো কোর্স নেই। এনরোল করা কোর্সের তথ্য এখানে দেখাবে।</p>;
  if (mode === 'results') return <div className="space-y-6">
    {error && <p role="alert" className="text-destructive">ফলাফল লোড করা যায়নি: {error}</p>}
    {loading ? <p>Loading…</p> : courses.map(course => <section key={course.id} className="space-y-3 border-b border-border pb-5">
      <h3 className="font-bold text-ink">{course.title}</h3>
      {!sheets[course.id]?.length ? <p className="text-sm text-ink-muted">এই কোর্সে এখনো কোনো ফলাফল প্রকাশ হয়নি।</p> : sheets[course.id].map(sheet => <div key={sheet.id} className="flex flex-wrap items-center gap-3">
        <FileText className="text-brand shrink-0" /><span className="flex-1 min-w-0 break-words font-medium">{sheet.title}</span>
        <Button asChild variant="outline" size="sm"><a href={sheet.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />ফলাফলের PDF</a></Button>
      </div>)}
    </section>)}
  </div>;

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
        </div>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={[0, 100]} width={30} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="attendance" fill="var(--color-attendance)" radius={4} />
          </BarChart>
        </ChartContainer>
        <div>
          <p className="text-sm font-bold text-ink mb-1">পরামর্শ</p>
          <ul className="list-disc pl-5 text-sm text-ink-muted space-y-1">{advice.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>

      {perCourse.map(({ course, att }) => (
        <div key={course.id} className="bg-background p-5 rounded-2xl border border-border shadow-sm">
          <h4 className="font-bold text-ink mb-3">{course.title}</h4>
          {(
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
