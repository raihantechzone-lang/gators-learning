import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { approvedEnrollmentFilter } from "@/lib/enrollment-payment";
import { attendanceSummary, type AttendanceRow, type ClassLite } from "@/lib/academic";
import { absentStudents, attendanceMessage, bangladeshDay, liveClassOnDay } from '@/lib/management-rules';
import { enrollmentHasAccess } from '@/lib/public-experience.js';
import { WhatsAppQueue } from '@/components/admin/WhatsAppQueue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute("/admin/attendance")({
  staticData: { sitemap: false },
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
  const [view, setView] = useState('attendance');
  const [day, setDay] = useState(bangladeshDay());
  const [lessonId, setLessonId] = useState('');
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-att-courses"],
    queryFn: async () => { const result = await supabase.from("courses").select("id, title").order("created_at", { ascending: false }); if (result.error) throw result.error; return result.data ?? []; },
  });
  const { data, error } = useQuery({
    queryKey: ["admin-att", courseId],
    enabled: !!courseId,
    refetchInterval: 30000,
    queryFn: async () => {
      const [en, cls, att, sessions] = await Promise.all([
        supabase.from("enrollments").select("profile_id,status,payment_status, profiles(full_name, roll_number, phone)").eq("course_id", courseId).or(approvedEnrollmentFilter),
        supabase.from("course_contents").select("id, course_id, title, created_at, live_url,live_expires_at").eq("course_id", courseId),
        supabase.from("class_attendance").select("profile_id, course_id, lesson_id, attended_on").eq("course_id", courseId),
        (supabase as any).from('live_class_sessions').select('id,course_id,lesson_id,title,starts_at,expires_at').eq('course_id',courseId),
      ]);
      if (en.error || cls.error || att.error) throw en.error || cls.error || att.error;
      const seen = new Set<string>();
      return {
        students: (en.data ?? []).filter((r: any) => enrollmentHasAccess(r) && !seen.has(r.profile_id) && seen.add(r.profile_id)) as any[],
        classes: (cls.data ?? []) as (ClassLite & {live_expires_at?:string | null})[],
        rows: (att.data ?? []) as AttendanceRow[],
        sessions: (sessions.data || []) as {id:string;course_id:string;lesson_id:string;title:string;starts_at:string;expires_at:string}[],
        sessionsError: sessions.error?.message || '',
      };
    },
  });
  const historyClasses = data?.sessions.filter(l => Date.parse(l.starts_at) < Date.parse(`${day}T00:00:00+06:00`) + 86400000 && Date.parse(l.expires_at) > Date.parse(`${day}T00:00:00+06:00`)).map(l => ({...l,id:l.lesson_id})) || [];
  const todayClasses = [...new Map([...(data?.classes.filter(l => liveClassOnDay(l,day)) || []),...historyClasses].map(l => [l.id,l])).values()];
  const selectedLesson = todayClasses.find(l => l.id === lessonId);
  const missing = selectedLesson && data ? absentStudents(data.students,data.rows,selectedLesson.id,day) : [];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CalendarCheck /> Class Attendance</h2>
      <Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="attendance">হাজিরা</TabsTrigger><TabsTrigger value="messages">Attendance message</TabsTrigger></TabsList></Tabs>
      <select aria-label="Attendance course" value={courseId} onChange={(e) => {setCourseId(e.target.value);setLessonId('');}} className="border border-input rounded-md px-3 py-2 bg-background max-w-full">
        <option value="">কোর্স নির্বাচন করুন</option>
        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      {(error) && <p role="alert" className="text-destructive text-sm">{(error as Error).message}</p>}
      {view === 'messages' && <section className="space-y-4">
        {data?.sessionsError && <p role="alert" className="text-destructive">লাইভ ক্লাসের ইতিহাস লোড হয়নি: {data.sessionsError}</p>}
        <div className="flex flex-wrap gap-3"><Input aria-label="Attendance date" type="date" value={day} max={bangladeshDay()} className="w-auto" onChange={e => {setDay(e.target.value);setLessonId('');}} /><select aria-label="Live class" value={lessonId} onChange={e => setLessonId(e.target.value)} className="border border-input rounded-md p-2 bg-background max-w-full"><option value="">লাইভ ক্লাস নির্বাচন করুন</option>{todayClasses.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
        {courseId && !todayClasses.length && data && <p className="text-muted-foreground">এই দিনে সংরক্ষিত কোনো লাইভ ক্লাস পাওয়া যায়নি।</p>}
        {selectedLesson && <WhatsAppQueue key={`${courseId}-${day}-${lessonId}`} initialTemplate={attendanceMessage} recipients={missing.map(s => ({id:s.profile_id,name:s.profiles?.full_name || 'Student',phone:String(s.profiles?.phone || ''),course:courses.find((c:any) => c.id === courseId)?.title || '',lesson:selectedLesson.title,date:day}))} />}
      </section>}
      {view === 'attendance' && data && (
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
