import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BadgeCheck, Search } from "lucide-react";
import { paymentVerificationUpdate } from "@/lib/enrollment-payment";
import { whatsappPhone, paymentConfirmationMessage } from "@/lib/public-experience.js";
import { teacherMeta } from "@/lib/teachers";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export const Route = createFileRoute("/admin/course-verification")({
  head: () => teacherMeta("Course Verification", "Match a bKash transaction ID and approve the course enrollment."),
  component: CourseVerification,
});

function CourseVerification() {
  const [trx, setTrx] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmation, setConfirmation] = useState<{ phone: string; message: string } | null>(null);

  const search = async () => {
    const id = trx.trim();
    if (!id) return toast.error("Enter a transaction ID");
    setSearching(true);
    const { data, error } = await supabase
      .from("enrollments")
      .select("id, payment_status, amount_paid, bkash_trx_id, enrolled_at, courses(title), profiles(full_name, phone)")
      .ilike("bkash_trx_id", id);
    setSearching(false);
    if (error) return toast.error(error.message);
    setMatches(data as any[]);
  };

  const approve = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await supabase.from("enrollments").update(paymentVerificationUpdate("verified")).eq("id", row.id).select("id, payment_status").single();
      if (error) throw error;
      if (data?.payment_status !== "verified") throw new Error("Approval was not saved. Please try again.");
      return row;
    },
    onSuccess: (row) => {
      toast.success("Approved — course unlocked");
      setMatches(m => m?.map(r => (r.id === row.id ? { ...r, payment_status: "verified" } : r)) || null);
      setConfirmation({ phone: String(row.profiles?.phone || ''), message: paymentConfirmationMessage(row.profiles?.full_name || "Student", row.courses?.title || "the course") });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Course Verification</h2>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          aria-label="Transaction ID"
          placeholder="Enter bKash Transaction ID"
          className="flex-1 rounded-xl bg-slate-50 px-4 py-3 font-mono"
          value={trx}
          onChange={e => setTrx(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
        />
        <button onClick={search} disabled={searching} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold">
          <Search size={18} /> {searching ? "Checking…" : "Verify"}
        </button>
      </div>

      {matches && matches.length === 0 && (
        <p className="text-rose-600 font-bold">No enrollment found with this transaction ID.</p>
      )}
      {matches?.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg">{r.bkash_trx_id}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black"><BadgeCheck size={14} /> Matched</span>
            </div>
            <p className="text-sm text-slate-600">{r.profiles?.full_name || "Unknown"} · {r.courses?.title} · ৳{r.amount_paid ?? 0}</p>
            <p className="text-xs text-slate-400">Status: {r.payment_status || "pending"}</p>
          </div>
          {r.payment_status === "verified" ? (
            <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold">Approved</span>
          ) : (
            <button onClick={() => approve.mutate(r)} disabled={approve.isPending} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">Approve</button>
          )}
        </div>
      ))}
      <Dialog open={!!confirmation} onOpenChange={open => { if (!open) setConfirmation(null); }}>
        <DialogContent>
          <DialogTitle>Enrollment confirmation</DialogTitle>
          <Input aria-label="WhatsApp number" type="tel" placeholder="01… or +880 1…" value={confirmation?.phone || ''} onChange={e => setConfirmation(c => c ? { ...c, phone: e.target.value } : null)} />
          <p className="whitespace-pre-wrap text-sm">{confirmation?.message}</p>
          <Button onClick={() => {
            const phone = whatsappPhone(confirmation?.phone);
            if (!phone) return toast.error('Enter a complete mobile number (01… or +880 1…).');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(confirmation?.message || '')}`, '_blank', 'noopener,noreferrer');
          }}>Send WhatsApp</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
