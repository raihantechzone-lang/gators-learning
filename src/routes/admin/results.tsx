import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Save, FileText, ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resultSheetKey, readResultSheets, type ResultSheet } from "@/lib/result-sheets";
import { teacherMeta } from "@/lib/teachers";

export const Route = createFileRoute("/admin/results")({
  head: () => teacherMeta("Exam Mark Sheet Admin", "Publish shared PDF exam result sheets for Gators Learning courses."),
  component: MarkSheetAdmin,
});
function MarkSheetAdmin() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const courses = useQuery({ queryKey: ["admin-ms-courses"], queryFn: async () => {
    const { data, error } = await supabase.from("courses").select("id,title").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } });
  const sheets = useQuery({ queryKey: ["result-sheets", courseId], enabled: !!courseId, queryFn: async () => {
    const { data, error } = await supabase.from("settings").select("setting_value").eq("setting_key", resultSheetKey(courseId)).maybeSingle();
    if (error) throw error;
    return readResultSheets(data?.setting_value);
  } });
  const reset = () => { setTitle(""); setUrl(""); setEditingId(null); };
  const save = useMutation({ mutationFn: async (rows: ResultSheet[]) => {
    if (!courseId) throw new Error("কোর্স নির্বাচন করুন");
    const { data, error } = await supabase.from("settings").upsert({ setting_key: resultSheetKey(courseId), setting_value: JSON.stringify(rows) }, { onConflict: "setting_key" }).select("setting_value").single();
    if (error) throw error;
    if (data?.setting_value !== JSON.stringify(rows)) throw new Error("Mark sheet was not saved. Please try again.");
  }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["result-sheets"] }); reset(); toast.success("মার্কশিট সেভ হয়েছে"); }, onError: (e: Error) => toast.error(e.message) });
  return <div className="space-y-6">
    <h2 className="text-2xl font-bold flex items-center gap-2"><FileText />Exam Mark Sheet</h2>
    <Label htmlFor="results-course">কোর্স</Label>
    <select id="results-course" className="w-full border border-border rounded-md bg-background px-3 py-2" value={courseId} onChange={e => { setCourseId(e.target.value); reset(); }}>
      <option value="">কোর্স নির্বাচন করুন</option>{courses.data?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
    {(courses.error || sheets.error) && <p role="alert" className="text-destructive">{courses.error?.message || sheets.error?.message}</p>}
    {courseId && <>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault();
        try { const parsed = new URL(url.trim()); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
        catch { toast.error("সঠিক PDF লিংক দিন"); return; }
        const row = { id: editingId || crypto.randomUUID(), title: title.trim(), url: url.trim() };
        save.mutate([...(sheets.data || []).filter(s => s.id !== row.id), row]);
      }}>
        <div className="space-y-2"><Label htmlFor="results-title">পরীক্ষার নাম</Label><Input id="results-title" required value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="results-url">ফলাফলের PDF লিংক</Label><Input id="results-url" type="url" required placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} /></div>
        <div className="flex gap-2"><Button disabled={save.isPending || sheets.isPending || !!sheets.error} type="submit"><Save size={16} />{save.isPending ? "Saving…" : "Save PDF"}</Button>{editingId && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
      </form>
      {sheets.isPending ? <p>Loading…</p> : !sheets.data?.length ? <p className="text-muted-foreground">এই কোর্সে এখনো কোনো ফলাফল প্রকাশ হয়নি।</p> : <div className="divide-y divide-border">{sheets.data.map(sheet => <div key={sheet.id} className="py-4 flex items-center gap-3">
        <FileText className="text-brand shrink-0" /><span className="font-bold flex-1 min-w-0 break-words">{sheet.title}</span>
        <Button asChild variant="outline" size="icon"><a href={sheet.url} target="_blank" rel="noopener noreferrer" aria-label="Open PDF"><ExternalLink size={16} /></a></Button>
        <Button variant="ghost" size="icon" aria-label="Edit PDF" onClick={() => { setEditingId(sheet.id); setTitle(sheet.title); setUrl(sheet.url); }}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" aria-label="Delete PDF" disabled={save.isPending} onClick={() => { if (window.confirm('মার্কশিট মুছবেন?')) save.mutate((sheets.data || []).filter(s => s.id !== sheet.id)); }}><Trash2 size={16} /></Button>
      </div>)}</div>}
    </>}
  </div>;
}
