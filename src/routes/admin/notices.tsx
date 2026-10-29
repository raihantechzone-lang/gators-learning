import { adminConfirm, adminPrompt } from '@/components/admin/AdminActionDialog';
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { teacherMeta } from "@/lib/teachers";

export const Route = createFileRoute("/admin/notices")({
  staticData: { sitemap: false },
  head: () => teacherMeta("Homepage Notices", "Publish scrolling notices on the homepage."),
  component: NoticesAdmin,
});

type Notice = { id: string; text: string; is_active: boolean; created_at: string };

function NoticesAdmin() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const notices = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notice[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-notices"] });
  const add = async () => {
    if (!text.trim()) return toast.error("Write the notice first");
    const { error } = await (supabase as any).from("notices").insert({ text: text.trim(), is_active: true });
    if (error) return toast.error(`Notice not saved: ${error.message}`);
    setText(""); toast.success("Notice published on homepage"); refresh();
  };
  const toggle = async (n: Notice) => {
    const { error } = await (supabase as any).from("notices").update({ is_active: !n.is_active }).eq("id", n.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const remove = async (n: Notice) => {
    if (!await adminConfirm("Delete this notice?")) return;
    const { error } = await (supabase as any).from("notices").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">নোটিশ</h2>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <textarea aria-label="Notice text" className="w-full rounded-xl bg-slate-50 p-3 min-h-[90px]" placeholder="নোটিশ লিখুন…" value={text} onChange={e => setText(e.target.value)} />
        <button onClick={add} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">Publish notice</button>
      </div>
      {notices.error && <p className="text-rose-600 text-sm">Notices are not set up yet. Please run the attached SQL first.</p>}
      <div className="space-y-3">
        {notices.data?.map(n => (
          <div key={n.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <p className="flex-1 font-bold text-red-600">{n.text}</p>
            <button onClick={() => toggle(n)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${n.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{n.is_active ? "Showing" : "Hidden"}</button>
            <button aria-label="Delete notice" onClick={() => remove(n)} className="p-2 rounded-lg bg-rose-50 text-rose-500"><Trash2 size={16} /></button>
          </div>
        ))}
        {notices.data?.length === 0 && <p className="text-sm text-slate-400">No notices yet.</p>}
      </div>
    </div>
  );
}
