import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DEVELOPER_EMAIL, loadDeveloperCredit, safeDevUrl } from "@/components/site/DeveloperCredit";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Developer Settings — Gators Learning" },
      { name: "description", content: "Manage the developer credit shown in the Gators Learning footer." },
      { property: "og:title", content: "Developer Settings — Gators Learning" },
      { property: "og:description", content: "Manage the developer credit shown in the footer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeveloperPage,
});

function DeveloperPage() {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const allowed = (user?.email || "").toLowerCase() === DEVELOPER_EMAIL;

  useEffect(() => { if (allowed) loadDeveloperCredit().then((c) => { setName(c.name); setUrl(c.url); }); }, [allowed]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const u = url.trim();
    if (!n) return toast.error("নাম দিন");
    if (u && !safeDevUrl(u)) return toast.error("সঠিক ওয়েবসাইট লিংক দিন (https://...)");
    setSaving(true);
    const { error } = await (supabase as any).from("settings").upsert(
      [{ setting_key: "developer_name", setting_value: n }, { setting_key: "developer_url", setting_value: u }],
      { onConflict: "setting_key" },
    );
    setSaving(false);
    if (error) toast.error("সেভ হয়নি: " + error.message);
    else toast.success("ডেভেলপারের তথ্য সেভ হয়েছে");
  }

  if (loading) return <div className="p-10 text-center">লোড হচ্ছে...</div>;
  if (!allowed)
    return (
      <div className="max-w-md mx-auto p-10 text-center space-y-4 font-bengali">
        <h1 className="text-xl font-bold">Developer অপশন বন্ধ</h1>
        <p className="text-ink-muted">শুধু ডেভেলপার অ্যাকাউন্ট দিয়ে লগইন করলে এই অপশন চালু হবে।</p>
        <Link to="/auth" search={{ mode: "login" }} className="inline-block rounded-lg bg-brand text-brand-foreground px-5 py-2 font-semibold">লগইন</Link>
      </div>
    );

  return (
    <div className="max-w-md mx-auto p-6 sm:p-10 font-bengali">
      <h1 className="text-2xl font-bold mb-1">Developer অপশন</h1>
      <p className="text-ink-muted text-sm mb-6">ফুটারের "Developed By" নাম ও লিংক এখান থেকে বদলান।</p>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">ডেভেলপারের নাম</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-border px-3 py-2 bg-background" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">ওয়েবসাইট লিংক</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-border px-3 py-2 bg-background" />
        </label>
        <button disabled={saving} className="w-full rounded-lg bg-brand text-brand-foreground py-2.5 font-semibold disabled:opacity-60">
          {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </button>
      </form>
    </div>
  );
}
