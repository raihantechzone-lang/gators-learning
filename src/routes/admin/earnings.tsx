import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Calendar, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { financialSummary, paymentAmount, type PaymentRow } from "@/lib/management-rules";
import { Button } from "@/components/ui/button";
import { approvedEnrollmentFilter } from "@/lib/enrollment-payment";

export const Route = createFileRoute("/admin/earnings")({
  head: () => ({ meta: [
    { title: "Course Earnings — Gators Learning" },
    { name: "description", content: "Verified course payments and earnings for Gators Learning." },
    { property: "og:title", content: "Course Earnings — Gators Learning" },
    { property: "og:description", content: "Verified course payments and earnings for Gators Learning." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EarningsAdmin,
});

function EarningsAdmin() {
  const { data: stats, error, isLoading, refetch, isFetching } = useQuery({
    refetchInterval: 30000,
    queryKey: ["admin-earnings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments")
        .select("id,course_id,status,payment_status,amount_paid,enrolled_at,courses(id,title,price,discount_price)")
        .or(approvedEnrollmentFilter).order("enrolled_at", { ascending: false });
      if (error) throw error;
      return financialSummary((data || []) as PaymentRow[]);
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {isLoading && <p className="text-muted-foreground">হিসাব লোড হচ্ছে…</p>}
      {error && <p role="alert" className="text-destructive">{error.message}</p>}
      <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>হিসাব রিফ্রেশ করুন</Button>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Financial Overview</h2>
          <p className="text-sm text-slate-500 font-medium">আপনার অর্জিত মোট আয় এবং লেনদেনসমূহ দেখুন।</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-2">
             <DollarSign size={16} /> মোট আয়: ৳{(stats?.totalRevenue ?? 0).toLocaleString()}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
             <TrendingUp size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Revenue</p>
           <h3 className="text-2xl font-black text-slate-900">৳{(stats?.totalRevenue ?? 0).toLocaleString()}</h3>
           <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
             <ArrowUpRight size={14} /> এই মাসে ৳{(stats?.monthlyRevenue ?? 0).toLocaleString()}
           </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
             <CreditCard size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Verified Sales</p>
           <h3 className="text-2xl font-black text-slate-900">{(stats?.count ?? 0)}</h3>
           <p className="text-xs text-slate-500 font-medium mt-2">Successful enrollments</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
             <Calendar size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">This Month</p>
           <h3 className="text-2xl font-black text-slate-900">৳{(stats?.monthlyRevenue ?? 0).toLocaleString()}</h3>
           <p className="text-xs text-slate-500 font-medium mt-2">আগের মাসে ৳{(stats?.previousRevenue ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
           <h3 className="font-bold text-slate-900">Course-wise Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Course Title</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Students</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.courseStats?.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{c.title}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{c.count}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600">৳{c.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
           <h3 className="font-bold text-slate-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Enrollment ID</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.transactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {new Date(tx.enrolled_at).toLocaleDateString("bn-BD", {timeZone:"Asia/Dhaka"})}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {tx.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">
                    ৳{paymentAmount(tx).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      {tx.payment_status === "verified" ? "Verified" : "Legacy active"}
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.transactions || stats.transactions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
