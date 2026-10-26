import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { approvedEnrollmentFilter } from "@/lib/enrollment-payment";
import { attendanceSummary, type AttendanceRow, type ClassLite } from "@/lib/academic";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({ meta: [
    { title: "Class Attendance | Gators Learning Admin" },
    { name: "description", content: "See which students attended each class, date by date." },
    { property: "og:title", content: "Class Attendance | Gators Learning Admin" },
    { property: "og:description", content: "See which students attended each class, date by date." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AttendanceAdmin,
});

function AttendanceAdmin() {
  const [courseId, setCourseId] = useState("");
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-att-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title").order("created_at", { ascending: false })).data ?? [],
  });
  const { data, error } = useQuery({
    queryKey: ["admin-att", courseId],
    enabled: !!courseId,
    refetchInterval: 30000,
    queryFn: async () => {
      const [en, cls, att] = await Promise.all([
        supabase.from("enrollments").select("profile_id, profiles(full_name, roll_number)").eq("course_id", courseId).or(approvedEnrollmentFilter),
        supabase.from("course_contents").select("id, course_id, title, created_at, live_url").eq("course_id", courseId),
        supabase.from("class_attendance").select("profile_id, course_id, lesson_id, attended_on").eq("course_id", courseId),
      ]);
      if (att.error) throw att.error;
      const seen = new Set<string>();
      return {
        students: (en.data ?? []).filter((r: any) => !seen.has(r.profile_id) && seen.add(r.profile_id)) as any[],
        classes: (cls.data ?? []) as ClassLite[],
        rows: (att.data ?? []) as AttendanceRow[],
      };
    },
  });

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CalendarCheck /> Class Attendance</h2>
      <p className="text-slate-500 text-sm">শিক্ষার্থীরা ভিডিও পেজ থেকে প্রতিটি ক্লাসে "I'm here" দিলে এখানে দেখাবে।</p>
      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 bg-white">
        <option value="">কোর্স নির্বাচন করুন</option>
        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      {error && <p className="text-rose-600 text-sm">হাজিরা টেবিল পাওয়া যায়নি: {(error as Error).message}</p>}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Missed</th><th className="px-4 py-3">Missed live</th><th className="px-4 py-3">Attendance</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">এই কোর্সে অনুমোদিত কোনো শিক্ষার্থী নেই।</td></tr>}
              {data.students.map((s) => {
                const sum = attendanceSummary(data.classes, data.rows.filter((r) => r.profile_id === s.profile_id));
                return (
                  <tr key={s.profile_id}>
                    <td className="px-4 py-2"><p className="font-bold">{s.profiles?.full_name || "Student"}</p><p className="text-xs text-slate-400">{s.profiles?.roll_number}</p></td>
                    <td className="px-4 py-2 text-emerald-600 font-bold">{sum.present}/{sum.total}</td>
                    <td className="px-4 py-2 text-rose-600">{sum.missed}</td>
                    <td className="px-4 py-2 text-rose-600">{sum.missedLive}</td>
                    <td className="px-4 py-2 font-black">{sum.percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
