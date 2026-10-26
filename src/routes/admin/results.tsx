import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Save, FileSpreadsheet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { approvedEnrollmentFilter } from "@/lib/enrollment-payment";
import { markPercent, type ExamMark } from "@/lib/academic";

export const Route = createFileRoute("/admin/results")({
  head: () => ({ meta: [
    { title: "Exam Mark Sheet | Gators Learning Admin" },
    { name: "description", content: "Upload exam marks for every student of a course at once." },
    { property: "og:title", content: "Exam Mark Sheet | Gators Learning Admin" },
    { property: "og:description", content: "Upload exam marks for every student of a course at once." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MarkSheetAdmin,
});

function MarkSheetAdmin() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [examName, setExamName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [scores, setScores] = useState<Record<string, string>>({});

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-ms-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-ms-students", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("profile_id, profiles(full_name, roll_number)").eq("course_id", courseId).or(approvedEnrollmentFilter);
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? []).filter((r: any) => !seen.has(r.profile_id) && seen.add(r.profile_id)) as any[];
    },
  });

  const { data: marks = [], error: marksError } = useQuery({
    queryKey: ["admin-ms-marks", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_marks").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExamMark[];
    },
  });

  const exams = useMemo(() => [...new Set(marks.map((m) => m.exam_name))], [marks]);

  // Editing an existing exam loads its marks into the sheet.
  useEffect(() => {
    const rows = marks.filter((m) => m.exam_name === examName.trim());
    if (!rows.length) return;
    setMaxScore(String(rows[0].max_score));
    setScores(Object.fromEntries(rows.map((m) => [m.profile_id, String(m.score)])));
  }, [examName, marks]);

  const save = useMutation({
    mutationFn: async () => {
      const name = examName.trim();
      const max = Number(maxScore);
      if (!courseId || !name) throw new Error("কোর্স ও পরীক্ষার নাম দিন");
      if (!(max > 0)) throw new Error("পূর্ণমান সঠিক দিন");
      const rows = students
        .filter((s) => scores[s.profile_id] !== undefined && scores[s.profile_id] !== "")
        .map((s) => ({ course_id: courseId, exam_name: name, profile_id: s.profile_id, score: Number(scores[s.profile_id]), max_score: max }));
      if (!rows.length) throw new Error("অন্তত একজনের নম্বর দিন");
      if (rows.some((r) => !(r.score >= 0) || r.score > max)) throw new Error("নম্বর ০ থেকে পূর্ণমানের মধ্যে হতে হবে");
      const { error } = await supabase.from("exam_marks").upsert(rows, { onConflict: "course_id,exam_name,profile_id" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { toast.success(`${n} জনের মার্কশিট সেভ হয়েছে`); qc.invalidateQueries({ queryKey: ["admin-ms-marks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeExam = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("exam_marks").delete().eq("course_id", courseId).eq("exam_name", name);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("মার্কশিট মুছে ফেলা হয়েছে"); qc.invalidateQueries({ queryKey: ["admin-ms-marks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet /> Exam Mark Sheet</h2>
      <p className="text-slate-500 text-sm">একটা কোর্স বেছে নিন, পরীক্ষার নাম দিন, তারপর সব শিক্ষার্থীর নম্বর একসাথে দিয়ে সেভ করুন। এক কোর্সের মার্কশিট অন্য কোর্সে দেখাবে না।</p>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid gap-3 sm:grid-cols-3">
        <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setScores({}); setExamName(""); }} className="border border-slate-200 rounded-xl px-3 py-2">
          <option value="">কোর্স নির্বাচন করুন</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <input list="exam-names" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="পরীক্ষার নাম (যেমন: Mock Test 1)" className="border border-slate-200 rounded-xl px-3 py-2" />
        <datalist id="exam-names">{exams.map((e) => <option key={e} value={e} />)}</datalist>
        <input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="পূর্ণমান" className="border border-slate-200 rounded-xl px-3 py-2" />
      </div>

      {marksError && <p className="text-rose-600 text-sm">মার্কশিট টেবিল পাওয়া যায়নি: {(marksError as Error).message}</p>}

      {courseId && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Roll</th><th className="px-4 py-3">Marks</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">এই কোর্সে অনুমোদিত কোনো শিক্ষার্থী নেই।</td></tr>}
              {students.map((s) => (
                <tr key={s.profile_id}>
                  <td className="px-4 py-2 font-bold">{s.profiles?.full_name || "Student"}</td>
                  <td className="px-4 py-2 text-slate-500">{s.profiles?.roll_number || "-"}</td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} value={scores[s.profile_id] ?? ""} onChange={(e) => setScores((v) => ({ ...v, [s.profile_id]: e.target.value }))} className="w-24 border border-slate-200 rounded-lg px-2 py-1" /> <span className="text-slate-400">/ {maxScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => save.mutate()} disabled={save.isPending} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {save.isPending ? "Saving..." : "Save mark sheet"}</button>
            </div>
          )}
        </div>
      )}

      {courseId && exams.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">এই কোর্সের মার্কশিট</h3>
          {exams.map((name) => {
            const rows = marks.filter((m) => m.exam_name === name);
            const avg = Math.round(rows.reduce((a, m) => a + markPercent(m), 0) / rows.length);
            return (
              <div key={name} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                <button onClick={() => setExamName(name)} className="text-left">
                  <p className="font-bold">{name}</p>
                  <p className="text-xs text-slate-500">{rows.length} জন · গড় {avg}%</p>
                </button>
                <button onClick={() => window.confirm(`"${name}" মার্কশিট মুছবেন?`) && removeExam.mutate(name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={18} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
