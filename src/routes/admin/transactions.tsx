import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useState } from "react";
import { paymentVerificationUpdate } from "@/lib/enrollment-payment";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [
    { title: "Payment Verification — Gators Learning" },
    { name: "description", content: "Review and verify course enrollment payments." },
    { property: "og:title", content: "Payment Verification — Gators Learning" },
    { property: "og:description", content: "Review and verify course enrollment payments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TransactionsAdmin,
});

function TransactionsAdmin() {
  const [search, setSearch] = useState("");
  const [whatsAppPopup, setWhatsAppPopup] = useState<{ name: string; phone: string; message: string } | null>(null);
  const queryClient = useQueryClient();

  // Pending bKash payments live in the enrollments table until verified.
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-pending-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, status, payment_method, payment_status, amount_paid, bkash_trx_id, enrolled_at, courses(title), profiles(full_name, phone, email)")
        .eq("payment_status", "pending")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ req, status, message }: { req: any; status: 'verified' | 'failed'; message?: string }) => {
      const { data: saved, error } = await supabase
        .from("enrollments")
        .update(paymentVerificationUpdate(status))
        .eq("id", req.id)
        .eq("payment_status", "pending")
        .select("id, payment_status")
        .single();
      if (error) throw error;
      if (saved?.payment_status !== status) throw new Error("Payment verification was not saved. Please refresh and try again.");

      if (status === 'verified') {
        toast.success("Payment verified and enrollment unlocked!");
      } else {
        toast.error("Transaction marked as failed");
      }

      const name = req.profiles?.full_name || "Student";
      const courseTitle = req.courses?.title || "the course";
      const trx = req.bkash_trx_id || "";
      const text =
        message ||
        (status === 'verified'
          ? `Hello ${name}, your payment for ${courseTitle} has been verified successfully. You can now access your course.`
          : `Hello ${name}, we couldn't verify your transaction (TrxID: ${trx}) for ${courseTitle}. Please contact support.`);
      const phone = String(req.profiles?.phone || "").replace(/\D/g, "");
      if (phone) {
        setWhatsAppPopup({ name, phone, message: text });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-enrollments"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = requests?.filter(r =>
    (r.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.bkash_trx_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Transaction Verification</h2>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input
          placeholder="Search by name or TrxID..."
          className="flex-1 bg-transparent border-none focus:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
             <tr>
               <th className="px-6 py-4">Student</th>
               <th className="px-6 py-4">Course</th>
               <th className="px-6 py-4">TrxID</th>
               <th className="px-6 py-4">Amount</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered?.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-bold">{r.profiles?.full_name || "Unknown"}</td>
                <td className="px-6 py-4">{r.courses?.title}</td>
                <td className="px-6 py-4 font-mono">{r.bkash_trx_id || "—"}</td>
                <td className="px-6 py-4">৳{r.amount_paid ?? 0}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${r.payment_status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {r.payment_status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const name = r.profiles?.full_name || "Student";
                        const msg = window.prompt("Success Message (WhatsApp):", `Hello ${name}, your payment for ${r.courses?.title} has been verified.`);
                        verifyMutation.mutate({ req: r, status: 'verified', message: msg || undefined });
                      }}
                      className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand/90 transition"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => {
                        const name = r.profiles?.full_name || "Student";
                        const msg = window.prompt("Rejection Message (WhatsApp):", `Hello ${name}, we couldn't verify your transaction.`);
                        verifyMutation.mutate({ req: r, status: 'failed', message: msg || undefined });
                      }}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered?.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">No pending payments.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {whatsAppPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send WhatsApp confirmation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setWhatsAppPopup(null); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">WhatsApp Confirmation</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setWhatsAppPopup(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Send to <span className="font-bold text-slate-900">{whatsAppPopup.name}</span>
              <span className="block font-mono text-emerald-600 font-bold mt-1">+{whatsAppPopup.phone}</span>
            </p>
            <textarea
              className="mt-4 w-full h-32 rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={whatsAppPopup.message}
              onChange={(e) => setWhatsAppPopup({ ...whatsAppPopup, message: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                window.open(`https://wa.me/${whatsAppPopup.phone}?text=${encodeURIComponent(whatsAppPopup.message)}`, '_blank');
                setWhatsAppPopup(null);
              }}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
            >
              Send via WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
